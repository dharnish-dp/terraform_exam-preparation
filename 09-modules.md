# Lesson 09 — Modules

**Exam domain 5** · **Time:** 3 hours (spread over 2 days: read on day 1, build on day 2)

## 🧠 Pre-concept: why modules?

Imagine you build "a web server with a security group and a load balancer" for dev. Now you need it for stage and prod, and for 5 other teams. Copy-pasting means 5 places to fix every bug.

A **module** is a **reusable package of Terraform configuration**: like a function or a library. You write it once and call it many times with different inputs.

## What exactly is a module?

**Every Terraform folder is a module.** There are two roles:

- **Root module**: the folder where you run `terraform plan/apply`
- **Child module**: any module called by another module via a `module` block

```
project/
├── main.tf              ← root module (you run terraform here)
├── variables.tf
└── modules/
    └── web/             ← child module
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## Calling a module

```hcl
module "web_dev" {
  source = "./modules/web"

  # inputs = the child's variables
  env           = "dev"
  instance_type = "t3.micro"
}

module "web_prod" {
  source = "./modules/web"

  env           = "prod"
  instance_type = "t3.large"
}
```

- `module "<local name>"` → you pick the name
- `source` is **required**
- Other arguments are the **child's input variables**
- After adding or changing a module block (especially the source), run **`terraform init`** (or `terraform get`) to install it
- Meta-arguments allowed on a module: `count`, `for_each`, `depends_on`, `providers`, `version`

## Module sources

| Source | Example |
|---|---|
| Local path | `source = "./modules/web"` (must start with `./` or `../`) |
| Terraform Registry | `source = "terraform-aws-modules/vpc/aws"` |
| Private registry (HCP Terraform) | `source = "app.terraform.io/myorg/web/aws"` |
| GitHub | `source = "github.com/org/repo"` or `"git::https://github.com/org/repo.git"` |
| Git with ref | `source = "git::https://github.com/org/repo.git?ref=v1.2.0"` |
| Subdirectory of a repo | `source = "git::https://...repo.git//modules/web?ref=v1"` (note the **double slash**) |
| S3 bucket / GCS / HTTP URL / Mercurial | supported too |

🎯 Registry addresses have the form `<NAMESPACE>/<NAME>/<PROVIDER>`, for example `terraform-aws-modules/vpc/aws`.

## Module versioning

Only **registry** modules support the `version` argument:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"     # same constraint syntax as providers
}
```

