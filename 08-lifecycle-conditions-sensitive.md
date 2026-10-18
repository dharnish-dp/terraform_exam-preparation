# Lesson 08 — Lifecycle, Custom Conditions, Sensitive Data and Vault

**Exam domain 4** · **Time:** 2 hours

## Part A: The `lifecycle` block

Controls **how Terraform creates, updates, and destroys** a particular resource. It's a meta-argument block placed inside a resource.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-123"
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
    ignore_changes        = [tags, ami]
    replace_triggered_by  = [aws_security_group.web.id]
  }
}
```

### `create_before_destroy`

Default replacement = **destroy old, then create new** (downtime). With this flag: **create new first, then destroy old.** Useful for zero-downtime swaps. Watch out for names that must be unique (the new one can't clash with the old).

### `prevent_destroy`

Terraform **errors** if a plan would destroy the resource. Protects precious things (databases). It only protects against Terraform-driven destroy: removing the whole resource block from code also isn't "blocked" the same way, because the check lives inside the block. And `terraform destroy` will fail while it's set.

### `ignore_changes`

Tells Terraform **not to react** to changes in the listed arguments made outside Terraform (e.g. an autoscaler changing `desired_capacity`, or another process editing tags).

```hcl
ignore_changes = [tags]          # specific attributes
ignore_changes = all             # everything (use carefully)
```

### `replace_triggered_by`

Force this resource to be **replaced** when a referenced resource/attribute changes.

### `precondition` / `postcondition` (inside lifecycle)

Custom checks (see Part B).

### Related: `-replace` (modern replacement for `taint`)

`terraform apply -replace="aws_instance.web"` forces recreation of one resource. The older `terraform taint` command is **deprecated**.

## Part B: Custom conditions and validation

Catch errors early with clear messages.

### 1. Variable `validation`

```hcl
variable "env" {
  type = string

  validation {
    condition     = contains(["dev", "stage", "prod"], var.env)
    error_message = "env must be dev, stage or prod."
  }
}

variable "port" {
  type = number
  validation {
    condition     = var.port >= 1024 && var.port <= 65535
    error_message = "Port must be 1024-65535."
  }
}
```

- `condition` must evaluate to `true` to pass
- Runs **during plan**, before anything is created
- Can have multiple `validation` blocks per variable
- Validation can reference only that variable (in older versions); recent versions allow other values too

### 2. `precondition` (check BEFORE the resource is created/changed)

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.x.id
  instance_type = var.type

  lifecycle {
    precondition {
      condition     = data.aws_ami.x.architecture == "x86_64"
      error_message = "AMI must be x86_64."
    }
  }
}
```

### 3. `postcondition` (check AFTER, on the result)

```hcl
  lifecycle {
    postcondition {
      condition     = self.public_ip != ""
      error_message = "Instance must have a public IP."
    }
  }
```

- `self` refers to the resource's own attributes (only in postconditions)
- Preconditions/postconditions also work in **data** and **output** blocks (outputs: `precondition` only)

### 4. `check` blocks (assertions that only warn)

```hcl
check "site_up" {
  data "http" "home" {
    url = "https://example.com"
  }
  assert {
    condition     = data.http.home.status_code == 200
    error_message = "Site is down"
  }
}
```

Failures **warn** but do not stop the run. Good for continuous validation.

### Summary

| Feature | When it runs | Failure effect |
|---|---|---|
| `validation` (variable) | Plan, when evaluating the variable | Error |
| `precondition` | Before the resource is changed | Error |
| `postcondition` | After the resource is created | Error |
| `check` block | End of plan/apply | **Warning only** |

## Part C: Sensitive data

### `sensitive = true`

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

