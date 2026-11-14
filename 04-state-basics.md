# 04 — State Basics

> **Exam domain(s):** Understand Terraform's purpose / Understand Terraform basics / Implement and maintain state (state file, desired vs current state, refresh, drift)   **Source:** lesson 3, lectures 33–36 and lesson 7, lecture 137 (intro, `list`, `show` only)   **Time:** ~2.5 h

## What you will learn

- What the Terraform **state file** is, why it exists, and what happens when you lose it.
- The difference between **desired state** and **current state**, and how Terraform reconciles them with create / update / delete / no-op.
- Why attributes you never wrote (provider defaults) are **not** part of the desired state, and why manual changes to them are never reverted.
- What **refresh** does, why `plan` and `apply` do it automatically, why a manual `terraform refresh` can be dangerous, and what replaced it (`-refresh-only`).
- How to preview **drift** (a real-world change made outside Terraform) with `terraform plan`.
- What is inside a state file, why it can contain **plain-text secrets**, and what a **resource address** is.
- How to inspect state safely with `terraform state list` and `terraform state show`, instead of opening the JSON.

Where the rest lives:

| Topic | Chapter |
|---|---|
| `plan`, `apply`, `-refresh-only`, `-refresh=false` flags in detail | [03 — Core workflow](03-core-workflow.md) |
| Remote backends, state locking, workspaces, reconciling drift in a team | [10 — Backends, locking, drift](10-backends-locking-drift.md) |
| `terraform state mv / rm / pull / push / replace-provider`, `import`, `removed`, `moved`, `-replace` | [11 — Import, state CLI, logging](11-import-state-cli-logging.md) |
| `sensitive` values and keeping secrets out of state | [08 — Lifecycle, conditions, sensitive](08-lifecycle-conditions-sensitive.md) |

---

## 🧠 Pre-concept: Terraform needs a memory

Imagine you write this and run `terraform apply`:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-0fa3fe0fa7920f68e"
  instance_type = "t2.micro"
}
```

AWS creates a server and gives it an ID such as `i-0b40a1c2d3e4f5a6b`. A month later you change `t2.micro` to `t2.medium` and run `terraform apply` again. In production, your AWS account may hold **hundreds** of EC2 instances. Terraform must answer two questions:

1. Has `aws_instance.myec2` already been created, or must I create it?
2. If it exists, **which one** of the hundreds of servers is it?

Terraform cannot guess this from AWS alone (nothing tells it which of the servers is "yours"). So it keeps a **mapping** from every resource in your code to the real object's ID. That mapping, plus the attributes of each object, is the **state**.

**Analogy: the database behind a web app.** A web app stores user sign-ups in a database. If the database is lost, every user has to register again. So you protect it, back it up and keep it highly available. The Terraform state file is the same kind of thing: *a database in which Terraform stores information about the infrastructure it manages*. If it is lost, Terraform forgets what it built.

```text
 Your code (.tf)                 State (terraform.tfstate)                 Real world (AWS)
 -----------------               -----------------------------             -----------------
 aws_instance.myec2   ------->   aws_instance.myec2  ->  i-0b40...  ----->  EC2 instance i-0b40...
 (instance_type =                (id, ami, type, ...)                       (one of hundreds)
  t2.medium)
```

---

## 1. What is the state file?

| Fact | Detail |
|---|---|
| Purpose | A database where Terraform records the infrastructure it manages and tracks the resources created by your configuration (IDs, security groups, instance type, and so on). |
| Default name and place | `terraform.tfstate` in the **working directory** (the folder where you run Terraform). This is the **local backend**. |
| Format | **JSON**. |
| Edit manually? | **Never.** One mistake can corrupt it and Terraform stops working. If you really must, back it up first. Safe changes are made through `terraform state` subcommands ([chapter 11](11-import-state-cli-logging.md)). |
| If it is lost | Terraform no longer knows it created anything, so it plans to **create everything again**. |
| After `terraform destroy` | The file is **not deleted**. It stays in the folder but holds no resources (an "empty" state). |
| Backup | Terraform automatically writes `terraform.tfstate.backup`, a fail-safe copy of the **previous** state. It is only a short-term safety net: in production keep real, separate backups. |

> Terminology note: you will sometimes see the file written as "terraform state" or "terraform.tf state" in videos. The real file name is `terraform.tfstate`.

🎯 **Exam focus:** state maps your configuration to real-world resources (it stores IDs and attributes), and that is how Terraform knows what to change. Default local file: `terraform.tfstate`, JSON. Terraform does **not** auto-delete it on destroy.

### What state is used for

The lesson focuses on the first purpose, but state does several jobs:

1. **Mapping** — resource address in code to real object ID. This is the main job.
2. **Remembering attributes** — values such as IDs, ARNs and IP addresses that you reference elsewhere (for example `aws_instance.myec2.id`).
3. **Tracking dependencies** — so Terraform can destroy things in a safe order, even if you already deleted the code.
4. **Performance** — Terraform can cache attribute values instead of asking the cloud about everything every time (although a normal `plan` still refreshes, see [section 7](#7-refresh-making-the-state-match-reality)).
5. **Collaboration** — when stored in a shared remote backend, the whole team uses one source of truth (see [chapter 10](10-backends-locking-drift.md)).

> **Up to date (TF 1.12):** items 2–5 are general Terraform knowledge rather than something spelled out in the lesson notes. The mapping job (item 1) is what the lesson stresses and what the exam asks about first.

---

## 2. Demo: the state file in action (lecture 33)

This walkthrough reconstructs the instructor's demo. It creates a paid EC2 instance for a few minutes. A free alternative is in [Lab 1](#-lab-1--read-state-safely-free).

```hcl
provider "aws" {
  region = "us-east-1"          # credentials come from `aws configure`, see chapter 02
}

