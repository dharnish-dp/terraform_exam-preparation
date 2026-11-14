# 08 — Lifecycle, Custom Conditions & Sensitive Data

> **Exam domain(s):** Read, generate and modify configuration (lifecycle, variable validation, custom conditions, check blocks) and Secrets / sensitive data management (sensitive values, Vault, ephemeral values, write-only arguments)   **Source:** lesson 4, lectures 89–93 and 100–103 (Parts 5 and 6); lesson 8, lectures 144–147 and 149   **Time:** ~4–5 h

## What you will learn

- What Terraform does **by default** when you create, change, rename or remove a resource, and why that default is sometimes not what you want.
- The five **meta-arguments** and the four settings of the `lifecycle` block: `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`.
- How to **validate input variables** so bad values fail at `plan` time instead of halfway through `apply`.
- How **preconditions** and **postconditions** guard a resource (before and after it is evaluated), and when `self` is allowed.
- What a **`check` block** is, how it differs from preconditions/postconditions, and why failures are warnings.
- How `sensitive = true` works, what it hides, and (just as important) what it does **not** hide.
- Why committing state to Git is dangerous (pointer to chapter 10).
- What **HashiCorp Vault** is and how Terraform integrates with it (and the exam point that Vault secrets still land in state).
- What **ephemeral blocks** and **write-only arguments** are, and how they keep secrets out of state and plan files (Terraform 1.10/1.11+).

---

## 🧠 Pre-concept

Think of a Terraform configuration as the plans for a building and the cloud as the building itself. Terraform's job is to keep the building matching the plans. Two kinds of problems appear in real life, and this chapter is about both.

**Problem 1: "Terraform is too eager or too careless."** By default Terraform makes reality match the plans *exactly*. It will delete things you removed from the plans, revert changes somebody made by hand, and when it must replace something it will knock the old one down before building the new one. Sometimes you need exceptions: "never knock this database down", "ignore the tags the cost tool adds", "build the new server first". Those exceptions live in the **`lifecycle` block**.

**Problem 2: "Bad inputs and bad secrets."**

- A typo, such as a 2-character S3 bucket name, may pass `plan` and only fail when AWS rejects it during `apply`. **Validation, preconditions, postconditions and check blocks** are guard rails that make such mistakes fail early and with a clear message.
- Passwords and keys must not leak. `sensitive = true` hides them on screen, **but the state file still contains them in plain text**. Vault, ephemeral values and write-only arguments are the progressively stronger answers.

Here is the map of the chapter:

| Part | Topic | The question it answers |
|---|---|---|
| A | `lifecycle` meta-argument | "How do I change what Terraform does when it creates, updates, replaces or destroys this resource?" |
| B | Input variable validation | "How do I reject bad variable values at plan time?" |
| C | Preconditions and postconditions | "How do I check assumptions before, and results after, a resource is built?" |
| D | `check` blocks | "How do I keep monitoring something without blocking the run?" |
| E | `sensitive` | "How do I stop secrets appearing in the terminal and logs?" |
| F | Secrets in state, Vault, ephemeral values, write-only arguments | "How do I keep secrets out of state entirely?" |

The secrets story is a ladder. Each rung protects more than the one below:

```text
Level 1  sensitive = true          -> hidden from CLI output / logs only (state still has plaintext)
Level 2  Vault / Secrets Manager   -> secrets stored and issued centrally (but a secret that Terraform
                                      reads still lands in state)
Level 3  ephemeral + write-only    -> value is never written to state or plan files
Always   protect the state file    -> encrypt it, restrict access, never commit it to Git
```

---

# Part A — The `lifecycle` meta-argument

## A1. Default resource behaviour (lecture 89)

A `resource` block declares: "I want this infrastructure object to exist with these settings."

- Add the block and apply: Terraform **creates** the object.
- Remove the block and apply: Terraform assumes you no longer want it and **destroys** it.

When you run `terraform apply`, Terraform compares three things: your configuration, the state file, and the real infrastructure (see [04 — State basics](04-state-basics.md)). Then it follows four rules:

| # | Rule | Example |
|---|---|---|
| 1 | **Create** resources that exist in configuration but have no matching real object in state | You add a new block to the `.tf` file |
| 2 | **Destroy** resources that exist in state but no longer exist in configuration | You delete a block from the file |
| 3 | **Update in place** resources whose arguments changed and can be changed without recreating | Changing a security-group port from 22 to 80, or changing a tag |
| 4 | **Destroy and re-create** resources whose arguments changed but **cannot** be updated in place because of a remote API limitation | Changing an EC2 AMI (for example Linux to Windows) |

In a plan, rule 4 shows up with the note `# forces replacement` next to the argument that caused it, and the resource is marked `-/+` (destroy and then create) instead of `~` (update in place).

### Demo: watching rules 3 and 4 and the "revert manual change" behaviour

Base configuration (`lifecycle-meta-argument.tf`). The video starts with the tag `HelloWorld`; the repo's base code already shows `HelloEarth`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }
}
```

> AMI IDs are region-specific and change over time. Copy a current Amazon Linux AMI ID for your own region from the EC2 console (Launch instance) rather than trusting the ID above.

1. `terraform apply -auto-approve` creates the EC2 instance. In the console you see the tag `Name = HelloWorld` (or `HelloEarth`, depending on which version you applied).
2. **In-place update:** change the tag value (for example `HelloWorld` to `HelloEarth`) and run `terraform plan`. The plan shows an in-place modification (`~`). The instance is not replaced. `terraform apply -auto-approve` applies it, and the console shows the new tag.
3. **Replacement:** change `ami` to a Windows AMI ID. `terraform plan` shows the instance will be **replaced** (`-/+`, "forces replacement") because AWS cannot swap the OS image of a running instance. **Revert the AMI** afterwards (do not apply this).
4. **Manual change is reverted:** in the AWS console, add a tag `Env = production` by hand. Run `terraform plan`. Terraform plans to **remove** that tag because it is not in the configuration. `terraform apply -auto-approve` removes it, and the console confirms the tag is gone.

> ⚠️ **Gotcha:** The default behaviour is "make real infrastructure match the configuration, always." Anything added outside Terraform to an argument that Terraform manages is treated as drift and reverted on the next apply.

🎯 **Exam focus:** Some argument changes update in place, others force replacement. Manual changes made outside Terraform are detected and reverted on the next apply, unless you tell Terraform otherwise.

### Why meta-arguments exist

In production there are legitimate exceptions to "always match the configuration": a cost-tagging tool adds tags, an autoscaler changes a capacity number, a database must never be deleted. **Meta-arguments** are special arguments you can add inside a resource block to change how Terraform treats that resource.

## A2. The list of meta-arguments

| Meta-argument | Purpose (high level) | Covered in |
|---|---|---|
| `depends_on` | Explicit ordering between resources | [05](05-resources-data-dependencies.md) |
| `count` | Create multiple instances by number | [07](07-types-loops-functions.md) |
| `for_each` | Create multiple instances from a map or set | [07](07-types-loops-functions.md) |
| `lifecycle` | Customise create / update / destroy behaviour | **this chapter** |
| `provider` | Pick which (aliased) provider configuration a resource uses | [02](02-providers.md) |

> **Note:** the `provider` **meta-argument** (`provider = aws.mumbai` inside a resource) is not the same thing as the top-level `provider "aws" {}` block. The meta-argument selects an alternate provider configuration for one specific resource.

Two nearby topics from the same stretch of the course live in other chapters, so only a pointer is given here:

- The pitfalls of `count` (index-based addressing shifts when you insert into the middle of a list) are in [07 — Types, loops, functions](07-types-loops-functions.md).
- Implicit vs explicit dependencies and `depends_on` are in [05 — Resources, data, dependencies](05-resources-data-dependencies.md).

## A3. The `lifecycle` block at a glance (lecture 90)

The `lifecycle` block is available in **all** resource blocks (and some of its settings in data sources). Its arguments:

| Argument | What it does | Typical use |
|---|---|---|
| `create_before_destroy` | The new replacement object is created **first**, then the old one is destroyed | Low/zero downtime replacement |
| `prevent_destroy` | Terraform rejects any plan that would destroy the resource (for example `terraform destroy`) | Protect databases and other critical resources |
| `ignore_changes` | Ignores changes to the listed attributes (or `all`) | Attributes modified outside Terraform |
| `replace_triggered_by` | Replaces this resource when any referenced item changes | Hard dependencies in production |
| `precondition` / `postcondition` | Custom checks before / after the resource is evaluated | See [Part C](#part-c--preconditions-and-postconditions-lecture-102) |

A syntax summary (the lecture does not show this combined block; in practice you use only what you need):

```hcl
resource "aws_instance" "example" {
  # ... arguments ...

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
    ignore_changes        = [tags]
    # replace_triggered_by = [ ... ]
  }
}
```

> ⚠️ **Gotcha:** The values inside `lifecycle` must be **literal values** (true/false, a list of attribute names, and so on). Terraform needs them while it is still building the dependency graph, so you cannot use variables or other expressions in `create_before_destroy`, `prevent_destroy` or `ignore_changes`. (`replace_triggered_by`, `precondition` and `postcondition` do take references and expressions, as you will see.)

🎯 **Exam focus:** Know the four lifecycle arguments by name: `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`. They go inside a `lifecycle {}` block within a resource.

## A4. `create_before_destroy` (lecture 91)

### Default behaviour: destroy, then create

When an argument change cannot be applied in place (for example the AMI of an EC2 instance, i.e. its operating system), Terraform **destroys the existing object and then creates the replacement**. In production that leaves a gap with nothing running.

```text
 default                              create_before_destroy = true
 -------                              ----------------------------
 1. destroy old instance              1. create NEW instance
 2. create new instance               2. destroy OLD instance
   (a gap with nothing running)         (old keeps running until new exists)
```

### The code

Base code:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }
}
```

Final code. `create_before_destroy = true` is the only addition:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

### Demo walkthrough

**Part A: default behaviour**

