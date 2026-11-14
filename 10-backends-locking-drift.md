# 10 — Backends, State Locking, Remote State, Workspaces and Drift

> **Exam domain(s):** Implement and maintain state (backends, state locking, remote state), Read/generate/modify configuration (data sources, workspaces), Terraform workflow in a team   **Source:** lesson 7, lectures 131–139; lesson 6, lectures 129–130; drift from lesson 3, lectures 34–35   **Time:** ~4 h

## What you will learn

- Why a laptop-only Terraform workflow is risky, and how **Git** solves the code half of the problem.
- Why the **state file must not go in Git** (it holds plain-text secrets), with the instructor's RDS password demo.
- Which Terraform files to commit and which to ignore, and how to write a `.gitignore`.
- What a **backend** is, the default **local** backend, and how to configure explicit local and remote backends.
- What **state locking** is, how it works, the two different "lock" files you must not confuse, and the up-to-date S3 locking (`use_lockfile`).
- How to configure and use the **S3 backend**, step by step.
- How one team reads another team's outputs with the **`terraform_remote_state`** data source.
- What **CLI workspaces** are, how to create and switch them, and how to vary values with `terraform.workspace`.
- What **drift** is and the ways to reconcile it.

Where the rest lives:

| Topic | Chapter |
|---|---|
| State file basics, desired vs current state, refresh | [04 — State basics](04-state-basics.md) |
| `terraform state mv / rm / pull / push / replace-provider`, `import`, `removed` blocks | [11 — Import, state CLI, logging](11-import-state-cli-logging.md) |
| HCP Terraform workspaces, `cloud` block, remote runs | [12 — HCP Terraform](12-hcp-terraform.md) |
| `.terraform.lock.hcl` (provider dependency lock) in detail | [02 — Providers](02-providers.md) |
| `sensitive` values, ephemeral values, Vault | [08 — Lifecycle, conditions, sensitive](08-lifecycle-conditions-sensitive.md) |

---

## 🧠 Pre-concept: from "one laptop" to "a team"

Until now you ran Terraform from one laptop. `main.tf`, `variables.tf` and `terraform.tfstate` all sat in one local folder. That is fine for learning, but in a real organisation several engineers manage the same infrastructure, sometimes thousands of servers. So the question this chapter answers is: **how do you make Terraform safe and usable for a team?**

The answer is built in layers:

