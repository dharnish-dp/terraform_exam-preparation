# Lesson 02 — Providers

**Exam domain 2** · **Time:** 2 hours

## 🧠 Pre-concept: why providers exist

Terraform Core is generic. It has no idea what an "EC2 instance" is. A **provider** is a plugin that teaches Terraform about one platform: what resource types exist, what arguments they take, and how to call that platform's API.

- AWS provider → `aws_instance`, `aws_s3_bucket`, ...
- Azure provider (`azurerm`) → `azurerm_virtual_machine`, ...
- `random` provider → `random_pet`, `random_id`, ... (no cloud needed)
- `local` provider → `local_file`
- Kubernetes, GitHub, Datadog, Vault... thousands exist

Resource names begin with the provider's prefix: `aws_`, `azurerm_`, `google_`, `random_`, `local_`.

## Where providers come from

- **Terraform Registry** (registry.terraform.io): public home for providers and modules.
- Tiers: **Official** (HashiCorp), **Partner** (written by a company, verified by HashiCorp), **Community** (anyone).
- Addresses look like `hashicorp/aws`: `namespace/type`. Full form: `registry.terraform.io/hashicorp/aws`.
- Providers are downloaded by `terraform init` into the hidden `.terraform/` folder.

## Declaring required providers

Put this in the `terraform` block:

```hcl
terraform {
  required_version = ">= 1.12.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

- `source` = where to get it (`namespace/type`)
- `version` = acceptable version(s)
- `required_version` = acceptable **Terraform CLI** version (different thing!)

If you omit `source`, Terraform assumes `hashicorp/<name>`, but always declare it explicitly for clarity.

## Configuring a provider

Declaring says "I need AWS". The `provider` block says **how to use it**:

```hcl
provider "aws" {
  region = "ap-south-1"
}
```

Credentials are best supplied outside the code (env variables, shared credentials file, or an IAM role). **Never hard-code** `access_key` and `secret_key`.

## Version constraints (high exam value)

| Constraint | Meaning |
|---|---|
| `= 5.1.0` or `5.1.0` | Exactly that version |
| `!= 5.1.0` | Anything except that |
| `>= 5.0` | 5.0 or newer |
| `< 6.0` | Older than 6.0 |
| `>= 5.0, < 6.0` | Both conditions (comma = AND) |
| `~> 5.1` | Pessimistic: `>= 5.1` and `< 6.0` (right-most number can rise) |
| `~> 5.1.2` | `>= 5.1.2` and `< 5.2.0` |

**How `~>` works:** only the **right-most** component is allowed to increase.

- `~> 5.1` → 5.1, 5.2, 5.9 ✔ but 6.0 ✘
- `~> 5.1.0` → 5.1.0, 5.1.9 ✔ but 5.2.0 ✘

🎯 Expect a question like: "Which versions does `~> 1.4.0` allow?"

## The dependency lock file: `.terraform.lock.hcl`

Created/updated by `terraform init`. It records the **exact provider version** selected plus **checksums (hashes)**.

```hcl
provider "registry.terraform.io/hashicorp/random" {
  version     = "3.6.3"
  constraints = "~> 3.6"
  hashes = [ "h1:...", "zh:..." ]
}
```

- **Commit it to Git.** Everyone then gets the same provider versions.
- `terraform init` follows the lock file. It will **not** upgrade just because a newer version exists.
- To upgrade within your constraints: `terraform init -upgrade`.
- If you change the constraint to something the lock file doesn't satisfy, `init` tells you to run `-upgrade`.
- It protects against tampering (hash checks).

⚠️ The lock file is for **providers**. Modules aren't locked there.

## Multiple provider configurations: aliases

What if you need two AWS regions in one project?

```hcl
provider "aws" {            # default configuration
  region = "us-east-1"
}

provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}

resource "aws_s3_bucket" "primary" {
  bucket = "demo-primary-12345"
  # uses the default provider
}

resource "aws_s3_bucket" "replica" {
  provider = aws.mumbai       # pick the alias: <provider>.<alias>
  bucket   = "demo-replica-12345"
}
```

- The provider block **without** alias is the default.
- Use `provider = aws.mumbai` on a resource to choose the aliased one.
- Aliases also enable multiple accounts, multiple Kubernetes clusters, etc.

## Providers and modules (preview)

- Child modules **inherit** the default provider config from the parent automatically.
- To pass an aliased one: `providers = { aws = aws.mumbai }` on the `module` block. (Lesson 09.)

## Provider installation flow

1. You write `required_providers`.
2. `terraform init` reads it, picks versions that satisfy constraints, downloads them to `.terraform/providers/`, writes the lock file.
3. Every other command (`plan`, `apply`) uses those installed plugins.

If you add a **new provider** later, run `terraform init` again.

## 🧪 Lab 2: Two providers, no cloud needed

```bash
mkdir ~/tf-lab2      # Windows: mkdir C:\tf-labs\lab2
cd ~/tf-lab2         # Windows: cd C:\tf-labs\lab2
```

`main.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

resource "random_pet" "name" {
  length = 2
}

resource "local_file" "pet" {
  filename = "${path.module}/pet.txt"
  content  = "My pet is ${random_pet.name.id}"
}
```

Steps:

1. `terraform init`. Open `.terraform.lock.hcl` and read it.
2. `terraform providers`. It lists which providers your config needs.
3. `terraform apply`. Read `pet.txt`.
4. Change the `random` constraint to `~> 3.0`, run `terraform init`. See what the lock file says.
5. Try `terraform init -upgrade`.
6. `terraform destroy`.

## 🎯 Exam focus

- Where to declare providers: `required_providers` in the `terraform` block.
- What `terraform init` does with providers.
- Version constraint operators, especially `~>`.
- The lock file: what it holds, commit it, `-upgrade`.
- Provider **aliases** and the `provider =` meta-argument.
- `required_version` is the **Terraform** version, not a provider's.
- Provider configs go in the **root** module normally; credentials not in code.

## ❓ Quiz

1. What does `~> 2.3` allow? What about `~> 2.3.1`?
2. Which command downloads providers?
3. Should `.terraform.lock.hcl` be committed to Git?
4. How do you use two AWS regions in one config?
5. What's the difference between `required_version` and a provider `version`?
6. What command upgrades provider versions within constraints?

<details><summary>Answers</summary>

1. `~> 2.3` allows >= 2.3 and < 3.0. `~> 2.3.1` allows >= 2.3.1 and < 2.4.0.
2. `terraform init`.
3. Yes.
4. Add a second `provider "aws"` block with an `alias`, then set `provider = aws.<alias>` on resources.
5. `required_version` constrains the Terraform CLI; provider `version` constrains the plugin.
6. `terraform init -upgrade`.
</details>