resource "aws_instance" "myec2" {
  ami           = "ami-0fa3fe0fa7920f68e"
  instance_type = "t2.micro"
}
```

1. **Start clean.** No EC2 instances running in the console, and no `terraform.tfstate` in the folder, so you see it created from scratch.
2. **Apply.**
   ```bash
   terraform init
   terraform apply        # type: yes
   ```
   A new file `terraform.tfstate` appears in the folder.
3. **Find the ID in the state.** In the EC2 console the instance ID ends in, say, `...b40`. Open `terraform.tfstate` and search (Ctrl+F) for `b40`. The ID is recorded in the state.
4. **Change the code** to `instance_type = "t2.medium"` and run `terraform plan`. Terraform finds the instance it created earlier (by that ID) and plans an **in-place resize of only that instance**.
5. **Lose the state.** Rename `terraform.tfstate` to something else (for example `terraform.tfstate.hidden`) and run `terraform plan` again. Terraform has no idea it ever created an instance, so it plans to **create a brand-new EC2 instance**. This is exactly how duplicate (orphaned) infrastructure happens: the old server still runs and costs money, but Terraform no longer knows it.
6. **Restore the name** `terraform.tfstate` and run `terraform plan`. Terraform finds the existing instance again and only wants to change its type.
7. **Destroy.**
   ```bash
   terraform destroy      # type: yes   (about 1 min 34 s in the demo)
   ```
   The instance goes to the *terminated* state in the console.
8. **Look at the folder.** `terraform.tfstate` still exists but contains no resources, and there may be a `terraform.tfstate.backup`.

```text
Step 5 (state lost):
  config:  aws_instance.myec2              <- wants 1 instance
  state:   (empty)                         <- "I created nothing"
  AWS:     i-0b40...  (still running!)
  plan:    Plan: 1 to add, 0 to change, 0 to destroy.   <- duplicate server