| Layer | Problem it solves | Section |
|---|---|---|
| Git for the code | Laptop failure, no sharing, no history of changes | [1](#1-git-for-team-collaboration) |
| Keep state OUT of Git | State holds plain-text secrets; `.terraform/` is huge | [2](#2-why-the-state-file-must-not-go-in-git), [3](#3-terraform-and-gitignore) |
| Remote backend | Where does state live if not on a laptop or in Git? | [4](#4-backends), [6](#6-the-s3-backend) |
| State locking | Two people applying at once corrupt state | [5](#5-state-locking) |
| `terraform_remote_state` | One team reads another team's outputs | [7](#7-the-terraform_remote_state-data-source) |
| Workspaces | One configuration, several separate states (dev/prod) | [8](#8-cli-workspaces) |
| Drift handling | Reality changed behind Terraform's back | [9](#9-drift-and-how-to-reconcile-it) |

The big picture:

```text
  Terraform CODE (.tf files)                 Terraform STATE (terraform.tfstate)
  -----------------------------              -----------------------------------
  -> central Git repo                        -> central REMOTE BACKEND (S3, Consul,
     (GitHub / Bitbucket ...)                   azurerm, GCS, Kubernetes ...)
  -> history, review, CI/CD                  -> encrypted, access-controlled, lockable
  -> NO state file, NO .terraform/           -> NOT in Git
```

---

## 1. Git for team collaboration

### Why a local-only workflow is risky

1. **Loss of code AND state.** If the laptop or its disk fails, you lose the Terraform code and the most important file, the state.
2. **Collaboration is hard.** In large environments a group of people manages the infrastructure. If the files only live on your laptop, other members cannot read or update them.
3. **No visible versioning.** If you edit something, break things, and only notice 2–3 days later, there is no history to roll back to.

### The Git-based approach

All Terraform code (`main.tf`, `variables.tf`, `terraform.tfvars` and so on) goes into a central Git repository (GitHub, Bitbucket and so on). All DevOps team members who manage the infrastructure get access.

```text
LOCAL ONLY                              GIT-BASED
-----------                             ---------
 Laptop                                  Alice's laptop --\
  |- main.tf                                                \
  |- variables.tf                          Bob's laptop  ----> [ Central Git repo ]
  |- terraform.tfvars                                         /   history, review,
  |- terraform.tfstate  <- lost if                 CI/CD  ---/    approvals, CI/CD
        disk dies
```

| Benefit of Git | Meaning |
|---|---|
| Centralised access | Every team member can fetch the code |
| Full version history and change tracking | See what changed, and which team member changed it |
| Code review / approval workflows | Pull-request style review before changes are applied |
| CI/CD integration | Automated validation and `terraform plan` |

**Rule from the instructor:** after editing Terraform files and changing infrastructure, **always commit the latest changes**, so every team member works from the latest version. Otherwise someone with an old copy of the variables or Terraform files will modify infrastructure based on out-of-date code.

### The demo project

A tiny project in `/tmp/terraform`. The security group name comes from a variable whose value is in `terraform.tfvars`.

`main.tf`

```hcl
resource "aws_security_group" "allow_tls" {
  name        = var.sg_name
  description = "Managed from Terraform"
}
```

- `aws_security_group.allow_tls` is a firewall in AWS.
- `name = var.sg_name`: the name is not hardcoded; it comes from an input variable.
- `description` is the text edited later in the Git demo.

`variables.tf`

```hcl
variable "sg_name" {}
```

Declares the input variable (no type or default, so a value must be supplied).

`terraform.tfvars`

```hcl
sg_name = "kplabs-firewall"
```

Supplies the value automatically (Terraform auto-loads `terraform.tfvars`; see [chapter 06](06-variables-outputs-locals.md)).

### Demo walkthrough

1. In the local folder run `terraform apply -auto-approve`. The security group is created and `terraform.tfstate` appears next to the `.tf` files. Everything exists only on this computer.
2. If the disk fails, all of it is gone, and teammates cannot reach it.
3. On GitHub, create a repo (here `tmp-terraform`, empty). The instructor used "upload files" in the web GUI for simplicity; **ideally you use the CLI**. Commit with a message like "committed Terraform files".
4. The files are now safe in Git even if the laptop dies.
5. Edit `description` from `Managed from Terraform` to `managed from TF` and commit. The commit **history** shows the old and new value and who changed it, which is very useful for tracing a breaking change.

### Gotcha: do NOT commit everything

In the GUI demo the instructor uploaded *everything*, including `terraform.tfstate` and the `.terraform` folder, and then flagged this as a mistake:

- `.terraform/` is **very large**. In the demo it was over **800 MB** with just the single AWS provider. Anyone can regenerate it with `terraform init`, so committing it is pointless.
- `terraform.tfstate` should not be committed either (next two sections).

🎯 **Exam focus:** Terraform code belongs in version control; the state file does not. Git gives history/change tracking, review workflows and CI/CD hooks. The `.terraform` directory is re-creatable with `terraform init`, so never commit it.

---

## 2. Why the state file must not go in Git

The state file can contain **secrets in plain text**: passwords, tokens and so on. Committing it to Git means everyone with read access to the repo can read them. The instructor is careful: it is not a risk in 100% of cases, but it **is** a risk whenever sensitive values are in the state, and that can change in 6–12 months when you add new kinds of infrastructure.

Typical ways exposure happens:

- The repository is public, shared more widely than intended, or compromised.
- Repo permissions go far beyond what is necessary (for example, a new hire gets read access and now sees the production database password).
- A laptop that has the repo cloned is compromised.

### Demo 1: hardcoded password

```hcl
resource "aws_db_instance" "default" {
  allocated_storage    = 10
  db_name              = "mydb"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  username             = "foo"
  password             = "<hardcoded-password-here>"   # literal demo password
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
}
```

| Argument | Meaning |
|---|---|
| `allocated_storage = 10` | 10 GB of storage |
| `db_name` | Initial database name |
| `engine = "mysql"`, `engine_version = "8.0"` | DB engine and version |
| `instance_class = "db.t3.micro"` | Size of the DB instance |
| `username`, `password` | Master credentials. The password is what ends up in state |
| `parameter_group_name` | Default MySQL 8.0 parameter group |
| `skip_final_snapshot = true` | Do not take a snapshot on destroy (convenient for demos) |

```bash
terraform init
terraform apply -auto-approve      # RDS creation took ~4 minutes in the demo (can be 5-10)
# open terraform.tfstate and scroll: username and password are visible in plain text
terraform destroy -auto-approve    # also ~4 minutes
```

⚠️ **Cost:** RDS may incur charges. You do not need to repeat this demo; it is for understanding.

### Demo 2: the "smart" workaround with `file()` (still leaks)

Idea: keep the password out of the `.tf` file by reading it from a text file outside the project.

1. Create `outside-folder/pass.txt` containing the password.
2. Change `db.tf` so the password reads from the file:

   ```hcl
   resource "aws_db_instance" "default" {
     allocated_storage    = 10
     db_name              = "mydb"
     engine               = "mysql"
     engine_version       = "8.0"
     instance_class       = "db.t3.micro"
     username             = "foo"
     password             = file("outside-folder/pass.txt")
     parameter_group_name = "default.mysql8.0"
     skip_final_snapshot  = true
   }
   ```

   `file(path)` reads the file contents at plan/apply time. The path must be in double quotes (the instructor hit this syntax error first).
3. `terraform plan` shows the password as `(sensitive value)`. But that hides it **only in CLI output**.
4. `terraform apply -auto-approve`, then open `terraform.tfstate`: **the password is still there in plain text.**
5. `terraform destroy -auto-approve`.

> **Key lesson:** even if you do not hardcode the value in the configuration (you fetch it with `file()`, a variable or elsewhere), **the resolved value is still written to the state file.** `(sensitive value)` only masks CLI display, not the state.

So: keep state out of Git, and store it in a secured, encrypted remote backend with tight access (sections 4–6).

🎯 **Exam focus:**

- State can contain secrets in plaintext, regardless of how the secret was supplied (literal, variable, `file()`).
- `sensitive = true` hides values in plan/apply output only; it does not encrypt them in state. This is a classic exam statement.
- Solution direction: a remote backend with encryption and access control, not Git.

> **Up to date (TF 1.12):** newer features can keep some values out of state entirely: **ephemeral values** and **write-only arguments** (see [chapter 08](08-lifecycle-conditions-sensitive.md)). Support depends on the resource and provider.

---

## 3. Terraform and `.gitignore`

(The instructor notes that this lecture is slightly off-topic because it teaches Git. It is needed for the repo hygiene above.)

### Files and folders that should NOT be committed

| Item | Why |
|---|---|
| `.terraform/` folder | Downloaded provider plugins and child modules; can be huge; re-created by `terraform init` |
| `*.tfvars` (such as `terraform.tfvars`) | Often holds sensitive information. Not mandatory ("depends on the requirement"): if it holds nothing sensitive you can commit it |
| `terraform.tfstate`, `terraform.tfstate.backup` (`*.tfstate.*`) | May contain secrets |
| `crash.log` | When Terraform crashes, the debug log is written to `crash.log` |
| State lock info file (`.terraform.tfstate.lock.info`) | Created while state is being written and removed automatically afterwards, so rarely present anyway |
| Saved plan files | If you save a plan to a file (see [chapter 03](03-core-workflow.md)), do not commit it |

### What you SHOULD commit

1. All your Terraform code files (`*.tf`).
2. The **dependency lock file `.terraform.lock.hcl`**: "very important, always commit it".
3. The `.gitignore` file itself.
4. Optionally a `README` describing the code, input variables and outputs. Useful for newcomers.

### What `.gitignore` is

A text file in the repo root telling Git which files, folders and patterns to ignore. The entries are applied at `git add` / `git commit` time, which protects you against accidentally committing secrets.

### Demo: two repos (`tmp-tf-01` vs `tmp-tf-02`)

Three empty files: `01.txt`, `02.txt` and `secrets.txt`. Goal: commit `01.txt` and `02.txt` but not `secrets.txt`.

```bash
git clone <repo-1-url>
git clone <repo-2-url>
# copy 01.txt 02.txt secrets.txt into BOTH folders
```

Repo 1, no `.gitignore`:

```bash
cd tmp-tf-01
git add .
git commit -m "first commit"
git push
# GitHub: all THREE files are committed, including secrets.txt  <-- the problem
```

Repo 2, with `.gitignore`:

```bash
cd tmp-tf-02
echo "secrets.txt" > .gitignore       # the file content is just: secrets.txt
git add .
git commit -m "first commit"
git push
# GitHub: only 01.txt, 02.txt (and .gitignore). secrets.txt is NOT listed
```

### Ready-made Terraform template

When creating a repo on GitHub you can choose **Add .gitignore** and pick the **Terraform** template (Bitbucket may differ slightly). As shown in the lecture, it ignores `.terraform`, `*.tfstate`, `*.tfstate.*` (the wildcard catches `terraform.tfstate.backup`), crash logs, `*.tfvars` and the lock-info file. You can add or remove entries to suit your organisation.

For reference, the standard GitHub Terraform template looks like this (general knowledge, not from the transcript):

```gitignore
# Local .terraform directories
**/.terraform/*

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude all .tfvars files, which are likely to contain sensitive data
*.tfvars
*.tfvars.json

# Ignore override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# CLI configuration files
.terraformrc
terraform.rc
```

The template does **not** ignore `.terraform.lock.hcl`, which is why the lock file gets committed.

| Commit | Do NOT commit |
|---|---|
| `*.tf`, `.terraform.lock.hcl`, `.gitignore`, README | `.terraform/`, `*.tfstate`, `*.tfstate.backup`, `crash.log`, saved plans, lock-info file, `*.tfvars` if sensitive |

⚠️ **Gotcha:** `.gitignore` only affects files that are **not yet tracked**. It does not remove a file you already committed. If `terraform.tfstate` was committed once, adding it to `.gitignore` is not enough: you must remove it from Git (`git rm --cached`) and treat any secrets in it as leaked. (General Git knowledge.)

⚠️ **Gotcha:** `*.tfvars` is ignored by the template because it often contains secrets, but that is not a hard rule.

🎯 **Exam focus:** `.terraform.lock.hcl` = provider version lock; **commit it**. Do not confuse it with the state lock file (section 5).

---

## 4. Backends

### Definition

A **backend** determines **where Terraform stores its state file** and, for some backends, how operations run and whether locking is available.

### The default: the local backend

If you do not specify a backend, Terraform uses the **local backend** and writes `terraform.tfstate` in the **same project folder**.

Demo base file:

```hcl
resource "aws_security_group" "prod" {
  name = "production-sg"
}
```

After `terraform init` and `terraform apply -auto-approve`, the security group exists and a `terraform.tfstate` file appears in the project folder.

### The problem with local state

```text
  Alice's laptop                         Bob's laptop
  sg.tf + terraform.tfstate              (needs BOTH sg.tf AND terraform.tfstate
                                          before he can add arguments/resources)
```

Local state hinders team collaboration. The state may hold sensitive data, so it must not go in Git ("a big no-no from the security point of view").

### Recommended production architecture

```text
 .tf files          --------------->  Central Git repo (GitHub/Bitbucket/...)
 terraform.tfstate  --------------->  Central REMOTE BACKEND (S3, Consul, ...)  - can be encrypted
```

### Supported backends

Terraform supports many backends; local is just one. The lecture names **Consul, S3 (used "quite extensively"), azurerm (Azure), GCS (Google Cloud) and Kubernetes**, "and so on". The configuration syntax is different for each backend (see the docs under "backend configuration"). Which one an organisation picks usually depends on its cloud provider.

| Backend | Where state is stored |
|---|---|
| `local` (default) | A file on disk (`terraform.tfstate`) |
| `s3` | AWS S3 bucket |
| `azurerm` | Azure Blob Storage |
| `gcs` | Google Cloud Storage |
| `consul` | HashiCorp Consul key-value store |
| `kubernetes` | A Kubernetes secret |
| `pg`, `http` | PostgreSQL, a generic HTTP endpoint |
| `remote` / `cloud` | HCP Terraform / Terraform Enterprise (see [chapter 12](12-hcp-terraform.md)) |

> **Up to date (TF 1.12):** the table above goes beyond the three named in the lecture (general Terraform knowledge). For HCP Terraform, use the **`cloud` block** (which sits inside `terraform { }`). The older `remote` backend still works but `cloud` is the recommended integration; see [chapter 12](12-hcp-terraform.md).

### The backend block anatomy

The `terraform` block is always the same. The **backend name** (the label) and the **configuration inside** change per backend.

```hcl
terraform {
  backend "local" {          # <- backend type
    path = "prod.tfstate"    # <- local-specific settings
  }
}
```

```hcl
terraform {
  backend "s3" {             # <- different type
    bucket = "..."           # <- S3-specific settings
    key    = "..."
    region = "..."
  }
}
```

### Explicit local backend

You can declare the local backend explicitly and set options such as `path`, for example to put the state in a different folder or give it a different name.

```hcl
terraform {
  backend "local" {
    path = "prod.tfstate"
  }
}
```

- `terraform { ... }` is the settings block.
- `backend "local"` chooses the backend type by its label.
- `path` is the file name/location of the state file. Here `prod.tfstate` replaces `terraform.tfstate`; it could also be a path in another folder.

**Best practice:** put it in a separate file named **`backend.tf`**, not in `sg.tf`. It works either way technically, but a dedicated file makes it easy to find among 40–50 files.

### Demo walkthrough

1. `terraform destroy` the existing security group and delete the old `terraform.tfstate`.
2. Create `backend.tf` with the block above.
3. Because a backend is now configured, run **`terraform init`** first.
4. `terraform apply -auto-approve`.
5. The project folder now contains **`prod.tfstate`**, not `terraform.tfstate`.

### Authentication to remote backends

Accessing a remote state service needs credentials. With the S3 backend, Terraform needs credentials that can read and write the S3 bucket; otherwise S3 refuses to store or fetch the state. Terraform uses those credentials to push and pull the state.

### Locking support varies

Some backends are just a "plain remote disk"; others also support **state locking**. Read each backend's documentation before choosing. For example the Consul page says it supports state locking. More in [section 5](#5-state-locking).

### Local vs remote backend

| Aspect | Local backend (default) | Remote backend (S3, Consul, GCS, azurerm ...) |
|---|---|---|
| State location | `terraform.tfstate` in project folder (or custom `path`) | Central service |
| Team collaboration | Poor: state must be copied around | Good: everybody uses the same state |
| Risk if laptop dies | State lost | State safe on the remote service |
| Encryption / access control | Whatever your disk offers | Provided by the backend (S3 encryption, IAM) |
| State locking | Local lock info file | Depends on the backend |
| Credentials needed | No | Yes (access to the backend) |
| Typical production use | No | Yes |

### Backend rules to remember

- After adding or changing a backend, run **`terraform init`**.
- Not every backend supports locking: check the docs.
- The backend is configured inside a `terraform { }` block; the backend type is the block label.
- **Backend blocks cannot reference variables, locals or data sources.** The values must be literal (or supplied at init time, see below). This is a common exam point (extra context).

> **Up to date (TF 1.12) — init flags for backends** (extra context, not shown in the lecture):
>
> | Flag | Use |
> |---|---|
> | `terraform init -migrate-state` | Copy existing state from the old backend to the new one when you change backends (Terraform also asks interactively). |
> | `terraform init -reconfigure` | Re-initialise the backend and **ignore** the previous configuration (no migration). |
> | `terraform init -backend-config="key=value"` or `-backend-config=file.hcl` | **Partial configuration**: supply some backend settings (bucket name, secrets) at init time so they are not hardcoded. |

### The `.terraform` folder and backend config

`terraform init` records the backend configuration in `.terraform/terraform.tfstate` (a small file, not your real state). This is another reason never to put credentials in a `backend` block: they would also be stored in `.terraform/` and in plan files. Use environment variables, a shared credentials file/profile, or an IAM role instead.

---

## 5. State locking

### The problem: concurrent writes

If Alice and Bob run `terraform apply` on the same project at the same time, both processes try to modify the same state file. Concurrent changes give a high chance of **corruption and inconsistency**. We want **one write process at a time**.

Analogy from the lecture: you cannot talk to two people on the phone on different topics at the same time. One call at a time.

### What state locking is

A mechanism that prevents multiple operations from making concurrent changes to the state. While Terraform is modifying the state it **locks** it. Anyone else who tries gets an error immediately.

### The locking flow

1. Before any **write** operation, Terraform tries to **acquire the lock**.
2. If acquired, the write operation proceeds (`apply`, `destroy` and so on); other processes are blocked.
3. When the write completes, Terraform **releases the lock**, so others can acquire it.

```text
 User            Terraform                 Backend (state file)
  | terraform apply  |                            |
  |----------------->| 1. request state lock ---->|
  |                  |<--- lock acquired ---------|
  |                  | 2. read/modify state  ---->|   (anyone else now gets
  |                  |    (apply / destroy)       |    "Error acquiring the state lock")
  |                  | 3. state updated      ---->|
  |                  | 4. release lock       ---->|
  |<-- done ---------|                            |
        (now Bob can run apply/plan/destroy)
```

How the lock is implemented depends on the backend. With the **local backend**, Terraform uses a lock file in the working directory: **`terraform.tfstate.lock.info`** (the name used in the lecture; see the note below). It is **automatically removed** when the write finishes.

> **Note on the file name:** the lecture calls it `terraform.tfstate.lock.info`. The real file is hidden, with a leading dot: `.terraform.tfstate.lock.info`. This is the same file.

Typical error when locked:

```text
Error: Error acquiring the state lock

Error message: The process cannot access the file because another process
has locked a portion of the file.
```

(The Windows-flavoured message is what the instructor showed. The text varies by OS and backend. On Linux/macOS and with remote backends you typically also see `Lock Info:` with `ID`, `Path`, `Operation`, `Who`, `Version` and `Created`.)

### Demo: hold the lock with `time_sleep`

The `time_sleep` resource (from the `hashicorp/time` provider) just waits, so `apply` runs long and keeps the lock held.

```hcl
resource "time_sleep" "wait_100_seconds" {
  create_duration = "100s"
}
```

- `create_duration = "100s"`: wait 100 seconds on create, so `apply` runs for 100 s.
- The lecture uses 100 s; the repo's standalone `sleep.tf` uses `wait_300_seconds` / `"300s"` (a longer variant). Either works.

```bash
terraform init
terraform apply -auto-approve          # terminal 1 (holds the lock)
terraform plan                         # terminal 2, while apply is still running
```

Step by step:

1. The folder initially has `.terraform/`, `sleep.tf` and `.terraform.lock.hcl`.
2. **`.terraform.lock.hcl` is NOT the state lock.** It only pins provider versions and has nothing to do with state locking.
3. During `apply` a new file **`terraform.tfstate.lock.info`** appears. It contains a lock ID and **who** acquired the lock (the OS user, `zealv` in the demo), which is handy with multiple users.
4. After about 100 s the apply finishes and the lock file disappears automatically.
5. Re-run: delete `terraform.tfstate`, run `terraform apply -auto-approve` again, and the lock file reappears.
6. In another tab run `terraform plan`. You get an **immediate error**: *Error acquiring the state lock — The state file could not be read — ... another process has locked a portion of the file.*
7. Once the apply completes and the lock file is gone, `terraform plan` works.

### Two different "lock" files: do not confuse

| File | Purpose | Commit to Git? |
|---|---|---|
| `.terraform.lock.hcl` | Locks **provider versions and checksums** (dependency lock file) | **Yes** |
| `terraform.tfstate.lock.info` (local backend) | Temporary **state lock** while writing state | **No** (auto-removed) |

### Choose a backend that supports locking

For production organisations, **verify that the backend supports state locking**. Docs examples in the lecture: **Consul** ("This backend supports state locking") and **S3** (also supports locking, see the next section).

### Escape hatches (extra context, not shown in the lecture)

| Command / flag | What it does |
|---|---|
| `terraform force-unlock <LOCK_ID>` | Manually release a **stale** lock (for example after a crash or lost network). Use the ID printed in the error. Only do this when you are sure nobody is really running. |
| `-lock=false` | Run `plan`/`apply` without taking a lock. **Dangerous.** |
| `-lock-timeout=30s` | Wait up to that long for the lock instead of failing immediately. |

🎯 **Exam focus:**

- Locking applies to operations that can write state (`apply`, `destroy` and so on). Even `plan` fails while the state is locked by another running operation, as the demo showed (with refresh, `plan` can write state, so it takes the lock too).
- Locks are acquired automatically and released automatically on completion.
- Local backend: a file; other backends use their own mechanism (Consul sessions, an S3 lock object, and so on).
- `.terraform.lock.hcl` (provider versions) != state lock.

---

## 6. The S3 backend

The S3 backend stores the state file in a specific **S3 bucket** instead of the project folder. This is the worked example of "how you add a backend": any other backend follows the same pattern.

### Files

Base file `sg.tf`:

```hcl
resource "aws_security_group" "prod" {
  name = "production-sg"
}
```

`backend.tf` (change the bucket name to your own!):

```hcl
terraform {
  backend "s3" {
    bucket       = "kplabs-demo-bucket-007"
    key          = "production.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}
```

(The lesson's repo writes `use_lockfile = "true"` as a string. The conventional form is the boolean `true`, shown above.)

| Argument | Meaning |
|---|---|
| `bucket` | Name of the S3 bucket that holds the state. It **must already exist**. Bucket names are **globally unique across all AWS accounts**, so pick your own (lecture example: `kplabs-demo-bucket-007`). |
| `key` | Object path/name inside the bucket. If the bucket has sub-folders, include the path (for example `network/terraform.tfstate`). Here `production.tfstate` goes in the bucket root. |
| `region` | Region where the **bucket** lives (`us-east-1`). Unrelated to the region of the provider (see below). |
| `use_lockfile` | Enables S3-native state locking via a lock file. Default `false`. |

If an argument like `use_lockfile` is missing in your docs version, read the "state locking" section of the S3 backend page: it lists the available options (the instructor shows that `use_lockfile` = "whether to use a lockfile for locking the state file; default false").

### Walkthrough

1. In the AWS console: **S3 -> Create bucket**, choose a unique name, and note the region.
2. Create `backend.tf` as above. (The same block would work inside `sg.tf`, but a dedicated `backend.tf` is the production convention.)
3. Run `terraform init`. It **initialises the backend**, which is required whenever a backend is added or changed.
4. Run `terraform apply -auto-approve`. The security group is created.
5. Notice that there is **no `terraform.tfstate`** in the project folder.
6. Refresh the bucket in the S3 console: **`production.tfstate`** is there.

Expected `init` output (abridged):

```text
Initializing the backend...

Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.
```

### Same flow for other backends

For Kubernetes, azurerm, GCS and so on: the backend name changes and the settings inside change, but the workflow (write the block, `terraform init`, `apply`, state appears remotely) is the same.

### Backend region vs provider region

The bucket region in the `backend` block and the provider region are independent. A sample in the course repo stores state in a `us-east-1` bucket (`key = "network/terraform.tfstate"`) while the AWS provider creates resources in `us-west-2`. That is allowed: the backend region is only where the state bucket lives; the provider region is where your resources are created.

### Up-to-date S3 locking and hardening

> **Up to date (TF 1.12): DynamoDB vs `use_lockfile`.** Older Terraform versions locked S3 state with a **DynamoDB table** (`dynamodb_table = "s3-state-lock"`). Many older tutorials, and old sample code in the course repo, still show this. Since **Terraform 1.10** the S3 backend can lock natively with **`use_lockfile = true`**: Terraform writes a small lock object next to the state in the same bucket (named `<key>.tflock`, for example `production.tfstate.tflock`). The `dynamodb_table` argument is **deprecated** and will be removed in a future minor version. For new code, use `use_lockfile`. The exam objective is the *concept* of locking; if a question lists both, know that DynamoDB was the classic way and the lock file is the modern S3-native way.

Extra context (not in the lecture) for a production-quality S3 backend:

```hcl
terraform {
  backend "s3" {
    bucket       = "my-org-terraform-state-prod"
    key          = "network/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true            # server-side encryption of the state object
    use_lockfile = true            # native S3 locking, Terraform >= 1.10
  }
}
```

- Enable **bucket versioning** so you can roll back a damaged or overwritten state.
- Enable **encryption** (`encrypt = true`, optionally `kms_key_id`).
- Block public access on the bucket.
- Give each person or pipeline the minimum IAM permissions: list the bucket, get/put the state object, and (for locking) put/get/delete the `.tflock` object.
- **Never hardcode `access_key` and `secret_key` in the backend block.** The course repo's old `terraform-multistate/ec2/backend.tf` does exactly that: do not copy the pattern. Credentials in backend config end up in `.terraform/` and in plan files. Use environment variables (`AWS_ACCESS_KEY_ID` and so on), a shared credentials profile, or an IAM role.

### Backend flavours of `plan`/`apply` output

You do not need a different command to use a remote backend. `plan`, `apply`, `destroy` and `terraform state ...` all transparently read and write the remote state. For example `terraform state list` against the S3 backend lists resources straight from the bucket ([chapter 04](04-state-basics.md#8-inspecting-state-safely-terraform-state-list-and-terraform-state-show)). `terraform state pull` downloads and prints it ([chapter 11](11-import-state-cli-logging.md)).

🎯 **Exam focus:**

- `terraform init` is required after configuring or changing a backend.
- S3 backend minimum arguments: `bucket`, `key`, `region`.
- The state is no longer local once the S3 backend is in use (no `terraform.tfstate` in the folder).
- Credentials with S3 access are required; never hardcode them in the backend block.
- Enable bucket versioning and encryption for state buckets; `encrypt = true` is a backend argument.
- Locking on S3: `use_lockfile = true` (modern) or `dynamodb_table` (legacy).

---

## 7. The `terraform_remote_state` data source

### The challenge

In medium and large organisations several teams manage different parts of the infrastructure with Terraform, each with its own project and state. Example from the lecture:

- The **Networking team** manages public IP addresses (Elastic IPs). Their state is stored remotely in an S3 bucket, and their code defines **output values** listing the IPs.
- The **Security team** manages firewall rules. They need to whitelist all the IPs created by the networking team.

```text
 Networking team project                         Security team project
 -----------------------                         ---------------------
 eip.tf   -> creates EIP                         sg.tf -> security group rule
 output "eip_addr"                                        cidr = <networking EIP>/32
 backend: S3 (eip.tfstate)  <--- reads outputs --- data "terraform_remote_state"
```

The security team's code must:

1. Connect to the S3 bucket where the networking team's state lives (so it needs access to it).
2. Fetch the IP addresses from the **output values** in that state.
3. Use them in firewall rules.

The manual way (copy the IP out of `eip.tfstate` and paste it into the security group rule) is not recommended: when the EIP changes you must repeat the work. The right way is the **`terraform_remote_state` data source**, which automatically connects to a remote state and reads its outputs. It works for the same team or a different team, and it is not limited to IPs or firewalls: it works for any dependency on another project's output.

### Proof that it is not hardcoded

In the networking folder:

```bash
terraform destroy -auto-approve     # EIP destroyed
terraform apply  -auto-approve      # new EIP created, with a new IP address
```

Then in the security folder `terraform plan` shows the **new** IP. It was re-read from the other team's remote state.

### Practical: build it

Create two folders, `networking-team` and `security-team`.

#### Step A: networking team creates the EIP and publishes an output

`eip.tf`

```hcl
resource "aws_eip" "lb" {
  domain = "vpc"
}

output "eip_addr" {
  value = aws_eip.lb.public_ip
}
```

- `aws_eip.lb` is an Elastic IP (public IP) in the VPC (`domain = "vpc"`).
- `output "eip_addr"` exposes the allocated IP. **This is what the other team reads.**

Create an S3 bucket (the instructor used `kplabs-networking-bucket-demo`; names are globally unique, so choose your own).

`backend.tf`

```hcl
terraform {
  backend "s3" {
    bucket = "<your-bucket-name>"
    key    = "eip.tfstate"
    region = "us-east-1"
  }
}
```

The bucket must be in `us-east-1` for this `region` value. `key = "eip.tfstate"` places the file in the root of the bucket.

In `networking-team`:

```bash
terraform init
terraform plan
terraform apply -auto-approve
```

Result: the EIP is created and the output prints the IP (`44.195.111.26` in the demo). `eip.tfstate` appears in the bucket, and its `outputs` section holds `eip_addr`. Verify under **EC2 -> Elastic IPs**.

⚠️ **Cost note:** an Elastic IP that is **not attached** to a running instance is charged. Destroy when finished.

#### Step B: security team base code (hardcoded CIDR)

`sg.tf`

```hcl
resource "aws_security_group" "allow_tls" {
  name = "allow_tls"
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv4" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "172.31.20.30/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}
```

This creates security group `allow_tls` with one inbound rule on TCP/443 for a fixed `/32` CIDR. The goal is to replace the hardcoded CIDR with the networking team's EIP.

#### Step C: define the remote state data source

`data.tf`

```hcl
data "terraform_remote_state" "vpc" {
  backend = "s3"

  config = {
    bucket = "<your-bucket-name>"
    key    = "eip.tfstate"
    region = "us-east-1"
  }
}
```

| Part | Meaning |
|---|---|
| `data "terraform_remote_state" "vpc"` | Built-in data source; local name `vpc` |
| `backend = "s3"` | Which backend type holds the other state (S3, Consul and so on) |
| `config = { ... }` | The same settings you would use in a `backend "s3"` block. The instructor copied bucket/key/region from the networking team's `backend.tf` |

The documentation page for the data source shows a generic example (not S3-specific); adapt `backend` to `s3` and `config` to your bucket, key and region.

Note `config = { ... }` uses an **equals sign** (it is an argument holding a map, not a nested block). Old 0.11-era examples in the course repo write `config { ... }` without it; that is outdated syntax.

#### Step D: reference the output

Final `sg.tf` for the security team:

```hcl
resource "aws_security_group" "allow_tls" {
  name = "allow_tls"
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv4" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "${data.terraform_remote_state.vpc.outputs.eip_addr}/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
}
```

- Reference pattern: `data.terraform_remote_state.<local_name>.outputs.<output_name>`, here `data.terraform_remote_state.vpc.outputs.eip_addr`.
- It is wrapped in `"${...}/32"` string interpolation because AWS expects a CIDR (a single IP needs `/32`).

#### Step E: run it in `security-team`

```bash
terraform init
terraform validate       # no mistakes
terraform plan
```

The plan shows `cidr_ipv4 = "44.195.111.26/32"`, the value read from the remote state, the same as the EIP created by the networking team. The lecture ends at `plan` (no apply).

### Data flow

```text
 networking-team                         S3 bucket                       security-team
 terraform apply  --writes state-->  eip.tfstate {outputs.eip_addr}  <--reads--  terraform plan/apply
                                                                           data.terraform_remote_state.vpc.outputs.eip_addr
                                                                           -> cidr_ipv4 = "<ip>/32"
```

⚠️ **Gotchas:**

- Outputs must be defined in the producing project. If there is no `output`, there is nothing to read.
- If the producing team destroys and re-applies, the IPs change; the consumer sees the new value on its next plan.
- The producer's backend bucket/key/region must match exactly what the consumer's `config` says.
- Bucket names in the course repo are the instructor's: use your own.

> **Up to date (TF 1.12) / design caveats (extra context):** the data source exposes only the other configuration's **root-module outputs**. If you need a value, the other team has to output it. The data source also needs read access to the **entire** state file, which can contain secrets, so give read access carefully. Many teams prefer other ways to share values (a data source that looks the resource up directly, SSM Parameter Store, and so on). For HCP Terraform workspaces there is also the `tfe_outputs` data source.

🎯 **Exam focus:**

- `data "terraform_remote_state"` reads **output values** from another configuration's state.
- Two steps: define the data source (`backend` + `config` pointing at the state), then reference `data.terraform_remote_state.<name>.outputs.<output_name>`.
- The reader needs read access to the backend (for example the S3 bucket).
- It reads state from a backend; it does not require the producer's code.

---

## 8. CLI workspaces

### Analogy

Think of multiple virtual desktops in an operating system. Each desktop has its own set of open windows (browser, terminal, editor). Switching desktop gives you a clean environment. A Terraform workspace similarly **separates environments**.

### Background: configuration and state

Infrastructure created by Terraform is tied to a configuration **and** a state file (`terraform.tfstate`). If you add another resource to the same file and apply, it is tracked in the same state file.

**Question:** can one configuration have **multiple state files**, so that different environments are tracked separately? **Yes: Terraform workspaces.**

```text
                          ┌── workspace "dev"  ──> dev state  ──> EC2 in dev environment
 one configuration  ──────┤
 (EC2 code)               └── workspace "prod" ──> prod state ──> EC2 in prod environment
```

- In the *dev* workspace, `terraform apply` creates the infrastructure for the development environment; in the *prod* workspace it creates it for production.
- Benefit: the same configuration deploys to multiple environments, **avoiding code repetition**, and simplifying life for smaller environments.

### Demo overview (lecture 129)

1. `terraform workspace list` shows `default`, `dev` and `prod`; the `*` marks the current workspace.
2. `terraform workspace select dev`.
3. `terraform plan` shows 1 EC2 instance to create. `terraform apply -auto-approve` creates it (about 26 seconds), type `t2.micro`.
4. `terraform workspace select prod`.
5. `terraform plan` shows **again 1 to add**. The prod workspace's state is empty, so Terraform does not know about the instance created in dev.
6. A new directory **`terraform.tfstate.d`** appears, with one sub-folder per workspace:

```text
.
├── workspace.tf
├── terraform.tfstate.d/
│   ├── dev/
│   │   └── terraform.tfstate     # contains the EC2 instance created in dev
│   └── prod/                     # empty until something is applied in prod
└── (terraform.tfstate)           # the "default" workspace state lives in the working dir
```

(The slide names the states `dev.tfstate` and `prod.tfstate` conceptually. On disk with the local backend they are `terraform.tfstate.d/dev/terraform.tfstate` and so on.)

### Same code, different values per workspace

Organisations often want identical code but one argument different. For example `t2.micro` (1 GB RAM) is fine for dev, while production needs something bigger (for example `m5.large`, 8 GB). Workspaces let the value depend on the active workspace: dev -> `t2.micro`, prod -> `m5.large`.

### Workspace commands (lecture 130)

Base code (`workspace.tf`). The AMI is for N. Virginia; change it for another region:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = "t2.micro"
}
```

Running just `terraform workspace` lists the available subcommands.

```bash
terraform workspace              # list subcommands
terraform workspace show         # show current workspace (default at the start)
terraform workspace new dev      # create "dev" AND switch to it
terraform workspace show         # -> dev
terraform workspace new prod     # create "prod" AND switch to it
terraform workspace list         # default / dev / * prod  (star = current)
terraform workspace select dev   # switch to dev
```

```text
$ terraform workspace list
  default
  dev
* prod
```

| Subcommand | Purpose |
|---|---|
| `terraform workspace show` | Print the current workspace name. |
| `terraform workspace new <name>` | Create a new workspace **and switch to it**. |
| `terraform workspace list` | List workspaces; `*` marks the current one. |
| `terraform workspace select <name>` | Switch to an existing workspace. |
| `terraform workspace delete <name>` | Delete a workspace (extra context). You cannot delete the workspace you are in, nor `default`. A workspace that still holds resources needs `-force`, which leaves those resources orphaned. |

### The problem with the base code

Plans in both `dev` and `prod` show `instance_type = "t2.micro"`. We want different types per workspace.

### Solution: a map in `locals` plus `terraform.workspace`

You need one value per workspace (`default`, `dev`, `prod`), so use a **map** where the key is the workspace name.

```hcl
locals {
  instance_type = {
    default = "t2.nano"
    dev     = "t2.micro"
    prod    = "m5.large"
  }
}

resource "aws_instance" "myec2" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = local.instance_type[terraform.workspace]
}
```

- `locals { instance_type = { ... } }` is a local value holding a map: key = workspace name, value = instance type (see [chapter 06](06-variables-outputs-locals.md)).
- `terraform.workspace` is a built-in expression returning the **name of the current workspace** (`default`, `dev` or `prod`).
- `local.instance_type[terraform.workspace]` looks up the map entry whose key equals the workspace name.

Demo:

1. In `prod`: `terraform plan` shows `instance_type = "m5.large"`.
2. `terraform workspace list` confirms `* prod`.
3. `terraform workspace select dev`, then `terraform plan` shows `instance_type = "t2.micro"`.
4. In the `default` workspace the plan would give `t2.nano`.

### On-disk layout (local backend)

Using workspaces creates the folder `terraform.tfstate.d/` with a sub-folder per non-default workspace (`dev/`, `prod/`). **There is no sub-folder for `default`**: its `terraform.tfstate` stays in the working directory as usual.

> **Up to date (TF 1.12) — workspaces on remote backends** (extra context): with the S3 backend each non-default workspace is stored under a prefix, by default `env:/<workspace>/<key>`. For example, workspace `dev` with `key = "production.tfstate"` is stored as `env:/dev/production.tfstate` in the same bucket. The default workspace uses the plain `key`.

⚠️ **Gotchas:**

- `terraform workspace new` also **switches** you. Check `terraform workspace show` before `apply` to avoid deploying to the wrong environment. The `*` in `list` shows the current one.
- If you create a workspace whose name has no key in the `locals` map (for example `staging`), `local.instance_type[terraform.workspace]` fails with an error. Add the key, or use `lookup(local.instance_type, terraform.workspace, "t2.micro")` with a default (see [chapter 07](07-types-loops-functions.md)).
- Workspaces share the **same backend and the same configuration**; they isolate **state only**. For strict separation (different accounts, access control) many teams prefer separate directories, repos or backends per environment.
- **CLI workspaces are different from HCP Terraform workspaces.** HCP/Terraform Cloud "workspaces" are full objects with their own variables, runs and permissions ([chapter 12](12-hcp-terraform.md)).

🎯 **Exam focus:**

- A workspace is a separate **state** for the same configuration. Resources applied in one workspace are invisible to another.
- The `default` workspace always exists and is named `default`.
- `terraform workspace new` creates **and** switches; `select` only switches; `list` shows `*`; `show` prints the current name.
- `terraform.workspace` gives the current workspace name; combine it with a map to vary values.
- Default workspace state: `terraform.tfstate` in the working dir. Others: `terraform.tfstate.d/<name>/terraform.tfstate` (local backend).
- Workspaces avoid repeating code across environments, mostly for smaller setups.

---

## 9. Drift and how to reconcile it

Chapter [04](04-state-basics.md) explained desired state, current state and refresh. Here is the practical side for teams.

**Drift** = the real infrastructure no longer matches what Terraform expects, because someone changed it outside Terraform (for example Bob in the console), or a resource was deleted by hand.

### How Terraform detects it

On every `plan` / `apply`, Terraform **refreshes**: it asks the provider for the real state of every resource in the state file, updates its record, and compares with your configuration (the desired state). Differences become planned actions. You can see only the drift, without proposing changes, with:

```bash
terraform plan -refresh-only
```

- Drift on attributes you **defined**: detected.
- Drift on values you **did not define** (provider defaults): ignored ([chapter 04](04-state-basics.md#more-clarity-provider-defaults-are-not-desired-state-lecture-35)).
- A **brand-new resource** someone created by hand that is not in your state: not detected at all (Terraform only watches what is in its state). Bring it under management with `import` ([chapter 11](11-import-state-cli-logging.md)).

### Options to reconcile

| Goal | What to do | Notes |
|---|---|---|
| **Revert** the manual change (code is right) | `terraform apply` | Terraform prioritises the desired state and puts the real resource back. This is the normal case. |
| **Accept** the manual change (reality is right) | Edit the `.tf` code to match, then `terraform plan` should show "No changes" | Commit the code change to Git so the team sees it. |
| Record the new reality in state only | `terraform apply -refresh-only` (review, then `yes`) | Updates the state file without touching infrastructure. If your code still says something different, the **next plan will propose to revert it again**. Mainly for values you don't control, such as computed attributes. |
| **Ignore** a particular attribute permanently | `lifecycle { ignore_changes = [...] }` | See [chapter 08](08-lifecycle-conditions-sensitive.md). Use for fields changed legitimately by other systems (for example autoscaling counts, tags added by a tool). |
| **Stop managing** the resource | `terraform state rm ADDRESS` or a `removed` block with `destroy = false`, then delete the config | See [chapter 11](11-import-state-cli-logging.md). Real resource keeps running. |
| Resource **deleted by hand** | `terraform apply` to re-create it, or remove it from the code to accept the deletion | `plan` shows "has been deleted" under outside changes. |
| Resource **created by hand** | `terraform import` / `import` block | [chapter 11](11-import-state-cli-logging.md). |

Do **not** edit the state file by hand to "fix" drift ([chapter 04](04-state-basics.md)).

### Prevent and monitor drift

- Make Terraform (through CI/CD) the only way to change infrastructure; restrict console write access with IAM.
- **Define all attributes you care about** in code, so manual changes to them can be detected.
- Run `terraform plan` on a schedule in CI. With `-detailed-exitcode`, the exit code is `0` (no changes), `1` (error) or `2` (changes pending), which makes drift easy to alert on (extra context).
- HCP Terraform offers **health assessments** that run drift detection automatically ([chapter 12](12-hcp-terraform.md)).
- Keep **state backups** (S3 versioning). If a bad refresh or edit empties the state, you can restore the previous version, just as the `terraform.tfstate.backup` demo did in [chapter 04](04-state-basics.md).

🎯 **Exam focus:** Terraform always reconciles toward the **desired state** in code. To accept a manual change you must change the code. `-refresh-only` updates the state, not the infrastructure. Drift on defaults you never set is not reverted.

---

## 🧪 Lab 1 — `.gitignore` and the local backend (free)

```bash
mkdir -p ~/tf-labs/backend-local && cd ~/tf-labs/backend-local
git init
```

`main.tf`:

```hcl
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
  }
}

resource "local_file" "note" {
  filename = "${path.module}/note.txt"
  content  = "state lab"
}
```

1. `terraform init && terraform apply -auto-approve`. Run `ls -a` and `git status`. You will see `.terraform/`, `.terraform.lock.hcl`, `terraform.tfstate` all untracked.
2. Create `.gitignore` with the Terraform template from section 3 (at least `**/.terraform/*`, `*.tfstate`, `*.tfstate.*`, `crash.log`, `*.tfvars`).
3. `git status` again. Only `main.tf`, `.terraform.lock.hcl` and `.gitignore` are offered. That is the correct set.
4. **Explicit local backend.** Add `backend.tf`:

   ```hcl
   terraform {
     backend "local" {
       path = "prod.tfstate"
     }
   }
   ```

5. Run `terraform init`. Terraform detects the backend change and asks whether to copy the existing state. Answer `yes` (this is the interactive version of `-migrate-state`).
6. `ls`. You should see `prod.tfstate` (and the old `terraform.tfstate` left behind but unused). Run `terraform plan` -> "No changes", proving the state moved with you.
7. **Clean up:** `terraform destroy -auto-approve`, then remove the folder.

---

## 🧪 Lab 2 — S3 backend and state locking (cents of cost)

You need an AWS account with credentials already configured ([chapter 02](02-providers.md)). S3 storage for a few KB costs essentially nothing; destroy resources and delete the bucket afterwards.

1. **Create a bucket** (name must be globally unique; replace `<your-bucket>`):

   ```bash
   aws s3 mb s3://<your-bucket> --region us-east-1
   aws s3api put-bucket-versioning --bucket <your-bucket> \
     --versioning-configuration Status=Enabled
   ```

   (Or use the console: S3 -> Create bucket, then Properties -> Bucket Versioning -> Enable.)
2. In a new folder, `sg.tf`:

   ```hcl
   provider "aws" {
     region = "us-east-1"
   }

   resource "aws_security_group" "prod" {
     name = "production-sg"
   }
   ```

3. `backend.tf`:

   ```hcl
   terraform {
     backend "s3" {
       bucket       = "<your-bucket>"
       key          = "production.tfstate"
       region       = "us-east-1"
       use_lockfile = true
     }
   }
   ```

4. `terraform init` (expect "Successfully configured the backend "s3"") then `terraform apply -auto-approve`.
5. `ls`: there is **no** `terraform.tfstate` locally. In the S3 console (or `aws s3 ls s3://<your-bucket>/`) you see `production.tfstate`.
6. `terraform state list` prints `aws_security_group.prod`, read from the bucket.
7. **Observe locking.** Add a `time_sleep` resource, run `terraform init` again to download the `time` provider, and start `terraform apply -auto-approve` in one terminal:

   ```hcl
   resource "time_sleep" "wait" {
     create_duration = "100s"
   }
   ```

   While it runs, open a second terminal in the same folder and run `terraform plan`. You get `Error acquiring the state lock` with lock info (who, when). During the apply, look in the bucket: a `production.tfstate.tflock` object exists, and it is gone when the apply ends.
8. **Optional rollback practice:** in the S3 console, enable "Show versions" on `production.tfstate` and see the history of state versions.
9. **Clean up:**

   ```bash
   terraform destroy -auto-approve
   aws s3 rm s3://<your-bucket> --recursive      # also delete old versions if versioning is on
   aws s3 rb s3://<your-bucket> --force
   ```

   (A versioned bucket needs all versions removed before deletion; the console's "Empty bucket" handles that.)

---

## 🧪 Lab 3 — Remote state data source (small cost: one EIP)

Use the bucket from Lab 2 (or create a new one). Create `networking-team/` and `security-team/` folders.

1. In `networking-team/` create `eip.tf` and `backend.tf` exactly as in section 7, steps A. Put your bucket in `backend.tf`, with `key = "eip.tfstate"`.
2. `terraform init && terraform apply -auto-approve`. Note the printed `eip_addr`. Check the bucket for `eip.tfstate` and confirm `outputs.eip_addr` inside it (`aws s3 cp s3://<your-bucket>/eip.tfstate - | grep -A3 eip_addr`).
3. In `security-team/` create `sg.tf` (final version) and `data.tf` (section 7, steps B–D). Add a `provider "aws" { region = "us-east-1" }` file.
4. `terraform init && terraform validate && terraform plan`. The planned `cidr_ipv4` equals `<eip_addr>/32`.
5. **Prove it is dynamic.** In `networking-team/`, run `terraform destroy -auto-approve` then `terraform apply -auto-approve`. Back in `security-team/`, run `terraform plan`: the CIDR now shows the new IP.
6. **Break it deliberately.** Rename the output in `networking-team` to `eip_address`, re-apply, then run `plan` in `security-team`. You get an error that the attribute `eip_addr` is not found. This shows the contract between teams is the **output name**.
7. **Clean up:** `terraform destroy` in `networking-team/` (and `security-team/` if you applied), delete the bucket.

---

## 🧪 Lab 4 — Workspaces (free)

Free version using `local_file` instead of EC2.

```bash
mkdir -p ~/tf-labs/workspaces && cd ~/tf-labs/workspaces
```

`main.tf`:

```hcl
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
  }
}

locals {
  message = {
    default = "I am the default environment"
    dev     = "I am DEV"
    prod    = "I am PROD"
  }
}

resource "local_file" "env" {
  filename = "${path.module}/env-${terraform.workspace}.txt"
  content  = local.message[terraform.workspace]
}
```

1. `terraform init`, `terraform workspace show` -> `default`.
2. `terraform apply -auto-approve`. File `env-default.txt` is created and `terraform.tfstate` appears.
3. `terraform workspace new dev` (creates **and** switches). `terraform plan` shows **1 to add**: the dev state is empty. `terraform apply -auto-approve` creates `env-dev.txt`.
4. `terraform workspace new prod`, `terraform apply -auto-approve`. `terraform workspace list` shows `default`, `dev` and `* prod`.
5. `ls` and `find terraform.tfstate.d`. You see `terraform.tfstate.d/dev/terraform.tfstate` and `terraform.tfstate.d/prod/terraform.tfstate`, and **no** `default` sub-folder.
6. `terraform workspace select dev`, then `terraform state list`. Only `local_file.env` for dev; `terraform show` shows the dev message.
7. **Error case.** `terraform workspace new staging` then `terraform plan`. You get an error because `local.message["staging"]` does not exist. Fix it by using `lookup(local.message, terraform.workspace, "unknown environment")`, run plan again.
8. **Clean up each workspace** (destroy only affects the current workspace):

   ```bash
   for w in default dev prod staging; do
     terraform workspace select $w && terraform destroy -auto-approve
   done
   terraform workspace select default
   terraform workspace delete dev
   terraform workspace delete prod
   terraform workspace delete staging
   ```

---

## 🎯 Exam focus (summary)

- Code in Git, **state in a remote backend**. Never commit state, `.terraform/`, `crash.log`, saved plans or sensitive `*.tfvars`. Do commit `*.tf` and `.terraform.lock.hcl`.
- State may hold plain-text secrets regardless of how you supplied them. `sensitive` only masks CLI output.
- Backend = where state is stored. Default = **local** (`terraform.tfstate` in the working dir). `backend "<type>" { ... }` goes in a `terraform` block, cannot use variables, and needs `terraform init` after any change.
- S3 backend: `bucket`, `key`, `region` (+ `use_lockfile`, `encrypt`). Bucket must exist first and its name is globally unique.
- State locking prevents concurrent writes. Automatic acquire and release. Not all backends support it. `.terraform.lock.hcl` is **not** a state lock. `force-unlock` releases a stale lock.
- `terraform_remote_state`: `backend` + `config`; read with `.outputs.<name>`; only outputs are readable.
- Workspaces: multiple states for one configuration. `default` always exists. `new` creates + switches. `terraform.workspace` returns the name. Local state at `terraform.tfstate.d/<name>/`. Not the same as HCP Terraform workspaces.
- Drift: Terraform reverts to the code (desired state). To accept the change, edit the code. `-refresh-only` updates only state.

## Key takeaways

1. Keep Terraform **code in Git** and **state in a remote backend**, never in Git.
2. State can hold secrets in plaintext (even when read from `file()` or marked `sensitive`).
3. `.gitignore` (GitHub's Terraform template) stops accidents. Commit `.terraform.lock.hcl`; do not commit `.terraform/`.
4. A backend decides where state is stored and whether it supports locking; the default is local.
5. Run `terraform init` after adding or changing any backend.
6. State locking gives one writer at a time. Do not confuse `.terraform.lock.hcl` with the state lock.
7. S3 locking: modern `use_lockfile = true`; legacy `dynamodb_table`.
8. `terraform_remote_state` lets one project consume another's outputs.
9. Workspaces share one configuration but have separate state; combine with `terraform.workspace` and a map.
10. Reconcile drift by applying (revert), editing code (accept), `ignore_changes`, `state rm`/`removed`, or `import`.

## Quick commands / syntax cheat-sheet

```hcl
# Explicit local backend
terraform {
  backend "local" {
    path = "prod.tfstate"
  }
}

# S3 backend with native locking
terraform {
  backend "s3" {
    bucket       = "<unique-bucket-name>"
    key          = "path/to/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

# Remote state data source
data "terraform_remote_state" "vpc" {
  backend = "s3"
  config = {
    bucket = "<bucket>"
    key    = "eip.tfstate"
    region = "us-east-1"
  }
}
# usage:
#   cidr_ipv4 = "${data.terraform_remote_state.vpc.outputs.eip_addr}/32"

# Workspace-specific value
locals {
  instance_type = { default = "t2.nano", dev = "t2.micro", prod = "m5.large" }
}
# instance_type = local.instance_type[terraform.workspace]
```

```bash
terraform init                      # required after adding/changing a backend
terraform init -migrate-state       # move existing state to the new backend
terraform init -reconfigure         # re-init, ignore previous backend config
terraform init -backend-config=backend.hcl
terraform force-unlock <LOCK_ID>    # release a stale lock
terraform plan -lock-timeout=30s    # wait for the lock
terraform plan -refresh-only        # see drift only

terraform workspace show            # current workspace
terraform workspace new dev         # create + switch
terraform workspace list            # * marks current
terraform workspace select dev      # switch
terraform workspace delete dev      # delete (not current, not default)
```

| Locking item | Notes |
|---|---|
| Local backend lock file | `terraform.tfstate.lock.info` (actual: `.terraform.tfstate.lock.info`), auto-deleted |
| S3 | `use_lockfile = true` (older: `dynamodb_table`) |
| Error text | `Error acquiring the state lock` |
| Not the same | `.terraform.lock.hcl` = provider dependency lock |

---

## ❓ Quiz

1. Name three drawbacks of keeping Terraform files only on one laptop.
2. A teammate says "I load the DB password with `file("pass.txt")`, so it is not in state." Is that right?
3. Which of these should be committed: `main.tf`, `.terraform/`, `terraform.tfstate`, `.terraform.lock.hcl`, `crash.log`, `.gitignore`?
4. What does the local backend do by default, and what does `backend "local" { path = "prod.tfstate" }` change?
5. You add an S3 `backend` block to an existing project. What must you run next, and why?
6. What are the three basic arguments of the S3 backend, and what does `key` mean?
7. What happens when Alice runs `terraform apply` and Bob runs `terraform plan` at the same moment on the same locked state?
8. Is `.terraform.lock.hcl` the file that implements state locking?
9. Which S3 backend argument turns on native locking, from which Terraform version, and what was used before?
10. A security team needs the IP created by the networking team's project. Which data source do they use, and which two things must the networking project provide?
11. Given `data "terraform_remote_state" "vpc" {...}` and an output `eip_addr`, write the reference expression.
12. You run `terraform workspace new prod`. In which workspace are you afterwards, and does the `prod` state contain resources from `dev`?
13. Where does Terraform store the state of the `dev` workspace with the local backend? And `default`?
14. How do you give `dev` a `t2.micro` and `prod` an `m5.large` from one resource block?
15. Bob changes an instance type by hand in the console. Your code says `t2.micro`. Name two different ways to resolve the drift, and say what each does.

### Answers

1. Losing both code and state if the disk fails; teammates cannot access or update the files; no version history to roll back changes. (Also: no review workflow or CI/CD.)
2. No. Terraform writes the **resolved** value to state in plain text. `(sensitive value)` in plan output only hides it on screen.
3. Commit `main.tf`, `.terraform.lock.hcl` and `.gitignore`. Do not commit `.terraform/`, `terraform.tfstate` or `crash.log`.
4. By default it writes `terraform.tfstate` in the working directory. The explicit block writes the state to `prod.tfstate` instead (or any path you give).
5. `terraform init`, to initialise the new backend (and optionally migrate existing state). Terraform will not use the backend until `init` has run.
6. `bucket`, `key`, `region`. `key` is the path/name of the state object inside the bucket (for example `network/terraform.tfstate`).
7. Bob's `plan` fails immediately with "Error acquiring the state lock" while Alice's apply holds the lock. After her apply finishes and the lock is released, his plan works.
8. No. It records provider versions and checksums (dependency lock file) and should be committed. State locking uses a temporary lock (`.terraform.tfstate.lock.info` locally, or an S3 lock object, or DynamoDB).
9. `use_lockfile = true`, from Terraform 1.10. Before that, a DynamoDB table via `dynamodb_table` (now deprecated).
10. `terraform_remote_state`. The networking project must store its state in a remote backend the security team can read, and must define an `output` for the IP.
11. `data.terraform_remote_state.vpc.outputs.eip_addr`
12. You are in `prod` (new creates and switches). No: the `prod` state is separate and empty at first; resources from `dev` are not visible.
13. `dev`: `terraform.tfstate.d/dev/terraform.tfstate`. `default`: `terraform.tfstate` in the working directory.
14. A map in `locals` keyed by workspace name, for example `{ default = "t2.nano", dev = "t2.micro", prod = "m5.large" }`, and `instance_type = local.instance_type[terraform.workspace]`.
15. (a) Run `terraform apply`: Terraform reverts the instance to `t2.micro` (desired state wins). (b) Change the code to `t2.small` and run `plan`/`apply` to accept the change: no infrastructure change, code and reality agree. (Also valid: `lifecycle { ignore_changes = [instance_type] }` to ignore it, or `apply -refresh-only` to record it in state only, though a code mismatch will show again at the next plan.)

## Glossary

| Term | Meaning |
|---|---|
| Backend | Setting that decides where Terraform stores state and whether locking is available. |
| Local backend | Default; `terraform.tfstate` in the working directory (path configurable). |
| Remote backend | Any backend that stores state off your disk (S3, azurerm, GCS, Consul, ...). |
| `backend.tf` | Conventional file name for the `terraform { backend ... }` block. |
| State locking | Only one write operation on the state at a time. |
| Lock info file | `.terraform.tfstate.lock.info`, temporary local-backend lock file with lock ID and user. |
| Dependency lock file | `.terraform.lock.hcl`; pins provider versions; commit it. |
| `.gitignore` | Git file listing paths Git should not track. |
| `use_lockfile` | S3 backend option for native locking (Terraform 1.10+). |
| `dynamodb_table` | Legacy S3 locking option; deprecated. |
| `key` (S3) | Path of the state object in the bucket. |
| `terraform_remote_state` | Data source that reads root-module outputs from another state. |
| Workspace (CLI) | A named state instance for one configuration (`default`, `dev`, `prod`). |
| `terraform.workspace` | Expression returning the current workspace name. |
| `terraform.tfstate.d` | Directory holding state for non-default workspaces (local backend). |
| Drift | Real infrastructure differs from what Terraform expects/recorded. |
| `-refresh-only` | Plan/apply mode that only reconciles state with reality. |
| `force-unlock` | Command that releases a stale state lock. |
