# 03 — The Core Terraform Workflow

> **Exam domain(s):** Understand the Terraform workflow (init, plan, apply, destroy), Navigate Terraform workflow, Read/generate/modify configuration (fmt, validate, comments, settings block, file loading)   **Source:** lesson 3 (lectures 25, 31 and the workflow cheat-sheet) and lesson 4 (lectures 75, 76, 78, 81, 82, 83, 84, 85, 86, 88)   **Time:** ~4 h

## What you will learn

- The full day-to-day loop: **write -> `init` -> `fmt` -> `validate` -> `plan` -> `apply` -> change -> `plan` -> `apply` -> `destroy`**, and what each command does (and does not do).
- How to launch your first EC2 instance with Terraform, modify it in place (adding a tag) and tear it down again.
- Three ways to remove infrastructure: `terraform destroy`, `terraform destroy -target`, and deleting/commenting out the code.
- How to keep code tidy with `terraform fmt` (`-diff`, `-recursive`, `-check`) and how to catch mistakes early with `terraform validate`.
- How Terraform **loads files** from a folder (`.tf`, `.tf.json`, alphabetical, no subfolders, unique addresses) and how to write **comments**.
- How to **save a plan** (`plan -out`), apply exactly that plan, and read it with `terraform show`.
- How to read outputs (`terraform output`) and visualise dependencies (`terraform graph`).
- What goes into the **`terraform {}` settings block** (`required_version`, `required_providers`, `backend`) and how to fix the "inconsistent dependency lock file" error.
- How and when to use **resource targeting** (`-target`) and how to deal with **large infrastructure** (API throttling, `-refresh=false`, splitting projects, `-parallelism`).

## 🧠 Pre-concept

Think of Terraform like building a house from a blueprint with a very careful site manager.

| Building analogy | Terraform |
|---|---|
| Blueprint | Your `.tf` files (the **desired state**) |
| Site manager's notebook | The **state file** (what Terraform believes exists) |
| Hiring the specialist trades (plumber, electrician) | `terraform init` — downloads the **provider plugins** |
| Proofreading the blueprint for typos | `terraform fmt` and `terraform validate` |
| "Here is what I am going to build/change/demolish — OK?" | `terraform plan` |
| Actually building | `terraform apply` |
| Demolition | `terraform destroy` |

Two ideas run through the whole chapter:

1. **Terraform never acts without showing you a plan first.** `plan` is a *dry run*: it changes nothing. `apply` computes the same plan, shows it, and (unless you pass `-auto-approve`) waits for you to type `yes`.
2. **Everything in the folder counts.** Terraform reads *every* `.tf` file in the directory you run it from, merges them into one configuration, and manages *every* resource it finds. Almost every flag in this chapter (`-target`, `-refresh=false`, `-out`) exists to narrow or control that behaviour.

If you are unsure what the state file is, skim [04 — State basics](04-state-basics.md) first; for provider installation and versions, see [02 — Providers](02-providers.md).

---

## 1. The big picture: the core loop

```text
 write .tf files
       |
       v
 terraform init      <- download providers (and modules), set up the backend
       |
       v
 terraform fmt       <- (optional but recommended) tidy the style
 terraform validate  <- (optional but recommended) catch syntax/consistency errors
       |
       v
 terraform plan      <- preview: what will be added / changed / destroyed
       |
       v
 terraform apply     <- do it (asks for "yes")
       |
       v
 change the code ──► plan ──► apply        (repeat as often as needed)
       |
       v
 terraform destroy   <- remove everything this folder manages
```

Quick reference of the commands in this chapter:

| Command | One-line purpose | Changes real infrastructure? |
|---|---|---|
| `terraform init` | Prepare the folder: download providers/modules, create the lock file | No |
| `terraform fmt` | Rewrite code into canonical style | No (only your files' appearance) |
| `terraform validate` | Check syntax and internal consistency | No |
| `terraform plan` | Show what *would* happen | No |
| `terraform apply` | Make it happen (after confirmation) | **Yes** |
| `terraform destroy` | Delete everything this configuration manages | **Yes** |
| `terraform show` | Print the state or a saved plan in readable form | No |
| `terraform output` | Print output values stored in state | No |
| `terraform graph` | Print the dependency graph (DOT format) | No |

---

## 2. Your first VM through Terraform (lecture 25)

### 2.1 Vocabulary: "virtual machine" depends on the provider

A *virtual machine* (VM) is a server that runs as software on someone else's hardware. Every cloud gives it a different name, and so does Terraform:

| Platform | Their name for a VM | Terraform resource type |
|---|---|---|
| AWS | EC2 instance (Elastic Compute Cloud) | `aws_instance` |
| DigitalOcean | Droplet | `digitalocean_droplet` |

The concept is the same; only the resource type changes.

### 2.2 What you must decide when creating a VM

| Decision | Meaning | Where it goes in Terraform |
|---|---|---|
| **Region** | Where the server physically lives (US, Asia, Europe...). Each region has a code, e.g. `us-east-1` (N. Virginia), `ap-southeast-1` (Singapore). | `region` argument in the **`provider`** block |
| **Configuration** | OS, CPU, memory, storage... | `ami` (the OS image) and `instance_type` (CPU + memory) in the **resource** |

Two AWS words to know:

- **AMI (Amazon Machine Image)** — the operating-system image your server boots from (Amazon Linux, Ubuntu, Windows...).
- **Instance type** — a CPU + memory combination. `t2.micro` (1 vCPU, 1 GiB RAM) is **free-tier eligible**; something like `c3.8xlarge` (32 vCPU, 60 GiB) is very expensive.

> ⚠️ **Gotcha:** AMI IDs are **different in every region** for the same OS. In the lecture the Singapore ID ended `...9F57` while N. Virginia's ended `...8778`. If you change `region`, you almost always have to change `ami` too. (Also, AWS retires old AMIs, so an ID from a course video may no longer exist when you try it — look up a current Amazon Linux AMI ID for your region in the console, or use a data source; see section 2.8.)

### 2.3 First, do it by hand (to understand what you automate)

The instructor first launched an instance manually in the AWS console (Name: "manual EC2"): picked Amazon Linux, instance type `t2.micro`, "proceed without a key pair", then **Launch**. The state moves from *pending* to *running*. The goal of the lecture: create the *same* thing with Terraform instead.

### 2.4 Project setup

1. Create an empty folder (the instructor used `kplabs-terraform`) and open it in your editor (VS Code in the course).
2. Create a file called `first_ec2.tf`. The **file name is free; the extension must be `.tf`**.
3. Open a terminal **inside that folder**. Terraform commands only look at the *current directory*.

> ⚠️ **Gotcha:** The classic beginner mistake is running `terraform init` from the wrong directory and getting "No configuration files". Run `pwd` (macOS/Linux) or `cd` (Windows) to check where you are.

### 2.5 The code (`first_ec2.tf`)

This is the code exactly as taught in the lecture. The keys are **placeholders**; never put real keys in a file you might commit (section 2.9 and [02 — Providers](02-providers.md) show the safe way).

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "PUT-YOUR-ACCESS-KEY-HERE"
  secret_key = "PUT-YOUR-SECRET-KEY-HERE"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

Line by line:

| Line | Meaning |
|---|---|
| `provider "aws" { ... }` | Declares that this configuration uses the **AWS provider**. The label (`"aws"`) changes with the platform (`"github"`, `"azurerm"`...). The instructor copied it from the provider docs ("Authentication" -> basic usage). |
| `region = "us-east-1"` | The region in which all resources of this provider are created. |
| `access_key` / `secret_key` | The credentials generated when you created the IAM user. **Placeholders — see the warning above.** |
| `resource "aws_instance" "myec2"` | Declares a resource. `aws_instance` is the **resource type** (fixed by the provider). `myec2` is the **local name** (your choice). Together, `aws_instance.myec2`, they form the resource's **address**. |
| `ami = "ami-..."` | The OS image. Region-specific. |
| `instance_type = "t2.micro"` | CPU/memory size; free-tier eligible. |

Where did `aws_instance` come from? In the AWS provider documentation (registry.terraform.io -> Providers -> hashicorp/aws -> Documentation) the left menu lists services (EC2, S3, IAM...). Under *EC2* there are many resources (`aws_key_pair`, `aws_instance`...). Each resource page has:

- **Example Usage** — copy-paste starting point.
- **Argument Reference** — every option you can set (networking, IP address, firewall...). You only have to supply the *required* ones to start.

### 2.6 The three commands and what they print

```bash
terraform init
terraform plan
terraform apply
```

| Command | What happens in the demo |
|---|---|
| `terraform init` | Downloads the AWS provider plugin into the working directory (a minute or two — the plugin is large). **Run it the first time and every time you add a provider.** |
| `terraform plan` | Prints "Terraform will perform the following actions: # aws_instance.myec2 will be created ...". **Creates nothing.** Ends with `Plan: 1 to add, 0 to change, 0 to destroy.` |
| `terraform apply` | Prints the same plan, then `Do you want to perform these actions?` and waits for you to type `yes`. The instance was created in about 37 seconds; check the EC2 console in N. Virginia — one running `t2.micro`. |

Expected shape of the output (abridged):

```text
$ terraform init

Initializing the backend...
Initializing provider plugins...
- Finding latest version of hashicorp/aws...
- Installing hashicorp/aws v5.x.x...
- Installed hashicorp/aws v5.x.x (signed by HashiCorp)
Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. ...

Terraform has been successfully initialized!

$ terraform apply

Terraform will perform the following actions:

  # aws_instance.myec2 will be created
  + resource "aws_instance" "myec2" {
      + ami                          = "ami-00c39f71452c08778"
      + instance_type                = "t2.micro"
      + id                           = (known after apply)
      + public_ip                    = (known after apply)
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.

Do you want to perform these actions?
  Enter a value: yes

aws_instance.myec2: Creating...
aws_instance.myec2: Creation complete after 37s [id=i-0abc123...]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

`(known after apply)` means the value (such as the instance ID or public IP) is generated by AWS and cannot be known until the resource exists.

### 2.7 Changing a resource: adding a tag

Add a `tags` block (copied from the docs example) to give the instance a name:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"

  tags = {
    Name = "my first EC2"
  }
}
```

- `terraform plan` now says **`Plan: 0 to add, 1 to change, 0 to destroy.`** — an **in-place update** (the line is marked `~`).
- `terraform apply` -> `yes` -> the console shows the name.
- Next, remove the `tags` block and run **`terraform apply` directly** (the instructor deliberately skipped `plan`). Apply prints the plan, asks for `yes`, and removes the tag; the Name disappears in the console.

The instructor's remark: `plan` is important to run in production to see what will change; `apply` also computes and shows the plan first and waits for approval, so running `plan` separately is *optional but a good habit*.

Symbols you will see in plan output:

| Symbol | Meaning |
|---|---|
| `+` | will be **created** |
| `-` | will be **destroyed** |
| `~` | will be **updated in place** |
| `-/+` | will be **destroyed and re-created** (a *replacement*; e.g. when an argument cannot be changed in place) |
| `+/-` | re-created with `create_before_destroy` (new first, then old) — see [08](08-lifecycle-conditions-sensitive.md) |
| `<=` | data source will be read |

> **Extra context:** the symbol table is general Terraform knowledge, not from the lecture notes, but you will see it constantly.

### 2.8 Provider vs resource — the lasting insight

Today the resource is a VM; tomorrow it may be a database. The **resource block changes, but the provider block stays the same** as long as you work with the same platform, because the provider holds the authentication and the region.

```text
        +--------------------+
        |  first_ec2.tf      |
        |  provider "aws"    |  <- stays the same (auth + region)
        |  resource  ...     |  <- changes with what you build
        +--------------------+
```

**Extra context — a data source instead of a hard-coded AMI.** The instructor's repo also has an `example.tf` (not discussed in the transcripts) that *looks up* the latest Ubuntu AMI instead of hard-coding it. It sidesteps the "AMI IDs differ per region" problem. Data sources are explained in [05 — Resources, data and dependencies](05-resources-data-dependencies.md); treat this as a preview.

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name = "HelloWorld"
  }
}
```

### 2.9 Credentials: hard-coded keys are for the very first demo only

Putting `access_key` and `secret_key` inside `.tf` files is dangerous: the file ends up in Git and the keys leak. The course removes them in a later lecture by using the AWS CLI's shared credentials file (`aws configure`) or environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`). The full set of authentication methods lives in [02 — Providers](02-providers.md). For every lab in this chapter, **delete the two key lines** and rely on `aws configure`.

