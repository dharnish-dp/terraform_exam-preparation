# Lesson 11 — Import, State CLI, Replace/Moved and Logging

**Exam domain 7** · **Time:** 2.5 hours

## 🧠 Pre-concept: infrastructure that already exists

Real life: your company already has 40 resources created by hand. You want Terraform to manage them **without destroying and recreating** them. Or: you want to rename a resource in code without Terraform deleting the real thing. This lesson covers those maintenance tasks.

## Part A: Importing existing infrastructure

**Import** = bring an existing real resource **into Terraform state** so Terraform starts managing it.

Two important facts:

1. Import adds the resource **to state** (the mapping).
2. You still need to **write the matching resource block** in your config, otherwise Terraform sees "in state, not in config" and plans to **destroy** it.

### Method 1: `import` block (modern, Terraform 1.5+)

```hcl
import {
  to = aws_s3_bucket.legacy
  id = "my-existing-bucket-name"
}

resource "aws_s3_bucket" "legacy" {
  bucket = "my-existing-bucket-name"
}
```

Then:

```bash
terraform plan     # shows "1 to import"
terraform apply    # performs the import
```

Advantages: reviewable in a plan, works in CI, can be committed, supports `for_each`.

### Generating configuration automatically

```bash
terraform plan -generate-config-out=generated.tf
```

With only the `import` block written (no resource block), Terraform **writes a draft resource block** for you in `generated.tf`. Review and clean it up before using.

### Method 2: `terraform import` command (older, still valid)

```bash
terraform import aws_s3_bucket.legacy my-existing-bucket-name
```

Syntax: `terraform import <RESOURCE_ADDRESS> <REAL_ID>`

- Immediately writes to state (no plan preview)
- Does **not** write config for you. You must write the resource block first
- The **ID format differs** per resource type (look at the resource's docs "Import" section)

### After importing

Run `terraform plan`. Ideal result: **no changes**. If it shows differences, adjust your config until it matches reality.

⚠️ Import brings in **one resource at a time** and doesn't automatically bring its dependencies/related resources (e.g. importing a server doesn't import its security group).

## Part B: The `terraform state` command family

Use these to **inspect or carefully modify** state. Prefer them over hand-editing JSON.

| Command | Purpose |
|---|---|
| `terraform state list` | List all resource addresses in state |
| `terraform state show <addr>` | Show attributes of one resource |
| `terraform state mv <src> <dst>` | Move/rename a resource's address in state |
| `terraform state rm <addr>` | **Remove** from state (Terraform **forgets** it; the real resource stays) |
| `terraform state pull` | Print the raw state (from remote too) |
| `terraform state push` | Upload a local state to the backend (dangerous) |
| `terraform state replace-provider` | Change the provider for resources in state |

### `state list` and `state show`

```bash
terraform state list
terraform state list module.web
terraform state show aws_instance.web
```

### `state mv` (rename/refactor without destroying)

You rename `aws_instance.web` → `aws_instance.app` in code. Without help, Terraform plans to destroy `web` and create `app`. Fix:

```bash
terraform state mv aws_instance.web aws_instance.app
terraform plan     # now: no changes
```

Also used to move a resource into/out of a module.

### Modern alternative: `moved` block (declarative, recommended)

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.app
}
```

Commit it with the rename. On next apply Terraform updates state automatically. Teammates and CI get the same fix, which is why it's preferred over the manual command.

### `state rm` (stop managing, don't destroy)

```bash
terraform state rm aws_instance.web
```

Real server **keeps running**. Terraform no longer knows about it. Remove or comment the config block too, or Terraform will plan to create it again.

Modern alternative: a `removed` block:

```hcl
removed {
  from = aws_instance.web
  lifecycle {
    destroy = false     # remove from state but keep the real resource
  }
}
```

### Summary table: which command for which situation

| Situation | Use |
|---|---|
| Resource exists, Terraform doesn't know it | `import` |
| Rename/move a resource in code | `moved` block / `state mv` |
| Stop managing but keep the real resource | `state rm` / `removed` block |
| Need to see what's in state | `state list` / `show` |
| Recreate a broken resource | `apply -replace=addr` |
| Real world changed, update state only | `apply -refresh-only` |

## Part C: Forcing recreation: `-replace` (and deprecated `taint`)

Resource is unhealthy (e.g. a server misconfigured at boot) and you want to rebuild it:

```bash
terraform plan  -replace="aws_instance.web"
terraform apply -replace="aws_instance.web"
```

- Terraform plans **destroy then create** for that resource only (or create-then-destroy if `create_before_destroy` is set)
- **`terraform taint <addr>`** marks a resource for recreation on next apply, and **`untaint`** reverses it. They're **deprecated**; `-replace` is preferred because you see the plan first and nothing gets marked in state until you apply.

## Part D: Debugging and logging

Terraform's detailed logs are controlled by **environment variables**.

| Variable | Purpose |
|---|---|
| `TF_LOG` | Enable logging at a level: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `TF_LOG_PATH` | Write logs to a file instead of the screen |
| `TF_LOG_CORE` | Log level for Terraform core only |
| `TF_LOG_PROVIDER` | Log level for providers only |

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
terraform plan

# turn off
unset TF_LOG
unset TF_LOG_PATH
```