output "password" {
  value     = var.db_password
  sensitive = true
}
```

- CLI shows `(sensitive value)` instead of the real value in plan/apply output
- Anything **derived** from a sensitive value is also treated as sensitive (and outputs that use them **must** be marked sensitive or Terraform errors)

### ⚠️ What `sensitive` does NOT do

- Does **not encrypt** state. The value is still **plain text in the state file**
- Doesn't stop someone running `terraform output password` or `-json`
- Doesn't hide it from the provider or the cloud console

### Ways to supply secrets (best → worst)

1. **Secrets manager / Vault** fetched at runtime (best)
2. **Environment variable** `TF_VAR_db_password`
3. A `.tfvars` file **kept out of Git**
4. ❌ Hard-coded in `.tf` files committed to Git (never)

### HashiCorp Vault + Terraform

**Vault** is HashiCorp's secrets-management tool. Terraform can:

- **Read** secrets from Vault with the Vault provider (`data "vault_kv_secret_v2"`), so the secret never lives in your code
- Have Vault **issue dynamic credentials** (short-lived cloud keys) so there's no long-lived key to leak
- Authenticate to Vault using the provider config (token, AppRole, etc.)

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
}

data "vault_kv_secret_v2" "db" {
  mount = "secret"
  name  = "db"
}

resource "aws_db_instance" "main" {
  password = data.vault_kv_secret_v2.db.data["password"]
  # ...
}
```

🎯 Even then, the value fetched ends up **in state** if used in a resource. Protect state.

### Ephemeral values (newer feature)

Recent Terraform versions (1.10+) added **ephemeral** variables/resources whose values are **not persisted in state or plan files**. Useful for secrets and temporary tokens. Know the concept: *ephemeral = never written to state*.

### `.gitignore` for Terraform

```
.terraform/
*.tfstate
*.tfstate.*
*.tfvars        # if they contain secrets
crash.log
```

Keep `.terraform.lock.hcl` **committed**.

## 🧪 Lab 8 (no cloud)

```hcl
terraform {
  required_providers {
    local  = { source = "hashicorp/local" }
    random = { source = "hashicorp/random" }
  }
}

variable "env" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.env)
    error_message = "env must be dev or prod."
  }
}

variable "secret" {
  type      = string
  sensitive = true
  default   = "s3cr3t-value"
}

resource "random_pet" "p" {}

resource "local_file" "f" {
  filename = "${path.module}/f.txt"
  content  = "env=${var.env}"

  lifecycle {
    prevent_destroy = false   # try true later
    ignore_changes  = [content]
    precondition {
      condition     = length(var.env) > 2
      error_message = "env too short"
    }
  }
}

output "secret" {
  value     = var.secret
  sensitive = true
}
```

Do:

1. `terraform plan -var="env=test"` → read the validation error.
2. `terraform apply -var="env=dev"`. Output shows `<sensitive>`.
3. `terraform output secret` (reveals it) and `grep s3cr3t terraform.tfstate` (PowerShell: `Select-String s3cr3t terraform.tfstate`)? (var is not in state unless used by a resource, so also try putting the secret in `local_file` content and grep again to see plain text).
4. Edit `f.txt` by hand and change `content` in code. Plan shows **no change** thanks to `ignore_changes`.
5. Set `prevent_destroy = true`, run `terraform destroy` and read the error. Set it back and destroy.

## 🎯 Exam focus

- What each lifecycle argument does (**especially** `create_before_destroy`, `prevent_destroy`, `ignore_changes`).
- Difference between `validation`, `precondition`, `postcondition`, `check`.
- `sensitive` hides output only, state is plaintext.
- Vault: secrets retrieved at runtime, dynamic credentials.
- `-replace` replaces `taint`.
- Don't store secrets in code or Git.

## ❓ Quiz

1. Which lifecycle setting makes Terraform build the new resource before deleting the old?
2. What happens on `terraform destroy` if `prevent_destroy = true`?
3. Does `sensitive = true` encrypt the value in state?
4. Which condition type only warns instead of failing?
5. Where is `self` allowed?
6. How would you stop Terraform from reverting tags that another tool sets?

<details><summary>Answers</summary>

1. `create_before_destroy = true`.
2. It fails with an error.
3. No. State holds it in plain text.
4. `check` blocks.
5. In `postcondition` blocks (refers to the resource itself).
6. `lifecycle { ignore_changes = [tags] }`.
</details>
