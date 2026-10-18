# Lesson 10 — Backends, State Locking, Remote State, Workspaces and Drift

**Exam domain 6** · **Time:** 2.5 hours

## 🧠 Pre-concept: why local state isn't enough for teams

Local `terraform.tfstate` problems when several people (or a CI pipeline) work together:

1. **Sharing**: how does your teammate get the latest state?
2. **Conflicts**: two people apply at the same time and corrupt state
3. **Security**: secrets sit in a file on a laptop
4. **Loss**: laptop dies, state is gone, and Terraform "forgets" what it built

The fix: store state in a **remote backend**.

## What is a backend?

A **backend** defines **where state is stored** and **how operations run**. Configured inside the `terraform` block.

### Default: the `local` backend

State at `./terraform.tfstate`. No config needed.

### Remote backends

| Backend | Storage |
|---|---|
| `s3` | AWS S3 (+ locking via DynamoDB table **or** S3 native locking in newer versions) |
| `azurerm` | Azure Blob Storage |
| `gcs` | Google Cloud Storage |
| `remote` / **`cloud`** | HCP Terraform / Terraform Enterprise |
| `consul`, `pg`, `http`, `kubernetes` | others |

### S3 backend example

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "prod/network/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"   # legacy locking (see note)
  }
}
```

- `key` = the path/filename of the state **inside** the bucket
- `encrypt = true` = server-side encryption
- Enable **bucket versioning** so you can recover old states
- The bucket and lock table must exist **before** you use them (create them separately, a classic chicken-and-egg problem)
- Note: recent Terraform versions support **S3-native locking** (`use_lockfile = true`) and are moving away from DynamoDB. Know that locking exists and how it's enabled; check the current docs for the exact option.

### HCP Terraform backend (`cloud` block)

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "prod-network"
    }
  }
}
```

### ⚠️ Backend block restrictions