```

⚠️ **Gotcha:** losing, renaming or deleting the state file makes Terraform create duplicates, because it believes nothing exists. The real resources are still in AWS and you are billed for them.

⚠️ **Gotcha:** a "destroyed" environment still leaves `terraform.tfstate` (and often `.backup`) in the folder. That is normal.

---

## 3. What is inside a state file

You should not edit it, but you should be able to read it. This is a simplified example for one resource:

```json
{
  "version": 4,
  "terraform_version": "1.12.0",
  "serial": 3,
  "lineage": "7c0e1a52-0f3c-9b9d-4c4e-3a7d6f1b2c10",
  "outputs": {},
  "resources": [
    {
      "mode": "managed",
      "type": "aws_instance",
      "name": "myec2",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 1,
          "attributes": {
            "id": "i-0b40a1c2d3e4f5a6b",
            "ami": "ami-0fa3fe0fa7920f68e",
            "instance_type": "t2.micro",
            "vpc_security_group_ids": ["sg-0123456789abcdef0"]
          }
        }
      ]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `version` | Version of the state file **format** (currently 4), not your Terraform version. |
| `terraform_version` | The Terraform version that last wrote the file. |
| `serial` | A counter that increases every time the state changes. Used to detect which copy is newer. |
| `lineage` | A unique ID created when the state is first made. It identifies "this state's history", so you cannot accidentally overwrite one project's state with another's. |
| `outputs` | Root module output values (read by the remote state data source, see [chapter 10](10-backends-locking-drift.md)). |
| `resources` | One entry per resource. `mode` is `managed` for `resource` blocks and `data` for data sources. |
| `provider` | Which provider handles the resource (full registry address). |
| `instances[].attributes` | **Every attribute** of the real object, including those you never wrote (defaults, IDs, ARNs). |

> **Up to date (TF 1.12):** the field list above comes from general Terraform knowledge, not the lesson notes. The lesson only shows that the state is JSON and contains the instance ID, instance type and so on. You do not need to memorise `serial` and `lineage` for the exam, but know that state is JSON and that it stores attribute values.

### Resource addresses

Every resource has an **address**: `<resource_type>.<local_name>`.

| Configuration | Address |
|---|---|
| `resource "aws_instance" "myec2" { ... }` | `aws_instance.myec2` |
| `resource "aws_security_group" "prod" { ... }` | `aws_security_group.prod` |
| `data "aws_ami" "latest" { ... }` | `data.aws_ami.latest` |
| Resource inside `module "web"` | `module.web.aws_instance.myec2` |
| Resource created with `count` | `aws_instance.myec2[0]` |
| Resource created with `for_each` | `aws_instance.myec2["dev"]` |

The address is the key that state commands, `import`, `moved` and `removed` blocks use. If you rename the block, the address changes, and Terraform treats it as a different resource (destroy old, create new) unless you tell it otherwise ([chapter 11](11-import-state-cli-logging.md)).

---

## 4. ⚠️ State can contain secrets

Terraform records **all attributes** of every resource, including passwords for databases and generated keys, **in plain text**. Chapter 10 has the full demo (an RDS password still appears in the state even when read from a file); the short version is:

- `sensitive = true` hides a value in **CLI output** only. It does **not** encrypt or remove it from the state.
- Do not commit `terraform.tfstate` to Git.
- Store state in a secured, encrypted, access-controlled **remote backend** ([chapter 10](10-backends-locking-drift.md)).

🎯 **Exam focus:** "Where can sensitive values be found in plain text?" — in the state file. "Does `sensitive = true` remove it from state?" — No.

---

## 5. Desired state vs current state (lectures 34 and 35)

This is a very important, exam-relevant topic.

| Term | Meaning | Where it lives |
|---|---|---|
| **Desired state** | What you *want* the infrastructure to look like. | Your Terraform configuration (`.tf` files). |
| **Current state** | What *actually exists* in the real world right now. | The provider's real infrastructure. Terraform learns it through API calls, and records it in the state file. |

Example desired state: one EC2 instance, `ami-123`, `t2.micro`.

Desired and current state can diverge. Example: **Bob** logs in to the AWS console and changes the instance type from `t2.micro` to `t2.medium` by hand, outside Terraform. Now desired = `t2.micro`, current = `t2.medium`. In larger organisations this is quite common.

### How Terraform reconciles them

```text
terraform plan / apply
        |
        v
1. Query the provider API  ->  read the CURRENT state
        |
        v
2. Compare CURRENT vs DESIRED (your .tf files)
        |
   different? --- no ---> "No changes"
        |
       yes
        v
3. Work out the actions needed to make CURRENT match DESIRED
        |
        v
   Create / Update / Delete
```

**Terraform always prioritises the desired state.** It changes the real infrastructure to match your code, even if that means reverting someone's manual change.

### The four situations (memorise)

| Desired state (code) | Current state (real world) | Terraform action |
|---|---|---|
| Exists | Does **not** exist | **Create** |
| Exists | Exists, but a property differs (e.g. instance type) | **Update** (in place; or replace if the property cannot be changed in place) |
| Does **not** exist (removed from code) | Exists | **Delete** (destroy) |
| Exists | Exists and matches | **Nothing** ("No changes") |

> **Up to date (TF 1.12):** "or replace if the property cannot be changed in place" is extra context. Some arguments (for example an EC2 `ami`) force a **destroy and re-create**; `plan` shows this as `-/+` and `# forces replacement`.

### Mental model

```text
   YOUR CODE (.tf)  ----> DESIRED state  --+
                                           |  compare  ->  actions
   REAL WORLD (AWS) ----> CURRENT state  --+
         ^                                        |
         |______________ apply ___________________|   (make real world == desired)
```

### Demo: manual change gets reverted (lecture 34)

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-0fa3fe0fa7920f68e"
  instance_type = "t2.micro"
}
```

1. `terraform apply`, answer `yes`. A new `t2.micro` instance is created.
2. `terraform plan`. Desired equals current, so Terraform says **No changes**. It first checked the real infrastructure and found nothing different.
3. **Simulate Bob's manual change** in the console: *stop* the instance (an instance type can only be changed while stopped), then Actions -> Instance settings -> Change instance type -> `t2.small`, then *start* the instance. (The lecture talks about `t2.medium` conceptually; the demo used the cheaper `t2.small`.)
4. `terraform plan`. Terraform reads the real instance, sees `t2.small` against the desired `t2.micro`, and proposes an **update in place** to put it back to `t2.micro`:
   ```text
   # aws_instance.myec2 will be updated in-place
   ~ resource "aws_instance" "myec2" {
         id            = "i-0b40a1c2d3e4f5a6b"
       ~ instance_type = "t2.small" -> "t2.micro"
         # (other attributes unchanged)
     }

   Plan: 0 to add, 1 to change, 0 to destroy.
   ```
5. `terraform apply`, `yes`. Terraform stops the instance, changes the type back to `t2.micro`, and starts it again (about one minute). The console shows it running as `t2.micro`.
6. **The delete scenario.** Empty the `.tf` file (cut all its contents), so the desired state is now empty while the instance still exists. `terraform plan` shows it will **destroy** the instance. You do **not** need to run `terraform destroy`; a plain `terraform apply` also destroys it, because the empty desired state must be matched. Afterwards the instance is terminated.

The lesson's command sequence in one place:

```bash
terraform apply
# Manually modify instance type from t2.micro to t2.small in the console.
# Verify that terraform shows changes between desired and current state:
terraform plan
# Remove the contents of the ec2.tf file so that desired state is empty.
terraform apply
```

⚠️ **Gotcha:** manual console changes are **not permanent** if the attribute is in your Terraform config. The next `apply` undoes them.

⚠️ **Gotcha:** changing the instance type on EC2 needs the instance to be stopped. Terraform does it automatically (stop -> modify -> start), which causes a short outage.

⚠️ **Gotcha:** an empty configuration means "I want nothing". `apply` will delete everything tracked in state. Recall from [chapter 03](03-core-workflow.md): removing code is a way to destroy resources.

🎯 **Exam focus:**

- Desired state = configuration. Current state = real-world infrastructure.
- Terraform reconciles by changing the current state to match the desired state.
- `terraform apply` can destroy things when resources have been removed from the configuration.
- `terraform plan` reads the current infrastructure before comparing.

### More clarity: provider defaults are NOT desired state (lecture 35)

When you create a VM with only the mandatory settings (here the AMI and instance type), the cloud (AWS, but also Azure, GCP and others) fills in many other settings with **default values**:

| Setting | Default seen in the demo |
|---|---|
| Root storage | An **8 GB SSD** volume |
| Firewall | The **default security group** (with its inbound and outbound rules) |
| Others (subnet and so on) | Assigned by AWS; shown in the plan as `(known after apply)` |

In `terraform plan` you see many attributes marked **`(known after apply)`**: the firewall, subnet ID, security group IDs and so on. Terraform's create request to the AWS API does not contain them, so AWS picks defaults, and Terraform only learns the values after the resource exists.

> **The key point:** only what you **write in the configuration** is the desired state. Values AWS added by default (the 8 GB disk, the default security group) are not desired state. So if somebody changes them manually, Terraform will **not** revert them.

Demo:

1. `terraform plan` shows many `known after apply` attributes. Run `terraform apply`, `yes`.
2. In the EC2 console open the instance. The *Storage* tab shows an 8 GB SSD. *Security* shows the default security group and its rules, although you never specified them. If you want a different disk size or firewall, set them explicitly in the config and Terraform uses your values with priority.
3. Manually change the instance's security group from `default` to another existing group (for example `launch-wizard-10`) and save.
4. Run `terraform plan`. Terraform checks the real infrastructure and reports **No changes**. It did not try to revert the security group, because the security group was never in the desired state.

**Production best practice:** explicitly define in your configuration **all** attributes you care about, leaving as few defaults as possible. Then, if someone changes any of them manually, the next `plan` detects current != desired and reverts it.

| Attribute defined in code? | Manual change made? | Next `plan` |
|---|---|---|
| Yes (it is desired state) | Yes | Detects drift and proposes to revert it |
| No (default from AWS) | Yes | **No changes** — Terraform does not care |

⚠️ **Gotcha:** students often assume "8 GB disk" or "default firewall" is part of the desired state. It is not.

⚠️ **Gotcha:** `(known after apply)` does not mean "missing". It means the provider will decide or compute the value.

🎯 **Exam focus:** provider-assigned defaults are not desired state; manual changes to them are not reverted. Only attributes defined in configuration take part in the desired-vs-current comparison. "Known after apply" = value determined by the provider at creation time. Be explicit about security-relevant settings (security groups, storage, encryption) so drift is detected.

---

## 6. Drift: a quick preview

**Drift** is the name for "current state no longer matches what Terraform last recorded / what the code says", usually because someone changed a resource by hand (Bob in the example above). Everything in section 5 is drift in action:

- Drift on an attribute **you defined** -> `plan` shows an update that reverts it.
- Drift on a value **you did not define** (a provider default) -> `plan` shows "No changes".
- Resource deleted by hand -> `plan` shows it will be created again.

Terraform cannot stop people from changing real infrastructure. It can only **detect** the drift during the refresh step ([next section](#7-refresh-making-the-state-match-reality)) and **revert** it when you apply.

> **Up to date (TF 1.12):** when a normal `plan` finds that real objects changed outside Terraform, the output begins with a section like this, before the proposed actions:
> ```text
> Note: Objects have changed outside of Terraform
>
> Terraform detected the following changes made outside of Terraform since the
> last "terraform apply" which may have affected this plan:
>
>   # aws_instance.myec2 has changed
>   ~ resource "aws_instance" "myec2" {
>       ~ instance_type = "t2.micro" -> "t2.small"
>         # (other attributes unchanged)
>     }
> ```
> This is a drift preview. The wording is from general Terraform knowledge, not the lesson notes. How to *respond* to drift (revert, accept, ignore, import) is covered in [chapter 10](10-backends-locking-drift.md#9-drift-and-how-to-reconcile-it).

---

## 7. Refresh: making the state match reality

Real infrastructure can be modified outside Terraform, and Terraform cannot stop that. To revert such drift, Terraform first has to **know** about it.

> **Refresh** = Terraform scans the real-world infrastructure and **updates the state file** to reflect reality. The updated state is then compared with your desired configuration.

Refresh reads reality; it does **not** change infrastructure.

### You rarely run it manually

`terraform plan` and `terraform apply` **automatically perform the refresh step first**. In the output you see lines like:

```text
aws_instance.myec2: Refreshing state... [id=i-0b40a1c2d3e4f5a6b]