- Always **pin versions** so upgrades don't surprise you
- For Git sources you version with `?ref=` (tag, branch, or commit hash)
- **Local modules** have no version (they're just your folder)
- Upgrading: change the version, then `terraform init -upgrade`

## Module inputs, outputs and scope ⭐

A module is **encapsulated**: it can't see the parent's variables or resources, and the parent can't see inside the child.

```hcl
# modules/web/variables.tf
variable "env" { type = string }
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# modules/web/main.tf
resource "aws_instance" "this" {
  ami           = "ami-123"
  instance_type = var.instance_type
  tags          = { Env = var.env }
}

# modules/web/outputs.tf
output "instance_id" {
  value = aws_instance.this.id
}
```

Back in the parent:

```hcl
output "dev_id" {
  value = module.web_dev.instance_id     # module.<name>.<output name>
}
```

### Rules (high exam value)

1. **Inputs:** the only way to pass data **in** is the child's `variable` blocks.
2. **Outputs:** the only way to read data **out** is the child's `output` blocks. You **cannot** write `module.web.aws_instance.this.id`. It fails unless exposed through an output.
3. A child's variables are **not** automatically inherited from the parent. You pass each explicitly.
4. A child with a variable that has no default **requires** the parent to supply it.
5. **Locals** and resources inside a module are private.
6. Module resource addresses in state: `module.web_dev.aws_instance.this`

## Providers and modules

- A child module **inherits default provider configurations** from its parent automatically.
- Best practice: **don't put `provider` blocks inside reusable modules.** Configure them in the **root** and pass down.
- To pass a non-default (aliased) provider:

```hcl
module "web_mumbai" {
  source = "./modules/web"
  providers = {
    aws = aws.mumbai
  }
}
```

- A module declares what it needs via `required_providers` in its own `terraform` block.

## `count` and `for_each` on modules

```hcl
module "web" {
  for_each = toset(["dev", "stage"])
  source   = "./modules/web"
  env      = each.key
}
# reference: module.web["dev"].instance_id
```

## Standard module structure (best practice)

```
modules/web/
├── main.tf        # resources
├── variables.tf   # inputs
├── outputs.tf     # outputs
├── versions.tf    # required_providers / required_version
└── README.md
```

## Why use the Registry's public modules?

- Ready-made, community/vendor-maintained
- Docs with inputs/outputs and examples
- Verified badge for partner-maintained modules
- Faster than building everything yourself, but **review the code** and pin the version

### Publishing modules

- Public registry requires: a GitHub repo named `terraform-<PROVIDER>-<NAME>`, semantic-version tags like `v1.0.0`, and a standard structure
- **Private registry** in HCP Terraform lets an organization share modules internally

## Where does `terraform init` put modules?

In `.terraform/modules/` (and registers them in `modules.json`). If you change a module's `source`, `init` is required again.

## 🧪 Lab 9: build and reuse a module (no cloud)

```
tf-lab9/
├── main.tf
└── modules/
    └── note/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

`modules/note/variables.tf`:

```hcl
variable "name" { type = string }
variable "text" {
  type    = string
  default = "default text"
}
```

`modules/note/main.tf`:

```hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local" }
  }
}

resource "local_file" "this" {
  filename = "${path.root}/${var.name}.txt"
  content  = var.text
}
```

`modules/note/outputs.tf`:

```hcl
output "path" {
  value = local_file.this.filename
}
```

Root `main.tf`:

```hcl
module "a" {
  source = "./modules/note"
  name   = "alpha"
  text   = "I am alpha"
}

module "b" {
  source = "./modules/note"
  name   = "beta"
}

module "set" {
  for_each = toset(["x", "y"])
  source   = "./modules/note"
  name     = "set-${each.key}"
}

output "paths" {
  value = [module.a.path, module.b.path]
}
```

Do:

1. `terraform init` → watch "Initializing modules...". Look in `.terraform/modules/`.
2. `terraform plan` → see addresses like `module.a.local_file.this`.
3. `terraform apply`, check `terraform output paths`.
4. Try referencing `module.a.local_file.this.id` in root. Read the error. Then expose it via an output.
5. Try removing the `name` input from `module "a"` and read the "missing required argument" error.
6. (Optional, needs internet) call a **registry** module, e.g. `terraform-aws-modules/s3-bucket/aws`, with `version = "~> 4.0"`, run `plan` only, no apply.
7. `terraform destroy`.

## 🎯 Exam focus

- Root vs child module; every folder is a module.
- Source types and `?ref=`, double-slash subdirectory.
- `version` argument works **only for registry modules**.
- Input/output scope rules: inputs via variables, outputs via output blocks.
- Provider inheritance and `providers = {}` map.
- Run `terraform init` after adding/changing modules.
- Benefits: reuse, consistency, encapsulation, faster delivery.
- `count`/`for_each`/`depends_on` on modules.

## ❓ Quiz

1. How does a parent read an attribute of a resource inside a child module?
2. Can you use `version` with a local path module?
3. What command installs modules?
4. How do you pin a Git module to a tag?
5. Does a child module automatically see the parent's variables?
6. How do you pass an aliased provider to a module?
7. What's the root module?

<details><summary>Answers</summary>

1. Only through an `output` in the child: `module.<name>.<output>`.
2. No. `version` is only for registry modules.
3. `terraform init` (or `terraform get`).
4. `source = "git::https://...git?ref=v1.2.0"`.
5. No. Values must be passed in explicitly as inputs.
6. `providers = { aws = aws.alias }` inside the `module` block.
7. The working directory where you run Terraform commands.
</details>