- **No variables, locals, or references** are allowed inside a `backend` block (it's evaluated before variables exist). Values must be literals, or supplied at init time (`-backend-config`).
- Only **one** backend per configuration.
- Credentials should come from environment/shared config, not the block.

### Partial configuration

```bash
terraform init -backend-config="bucket=my-bucket" -backend-config="key=dev/state"
# or
terraform init -backend-config=backend-dev.hcl
```

Lets you keep secrets and environment-specific values out of code.

## Changing backends

After editing the `backend` block, run `terraform init`. Terraform detects the change and asks to **migrate** existing state.

| Flag | Meaning |
|---|---|
| `-migrate-state` | Copy existing state to the new backend |
| `-reconfigure` | Use the new backend config, **ignore/don't migrate** old state |

## State locking

When an operation that can write state starts (`apply`, `destroy`, some `state` commands), Terraform **locks** the state so no one else can write at the same time.

- Prevents **corruption** from concurrent runs
- Automatic when the backend supports it. Not all do (check the docs)
- `-lock=false` disables it (dangerous)
- `-lock-timeout=60s` waits for the lock instead of failing immediately
- If a run crashes, a **stale lock** may remain: `terraform force-unlock <LOCK_ID>` (use only if you're sure nobody is running)

🎯 Exam: "What does state locking prevent?" → **concurrent operations corrupting state.**

## Remote state benefits

- **Shared** source of truth, with **locking**
- **Encryption at rest** and access control (IAM)
- **Versioning/backup** (S3 versioning)
- Enables **CI/CD** automation
- State **not** on laptops

## Reading another configuration's outputs: `terraform_remote_state`

```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state-bucket"
    key    = "prod/network/terraform.tfstate"
    region = "ap-south-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.subnet_id
}
```

- Only **root module outputs** of the other configuration are readable
- Needs read access to that state, so it can expose more than you want. Many teams prefer publishing values via a data source or SSM parameter instead.

## Workspaces (CLI workspaces)

A workspace is **a separate state within the same configuration and backend**. Same code, multiple states (e.g. dev/stage).

```bash
terraform workspace list
terraform workspace new dev
terraform workspace select dev
terraform workspace show
terraform workspace delete dev
```

- Default workspace is called **`default`** (can't be deleted)
- Reference the current name with `terraform.workspace`
- With the local backend the states live in `terraform.tfstate.d/<name>/`
- With S3, each workspace's state is under `env:/<name>/<key>`
- ⚠️ They're **not** a strong isolation mechanism for prod vs dev (same credentials, same backend). Many teams prefer separate folders/repos or HCP Terraform workspaces.
- **Don't confuse** CLI workspaces with **HCP Terraform workspaces** (Lesson 12), which are richer (each has its own variables, state, runs, and permissions).

## Drift ⭐

**Drift** = the real infrastructure no longer matches Terraform's state/config because it was changed **outside Terraform** (console clicks, scripts, another tool).

### How drift is detected

`terraform plan` refreshes (reads real resources), notices differences, and shows what it would do to **bring reality back to your config**.

### Handling drift: two choices

1. **Enforce the config** → `terraform apply` (overwrites the manual change)
2. **Accept the real-world change** → update your code to match, so plan shows no diff

### `-refresh-only`

```bash
terraform plan  -refresh-only    # shows how state would change to match reality
terraform apply -refresh-only    # writes the real values into state (no infra changes)
```

- This only **updates state**, never changes infrastructure
- It replaces the old standalone **`terraform refresh`** command, which is **deprecated** (it wrote to state without a review step)

### Preventing drift

- Restrict console access, do everything through Terraform/CI
- Schedule regular `plan` runs (HCP Terraform has **drift detection / health assessments**)
- Use `ignore_changes` for attributes legitimately managed elsewhere

## 🧪 Lab 10

### Part A: Workspaces (no cloud)

```hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local" }
  }
}

resource "local_file" "f" {
  filename = "${path.module}/${terraform.workspace}.txt"
  content  = "workspace is ${terraform.workspace}"
}
```

```bash
terraform init
terraform apply -auto-approve            # creates default.txt
terraform workspace new dev
terraform apply -auto-approve            # creates dev.txt (separate state!)
terraform state list                     # shows the dev workspace's resources
ls terraform.tfstate.d
terraform workspace select default
terraform workspace show
terraform destroy -auto-approve          # destroys default.txt only
terraform workspace select dev
terraform destroy -auto-approve
terraform workspace select default
terraform workspace delete dev
```

### Part B: Drift (no cloud)

1. Apply a `local_file` as before.
2. Edit the file's contents by hand.
3. `terraform plan` → drift shown, Terraform wants to restore.
4. `terraform plan -refresh-only` → shows state would be updated to the edited content.
5. `terraform apply -refresh-only` → state now has the edited value. Then `plan` shows it wants to change the file back to the **config's** content (since config still says the original).

### Part C: S3 backend (AWS, optional)

1. Manually create an S3 bucket (enable versioning).
2. Add the `backend "s3"` block, run `terraform init`, answer **yes** to migrate state.
3. See `terraform.tfstate` in S3.
4. Clean up: migrate back (`terraform init -migrate-state` after removing the block), destroy, and delete the bucket.

## 🎯 Exam focus

- Local vs remote backends, and why remote is better.
- What a backend block can/can't contain (no variables).
- State locking: purpose, `-lock-timeout`, `force-unlock`.
- `init -migrate-state` vs `-reconfigure`.
- `terraform_remote_state` reads **outputs** only.
- CLI workspaces: commands, `terraform.workspace`, `default`.
- Drift: definition, detection (plan), `-refresh-only`, `refresh` deprecated.
- The S3 backend: `bucket`, `key`, encryption, locking.

## ❓ Quiz

1. Name three benefits of a remote backend.
2. Can you use `var.bucket_name` inside a `backend` block?
3. What does state locking protect against?
4. What command is the modern replacement for `terraform refresh`?
5. How do you read another config's remote state, and what part of it?
6. What's the name of the initial workspace?
7. When would you use `terraform force-unlock`?
8. What flag migrates existing state when changing backends?

<details><summary>Answers</summary>

1. Sharing, locking, encryption/access control, versioning/backup, automation.
2. No. Backend blocks can't use variables or references.
3. Concurrent writes corrupting state.
4. `terraform apply -refresh-only` (and `plan -refresh-only`).
5. `data "terraform_remote_state"`; only root module outputs.
6. `default`.
7. To release a stale lock left behind by a crashed run, when you're sure nobody else is running.
8. `-migrate-state`.
</details>
