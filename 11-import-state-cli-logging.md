# 11 — Import, State Commands, Moved/Removed Blocks, Replace and Debugging

> **Exam domain(s):** Implement and maintain state (import, `terraform state`, refactoring), Maintain infrastructure (`-replace`, refresh), Troubleshoot / debug (`TF_LOG`)   **Source:** lesson 7 lectures 137, 140–142 (+ extra repo material); lesson 4 lectures 71–74 and 79 (Part 4) and lecture 104 (Part 6); lesson 3 lecture 36   **Time:** ~3 h

## What you will learn

- Why you must never hand-edit the state file, and which `terraform state` sub-commands you use instead (`list`, `show`, `pull`, `push`, `rm`, `mv`, `replace-provider`).
- How to bring **existing** (manually created) infrastructure under Terraform with an `import` block and `terraform plan -generate-config-out`, and how this differs from the legacy `terraform import` command.
- How to make Terraform **forget** a resource without destroying it, using `terraform state rm` and the modern declarative `removed` block.
- How to **rename or move** a resource in code without destroying it, using a `moved` block or `terraform state mv`.
- How to force a resource to be rebuilt with `terraform apply -replace=ADDRESS`, and why `terraform taint` is deprecated.
- Why the standalone `terraform refresh` command is deprecated and what to use instead (`-refresh-only`).
- How to debug Terraform with `TF_LOG`, `TF_LOG_PATH`, and `crash.log`, and the four-category troubleshooting model (language, state, core, provider).
- How to write a good bug report.

---

## 🧠 Pre-concept: state surgery and "lifecycle of an address"

Recall from [Chapter 04](04-state-basics.md) that Terraform keeps a **state file**: a JSON mapping between the **resource addresses** in your code (for example `aws_security_group.prod`) and the **real objects** in the cloud (for example `sg-0a1b2c3d`).

Everything in this chapter is about the three places that mapping can go wrong, plus a few tools for finding out why.

```text
        YOUR CODE (.tf)                STATE FILE                    REAL WORLD (AWS)
   aws_security_group.prod  <----->  aws_security_group.prod  <----->  sg-0a1b2c3d
        (address)                      (address + id + attrs)            (real object)
```

Imagine a library catalogue:

- The **real world** is the shelf with the books.
- The **state** is the catalogue card that says "book X is on shelf 7".
- Your **code** is the wish list of what the library should have.

Terraform only compares your wish list with the catalogue cards. So all of these situations are possible, and each one has its own tool:

| Situation | What Terraform thinks | Tool in this chapter |
|---|---|---|
| A book exists on the shelf, but there is no catalogue card | "Not mine, I will not touch it" (or, if your code lists it, "I must create it") | **import** |
| A card exists but you do not want the library to manage that book any more | "Must destroy it, it is not in the wish list" | **`state rm`** / **`removed` block** |
| You renamed the book in the wish list (same book, new title) | "Old title gone, new title missing: destroy old, create new" | **`moved` block** / **`state mv`** |
| The book is damaged but the card says it is fine | "No changes needed" | **`-replace`** |
| The card is out of date compared with the shelf | "Needs a refresh" | **refresh** (`-refresh-only`) |
| Something is weird and you do not know why | ??? | **debug logs** (`TF_LOG`) |

The golden rule of this chapter, repeated by the instructor throughout:

> **Never open the state file in an editor and change it.** A single wrong character can corrupt it. HashiCorp gives you commands that edit state safely.

---

## 1. Managing state with `terraform state` commands (lecture 137)

### 1.1 Why you need them

As projects grow you will occasionally need to modify state:

- remove a resource from management,
- rename or move an address,
- change which provider a resource belongs to,
- inspect values or download the state.

People open `terraform.tfstate` "just to look" and modify it by accident. The `terraform state` command group exists so that you **never open the file**.

Two questions the lecture answers:

1. *What is the alternative to hand-editing?* The `terraform state ...` sub-commands.
2. *When would you modify state?* Removing resources from management, renaming/moving addresses, switching providers, inspecting values.

> The lecture transcript was auto-captioned and garbled some names: "state pool" means `pull`, "state env"/"MM" means `mv`, "RM" is `rm`. The real commands are spelled as in the table below.

### 1.2 Overview of all sub-commands

| Command | Purpose | Changes state? | Touches real infra? |
|---|---|---|---|
| `terraform state list` | List resource addresses in state | No | No |
| `terraform state show ADDR` | Show every recorded attribute of **one** resource | No | No |
| `terraform state pull` | Print the current state (from the backend) to stdout | No | No |
| `terraform state push FILE` | Upload a local state file to the backend (dangerous) | **Yes** | No |
| `terraform state rm ADDR` | Stop managing a resource ("forget") | **Yes** (entry removed) | **No** (not destroyed) |
| `terraform state mv SRC DST` | Rename/move an address in state | **Yes** | No |
| `terraform state replace-provider FROM TO` | Change the provider recorded in state | **Yes** (asks for confirmation) | No |

🎯 **Exam focus:** know every sub-command name and its one-line purpose. `list` takes no address; `show` takes an address. `rm` = forget, `mv` = rename, `pull` = download/print.

`list` and `show` were introduced in [Chapter 04](04-state-basics.md); they are repeated here only so the demo makes sense.

### 1.3 Demo setup

The instructor uses an S3 backend (see [Chapter 10](10-backends-locking-drift.md)) and two resources. Your bucket name must be globally unique, so replace the one below with your own. If you want to practise without AWS, the labs at the end of this chapter use the free `local_file` resource instead.

```hcl
terraform {
  backend "s3" {
    bucket = "kplabs-terraform-backends"   # use your own unique bucket
    key    = "demo.tfstate"
    region = "us-east-1"
  }
}

resource "aws_iam_user" "dev" {
  name = "kplabs-user-01"
}

resource "aws_security_group" "prod" {
  name = "terraform-firewalls"
}
```

Run `terraform init` (if not done), then `terraform apply -auto-approve`. Both resources are created. There is **no local `terraform.tfstate`**; the S3 bucket now holds `demo.tfstate`.

### 1.4 `terraform state list`

Prints every resource address that exists in state. Very handy on projects with hundreds of resources, instead of reading config files.

```bash
terraform state list
```

```text
aws_iam_user.dev
aws_security_group.prod
```

### 1.5 `terraform state show <address>`

Shows all recorded attributes of **one** resource: ARN, description, ID, owner ID, VPC ID and so on. It is faster and safer than opening the state file, or clicking through the EC2 console to find a security group ID.

```bash
terraform state show aws_security_group.prod
```

```text
# aws_security_group.prod:
resource "aws_security_group" "prod" {
    arn         = "arn:aws:ec2:us-east-1:111122223333:security-group/sg-0abc1234def567890"
    description = "Managed by Terraform"
    id          = "sg-0abc1234def567890"
    name        = "terraform-firewalls"
    owner_id    = "111122223333"
    vpc_id      = "vpc-0123456789abcdef0"
    ...
}
```

### 1.6 `terraform state pull`

Downloads the current state from the remote backend and prints it to **stdout**. It is an alternative to logging in to S3 and downloading the file by hand each time someone else modifies it.

```bash
terraform state pull
```

The output is the whole state JSON. A common habit is to redirect it into a file as a **backup** before doing any risky surgery:

```bash
terraform state pull > backup-before-surgery.tfstate
```

The counterpart is `terraform state push FILE`, which **uploads** a state file to the backend. It was not demonstrated in the lecture (extra context), but it is on the exam syllabus list of sub-commands.