1. The instance (Amazon Linux AMI) is already applied and running.
2. In the console (Launch instances), copy the AMI ID of an **Ubuntu** image and paste it into `ami`.
3. `terraform plan` shows **1 to add, 1 to destroy**.
4. `terraform apply -auto-approve`. The log shows the **destruction of the old instance first**, then creation of the new one.

**Part B: with `create_before_destroy`**

1. Change the AMI back to the Amazon Linux AMI and add the `lifecycle { create_before_destroy = true }` block.
2. `terraform plan` again shows 1 to add, 1 to destroy. The count is the same; the difference is the **order**.
3. `terraform apply -auto-approve`. This time the new instance is **created first**. Only after it finishes is the old instance terminated.
4. Clean up with `terraform destroy` to avoid charges.

In the plan, the replacement symbol changes from `-/+` (destroy then create) to `+/-` (create then destroy). Reading the symbol order is a quick way to see which behaviour you will get.

### Gotchas (extra context)

- Both objects exist at the same time for a while, so any **unique constraint** (a fixed name, a fixed IP, a DNS record) can cause the new object to fail to be created. Plan for that, for example by giving objects generated names (`name_prefix`).
- `create_before_destroy` also affects things the resource depends on: Terraform may have to process those dependencies in "create first" order too.
- It matters only when a resource is being **replaced**. For a normal in-place update it changes nothing.

🎯 **Exam focus:** Default replacement order is destroy then create. `create_before_destroy = true` reverses that: create the replacement first, then destroy the old object.

## A5. `prevent_destroy` (lecture 92)

### Purpose

`prevent_destroy = true` makes Terraform **refuse** any plan that would destroy the resource, for example one caused by `terraform destroy`. It is a safety net for objects that are costly or impossible to reproduce (databases and similar), particularly when infrastructure is applied automatically by scripts or CI tools such as Jenkins, where an accidental destroy could otherwise go through unnoticed.

### The code

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

### Demo walkthrough

1. The `HelloEarth` instance is already running.
2. **Before** adding the argument: `terraform destroy` shows "1 to destroy" and asks for confirmation. Answer `no`.
3. Add `lifecycle { prevent_destroy = true }` and save.
4. Run `terraform destroy` again. This time it **errors immediately**. The message is similar to:

```text
Error: Instance cannot be destroyed

  on main.tf line 6:
   6: resource "aws_instance" "myec2" {

Resource aws_instance.myec2 has lifecycle.prevent_destroy set, but the plan
calls for it to be destroyed. To avoid this error and continue with the
plan, either disable lifecycle.prevent_destroy or reduce the scope of the
plan using the -target option.
```

(The exact wording varies by version; the key phrase is `lifecycle.prevent_destroy set`.)

### The important caveat

The protection exists only while the argument is **present in the configuration**. If you delete the entire resource block from the file and run `terraform apply`, Terraform no longer sees the `prevent_destroy` setting, and it plans to destroy the instance. The lecture demonstrates exactly this: with the block removed, `terraform apply` shows the EC2 instance being destroyed.

```text
 Config has prevent_destroy = true  -->  destroy / replace plan = ERROR (protected)
 Resource block deleted entirely    -->  no rule left  -->  instance destroyed
```

Also (extra context): `prevent_destroy` blocks any change that would **force a replacement**, because a replacement includes a destroy. If you really need to replace or delete the resource, set `prevent_destroy = false` (or remove the line), apply that change, then perform the destroy.

> ⚠️ **Gotcha:** `prevent_destroy = true` is not a lock on the real resource. It is a check inside Terraform. Someone can still delete the object in the console, or remove the block from the configuration. For stronger protection combine it with IAM permissions, versioned/encrypted backends and code review.

> ⚠️ **Gotcha (labs):** If you leave `prevent_destroy = true` on a lab resource, your `terraform destroy` clean-up fails. Set it to `false` and apply first.

🎯 **Exam focus:** `prevent_destroy = true` makes Terraform error on any plan that would destroy the resource. It does **not** protect you if the resource block is removed from the configuration.

## A6. `ignore_changes` (lecture 93)

### Purpose

Resources are sometimes modified outside Terraform (manual edits, other automation, autoscalers, cost-allocation tools). By default `plan` / `apply` revert those edits. `ignore_changes` tells Terraform to **ignore differences** in the listed attributes. An EC2 instance has hundreds of attributes, and you choose exactly which ones to ignore.

A first taste (from lecture 89) that ignores the `tags` attribute:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }

  lifecycle {
    ignore_changes = [tags]
  }
}
```

- `lifecycle { ... }` is the meta-argument block.
- `ignore_changes = [tags]` tells Terraform not to consider differences in the `tags` attribute.

With the block present and a manual `Env = production` tag added in the console, `terraform plan` reports **no changes**. Remove the `lifecycle` block, save, plan again, and Terraform once more proposes removing the `Env` tag.

### The three forms

List form (the repo version uses the tag `HelloWorld`):

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloWorld"
  }

  lifecycle {
    ignore_changes = [tags, instance_type]
  }
}
```

`all` form:

```hcl
  lifecycle {
    ignore_changes = all
  }
```

(Extra context) You can also ignore **part** of an attribute, such as a single map key, so that Terraform keeps managing the other tags:

```hcl
  lifecycle {
    ignore_changes = [tags["Env"], tags["Owner"]]
  }
```

> **Up to date (TF 1.12):** Older code sometimes uses `ignore_changes = ["*"]` for "ignore everything". That string form is deprecated; use the bare keyword `all` (no quotes, no list), as the lesson does. The names in the list are attribute names written as plain references, not strings or expressions.

### Demo walkthrough

**Step 1: observe the default revert.**

1. The instance is running with one tag `Name = HelloEarth`.
2. In the console add a random manual tag (any key/value).
3. `terraform plan` detects it and shows the tag changing to `null` (i.e. being removed). `terraform apply -auto-approve` removes it. The console now shows only the `Name` tag.

**Step 2: ignore `tags`.**

1. Add `lifecycle { ignore_changes = [tags] }`.
2. Add a random manual tag again.
3. `terraform plan` reports **no changes**. The manual tag is ignored.

**Step 3: ignore a second attribute, `instance_type`.**

1. Stop the instance in the console, change its type from `t2.micro` to `t1.micro`, and start it again. (An EC2 instance type can only be changed while the instance is stopped.)
2. With only `ignore_changes = [tags]`, `terraform plan` ignores the tags but proposes **changing `instance_type` back from `t1.micro` to `t2.micro`** (1 change).
3. Update to `ignore_changes = [tags, instance_type]` (a comma-separated list). `terraform plan` now reports no changes.

**Step 4: ignore everything with `all`.**

1. Use `ignore_changes = all`. `terraform plan` shows no changes.
2. Now edit the configuration itself, changing the tag value from `HelloEarth` to `HelloWorld`. `terraform plan` **still** shows no changes ("infrastructure matches the configuration").

### What `ignore_changes = all` really means

| Aspect | Behaviour with `all` |
|---|---|
| Create the remote object | Yes |
| Destroy the remote object | Yes |
| Propose **updates** to the object | **Never** |
| Pick up edits you make in your own `.tf` file | **No** (also ignored) |

So `all` is not only about manual changes. Terraform ignores your **configuration** changes too, which gives flexibility but can hide real updates. Use it deliberately.

> ⚠️ **Gotcha:** `ignore_changes` only affects *updates to an existing object*. A brand-new resource is still created with the values in your configuration. The ignored attribute is just never compared afterwards.

🎯 **Exam focus:** `ignore_changes = [attr1, attr2]` takes a list of attribute names; `ignore_changes = all` ignores all attributes. With `all`, Terraform can still create and destroy the object but never proposes updates, even for edits to your own configuration. Typical use: attributes changed by other tools or by hand (tags, autoscaling-managed values).

## A7. `replace_triggered_by`

The lesson lists `replace_triggered_by` in the lifecycle overview (lecture 90) as "replaces this resource when any referenced item changes; used for hard dependencies in production" but does not demo it. The following is background so that the argument is not a mystery on the exam.

**Problem it solves.** `depends_on` and references only control *ordering* ("create A before B"). They do not say "when A changes, rebuild B". Sometimes B is only ever correct if it is rebuilt together with A. Example: an EC2 instance should be recreated whenever a configuration object changes, even though the instance has no argument that reads that object.

```hcl
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "web traffic"
}

resource "aws_instance" "web" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  lifecycle {
    replace_triggered_by = [
      aws_security_group.web.id   # when this value changes, replace the instance
    ]
  }
}
```

Facts to know:

- It takes a **list of references** to resources, or to a specific attribute of a resource.
- If you reference a **whole resource** (`aws_security_group.web`), the instance is replaced when that resource is **replaced** (destroyed and re-created). If you reference an **attribute** (`aws_security_group.web.id`), the instance is replaced when that attribute's value changes.
- It forces **replacement** (destroy and create), not an in-place update.
- Available since Terraform **1.2**.
- A common pattern is to trigger replacement from `terraform_data` or from a variable, because those have no real-world object:

```hcl
resource "terraform_data" "ami_version" {
  input = var.app_version
}

resource "aws_instance" "app" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  lifecycle {
    replace_triggered_by = [terraform_data.ami_version]
  }
}
```

> **Up to date (TF 1.12):** `replace_triggered_by` is the modern way to force a rebuild based on another object. If you want to force a one-off rebuild from the CLI, use `terraform apply -replace=<address>` (see [11 — Import, state CLI, logging](11-import-state-cli-logging.md)). `terraform taint` is deprecated in favour of `-replace`.

🎯 **Exam focus:** `replace_triggered_by` replaces the resource when a referenced resource or attribute changes. It is the fourth lifecycle argument alongside `create_before_destroy`, `prevent_destroy` and `ignore_changes`.

## A8. Lifecycle summary

