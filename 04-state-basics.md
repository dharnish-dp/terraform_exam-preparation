# Lesson 04 — State Basics

**Exam domains 2 and 6** · **Time:** 2 hours

## 🧠 Pre-concept: why does Terraform need a memory?

You write `resource "aws_instance" "web" {}`. Terraform creates a server with ID `i-0abc123`.

Next week you run `terraform apply` again. How does Terraform know:

- that `aws_instance.web` already exists (so it shouldn't create a second)?
- which real server `i-0abc123` corresponds to that block?

It can't guess from the cloud (there might be 500 servers). So Terraform keeps a **mapping** from your code to real objects. That mapping is the **state**.

## What is state?

- A file named **`terraform.tfstate`** (JSON) in your working directory by default
- Maps each **resource address** (`aws_instance.web`) to a **real object ID** plus all its attributes
- Records dependencies and metadata (Terraform version, serial number, lineage)

### What state is used for

1. **Mapping** config ↔ real resources
2. **Tracking metadata** such as dependencies, so it destroys in the right order
3. **Performance**: caches attribute values so it doesn't have to query everything every time
4. **Detecting changes**: compare config vs state vs reality
5. **Collaboration** (when stored remotely, Lesson 10)

## Anatomy of a state file (simplified)

```json
{
  "version": 4,
  "terraform_version": "1.12.0",
  "serial": 3,
  "lineage": "7c0e...",
  "outputs": {},
  "resources": [
    {
      "mode": "managed",
      "type": "local_file",
      "name": "greeting",
      "provider": "provider[\"registry.terraform.io/hashicorp/local\"]",
      "instances": [
        { "attributes": { "filename": "./hello.txt", "content": "Hello" } }
      ]
    }
  ]
}
```

- `serial` increases on every change
- `lineage` is a unique ID for this state's history

## ⚠️ State can contain secrets

Terraform stores **all attributes** of resources, including passwords for databases, generated keys, etc., **in plain text**. Even if you mark a variable `sensitive`, the value is still in state.

Therefore:

- **Never commit state to Git** (`.gitignore` it)
- Store it in a **remote backend** with encryption and access control
- Restrict who can read it

🎯 Exam: "Which is true about sensitive values and state?" → they're **still stored in state in plain text**; `sensitive` only hides them from CLI output.

## Don't edit state by hand

Hand-editing JSON can corrupt it. If you must change state, use `terraform state` subcommands (Lesson 11) or `import`. Don't delete the state file unless you intend Terraform to "forget" everything (it would then try to create duplicates).

## State files you will see

| File | Meaning |
|---|---|
| `terraform.tfstate` | Current state |
| `terraform.tfstate.backup` | Previous version, made before the latest change |
| `.terraform/` | Downloaded plugins/modules + backend config (not state) |
| `.terraform.lock.hcl` | Provider lock file (commit it) |
| `*.tfplan` / `tfplan` | Saved plan files |

## How plan uses state

1. Reads **config** (desired)
2. Reads **state** (last known)
3. **Refreshes** against real infrastructure (queries APIs for current values)
4. Computes the diff and shows the plan

Cases:

- Resource in config, **not** in state → **create**
- Resource in state, **not** in config → **destroy**
- In both, differences → **update** or **replace**
- In both, identical → no-op

## Drift (preview)

**Drift** = real infrastructure was changed outside Terraform (someone edited it in the console), so it no longer matches state/config. `terraform plan` detects it during refresh and proposes to fix it. Covered fully in Lesson 10.

## Local vs remote state (preview)

- **Local** (default): `terraform.tfstate` file on your machine. Fine for learning, risky for teams (loss, conflicts, secrets on a laptop).
- **Remote**: S3, Azure Blob, HCP Terraform, etc. Shared, can be encrypted, supports **locking**.

## Resource addresses

How Terraform names things in state/CLI:

- `aws_instance.web`: a single resource
- `aws_instance.web[0]` or `aws_instance.web["a"]`: instance from `count` / `for_each`
- `module.network.aws_vpc.main`: resource inside a module
- `data.aws_ami.ubuntu`: a data source

You'll use these in `terraform state`, `-target`, `-replace`, `import`.

## Handy commands (intro)

```bash
terraform show                     # human-readable state
terraform state list               # list addresses
terraform state show local_file.greeting
```

## 🧪 Lab 4

Reuse the Lab 1 or Lab 2 idea in a new folder.

```hcl
terraform {
  required_providers {
    random = { source = "hashicorp/random" }
    local  = { source = "hashicorp/local" }
  }
}

resource "random_password" "db" {
  length  = 16
  special = false
}

resource "local_file" "note" {
  filename = "${path.module}/note.txt"
  content  = "hello"
}
```

1. `terraform init`, then `terraform apply -auto-approve`
2. `cat terraform.tfstate` → **find the random password in plain text.** This is why state must be protected.
3. `terraform state list`, then `terraform state show random_password.db`
4. Edit `note.txt` manually (change its text). Run `terraform plan`. See **drift** detected and Terraform wanting to restore it.
5. Rename the resource `local_file.note` to `local_file.note2` in code, then `plan`. It wants to destroy `note` and create `note2` because state knows the old name. (Lesson 11 shows how to rename safely using `moved` blocks.)
6. `terraform destroy -auto-approve`
7. `cat terraform.tfstate` after destroy → resources list is empty.

## 🎯 Exam focus

- Purpose of state (mapping, metadata, performance, collaboration).
- Default state location and name: local `terraform.tfstate`.
- State contains **sensitive data in plain text**.
- Don't edit state by hand; protect it.
- Plan = config vs state vs real infra (refresh).
- Drift concept.

## ❓ Quiz

1. Why can't Terraform work without state?
2. Where is state stored by default?
3. Is a `sensitive = true` variable encrypted in state?
4. A resource exists in state but was removed from your code. What will `plan` show?
5. What is the `.backup` file?
6. What does the address `module.vpc.aws_subnet.a[1]` refer to?

<details><summary>Answers</summary>

1. It needs a mapping from config blocks to real resource IDs, plus metadata.
2. `terraform.tfstate` in the working directory (local backend).
3. No. It's plain text in state. `sensitive` only hides it in CLI output.
4. A destroy of that resource.
5. A copy of the previous state, made before the last change.
6. The second instance (index 1) of `aws_subnet.a` inside module `vpc`.
</details>