🎯 **Exam focus (lecture 25):**
- Workflow: `init` -> `plan` -> `apply`.
- `init` downloads provider plugins; run it whenever you add a new provider.
- `plan` = preview, changes nothing; `apply` = does it (prompts for `yes` unless `-auto-approve`).
- Terraform files end in `.tf`; any file name works.

---

## 3. `terraform init` in depth

`init` prepares a working directory. It is the first command you run in any new or freshly cloned configuration, and it is **safe to run repeatedly** (it never destroys anything).

### 3.1 What init does

| Job | Detail |
|---|---|
| Downloads **provider plugins** | Into the hidden `.terraform/` folder (can be hundreds of MB for AWS) |
| Creates/updates the **dependency lock file** | `.terraform.lock.hcl` records exactly which provider versions were chosen. See [02 — Providers](02-providers.md) |
| Downloads **modules** | Any `module` blocks with remote sources are fetched into `.terraform/modules/` — see [09 — Modules](09-modules.md) |
| Initialises the **backend** | Where state is stored (local file by default, or S3, HCP Terraform...) — see [10 — Backends](10-backends-locking-drift.md) |

### 3.2 When must you run it again?

- You add a new `provider` or change `required_providers` (new provider -> new download).
- You add or change a `module` source.
- You change the `backend` configuration.
- You clone a repo (the `.terraform/` folder is not committed).
- You change a provider version constraint (see section 11.4).

### 3.3 Useful flags

| Flag | Meaning |
|---|---|
| `terraform init -upgrade` | Ignore the versions pinned in the lock file and select the **newest versions allowed by your constraints**; updates the lock file. Also re-downloads modules. |
| `terraform init -reconfigure` | Re-initialise the backend, ignoring the existing backend configuration (does not migrate state) |
| `terraform init -migrate-state` | Move existing state to a newly configured backend |
| `terraform init -backend=false` | Skip backend initialisation (handy for `validate` in CI) |
| `terraform init -input=false` | Never prompt (for automation) |

> **Extra context:** only `-upgrade` appears in the lecture notes; the rest are standard Terraform CLI options worth knowing.

### 3.4 Files and folders Terraform creates

| Item | Purpose |
|---|---|
| `*.tf` | **Your** configuration (desired state). All `.tf` files in the folder are read together. |
| `.terraform/` | Downloaded provider plugins and modules (do not commit) |
| `.terraform.lock.hcl` | Dependency lock file — records provider versions (**do commit this**) |
| `terraform.tfstate` | Local **state** (JSON) — Terraform's database of managed resources (do not commit; may hold secrets) |
| `terraform.tfstate.backup` | Backup of the previous state |

See [04 — State basics](04-state-basics.md) for state and [10](10-backends-locking-drift.md) for `.gitignore` guidance.

---

## 4. `terraform plan` and `terraform apply` in depth

### 4.1 plan

`terraform plan` does four things:

1. **Refreshes** the state: asks each provider for the current real-world status of every resource already in state ("Refreshing state..." lines).
2. **Compares** that against your configuration (desired state).
3. **Calculates** the actions needed.
4. **Prints** them and a summary: `Plan: X to add, Y to change, Z to destroy.` (or `No changes. Your infrastructure matches the configuration.`)

It makes **no changes** to infrastructure. It also does not modify the state file (the old `terraform refresh` command did — see [04](04-state-basics.md)).

Three situations to memorise (from the destroy lecture):

```text
Code present, resource missing    -> plan: ADD
Code removed, resource exists     -> plan: DESTROY
Code matches the resource         -> plan: no changes
```

### 4.2 apply

`terraform apply` = plan + (confirmation) + execute. It shows the plan, asks `Do you want to perform these actions?`, and only a literal `yes` continues. Anything else cancels. It then updates the state file.

| Form | Behaviour |
|---|---|
| `terraform apply` | Plan, show, ask for `yes`, execute |
| `terraform apply -auto-approve` | Same, but **skip the prompt** (used in lectures 32 and 36 and in CI/CD). Be careful: nothing stops a destructive change. |
| `terraform apply <planfile>` | Apply a **saved plan** exactly as saved; no new plan is made and no prompt is shown (section 8) |
| `terraform apply -replace="addr"` | Force one resource to be destroyed and re-created — see [11](11-import-state-cli-logging.md) |
| `terraform apply -target=addr` | Limit to specific resources (section 12) |
| `terraform apply -refresh-only` | Update the state to match reality, nothing else — see [04](04-state-basics.md) |

### 4.3 Flags shared by plan, apply and destroy

| Flag | Purpose |
|---|---|
| `-var 'name=value'` | Set one input variable on the command line. See [06 — Variables](06-variables-outputs-locals.md) for all methods and precedence. |
| `-var-file="file.tfvars"` | Load variable values from a named file. `terraform.tfvars` and `*.auto.tfvars` load automatically; other names need this flag. |
| `-target=addr` | Operate only on the given resource(s) (section 12). |
| `-refresh=false` | Skip the refresh step (section 13). |
| `-refresh-only` | Only reconcile state with reality. |
| `-replace=addr` | Force replacement of a resource ([11](11-import-state-cli-logging.md)). |
| `-destroy` | Plan/apply the destruction of everything (`terraform destroy` is a shortcut for this). |
| `-parallelism=n` | Max number of resource operations at once (default 10) — section 13. |
| `-lock=false` | Do not take a state lock ([10](10-backends-locking-drift.md)). Risky. |
| `-input=false` | Never ask for input (error instead). For pipelines. |
| `-out=file` | **plan only**: save the plan (section 8). |
| `-detailed-exitcode` | **plan only**: exit code `0` = no changes, `1` = error, `2` = changes present. Useful in CI. |

> **Extra context:** `-detailed-exitcode`, `-parallelism`, `-lock`, `-input` and `-destroy` are standard CLI options not covered in the lecture notes; the lectures cover `-target`, `-refresh=false`, `-var-file`, `-out`, `-auto-approve`, `-replace` and `-refresh-only`.