> ⚠️ **Gotcha (extra context):** `state push` is dangerous. Terraform refuses to push a state whose **lineage** (unique ID of the state's history) differs from the remote one, or whose **serial** (version counter) is older than the remote one, unless you add `-force`. Only use `push` to restore a known-good backup.

### 1.7 `terraform state rm <address>`

**Removes an item from the state.** Terraform then no longer manages it. The real infrastructure is **not destroyed**.

Use case from the lecture: a resource has been edited manually so many times that reconciling config and reality is impractical. You decide you no longer want Terraform to manage it, but you also do not want Terraform to destroy it.

Extra code used in the demo: two rules attached to the security group, using the `aws_vpc_security_group_ingress_rule` resource.

```hcl
resource "aws_vpc_security_group_ingress_rule" "example" {
  security_group_id = aws_security_group.prod.id

  cidr_ipv4   = "10.0.0.0/8"
  from_port   = 80
  ip_protocol = "tcp"
  to_port     = 80
}

resource "aws_vpc_security_group_ingress_rule" "example2" {
  security_group_id = aws_security_group.prod.id

  cidr_ipv4   = "10.0.0.0/8"
  from_port   = 80
  ip_protocol = "tcp"
  to_port     = 80
}
```

In the video the second rule used port 22 (the repo file shows both with port 80). Either way they are **two rule resources with different local names**.

#### Walkthrough

1. `terraform plan` shows two inbound rules to add. `terraform apply -auto-approve` creates them (visible in the EC2 console on the SG `terraform-firewalls`).
2. **Manually edit** a rule in the console (for example open the CIDR to everyone and add a description).
3. `terraform plan` now shows **two changes**: Terraform wants to revert your manual edit. It is small here, but in real life a resource may have been edited 20-30 times.
4. You now have two options: reconcile the config with reality, or stop managing it.
5. **The naive approach fails.** If you simply delete the resource blocks (or the whole SG) from the `.tf` file, `terraform plan` shows it will **destroy** them in AWS. Not what you want.
6. **The correct approach: remove from state first.**
   - Bring the resource blocks back in the file.
   - In another terminal tab run `terraform state pull` to see the current state: it contains the SG and both ingress rules.
   - Run:

```bash
terraform state rm aws_security_group.prod
terraform state rm aws_vpc_security_group_ingress_rule.example
terraform state rm aws_vpc_security_group_ingress_rule.example2
```

   Each prints a "Removed ..." line, then `Successfully removed 1 resource instance(s).`

7. `terraform plan` now shows **3 resources to create**. State no longer knows about them, so the config blocks look like brand-new resources. (If you applied now you would create **duplicates**. Do not.)
8. Now it is safe to **delete those blocks from the `.tf` file**. `terraform plan` says **No changes**.
9. `terraform state pull` shows only the IAM user remaining under `resources`.

```text
 BEFORE state rm              state rm                 AFTER (and config blocks deleted)
 config: SG + 2 rules   ->    state: SG + 2 rules  ->  config: (none)       real AWS: SG + 2 rules still exist
 state : SG + 2 rules         state: (removed)         state : (none)       plan: No changes
```

> ⚠️ **Gotcha:** `state rm` leaves the real resource running. If its config block is still present, the **next plan wants to create it again**. If you instead delete the config but it is still in state, the next plan wants to **destroy** it. The order is: remove from state, **then** remove the config.

#### Extra context: addresses with indexes and modules

Resource addresses with `count`/`for_each` keys contain brackets and quotes, which your shell may eat. Quote the whole address:

```bash
terraform state rm 'aws_instance.web[0]'            # count index
terraform state rm 'aws_instance.web["frontend"]'   # for_each key
terraform state rm module.network                   # a whole module
terraform state rm -dry-run aws_security_group.prod # show what WOULD be removed (extra context)
```

### 1.8 `terraform state mv <source> <destination>`

Moves an item to a **different address** in state: a rename, or a move into/out of a module.

**Problem:** you change `aws_iam_user.dev` to `aws_iam_user.prod` in the config. Terraform sees the address changed and plans to **destroy and recreate** the user (new address = new resource). For something like a server, that loses data.

**Solution:**

```bash
terraform state mv aws_iam_user.dev aws_iam_user.prod
```

```text
Move "aws_iam_user.dev" to "aws_iam_user.prod"
Successfully moved 1 object(s).
```

Then rename the resource block to `prod` in the `.tf` file. `terraform plan` now shows **No changes**.

> **Order matters:** move in state first, then rename in config (or do both before your next plan/apply). If you rename the block and run `plan` before moving state, the plan shows destroy + create. That is only a plan, so nothing is lost until you apply.

`state mv` modifies state **immediately**, on the spot, not on the next apply. For the declarative alternative (the `moved` block) see [section 4](#4-renaming-and-refactoring-moved-blocks-lecture-104).

### 1.9 `terraform state replace-provider <from> <to>`

Replaces the **provider** recorded for resources in state. In the state file each resource has a `provider` entry such as `provider["registry.terraform.io/hashicorp/aws"]`. Use this when an organisation publishes its own (custom or forked) provider and wants existing resources re-attributed to it.

```bash
terraform state replace-provider hashicorp/aws kplabs.in/internal/aws
```

- First argument: the **current** provider address (`hashicorp/aws`).
- Second argument: the **new** provider address (`kplabs.in/internal/aws`, a fictional example).

The flow in the demo:

1. Terraform shows the current provider, the new provider address and the affected resources, then **asks for confirmation**. Type `yes`.
2. It prints `Successfully replaced provider for 1 resource(s).`
3. `terraform state pull` now shows the new provider string.
4. Because that provider does not really exist, `terraform plan` now fails with **"Failed to load plugin schemas"**.
5. **Revert for safety:** `terraform state replace-provider kplabs.in/internal/aws hashicorp/aws`, type `yes`, and `terraform plan` works again.
6. The instructor took a `terraform state pull` backup beforehand: "if you mess this up your project might not work."

### 1.10 Safety habits for state surgery

- Never hand-edit the state.
- Take a `terraform state pull > backup.tfstate` **before** any `rm`, `mv`, `replace-provider` or `push`.
- With a remote backend, turn on **bucket versioning** so you can roll back a damaged state (see [Chapter 10](10-backends-locking-drift.md)).
- Local state commands also write a `terraform.tfstate.backup` file next to the state. (extra context: `-backup=PATH` lets you choose the backup location; `-backup=-` disables it.)
- Run `terraform plan` after every state operation to confirm you get exactly the result you expected, usually "No changes".

### 1.11 Exam focus for `terraform state`

- `terraform state rm` = "forget" a resource **without destroying** it.
- `terraform state mv` = rename without destroy/recreate.
- `terraform state show` takes a resource address (for example `aws_security_group.prod`); `list` takes none.
- `terraform state pull` works with remote backends and prints to stdout.
- Hand-editing state is never the right answer on the exam.

---

## 2. Importing existing infrastructure (lectures 140-141)

### 2.1 The business problem

Many organisations have **thousands of resources created manually over years**. They adopt IaC and want those existing resources brought under Terraform so that **future changes are made through Terraform only**. This is what **import** is for.

> **Import does not create anything.** It *adopts* an existing real object by attaching it to an address in your state.

### 2.2 Old way versus new way

| | Old import (older Terraform) | New import (Terraform 1.5+) |
|---|---|---|
| What it creates | Only the **state** entry | State **and** the configuration (`.tf` code) |
| Who writes the resource block | You, from scratch (`ec2.tf`, `s3.tf` ...) | Terraform **generates** it |
| Pain at scale | Thousands of resource blocks to hand-write; made organisations "reluctant" to adopt Terraform | Drastically less time |
| How you run it | One-off CLI command `terraform import ADDR ID` | Declarative `import` block, run through normal `plan`/`apply` |

```text
 OLD:  manual resources --terraform import--> terraform.tfstate     (you write every resource block by hand)

 NEW:  manual resources --import block + plan -generate-config-out--> generated .tf
                        --apply-->                                     terraform.tfstate
```

HashiCorp added this in 1.5. The lecture was re-recorded because of the change ("the entire community was waiting for it for many years").

### 2.3 The `import` block

```hcl
provider "aws" {
  region = "us-east-1"
}

import {
  to = aws_security_group.mysg
  id = "sg-xxxxxxxxxxxxxxxxx"      # ID of the manually created security group
}
```

| Argument | Meaning |
|---|---|
| `import { }` | Top-level block: "bring this existing object into Terraform" |
| `to` | The **resource address** the code and state will be attached to (`<type>.<local_name>`, a name you choose) |
| `id` | The **real-world ID** of the existing resource (for a security group, `sg-...`) |

Where do you find the right `id` format? In the **provider documentation** of the resource, in its "Import" section at the bottom (for example, an `aws_instance` is imported by instance ID, an `aws_s3_bucket` by bucket name, an `aws_iam_user` by user name). The ID is *not always* the same as the name or ARN.

> **Extra context (TF 1.12):** the import block also accepts `provider` (to pick an aliased provider configuration) and `for_each` (to import several objects at once, 1.7+). The `to` address may point into a module instance (`module.net.aws_vpc.main`). In 1.12 you can sometimes import using a resource **identity** instead of an `id` string, if the provider supports it. These are not covered in the lectures, so the exam basics are `to` and `id`.

### 2.4 Generating the configuration: `-generate-config-out`

```bash
terraform plan -generate-config-out=mysg.tf
```

- `-generate-config-out=<file>`: Terraform writes the generated resource configuration into the named file.
- A new file `mysg.tf` appears, containing `resource "aws_security_group" "mysg" { ... }` with all ingress/egress rules reproduced.
- At this point **only code exists; state is not created yet.** It is just a plan.

Typical output (abbreviated):

```text
aws_security_group.mysg: Preparing import... [id=sg-0abc1234def567890]
aws_security_group.mysg: Refreshing state... [id=sg-0abc1234def567890]

Terraform will perform the following actions:

  # aws_security_group.mysg will be imported
  # (config will be generated)
    resource "aws_security_group" "mysg" {
        ...
    }

Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.

Terraform has generated configuration and written it to mysg.tf. Please review
the configuration and edit it as necessary before adding it to version control.
```

The generated file starts with a header such as `# __generated__ by Terraform` and `# Please review these resources and move them into your main configuration files.`

### 2.5 Applying: `terraform apply` creates the state entry

```bash
terraform apply
```

Output ends with `1 imported` (the lecture wording is "1 resources imported"), and a `terraform.tfstate` file now exists containing the imported resource.

### 2.6 Proving it is managed

Edit the generated `mysg.tf` (for example add a description to a rule, or change a CIDR), then `terraform apply -auto-approve`. Refresh the console and the change appears. The security group is now fully managed by Terraform.

### 2.7 Practical walkthrough (lecture 141)

**Step 1: create the resource manually** in the AWS console (EC2, N. Virginia in the demo; any region works).

- Security group name `manually-created-sg`, description `manual`.
- Inbound rules:

| Port | Source | Description |
|---|---|---|
| 80 | `0.0.0.0/0` | allow HTTP from internet |
| 443 | `0.0.0.0/0` | allow HTTPS from internet |
| 22 | a private CIDR (spoken in the video as `170.31.0.0/16`; `172.31.0.0/16` was probably intended) | allow from private network |

- Default outbound rule. So: **3 inbound, 1 outbound**.
- Copy the **security group ID**.

**Step 2: write the import block** in a folder that contains only `import.tf`:

```hcl
provider "aws" {
  region = "us-east-1"        # MUST match the region of the manual resource
}

import {
  to = aws_security_group.mysg
  id = "sg-xxxxxxxxxxxxxxxxx"  # your SG ID
}
```

- `to = aws_security_group.mysg`: resource type `aws_security_group` (from the AWS provider docs) and a local name `mysg` of your choice. This is all that is required; the contents of the resource are generated.
- Keep the folder minimal: only `import.tf` (plus `.terraform` if you have run `init`).

**Step 3: generate the config.**

```bash
terraform init
terraform plan -generate-config-out=mysg.tf
```

In the lecture the first attempt produced an error; the instructor fixed it by removing a small piece he had typed into the `import` block (the transcript does not say which). The final import block contains only `to` and `id`. Re-running succeeded. The result is a new **`mysg.tf`** with `resource "aws_security_group" "mysg"` containing an `egress` and three `ingress` entries (HTTP 80, HTTPS 443, SSH 22).

> **Note:** for `aws_security_group`, newer provider versions render the rules as attribute lists (`ingress = [ { ... } ]`) rather than separate `ingress { }` blocks. Both are valid HCL for that resource. Do not be surprised by either shape.

**Step 4: apply to import into state.**

```bash
terraform apply -auto-approve
```

`1 resources imported`; `terraform.tfstate` appears.

**Step 5: manage via Terraform.** Edit `mysg.tf`: for port 80 change the CIDR from `0.0.0.0/0` to `10.77.0.0/16` (an arbitrary example), then:

```bash
terraform apply -auto-approve
```

Refresh the console: port 80 now shows `10.77.0.0/16`.

### 2.8 Import flow

```text
  Manually created resource (sg-0abc...)
              |
              v
  Write import block (to + id)
              |
              v
  terraform plan -generate-config-out=file.tf
              |
              v
  Generated .tf file  -->  REVIEW / EDIT it
              |
              v
  terraform apply   -->  state entry created ("1 imported")
              |
              v
  Edit .tf, apply   -->  changes the REAL resource from now on
```

### 2.9 Gotchas

- The provider **`region` must match** the region of the resource, otherwise Terraform cannot find the ID (you get "Cannot import non-existent remote object").
- Choose a **unique `to` address**; the local name becomes the resource name in your code.
- The `-generate-config-out` file must be a **new file**. (extra context: Terraform refuses to overwrite an existing file.)
- **`plan` alone creates the config but not the state.** `apply` is what imports into state.
- Review the generated code. (extra context: it can contain read-only/computed attributes or conflicting arguments that need pruning, and it is marked experimental.)
- If you already wrote the `resource` block yourself, you do **not** need `-generate-config-out`; just plan/apply with the `import` block. (extra context: generation is only for resources that do not exist in your config yet.)
- Importing does not create the resource and does not modify it; the first apply after generating only adds it to state. Anything that differs between your code and reality shows up as a normal diff afterwards.
- (extra context) Import blocks and their `to` addresses are meant for the **root module**; you can leave them in the file after the import succeeds (they become a no-op) or delete them.

### 2.10 The legacy `terraform import` CLI command (extra context)

Before 1.5 import was only a CLI command, and it is still available:

```bash
terraform import aws_security_group.mysg sg-xxxxxxxxxxxxxxxxx
```

| Aspect | `terraform import ADDR ID` (legacy) | `import` block (1.5+) |
|---|---|---|
| Writes state | Immediately, no preview | Only on `apply`, previewed in `plan` |
| Writes code | **No**, you must write the `resource` block first | Can generate it |
| Reviewable in Git/CI | No | Yes |
| Bulk imports | One command per resource | `for_each` (1.7+) |

With the legacy command you **must** already have a matching `resource "aws_security_group" "mysg" { ... }` block in your configuration, otherwise the import fails with an error that the address does not exist in configuration.

### 2.11 Exam focus for import

- Import = bring existing infrastructure under Terraform management.
- Terraform **1.5+**: `import` block (`to` and `id`) + `terraform plan -generate-config-out=FILE`.
- Import writes to **state**; the generated config is a starting point to review.
- Importing does **not** create the resource; it adopts it.
- Flag: `-generate-config-out=<path>`, used with `terraform plan`.
- Check your version with `terraform version`; anything 1.5 or above supports it. For older versions download the latest binary from HashiCorp.

---

## 3. Forgetting a resource: `state rm` versus the `removed` block (lecture 142)

### 3.1 The scenario

Terraform manages several resources (an S3 bucket, VMs, Lambda functions, ...). Later one EC2 instance is **handed to another team** that does not use Terraform and manages it manually. You want to **break the link between state and that instance**, while:

- leaving the instance running, and
- leaving the other resources in the same folder untouched.

### 3.2 The old workflow

1. Delete (or comment out) the resource block in config.
2. Run `terraform state rm <address>` to remove it from state. Terraform then no longer knows it ever created the instance.

Disadvantages:

- It is **imperative**: a manual command that is **not recorded in the Git code**. Later it is hard to tell who ran what and when.
- It is hard to automate safely in **CI/CD** pipelines. (Slide: "terraform state rm is generally risky and integration with CI/CD in old is difficult".)

### 3.3 The new way: the `removed` block

Declare your intent in code. Terraform plans a "forget" action and removes the object from state on apply.

```hcl
removed {
  from = local_file.foo

  lifecycle {
    destroy = false
  }
}
```

| Part | Meaning |
|---|---|
| `removed { }` | Top-level block: "this resource is no longer in my configuration" |
| `from` | Address of the resource that used to exist (here `local_file.foo`) |
| `lifecycle { destroy = false }` | Remove from state **but do not destroy** the real object. `destroy = true` (the default) would destroy it |

You must **also remove or comment out the original `resource` block** (step 1); the `removed` block is step 2. This turns the imperative `terraform state rm` into a declarative config block.

> **Extra context:** `removed` blocks need **Terraform 1.7+**. A `removed` block with the default `destroy = true` still destroys the object when applied, just like deleting a resource block, but it documents the intent explicitly. A `removed` block may also contain `provisioner "local-exec"` blocks with `when = destroy` that run at removal time (see [Chapter 05](05-resources-data-dependencies.md) for provisioners).

### 3.4 Demo: forgetting a local file

A very simple resource (the file is created in the project folder):

```hcl
resource "local_file" "foo" {
  filename = "kplabs.txt"
  content  = "Hello from KPLabs!"
}
```

> The exact block is reconstructed from the lecture description: file `kplabs.txt`, content "Hello from KPLabs!", address `local_file.foo`. `local_file` comes from the `hashicorp/local` provider and writes a file on your machine.

Walkthrough:

1. `terraform init`, then `terraform plan`: 1 to add, no `kplabs.txt` yet.
2. `terraform apply -auto-approve`: `kplabs.txt` is created. `cat kplabs.txt` prints `Hello from KPLabs!` and the state has the entry.
3. You now want to stop managing it. **Commenting out** the resource (the instructor prefers commenting over deleting) and running `terraform plan` shows it will **destroy** the file. Not wanted.
4. Add the `removed` block (`from = local_file.foo`, `destroy = false`) and keep the resource block commented out or deleted.
5. `terraform plan` states clearly that **`local_file.foo` will no longer be managed by Terraform, but will not be destroyed**:

```text
Terraform will perform the following actions:

  # local_file.foo will no longer be managed by Terraform, but will not be destroyed
  # (destroy = false is set in the configuration)
  . resource "local_file" "foo" {
        id       = "..."
        # (3 unchanged attributes hidden)
    }

Plan: 0 to add, 0 to change, 0 to destroy.
```

6. `terraform apply -auto-approve` completes; the **state file no longer references `kplabs.txt`**; the file itself **still exists** on disk.

```text
 plan:  Terraform sees removed block with destroy=false -> plans a "forget" action
 apply: object removed from state; the real resource (EC2, local file, ...) is untouched
```

### 3.5 Comparison

| | `terraform state rm` (old) | `removed` block (new) |
|---|---|---|
| Style | Imperative CLI command | Declarative config in code |
| Recorded in Git | No | Yes (reviewable, auditable) |
| CI/CD friendliness | Poor / risky | Good |
| Preview with `plan` | No dry-run of the action itself (extra context: `-dry-run` flag exists) | Yes, plan shows "will no longer be managed" |
| Resource destroyed? | No | Only if `destroy = true`; with `false`, no |

### 3.6 Gotchas

- If you **delete the resource block but add no `removed` block**, plan wants to **destroy** the resource.
- `destroy = false` is the key line; without it the behaviour is to destroy.
- Leave the `removed` block in config until it has been applied everywhere (all workspaces and state copies).

### 3.7 Exam focus

- `removed` block = the **declarative alternative to `terraform state rm`**.
- `lifecycle { destroy = false }` means forget, but do not destroy.
- Remember the three "state-editing" approaches: `terraform state rm` (CLI), `removed` block (declarative), and `import` (the opposite direction: add to state).

---

## 4. Renaming and refactoring: `moved` blocks (lecture 104)

### 4.1 The scenario: renaming a resource

In long-lived configurations you may want to rename or move an object. Suppose a security group was created years ago:

```hcl
resource "aws_security_group" "database_firewall" {
  name = "db_firewall"
}
```

Your team adopts a naming standard and you rename the local name to `payment_database_firewall`.

Terraform's assumption: the resource address changed, so you intend to **destroy the old address and create a new one**.

```text
 Plan after naive rename:
   - aws_security_group.database_firewall            will be destroyed
   + aws_security_group.payment_database_firewall    will be created
```

A simple rename causes **recreation**, which is unacceptable in production.

### 4.2 The solution: the `moved` block

With a `moved` block, Terraform treats the existing object at the old address as belonging to the new address.

```hcl
moved {
  from = <old address>
  to   = <new address>
}
```

Base code after renaming (`moved-blocks.md`):

```hcl
resource "aws_security_group" "payment_database_firewall" {
  name = "db_firewall"
}
```

Final code:

```hcl
resource "aws_security_group" "payment_database_firewall" {
  name = "db_firewall"
}

moved {
  from = aws_security_group.database_firewall
  to   = aws_security_group.payment_database_firewall
}
```

```bash
terraform plan
terraform apply -auto-approve
```

### 4.3 Demo walkthrough

1. Start with the original resource (`database_firewall`, in `moved.tf`).
2. `terraform plan`: 1 to add. `terraform apply -auto-approve`. The `db_firewall` security group exists in the AWS console.
3. Rename the resource block to `payment_database_firewall` **without** a `moved` block and run `terraform plan`: it shows **destroy of the old and create of the new**.
4. Add the `moved` block (from the old address to the new one) and save.
5. `terraform plan`: **no destroy and no create**. The plan shows only that the state will be updated: it is neither an add, change nor destroy, but a **state address move** (the state still lists `database_firewall`).

```text
Terraform will perform the following actions:

  # aws_security_group.database_firewall has moved to aws_security_group.payment_database_firewall
    resource "aws_security_group" "payment_database_firewall" {
        id   = "sg-0abc1234def567890"
        name = "db_firewall"
        # (7 unchanged attributes hidden)
    }

Plan: 0 to add, 0 to change, 0 to destroy.
```

6. `terraform apply -auto-approve`: completes; the state now contains `payment_database_firewall`.
7. `terraform plan` again: **No changes.**

```text
  state before:  aws_security_group.database_firewall
                          |   moved { from -> to }
                          v
  state after :  aws_security_group.payment_database_firewall   (same real security group)
```

### 4.4 `moved` block versus `terraform state mv`

Both avoid recreation when renaming. Which one to pick:

| | `moved` block | `terraform state mv` command |
|---|---|---|
| Where defined | In the **configuration** (`.tf`) | Run in the **CLI** |
| Visibility | Visible to all team members through version control | Other team members may not know it was run |
| Best for | Team collaboration / documenting refactors | **Scripting and automation**, bulk operations (Bash, Python) |
| Effect | Updates the state address on the **next apply** | Modifies state **immediately** |

### 4.5 Other refactors a `moved` block can express (extra context)

The lecture only shows a simple rename. The same block handles these common refactors, and the exam may describe them in words:

```hcl
# Move a resource INTO a module
moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}

# Rename a module call
moved {
  from = module.old_name
  to   = module.new_name
}

# Switch from count to for_each, keeping the same objects
moved {
  from = aws_instance.web[0]
  to   = aws_instance.web["frontend"]
}
```

Keep `moved` blocks in your code for as long as anybody might still hold an old state. This matters most for **modules you publish** for others: removing a `moved` block would make those users' next plan destroy and recreate.

### 4.6 Gotchas

- Rename the resource block **and** add the `moved` block **before** running `plan`; otherwise Terraform proposes destroy + create.
- The first plan after adding `moved` still shows a line of action: it is the state address update, and it only completes after `apply`.
- After the state is updated, the plan reports no changes; you may keep the `moved` block in config for others who have not applied yet.

### 4.7 Exam focus

- Use `moved { from = ..., to = ... }` to rename/refactor resources **without** destroying them.
- Without it, renaming a resource label causes **destroy + create**.
- Alternative: `terraform state mv` (CLI, good for scripting).
- `moved` blocks live in code, so the whole team can see them; `state mv` is invisible.
- The operation updates the **state file** with the new address; no real infrastructure changes.

### 4.8 Summary: choosing the right state-changing tool

| I want to ... | Config change | Tool |
|---|---|---|
| Adopt an existing real resource | Add `import` block (+ generated/hand-written resource) | `import` block, `-generate-config-out` |
| Stop managing a resource, keep it running | Remove resource block | `removed` block (`destroy = false`) or `terraform state rm` |
| Rename / move an address, keep the object | Rename block | `moved` block or `terraform state mv` |
| Rebuild a resource from scratch | None | `terraform apply -replace=ADDR` |
| Switch the recorded provider | None | `terraform state replace-provider` |
| Inspect state safely | None | `state list`, `state show`, `state pull` |

---

## 5. Forcing re-creation: `-replace` and the deprecated `taint` (lecture 79)

### 5.1 The use case

In many real organisations someone manually changes resources: edits an EC2 instance's settings, or logs in to the server and reconfigures it. Problems:

- Manual changes are **not tracked in Terraform**. If you later build a copy of the environment (for example in another account) from the Terraform code, it will not match the original, because the original was hand-modified.
- Best practice: avoid manual changes. If they were made, **import** them so the code reflects reality (see [section 2](#2-importing-existing-infrastructure-lectures-140-141)).
- Alternatively, **delete and recreate** the resource to return to the intended, working version defined in Terraform. Example: someone logged in to an EC2 instance, made changes, and the application broke. You want to revert to the original infrastructure.

For the second case, use **`terraform apply -replace`**.

### 5.2 The command

```bash
terraform apply -replace="aws_instance.myec2"
```

`-replace=<resource address>` forces Terraform to **replace** that object even though no configuration change requires it. Terraform destroys the instance and then creates a brand-new one from the configuration.

### 5.3 Demo walkthrough

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

(The lecture's repo file contains hardcoded access keys; use [the AWS authentication methods in Chapter 02](02-providers.md) instead.) The `ami` is the ID of the image the server boots from. In real organisations a pre-configured image with the application baked in is used, so launching a new instance from it restores a working application.

1. `terraform init`, `terraform apply`, review, `yes`. The instance is created (about 26 seconds). The console shows one EC2 instance.
2. Imagine someone broke the application manually. Run `terraform apply` again: **"No changes. Your infrastructure matches the configuration."** Terraform does not know about the manual damage inside the server.
3. Run:

```bash
terraform apply -replace="aws_instance.myec2"
```

   The plan summary is **1 to add, 1 to destroy**; scrolling up, the instance is marked "**must be replaced**" (the lecture says "will be replaced"). Type `yes`.

4. In the output the old instance is destroyed, then the new one is created (this is the default order; the `create_before_destroy` lifecycle option in [Chapter 08](08-lifecycle-conditions-sensitive.md) can reverse it). In the EC2 console (with terminated instances shown) the old instance is `terminated`, the new one is `running`.

```text
apply -replace="aws_instance.myec2"
   +------------------------+        +------------------------+
   | old aws_instance.myec2 | -destroy-> gone                 |
   +------------------------+        | new aws_instance.myec2 | <-create- from configuration
                                     +------------------------+
```

### 5.4 `taint` versus `-replace`

In older Terraform versions, `terraform taint` marked a resource as **"tainted"** in the state so that the next `apply` would destroy and recreate it. From **Terraform 0.15.2**, HashiCorp recommends the **`-replace` option** of `terraform apply` instead.

| | `terraform taint <addr>` (old) | `terraform apply -replace=<addr>` (recommended) |
|---|---|---|
| Effect | Marks the resource in the state; replaced on next apply | Replaces it in this very apply |
| Two steps? | Yes (taint, then apply) | No: you see the plan with the replacement before approving |
| Status | Superseded since 0.15.2 | Recommended |

(extra context) A related command, `terraform untaint <addr>`, removes the tainted mark. A resource can also become tainted **automatically** when a creation-time provisioner fails (see [Chapter 05](05-resources-data-dependencies.md)); Terraform will then plan to replace it on the next apply.

The instructor's exam guidance: if you hear "terraform taint" in an exam or in real work, it simply means **recreating a resource that Terraform already created**.

> **Up to date (TF 1.12):** `terraform taint` and `terraform untaint` still exist in 1.12 but are **deprecated in documentation** in favour of `-replace`. `-replace` can be given **more than once** (`-replace=a.b -replace=c.d`) and works with `terraform plan` too, so you can preview the replacement with `terraform plan -replace="aws_instance.myec2"`, save it with `-out`, and apply it later.

### 5.5 Gotchas

- `-replace` **destroys real infrastructure**. Always read the plan.
- Data stored on the instance (not in the image or code) will be **lost**.
- The address is `<resource_type>.<local_name>` (`aws_instance.myec2`), **not** the `Name` tag.
- For `count`/`for_each` resources quote the whole address: `-replace='aws_instance.web[0]'`.

### 5.6 Exam focus

- Use `terraform apply -replace="<address>"` to force re-creation of a resource.
- `terraform taint` is the older approach (deprecated in favour of `-replace` from 0.15.2).
- A forced replacement shows **"1 to add, 1 to destroy"**.
- `-replace` is the *manual* way; to replace automatically when something else changes see `replace_triggered_by` in [Chapter 08](08-lifecycle-conditions-sensitive.md).

---

## 6. Refresh and why `terraform refresh` is deprecated (lecture 36)

Refresh was introduced alongside the state file in [Chapter 04](04-state-basics.md) and the `-refresh-only` flag is part of [Chapter 03](03-core-workflow.md). This section holds the **deprecation** discussion and the lecture's demo.

### 6.1 What refresh does

Real infrastructure can be modified outside Terraform, and Terraform cannot stop that. To revert such drift, Terraform first has to **know** about it. **Refresh** = Terraform scans the real-world infrastructure and **updates the state file** to reflect reality; the updated state is then compared with your desired configuration.

It **reads** reality; it does not change infrastructure.

### 6.2 You rarely run it manually

`terraform plan` and `terraform apply` **automatically perform the refresh step first**. In the plan output you see "Refreshing state..." lines before the diff. Example: after the instance is created, a second `terraform plan` shows refresh first, then "No changes".

### 6.3 Why manual `terraform refresh` can be dangerous (demo)

Config used (`refresh.tf`):

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

```text
 Provider region changed us-east-1 -> us-west-2
                      |
          which command do you run?
          /                         \
  terraform plan                terraform refresh
  looks in us-west-2,           looks in us-west-2,
  cannot see old instance       resource looks "gone"
  Plan: 1 to add                State is rewritten EMPTY
  State file NOT modified       -> restore from terraform.tfstate.backup
```

Walkthrough:

1. `terraform apply -auto-approve` creates the instance in `us-east-1`; `terraform plan` refreshes and shows **no changes**.
2. Change the provider region to `us-west-2` and run `terraform plan`: **1 to add** (Terraform cannot find the old instance in the new region). **The state file remains populated**; plan does not modify state. Change the region back to `us-east-1` and plan shows no changes.
3. Change the region to `us-west-2` again and this time run **`terraform refresh`**. It cannot find the infrastructure in that region and **wipes the resource from the state file**: `terraform.tfstate` is now empty.
4. Recovery: copy the contents of `terraform.tfstate.backup` into the state file, set the region back to `us-east-1`, run `terraform plan`: **no changes**. The backup saved the day.

Lesson: running refresh explicitly can erase your state. That is why production remote backends such as S3 enable **versioning**, so you can roll back a damaged state file.

> **Up to date (TF 1.12):** the lecture's demo reflects why HashiCorp deprecated the command: `terraform refresh` writes the new state **immediately, with no preview and no confirmation**. (In current releases some "resource not found" situations are handled more gently than in the demo, but you should still treat the command as unsafe.)

### 6.4 Deprecation and the replacement

- The standalone `terraform refresh` command is **deprecated** in newer Terraform versions (since 0.15.4); it still runs, with a warning.
- Use the **`-refresh-only`** mode with `plan` / `apply` instead.

```bash
terraform plan  -refresh-only     # SHOW what refresh would change in state; change nothing
terraform apply -refresh-only     # show the proposed state update and ask you to approve it
```

`terraform apply -refresh-only` is the safe equivalent of the old `refresh`: you **review** the drift first and approve it explicitly. (`terraform refresh` is equivalent to `terraform apply -refresh-only -auto-approve`, which is exactly why it is dangerous.)

(extra context) `-refresh=false` does the opposite: it **skips** the refresh step during a normal plan/apply, which can speed up large projects but risks planning against stale state.

You will rarely use these, but the exam may mention them.

| Command | What it does to state | Safe? |
|---|---|---|
| `terraform refresh` | Updates state from reality, **no confirmation** | Deprecated, risky |
| `terraform plan -refresh-only` | Shows proposed state changes; **changes nothing** | Safe |
| `terraform apply -refresh-only` | Shows proposed state changes, **asks to approve** | Safe |
| `terraform plan` / `apply` (normal) | Refreshes in memory first, then diffs against config | Normal |
| `terraform plan -refresh=false` | Skips refresh | Use with care |

### 6.5 Gotchas

- Changing the provider `region` makes Terraform "lose" resources (they are in the old region); the plan wants to recreate them.
- `terraform plan` does **not** alter the state file; the old `terraform refresh` did.
- Always keep a backup of state; `terraform.tfstate.backup` is only a short-term safety net.

### 6.6 Exam focus

- Refresh reconciles the **state file** with real infrastructure (reads reality; does not change infrastructure).
- `plan` and `apply` refresh automatically.
- `terraform refresh` is **deprecated**; use `-refresh-only` with plan/apply.
- Manually running refresh can remove entries from state.

---

## 7. Debugging Terraform (lectures 71-74)

### 7.1 What is debugging?

**Debugging = the process of finding the root cause of an issue.** It is not specific to Terraform. Example: you cannot log in to a Linux server. Is it the client? The firewall? The network? The remote system? Working that out is debugging.

The instructor notes that in system administration and DevOps roles roughly **30-40% of your time** goes into debugging. Installing software is easy (`yum install <name>`); working out why a tool does not behave as expected is the hard part (misread documentation, configuration mistakes, and so on).

**The key requirement for debugging anything is a detailed log.** How you get one depends on the tool.

#### Warm-up analogy: SSH verbosity

| Command | Verbosity | Lines of log produced (in the demo) |
|---|---|---|
| `ssh -i key user@host` | none (password prompt, then login) | almost nothing |
| `ssh -v ...` | low | 57 lines |
| `ssh -vvvv ...` | very high | about 170 lines (the instructor says "almost 150" in passing) |

Higher verbosity = more detail. You rarely need it, but when something is not working it shows what is happening behind the scenes. Terraform has the same idea.

### 7.2 `TF_LOG`: choose the log level

Terraform lets you choose a log level through the environment variable **`TF_LOG`**. With a plain `terraform plan` you only get normal plan output. With `TF_LOG` set you additionally see lines tagged `INFO`, `DEBUG`, `TRACE` and so on. They are very useful for finding bugs in the **Terraform core binary** or in **provider plugins**.

Log levels (the table is in **decreasing verbosity**):

| Level | Verbosity | Notes |
|---|---|---|
| `TRACE` | highest (most detailed) | everything |
| `DEBUG` | high | |
| `INFO` | medium | shows Terraform version, Go runtime version, etc. |
| `WARN` | low | the lecture calls this "warning" |
| `ERROR` | lowest | |

**Demo numbers:** the instructor ran `terraform plan` on a small configuration and counted lines of output.

| `TF_LOG` | Lines of log output |
|---|---|
| `INFO` | 16 lines |
| `TRACE` | 782 lines (the lecture also says "780") |

So the level you choose changes the amount of output dramatically. In normal work you do not need this, but when you suspect a bug in the binary or provider, **TRACE** logs are what you attach to a bug report (see [section 7.7](#79-reporting-terraform-bugs-lecture-74)).

### 7.3 `TF_LOG_PATH`: send logs to a file

780 lines in your terminal is painful to scroll through and copy. **`TF_LOG_PATH`** sends the logs to a **file** instead of standard output. Your terminal then shows only the normal `terraform plan` output, and the detailed log sits in the file for later analysis.

In the demo, with `TF_LOG=TRACE` and `TF_LOG_PATH` set, the plan printed normally on screen and a text file appeared in the working folder. The instructor deleted the file, re-ran `terraform plan`, and the file was created again with the full TRACE output.

```text
 terraform plan
      |
      +-- normal output ------------------> your terminal (stdout)
      |
      +-- debug logs (level = TF_LOG) -----> TF_LOG_PATH file   (if TF_LOG_PATH is set)
                                            otherwise ALSO to the terminal
```

| Variable | Purpose | Example value |
|---|---|---|
| `TF_LOG` | **Verbosity** of logs to capture | `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `TF_LOG_PATH` | **File** where logs are stored instead of stdout | `terraform.txt` |

> ⚠️ **Gotcha (extra context):** `TF_LOG_PATH` only has an effect **when `TF_LOG` is also set**. Setting just the path produces an empty/no log. To turn logging off, unset `TF_LOG` (`unset TF_LOG` on Linux/macOS, `set TF_LOG=` in Windows cmd).

**Extra context (not stressed in the course):** newer Terraform versions also offer `TF_LOG_CORE` and `TF_LOG_PROVIDER` to set the level for **only the core** or **only providers** (for example `TF_LOG_CORE=off` with `TF_LOG_PROVIDER=TRACE` to focus on a provider bug), and `TF_LOG=JSON` to emit logs in JSON form. The exam focuses on `TF_LOG` and `TF_LOG_PATH`.

### 7.4 Setting the variables: Windows versus Linux/macOS

Setting an environment variable differs by operating system. **The Linux command works on macOS too.**

| OS / shell | Set `TF_LOG` | Set `TF_LOG_PATH` |
|---|---|---|
| Windows (cmd) | `set TF_LOG=INFO` | `set TF_LOG_PATH=terraform.txt` |
| Linux / macOS | `export TF_LOG=INFO` | `export TF_LOG_PATH=terraform.txt` |
| Windows PowerShell (extra context) | `$env:TF_LOG="INFO"` | `$env:TF_LOG_PATH="terraform.txt"` |

From the repo (`debugging.md`):

```bash
# Windows (cmd)
set TF_LOG=INFO
set TF_LOG=TRACE

set TF_LOG_PATH=terraform.txt
```

```bash
# Linux / macOS
export TF_LOG=INFO
export TF_LOG=TRACE

export TF_LOG_PATH=terraform.txt
```

The repo also shows a Linux/macOS example that writes the log under `/tmp`:

```bash
export TF_LOG_PATH=/tmp/crash.log
export TF_LOG=TRACE
```

### 7.5 Debugging practical walkthrough (lecture 72)

**Base code** (`tf-logs.tf`): it creates a file `foo.txt` in the folder where you run Terraform.

```hcl
resource "local_file" "foo" {
  content  = "foo!"
  filename = "${path.module}/foo.txt"
}
```

- `local_file` is a resource from the `local` provider; it writes a file on your machine.
- `content` is the text to write; `filename` is the destination.
- `${path.module}` is the directory of the current module, so the file is created next to the `.tf` file.

Run `terraform init` first so the provider is installed.

1. **Baseline.** `terraform plan` prints the normal plan only.
2. **INFO.** `set TF_LOG=INFO` (Windows) or `export TF_LOG=INFO` (Linux/macOS). Run `terraform plan` again. The output now also shows INFO log lines.
3. **TRACE.** Change to `TRACE`. `terraform plan` now prints far more events.
4. **Send logs to a file.** Add `TF_LOG_PATH`. In the Windows demo: `set TF_LOG_PATH=terraform.txt`. Run `terraform plan`. The plan output is normal and a `terraform.txt` file appears in the project folder with all the TRACE events.
5. **Linux equivalent:**

```bash
export TF_LOG=TRACE
export TF_LOG_PATH=terraform.log
terraform plan
ls
cat terraform.log
```

Expected result: the plan prints normally; `terraform.log` exists and is full of `[TRACE]` / `[DEBUG]` / `[INFO]` lines such as:

```text
2026-01-15T10:21:04.123+0530 [INFO]  Terraform version: 1.12.0
2026-01-15T10:21:04.123+0530 [INFO]  CLI args: []string{"terraform", "plan"}
2026-01-15T10:21:04.124+0530 [INFO]  Go runtime version: go1.24
2026-01-15T10:21:04.125+0530 [TRACE] Meta.Backend: no config given, using default local backend
```

(Version numbers and timestamps are illustrative.)

### 7.6 Temporary versus permanent environment variables

`set` and `export` are **temporary**: they only apply to the **current terminal session**. The instructor proved it:

- He deleted the log file, opened a **new** command prompt and ran `terraform plan`: the output was normal and **no log file** was created (variable not set in that session).
- Going back to the original terminal (where the variable was set) and running `terraform plan` created the file again.

Why temporary is preferred: you do not need detailed logs for every command. Set the variable only when you need to investigate, run the command, then close the terminal.

**Permanent option** (Windows-specific demo): Advanced system settings, then Environment Variables, then add a new variable `TF_LOG` with value `INFO`. Only **new** terminals pick it up. The instructor says this is not necessary and not recommended; every `terraform plan` would then show INFO output by default.

| Method | Scope | Recommended? |
|---|---|---|
| `set` (Windows) / `export` (Linux, macOS) | current terminal session only | Yes, use when you need logs |
| System-level environment variable (Windows GUI) | all new sessions | Not necessary |

A one-line trick (extra context) that avoids leaving variables set at all, on Linux/macOS:

```bash
TF_LOG=TRACE TF_LOG_PATH=terraform.log terraform plan
```

### 7.7 Where logs and `crash.log` fit

- **Normal debug logs** are the ones you ask for with `TF_LOG` / `TF_LOG_PATH`.
- If Terraform itself **crashes** (a Go "panic"), it writes a **`crash.log`** file into the current directory containing the debug log and a stack trace. That is why `crash.log` appears in the standard `.gitignore` for Terraform (see [Chapter 10](10-backends-locking-drift.md): "when Terraform crashes the debug log is written to `crash.log`").
- Lecture 74 uses the name `crash.log` as the example output file for a bug report: `export TF_LOG_PATH=crash.log`.

> ⚠️ **Gotcha:** log files can contain **sensitive details** (resource values, request/response bodies, sometimes tokens). Treat them carefully, **never commit them**, and review/redact a log before pasting it into a public GitHub issue.

> ⚠️ **Gotcha:** a new terminal will not have your `export`/`set` values. If a log file is "missing", check that the variable is set in *that* session. And with `TF_LOG` set but no `TF_LOG_PATH`, everything goes to the terminal and buries the plan output.

### 7.8 The Terraform troubleshooting model (lecture 73)

When Terraform gives an error it is usually your code, but not always. The troubleshooting model lists **four places** an issue can come from.

```text
                 Error while using Terraform
                            |
      +----------+----------+----------+-------------+
      v          v                     v             v
  1. Language  2. State            3. Core        4. Provider
   (HCL code)  (state file)     (Terraform      (provider plugin,
                                  binary)        e.g. AWS)
```

**1. Language errors.** Mistakes in the code you wrote (HCL = HashiCorp Configuration Language). This is where you will spend most of your time. Examples: wrong syntax, unsupported argument, undeclared variable. Use `terraform validate` (see [Chapter 03](03-core-workflow.md)).

**2. State errors.** Problems with the state file:

- The state is **out of sync** with reality, so Terraform may try to destroy or change an existing resource unexpectedly.
- The state is **locked**, so you get an "Error acquiring the state lock". In that case you may need the **force unlock** command (the instructor describes it as "force and lock command"; the real command is `terraform force-unlock <LOCK_ID>`; see [Chapter 10](10-backends-locking-drift.md)).

**3. Core errors.** Bugs in the main Terraform application (the binary). Terraform is mature but not bug-free; a particular version can have bugs. Approach: you have checked your HCL and your state and they are fine, so look at the HashiCorp Terraform GitHub repository.

In the demo (numbers as of the recording; they have changed since):

| Repo | Open issues | Label `bug` |
|---|---|---|
| `hashicorp/terraform` (core) | about 1.8 K (about 1800) | about 312 |
| `hashicorp/terraform-provider-aws` | about 3.5 K (about 3500) | (has its own labels) |

Check whether others see the same problem; if nobody has reported it you can report it yourself.

The instructor's anecdote: while implementing HashiCorp Vault in 2019 his team spent two to three days chasing an error that was not a configuration problem at all but a bug in that Vault version, fixed in a later release. Lesson: occasionally the tool is at fault.

**4. Provider errors.** Errors from the **provider plugin** (AWS, Google, etc.):

- **Core and providers are managed separately**, in separate repositories.
- Updating Terraform to the latest version will **not** fix a provider bug. You must update the **provider plugin** to a version where it is fixed (see [Chapter 02](02-providers.md) for version constraints).
- Report provider bugs in the **provider's** repository (for example `hashicorp/terraform-provider-aws`), **not** in the Terraform core repository.
- Not all providers are under the `hashicorp` organisation; look at the provider's own repository.

#### Quick decision table

| Symptom | Likely category | First action |
|---|---|---|
| Syntax error, unsupported argument, undeclared variable | Language | Fix code; run `terraform validate` |
| "Error acquiring the state lock", plan wants to destroy things you did not touch | State | Check lock/backend and state drift; `force-unlock` if safe |
| Crash / panic in Terraform itself, behaviour contradicts docs, code and state are fine | Core | Search core GitHub issues; upgrade/downgrade; report with `TF_LOG=TRACE` |
| Resource API behaves wrongly, provider-specific error | Provider | Search provider repo; upgrade the **provider**; report there |

The recommended order: **first troubleshoot your own code, then state, then check for existing bugs in the core and in provider plugins.**

🎯 **Exam focus:**

- The four categories: **language, state, core, provider**.
- Core and providers are **separate** (separate releases, separate repos).
- Provider bug = upgrade the **provider**, report to the **provider repo**.
- Locked state = `terraform force-unlock`.

### 7.9 Reporting Terraform bugs (lecture 74)

If you are confident the problem is neither your configuration nor your state, but the Terraform binary, you should report it so it can be analysed and fixed in a later version.

**Where to report**

- Core bug: GitHub `hashicorp/terraform` repository, **Issues** tab.
- Provider bug: the **provider's** GitHub repository (see the model above).

First look through existing issues; someone may already have reported it.

**Steps (as demonstrated)**

1. Open the repository, go to **Issues**, then **New issue**.
2. Choose a category. Options include **Bug report** and a documentation issue, each with a **Get started** button.
3. Choose **Bug report**, then **Get started**. A template appears.
4. Fill it in.

**The bug report template**

| Field | What you provide |
|---|---|
| Title | Short description |
| Terraform version | for example the issue shown in the lecture used Terraform `1.9.4` (output of `terraform version`) |
| Terraform configuration files | **Minimal** code that reproduces the problem |
| Debug output | The TRACE log, obtained with `TF_LOG` (usually via `TF_LOG_PATH`) |
| Expected behavior | What you thought would happen |
| Actual behavior | What happened |
| Steps to reproduce | So others in the community can reproduce it with the same version |
| Additional context | Anything else |

```bash
# Capture debug output for the report
export TF_LOG=TRACE
export TF_LOG_PATH=crash.log
terraform plan
# Attach (a reviewed copy of) crash.log to the issue
```

🎯 **Exam focus:**

- Debug output for a bug report comes from `TF_LOG` (TRACE).
- Provide the Terraform version, configuration, expected versus actual behaviour, and reproduction steps.
- Report the bug in the repository that owns the code: core versus provider.

---

## 🧪 Labs

All labs below except Lab 4 use the free `local_file` resource, so they cost nothing and need no AWS account. Create a fresh empty folder for each lab.

### Lab 1: state commands on local files

1. Create `main.tf`:

```hcl
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
  }
}

resource "local_file" "a" {
  filename = "${path.module}/a.txt"
  content  = "file A"
}

resource "local_file" "b" {
  filename = "${path.module}/b.txt"
  content  = "file B"
}
```

2. `terraform init && terraform apply -auto-approve`. Two files appear.
3. List and inspect:

```bash
terraform state list
```

```text
local_file.a
local_file.b
```

```bash
terraform state show local_file.a
terraform state pull | head -20
terraform state pull > backup.tfstate     # a safety copy
```

4. **Rename without recreation** with `state mv`:

```bash
terraform state mv local_file.a local_file.alpha
```

   Now edit `main.tf` and rename `resource "local_file" "a"` to `"alpha"`. Run `terraform plan`. Expected: **No changes**. Run `ls`: `a.txt` was never touched.

5. **Forget a resource** with `state rm`:

```bash
terraform state rm local_file.b
terraform state list           # only local_file.alpha
terraform plan                 # because the block is still in config: "1 to add"
```

   Delete the `local_file.b` block from `main.tf` and run `terraform plan`: **No changes**. `b.txt` still exists on disk (`ls`).

6. Cleanup: `terraform destroy -auto-approve` (removes `a.txt`), then `rm b.txt backup.tfstate`.

### Lab 2: `moved` block

1. Use a single resource:

```hcl
resource "local_file" "database_firewall" {
  filename = "${path.module}/db.txt"
  content  = "db"
}
```

2. `terraform init && terraform apply -auto-approve`.
3. Rename the block to `payment_database_firewall` and run `terraform plan`. You should see **1 to add, 1 to destroy** (do not apply).
4. Add:

```hcl
moved {
  from = local_file.database_firewall
  to   = local_file.payment_database_firewall
}
```

5. `terraform plan`: the output says `local_file.database_firewall has moved to local_file.payment_database_firewall` and **Plan: 0 to add, 0 to change, 0 to destroy**.
6. `terraform apply -auto-approve`, then `terraform state list` shows the new address. `terraform plan` shows **No changes**.
7. Cleanup: `terraform destroy -auto-approve`.

### Lab 3: `removed` block (forget without destroying)

1. Create `demo.tf`:

```hcl
resource "local_file" "foo" {
  filename = "kplabs.txt"
  content  = "Hello from KPLabs!"
}
```

2. `terraform init`, `terraform apply -auto-approve`, `cat kplabs.txt`.
3. Comment out the resource and run `terraform plan`. It plans to **destroy** the file. Do not apply.
4. Add:

```hcl
removed {
  from = local_file.foo

  lifecycle {
    destroy = false
  }
}
```

5. `terraform plan` shows "will no longer be managed by Terraform, but will not be destroyed". `terraform apply -auto-approve`.
6. Verify: `terraform state list` is empty, but `cat kplabs.txt` still prints the text.
7. Cleanup: `rm kplabs.txt`.

### Lab 4: import a security group (free, but needs AWS)

Security groups themselves are free, but delete the group afterwards.

1. In the AWS console create a security group `manually-created-sg` in `us-east-1` with inbound 80 and 443 from `0.0.0.0/0` and 22 from your private CIDR. Copy its `sg-...` ID.
2. In an empty folder, create `import.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

import {
  to = aws_security_group.mysg
  id = "sg-xxxxxxxxxxxxxxxxx"   # your SG ID
}
```

3. `terraform init`, then `terraform plan -generate-config-out=mysg.tf`. Expect `Plan: 1 to import, 0 to add, 0 to change, 0 to destroy.` and a new `mysg.tf`. Open it and review.
4. `terraform apply -auto-approve`. Expect `1 imported`. `terraform state list` shows `aws_security_group.mysg`.
5. Edit `mysg.tf`: change the port 80 CIDR to `10.77.0.0/16`. `terraform apply -auto-approve`, refresh the console and see the rule change.
6. **Cleanup:** `terraform destroy -auto-approve` (this deletes the real security group, because Terraform now manages it).

### Lab 5: `-replace`

1. Use the `local_file` from Lab 2 (or `aws_instance` if you want the lecture's version; that one costs a little, destroy afterwards).
2. `terraform apply -auto-approve`. Then `terraform apply` again: **No changes**.
3. Delete the file by hand (`rm db.txt`) and re-run `terraform plan`: Terraform notices and plans to recreate (drift). Apply it back.
4. Now force a rebuild even though nothing is wrong:

```bash
terraform apply -replace="local_file.payment_database_firewall"
```

   Expect `Plan: 1 to add, 0 to change, 1 to destroy` and "must be replaced".
5. Try the preview form: `terraform plan -replace="local_file.payment_database_firewall"`.
6. Cleanup: `terraform destroy -auto-approve`.

### Lab 6: debug logs

1. In a folder with the `tf-logs.tf` from section 7.5, run `terraform init`.
2. Compare the line counts:

```bash
export TF_LOG=INFO
terraform plan 2>&1 | wc -l

export TF_LOG=TRACE
terraform plan 2>&1 | wc -l
```

   TRACE should be dramatically larger.
3. Send logs to a file:

```bash
export TF_LOG_PATH=terraform.log
terraform plan
ls
head -n 20 terraform.log
```

4. Open a **new terminal tab**, `cd` to the same folder, delete `terraform.log`, and run `terraform plan`. No log is created, because the variables were only set in the first tab.
5. Turn logging off in the first tab: `unset TF_LOG TF_LOG_PATH`. Delete `terraform.log` (it must never be committed).

---

## 🎯 Exam focus (summary)

- **`terraform state` sub-commands:** `list`, `show`, `pull`, `push`, `rm`, `mv`, `replace-provider`. You never hand-edit state.
- `state rm` removes from state **without destroying**. `state mv` renames without recreate. `state pull` prints to stdout.
- **Import (1.5+):** `import { to = <address> id = "<real id>" }`, then `terraform plan -generate-config-out=<file>` to generate code, then `terraform apply` to write the state. Import adopts; it does not create.
- **`removed` block (1.7+):** `removed { from = <address> lifecycle { destroy = false } }` is the declarative replacement for `state rm`. Remove or comment out the `resource` block too.
- **`moved` block:** `moved { from = <old> to = <new> }` renames without destroy/recreate; the alternative is `state mv`. Moved blocks are visible to the team; `state mv` is better for scripting.
- **`-replace`:** `terraform apply -replace="<address>"` forces destroy + create ("1 to add, 1 to destroy"). `terraform taint` is the older approach, deprecated since 0.15.2.
- **Refresh:** done automatically by plan/apply. `terraform refresh` is deprecated; use `plan -refresh-only` / `apply -refresh-only`.
- **Debugging:** `TF_LOG` = level (`TRACE` > `DEBUG` > `INFO` > `WARN` > `ERROR`), `TF_LOG_PATH` = file. `set` (Windows) versus `export` (Linux/macOS); both are per-session.
- **Troubleshooting model:** language, state, core, provider. Provider bug = upgrade the provider and report to the provider repo.
- **Bug report** needs: Terraform version, config, TRACE debug output, expected/actual behaviour, reproduction steps.

Common traps:

| Trap | Truth |
|---|---|
| "Deleting the resource block stops Terraform managing it" | It **destroys** the resource (unless a `removed` block with `destroy = false` or `state rm` is used) |
| "`state rm` deletes the resource in AWS" | It only deletes the **state entry** |
| "Renaming a block is harmless" | It plans destroy + create unless you use `moved` / `state mv` |
| "Import generates state and code at plan time" | `plan` only generates **code**; `apply` writes the state |
| "Updating Terraform fixes an AWS provider bug" | You must update the **provider plugin** |
| "`TF_LOG_PATH` sets the level" | `TF_LOG` sets the level; `TF_LOG_PATH` the file |
| "`terraform refresh` is the recommended way to sync state" | Deprecated; use `-refresh-only` |

---

## Key takeaways

1. Never hand-edit state; use the `terraform state` commands, and take a `state pull` backup first.
2. `state rm` = forget without destroying; `state mv` = rename without recreating; `replace-provider` changes the provider recorded in state.
3. **Import** (1.5+) uses an `import` block with `to` and `id`, plus `terraform plan -generate-config-out=file.tf`, then `terraform apply`. It generates both the code and the state for existing resources.
4. The **`removed` block** with `lifecycle { destroy = false }` is the declarative, Git-auditable replacement for `terraform state rm`.
5. The **`moved` block** is the declarative way to rename/refactor resource addresses without recreation; the state address is updated on apply.
6. `terraform apply -replace="<address>"` replaces `terraform taint`.
7. `terraform refresh` is deprecated and risky; use `-refresh-only`.
8. `TF_LOG` picks the log level, `TF_LOG_PATH` picks the file; TRACE is the most verbose; a crash writes `crash.log`.
9. Four error categories: language, state, core, provider. Fix provider bugs by upgrading the provider.

---

## Quick commands / syntax cheat-sheet

```bash
# ---- state ----
terraform state list                         # list all resource addresses in state
terraform state show aws_security_group.prod # attributes of one resource
terraform state pull                         # print current state (from backend) to stdout
terraform state pull > backup.tfstate        # quick backup before surgery
terraform state push FILE                    # upload a state file to the backend (dangerous)
terraform state rm  ADDRESS                  # remove from state, do NOT destroy
terraform state mv  SOURCE DESTINATION       # change address (rename/move) without recreate
terraform state replace-provider FROM TO     # e.g. hashicorp/aws kplabs.in/internal/aws (asks to confirm)

# ---- import ----
terraform plan  -generate-config-out=mysg.tf # generate resource code from import blocks (1.5+)
terraform apply -auto-approve                # actually import into state
terraform version                            # check you are on >= 1.5
terraform import aws_security_group.mysg sg-xxxxxxxx   # legacy CLI form (resource block must exist)

# ---- replace / refresh ----
terraform apply -replace="aws_instance.myec2"     # force re-creation
terraform plan  -replace="aws_instance.myec2"     # preview it
terraform plan  -refresh-only                      # show drift without changing anything
terraform apply -refresh-only                      # approve a state refresh

# ---- debugging ----
export TF_LOG=TRACE                # Linux/macOS    (Windows cmd: set TF_LOG=TRACE)
export TF_LOG_PATH=terraform.log   # logs to a file
unset TF_LOG TF_LOG_PATH           # switch logging off
```

```hcl
# import block
import {
  to = aws_security_group.mysg
  id = "sg-xxxxxxxxxxxxxxxxx"
}

# removed block
removed {
  from = local_file.foo
  lifecycle {
    destroy = false          # forget, do not destroy
  }
}

# moved block
moved {
  from = aws_security_group.database_firewall
  to   = aws_security_group.payment_database_firewall
}
```

---

## ❓ Quiz

1. You want Terraform to stop managing an EC2 instance that another team now owns, **without** terminating it. Which two approaches work?
   A. Delete the resource block and apply
   B. `terraform state rm aws_instance.web`, then delete the block
   C. A `removed` block with `lifecycle { destroy = false }`
   D. `terraform apply -replace=aws_instance.web`

2. What does `terraform state rm aws_security_group.prod` do to the real security group in AWS?

3. You rename `aws_iam_user.dev` to `aws_iam_user.prod` in your code. What does the next `terraform plan` show, and how do you avoid it? Give both the CLI and the declarative solution.

4. Which command prints the whole remote state to the terminal?
   A. `terraform state list`  B. `terraform state show`  C. `terraform state pull`  D. `terraform output`

5. Which block arguments does an `import` block require, and which flag generates the resource code? In which Terraform version did this arrive?

6. After running `terraform plan -generate-config-out=mysg.tf` you check `terraform state list`. Is the imported resource listed? Why or why not?

7. Your `import` block uses `id = "sg-0abc..."` but Terraform errors with "Cannot import non-existent remote object". Name two likely causes.

8. A teammate says "just run `terraform taint aws_instance.web` and then apply". What is the recommended modern command?

9. What is the safe replacement for `terraform refresh`, and why was the old command considered dangerous?

10. Match the log level to its verbosity, from most to least: `INFO`, `TRACE`, `ERROR`, `DEBUG`, `WARN`.

11. You set `export TF_LOG=TRACE` in one terminal tab and run `terraform plan` in a **second** tab. Do you get trace output? Why?

12. A bug appears to be in the AWS provider resource `aws_s3_bucket`. You upgrade Terraform core to the newest version. Does it help, and where do you report the bug?

13. Which of these belongs to which troubleshooting category: (a) "Error acquiring the state lock", (b) "Unsupported argument", (c) provider returns a wrong API error, (d) Terraform panics and writes `crash.log`?

14. A `moved` block was added and you run `terraform plan`. The plan shows "has moved to" and `Plan: 0 to add, 0 to change, 0 to destroy`. Has the state changed yet?

15. You ran `terraform state replace-provider hashicorp/aws example.com/internal/aws` and now `terraform plan` says "Failed to load plugin schemas". What happened and how do you recover?

### Answers

1. **B and C.** A destroys the instance (config removed while state still has it). D replaces (destroys and recreates) it. `state rm` and `removed` with `destroy = false` both forget it without touching AWS. (Remember to remove the resource block in both cases.)
2. Nothing. Only the **state entry** is removed; the security group keeps existing in AWS. If its config block is still present the next plan will try to create it again.
3. Terraform plans to **destroy** `aws_iam_user.dev` and **create** `aws_iam_user.prod` (the address changed). Avoid it with `terraform state mv aws_iam_user.dev aws_iam_user.prod` (CLI, immediate, good for scripts) or a `moved { from = aws_iam_user.dev to = aws_iam_user.prod }` block (declarative, visible in Git, applied on the next apply). Rename the block in the code either way.
4. **C.** `list` shows addresses only, `show` shows one resource's attributes, `output` shows output values.
5. `to` (resource address) and `id` (real-world ID). The flag is `-generate-config-out=<file>` on `terraform plan`. It arrived in **Terraform 1.5**.
6. **No.** `plan` only generates the configuration; the state entry is written when you `terraform apply`.
7. The provider `region` does not match the region where the resource lives; or the ID is wrong or not the format the resource's import docs expect (for example a name vs an ID). Also possible: wrong credentials/account.
8. `terraform apply -replace="aws_instance.web"`. `taint` was superseded from 0.15.2: `-replace` shows the replacement in the plan before you approve and needs only one step.
9. `terraform plan -refresh-only` (preview) / `terraform apply -refresh-only` (preview and approve). The old `terraform refresh` rewrote state immediately with no confirmation; in the lecture demo, after a region change it emptied the state file.
10. `TRACE` (most), `DEBUG`, `INFO`, `WARN`, `ERROR` (least).
11. **No.** `export`/`set` only affect the **current terminal session**; a new tab has no `TF_LOG`.
12. **No.** Core and providers are separate products with separate releases; you must upgrade the **provider plugin** (check the version constraints, see [Chapter 02](02-providers.md)) and report the bug in the **provider's own repo** (`hashicorp/terraform-provider-aws`), not `hashicorp/terraform`.
13. (a) **State** (lock; `terraform force-unlock` if safe), (b) **Language**, (c) **Provider**, (d) **Core**.
14. **No.** The plan only shows the pending address change. The state is updated when you run `terraform apply`. (Using `state mv` instead would have changed it immediately.)
15. State now says the resources belong to a provider that does not exist, so Terraform cannot load its schema. Recover by reversing it: `terraform state replace-provider example.com/internal/aws hashicorp/aws` and confirm with `yes`. This is why you take a `terraform state pull` backup first.

---

## Glossary

| Term | Definition |
|---|---|
| Resource address | Identifier like `aws_security_group.prod` used by `state` commands, `import` (`to`), `removed` (`from`), `moved` (`from`/`to`) and `-replace` |
| `terraform state` | Command group for inspecting/modifying state safely (`list`, `show`, `pull`, `push`, `rm`, `mv`, `replace-provider`) |
| Import block | `import { to = ..., id = ... }`: adopts an existing resource into Terraform (1.5+) |
| `-generate-config-out` | Flag on `terraform plan` that writes generated resource configuration for import blocks to a new file |
| Removed block | `removed { from = ...; lifecycle { destroy = false } }`: drop a resource from state without destroying it (1.7+) |
| Moved block | `moved { from = ...; to = ... }`: change a resource's address in state without destroying it |
| Forget (action) | What Terraform plans for a `removed` block with `destroy = false`: remove from state only |
| `-replace` | Option of `plan`/`apply` that forces the named resource to be destroyed and recreated |
| Tainted | State marker meaning "replace on next apply"; set by `terraform taint` or by a failed creation provisioner |
| Refresh | Updating the state file to match real infrastructure; automatic in plan/apply |
| `-refresh-only` | Plan/apply mode that only reconciles state with reality (the safe successor to `terraform refresh`) |
| `TF_LOG` | Environment variable that sets log verbosity (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`) |
| `TF_LOG_PATH` | Environment variable naming a file to receive the logs |
| `crash.log` | File Terraform writes in the working directory when it panics; never commit it |
| Troubleshooting model | Language, state, core, provider: the four places an error can come from |
| Lineage / serial | Identity and version counter of a state, checked by `state push` |