No changes. Your infrastructure matches the configuration.
```

### Why a manual `terraform refresh` can be dangerous (demo, lecture 36)

```hcl
provider "aws" {
  region = "us-east-1"
  # credentials come from `aws configure` or env vars. NEVER hardcode keys.
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

```text
 Provider region changed us-east-1 -> us-west-2
            |
   which command?
     |                                   |
 terraform plan                     terraform refresh
     |                                   |
 Looks in us-west-2, can't see      Looks in us-west-2, resource "gone"
 the old instance                   State is rewritten EMPTY
 Plan: 1 to add                          |
 State file NOT modified            Restore from terraform.tfstate.backup
     |
 Change region back -> no changes
```

1. `terraform apply -auto-approve` creates the instance in `us-east-1`. `terraform plan` refreshes and says **no changes**.
2. Change the provider region to `us-west-2` and run `terraform plan`. It shows **1 to add**: Terraform cannot find the old instance in the new region. **The state file remains populated**, because `plan` does not modify state. Change the region back to `us-east-1` and `plan` shows no changes.
3. Change the region to `us-west-2` again and this time run **`terraform refresh`**. It cannot find the infrastructure in that region and **wipes the resources from the state file**. `terraform.tfstate` is now empty.
4. **Recovery:** copy the contents of `terraform.tfstate.backup` into `terraform.tfstate`, set the region back to `us-east-1`, run `terraform plan` -> **no changes**. The backup saved the day.

The lesson: running refresh explicitly can erase entries from your state. This is why production remote backends such as S3 enable **versioning**, so you can roll back a damaged state file ([chapter 10](10-backends-locking-drift.md)).

### Deprecation and the replacement

- The standalone `terraform refresh` command is **deprecated** in newer Terraform versions.
- Use the **`-refresh-only`** option with `plan` / `apply` instead.
  - `terraform plan -refresh-only` shows what refresh would change in the state, without changing anything.
  - `terraform apply -refresh-only` shows the same and lets you **review and approve** the state update.
- `-refresh=false` skips the refresh step during `plan`/`apply` (faster on huge projects, but you may miss drift).

> **Up to date (TF 1.12):** `terraform refresh` still exists but is documented as an alias for `terraform apply -refresh-only -auto-approve`: the same behaviour as in the demo, with no confirmation step. That is exactly why it was deprecated. With `-refresh-only` you would have seen "Objects have changed outside of Terraform: aws_instance.myec2 has been deleted" and been asked to approve before the state was changed. All flags are covered in [chapter 03](03-core-workflow.md).

⚠️ **Gotcha:** changing the provider `region` makes Terraform "lose" resources (they live in the old region), so the plan wants to recreate them.

⚠️ **Gotcha:** `terraform plan` does not alter the state file. The old `terraform refresh` did.

⚠️ **Gotcha:** always keep a backup of state. `terraform.tfstate.backup` only holds the previous version.

🎯 **Exam focus:**

- Refresh reconciles the **state file** with real infrastructure (it reads reality; it does not change infrastructure).
- `plan` and `apply` refresh automatically.
- `terraform refresh` is **deprecated**; use `-refresh-only` with plan/apply.
- Manually running refresh can remove entries from state (as the region demo shows).

Remember to destroy every resource you create in labs.

---

## 8. Inspecting state safely: `terraform state list` and `terraform state show`

Opening the JSON "just to look" is how people accidentally modify it. HashiCorp provides the **`terraform state`** command group to inspect and change state without touching the file. This chapter covers the two read-only inspection commands. The others (`pull`, `push`, `rm`, `mv`, `replace-provider`) are in [chapter 11](11-import-state-cli-logging.md).

The lesson's demo configuration uses an S3 backend, an IAM user and a security group. The commands work the same with a local backend:

```hcl
terraform {
  backend "s3" {
    bucket = "kplabs-terraform-backends"   # yours must be globally unique
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

After `terraform init` and `terraform apply -auto-approve`, both resources exist.

### `terraform state list`

Lists every resource **address** in the state. Handy on projects with hundreds of resources, instead of reading the configuration.

```bash
terraform state list
```

```text
aws_iam_user.dev
aws_security_group.prod
```

> **Up to date (TF 1.12):** you can pass an address to filter, for example `terraform state list aws_iam_user.dev`, or a module path such as `terraform state list module.web`. This is extra context, not in the lesson.

### `terraform state show <address>`

Shows all recorded attributes of a **single** resource: ARN, description, ID, owner ID, VPC ID and so on. It is faster and safer than opening the state file or clicking through the EC2 console to find a security group ID.

```bash
terraform state show aws_security_group.prod
```

```text
# aws_security_group.prod:
resource "aws_security_group" "prod" {
    arn                    = "arn:aws:ec2:us-east-1:123456789012:security-group/sg-0abc123def4567890"
    description            = "Managed by Terraform"
    egress                 = []
    id                     = "sg-0abc123def4567890"
    ingress                = []
    name                   = "terraform-firewalls"
    owner_id               = "123456789012"
    revoke_rules_on_delete = false
    vpc_id                 = "vpc-0a1b2c3d4e5f67890"
}
```

(The exact attributes depend on the resource and provider version.)

| Command | Argument | Changes state? | Touches real infrastructure? |
|---|---|---|---|
| `terraform state list` | none (optional filter) | No | No |
| `terraform state show ADDRESS` | exactly one resource address | No | No |

🎯 **Exam focus:** `list` takes no address and prints all addresses; `show` takes **one** address (for example `aws_security_group.prod`) and prints its attributes. Use these instead of editing the state file.

### Related read-only commands

| Command | What it does |
|---|---|
| `terraform show` | Human-readable view of the whole current state (or a saved plan). See [chapter 03](03-core-workflow.md). |
| `terraform output` | Prints root-module output values stored in the state. See [chapter 06](06-variables-outputs-locals.md). |

---

## 🧪 Lab 1 — Read state safely (free)

Uses the `local` provider, so no AWS account and no cost.

```bash
mkdir -p ~/tf-labs/state-basics && cd ~/tf-labs/state-basics
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

resource "local_file" "greeting" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, state!"
}