### 4.4 Saving a plan and `-var`

Variables passed with `-var` at plan time are baked into a saved plan; you do not (and cannot) change them at apply time when applying a plan file. More in section 8.

---

## 5. `terraform destroy` (lecture 31)

### 5.1 Why destroy?

Cloud resources left running cost money. AWS has a free tier for the first year; after that you are billed. **Best practice: when you finish testing, destroy what you created.** At this point in the course the demo folder held two resources: an EC2 instance (`aws_instance.myec2`) and a GitHub repository (`github_repository.example`).

### 5.2 Approach 1 — destroy everything: `terraform destroy`

```bash
terraform destroy
```

Destroys **all resources managed by the configuration in the current folder**. It lists them and asks for `yes`. In the demo the instructor typed **`no`** to cancel and nothing was destroyed. (`terraform destroy` is the same as `terraform apply -destroy`.)

### 5.3 Approach 2 — destroy one resource: `-target`

If you want to remove only the server and keep the GitHub repo, plain `destroy` is wrong. Use `-target` with `resource_type.local_name`:

```bash
terraform destroy -target aws_instance.myec2
```

| Part | Meaning |
|---|---|
| `-target` | Focus the operation on a subset of resources |
| `aws_instance` | resource **type** |
| `.` | separator |
| `myec2` | resource **local name** |

In the demo: the plan shows **1 to destroy**; the instance was confirmed running first; after `yes` the destroy took about 2.5 minutes; the console then shows **terminated** (refresh the page if it still says running). The GitHub repository was untouched.

### 5.4 Approach 3 — delete (or comment out) the code

Important: destroying a resource does **not** remove its code. Because the code for `aws_instance.myec2` is still in the `.tf` file, **Terraform assumes you want it to exist** — the next `terraform plan` says **1 to add** and would re-create the EC2 instance.

To keep it gone, **remove** the block or **comment it out** (`#`, `//` or `/* ... */`, section 10). With the block commented out, `terraform plan` does nothing for EC2 — it's no longer in the desired state.

The reverse also works: comment out the `github_repository` block while the repo still exists in real life, and `terraform plan` shows it will be **destroyed** (the resource is in state, but no longer in code). This ties to desired vs current state in [04](04-state-basics.md).

### 5.5 Comparison

| Approach | Command | Removes | Code left in files | Next `plan` |
|---|---|---|---|---|
| Destroy all | `terraform destroy` | Everything in this folder's configuration | Still there | Wants to **add** everything again |
| Destroy one | `terraform destroy -target type.name` | One resource | Still there | Wants to **add** that resource again |
| Delete/comment code, then `apply` | `terraform apply` | Resource whose code was removed | Gone | No changes |

> ⚠️ **Gotcha:** `terraform destroy` with no arguments destroys **everything in that directory's configuration**. Read the list before typing `yes`.
>
> ⚠️ **Gotcha:** `destroy` does **not** delete the state file (`terraform.tfstate` stays, now with no resources).
>
> ⚠️ **Gotcha:** `-target` is for exceptional situations; Terraform prints a warning when you use it (section 12).

🎯 **Exam focus (lecture 31):**
- `terraform destroy` -> destroys all resources managed by that working directory.
- `terraform destroy -target <type>.<name>` -> destroys a specific resource.
- Removing/commenting a resource block and running `apply` also destroys that resource.
- `-target` combines resource **type** and **local name**.

---

## 6. `terraform fmt` — canonical formatting (lecture 75)

### 6.1 Why

`terraform fmt` rewrites configuration files into the **canonical format and style**. In large organisations many engineers edit the same code, each with their own style, which makes reviews painful. Badly indented code is **not an error** — `plan` and `apply` still work — but `fmt` makes it readable and consistent, and fixing it by hand does not scale to hundreds of lines and modules.

Before:

```hcl
resource "local_file" "foo" {
      content  = "Hello from KPLABS!"
  filename = "${path.module}/kplabs.txt"
}
```

After `terraform fmt`:

```hcl
resource "local_file" "foo" {
  content  = "Hello from KPLABS!"
  filename = "${path.module}/kplabs.txt"
}
```

The older repo example uses an AWS provider (credentials are placeholders):

```hcl
provider "aws" {
       region     = "us-west-2"
  access_key          = "YOUR-ACCESS-KEY"
  secret_key = "YOUR-SECRET"
  version = ">=2.10,<=2.30"
}

resource "aws_instance" "myec2" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = "t2.micro"
}
```

(Note: the `version` argument inside a `provider` block is **deprecated/removed** in modern Terraform; use `required_providers` — see [02](02-providers.md).)

### 6.2 Basic command

```bash
terraform fmt
```

- Does **not** ask for approval — it edits your files **in place**.
- Prints the **names of files it changed** (not what it changed).
- Looks only at the **current directory** by default.

### 6.3 Flag `-diff`

```bash
terraform fmt -diff
```

Shows **exactly what changed** (removed lines with `-`, added lines with `+`) **and still applies** the change.

> ⚠️ **Gotcha:** On Windows, `terraform fmt -diff` failed with "diff executable file not found". The flag relies on a `diff` program. Linux has it, macOS very likely, Windows does not. Check with `which diff`. The instructor used an Ubuntu server for this demo.

| Command | Shows file names | Shows exact changes | Modifies files |
|---|---|---|---|
| `terraform fmt` | yes | no | yes |
| `terraform fmt -diff` | yes | yes | yes |

### 6.4 Flag `-recursive`

By default `fmt` only looks in the current directory; **subdirectories are ignored**. Use `-recursive` to process them as well.

Demo setup:

```bash
mkdir folder-1
# folder-1/file.tf contains the same badly formatted resource
```

Run from the parent directory:

```bash
terraform fmt              # fixes demo.tf only; prints "demo.tf"
terraform fmt -recursive   # also fixes folder-1/file.tf
```

### 6.5 Flag `-check` (for CI/CD)

Before a deployment, a pipeline wants to verify that the code is formatted **without modifying it**:

```bash
terraform fmt -check
echo $?        # prints the exit status of the previous command (Linux/macOS)
```

| Situation | Files listed? | Exit status |
|---|---|---|
| Everything already formatted | none | `0` |
| One or more files need formatting | file names printed | non-zero (**`3`** in the lecture) |

```text
CI pipeline step:  terraform fmt -check
                       |
          exit 0 ------+------ exit 3
             |                     |
        continue deploy      fail / ask developer to run terraform fmt
```

`-check` never changes files.

### 6.6 Flags summary

| Flag | Meaning |
|---|---|
| (none) | Format `.tf` files in the current directory, rewrite in place |
| `-diff` | Show the differences that formatting makes |
| `-recursive` | Also process subdirectories |
| `-check` | Do not write; list unformatted files; exit `0` (ok) or `3` (needs format) |

> **Extra context:** other documented flags are `-list=false` (do not list changed files) and `-write=false` (do not rewrite files). The course covers only `-diff`, `-recursive` and `-check`.

**Key behaviour:** `terraform fmt` **does not change infrastructure behaviour** — only how the code looks.

🎯 **Exam focus (lecture 75):**
- `fmt` = canonical style, no effect on infrastructure.
- Default = current directory; add `-recursive` for subfolders.
- `-check` returns a non-zero code if formatting is needed; used in CI/CD and does not change files.
- `-diff` needs a `diff` utility on the machine.
- Compare: `fmt` = **style**; `validate` = **correctness**.

---

## 7. `terraform validate` (lecture 78)

`terraform validate` checks whether a configuration is **syntactically valid and internally consistent**. It catches things like **unsupported arguments** and **undeclared variables**.

### 7.1 Base code

(Credentials are placeholders; this repo file deliberately contains *both* errors — the video introduces them one at a time.)

```hcl
provider "aws" {
  region     = "us-west-2"
  access_key = "YOUR-ACCESS-KEY"
  secret_key = "YOUR-SECRET-KEY"
}

resource "aws_instance" "myec2" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = var.instancetype
  sky           = "blue"
}
```

### 7.2 Walkthrough

```bash
terraform validate
```

| Step | What you do | Result |
|---|---|---|
| 1. Valid file | Fixed `instance_type = "t2.micro"`, no `sky` | `Success! The configuration is valid.` |
| 2. Unsupported argument | Add `sky = "blue"` inside `aws_instance` | `Error: Unsupported argument ... An argument named "sky" is not expected here.` |
| 3. Undeclared variable | Remove `sky`; set `instance_type = var.instancetype` without declaring `variable "instancetype"` | `Error: Reference to undeclared input variable` (names the variable) |

```text
terraform validate  -->  Success! The configuration is valid.
(typo / unsupported arg)  -->  Error: Unsupported argument ... "sky"
(var not declared)        -->  Error: Reference to undeclared input variable
```

### 7.3 Relationship to plan/apply

`terraform plan` and `apply` **also validate** behind the scenes, so you would see the same errors. `validate` is a fast, dedicated check you can run in an editor loop or in CI without planning.

> **Extra context:** `validate` does **not** contact providers or look at remote state/real infrastructure, but it does need `terraform init` first so it knows each provider's schema (which arguments exist). Use `-backend=false` on `init` in CI if you only want to validate. `terraform validate -json` gives machine-readable output.