**Windows PowerShell equivalent:**

```powershell
$env:TF_LOG = "DEBUG"
$env:TF_LOG_PATH = "./terraform.log"
terraform plan

# turn off
Remove-Item Env:TF_LOG
Remove-Item Env:TF_LOG_PATH
```

- **`TRACE`** is the most verbose (shows everything), and `ERROR` the least
- Logs can contain **sensitive data**. Be careful when sharing them
- Use `TF_LOG_PROVIDER=DEBUG` to see the API calls a provider makes (great for "why did AWS reject this?")

### Other troubleshooting tools

- `terraform validate`: syntax/consistency
- `terraform fmt -check`: style
- `terraform console`: test expressions
- `terraform show` / `state list`: inspect
- `terraform graph`: dependency graph
- `crash.log`: written if Terraform itself crashes. Include it in bug reports
- `terraform plan -detailed-exitcode`: exit codes for scripts (0 no changes, 1 error, 2 changes)

### Common error types

| Error | Typical cause |
|---|---|
| Syntax error | Typo, missing brace |
| "Reference to undeclared resource/variable" | Wrong name or missing declaration |
| "Provider requirements" / "Inconsistent lock file" | Need `terraform init` (or `-upgrade`) |
| "Error acquiring the state lock" | Someone else running, or stale lock |
| "Invalid credentials" / AccessDenied | Wrong/missing cloud credentials or permissions |
| "Resource already exists" | Exists outside Terraform → **import** it |
| "Cycle" | Circular dependency between resources |

## 🧪 Lab 11 (no cloud)

### Part A: Rename with `moved` and with `state mv`

```hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local" }
  }
}

resource "local_file" "old" {
  filename = "${path.module}/data.txt"
  content  = "hello"
}
```

1. `apply`. Rename the block to `local_file.new`. Run `plan` (destroy + create planned).
2. Add:

```hcl
moved {
  from = local_file.old
  to   = local_file.new
}
```

3. `plan` now shows a **move**, not a replace. Apply.
4. Rename again, this time fix it with `terraform state mv local_file.new local_file.newer`.

### Part B: `state rm`

1. `terraform state rm local_file.newer`
2. `ls` → the file still exists. `terraform state list` → empty.
3. Comment out the resource block. `plan` shows nothing to do.

### Part C: Import

Not every resource supports import (for example, `local_file` does not), so this part needs AWS. Use a free-tier S3 bucket:

1. Create a bucket by hand in the AWS console.
2. Write an `import` block plus a matching `resource "aws_s3_bucket"` block, as in Part A of this lesson.
3. Run `terraform plan` (it shows "1 to import"), then `terraform apply`.
4. Run `terraform plan` again → **No changes**.
5. Remove the resource block, keep only the `import` block, and run `terraform plan -generate-config-out=generated.tf` to see a generated draft.
6. Run `terraform destroy` to delete the bucket when done.

### Part D: Logging

```bash
TF_LOG=TRACE TF_LOG_PATH=trace.log terraform plan
wc -l trace.log
grep -i "provider" trace.log | head
```

On Windows PowerShell:

```powershell
$env:TF_LOG = "TRACE"
$env:TF_LOG_PATH = "trace.log"
terraform plan
(Get-Content trace.log).Count
Select-String -Pattern "provider" -Path trace.log | Select-Object -First 10
Remove-Item Env:TF_LOG
Remove-Item Env:TF_LOG_PATH
```

Then try `TF_LOG=ERROR` and compare the log size.

## 🎯 Exam focus

- Import: `import` block vs `terraform import`; you must write config; plan after import.
- `-generate-config-out`.
- The `state` subcommands (`list`, `show`, `mv`, `rm`, `pull`, `push`) and what each does.
- `state rm` = stop tracking, **does not destroy**.
- `moved` blocks vs `state mv`.
- `-replace` vs deprecated `taint`.
- `TF_LOG` levels (TRACE most verbose) and `TF_LOG_PATH`.
- Terraform only imports into state, not into config (the classic command).

## ❓ Quiz

1. After `terraform import`, what must you have written for it to work well?
2. What does `terraform state rm` do to the real resource?
3. Which `TF_LOG` level is most verbose?
4. How do you force Terraform to recreate one resource? Which older command did this?
5. What does `terraform state list` show?
6. Which block lets you rename a resource without destroying it?
7. What does `-generate-config-out` do?
8. Which variable writes logs to a file?

<details><summary>Answers</summary>

1. The matching `resource` block in configuration.
2. Nothing. It only removes it from state.
3. `TRACE`.
4. `terraform apply -replace="addr"`; older: `terraform taint`.
5. All resource addresses tracked in state.
6. `moved`.
7. Generates draft resource configuration for resources declared in `import` blocks.
8. `TF_LOG_PATH`.
</details>