resource "local_file" "second" {
  filename = "${path.module}/second.txt"
  content  = "Second file"
}

output "greeting_path" {
  value = local_file.greeting.filename
}
```

1. **Before applying, check there is no state:**
   ```bash
   terraform init
   ls
   ```
   Expect `main.tf`, `.terraform`, `.terraform.lock.hcl` and **no** `terraform.tfstate`.
2. **Apply:**
   ```bash
   terraform apply -auto-approve
   ls
   ```
   Now `terraform.tfstate`, `hello.txt` and `second.txt` exist.
3. **List and show:**
   ```bash
   terraform state list
   ```
   ```text
   local_file.greeting
   local_file.second
   ```
   ```bash
   terraform state show local_file.greeting
   ```
   You see `content`, `filename`, `id` and several hash attributes. Compare with `terraform.tfstate` (open it read-only): the same values, plus `serial` and `lineage`.
4. **Watch `serial` increase.** Note the `serial` in the state file. Change `content` to `"Hello again"`, run `terraform apply -auto-approve`, and look at `serial` again: it has gone up. Also notice that `terraform.tfstate.backup` now exists and holds the previous version.
5. **Simulate losing state (safe version).**
   ```bash
   mv terraform.tfstate terraform.tfstate.hidden
   terraform plan
   ```
   Terraform reports `Plan: 2 to add` because it has forgotten both files. **Do not apply.** Restore it:
   ```bash
   mv terraform.tfstate.hidden terraform.tfstate
   terraform plan
   ```
   Back to "No changes."
6. **Destroy and inspect the empty state:**
   ```bash
   terraform destroy -auto-approve
   ls
   terraform state list
   ```
   The state file still exists, `terraform state list` prints nothing, and the `.txt` files are gone.
7. **Clean up:** `cd .. && rm -rf state-basics`.

---

## 🧪 Lab 2 — Drift and refresh with EC2 (small cost)

**Cost:** one `t2.micro` (free tier eligible in many accounts) for about 15 minutes, plus a brief `t2.small`. Destroy it at the end. Replace the AMI with one that exists in your region (check the console launch wizard).

`ec2.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0fa3fe0fa7920f68e"
  instance_type = "t2.micro"
}
```

1. `terraform init && terraform apply`, answer `yes`. Run `terraform plan` -> **No changes**.
2. **Create drift (reverts):** in the console stop the instance, change its type to `t2.small`, start it. Run `terraform plan`. Expect the "Objects have changed outside of Terraform" note and an in-place update `t2.small -> t2.micro`. Do **not** apply yet.
3. **Preview refresh safely:**
   ```bash
   terraform plan -refresh-only
   ```
   This shows the state would be updated to `t2.small`, and says no infrastructure changes are proposed.
4. **Now apply to revert:** `terraform apply`, `yes`. Console shows `t2.micro` again.
5. **Create drift (ignored):** change the instance's **security group** in the console from `default` to another existing group. Run `terraform plan`. Expect **No changes**, because the security group was never in your code. (Optional: add `vpc_security_group_ids = [...]` to the config and see `plan` now propose to revert it.)
6. **Delete scenario:** empty `ec2.tf` and run `terraform plan`. It proposes to destroy the instance; `terraform apply` destroys it. (Restore the file first if you want to keep going.)
7. **Clean up:** confirm no instances are left in the console, and remove the folder.

> If you want to repeat the region/`terraform refresh` demo: use a **copy of the folder**, keep the `.tfstate.backup`, and prefer `terraform apply -refresh-only` to see the approval prompt that the old `terraform refresh` skipped.

---

## 🎯 Exam focus (summary)

- State = mapping from config to real objects (IDs, attributes). Default `terraform.tfstate`, JSON, in the working directory.
- If state is lost, Terraform plans to create everything again (duplicates).
- Never edit state by hand; use `terraform state` subcommands.
- `terraform.tfstate.backup` is created automatically; `destroy` does not delete the state file.
- Desired state = configuration; current state = real infrastructure; Terraform makes current match desired.
- Four cases: create, update, delete, no-op.
- Only attributes in your configuration are compared. Provider defaults (8 GB disk, default security group) are not desired state, so manual changes to them are not reverted.
- `(known after apply)` = provider will supply the value.
- `plan` and `apply` refresh automatically. `terraform refresh` is deprecated; use `-refresh-only`.
- A manual refresh can drop resources from state (wrong region or credentials). `plan` never modifies state.
- State can hold secrets in plain text; `sensitive` does not change that.
- `terraform state list` (no argument) and `terraform state show ADDRESS` are read-only.

## Key takeaways

1. The state file is Terraform's database; it ties each resource address to a real object ID.
2. Without state, Terraform cannot know what it created and will try to create it again.
3. Desired state comes from your code; current state comes from the real world; Terraform changes the real world to match your code.
4. Only what you write is desired. Defaults chosen by the cloud are ignored by drift detection.
5. Refresh updates state from reality and happens automatically during `plan` and `apply`. Use `-refresh-only`, not `terraform refresh`.
6. State may include secrets in plain text. Protect it and keep it out of Git.
7. Inspect with `terraform state list` and `terraform state show`; never open and edit the JSON.

## Quick commands / syntax cheat-sheet

```bash
terraform state list                           # all resource addresses in state
terraform state show aws_security_group.prod   # attributes of one resource
terraform show                                 # whole state, human readable
terraform plan -refresh-only                   # preview refresh (state-only changes)
terraform apply -refresh-only                  # review and approve state update
terraform plan -refresh=false                  # skip the refresh step
ls terraform.tfstate terraform.tfstate.backup  # default local files
```

| Situation | Outcome |
|---|---|
| In code, not in real world | create |
| In code, real value differs | update (or replace) |
| Not in code, in real world and state | delete |
| Matches | no changes |
| State file missing | create everything again |

---

## ❓ Quiz

1. What is the default name and format of the Terraform state file, and where does it live?
2. You rename `terraform.tfstate` and run `terraform plan` on a config that already created one EC2 instance. What does the plan say, and what is the risk?
3. After `terraform destroy` finishes, which is true? (a) `terraform.tfstate` is deleted (b) `terraform.tfstate` remains with no resources (c) the whole folder is deleted
4. Define "desired state" and "current state". Where is each found?
5. Your code says `instance_type = "t2.micro"`. Bob changes the instance to `t2.small` in the console. What does `terraform plan` show?
6. The code does not mention a security group. Bob changes the instance's security group in the console. What does `terraform plan` show, and why?
7. Your code is completely empty but an instance created earlier still exists in the state. You run `terraform apply`. What happens?
8. What does `(known after apply)` mean in a plan?
9. Which statement about refresh is correct? (a) `terraform plan` never refreshes (b) `terraform apply` refreshes automatically (c) refresh changes real infrastructure
10. What replaced the standalone `terraform refresh` command, and why?
11. In the region demo, why did `terraform plan` leave the state intact but `terraform refresh` emptied it?
12. Is `sensitive = true` enough to keep a database password out of the state file?
13. What is the address of `resource "aws_s3_bucket" "logs" {}`, and what does `terraform state list` print?
14. Which command shows the attributes of one resource from state without opening the JSON?
15. Why is explicitly defining security-relevant attributes in code a best practice?

### Answers

1. `terraform.tfstate`, JSON, in the working directory (local backend).
2. `Plan: 1 to add`. Terraform no longer knows it created the instance, so it would create a **duplicate** while the original keeps running (and costing money).
3. (b). The file stays; it is simply empty of resources. `terraform.tfstate.backup` may also exist.
4. Desired state is what you want, found in the `.tf` configuration. Current state is what actually exists, found in the real infrastructure (read through the provider API and recorded in state).
5. An update in place `t2.small -> t2.micro` (1 to change). Terraform reverts to the desired state.
6. **No changes.** The security group was a provider default, not part of the desired state, so Terraform does not compare it.
7. The desired state is "nothing", so `plan` shows a destroy and `apply` destroys the instance. You do not need `terraform destroy`.
8. The value is determined by the provider after the resource is created (for example IDs and defaults), so Terraform cannot show it in the plan.
9. (b). `plan` also refreshes. (a) is wrong; (c) is wrong, refresh only updates state, it reads reality.
10. `-refresh-only` with `plan` or `apply`. The old command rewrote the state immediately with no review, which could erase entries; `-refresh-only` shows a plan and, with `apply`, asks for approval.
11. `plan` only reads and compares; it never writes the state. `terraform refresh` writes the state, and since it could not find the resources in the new region it removed them.
12. No. `sensitive = true` hides the value in CLI output only. The value is stored in the state in plain text.
13. `aws_s3_bucket.logs`. `terraform state list` prints `aws_s3_bucket.logs` (plus any other resources).
14. `terraform state show <address>`, for example `terraform state show aws_security_group.prod`.
15. Only attributes in the code are compared. If you define them, manual changes are detected and reverted; if you leave them as defaults, nobody notices manual changes.

## Glossary

| Term | Meaning |
|---|---|
| State file | JSON file (default `terraform.tfstate`) mapping config to real objects and storing their attributes. |
| `terraform.tfstate.backup` | Automatic copy of the previous state. |
| Desired state | What your configuration says should exist. |
| Current state | What actually exists in the real infrastructure. |
| Drift | A difference between real infrastructure and what Terraform expects, caused by changes made outside Terraform. |
| Refresh | Reading real infrastructure and updating the state to match. |
| `-refresh-only` | Mode of `plan`/`apply` that only updates state from reality, with review. |
| Resource address | `type.name` identifier (such as `aws_instance.myec2`) used in state commands. |
| `(known after apply)` | An attribute the provider fills in after creation. |
| `serial` / `lineage` | State counter (changes each update) and unique history ID. |