🎯 **Exam focus (lecture 78):**
- `validate` checks **syntax and consistency** (unsupported arguments, undeclared variables).
- Success message: "The configuration is valid."
- `plan`/`apply` perform validation too.

---

## 8. Saved plans: `plan -out` and `apply <file>` (lecture 82)

### 8.1 The workflow

```bash
terraform plan -out=infra.plan
terraform apply infra.plan
```

- `terraform plan -out=<file>` runs the plan and **saves** it to a file (name is your choice: `ec2.plan`, `infra.plan`...).
- `terraform apply <file>` reads the saved plan and applies **exactly that**. Terraform does **not** re-plan against your current code.

Benefit: in production, the apply is guaranteed to match what was planned and reviewed, even if the code changed in between (maybe a day or two later).

### 8.2 Demo (all local, no cloud needed)

Code (`local_file.tf`):

```hcl
resource "local_file" "foo" {
  content  = "Hello World"
  filename = "terraform.txt"
}
```

1. **Baseline:** `terraform init`, `terraform plan`, `terraform apply` -> `yes`. A file `terraform.txt` containing `Hello World` appears. Then `terraform destroy` to get back to clean.
2. **Save the plan:**

```bash
terraform plan -out=infra.plan
```

Terraform prints the plan and notes it saved it to `infra.plan`. A new file `infra.plan` appears.

3. **Change the code afterwards:**

```hcl
resource "local_file" "foo" {
  content  = "NEW CONTENT"
  filename = "terraform2.txt"
}
```

4. **Apply the saved plan:**

```bash
terraform apply infra.plan
```

(If the bare name does not work, use `./infra.plan`.)

5. **Result:** the file created is `terraform.txt` with `Hello World` — **not** `terraform2.txt` / `NEW CONTENT`. The saved plan won; the edit made after planning was ignored.

```text
plan -out=infra.plan  -->  [infra.plan: create terraform.txt "Hello World"]
edit code             -->  now says terraform2.txt "NEW CONTENT"
apply infra.plan      -->  creates terraform.txt "Hello World"   (plan file wins)
```

Compare: without a saved plan, a plain `terraform apply` uses the *current* code and can produce something different from what you reviewed.

### 8.3 The plan file is binary: use `terraform show`

The plan file is **binary** — opening it in an editor shows gibberish or an "unsupported encoding" message. Read it with `terraform show`:

```bash
terraform show infra.plan                    # human-readable, same as the original plan output
terraform show -json infra.plan              # JSON, for tools (policy checks, scripts)
terraform show -json infra.plan | jq         # pretty-printed JSON, locally
```

- `terraform show infra.plan` shows `terraform.txt` / `Hello World`, not the later edit.
- `jq` is a command-line JSON processor (preinstalled on many Linux systems; install it on macOS/Windows).

> ⚠️ **Security advice from the lecture:** online JSON formatters exist, but do **not** paste plan output into them. A plan can contain **sensitive values**, and you do not know whether the site stores your data. Use `jq` locally.
>
> ⚠️ **Gotcha (from the demo):** `cat infra.plan` prints garbage; press `Ctrl+C` to recover. (The instructor accidentally pressed `Ctrl+D`, which logged him out of the server.)

`terraform show` with **no file** prints the **current state** in readable form (see [04](04-state-basics.md)).

### 8.4 Use cases

- Organisations often need **documented proof of plan changes** for review/approval (change management). When the change happens, it must be **exactly** what was approved.
- Production environments with many teams where time passes between plan and apply.
- Feeding the JSON plan into automated **policy checks** (extra context: policy-as-code tools and CI scanners read it).

### 8.5 Extra context and gotchas

- Saved plan files may contain **sensitive values**; protect them like the state.
- A plan can go **stale**: if the real infrastructure or state changed after planning, Terraform refuses with an error like "Saved plan is stale" and you must re-plan.
- Applying a saved plan **does not ask for confirmation** (the review already happened at plan time), so `-auto-approve` is not needed.
- Variables given with `-var` are recorded in the plan; you cannot change them when applying the plan file.

🎯 **Exam focus (lecture 82):**
- `terraform plan -out=FILE` saves; `terraform apply FILE` applies exactly that plan.
- The plan file is **binary**; read it with `terraform show FILE` (`-json` for JSON).
- Use `jq` locally; do not upload sensitive output to websites.
- Main benefit: consistency between what was reviewed and what is applied.

---

## 9. Reading results: `terraform output`, `terraform show`

### 9.1 `terraform output` (lecture 83)

`terraform output` reads the **output values** stored in the **state file** and prints them. You do not need to re-run `apply` to see them again.

```bash
terraform output <output_name>
```

How the outputs get there: an `output` block in your code (explained fully in [06 — Variables, outputs, locals](06-variables-outputs-locals.md)). Here is the lecture's demo configuration (reconstructed; it creates three IAM users and two outputs using a splat expression `[*]`, which is explained in [07 — Types, loops, functions](07-types-loops-functions.md)):

```hcl
resource "aws_iam_user" "lb" {
  name  = "demo-user.${count.index}"   # illustrative; the video uses its own naming
  count = 3
}

output "iam_names" {
  value = aws_iam_user.lb[*].name      # splat: list of all names
}

output "iam_arn" {
  value = aws_iam_user.lb[*].arn       # splat: list of all ARNs
}
```

- `count = 3` creates three instances: `aws_iam_user.lb[0]`, `[1]`, `[2]`.
- `aws_iam_user.lb[*].name` returns a **list** of the `name` of every instance.
- `output "<name>" { value = ... }` publishes a value after apply and stores it in state.

**Three ways to see an output days later:**

| Approach | How | Comment |
|---|---|---|
| 1. Run `terraform apply` again | Outputs are printed at the end even with "no changes" | Works but heavyweight (refreshes state, makes API calls) just to read a value |
| 2. Inspect `terraform.tfstate` | Look at the `outputs` section | Works, but manual; never edit state by hand |
| 3. `terraform output <name>` | `terraform output iam_arn` | Clean, fast, purpose-built |

Demo: `terraform apply` -> `yes`; the output block lists `iam_arn` and `iam_names`. Later:

```bash
terraform output iam_arn
terraform output iam_names
```

Both immediately return the stored lists — no changes, no confirmation.

Other `output` command options (extra context):

| Command | Result |
|---|---|
| `terraform output` | Prints **all** outputs |
| `terraform output -json` | All outputs as JSON (machine-readable) |
| `terraform output -raw <name>` | Raw string, no quotes (good for scripts; only for string/number/bool outputs) |

Examples of what `value` can be (repo `output-values.md`, Elastic IP):

```hcl
resource "aws_eip" "lb" {
  domain = "vpc"
}

# 1. A single attribute
output "public-ip" {
  value = aws_eip.lb.public_ip
}

# 2. Interpolated into a string
output "public-ip-url" {
  value = "https://${aws_eip.lb.public_ip}:8080"
}

# 3. The entire resource object (all attributes)
output "eip-object" {
  value = aws_eip.lb
}
```

(Output names must be unique inside a module; the lecture reuses the name `public-ip` only to show alternatives.)

> ⚠️ **Gotcha:** outputs are read from the **state**, so the state must exist (local file or remote backend). `terraform output` does **not** create, change or refresh infrastructure. If an output is marked `sensitive = true`, the CLI shows `<sensitive>` unless you name it explicitly — see [08](08-lifecycle-conditions-sensitive.md).

🎯 **Exam focus (lecture 83):**
- `terraform output <name>` extracts the value of a specific output **from the state file**.
- It does not create, change or refresh infrastructure.

### 9.2 `terraform show`

| Command | Prints |
|---|---|
| `terraform show` | The current **state** in human-readable form |
| `terraform show <planfile>` | A saved plan (section 8) |
| `terraform show -json [file]` | JSON form of the state or plan |

---

## 10. Comments in Terraform (lecture 88)

A **comment** is explanatory text that Terraform ignores. It helps readers understand intent.

### 10.1 The three syntaxes

| Syntax | Type | Notes |
|---|---|---|
| `# ...` | Single line | Ends at end of line. **The default/recommended style** |
| `// ...` | Single line | Alternative to `#` |
| `/* ... */` | Multi-line | Everything between the markers is a comment |

### 10.2 Repo example (`tf-comments.tf`)

```hcl
# We are running Null Provisioner.
// This is second type of comment.

/*
Line 1
Line 2
Line 3
*/
resource "null_resource" "demo_run" {

  provisioner "local-exec" {
    command = "echo Null Provisioner has completed > sample.txt"
  }
}

/*
resource "null_resource" "demo_run2" {

  provisioner "local-exec" {
    command = "echo Null Provisioner has completed > sample.txt"
  }
}
*/
```

- The first two lines are single-line comments; the third block is multi-line.
- The final block **comments out an entire resource**. This is the common real-world use: keep it in the file but do not run it for now. With `terraform plan`, only `demo_run` is considered. Remove the comment markers later and `demo_run2` will be planned too.

(`null_resource` and `local-exec` provisioners are explained in [05](05-resources-data-dependencies.md).)

> ⚠️ **Gotcha:** if you open `/*` and never close it with `*/`, **everything below** becomes a comment.
>
> ⚠️ **Gotcha:** commenting out a resource that **already exists** in state means the next `plan` proposes to **destroy** it (section 5.4).