| Setting | Triggers when | Effect | Common trap |
|---|---|---|---|
| `create_before_destroy = true` | The resource must be **replaced** | New object is built first, then old one removed | Unique names/IPs collide while both exist |
| `prevent_destroy = true` | Any plan would **destroy** it | Plan fails with an error | Deleting the block removes the protection; blocks `terraform destroy` for your own labs too |
| `ignore_changes = [...]` / `all` | Real value differs from config | Difference is not reported or reverted | `all` also ignores your own config edits |
| `replace_triggered_by = [...]` | A referenced resource/attribute changes | Resource is replaced | Needs references, not literal strings |
| `precondition` / `postcondition` | Plan/apply evaluates the resource | Error if condition false | `self` only in postconditions |

---

# Part B — Input variable validation (lectures 100–101)

## B1. The problem: plan passes, apply fails

A common frustration: `terraform plan` looks fine, but `terraform apply` errors out when Terraform calls the cloud API. This hurts especially in automation / CI pipelines because the failure appears late, possibly leaving half the infrastructure built.

The cause is **missing validation**. Every provider and service has rules and limits (naming conventions, lengths, capacity). For example:

- IAM user names may contain letters, digits and a few characters (`+ = , . @ _ -`). A `#` is not allowed.
- S3 bucket names must be **3 to 63 characters** long.

## B2. Provider-side validation is partial

Terraform and its providers validate many inputs at plan time. Example 1 (the name should be quoted; shown here correctly):

```hcl
terraform {
  required_providers {
    aws = "~>5.6"
  }
}

resource "aws_iam_user" "dev" {
  name = "kplabs-user-01#"
}
```

With `name = "kplabs-user-01"` the plan works. After adding the `#`, the **plan itself fails** (`Invalid value for name`): the provider caught it early.

But validation exists for **many, not all**, resources. Example 2: an S3 bucket whose name has only two characters:

```hcl
resource "aws_s3_bucket" "example" {
  bucket = "hi"     # only 2 characters - AWS requires 3-63
}
```

- `terraform plan` succeeds (the provider did not catch it).
- `terraform apply -auto-approve` calls the AWS API, and AWS returns an error: the specified bucket is not valid.

(The repo file only has Example 1 in full; the S3 snippet is reconstructed from the lecture description.)

Conclusion: you also need **user-side validation** that enforces the provider's rules before any API call.

## B3. The feature: `validation` blocks

Input variable validation lets you enforce rules and constraints on **values assigned to an input variable**. Example: the variable `db_password` must be at least 12 characters.

```text
 value supplied (tfvars / CLI prompt / default / env var)
                    |
                    v
          +--------------------+
          |  validation block  |-- condition false --> error_message shown at plan
          +--------------------+
                    | condition true
                    v
              plan continues
```

The value can come from **anywhere** (a default in the variable, `terraform.tfvars`, `-var`, `TF_VAR_...` environment variable, a CLI prompt). Validation runs as soon as Terraform evaluates the variable at `terraform plan`. (See [06 — Variables, outputs, locals](06-variables-outputs-locals.md) for all the ways to assign values.)

### Solution code

```hcl
variable "db_password" {
  type = string

  validation {
    condition     = length(var.db_password) >= 12
    error_message = "Length of Database Password must be equal to or greater than 12 characters"
  }
}
```

### The three components

| Component | Role |
|---|---|
| `validation { }` block | Container, nested inside the `variable` block |
| `condition` | A **boolean expression** that must evaluate to `true` for validation to pass; may use functions and `var.<name>` |
| `error_message` | Text shown to the user (in the CLI) when the condition is `false`; make it clear and helpful |

How the condition reads: `length(var.db_password) >= 12` means "take the password, compute its length with the `length()` function, check it is greater than or equal to 12."

Quick check of `length()` in `terraform console`:

```text
> length("hello")
5
```

### Demo walkthrough

1. Put the variable and validation block above in `input-validation.tf`.
2. `terraform plan` first showed a notice about quoted types: the instructor had written `type = "string"`. Terraform 0.11 and earlier required quotes, but that form is deprecated. **Remove the quotes** around `string`.
3. `terraform plan` again. No value is set in `terraform.tfvars`, so Terraform prompts for `var.db_password`.
4. Enter `admin1234` (9 characters). The plan fails with your custom message:

```text
Error: Invalid value for variable

  on input-validation.tf line 1:
   1: variable "db_password" {
     |----------------
     | var.db_password is "admin1234"

Length of Database Password must be equal to or greater than 12 characters

This was checked by the validation rule at input-validation.tf:4,3-13.
```

5. Enter a 12+ character value. The plan succeeds. (Extra context: set the value with `-var` or tfvars to see the same validation applied.)

### Benefits (as stated in the lecture)

1. Enforces **consistency** and organisational best practices (for example naming standards).
2. Makes Terraform code **more predictable**: if `plan` works, `apply` is expected to work in most cases.
3. **Catches misconfiguration early**, saving time and avoiding later infrastructure issues.

## B4. More validation patterns (extra context)

You can have **several** `validation` blocks in one variable; each is checked and each reports its own message. These functions are the usual helpers (the functions themselves are covered in [07](07-types-loops-functions.md)):

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "The environment must be one of: dev, staging, prod."
  }
}

variable "bucket_name" {
  type = string

  validation {
    condition     = length(var.bucket_name) >= 3 && length(var.bucket_name) <= 63
    error_message = "S3 bucket names must be between 3 and 63 characters long."
  }

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]*$", var.bucket_name))
    error_message = "Use only lowercase letters, digits, dots and hyphens."
  }
}

variable "vpc_cidr" {
  type = string

  validation {
    condition     = can(cidrnetmask(var.vpc_cidr))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block such as 10.0.0.0/16."
  }
}
```

- `contains(list, value)` checks membership in an allowed list.
- `can(expression)` returns `true` if the expression evaluates without error, so `can(regex(...))` is a boolean "does it match?".
- `&&` and `||` combine conditions.

> **Up to date (TF 1.12):** Older Terraform versions allowed a validation `condition` to reference **only the variable being validated** (`var.<its own name>`). Since Terraform **1.9**, a validation condition may also refer to other variables, data sources and local values. Do not rely on the old limitation for new code.

> ⚠️ **Gotchas:**
> - Write `type = string` (no quotes).
> - The condition must evaluate to `true`/`false`.
> - For password-style variables also consider `sensitive = true` (see [Part E](#part-e--the-sensitive-parameter-lecture-144)). Note that a failing validation error can echo the offending value on screen unless the variable is sensitive.

🎯 **Exam focus:**

- Syntax: `variable { type = ...; validation { condition = <bool>; error_message = "..." } }`.
- `condition` true = pass; false = `error_message` is displayed.
- Validation runs at **plan** time, before any resources are touched.
- Input validation checks **input values**. It is not the same thing as preconditions/postconditions, which check resource-level expectations.

---

# Part C — Preconditions and postconditions (lecture 102)

## C1. Concept

Both are **custom conditions** you place in a resource's `lifecycle` block.

| | Precondition | Postcondition |
|---|---|---|
| Checked | **Before** evaluating the object | **After** evaluating the object |
| Analogy | "Dress properly before you step out." No leniency, it must be met | "Verify the result once it is built" |
| Example | Launch EC2 only if the instance type is free tier | After launch, check the instance has a public IP or an encrypted disk |
| `self` available? | **No** | **Yes** |

```text
 user: "launch big server"
        |
        v
  +-------------+   fails   +--------------------------------+
  | precondition|---------->| Error: only free tier allowed  |  (nothing created)
  +-------------+           +--------------------------------+
        | passes
        v
   create EC2 instance
        |
        v
  +-------------+   fails   +--------------------------------+
  |postcondition|---------->| Error: no public IP            |  (resource exists, run fails)
  +-------------+           +--------------------------------+
```

Why use them: in large organisations developers may launch larger servers than needed, raising the bill. A precondition can enforce "free tier only" in dev.

## C2. Syntax

```hcl
resource "..." "..." {
  # ...
  lifecycle {
    precondition {
      condition     = <boolean expression>
      error_message = "message if false"
    }

    postcondition {
      condition     = <boolean expression>
      error_message = "message if false"
    }
  }
}
```

The structure mirrors input variable validation (`condition` + `error_message`). If you understood [Part B](#part-b--input-variable-validation-lectures-100101), this is the same pattern, placed inside `lifecycle`. You can have more than one of each.

## C3. Supporting data source: `aws_ec2_instance_type`

The practical uses a **data source** (see [05](05-resources-data-dependencies.md)) to decide whether an instance type is free tier:

```hcl
data "aws_ec2_instance_type" "example" {
  instance_type = "t2.micro"
}

resource "aws_instance" "example" {
  instance_type = "t2.micro"
  ami           = "ami-066784287e358dad1"
}
```

The data source fetches characteristics of one instance type. One important attribute is **`free_tier_eligible`** (`true` / `false`). Free-tier eligibility depends on AWS and can change (today `t2.micro`, tomorrow maybe `t3.micro`); the data source reflects the current state.

Quick experiment: comment out the resource and add an output:

```hcl
output "instance_type" {
  value = data.aws_ec2_instance_type.example.free_tier_eligible
}
```

`terraform plan` with `t2.micro` shows `free_tier_eligible = true`; with a large type such as `m5.large` it shows `false`.

## C4. Building the precondition

First make the instance type a **variable** and reference it in both places so there is one central source:

```hcl
variable "instance_type" {}

data "aws_ec2_instance_type" "example" {
  instance_type = var.instance_type
}

resource "aws_instance" "example" {
  instance_type = var.instance_type
  ami           = "ami-066784287e358dad1"
}
```

Without checks, entering `m5.large` would happily plan and launch that instance. Add the precondition:

```hcl
resource "aws_instance" "example" {
  instance_type = var.instance_type
  ami           = "ami-066784287e358dad1"

  lifecycle {
    precondition {
      condition     = data.aws_ec2_instance_type.example.free_tier_eligible
      error_message = "Only launch free tier eligible EC2."
    }
  }
}
```

`free_tier_eligible` is already a boolean, so it can be used directly as the condition. `true` means go ahead; `false` means stop.

Results:

- `terraform plan` + `m5.large` gives `Error: Resource precondition failed` (the evaluated value is `false`), showing your `error_message`.
- `terraform plan` + `t2.micro` succeeds.

## C5. Building the postcondition

Postconditions run after the resource exists, so they can use **`self`** to refer to the resource's own attributes (instead of writing `aws_instance.example.<attr>`).

The lecture version of the check requires a public IP:

```hcl
    postcondition {
      condition     = self.public_ip != ""
      error_message = "EC2 must have public IP address"
    }
