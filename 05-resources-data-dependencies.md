# Lesson 05 — Resources, Data Sources, References and Dependencies

**Exam domain 4** · **Time:** 2 hours · First AWS lab (remember to destroy!)

## Resource blocks

A **resource** is something Terraform **creates and manages** (server, bucket, DNS record, file...).

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "my-unique-logs-bucket-12345"

  tags = {
    Environment = "dev"
  }
}
```

Anatomy: `resource "<TYPE>" "<NAME>" { arguments }`

- The pair `TYPE.NAME` must be **unique** in the module: `aws_s3_bucket.logs`
- **Arguments** = what you set. **Attributes** = what you can read (some are only known after creation, like `id` or `arn`).

### Read attributes with references

`<TYPE>.<NAME>.<ATTRIBUTE>`

```hcl
output "bucket_arn" {
  value = aws_s3_bucket.logs.arn
}
```

The provider's docs list each resource's **arguments** and **attributes**. The exam doesn't require memorizing them, but you must understand the difference.

### Meta-arguments (work on any resource)

| Meta-argument | Use |
|---|---|
| `count` | Create N copies (Lesson 07) |
| `for_each` | Create one per item in a map/set (Lesson 07) |
| `depends_on` | Explicit dependency |
| `provider` | Pick an aliased provider (Lesson 02) |
| `lifecycle` | Control create/update/destroy behavior (Lesson 08) |

## Data sources

A **data source** **reads** information that already exists (outside this config or elsewhere). It **never creates or changes** anything.

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"
}
```

Reference with the `data.` prefix: `data.<TYPE>.<NAME>.<ATTRIBUTE>`

### Resource vs data (exam favorite)

| | `resource` | `data` |
|---|---|---|
| Purpose | Create/manage | Read only |
| Appears in plan as | `+ create` etc. | read (`<=`) |
| Reference | `aws_x.name.attr` | `data.aws_x.name.attr` |
| `terraform destroy` | Destroys it | Nothing to destroy |
| Stored in state | Yes (managed) | Yes (mode = "data") |

Use data sources for things like: latest AMI, an existing VPC, current AWS account ID (`aws_caller_identity`), available AZs.

## References and expressions

| You write | Refers to |
|---|---|
| `aws_instance.web.id` | Attribute of a managed resource |
| `data.aws_ami.ubuntu.id` | Attribute of a data source |
| `var.region` | Input variable |
| `local.name` | Local value |
| `module.vpc.vpc_id` | Module output |
| `path.module` | Folder of the current module |
| `path.root` | Folder of the root module |
| `path.cwd` | Current working directory |
| `terraform.workspace` | Current workspace name |

### String interpolation

```hcl
name = "web-${var.env}-${aws_instance.web.id}"
```

`${ }` inside a quoted string inserts a value. Outside of strings, write the expression directly (`ami = data.aws_ami.ubuntu.id`, not `"${...}"`).

## Dependencies: how Terraform orders operations

Terraform builds a **dependency graph** of all resources and processes it in order, doing independent work **in parallel**.

### Implicit dependency (automatic)

When resource B **references** resource A, Terraform knows A must exist first.

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "a" {
  vpc_id     = aws_vpc.main.id    # ← reference creates the dependency
  cidr_block = "10.0.1.0/24"
}
```

Create order: VPC → subnet. Destroy order: subnet → VPC (reverse).

### Explicit dependency: `depends_on`

Use when there's a **hidden** dependency that Terraform can't see from references (e.g. a server needs an IAM policy to exist, but doesn't reference it).

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  depends_on = [aws_iam_role_policy.app_policy]
}
```

🎯 Rule of thumb: **prefer implicit** (references). Use `depends_on` only when necessary, since it can make plans more conservative.

`terraform graph` prints the dependency graph.

## Common beginner errors

- Forgetting `data.` when referencing a data source
- Using `"${var.x}"` everywhere (works but unnecessary outside strings)
- Duplicate `TYPE.NAME` in the same module → error
- S3 bucket name not globally unique → apply fails

## 🧪 Lab 5 (AWS)

Prereq: AWS credentials working (`aws sts get-caller-identity`).

```hcl
terraform {
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = "ap-south-1"
}

data "aws_caller_identity" "me" {}
data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "demo" {
  bucket = "tf-demo-${random_id.suffix.hex}"
}

output "account_id" {
  value = data.aws_caller_identity.me.account_id
}

output "first_az" {
  value = data.aws_availability_zones.available.names[0]
}

output "bucket_name" {
  value = aws_s3_bucket.demo.bucket
}
```

1. `init`, `plan`, `apply`.
2. Check the bucket in the AWS console.
3. Run `terraform graph` and note the arrow from bucket → random_id.
4. Run `terraform state list` and notice both `data.` and managed entries.
5. `terraform destroy` (confirm the bucket is gone in the console).

## 🎯 Exam focus

- Resource (create/manage) vs data (read-only).
- Reference syntax for each (`data.` prefix).
- Implicit vs explicit dependencies; when to use `depends_on`.
- Create order and reverse destroy order.
- Meta-arguments list.
- Arguments vs attributes.

## ❓ Quiz

1. How do you reference the `id` of `data "aws_ami" "x"`?
2. What creates an implicit dependency?
3. When do you need `depends_on`?
4. Does a data source ever create infrastructure?
5. In what order are resources destroyed relative to creation?
6. Name three meta-arguments.

<details><summary>Answers</summary>

1. `data.aws_ami.x.id`
2. One resource referencing another's attribute.
3. When a dependency exists but isn't visible through references.
4. No. Data sources are read-only.
5. Reverse order.
6. `count`, `for_each`, `depends_on`, `provider`, `lifecycle` (any three).
</details>