🎯 **Exam focus (lecture 88):** three syntaxes: `#`, `//`, `/* */`. `#` is the preferred single-line style. Multi-line comments use `/* ... */`.

---

## 11. Configuration files: load order and the settings block

### 11.1 What Terraform loads (lecture 76)

When you run `plan`, `apply` and so on, Terraform automatically loads **all files in the directory ending with `.tf` or `.tf.json`**, merges them, and works on the combined configuration.

```text
kplabs-terraform/
├── ec2.tf            ┐
├── app.tf            ├──> all loaded and merged ──> one configuration
└── sg.tf.json        ┘
```

A `.tf.json` file is **not skipped** — resources from `.tf` and `.tf.json` are created together. (`.tf.json` is the JSON syntax of the same language; see [00 — Prerequisites](00-prerequisites.md) for JSON vs HCL.) To act on only one resource, use `-target`, not file names.

### 11.2 The resource address must be unique

Because everything is merged, each object must be defined **once**. A slide example: `a_resource.tf` and `c_resource.tf` in a folder `load-order` have different file names and content (`I am File One` / `I am File Two`) but both use the local name `file_one` — the same address `local_file.file_one` — a conflict.

Demo files (repo `load-order.md`):

```hcl
# file-one.tf
resource "local_file" "foo" {
  content  = "Hello from KPLABS!"
  filename = "${path.module}/kplabs.txt"
}
```

```hcl
# file-two.tf
resource "local_file" "foo2" {
  content  = "Hello!"
  filename = "${path.module}/two.txt"
}
```

```json
# file-three.tf.json
{
  "resource": {
    "local_file": {
      "json_example": {
        "filename": "${path.module}/hello_from_json.txt",
        "content": "This file was created using Terraform JSON syntax!"
      }
    }
  }
}
```

Step by step, as in the video:

1. Start with `file-one.tf` containing `local_file.foo`.
2. Create `file-two.tf` with another `local_file` **also named `foo`**.
3. `terraform plan` -> **error** in `file-two.tf`: a `local_file` resource named `foo` was already declared in `file-one.tf`. Same address, so Terraform cannot identify it uniquely.
4. Rename the second one to `foo2` -> `terraform plan` succeeds.
5. Add `file-three.tf.json` with `local_file.json_example` -> `plan` now shows **3 to add** (proves `.tf.json` is loaded).
6. Rename the JSON resource to `foo2` as well -> **duplicate resource configuration** error. The rule holds across `.tf` and `.tf.json`.
7. Move `file-three.tf.json` into a subfolder `folder-1` -> `plan` shows only **2 to add**. **Subdirectories are not loaded.**

The "same name" rule is about the **address** (`type.name`, e.g. `local_file.foo`). Across different folders it does not matter; inside one folder it must be unique.

### 11.3 Rules at a glance

| Point | Detail |
|---|---|
| Which files | Only `*.tf` and `*.tf.json` in the directory |
| Order | Loaded in **alphabetical order** (per the lecture) |
| Subdirectories | **Not** loaded automatically; only when explicitly called (e.g. a `module` block) |
| Duplicates | Same object defined twice in the directory -> error |
| File names | `networking.tf`, `compute.tf`... are for **humans**; Terraform merges everything anyway |
| Other extensions | `.txt`, `.md` etc. are ignored (extra context) |

> **Extra context (nuance):** because HCL is declarative, the load order does not change the result — Terraform builds a dependency graph from references, not from file order. The one exception is **override files** (`override.tf`, `*_override.tf`), which are merged on top of other files and are rarely used. Typical conventions: `main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`; none of those names is special to Terraform ([09 — Modules](09-modules.md) shows the standard module layout).

🎯 **Exam focus (lecture 76):**
- Terraform loads `.tf` and `.tf.json` from the working directory, merged into one configuration.
- Subdirectories are not read unless explicitly referenced (modules).
- Duplicate addresses (type + local name) cause an error.
- Splitting code into files is purely organisational.

### 11.4 The `terraform {}` settings block (lecture 84)

#### Why settings are needed

The `provider` block configures things like region and credentials. It cannot express **project-level behaviour**:

- "This code only works on Terraform 1.8 or later."
- "This code only works with AWS provider 5.54.1."

If you only write `provider "aws" {}`, `terraform init` downloads the **latest** provider, and there is no way to restrict the Terraform CLI version. The **`terraform {}` block** (Terraform settings) fills that gap.

```text
 provider block                 terraform block (settings)
 ----------------               ---------------------------------------
 region, creds,                 required_version     (Terraform CLI)
 endpoints ...                  required_providers   (source + version)
                                backend              (state storage)
                                experiments, provider_meta ...
```

| Setting | Purpose |
|---|---|
| `required_version` | Terraform **CLI** version constraint |
| `required_providers` | Provider **source** + version constraints |
| `backend` | Where state is stored ([10](10-backends-locking-drift.md)) |
| `cloud` | HCP Terraform integration (extra context; see [12](12-hcp-terraform.md)) |
| `experiments` | Opt in to experimental language features |
| `provider_meta` | Pass metadata to providers |

#### Setting 1: `required_version`

```hcl
terraform {
  required_version = "1.9.1"
}
```

Demo steps:

1. Start with an empty `terraform {}` block and a simple resource. `terraform init` downloads the latest AWS provider (5.57.0 at the time of recording).
2. `terraform version` shows Terraform 1.9.1 and provider 5.57.0.
3. `terraform plan` works.
4. Add `required_version = "1.8"` (a version you are **not** running) and run `terraform plan` again -> **"Unsupported Terraform Core version"** error saying the configuration expects 1.8.
5. Change it to your actual version (`1.9.1`) -> `plan` works again.

> ⚠️ **Gotcha:** an exact version string must match what you run, or Terraform refuses to proceed.

> **Up to date (TF 1.12):** pinning an exact CLI version is strict. Real projects use **constraints**, e.g. `required_version = ">= 1.9.0"` or `"~> 1.12"`, so teammates on a slightly newer release are not blocked. The constraint operators (`=`, `!=`, `>`, `>=`, `<`, `<=`, `~>`) are explained in [02 — Providers](02-providers.md).

#### Setting 2: `required_providers`

Declares which providers the module needs, where they come from (`source`) and which versions are acceptable (`version`):

```hcl
terraform {
  required_version = "1.9.1"

  required_providers {
    aws = {
      version = "5.54.1"
      source  = "hashicorp/aws"
    }
  }
}
```

- `aws` is the **local name** of the provider.
- `source = "hashicorp/aws"` is its registry address.
- `version = "5.54.1"` pins an **exact** version. Constraints such as `>= 2.7.0` also work (the docs example), meaning "2.7.0 or higher".

Full repo example (`settings.md`) — base code and final code:

```hcl
# base
resource "aws_security_group" "sg_01" {
  name = "app_firewall"
}
```

```hcl
# final
terraform {
  required_version = "1.9.1"

  required_providers {
    aws = {
      version = "5.54.1"
      source  = "hashicorp/aws"
    }
  }
}

resource "aws_security_group" "sg_01" {
  name = "app_firewall"
}
```

#### Demo: pinning the provider to an older version