```

If the instance has a non-empty `public_ip`, the condition is `true`. If no IP was assigned it is `false`.

The repo's "final code" is a slightly different example that uses `public_dns` with `==` as the **failing** test case:

```hcl
data "aws_ec2_instance_type" "example" {
  instance_type = "t3.micro"
}

output "instance_type" {
  value = data.aws_ec2_instance_type.example.free_tier_eligible
}

resource "aws_instance" "example" {
  instance_type = "t2.micro"
  ami           = "ami-066784287e358dad1"

  lifecycle {

    precondition {
      condition     = data.aws_ec2_instance_type.example.free_tier_eligible
      error_message = "Instance Type is not part of free tier"
    }

    postcondition {
      condition     = self.public_dns == ""
      error_message = "Public IPV4 or DNS is mandatory for this server"
    }
  }
}
```

> ⚠️ **Gotcha (lesson note):** In this repo version, `self.public_dns == ""` is true only when there is **no** DNS name, which is the opposite of what the error message says. It matches the "intentionally fail" step of the demo (a normal instance has a DNS name, so the condition is false and the postcondition fails). For a real "must have a public address" check you would write `self.public_dns != ""` (or `self.public_ip != ""`, as in the lecture).

### Demo walkthrough

1. **Success path:** with `!= ""`, `terraform plan` (`t2.micro`) works. `terraform apply -auto-approve` creates the instance; in the console it shows a public IP.
2. `terraform destroy -auto-approve` to clean up.
3. **Force a postcondition failure:** change the condition to `self.public_ip == ""`. A normal instance has a public IP, so this is `false`.
4. `terraform plan` still passes. At plan time the IP is unknown (it is "known after apply"), so the postcondition cannot be evaluated yet.
5. `terraform apply -auto-approve` (`t2.micro`): the instance **is created** (creation completes) and *then* you get `Error: Resource postcondition failed`.
6. Now even `terraform plan` fails, because the failing postcondition is evaluated against the existing resource.
7. `terraform destroy` still **works**. Terraform is lenient: if you want to get rid of a resource whose postcondition fails, it lets you. Fix the code and try again.

Key behaviour to remember:

| Scenario | Outcome |
|---|---|
| Precondition false | Resource is **not** created/changed |
| Postcondition false | Resource **was** created, but the operation errors; subsequent plans fail until fixed |
| Destroy with a failing postcondition | Allowed |

## C6. Important pointers

1. **`self`** refers to the attributes of the resource under evaluation and is available **only in postconditions**. Attributes of a not-yet-created object do not exist in a precondition.
2. Preconditions and postconditions need **Terraform 1.2.0 or later**.
3. They are supported on **resources**, **data sources** and **outputs** (the video primarily demonstrates resources).

> **Up to date (TF 1.12):** Where you write them differs slightly by block type. In **resources and data sources** both `precondition` and `postcondition` go inside `lifecycle { }`. In an **`output` block** you write a `precondition` directly in the output block (there is no `lifecycle` block there, and outputs do not have postconditions):
>
> ```hcl
> output "web_url" {
>   value = "http://${aws_instance.example.public_dns}"
>
>   precondition {
>     condition     = aws_instance.example.public_dns != ""
>     error_message = "The instance has no public DNS name."
>   }
> }
> ```
>
> Also, when a precondition depends on a value that is unknown until apply, Terraform defers the check to apply time instead of failing the plan.

## C7. Gotchas

- `self` in a precondition fails: it exists only in postconditions.
- A failing postcondition leaves the resource created (and probably in state), so watch for partially successful applies.
- Free-tier eligibility changes over time; do not hard-code assumptions, ask the data source.

🎯 **Exam focus:**

- Pre = checked **before** the object is evaluated; post = checked **after**.
- Both live inside the `lifecycle` block (for resources and data sources) and use `condition` + `error_message`.
- `self` works only in postconditions.
- Introduced in Terraform **1.2.0**.
- Precondition failure prevents creation; postcondition failure can happen after creation.

---

# Part D — `check` blocks (lecture 103)

> **Source note:** The course notes have **no transcript** for lecture 103 (the repo maps it to "Check Blocks", `check-block.md`). What follows combines the repo file and Terraform documentation. Items marked (extra context) are not from the course notes.

## D1. What a check block is

A **`check` block** lets you define an **assertion about your infrastructure** that Terraform evaluates on every plan/apply **without stopping the run** if it fails. It is meant for ongoing health-style validation, for example "is this website up?".

Structure:

- A `check "<name>"` block.
- An optional **scoped data source** (`data` block nested inside the check). It is used only for this check.
- One or more **`assert`** blocks, each with a `condition` and an `error_message`.

## D2. The repo example

Base code (the website does not exist, deliberately):

```hcl
data "http" "example" {
  url = "https://google1231233dsd.com"
}

resource "local_file" "foo" {
  content  = "Hi"
  filename = "${path.module}/foo.txt"
}
```

Final code, with the data source moved inside a `check` block:

```hcl
check "website_checker" {
  data "http" "example" {
    url = "https://google1231233dsd.com"
  }

  assert {
    condition     = data.http.example.status_code == 200
    error_message = "Website is not running. Please check"
  }
}

resource "local_file" "foo" {
  content  = "Hi"
  filename = "${path.module}/foo.txt"
}
```

What happens when you run `terraform plan`/`apply` on the final code (extra context):

- The `local_file` resource is planned and created normally.
- The `http` request to the non-existent site fails (or returns a non-200 code), so the assertion is false.
- Terraform prints a **warning** like the following and carries on:

```text
Warning: Check block assertion failed

  on check-block.tf line 8, in check "website_checker":
   8:     condition     = data.http.example.status_code == 200
  
Website is not running. Please check
```

Even when the data source itself errors (for example the DNS lookup fails), errors from a *scoped* data source inside a check are reported as warnings rather than failing the whole operation.

This `check` idea is also what HCP Terraform's **continuous validation** runs on a schedule (see [12 — HCP Terraform](12-hcp-terraform.md)).

## D3. Check blocks vs preconditions / postconditions

| Feature | Where it lives | When evaluated | If it fails | Typical use |
|---|---|---|---|---|
| Input `validation` | Inside a `variable` | When the variable is evaluated (plan) | **Error**, run stops | Reject bad inputs |
| `precondition` | Resource / data `lifecycle` (or `output`) | Before the object is evaluated | **Error**, run stops, nothing created | Assumptions about inputs and other objects |
| `postcondition` | Resource / data `lifecycle` | After the object is evaluated | **Error**, run stops (object may exist) | Guarantees about the result |
| `check` + `assert` | Top-level `check` block | At the end of plan/apply | **Warning only**, run continues | Ongoing "is it healthy?" monitoring |

> ⚠️ **Gotcha:** Because a failed `check` is only a warning, it can never be used to *block* a bad apply. Use a precondition/postcondition for that.

🎯 **Exam focus:** `check` blocks contain `assert` blocks (and optionally a scoped data source) and produce **warnings**, not errors. They were introduced in Terraform 1.5 (extra context). Conditions are the same `condition` + `error_message` pair you saw in validation and pre/postconditions.

---

# Part E — The `sensitive` parameter (lecture 144)

## E1. Why it matters

`terraform plan` and `apply` print resource attributes in the CLI output, and they can also appear in logs (for example CI/CD logs). With a `local_file` resource, the plan shows the file content in plain text:

```text
content = "supersecretpassw0rd"
```

In production you must not leak sensitive data through the CLI or logs.

## E2. Demo progression

**A. Base code: the value is shown**

```hcl
resource "local_file" "foo" {
  content  = "supersecretpassw0rd"
  filename = "password.txt"
}
```

`terraform plan` shows `content = "supersecretpassw0rd"`.

**B. Hiding it behind a variable does NOT help**

```hcl
variable "password" {
  default = "supersecretpassw0rd"
}

resource "local_file" "foo" {
  content  = var.password
  filename = "password.txt"
}
```

People assume that because the literal isn't in the resource, it won't show. But Terraform evaluates `var.password`, so the plan still prints the plain-text value.

**C. Mark the variable `sensitive`**

```hcl
variable "password" {
  default   = "supersecretpassw0rd"
  sensitive = true
}

resource "local_file" "foo" {
  content  = var.password
  filename = "password.txt"
}
```

The plan shows `content = (sensitive value)`. (The repo writes `sensitive = "true"` as a string; the lecture says `sensitive = true`. The unquoted boolean is the documented form.)

**D. Use a purpose-built resource type: `local_sensitive_file`**

```hcl
resource "local_sensitive_file" "foo" {
  content  = "supersecretpassw0rd"
  filename = "password.txt"
}
```

Without setting `sensitive` anywhere, `content` is shown as `(sensitive value)`. The provider schema marks the attribute sensitive. The `local_file` docs say: "If the file content is sensitive, use the `local_sensitive_file` resource instead." Not every resource type has a sensitive twin, so read the provider docs.

**E. An output that references a sensitive value fails unless the output is also sensitive**

```hcl
resource "local_sensitive_file" "foo" {
  content  = "supersecretpassw0rd"
  filename = "password.txt"
}

output "pass" {
  value = local_sensitive_file.foo.content
}
```

`terraform plan` shows the content as sensitive, but **the operation fails with an error** because the output would expose a sensitive value. (The lecture transcript wrote `local.sensitive_file.foo.content`; that is a transcription slip. The correct address is `local_sensitive_file.foo.content`.) The error reads roughly:

```text
Error: Output refers to sensitive values

  To reduce the risk of accidentally exporting sensitive data that was
  intended to be only internal, Terraform requires that any root module
  output containing sensitive data be explicitly marked as sensitive...
