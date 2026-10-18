# Lesson 06 — Variables, Outputs and Locals

**Exam domain 4** · **Time:** 2 hours. Variable precedence is a classic exam question.

## 🧠 Pre-concept: why variables?

Hard-coding values (`region = "ap-south-1"`) means copy-pasting the code for each environment. **Variables** are the function parameters of Terraform: same code, different inputs.

| Concept | Like in programming | Purpose |
|---|---|---|
| **Input variable** | function argument | Customize a config/module |
| **Local value** | local variable | Name an expression, avoid repetition |
| **Output value** | return value | Expose results |

## Input variables

```hcl
variable "region" {
  type        = string
  description = "AWS region to deploy into"
  default     = "ap-south-1"
}
```

Arguments (all optional):

| Argument | Meaning |
|---|---|
| `type` | Data type constraint |
| `default` | Value if none supplied. **No default = required** |
| `description` | Documentation |
| `validation` | Custom rule (Lesson 08) |
| `sensitive` | Hide in CLI output (Lesson 08) |
| `nullable` | Whether `null` is allowed |
| `ephemeral` | Value not stored in state/plan (newer feature) |

Use it: `var.region`

If a variable has **no default** and no value is supplied, `terraform plan/apply` **prompts** you interactively (in automation this fails).

### Types

- Primitive: `string`, `number`, `bool`
- Collections: `list(string)`, `set(string)`, `map(string)`
- Structural: `object({ name = string, port = number })`, `tuple([string, number])`
- `any` = no constraint

If you don't set `type`, Terraform infers it (not recommended). Details in Lesson 07.

## Ways to set variable values

1. **Interactive prompt** (when missing)
2. **`-var` flag**: `terraform apply -var="region=us-east-1"`
3. **`-var-file` flag**: `terraform apply -var-file="prod.tfvars"`
4. **`terraform.tfvars`** (auto-loaded)
5. **`terraform.tfvars.json`** (auto-loaded)
6. **`*.auto.tfvars`** / `*.auto.tfvars.json` (auto-loaded, alphabetical order)
7. **Environment variables** named `TF_VAR_<name>`: `export TF_VAR_region=us-east-1` (PowerShell: `$env:TF_VAR_region = "us-east-1"`)
8. **Default** in the variable block

### A `.tfvars` file

```hcl
# prod.tfvars
region        = "us-east-1"
instance_type = "t3.large"
```

(Just `name = value` lines. No `variable` blocks.)

## ⭐ Variable precedence (lowest → highest)

Later wins. Order from lowest to highest priority:

| Priority | Source |
|---|---|
| 1 (lowest) | `default` in the variable block (and prompt if none) |
| 2 | Environment variables `TF_VAR_name` |
| 3 | `terraform.tfvars` |
| 4 | `terraform.tfvars.json` |
| 5 | `*.auto.tfvars` / `*.auto.tfvars.json` (alphabetical) |
| 6 (highest) | `-var` and `-var-file` on the command line (in the order given) |

**Memory trick:** *the closer to the command line, the stronger it is.*

🎯 Exam example: `TF_VAR_env=dev`, `terraform.tfvars` has `env="stage"`, and you run `terraform apply -var="env=prod"` → result is `prod`.

## Accessing complex variable values

```hcl
variable "tags" {
  type = map(string)
  default = { Env = "dev", Team = "qa" }
}

# usage
tags = var.tags
env  = var.tags["Env"]
```

## Output values

Outputs print useful info after apply, and **expose values from a module** to its caller.

```hcl
output "bucket_arn" {
  description = "ARN of the bucket"
  value       = aws_s3_bucket.demo.arn
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
```

- Shown after `apply`
- `terraform output` prints all, `terraform output bucket_arn` prints one
- `terraform output -raw x` (plain string, scripts) and `-json`
- `sensitive = true` redacts it in CLI output (still readable via `terraform output db_password` or `-json`, and stored in state)
- Outputs of a **child module** are the only way the parent can read its values: `module.x.output_name`
- Outputs from the root module can be read by other configs with `terraform_remote_state` or in HCP Terraform workspaces

## Local values

A **local** gives a name to an expression, so you write it once.

```hcl
locals {
  project     = "shop"
  name_prefix = "${local.project}-${var.env}"

  common_tags = {
    Project = local.project
    Env     = var.env
  }
}

resource "aws_s3_bucket" "b" {
  bucket = "${local.name_prefix}-assets"
  tags   = local.common_tags
}
```

- Block is `locals` (plural), but you reference it with `local` (singular): `local.name_prefix`
- Locals can reference variables, resources, and other locals
- They can't be set from outside (unlike variables)

### Variable vs local vs output (exam)

| | Set from outside? | Purpose |
|---|---|---|
| `variable` | Yes | Input |
| `locals` | No | Internal helper |
| `output` | n/a | Results out |

## 🧪 Lab 6 (no cloud)

`variables.tf`:

```hcl
variable "env" {
  type    = string
  default = "dev"
}

variable "names" {
  type    = list(string)
  default = ["a", "b"]
}
```

`main.tf`:

```hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local" }
  }
}

locals {
  prefix = "app-${var.env}"
}

resource "local_file" "f" {
  filename = "${path.module}/${local.prefix}.txt"
  content  = "env is ${var.env}, names: ${join(",", var.names)}"
}
```

`outputs.tf`:

```hcl
output "file_name" {
  value = local_file.f.filename
}
```

Experiment (run `terraform plan` after each, read what env value is used):

1. No overrides → `dev`.
2. Set the env var: `export TF_VAR_env=stage` (PowerShell: `$env:TF_VAR_env = "stage"`) → `stage`.
3. Create `terraform.tfvars` with `env = "qa"` → `qa` (beats env var).
4. Create `zz.auto.tfvars` with `env = "auto"` → `auto`.
5. `terraform plan -var="env=cli"` → `cli` (beats everything).
6. `terraform plan -var='names=["x","y","z"]'`.
7. `terraform output` and `terraform output -raw file_name`.

Clean up: `unset TF_VAR_env` (PowerShell: `Remove-Item Env:TF_VAR_env`), then `terraform destroy`.

⚠️ **PowerShell quoting:** use `terraform plan -var 'env=cli'` (space, single quotes). For step 6 (the list value), put `names = ["x", "y", "z"]` in a file such as `list.tfvars` and run `terraform plan -var-file="list.tfvars"` instead of typing the list on the command line.

## 🎯 Exam focus

- Variable block arguments; no default → required (prompt).
- All ways to set variables, plus the **precedence order**.
- `TF_VAR_` prefix.
- Auto-loaded files: `terraform.tfvars`, `*.auto.tfvars`.
- Output arguments and `sensitive`; `terraform output` flags.
- Locals: `locals` block, `local.` reference.
- `sensitive` hides in output but **not in state**.

## ❓ Quiz

1. Which file names are loaded automatically?
2. `terraform.tfvars` says `size="small"` and you run `-var="size=large"`. Which wins?
3. How do you set a variable called `region` via an environment variable?
4. What happens if a required variable has no value?
5. How do you reference a local named `tags`?
6. How can a parent module read a value from a child?

<details><summary>Answers</summary>

1. `terraform.tfvars`, `terraform.tfvars.json`, `*.auto.tfvars`, `*.auto.tfvars.json`.
2. `-var` (command line has the highest precedence).
3. `export TF_VAR_region=value` (PowerShell: `$env:TF_VAR_region = "value"`).
4. Terraform prompts interactively (or errors in non-interactive runs).
5. `local.tags`.
6. Only through the child's `output`, as `module.<name>.<output>`.
</details>