1. The lock file (`.terraform.lock.hcl`) currently records provider **5.57.0** (from the first `init`).
2. You change the config to `version = "5.54.1"` (an older release you know works; releases are on the provider's GitHub releases page).
3. `terraform plan` fails with **"inconsistent dependency lock file"** because the lock file says 5.57.0 but the config now demands 5.54.1.
4. The error prints the fix:

```bash
terraform init -upgrade
```

5. Terraform installs 5.54.1 and updates the lock file. From now on `plan` uses that exact version.

```text
 config constraint changed ──► lock file disagrees ──► "inconsistent dependency lock file"
                                                          │
                                         terraform init -upgrade
                                                          │
                                  new version installed + lock file rewritten
```

> **Extra context:** if you *add* a brand-new provider or only relax a constraint such as widening a range, plain `terraform init` is usually enough; `-upgrade` is needed when the locked version no longer satisfies the constraint or you want a newer one. Lock file details in [02 — Providers](02-providers.md).

🎯 **Exam focus (lecture 84):**
- Project-specific behaviour (CLI version, provider versions, backend) lives in the **`terraform {}` block**, not the provider block.
- `required_version` checks **Terraform core**; `required_providers` handles **provider** sources/versions.
- After changing a provider version constraint, run `terraform init -upgrade`.
- A `required_version` mismatch gives "Unsupported Terraform Core version".
- Without constraints, `init` pulls the **latest** provider version.

---

## 12. Resource targeting: `-target` (lecture 85)

### 12.1 The default behaviour

Terraform reads **all** `.tf` files, merges them, and operates on **every** resource. A plain `terraform apply` creates everything in the folder.

```text
 kplabs-terraform/
   ec2.tf   -> aws_instance
   file.tf  -> local_file
   iam.tf   -> aws_iam_user
          \     |     /
        merged configuration
                |
   terraform apply  ->  all resources
```

Sometimes you want to act on just **one** resource out of many. That is **resource targeting**.

### 12.2 The code (`resource-target.md`)

Three unrelated resources:

```hcl
resource "aws_iam_user" "this" {
  name = "test-aws-user"
}

resource "aws_security_group" "allow_tls" {
  name = "terraform-firewall"
}

resource "local_file" "foo" {
  content  = "foo!"
  filename = "${path.module}/foo.txt"
}
```

The goal: work with `local_file.foo` only.

### 12.3 Commands

```bash
terraform plan    -target local_file.foo
terraform apply   -target local_file.foo
terraform destroy -target local_file.foo
```

- The value after `-target` is the **resource address**: `<resource_type>.<resource_name>`.
- Works with `plan`, `apply` and `destroy`.
- Alternative syntax: `-target="local_file.foo"` or `-target=local_file.foo`. One form may not work in some shells/OSs, so know both.

> **Extra context:** you can repeat `-target` several times to select multiple resources. Targeting a resource also includes the resources **it depends on** (so they exist), and in modern Terraform you can target a whole module with `-target=module.name`. Some shells need quoting for addresses with indexes, e.g. `-target='aws_instance.web[0]'`.

### 12.4 Demo walkthrough

1. `terraform init` (downloads the `local` and `aws` providers).
2. `terraform plan` (no target): **3 to add** (local file, security group, IAM user) — the default.
3. `terraform plan -target local_file.foo`: **1 to add**, plus a **warning that resource targeting is in effect**.
4. `terraform apply -target local_file.foo` -> `yes`: only `foo.txt` is created in the folder.
5. `terraform destroy -target local_file.foo` -> `yes`: `foo.txt` is removed. The other resources are untouched throughout.

### 12.5 When is it useful?

| Situation | Why `-target` helps |
|---|---|
| 10 resources, teammates mid-change, but one **critical fix** is needed (e.g. open port 80 on one security group) | Update that single resource without touching the other nine |
| Destroy one specific resource only | `terraform destroy -target ...` |
| State has drifted / is out of sync (network failure, provider bug) | Repair or re-create just the problem resource |
| Very large infrastructure with API rate limits (section 13) | Fewer API calls |

> ⚠️ **Important warning:** targeting is a **tool for exceptional cases, not the normal workflow**. Use it when there is no other option; otherwise run the full plan/apply so Terraform keeps the whole picture of dependencies and drift. Terraform prints a warning every time you use it, and the next full plan may show unexpected leftover differences.

🎯 **Exam focus (lecture 85):**
- Flag: `-target=resource_type.name` (works with plan, apply, destroy).
- Purpose: operate on a subset. **Not recommended for routine use.**
- Terraform shows a warning that targeting is in effect.

---

## 13. Dealing with large infrastructure (lecture 86)

### 13.1 The problem: clouds are not unlimited

1. **Service quotas.** Every cloud (AWS, GCP, Azure) enforces limits per service. In AWS these are *Service Quotas*; some can be raised via Support, some are **non-adjustable**.
2. **API throttling.** Providers cap the number of API calls in a period. Beyond the cap, extra calls receive an error and are **throttled**. (Illustration: 10,000 calls allowed, you make 10,010 — the extra 10 are throttled.)

For small setups this is irrelevant; for large infrastructure it is a real design concern.

### 13.2 Why Terraform makes it worse

Every `plan` and `apply` **refreshes the state** by default: it asks the provider for the current status of **every resource already in state**. Hundreds of resources = hundreds of read API calls on *every* plan, even when nothing changed.

```text
 terraform plan
    |
    +--> refresh resource 1  -> API call
    +--> refresh resource 2  -> API call
    +--> ...
    +--> refresh resource N  -> API call     (N can be hundreds)
    |
    +--> compare with config -> show diff
```

**Real-world story from the lecture.** The instructor managed security hardening (CIS-benchmark style: Linux, Windows and AWS account hardening) in Terraform. CIS PDFs run to 200+ pages each, and the Terraform rules covered 4-5 benchmarks — hundreds of rules. Some AWS accounts were already close to their API limits, so even running `terraform plan` risked throttling **production** applications. The team had to slow Terraform down.

### 13.3 Seeing the scale (`larger-infra.tf`)

The instructor advises **not** running this in your own account (NAT and VPN gateways cost money); just read along.

```hcl
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "my-vpc"
  version = "5.13.0"
  cidr    = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = true

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}

resource "aws_security_group" "allow_tls" {
  name        = "terraform-firewall"
  description = "Managed from Terraform"
}

resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv6" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_security_group" "allow_tls2" {
  name        = "terraform-firewalls"
  description = "Managed from Terraform"
}
```

What it is: a VPC **module** (VPC, 3 public + 3 private subnets, route tables, NAT gateway, VPN gateway — see [09](09-modules.md)), a security group with an ingress rule on port 80 and an allow-all egress rule (`ip_protocol = "-1"` = all protocols/ports), plus a second security group added later in the demo.

Observations:

1. `terraform init` installs the module.
2. `terraform plan` reports about **35 resources** to create — mostly from the module, even though the file looks short.
3. `terraform apply -auto-approve` takes roughly 2-3 minutes.
4. Running `terraform plan` again prints a long list of `Refreshing state...` lines, one per resource. Each is one or more API calls — even though nothing changed.

### 13.4 Three solutions

| # | Solution | How it reduces API calls |
|---|---|---|
| 1 | **Split into smaller projects** (separate folders / separate states): project 1 = VPC, project 2 = IAM, project 3 = EC2 + security groups | A plan on project 1 refreshes only VPC resources; smaller blast radius too |
| 2 | **Resource targeting** with `-target` | Plans one resource (or a few) at a time, so only those are refreshed |
| 3 | **`-refresh=false`** | Skips the refresh step during plan/apply |

```bash
terraform plan -refresh=false
```

Demo: add a new security group (`allow_tls2`) and compare.

- `terraform plan`: refreshes every resource first, then reports "1 to add".
- `terraform plan -refresh=false`: no refresh calls; it reports "1 to add" much faster with far fewer API calls.

> ⚠️ **Warning from the lecture:** do **not** use `-refresh=false` as a habit. Use it only when you are sure state matches reality **and** you have no better option (e.g. very tight API limits). Refresh is on by default for a good reason: it detects drift.

```text
 Large project (hundreds of resources)
        |
        +-- split ----------> many small projects   (smaller blast radius, fewer calls per plan)
        +-- -target --------> one resource at a time
        +-- -refresh=false -> skip the read/refresh phase
```

### 13.5 Extra context: `-parallelism`

Terraform walks its dependency graph and performs up to **10** resource operations at the same time by default. The `-parallelism=n` option on `plan`/`apply`/`destroy` changes that. Lowering it (e.g. `-parallelism=2`) slows Terraform down and reduces the burst of API calls, which can help against throttling (very like the instructor's "slow Terraform down" story). Raising it speeds up large applies on APIs that tolerate it.

```bash
terraform apply -parallelism=2
```

Also (extra context): providers often retry throttled calls automatically, and splitting a monolith into several state files (for example with [workspaces or separate backends](10-backends-locking-drift.md)) is the long-term fix.

🎯 **Exam focus (lecture 86):**
- Cloud providers have quotas and API throttling; large projects can hit them because plan/apply refresh every resource.
- Remedies: smaller projects, `-target`, `-refresh=false` (cautiously).
- `terraform plan -refresh=false` does not refresh the state before planning.

---

## 14. `terraform graph` (lecture 81)

### 14.1 What it does

`terraform graph` produces a **visual representation of the dependency relationships** in your configuration. Larger code bases have hundreds of resources, and tracing dependencies by hand takes a long time; graph helps you plan, debug and manage complex infrastructure.

Slide example: provider `aws`; `aws_instance.test` with instances 0, 1, 2 (`count = 3`); an `aws_elb` pointing to the instances; a Route 53 record pointing to the load balancer. All depend on the provider.

```text
provider.aws
   ├── aws_instance.test[0..2]
   │         ▲
   │         │ (ELB points to instances)
   ├── aws_elb
   │         ▲
   │         │ (DNS points to ELB)
   └── aws_route53_record
```

### 14.2 Sample configuration (`sample-file.tf`)

```hcl
resource "aws_eip" "lb" {
  domain = "vpc"
}

resource "aws_security_group" "example" {
  name = "attribute-sg"
}

resource "aws_vpc_security_group_ingress_rule" "example" {
  security_group_id = aws_security_group.example.id

  cidr_ipv4   = "${aws_eip.lb.public_ip}/32"
  from_port   = 443
  ip_protocol = "tcp"
  to_port     = 443
}

resource "aws_instance" "web" {
  ami           = "ami-0440d3b780d96b29d"
  instance_type = "t2.micro"
}
```

Dependencies here (these are **implicit dependencies**, see [05](05-resources-data-dependencies.md)):

- The ingress rule uses `aws_security_group.example.id` -> depends on the security group.
- The ingress rule uses `aws_eip.lb.public_ip` -> depends on the Elastic IP.
- `aws_instance.web` references nothing, so it has **no dependency** on the others.

### 14.3 Running it

```bash
terraform init      # required first; without init, graph errors
terraform graph
```

The output is text in the **DOT language** (a graph description language from Graphviz). Raw DOT is hard to read, so you render it.

Abridged shape of the raw output:

```text
digraph G {
  rankdir = "RL";
  node [shape = rect, fontname = "sans-serif"];
  "aws_eip.lb" [label="aws_eip.lb"];
  "aws_instance.web" [label="aws_instance.web"];
  "aws_security_group.example" [label="aws_security_group.example"];
  "aws_vpc_security_group_ingress_rule.example" [label="aws_vpc_security_group_ingress_rule.example"];
  "aws_vpc_security_group_ingress_rule.example" -> "aws_eip.lb";
  "aws_vpc_security_group_ingress_rule.example" -> "aws_security_group.example";
}
```

An arrow `A -> B` means **A depends on B**.

### 14.4 Option 1: online Graphviz viewers

Paste the DOT text into an online Graphviz site (the repo lists `https://dreampuf.github.io/GraphvizOnline/`; the docs page is `https://developer.hashicorp.com/terraform/cli/commands/graph`). The picture shows the ingress rule linked to the security group and the EIP, and the instance standing alone.

> ⚠️ **Security warning from the lecture:** **do not paste graph output of sensitive infrastructure into public websites.** Dependency information in an enterprise can be sensitive. Use the offline approach.

### 14.5 Option 2: local Graphviz (`dot`)

The `dot` program comes from the **Graphviz** package:

```bash
apt install graphviz          # Ubuntu/Debian
# brew install graphviz       # macOS (extra context)
```

Then pipe the output:

```bash
terraform graph | dot -Tsvg > graph.svg
terraform graph | dot -Tpng > graph.png
```

On a server, SVG is easier to move around because you can `cat graph.svg`, paste it into a local file and open it in a browser. Full demo sequence on an Ubuntu server:

```bash
apt install graphviz
# create test.tf with the sample configuration
terraform init
terraform graph                          # prints DOT text
terraform graph | dot -Tsvg > graph.svg  # produces an image file
cat graph.svg
```

> **Extra context:** `terraform graph -type=plan` (or `apply`, `plan-destroy`) shows the graph for a specific operation; in older versions the default was `-type=plan`.

🎯 **Exam focus (lecture 81):**
- `terraform graph` outputs a dependency graph in **DOT** format.
- Convert it to an image with Graphviz `dot` (`-Tpng` / `-Tsvg`).
- Useful for visualising, debugging and understanding relationships.
- Needs `terraform init` first. Do not upload sensitive graphs to public sites.

---

## 15. Pointers: topics that live in other chapters

These lessons appear next to the workflow commands in the course, but each is owned by another chapter. One-paragraph orientation only:

| Topic (lecture) | One-line summary | Read in |
|---|---|---|
| Debugging, `TF_LOG`, `TF_LOG_PATH`, bug reports (71, 72, 74) | Set `TF_LOG` (TRACE, DEBUG, INFO, WARN, ERROR) and `TF_LOG_PATH` to capture detailed logs; `export` on Linux/macOS, `set` on Windows | [11 — Import, state CLI, logging](11-import-state-cli-logging.md) |
| Troubleshooting model (73) | Errors come from one of four places: **language**, **state**, **core**, **provider** | [11](11-import-state-cli-logging.md) |
| `terraform apply -replace` and `taint` (79) | Force re-creation of a resource; `taint` is deprecated since 0.15.2 | [11](11-import-state-cli-logging.md) |
| Dynamic blocks (77) | Generate repeated nested blocks from a collection | [07 — Types, loops, functions](07-types-loops-functions.md) |
| Splat expressions (80) | `resource.name[*].attr` returns a list of an attribute from every `count` instance | [07](07-types-loops-functions.md) |
| `zipmap` (87) | Builds a map from two lists | [07](07-types-loops-functions.md) |
| Lifecycle, meta-arguments (89-93) | `create_before_destroy`, `prevent_destroy`, `ignore_changes` | [08](08-lifecycle-conditions-sensitive.md) |
| `count` pitfalls, `depends_on` (94-96) | Index shifting; implicit vs explicit dependencies | [05](05-resources-data-dependencies.md) / [07](07-types-loops-functions.md) |
| `terraform refresh` deprecation and `-refresh-only` | State sync with reality | [04 — State basics](04-state-basics.md) |
| `terraform force-unlock` | Release a stuck state lock | [10](10-backends-locking-drift.md) |

---

## 🧪 Labs

### Lab 1 — Full workflow with no cloud account (free)

Uses the `local` provider, which only writes files on your machine, so there is no cost and no risk.

1. Create a folder and enter it:

```bash
mkdir tf-workflow-lab && cd tf-workflow-lab
```

2. Create `main.tf` — **deliberately badly formatted**:

```hcl
terraform {
  required_version = ">= 1.9.0"
}

resource "local_file" "foo" {
      content  = "Hello World"
  filename = "${path.module}/hello.txt"
}
```

3. Validate before init (expect a provider-related error, which teaches why `init` comes first):

```bash
terraform validate
```

4. Initialise:

```bash
terraform init
```

Expected: `Installing hashicorp/local ...` and `Terraform has been successfully initialized!`. Check that `.terraform/` and `.terraform.lock.hcl` now exist (`ls -a`).

5. Format, with a preview first:

```bash
terraform fmt -check      # lists main.tf, exit status 3
echo $?
terraform fmt -diff       # shows the changes and applies them
terraform fmt -check      # silent, exit status 0
```

6. Validate:

```bash
terraform validate
```

Expected: `Success! The configuration is valid.`

7. Plan, then apply:

```bash
terraform plan
terraform apply
```

Expected: `Plan: 1 to add, 0 to change, 0 to destroy.`; type `yes`; `Apply complete! Resources: 1 added...`. Check `cat hello.txt`.

8. Run `terraform plan` again. Expected: `No changes. Your infrastructure matches the configuration.`

9. **Change in place / replace.** Edit `content` to `"Hello Terraform"`, then `terraform plan`. For `local_file` a content change forces a **replacement** (`-/+`), so expect `1 to add, 0 to change, 1 to destroy`. Apply it.

10. **Saved plan.** Change content to `"From the saved plan"` and run:

```bash
terraform plan -out=lab.plan
terraform show lab.plan
```

Now edit the content *again* to `"I changed my mind"`. Run:

```bash
terraform apply lab.plan
cat hello.txt
```

Expected: the file says `From the saved plan` (the plan won). No `yes` prompt appears.

11. **Outputs.** Append to `main.tf`:

```hcl
output "file_path" {
  value = local_file.foo.filename
}
```

Run `terraform apply`, then `terraform output file_path` and `terraform output -json`.

12. **Graph.** Add a second resource that depends on the first:

```hcl
resource "local_file" "second" {
  content  = "I depend on foo: ${local_file.foo.content}"
  filename = "${path.module}/second.txt"
}
```

Run `terraform graph`. If you have Graphviz: `terraform graph | dot -Tpng > graph.png` and open the image. Find the arrow `local_file.second -> local_file.foo`.

13. **Target.** Add an independent third resource:

```hcl
resource "local_file" "third" {
  content  = "I am independent"
  filename = "${path.module}/third.txt"
}
```

Now also change `foo`'s content (e.g. to `"changed again"`), then compare:

```bash
terraform plan
terraform plan -target=local_file.third
```

The full plan wants to change `foo`, `second` (it depends on `foo`) and add `third`; the targeted plan only adds `third`, with the warning "Resource targeting is in effect". Do not make targeted applies a habit in real projects.

14. **Load order.** Move the `second` resource into `second.tf`; `terraform plan` shows no change (file names do not matter). Create a subfolder `sub/` with a `.tf` file defining another resource; plan ignores it. Copy `foo` into `second.tf` with the same name `foo` -> duplicate-resource error. Remove it again.

15. **Comments and destroy.** Comment out `second` with `/* ... */` and run `terraform plan` -> `1 to destroy`. Then remove the comment markers. Finally:

```bash
terraform destroy
```

Type `yes`. Both files disappear. Notice `terraform.tfstate` still exists (nearly empty).

### Lab 2 — Your first EC2 instance (AWS; free-tier eligible but **clean up**)

Prerequisites: an AWS account, an IAM user with access keys, and `aws configure` done ([00 — Prerequisites](00-prerequisites.md) and [02 — Providers](02-providers.md)). `t2.micro` is free-tier eligible for new accounts; if your account is past the free tier, an instance costs a few cents per hour. **Destroy it at the end.**

1. Create `first_ec2.tf`. **Do not put keys in the file** — the AWS CLI credentials are picked up automatically:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"   # replace with a current Amazon Linux AMI for YOUR region
  instance_type = "t2.micro"
}
```

2. `terraform init`, then `terraform plan` (expect `1 to add`), then `terraform apply` -> `yes`. Confirm one running instance in the EC2 console (correct region).
3. Add a `tags = { Name = "my first EC2" }` block. `terraform plan` -> `0 to add, 1 to change, 0 to destroy`. Apply, check the name in the console.
4. Remove the tags block and run `terraform apply` directly. Confirm the name disappears.
5. Add a second resource (e.g. an `aws_security_group` named `lab-sg`) and apply. Now:

```bash
terraform destroy -target aws_instance.myec2
```

Expected: `Plan: 0 to add, 0 to change, 1 to destroy.`, a targeting warning, and the instance goes `terminated` (about 2-3 minutes).
6. Run `terraform plan`. Expected: `1 to add` — the instance code is still there, so Terraform wants it back.
7. Comment out the instance block with `/* ... */` and run `terraform plan`. Expected: no EC2 changes.
8. **Clean up:** `terraform destroy`, type `yes`. Verify in the console that nothing is left running.

---

## 🎯 Exam focus (summary)

- **Workflow order:** `init` -> `plan` -> `apply` -> (`destroy`). `init` first, always; re-run it when you add a provider or module or change the backend.
- `plan` makes **no** changes; `apply` does. `apply` prompts for `yes` unless `-auto-approve`; applying a **saved plan** does not prompt.
- `terraform destroy` removes everything in the configuration; `-target type.name` removes one resource; the code remaining means the next plan re-creates it.
- Commenting out/deleting a resource block, then applying, destroys it.
- `terraform fmt`: style only; `-diff`, `-recursive`, `-check` (exit 3 when unformatted; used in CI). `terraform validate`: syntax and consistency (unsupported argument, undeclared variable). Both are no-ops for infrastructure.
- **File loading:** all `.tf` and `.tf.json` files in the current directory; subdirectories ignored (unless a module); duplicate `type.name` is an error; file names are cosmetic.
- **Comments:** `#`, `//`, `/* */`.
- **Settings block** `terraform {}`: `required_version` (CLI), `required_providers` (source + version), `backend`. Changing a provider constraint -> `terraform init -upgrade` to fix "inconsistent dependency lock file".
- `-target` = exceptional use only; Terraform warns. `-refresh=false` skips refresh; both reduce API calls on huge projects, along with splitting projects.
- **Saved plan:** `plan -out=f` then `apply f`; binary file; read with `terraform show f` or `show -json f | jq`. The plan file wins over later code edits.
- `terraform output <name>` reads from the state; `terraform graph` outputs DOT (render with Graphviz `dot`); needs `init`.

Usual traps: confusing `fmt` with `validate`; thinking `plan` changes state or infrastructure; forgetting that `destroy` leaves the code (and state file) behind; believing subfolders are loaded; using `-target` as a normal workflow; reading a plan file with `cat`.

## Key takeaways

1. The loop is **write -> init -> fmt/validate -> plan -> apply -> change -> plan -> apply -> destroy**.
2. `plan` previews; `apply` changes; both refresh state first by default.
3. A resource address is `type.local_name`; it must be unique across all merged files in a folder.
4. Provider block stays the same across resources of one platform; the resource block changes.
5. Three removal approaches: `destroy`, `destroy -target`, delete/comment code and apply.
6. `fmt` fixes style (never infrastructure); `validate` checks correctness; both are cheap and safe.
7. Saved plans make apply exactly match review; read them with `terraform show`.
8. The `terraform {}` block pins Terraform and provider versions; the lock file freezes the chosen provider versions; `init -upgrade` moves them.
9. `-target` and `-refresh=false` are tools for special cases; large projects should be split.
10. Keep credentials out of `.tf` files.

## Quick commands / syntax cheat-sheet

```bash
# prepare
terraform init                       # download providers/modules, create lock file
terraform init -upgrade              # take newest versions allowed by constraints

# check
terraform fmt                        # format current dir
terraform fmt -recursive -diff       # include subfolders, show changes
terraform fmt -check                 # CI: exit 0 formatted, 3 not
terraform validate                   # syntax + consistency

# preview / change
terraform plan
terraform plan -out=infra.plan       # save
terraform apply                      # asks for yes
terraform apply -auto-approve        # no prompt
terraform apply infra.plan           # apply saved plan exactly
terraform plan -refresh=false        # skip refresh (large infra)
terraform plan -target=type.name     # only that resource (also apply/destroy)
terraform plan -var 'name=value'     # see chapter 06
terraform plan -var-file=prod.tfvars # see chapter 06

# destroy
terraform destroy                    # everything in this folder
terraform destroy -target type.name  # one resource
terraform destroy -auto-approve

# inspect
terraform show                       # state, readable
terraform show infra.plan            # saved plan, readable
terraform show -json infra.plan | jq
terraform output [name]              # from state
terraform graph | dot -Tsvg > graph.svg
terraform version
```

```hcl
# settings block
terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# comments
# single line
// single line
/* multi
   line */
```

## ❓ Quiz

1. What is the correct order of the basic Terraform workflow commands?
2. Does `terraform plan` create, change or destroy any infrastructure? Does it change the state file?
3. You run `terraform destroy -target aws_instance.myec2` and it succeeds. Without changing any code, you run `terraform plan`. What does it show, and why?
4. You comment out a `resource` block whose resource already exists in the state, then run `terraform apply`. What happens?
5. What does `terraform fmt -check` do, and what exit status does it return when files need formatting?
6. Which command checks that you have not used an unsupported argument such as `sky = "blue"` on `aws_instance`: `fmt`, `validate` or `show`?
7. A folder contains `a.tf`, `b.tf.json` and a subfolder `modules/` with `c.tf`. Which files does `terraform plan` load in the root folder? What happens if `a.tf` and `b.tf.json` both declare `local_file.foo`?
8. You ran `terraform plan -out=infra.plan`, then edited the `.tf` file, then ran `terraform apply infra.plan`. Which version is applied? How do you read the plan file?
9. Which block (and which argument) restricts the Terraform CLI version? Which one restricts the AWS provider version?
10. You change the provider version in `required_providers` from `5.57.0` to `5.54.1` and `terraform plan` complains about an inconsistent dependency lock file. What do you run?
11. What does `terraform graph` output, and how do you convert it to an image? Why not paste it into a public website?
12. Name two reasons you might use `-target`, and one reason you should not use it routinely.
13. Why can a plain `terraform plan` be a problem on a project with hundreds of resources, and what are three mitigations?
14. How do you read the value of an output called `iam_arn` without running `apply`? Where does the value come from?
15. Which of these are valid Terraform comment styles: `#`, `//`, `/* */`, `<!-- -->`, `--`?

### Answers

1. `init` -> `plan` -> `apply` (and `destroy` when finished). Optionally `fmt` and `validate` before `plan`.
2. Neither. `plan` is a dry run and changes no infrastructure. It does not modify the state file either (it only refreshes in memory); `apply` updates state.
3. `1 to add`. Destroy removed the real instance, but the code is still in the configuration, so Terraform assumes you want it to exist.
4. The resource is in state but no longer in the desired configuration, so Terraform plans to **destroy** it and does so after you confirm.
5. It lists files that are not formatted **without modifying anything**. Exit status is non-zero — **3** in the course — when formatting is needed, `0` when everything is already formatted. Used in CI/CD.
6. `terraform validate` (it reports `Unsupported argument`). `fmt` is only style; `show` displays state/plans.
7. `a.tf` and `b.tf.json` are loaded (`.tf` and `.tf.json`); `modules/c.tf` is **not** loaded (subdirectories are ignored unless called by a `module` block). Declaring `local_file.foo` in both is a **duplicate resource configuration** error — addresses must be unique across the merged files.
8. The **saved plan** is applied (the original content); later edits are ignored. Read it with `terraform show infra.plan` (or `terraform show -json infra.plan | jq`); it is a binary file, so `cat` is useless.
9. The **`terraform {}`** block: `required_version` for the CLI; `required_providers` (with `source` and `version`) for providers. Not the `provider` block.
10. `terraform init -upgrade`. It installs the requested version and rewrites `.terraform.lock.hcl`.
11. It prints the dependency graph in **DOT** format. Render with Graphviz: `terraform graph | dot -Tsvg > graph.svg` (or `-Tpng`). Public sites might store the data, and your infrastructure relationships are sensitive. Needs `terraform init` first.
12. Good reasons: an urgent fix to one resource while others are mid-change; destroying one specific resource; repairing a drifted resource; reducing API calls on huge infrastructure. Bad as routine: Terraform loses the full picture of dependencies and drift (and prints a warning), so code and real infrastructure can become inconsistent.
13. Each plan refreshes every resource, producing hundreds of API calls that can hit **throttling/quotas** (even impacting production). Mitigations: split into smaller projects, use `-target`, use `-refresh=false` (cautiously, only when state is trusted). Extra: lower `-parallelism`.
14. `terraform output iam_arn`. The value is read from the **state file** (outputs section), with no re-apply or infrastructure change.
15. `#`, `//` and `/* */`. The others (`<!-- -->`, `--`) are not valid. `#` is the preferred single-line style.

## Glossary

- **Address** — `resource_type.local_name`, the unique identifier of a resource in your configuration (e.g. `aws_instance.myec2`).
- **AMI** — Amazon Machine Image: the OS image an EC2 instance boots from; region-specific.
- **Auto-approve** — `-auto-approve`: skip the interactive `yes` prompt on `apply`/`destroy`.
- **Canonical format** — the standard style produced by `terraform fmt`.
- **DOT** — Graphviz's text language for describing graphs; the format of `terraform graph`.
- **Dependency lock file** — `.terraform.lock.hcl`; records the exact provider versions chosen by `init`.
- **Drift** — real infrastructure no longer matches the state/configuration (see [04](04-state-basics.md), [10](10-backends-locking-drift.md)).
- **In-place update** — a change applied to an existing resource without replacing it (`~`).
- **Refresh** — reading real infrastructure to update Terraform's picture of it; done automatically during `plan`/`apply`.
- **Saved plan** — a binary plan file created by `plan -out`, applied exactly with `apply <file>`.
- **Targeting** — restricting an operation to specific resources with `-target`.
- **Throttling** — a provider rejecting API calls once a rate limit is exceeded.

Next: [04 — State basics](04-state-basics.md).