```

Fix: mark the output sensitive.

```hcl
output "pass" {
  value     = local_sensitive_file.foo.content
  sensitive = true
}
```

Then `terraform apply` succeeds and prints:

```text
Outputs:

pass = <sensitive>
```

`password.txt` is created in the working directory and contains the real password.

**F. The state file still has the value**

"Why keep an output at all if it's hidden?" Because of **state**. Other Terraform projects or teams can read your `terraform.tfstate` outputs section (this is how `terraform_remote_state`-style sharing works; see [10](10-backends-locking-drift.md)) and fetch the value. In the lecture, opening `terraform.tfstate` shows the `outputs` section containing `supersecretpassw0rd` in **plain text**.

> **Key rule:** `sensitive` protects the **CLI output and logs**. It does **not** encrypt or redact anything in the state file. The state file becomes the weak point and must itself be protected.

## E3. Provider-level automatic redaction (RDS example)

Mature providers (the AWS provider) mark some attributes sensitive themselves, such as database passwords:

```hcl
resource "aws_db_instance" "default" {
  allocated_storage    = 10
  db_name              = "mydb"
  engine               = "mysql"
  engine_version       = "8.0"
  instance_class       = "db.t3.micro"
  username             = "foo"
  password             = "foobarbaz"
  parameter_group_name = "default.mysql8.0"
  skip_final_snapshot  = true
}
```

After `terraform init`, `terraform plan` shows:

```text
username = "foo"
password = (sensitive value)
```

The password is redacted without any `sensitive` setting; the username is shown. To hide the username too, use a sensitive variable (live demo; not in the repo file):

```hcl
variable "db_user" {
  default   = "admin"
  sensitive = true
}

# inside the aws_db_instance resource:
#   username = var.db_user
```

Now the plan shows `username = (sensitive value)`. What counts as sensitive depends on the organisation.

## E4. Where `sensitive` can be set

```text
 Where is the value sensitive?
   |
   +-- variable block: sensitive = true
   +-- output block:   sensitive = true
   +-- provider schema marks the attribute sensitive
        (e.g. aws_db_instance.password, local_sensitive_file.content)
```

## E5. Comparison: what each technique hides

| Technique | Hidden in plan/apply output | Hidden in logs | Hidden in state file |
|---|:---:|:---:|:---:|
| Plain value in resource | no | no | no |
| `var.x` (not sensitive) | no | no | no |
| `variable { sensitive = true }` | yes | yes (CLI/log redaction) | **no** |
| `local_sensitive_file` / provider-marked attribute | yes | yes | **no** |
| `output { sensitive = true }` | yes | yes | **no** (outputs section holds plain text) |

## E6. More facts about `sensitive` (extra context)

- **Sensitivity spreads.** If a value derived from a sensitive variable is used in an expression (for example in a `local`), the result is also treated as sensitive. Terraform follows the "mark" through expressions, which is why an output built from it must be marked sensitive too.
- `terraform output` (no arguments) prints `<sensitive>` for sensitive outputs, but `terraform output <name>` and `terraform output -raw <name>` / `-json` **do print the real value**. Hiding is for accidents, not access control.
- The functions `sensitive(value)` and `nonsensitive(value)` mark and un-mark values explicitly. Use `nonsensitive()` with great care.
- A saved plan file (`terraform plan -out=tfplan`) can contain sensitive values. Protect it like the state.
- Running with debug logging (`TF_LOG`, see [11](11-import-state-cli-logging.md)) can reveal values that are normally hidden.

> ⚠️ **Gotchas:**
> - `sensitive = true` is cosmetic for CLI and logs. State and the plan file still hold the real value.
> - An output that references a sensitive value must be `sensitive = true`, otherwise plan/apply errors.
> - Moving a literal into a variable gains nothing unless the variable is `sensitive`.
> - Not every resource has a `*_sensitive_*` variant. Check the provider docs.
> - Even after `sensitive`, anyone with access to the state file can read the value.

🎯 **Exam focus:** The purpose of `sensitive` is to keep values out of CLI output and logs. It does **not** remove them from state. Outputs that include sensitive values need `sensitive = true`. State files contain secrets in plain text, so protect them (remote backend with encryption, restricted access, never in Git).

---

# Part F — Secrets, state, Vault, ephemeral values

## F1. Committing state to Git (lecture 145, repo file only)

> **Source note:** Lecture 145 has no transcript in the course notes. From the repo order it is almost certainly "Security Challenges in Committing TFState to Git" (`tfstate-git.md`). This section uses only that repo file; treat the lecture itself as unknown. The full Git / `.gitignore` / backend discussion lives in [10 — Backends, locking, drift](10-backends-locking-drift.md).

The repo's example (a database whose password comes from a file kept outside the project folder):

```hcl
# RDS Configuration File
provider "aws" {
  region     = "us-east-1"
  access_key = "YOUR-KEY"
  secret_key = "YOUR-KEY"
}

resource "aws_db_instance" "default" {
  allocated_storage    = 5
  storage_type         = "gp2"
  engine               = "mysql"
  engine_version       = "5.7"
  instance_class       = "db.t2.micro"
  name                 = "mydb"
  username             = "foo"
  password             = file("../rds_pass.txt")
  parameter_group_name = "default.mysql5.7"
  skip_final_snapshot  = "true"
}
```

(The repo's `provider "aws"` block is missing its closing `}`; that is a typo in the source file and is fixed above. The file `rds_pass.txt` holds a sample password, so never copy real credentials into notes or Git.)

What to take away:

- Hard-coded `access_key` / `secret_key` in the provider block is an **anti-pattern**. Use environment variables, profiles, roles or Vault ([02](02-providers.md) covers the AWS authentication methods).
- `password = file("../rds_pass.txt")` keeps the password out of the `.tf` file, **but the value is still evaluated and written into `terraform.tfstate`**. If the state is committed to Git, the secret is exposed.
- Common guidance (extra context): add `*.tfstate`, `*.tfstate.*` and `.terraform/` to `.gitignore`, and use a remote backend with encryption and access control.

## F2. Overview of HashiCorp Vault (lecture 146)

### What Vault is

HashiCorp Vault lets organisations **securely store secrets** (tokens, passwords, certificates) with proper **access management** around them. Typical secrets: database passwords, AWS access/secret keys, API tokens, encryption keys.

The problem Vault solves: many users keep secrets in a notepad. That is one of the main reasons organisations adopt Vault in production.

### Dynamic secrets

Vault can **generate credentials on demand** and make them expire, so they are rotated automatically.

Instructor's example: developers requesting access to a developer database. Vault issued a username and password valid for **24 hours**. The next day the developer requests new credentials. Regularly rotated credentials reduce the chance of a database breach or data leak.

Demo in the Vault GUI:

| Engine / use case | What happens in the demo |
|---|---|
| **AWS secrets engine** | The developer clicks **Generate** and Vault returns an access key and secret key for local testing. After a configured time Vault deletes them. |
| **Database secrets engine** | The developer requests credentials and Vault returns a username and password. **Lease duration was 1 hour.** After that they are removed. The developer regenerates them or **renews** the lease. |
| **Linux / SSH** | Vault supplies a key and username to log in to a Linux instance. |

```text
Developer --request--> Vault --generates--> temporary credentials (lease: 1h / 24h)
                         |                          |
                         +-- revokes/removes <------+  when the lease expires (or renew)
```

### Other Vault features mentioned

- **Encryption as a service.** The Vault UI can encrypt plain text and decrypt it later. An application can call Vault instead of building its own encrypt/decrypt logic.
- **Hashing** and **random data generation**.
- **GUI.** Vault started as a CLI-only tool, which made learning hard. HashiCorp added a GUI that helps with learning and with managing things securely.

### Benefit at scale

With 200-300 developers all needing database credentials, the database administrator would spend a lot of time generating credentials by hand. With Vault integrated with the backends, Vault does it. The access-management work is taken over by Vault.

Vault is covered more deeply in a separate course (Vault Associate). For the Terraform exam you only need the concepts.

🎯 **Exam focus:** Vault = secrets management + dynamic secrets + encryption as a service. Dynamic secrets have a lease (TTL) and are automatically revoked or rotated. Vault is about secure storage with access control, as opposed to storing secrets in text files or in code.

## F3. Terraform and Vault integration (lecture 147)

### Concept

Terraform has hundreds of providers. The **Vault provider** lets Terraform **read from, write to, and configure** Vault.

Use case: a secret `db_creds` in Vault holds a database username and password. You want Terraform to build (or connect to) a database using those credentials, so you inject the secret into Terraform instead of typing it into `.tf` files.

### Code (`vault.tf`)

```hcl
provider "vault" {
  address = "http://127.0.0.1:8200"
}

data "vault_generic_secret" "demo" {
  path = "secret/db_creds"
}

output "vault_secrets" {
  value     = data.vault_generic_secret.demo.data_json
  sensitive = true
}
```

| Block | Explanation |
|---|---|
| `provider "vault"` | Configures the Vault provider. `address` is where Vault runs (here a local dev address, port 8200). Authentication (for example a token, typically via the `VAULT_TOKEN` environment variable) is also needed; the lecture did not show it. |
| `data "vault_generic_secret" "demo"` | A **data source** that reads a generic secret. `path` is the secret path, `secret/db_creds`. |
| `output "vault_secrets"` | Verifies the data was fetched. `data_json` is a JSON string of the secret's key/value pairs. |
| `sensitive = true` | Hides the output in the CLI. (The repo writes `"true"` as a string.) |

### Demo walkthrough

1. In the Vault UI, under the `secret` engine, create a secret named `db_creds` with data such as `username = admin` and a sample password (the lecture used a trivial demo value).
2. Terraform: `terraform init` (installs the `vault` provider).
3. `terraform apply` first fails with an error like:

```text
no secret found at secret/db-creds
```

   The typo: the path used a hyphen (`db-creds`) while the secret is `db_creds`. Fix the path to `secret/db_creds` and re-run.

4. After the apply, the CLI output is hidden because of `sensitive`:

```text
Outputs:

vault_secrets = <sensitive>
```

5. Open `terraform.tfstate`. The `outputs` section has `vault_secrets` with the secret's values (the demo's admin credentials) in **plain text**.

Practical use: when creating a new database (such as RDS), take the username and password from Vault so the database is built with those credentials.

### Vault AWS secrets engine + Terraform

Vault's AWS engine can generate IAM user credentials (access key + secret key). Terraform can be told to use those keys to perform operations on AWS. **No hard-coding of access and secret keys in Terraform is required.** Terraform fetches the latest keys and acts on AWS. (Only described at a high level in the lecture.)

```text
 Terraform --(1) read secret / ask for AWS creds--> Vault
 Terraform <--(2) db_creds or temporary access+secret key-- Vault
 Terraform --(3) create resources using those values--> AWS
 Terraform --(4) writes the values it read into the state file  <-- the catch
```

### THE exam point

> Interacting with Vault from Terraform causes any secrets you **read and write** to be **persisted in the Terraform state file**. Reading a secret from Vault and passing it to another service means the secret becomes part of state. You must secure the state file so the secrets are not exposed.

Even with `sensitive = true` on an output, the value still sits in state. Ephemeral resources and write-only arguments ([F4](#f4-ephemeral-values-and-write-only-arguments-lecture-149)) are the newer way to avoid this where supported. Check provider support.

> **Up to date (TF 1.12):** Because of the state problem, recent versions of the Vault provider also offer **ephemeral** versions of some secret reads (look for `ephemeral "vault_..."` entries in the Registry docs), so a secret can be read without being stored in state. The lecture covers only `data "vault_generic_secret"`, and that is the form the exam notes use. Setting up Vault from scratch is out of scope for the exam.

🎯 **Exam focus:**

- The Vault provider allows Terraform to read, write and configure Vault.
- Secrets handled through Vault in Terraform are **stored in state**. Protect the state.
- `vault_generic_secret` is the data source used in the lecture.
- Vault as a source avoids hard-coding credentials in `.tf` files.

## F4. Ephemeral values and write-only arguments (lecture 149)

### The challenge

For a database you need a password. Organisations add `sensitive = true`, but that hides the value only in CLI output. **The actual value is still stored in plain text in `terraform.tfstate`.** If the state leaks, the attacker reads API keys, DB passwords and so on.

### The base demo: a secret stored in state

```hcl
resource "random_password" "db_password" {
  length           = 16
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "default" {
  allocated_storage   = 10
  db_name             = "mydb"
  engine              = "mysql"
  engine_version      = "8.0"
  instance_class      = "db.t3.micro"
  username            = "foo"
  password            = random_password.db_password.result
  skip_final_snapshot = true
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
```

```bash
terraform apply -auto-approve

terraform destroy -auto-approve
```

| Block | Purpose |
|---|---|
| `random_password` resource | Generates a 16-character password. `override_special` sets the allowed special characters. |
| `aws_db_instance` | MySQL 8.0 RDS instance on `db.t3.micro` with 10 GB. `password` is fed from the random resource. `skip_final_snapshot = true` avoids a snapshot on destroy. |
| `output "db_password"` | Prints the password. `sensitive = true` means the CLI shows `<sensitive>`. |

Result: the CLI shows `db_password = <sensitive>`, but in `terraform.tfstate`:

- the `outputs` section has the password in **plain text**, and
- the `random_password` resource's `result` attribute **also** holds it in plain text. Even without the output block, the generated password is in state.

RDS creation took about 5 minutes in the demo. Destroy afterwards.

### Part 1: `ephemeral` blocks

An `ephemeral` block defines a **temporary** resource.

- Ephemeral resources have a unique lifecycle.
- **Terraform does not store ephemeral resource information in state or plan files.**
- The syntax change is tiny: replace the `resource` keyword with `ephemeral`.

```hcl
# before (persisted in state)
resource "random_password" "db_password" {
  length = 16
}

# after (temporary, never stored)
ephemeral "random_password" "db_password" {
  length = 16
}
```

Demo: the DB resource was commented out and the `random_password` changed to `ephemeral`. `terraform plan` said no changes to infrastructure. `terraform apply -auto-approve` completed and **nothing appeared in the state file**. When changed back to `resource`, `apply` put the password in state again.

In the Registry docs the same name appears twice for a provider: the normal resource (`random_password`) and the ephemeral resource (`ephemeral random_password`). Check which ones a provider supports.

### Ephemeral values cannot go to normal outputs

Trying `value = ephemeral.random_password.db_password.result` in an ordinary output block, even with `sensitive = true`, makes `terraform plan` fail:

```text
Error: Output value is not declared as returning an ephemeral value
  ... cannot be set to a result derived from an ephemeral value.
```

This is by design. Persisting an ephemeral value to state would defeat the purpose, so Terraform blocks it. (Extra context: outputs of **child modules** can be marked `ephemeral = true`, and input variables can be marked `ephemeral = true` too; see the up-to-date note below.)

### Part 2: write-only arguments

**Write-only arguments** let you securely pass temporary values to Terraform-managed resources during the operation **without persisting them to state or plan files**.

The flow: an ephemeral resource produces a value, and a write-only argument on a normal resource consumes it.

```text
 ephemeral "random_password"           aws_db_instance
 (not in state / plan)  --result-->    password_wo          (write-only)
                                       password_wo_version  (stored)
                                                |
                                                v
                      state: password_wo = null, password_wo_version = N
```

The documentation note quoted in the lecture: for `aws_db_instance`, the write-only argument `password_wo` is available **in place of `password`**. Write-only arguments are supported in **Terraform 1.11.0 or later**.

Step by step from the demo:

1. Replace `password` with `password_wo` and point it at `ephemeral.random_password.db_password.result`.
2. `terraform plan` complains about a missing required argument: **`password_wo_version`**.
3. Add `password_wo_version = 1`. The plan now works.
4. The plan wanted to destroy the earlier `random_password` resource because it was still in state. So the instructor destroyed everything to start from an empty state, then re-planned: **1 to add** (only the DB instance).
5. `terraform apply -auto-approve` ran about 5 minutes. The plan shows only one resource, but at apply time Terraform also **opens (loads) the ephemeral resource** to produce the password. This should not confuse you.
6. Inspect `terraform.tfstate`: the password appears nowhere. `password_wo` is **`null`**. "Terraform has no idea what the password is."

### Why a `_version` argument exists

Because write-only values are not stored, Terraform **cannot tell whether the value changed** and cannot produce a plan diff for them. So providers pair `*_wo` with a `*_wo_version` argument. Terraform **does** store the version in state and can see it change.

```text
password_wo          : invisible to Terraform (never stored, no diff)
password_wo_version  : stored in state, drives change detection

To rotate: bump password_wo_version (1 -> 2 -> 3 ...)
  => Terraform sees a change => re-reads the ephemeral value (new random password)
  => new value is written to the DB
```

### Final code from the lecture

```hcl
ephemeral "random_password" "db_password" {
  length           = 16
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "default" {
  allocated_storage   = 10
  db_name             = "mydb"
  engine              = "mysql"
  engine_version      = "8.0"
  instance_class      = "db.t3.micro"
  username            = "foo"
  password_wo         = ephemeral.random_password.db_password.result
  password_wo_version = 3
  skip_final_snapshot = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name = "db_pass"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id                = aws_secretsmanager_secret.db_password.id
  secret_string_wo         = ephemeral.random_password.db_password.result
  secret_string_wo_version = 3
}

ephemeral "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret_version.db_password.secret_id
}
```

(The repo's clean-up command contains a typo, `terraform destory`; the correct command is `terraform destroy`.)

| Block / argument | Role |
|---|---|
| `ephemeral "random_password"` | Generates the password. Never written to state or plan. |
| `password_wo` | Write-only argument on `aws_db_instance`. Receives the ephemeral value. Stored as `null`. |
| `password_wo_version` | Change trigger. Bumped (1 to 3 in the demo) to push a new password. Stored in state. |
| `aws_secretsmanager_secret` (`name = "db_pass"`) | A secret container in AWS Secrets Manager. |
| `aws_secretsmanager_secret_version` with `secret_string_wo` / `secret_string_wo_version` | Stores the **same** generated password in Secrets Manager using a write-only argument, so it is not in state. |
| `ephemeral "aws_secretsmanager_secret_version"` | An ephemeral way to read a secret version back. It is in the repo's final code but **was not explained in the transcript**. Use it to read the stored secret without persisting it. |

### The Secrets Manager demo ("for completeness, not part of the exam")

Since the password is nowhere in state, how do you connect to the database? The instructor stored it in **AWS Secrets Manager** (secrets are encrypted at rest using KMS).

1. Add the Secrets Manager resources and increment the version (1 to 3; "you can also do two").
2. `terraform apply -auto-approve`. The RDS resource is modified (new password) and the secret is updated.
3. In the AWS console, Secrets Manager, open secret `db_pass`, then **Retrieve secret value**: the plaintext is shown. Retrieval requires IAM permissions; a user without access to Secrets Manager cannot read it.
4. Bumping the version again (3 to 4) generates a new random password, updates the DB, and stores the new value in Secrets Manager. That is the complete lifecycle.
5. **Clean up** by destroying everything to avoid charges.

### Rules to remember

| Point | Detail |
|---|---|
| Version | Write-only arguments need **Terraform 1.11 or later** (ephemeral resources arrived in 1.10). |
| Provider support | The resource must support write-only arguments. **Not all do.** The implementation of write-only and version arguments is **provider-specific**, so check the Registry. The AWS provider supports it for a specific set of resources, such as the database. |
| Input values | Write-only arguments accept **both ephemeral and non-ephemeral** values. |
| State | Write-only arguments are **not stored** in state or plan files. |
| Change detection | Terraform cannot detect or diff a changed write-only value. Providers add a `*_version` argument that Terraform does store. Increment it to trigger an update. |
| Outputs | An ephemeral value cannot be assigned to a regular output. |
| Plan vs apply | The ephemeral resource is opened during apply even when the plan summary shows only one resource to add. |

### Sensitive vs ephemeral vs write-only

| Feature | What it is | Hidden in CLI | Stored in state | Stored in plan |
|---|---|:---:|:---:|:---:|
| `sensitive = true` | Flag on variable/output (or provider-marked attribute) | yes | **yes (plain text)** | yes |
| `ephemeral` block | A temporary resource that produces values | n/a | **no** | **no** |
| Write-only argument (`*_wo`) | A resource argument that accepts a value but never persists it | yes | **no** (`null`) | **no** |
| `*_wo_version` | Companion argument to trigger updates of a write-only value | no | yes (version number only) | yes |

(The lecture states explicitly that sensitive data remains in state. For the plan file, treat the "yes" as extra context.)

> **Up to date (TF 1.12):**
> - **Ephemeral resources** arrived in Terraform **1.10** and **write-only arguments** in **1.11**. Both are current on 1.12, so they can appear on the 004 exam.
> - Beyond ephemeral *resources*, Terraform also lets you mark **input variables** and **outputs of child modules** as `ephemeral = true`. Ephemeral values may be used in other ephemeral contexts: ephemeral resources, `provider` configuration, `provisioner`/`connection` blocks, write-only arguments, and locals or other ephemeral variables/outputs derived from them.
> - Whether a given resource supports write-only arguments, and whether an ephemeral resource exists for a given service (for example `random_password` needs a recent `random` provider; `password_wo` needs a recent `aws` provider), depends on the **provider version**. Always check the Registry docs for your version.

### Gotchas

- `sensitive = true` still leaves plaintext in state. Ephemeral plus write-only solves that, but only where the provider supports it.
- A normal `random_password` **resource** persists its `result` in state even with no output block.
- You cannot output an ephemeral value in a normal output (plan errors).
- `password_wo` alone is not enough. `password_wo_version` is required (plan errors with a missing required argument).
- Changing the password source without bumping `*_wo_version` will not be seen by Terraform, because it cannot diff write-only values.
- Switching from a `resource` to an `ephemeral` for an existing state makes Terraform plan to destroy the old resource.
- You still need a way to retrieve the password for connecting to the DB (Secrets Manager, Vault or another secret store).
- Databases take about 5 minutes to create and destroy. Clean up to avoid charges.

🎯 **Exam focus:**

- `ephemeral` blocks are **not** saved in state or plan files.
- Write-only arguments (usually suffixed `_wo`) need Terraform **1.11+** and a supporting provider resource.
- To change a write-only value, **increment the version argument**.
- `sensitive = true` does not keep values out of state.
- Write-only arguments can take ephemeral and non-ephemeral values.

---

# 🧪 Labs

> Lab 1 uses a tiny paid resource (`t2.micro`, free-tier eligible; destroy it afterwards). Lab 2 and Lab 3 need no cloud account and cost nothing. Lab 4 has a free part and an optional paid part (RDS).

## Lab 1: Lifecycle behaviours on one EC2 instance

**Goal:** see `ignore_changes`, `create_before_destroy` and `prevent_destroy` change what plan/apply does.

1. Make a working folder and a `main.tf` (use a current Amazon Linux AMI ID for your region; the example is `us-east-1`):

```bash
mkdir lab-lifecycle && cd lab-lifecycle
```

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"   # replace with a current AMI for your region
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }
}
```

2. `terraform init` then `terraform apply -auto-approve`. Expected: `Apply complete! Resources: 1 added`.
3. **Default revert:** in the console add a tag `Env = production` to the instance. Run `terraform plan`. Expected: Terraform wants to remove the tag (a `~` update in place, `1 to change`). Do not apply.
4. **`ignore_changes`:** add the lifecycle block and re-plan:

```hcl
  lifecycle {
    ignore_changes = [tags]
  }
```

Expected: `No changes. Your infrastructure matches the configuration.`

5. **`create_before_destroy`:** replace `ignore_changes` with `create_before_destroy = true`, apply, then change the `ami` to a different valid AMI (for example Ubuntu) and run `terraform plan`. Expected: `1 to add, 1 to destroy` with the instance marked `+/-` (create first). Apply and watch the log: `Creation complete` appears before `Destruction complete`. Now remove the lifecycle block, change the AMI again, and compare the apply log: destroy first, then create.
6. **`prevent_destroy`:** add `lifecycle { prevent_destroy = true }` and run `terraform destroy`. Expected: `Error: Instance cannot be destroyed ... lifecycle.prevent_destroy set`.
7. **The loophole:** comment out the whole `aws_instance` block and run `terraform plan`. Expected: the plan shows `1 to destroy`, because the protection went away with the block. (Do not worry; you want this one gone anyway.)
8. **Clean up:** with the block uncommented, set `prevent_destroy = false` (or remove it), then `terraform destroy -auto-approve`, or use the commented-out block approach from step 7 followed by `terraform apply -auto-approve`.

## Lab 2: Validation, precondition, postcondition and check (no cloud needed)

`terraform_data` is a built-in resource, so this lab needs only the Terraform CLI.

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "replicas" {
  type    = number
  default = 2
}

resource "terraform_data" "app" {
  input = "app-${var.environment}"

  lifecycle {
    precondition {
      condition     = var.replicas >= 2 || var.environment != "prod"
      error_message = "prod must have at least 2 replicas."
    }

    postcondition {
      condition     = self.output == "app-${var.environment}"
      error_message = "Output did not match the expected name."
    }
  }
}

check "replica_sanity" {
  assert {
    condition     = var.replicas <= 5
    error_message = "More than 5 replicas is unusually high. Please review."
  }
}
```

1. `terraform init`.
2. `terraform plan -var environment=test`. Expected: **Error: Invalid value for variable** with your message (validation fails at plan time).
3. `terraform plan -var environment=prod -var replicas=1`. Expected: **Error: Resource precondition failed** (`prod must have at least 2 replicas.`); nothing is created.
4. `terraform apply -auto-approve -var environment=dev -var replicas=9`. Expected: the resource is created, plus a **warning** `Check block assertion failed` for `replica_sanity`. The run still succeeds because a check only warns.
5. Break the postcondition on purpose: change it to `self.output == "something-else"` and apply again after changing the input (for example `-var environment=staging`). Expected: `Error: Resource postcondition failed`. Because the resource was updated before the postcondition was evaluated, inspect `terraform state list` and see it still exists.
6. **Clean up:** restore the postcondition and run `terraform destroy -auto-approve -var environment=dev`.

## Lab 3: What `sensitive` hides, and what it does not

Uses only the `local` provider.

```hcl
variable "password" {
  default   = "supersecretpassw0rd"
  sensitive = true
}

resource "local_sensitive_file" "foo" {
  content  = var.password
  filename = "password.txt"
}

output "pass" {
  value = local_sensitive_file.foo.content
}
```

1. `terraform init`, then `terraform plan`. Expected: `content = (sensitive value)` and then **Error: Output refers to sensitive values**.
2. Add `sensitive = true` to the output and run `terraform apply -auto-approve`. Expected: `pass = <sensitive>`.
3. Check the file: `cat password.txt` shows the real password.
4. Look inside the state: `grep -n supersecret terraform.tfstate`. Expected: the password appears in plain text (in the outputs section and the resource).
5. Run `terraform output` (shows `<sensitive>`), then `terraform output pass` (prints the real value). Note how little protection `sensitive` is against someone who can run commands in the project.
6. Remove everything: `terraform destroy -auto-approve`, and delete `password.txt`, `terraform.tfstate*`.

## Lab 4: Ephemeral and write-only

**Part 1 (free):** needs Terraform 1.10+ and a recent `random` provider.

```hcl
terraform {
  required_providers {
    random = { source = "hashicorp/random" }
  }
}

ephemeral "random_password" "db_password" {
  length = 16
}

resource "terraform_data" "marker" {
  input = "just so apply has something to do"
}
```

1. `terraform init && terraform apply -auto-approve`.
2. `cat terraform.tfstate`. Expected: you see `terraform_data.marker` but **no password** and no `random_password` entry.
3. Change `ephemeral "random_password"` to `resource "random_password"` (and fix any references), apply, and grep the state again. Now `result` appears in plain text. Change it back.
4. Add `output "pw" { value = ephemeral.random_password.db_password.result }` and run `terraform plan`. Expected: the error saying the output cannot be set to a result derived from an ephemeral value.

**Part 2 (optional, costs a few cents; RDS takes about 5 minutes to create and 5 to destroy):** use the lecture's final code, with `password_wo` and `password_wo_version = 1`.

1. `terraform apply -auto-approve`. Check `terraform.tfstate`: `password_wo` is `null` and the password appears nowhere.
2. Bump `password_wo_version` to `2` and run `terraform plan`. Expected: the DB instance shows an in-place change driven by the version number.
3. **Clean up:** `terraform destroy -auto-approve` (also deletes the Secrets Manager secret if you added it).

---

## 🎯 Exam focus (summary)

- **Lifecycle arguments:** `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by` (plus `precondition` / `postcondition`). All sit in a `lifecycle {}` block.
- Default replacement is **destroy then create**; `create_before_destroy = true` reverses it.
- `prevent_destroy = true` stops a plan that would destroy the resource, but **removing the block** from the config removes the protection.
- `ignore_changes = [a, b]` ignores listed attributes; `ignore_changes = all` ignores everything, including your own config edits (create and destroy still work).
- Default behaviour: manual changes are detected and reverted at the next apply.
- **Validation** (in `variable`) checks inputs at plan time. Provider validation is partial, so plan can pass and apply fail.
- **Precondition** (before) / **postcondition** (after), in `lifecycle`; `self` only in postconditions; Terraform 1.2+; resources, data sources and outputs.
- **Check blocks** (`check` + `assert`) report **warnings**, not errors.
- `sensitive = true` hides values in CLI and logs. **State still contains plain text.** Outputs referencing sensitive values must be sensitive.
- Vault: dynamic secrets, leases. Terraform + Vault: secrets read are **persisted in state**, so protect state.
- **Ephemeral** blocks and **write-only** (`*_wo`) arguments keep values out of state and plan; write-only needs Terraform **1.11+**; bump `*_wo_version` to change a value; ephemeral values cannot go into normal outputs.
- Never commit state to Git ([10](10-backends-locking-drift.md)).

### Common traps

| Trap | Reality |
|---|---|
| "`sensitive = true` encrypts the state." | No. It only masks CLI output/logs. |
| "`prevent_destroy` keeps the resource safe even if I delete the block." | No, it only works while it is in the config. |
| "`ignore_changes = all` only ignores manual changes." | It also ignores your own config edits. |
| "`self` can be used in a precondition." | Only in postconditions. |
| "A failing postcondition rolls back the resource." | The resource still exists; later plans fail until fixed. |
| "A failed `check` stops the apply." | It only warns. |
| "Reading a secret from Vault keeps it out of state." | It is stored in state (unless you use ephemeral reads). |
| "Changing `password_wo` triggers an update." | Terraform cannot see it; bump `password_wo_version`. |

---

## Key takeaways

1. By default Terraform creates missing resources, destroys removed ones, updates in place when it can, and replaces when the API forbids an in-place update. It also reverts manual changes.
2. Meta-arguments: `depends_on`, `count`, `for_each`, `lifecycle`, `provider`.
3. `create_before_destroy` flips the replacement order; `prevent_destroy` blocks destroy plans (but not deleting the block); `ignore_changes` skips listed attributes or `all`; `replace_triggered_by` forces replacement when a referenced item changes.
4. Provider validation is not complete. Use `validation { condition, error_message }` on variables to fail early at plan time.
5. Preconditions run before and postconditions after a resource is evaluated. `self` is only for postconditions. They need Terraform 1.2+.
6. Check blocks hold assertions that only warn.
7. `sensitive = true` is about screens and logs, not state. State files contain secrets, so protect them and never commit them to Git.
8. Vault provides secure storage and dynamic secrets; Terraform can read from it, but what it reads goes into state.
9. `ephemeral` blocks and write-only arguments (Terraform 1.10/1.11+) keep secrets out of state and plan files. Bump the `_version` argument to rotate a write-only value.
10. You still need a safe place to keep a secret you can no longer read from state (Vault, Secrets Manager).

---

## Quick syntax cheat-sheet

```hcl
# Lifecycle
resource "aws_instance" "x" {
  # ...
  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
    ignore_changes        = [tags, instance_type]   # or: all
    replace_triggered_by  = [aws_security_group.web.id]

    precondition {
      condition     = data.aws_ec2_instance_type.t.free_tier_eligible
      error_message = "Only free tier."
    }
    postcondition {
      condition     = self.public_ip != ""
      error_message = "Needs a public IP."
    }
  }
}

# Variable validation
variable "db_password" {
  type      = string
  sensitive = true
  validation {
    condition     = length(var.db_password) >= 12
    error_message = "At least 12 characters."
  }
}

# Check block
check "site_up" {
  data "http" "site" { url = "https://example.com" }
  assert {
    condition     = data.http.site.status_code == 200
    error_message = "Site is down."
  }
}

# Sensitive output
output "pass" {
  value     = local_sensitive_file.foo.content
  sensitive = true
}

# Vault
provider "vault" { address = "http://127.0.0.1:8200" }
data "vault_generic_secret" "demo" { path = "secret/db_creds" }

# Ephemeral + write-only
ephemeral "random_password" "pw" { length = 16 }
resource "aws_db_instance" "db" {
  password_wo         = ephemeral.random_password.pw.result
  password_wo_version = 1       # bump to rotate
}
```

| Need | Use |
|---|---|
| Build the replacement before removing the old one | `create_before_destroy = true` |
| Refuse to delete a critical resource | `prevent_destroy = true` |
| Tolerate out-of-band edits | `ignore_changes = [...]` |
| Rebuild B when A changes | `replace_triggered_by = [A]` |
| Reject bad input | `validation` in the `variable` |
| Assume something before build / verify after | `precondition` / `postcondition` |
| Monitor without blocking | `check` + `assert` |
| Hide a value in CLI | `sensitive = true` |
| Keep a value out of state | `ephemeral` + write-only (`*_wo`) |

---

## ❓ Quiz

1. You change the AMI of an EC2 instance in your configuration. By default, in what order does Terraform replace it, and which lifecycle setting changes that order?
2. A colleague adds a tag to a Terraform-managed instance in the console. What does the next `terraform plan` show by default? Name two ways to stop Terraform removing the tag.
3. You set `prevent_destroy = true` on an RDS resource. Later someone deletes the whole `aws_db_instance` block from the file and runs `terraform apply`. What happens, and why?
4. What is the difference between `ignore_changes = [tags]` and `ignore_changes = all`? Which one ignores edits you make to your own `.tf` file?
5. True or false: `lifecycle` arguments such as `prevent_destroy` can be set from a variable (`prevent_destroy = var.protect`).
6. `terraform plan` passes for an S3 bucket named `hi`, but `terraform apply` fails. Why, and what feature helps catch it at plan time?
7. Which three parts make up an input variable validation, and in which block is the `validation` placed?
8. Look at this code. Will `terraform plan` succeed?

   ```hcl
   resource "aws_instance" "x" {
     instance_type = "t2.micro"
     ami           = "ami-123"
     lifecycle {
       precondition {
         condition     = self.public_ip != ""
         error_message = "No IP"
       }
     }
   }
   ```
9. A postcondition on a new EC2 instance fails during `apply`. Does the instance exist afterwards? Can you still run `terraform destroy`?
10. How does a `check` block differ from a precondition when its assertion is false?
11. What does `sensitive = true` on a variable protect, and what does it not protect?
12. An output refers to `local_sensitive_file.foo.content` but is not marked `sensitive`. What happens?
13. Why do secrets read from Vault via `data "vault_generic_secret"` still need state protection?
14. Which Terraform version introduced write-only arguments, and why does `aws_db_instance` need `password_wo_version` alongside `password_wo`?
15. You try `value = ephemeral.random_password.db_password.result` in a root-module `output`. What happens?

### Answers

1. Default is **destroy the old, then create the new**. `lifecycle { create_before_destroy = true }` reverses it (create first, destroy after).
2. Terraform proposes **removing** the tag (it is not in the config) and applying reverts it. Stop it with `lifecycle { ignore_changes = [tags] }` (or `all`), or add the tag to the configuration.
3. Terraform plans to **destroy** the database. `prevent_destroy` only works while it is present in the configuration; removing the block removes the setting too.
4. `[tags]` ignores only the listed attribute(s). `all` ignores every attribute, so Terraform never proposes updates, including for edits you make to your own `.tf` file. Create and destroy still work with `all`.
5. **False.** Those values must be literals, because Terraform needs them before it evaluates variables during graph building. (`replace_triggered_by` and conditions do take references.)
6. The AWS provider did not validate the 3 to 63 character rule at plan time, so the error only appears when AWS rejects the API call. A `validation` block on the bucket-name variable (for example `length(var.bucket_name) >= 3`) catches it at plan time.
7. The `validation` block, a `condition` (boolean expression that must be true), and an `error_message`. The `validation` block is nested inside the `variable` block.
8. **No.** `self` is available only in postconditions. In a precondition the object does not exist yet, so Terraform reports an error.
9. Yes, the instance **was created**, then the postcondition error stops the operation and later plans fail until fixed. `terraform destroy` still works.
10. A failed precondition is an **error** and stops the run before the object is built. A failed `check` assertion is a **warning**; the run continues.
11. It hides the value in CLI output (`(sensitive value)` / `<sensitive>`) and logs. It does **not** protect or encrypt the value in `terraform.tfstate` (or the plan file).
12. Terraform raises an error ("Output refers to sensitive values") and requires `sensitive = true` on the output.
13. Because anything Terraform reads or writes (including values from `vault_generic_secret`) is persisted in the state file in plain text. Protect the state (encrypted remote backend, restricted access, never in Git), or use ephemeral reads where supported.
14. Terraform **1.11**. Terraform cannot store or diff a write-only value, so it stores `password_wo_version` instead; incrementing the version tells Terraform the value has changed and should be re-sent.
15. `terraform plan` fails: an ephemeral value cannot be assigned to a regular output, because that would persist it to state.

---

## Glossary

| Term | Meaning |
|---|---|
| **Meta-argument** | A special argument available on resource blocks that changes how Terraform treats them: `depends_on`, `count`, `for_each`, `lifecycle`, `provider`. |
| **`lifecycle` block** | Resource block section that customises create/update/destroy behaviour and holds pre/postconditions. |
| **Forces replacement** | Plan annotation meaning the changed argument cannot be updated in place; the resource will be destroyed and re-created. |
| **Drift** | A difference between real infrastructure and the configuration/state, often from manual changes. |
| **`validation` block** | Rule inside a `variable` that rejects bad values at plan time. |
| **Precondition / postcondition** | Custom conditions checked before / after a resource, data source or output is evaluated. |
| **`self`** | Reference to the resource being evaluated; usable only in postconditions. |
| **`check` block** | Top-level block of non-blocking assertions (`assert`) that produce warnings. |
| **Sensitive value** | A value Terraform masks in CLI output and logs. It is not removed from state. |
| **`local_sensitive_file`** | `local` provider resource that writes a file and treats its content as sensitive. |
| **HashiCorp Vault** | Secrets management tool: secure storage, access control, dynamic secrets, encryption as a service. |
| **Dynamic secret / lease** | A credential Vault generates on demand and that is valid only for a limited lease, renewable or revocable. |
| **`vault_generic_secret`** | Vault-provider data source that reads a secret at a path; `data_json` holds its key/values as JSON. |
| **Ephemeral resource** | A temporary resource declared with an `ephemeral` block; never stored in state or plan files. |
| **Write-only argument** | Resource argument (usually `*_wo`) that accepts a value but is never persisted; needs Terraform 1.11+. |
| **`*_wo_version`** | Companion argument Terraform does store; increment it to trigger an update of a write-only value. |
| **AWS Secrets Manager / KMS** | AWS service that stores secrets encrypted at rest using KMS keys. |
