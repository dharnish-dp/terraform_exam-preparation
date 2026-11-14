# 09 — Terraform Modules

> **Exam domain(s):** Interact with Terraform modules (use, create, source, version, inputs/outputs); Implement and maintain state (module addresses); Read, generate and modify configuration (variables, outputs, providers inside modules)
> **Source:** lesson 6, lectures 113–128 (workspaces, lectures 129–130, live in [Chapter 10](10-backends-locking-drift.md))   **Time:** ~3–4 h (reading ~1.5 h, labs ~2 h)

## What you will learn

- Why modules exist: the DRY principle, standardisation, and the "10 teams, 10 copies of EC2 code" problem.
- What a module really is (a folder of `.tf` files) and how the `module` block calls one.
- How to find, evaluate and use a ready-made module from the public Terraform Registry (and how to spot a shady one).
- How to build your own module from scratch, in the same order the instructor does: base folders, a hard-coded first module, calling it by local path, finding its flaws, adding variables, replacing the `provider` block with `required_providers`, adding outputs, using the standard file layout, and handing aliased providers to a child module.
- All the module `source` types (local, Registry, GitHub, Bitbucket, generic Git, HTTP, S3) and which ones accept `version`.
- The terms **root module** and **child module** (the exam tests them).
- How to reference a child's values (`module.<name>.<output>`) and why you cannot reach its resources directly.
- The HashiCorp **standard module structure** and the five requirements for publishing a module to the public registry.
- Pointers to related topics owned by other chapters: private registry, workspaces, `moved` blocks, dependency lock file.

---

## 🧠 Pre-concept

### A module is a function you wrote once and call many times

If you have ever written a script, you know the rule: when you copy-paste the same 20 lines in five places, put them in a **function**, give it **parameters**, and call it. Terraform modules are exactly that idea applied to infrastructure.

| Programming idea | Terraform equivalent |
|---|---|
| Function definition | A folder containing `.tf` files (the **module**) |
| Function parameters | `variable` blocks inside the module (**inputs**) |
| Return values | `output` blocks inside the module (**outputs**) |
| Calling the function | A `module` block with a `source` |
| Importing a library | Using a module from the Terraform Registry |

### You are already writing a module

There is no special "module file type". **Any directory that contains Terraform configuration is a module.** The directory you run `terraform apply` in is itself a module (the *root module*, see [root vs child](#root-module-vs-child-module)). A module simply becomes *reusable* when another configuration points at it with a `module` block.

### DRY

**DRY = "Don't Repeat Yourself."** It applies to any language: less repetition means a smaller code base, easier maintenance, and fewer places where a bug can hide. Modules are Terraform's tool for DRY.

> 🎯 **Exam focus:** Terraform's own one-line definition: modules let you **centralise resource configuration** so that multiple projects can reuse the same Terraform code.

---

## 1. Why modules? The "10 teams" problem

Imagine an organisation with 10 teams (a big company may have hundreds). Every team needs EC2 instances for its members, and every team writes its own Terraform for it:

```text
 Team 1 --> own EC2 code      Team 4 --> own EC2 code
 Team 2 --> own EC2 code      Team 5 --> own EC2 code
 Team 3 --> own EC2 code      Team 6 --> own EC2 code   ... (hundreds of teams)
```

Over time this hurts in five ways (the instructor's list):

| # | Challenge | What it means in practice |
|---|---|---|
| 1 | **Repetition of code** | Nearly identical code is copied into every team's repo. |
| 2 | **Change ripple** | If the provider changes an argument (the lecture's hypothetical: `ami` is renamed to `image id`), **every** team must edit its own EC2 block. |
| 3 | **No standardisation** | Each team owns its code, so nobody can guarantee security and Terraform best practices are followed. |
| 4 | **Hard to manage** | Dozens of slightly different copies drift apart. |
| 5 | **Hard for developers to use** | Every developer must learn the full resource syntax. |

### The solution: one central, standard template

A DevOps or security team writes **one standard EC2 template** in a central location, following best practices. Every team just *references* it:

```text
                      +---------------------------+
                      |  Central EC2 module       |   <-- written once by DevOps/security
                      |  (standard, best practice)|
                      +-----------^---------------+
                                  |  module { source = "..." }
         +----------+-------------+------------+-----------+
         |          |             |            |           |
      Team 1      Team 2        Team 3       Team 4      Team N
```

Consequences:

- Standardisation is maintained, because teams cannot quietly change the template.
- A provider-driven change is made **once**, inside the module. Teams do not touch their own code.

### What each team writes

In the instructor's `demo-modules.tf`, the whole file a team writes is three lines: `module`, a `source`, and the closing brace. The `source` points at the standard template (the exact source value was not shown; this is the illustrative shape):

```hcl
module "ec2" {
  source = "<location-of-the-standard-template>"
}
```

Running `terraform plan` on that file showed a new `aws_instance` being planned with all its arguments **not written in the calling file** - they live inside the module. The developer team only references it.

### Many ready-made modules in one project

One project can use several modules, possibly written by other teams or other organisations, so you do not start from scratch:

```text
Team 1 ---+                     +--> EC2 module
Team 2 ---+--- each uses -------+
Team 3 ---+                     +--> VPC module
Team 6 (new team later) also just references them
```

> The single biggest benefit, in the instructor's words: **you do not have to create the entire code from scratch.** The Terraform Registry has modules for IAM, VPC, EKS (Kubernetes) and much more. Building an EKS cluster by hand means reading the `aws_eks_cluster` docs, copying, and learning dozens of options. The EKS module gives you a very large, mature code base for free.

---

## 2. Anatomy of a module call

A module is *called* with a `module` block. Here is the registry example the instructor shows:

```hcl
module "ec2-instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "6.1.4"

  subnet_id = "subnet-xxxxxxxxxxxxxxxxx"   # change to a subnet in YOUR account
}
```

| Part | Meaning |
|---|---|
| `module` | Block type. |
| `"ec2-instance"` | A **local name** you choose. It must be unique among the module blocks in this directory, and it is how you reference outputs later: `module.ec2-instance.<output>`. |
| `source` | **Required.** Where the module's code lives (local path, registry address, Git URL, ...). Only the *format* of the string changes by location. |
| `version` | Which published version to download. Works for **registry** modules (see [versioning](#versioning-modules)). |
| everything else (`subnet_id` here) | **Input variables** declared by the module. Each argument other than the meta-arguments sets the child's variable of the same name. |

Meta-arguments that every `module` block understands (the first two are the ones this course uses; the rest are extra context):

| Meta-argument | Purpose |
|---|---|
| `source` | Where to fetch the module (required). |
| `version` | Version constraint (registry modules). |
| `providers` | Map of provider configurations handed to the child ([Step 8](#step-8--passing-aliased-providers-into-a-module-lecture-127)). |
| `count`, `for_each` | Create multiple instances of the module (extra context, see [Other module features](#other-module-features-worth-knowing)). |
| `depends_on` | Explicit dependency on other objects (extra context). |

> ⚠️ **Gotcha:** if you pass an argument the module does not declare as a `variable`, Terraform errors with `Unsupported argument` ("An argument named ... is not expected here"). A module can only be customised through its declared inputs.

### What `terraform init` does for modules

`terraform init` does more than download providers. It also **installs every module** referenced by `module` blocks. You will see a line "Initializing modules..." followed by the module being downloaded or registered, and *then* "Initializing provider plugins...".

> 🎯 **Exam focus:** `terraform init` downloads modules. If you **add a new `module` block or change its `source`/`version`**, you must run `terraform init` again, otherwise `plan` complains that the module is not installed.

Registry and Git modules are downloaded into `.terraform/modules/` in your working directory (you can open the folder and read the code). Local-path modules are used in place (extra context: Terraform just records the path).

---

## 3. Using a ready-made registry module

### Finding the module (lecture 114)

1. Open the Terraform Registry at `registry.terraform.io` and go to **Browse → Modules**.
2. Each module targets one use case (KMS, VPC, IAM, ... for AWS). The popularity signal: the IAM module showed over **100 million downloads** in the video.
3. Search "EC2" and you get many pages of results. **Anyone can publish a module to the registry**, so do not trust blindly. When unsure, use the most popular, best-maintained one (see [Choosing the right module](#4-choosing-the-right-module)).
4. Searching Google for "Terraform EC2 module" lands on `terraform-aws-modules/ec2-instance/aws` (about 32 million downloads in that video). Its GitHub page has usage examples, extensive docs and dozens of contributors.
5. The registry page has a **Provision Instructions** box on the right with a copy-paste `module` block and a drop-down to choose the **version**.

### Registry address format

```text
<NAMESPACE>/<NAME>/<PROVIDER>
terraform-aws-modules / ec2-instance / aws
```

It mirrors the registry page URL: `registry.terraform.io/modules/terraform-aws-modules/ec2-instance/aws`.

### 🧪 Lab 1 — EC2 instance from a registry module

> **Cost:** one `t2.micro`-class instance plus a security group. Free-tier eligible for a short test. **Destroy at the end.**

**Step 1 — Create an empty folder** and a file `ec2.tf`:

```bash
mkdir module-lab1 && cd module-lab1
```

```hcl
provider "aws" {
  region = "us-east-1"
}

module "ec2-instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "6.1.4"
  # subnet_id deliberately missing for the first attempt
}
```

> The lesson's repo pins `6.1.4` here but `5.6.1` in another note file (and `~> 2.0` in an older demo). Versions change over time. Always follow the **usage instructions of the version you choose**; inputs differ between major versions.

**Step 2 — Initialise.**

```bash
terraform init
```

Expected highlights:

```text
Initializing the backend...
Initializing modules...
Downloading registry.terraform.io/terraform-aws-modules/ec2-instance/aws 6.1.4 for ec2-instance...
- ec2-instance in .terraform/modules/ec2-instance

Initializing provider plugins...
- Installing hashicorp/aws v5.xx.x...

Terraform has been successfully initialized!
```

Notice the order: **modules first, then providers.** The whole module code is now on your disk.

**Step 3 — First plan (expect an error).**

```bash
terraform plan
```

The lecture's transcript was garbled by speech-to-text, but the meaning was: the module could not pick a single subnet automatically, so you must provide `subnet_id`. The instructor adds that when you write your own module you can design it to pick the default VPC/subnet automatically; it varies from module to module.

**Step 4 — Pick a subnet.** AWS Console → VPC → your default VPC → Subnets → copy any subnet ID. Add it:

```hcl
module "ec2-instance" {
  source    = "terraform-aws-modules/ec2-instance/aws"
  version   = "6.1.4"
  subnet_id = "subnet-0123456789abcdef0"   # your own subnet ID
}
```

**Step 5 — Plan again.**

```bash
terraform plan
```

No error now. In the video the plan showed **4 resources** to create: the EC2 instance, the security group, and the security group rules (outbound rules in that version). The exact count depends on the module version.

**Step 6 — Apply.**

```bash
terraform apply -auto-approve
```

Result: one EC2 instance and an associated security group with automatically created outbound rules. You wrote four lines; the module created several resources.

**Step 7 — Look at the module code.** Open `.terraform/modules/`. The module's `main.tf` was **835 lines** in that version (another lecture quotes about 605 lines for a different version). A mature registry module does far more than one instance: multiple instances, spot instances, every optional argument. The examples and docs on the registry page are generated automatically from the GitHub repository.

**Step 8 — Clean up.**

```bash
terraform destroy -auto-approve
```

### An older example, line by line

The instructor's older `terraform-registry.md` shows how inputs look in a classic module call. Credentials are placeholders; **never hard-code real keys** (use environment variables or profiles, see [Chapter 02](02-providers.md)).

```hcl
provider "aws" {
  region     = "us-west-2"
  access_key = "YOUR-ACCESS-KEY"     # placeholder - do not hard-code real keys
  secret_key = "YOUR-SECRET-KEY"     # placeholder
}

module "ec2_cluster" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "~> 2.0"

  name           = "my-cluster"
  instance_count = 1

  ami           = "ami-0d6621c01e8c2de2c"
  instance_type = "t2.micro"
  subnet_id     = "subnet-4dbfb206"

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}
```

- `module "ec2_cluster"` - the local name, used later as `module.ec2_cluster.<output>`.
- `version = "~> 2.0"` - a version *constraint*; "any 2.x release".
- `name`, `ami`, `instance_type`, `subnet_id`, `tags` - inputs declared by the module. `instance_count` belonged to that old release only; newer versions removed it. This is exactly why you must read the docs for the version you pin.

### A bigger one: the VPC module (from the larger-infrastructure demo)

In the lesson 4 demo about large infrastructures ([Chapter 03](03-core-workflow.md)), one registry VPC module call (about 15 lines) plus a security group produced **about 35 resources** (VPC, 3 public and 3 private subnets, route tables, NAT gateway, VPN gateway):

```hcl
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
```

Lesson: a short file can describe a big infrastructure, and every resource still shows up in `terraform plan` and costs API calls on refresh (that is why `-refresh=false` and `-target` exist). The NAT gateway here is a **paid** resource, so do not leave it running.

> 💡 **Interview note from the instructor:** modules are a very common interview topic, and a scenario question on modules appears in the **Terraform Professional** (4-hour practical) certification. For the Associate exam, understand calling, sources, variables, outputs and provider handling.

---

## 4. Choosing the right module

For one object (EC2, IAM, ...) the registry offers many modules from many contributors. Use this checklist:

| # | Check | Where to look | Good sign | Bad sign (examples from the video) |
|---|---|---|---|---|
| 1 | **Total downloads** | Right side of the registry page | Millions (e.g. 14.4 million for the EC2 module at the time) | ~2,000 downloads |
| 2 | **Commits & contributors** | The GitHub link from the registry page | Dozens of contributors committing regularly (e.g. 42) | Last commit 4 years ago, no contributors |
| 3 | **Reported issues** | GitHub "Issues" tab | Few open (3) vs many closed (187) | Many unresolved issues |
| 4 | **Avoid single-maintainer modules** | Contributor count | Many maintainers keep it in sync with provider changes | One person who may never update it |
| 5 | **Documentation** | README: overview, usage, examples | Detailed README with examples | Little information |
| 6 | **Version history** | "Versions" drop-down | Many versions = regularly updated | Only `1.0.0` |
| 7 | **Code quality** | Open `main.tf` | Clean, professionally structured | Messy or minimal |
| 8 | **Community feedback** | GitHub stars and forks | Many stars/forks | 1 fork, 0 stars |
| 9 | **HashiCorp Partner badge** | Filter on the module browse page ("partner") | Partner badge (e.g. Google Cloud project factory) | - |

About the partner badge: you can filter the registry to show only partner-maintained modules, and filter by provider. The popular `terraform-aws-modules` namespace (56 modules, e.g. EKS) does **not** carry the partner tag in the video, yet it is very widely used. So the badge is a helpful signal but **not the only one**: "it is not always that modules written by a HashiCorp Partner are the best."

### ⚠️ Security warnings

- Avoid random, unmaintained or "shady" modules.
- Module code can contain **malicious code**, for example code that sends information about your environment to an attacker.
- If you must use an unknown module, **read its source code first**.

### What do real organisations do?

- Most maintain **their own modules**.
- A common path is to **fork** a registry module and modify it heavily for the organisation's needs.
- Those modules live in a **private registry** inside the organisation, not in the public one (see [Chapter 12](12-hcp-terraform.md) for the HCP Terraform private registry).

Module pages used as examples in the lesson (all pinned to a version):

```hcl
module "ec2-instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "5.6.1"
}

module "eks" {
  source       = "terraform-aws-modules/eks/aws"
  version      = "20.11.1"
  subnet_ids   = ["subnet-xxxxxxxx", "subnet-yyyyyyyy"]   # placeholders; use your own
  cluster_name = "test"
}

module "iam" {
  source  = "terraform-aws-modules/iam/aws"
  version = "5.39.1"
}
```

> 🎯 **Exam focus:** know the trust criteria conceptually (downloads, maintenance, docs, version history, partner badge) and that **anyone can publish to the public registry**, so trust is your responsibility.

---

## 5. Why write your own modules, and the base structure

Many organisations tell teams **not** to depend on public modules because:

- public maintainers update on their own timeline;
- organisations have niche requirements for how a module is designed and which aspects a developer may modify.

Public registry modules are also **huge** because they must serve hundreds of organisations with different needs, so they expose *every* option of the resource (tags, subnet, source/destination check, `user_data_base64`, `maintenance_options`, ...) and ship examples and a licence. Your organisation's module only needs the options **your use cases** require, so it can be a 3-line or a 100-line module. The only rule: whatever sits in the modules folder must be usable by several teams **without those teams writing `aws_instance` themselves**.

### Step 0 — Create the base folder structure (lecture 116)

```text
kplabs-terraform-modules/
├── modules/                 <-- central modules folder
│   ├── ec2/                 <-- each sub-folder = one module (actual Terraform code)
│   ├── sg/
│   ├── iam/                 (slide examples: EC2, IAM, VPC, SG)
│   └── vpc/
└── teams/                   <-- teams call modules from here
    ├── A/
    └── B/
```

- The base folder has a `modules` sub-folder; inside it, **one sub-folder per module**.
- Each module folder holds the real Terraform code that other projects reference, just like referencing a module on GitHub or the registry.
- Each team calls whichever modules it needs. Team 2 needs IAM resources, so it references the IAM module; another team needs a security group, so it references the SG module.

In the demo, the instructor created `kplabs-terraform-modules` with `modules/ec2`, `modules/sg`, `teams/A` and `teams/B`. The plan: `teams/A` will reference `modules/ec2`. (The instructor's GitHub repo uses `kplabs-modules/projects/A` instead of `teams/A`; same idea, different folder name.)

Create it yourself:

```bash
mkdir -p kplabs-terraform-modules/modules/ec2
mkdir -p kplabs-terraform-modules/modules/sg
mkdir -p kplabs-terraform-modules/teams/A
mkdir -p kplabs-terraform-modules/teams/B
cd kplabs-terraform-modules
```

> 🎯 **Exam focus:** a module is simply a folder of `.tf` files. Nothing needs to be registered: a folder with Terraform code is already a module.

---

## 6. Step 1 — A first (naive) module

The key idea of lecture 117: the module is **not special code**. It is ordinary resource code placed in the modules folder.

Create `modules/ec2/main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-0bb84b8ffd87024d8"   # example AMI; AMI IDs are region-specific, look up a current one
  instance_type = "t2.micro"
}
```

Three things are hard-coded here, and the next steps fix them:

- `provider "aws"` with a hard-coded **region** `us-east-1`;
- the **AMI**;
- the **instance type**.

> The repo copy `kplabs-modules/modules/ec2/ec2.tf` is an early variant that uses `instance_type = var.instance_type` without a `variable` block in the file shown. It is a snapshot from a different point of the course. Treat the code above (from `creating-module.md`) as the lecture's code.

---

## 7. Module sources: where a module can live

A `module` block **must** contain `source`. The block and the `source` argument are constant; only the **format** of the string changes with the location.

```hcl
module "ec2" {
  source = "<where the module lives>"
}
```

Locations supported: local paths, Terraform Registry, GitHub, Bitbucket, generic Git repositories, Mercurial, HTTP URLs, S3 buckets, GCS buckets (the lecture lists GitHub, Bitbucket, generic Git, HTTP URLs, S3, the Registry and local paths).

| Location | Style of `source` | Accepts `version`? |
|---|---|---|
| Local path | `./modules/ec2` or `../../modules/ec2` (**must begin with `./` or `../`**) | No |
| Terraform Registry (public) | `<NAMESPACE>/<NAME>/<PROVIDER>` e.g. `terraform-aws-modules/vpc/aws` | **Yes** |
| Private registry (HCP Terraform) | `app.terraform.io/<ORG>/<NAME>/<PROVIDER>` (copy the exact string from the module page) | **Yes** |
| GitHub | `github.com/<user>/<repo>` (**must start with `github.com`**, no `https://`) | No (use `?ref=`) |
| Generic Git repo | `git::https://example.com/vpc.git` | No (use `?ref=`) |
| Bitbucket | `bitbucket.org/<org>/<repo>` | No (use `?ref=`) |
| HTTP URL | URL form per docs | No |
| S3 bucket | Must start with **`s3::`** followed by the object URL | No |

**How do you know the exact syntax?** Read the official **Module Sources** documentation (`developer.hashicorp.com/terraform/language/modules/sources`). Every source type has a documented format and examples. When `terraform init` fails to fetch a module, compare your `source` string with the documented format for that source type.

> 🎯 **Exam focus:** "Which sources can a module use?" Local, Registry, GitHub, Bitbucket, Git, HTTP, S3 (`s3::`), GCS. "Which must begin with `./` or `../`?" Local paths.

### Demo: calling a module from GitHub (lecture 118)

The instructor published a sample repo `github.com/zealvora/sample-kplabs-terraform-ec2-module` containing a simple `main.tf`. Using it:

```hcl
module "ec2" {
  source = "github.com/zealvora/sample-kplabs-terraform-ec2-module"
}
```

Steps and the mistake worth remembering:

1. In an empty folder, create `modules.tf`.
2. The first attempt copied the format with `https://` in front: `https://github.com/zealvora/...`.
3. `terraform init` failed: **"error downloading ... no source URL was returned"**.
4. Cause: the GitHub source format must **start with `github.com`**. Remove `https://`.
5. `terraform init` again succeeds, installing the AWS provider.
6. `terraform plan` shows the EC2 instance defined inside the module.

```bash
terraform init
terraform plan
```

> ⚠️ **Gotcha:** `github.com/...` works as a shortcut **only** in this form. A full URL needs the explicit `git::` prefix (`git::https://github.com/org/repo.git`).

### Git sources: pin with `?ref=`

The lesson's `demofile.md` (mentioned in lesson 7) shows Git sources with a branch: `?ref=development`. The `ref` query selects a branch, tag or commit:

```hcl
module "ec2_main_branch" {
  source = "git::https://example.com/ec2-module.git"
}

module "ec2_dev_branch" {
  source = "git::https://example.com/ec2-module.git?ref=development"
}

module "ec2_pinned_tag" {
  source = "github.com/zealvora/sample-kplabs-terraform-ec2-module?ref=v1.0.0"
}
```

(The tag `v1.0.0` here is illustrative; the sample repo's tags were not shown.) This is **extra context**: `version = "..."` does not work for Git sources; you pin them with `?ref=<tag>` inside `source`.

### Subdirectories with `//`

(Extra context.) A repo can contain several modules. Use a double slash to select a subdirectory: `source = "github.com/org/repo//modules/vpc?ref=v1.2.0"`.

---

## 8. Step 2 — Call the module with a local path (lecture 119)

Team A's folder and the module folder are on the **same machine**, so the right source type is a **local path**.

> **Rule (from the docs):** a local path must begin with `./` or `../`.

### Understanding `../`

`..` means "go up one directory". Starting from the folder that holds your calling code:

```text
kplabs-terraform-modules/
├── modules/
│   └── ec2/            <-- target
└── teams/
    └── A/              <-- module.tf lives here (starting point)
```

From `teams/A`:

- first `../` → `teams/`
- second `../` → `kplabs-terraform-modules/`
- then `modules/ec2` → the module folder

So the source is `../../modules/ec2`. The path is **relative to the directory that contains the calling configuration**.

Create `teams/A/module.tf`:

```hcl
module "ec2" {
  source = "../../modules/ec2"
}
```

(The repo uses `module "ec2module"` in `projects/A/myec2.tf`, plus a `providers.tf` with placeholder credentials. Prefer environment variables or profiles instead of hard-coded keys.)

Run it from `teams/A`:

```bash
cd teams/A
terraform init
terraform plan
```

Expected `init` output:

```text
Initializing the backend...
Initializing modules...
- ec2 in ../../modules/ec2

Initializing provider plugins...
- Installing hashicorp/aws v5.x.x ...
```

Expected `plan`: **1 to add**, an `aws_instance.myec2` (shown as `module.ec2.aws_instance.myec2`) with `t2.micro` and the AMI defined inside the module. Team B referencing a security-group module would look almost identical (`../../modules/sg`).

> 🎯 **Exam focus:** local path = `./` or `../` prefix, relative to the calling configuration's directory.

---

## 9. Step 3 — Find the flaws in the first version (lecture 120)

The module works, but a professional module needs improvements. The instructor demonstrates two shortcomings.

### Shortcoming 1: hard-coded values

Region, AMI and instance type are fixed inside the module. Try to override the type from Team A:

```hcl
module "ec2" {
  source        = "../../modules/ec2"
  instance_type = "t2.large"      # try to override
}
```

```bash
terraform plan
```

```text
Error: Unsupported argument

  on module.tf line 3, in module "ec2":
   3:   instance_type = "t2.large"

An argument named "instance_type" is not expected here.
```

The module declares no such input, so the argument is rejected. With hard-coded values, **every consumer is stuck with the same value**. In **public** modules hard-coded values are "a big no-no" because everyone's environment differs; for your own organisation avoid them too.

### Shortcoming 2: hard-coded provider and region

Experiment: in the calling code, add a provider with region `ap-south-1`, while the module has its own `provider "aws" { region = "us-east-1" }`:

```hcl
# calling code
provider "aws" {
  region = "ap-south-1"
}

module "ec2" {
  source = "../../modules/ec2"
}
```

Observed:

- `terraform plan` shows **no error** (1 to add) and does not show the region.
- `terraform apply -auto-approve` creates the instance in **`us-east-1`**, because the module's own provider block won. (An AMI from Mumbai would have failed, because AMI IDs are region-specific.)
- Confirmed in the state file (the `arn` contains `us-east-1`) and in the EC2 console in N. Virginia. The instance was terminated afterwards.

> ⚠️ **Gotcha:** a `provider` block inside a module silently overrides what the caller intended. In the lecture's words: "this code can only run in the us-east-1 region."

```bash
terraform destroy -auto-approve   # always clean up between experiments
```

### The recommended fix (previewed)

Do not hard-code the provider. Add a **`required_providers`** block stating which provider versions the module code works with, for example `>= 5.5`. That avoids errors for users when the module is incompatible with a particular provider version. See Step 5.

> 🎯 **Exam focus:** a module can only be customised through its **input variables**. An undeclared argument produces "Unsupported argument".

> **Up to date (TF 1.12):** HashiCorp's documentation says provider configurations inside reusable child modules are **discouraged**; provider blocks belong in the root module. A module that contains its own `provider` block is called a "legacy module" and cannot be used with `count`, `for_each` or `depends_on` on the `module` block. Declare requirements with `required_providers` and let the root module configure the provider.

---

## 10. Step 4 — Replace hard-coded values with variables (lectures 121–122)

### Bad vs good

```text
BAD (hard-coded)                      GOOD (variables)
resource "aws_instance" "x" {         resource "aws_instance" "x" {
  ami           = "ami-0abc..."         ami           = var.ami
  instance_type = "t2.micro"            instance_type = var.instance_type
}                                     }
```

With variables, callers override per environment:

```text
Team 1:  instance_type = "t2.micro"   -> t2.micro instance
Team 2:  instance_type = "m5.large"   -> m5.large instance
```

The professionally written registry EC2 module makes **nearly every argument a variable** because thousands of users have different needs. Not every value in your organisation's module has to be a variable ("depends on environment and use case"), but as a best practice make arguments variables when you want flexibility.

Variables themselves (types, defaults, descriptions, assignment methods) are covered in [Chapter 06](06-variables-outputs-locals.md). Inside a module they are simply the module's **input interface**.

### The child module (variables first)

`modules/ec2/main.tf` after this step:

```hcl
provider "aws" {
  region = var.region
}

resource "aws_instance" "myec2" {
  ami           = var.ami
  instance_type = var.instance_type
}

variable "ami" {}
variable "instance_type" {}
variable "region" {}
```

- The three empty `variable` blocks (no default, no type) make `ami`, `instance_type` and `region` **required inputs**. The red squiggle in the editor disappears once each variable is declared.
- Best practice (not done in the lecture, for simplicity): put variable declarations in a separate `variables.tf` (see [Step 7](#step-7--the-standard-module-structure-lecture-126)).

### Plan without values: expect an error

From `teams/A` with the old call (`source` only):

```bash
terraform plan
```

```text
Error: Missing required argument

  on module.tf line 1, in module "ec2":
   1: module "ec2" {

The argument "ami" is required, but no definition was found.
(same for "instance_type" and "region")
```

The module now **requires** the three values.

### The calling module

First remove the earlier `provider "aws" { region = "ap-south-1" }` block from the caller (the module owns the region for now), then:

```hcl
module "ec2" {
  source        = "../../modules/ec2"
  instance_type = "t2.large"
  ami           = "ami-123"          # dummy; fine for plan only
  region        = "ap-south-1"
}
```

Each argument other than `source` sets the child's variable of the same name. `ami-123` is a dummy value used only to show `terraform plan` working. `terraform plan` now shows `instance_type = "t2.large"`, `ami = "ami-123"` and the region from the module call. Change `t2.large` to `t2.micro` and the plan changes accordingly.

> ⚠️ **Gotcha:** do not `apply` with `ami-123`. It is not a real AMI and AWS would reject it.

> 🎯 **Exam focus:** a variable with no `default` is **required**. Module arguments (apart from the meta-arguments) are the child's input variables.

---

## 11. Step 5 — Replace `provider` with `required_providers` (lecture 123)

**Goal:** remove the hard-coded provider block from the module and use `required_providers` instead.

**Why:** your code may work only with certain AWS provider versions. Listing the working versions in `required_providers` makes `terraform init` install only compatible plugins, so users do not hit surprise errors.

### The final child module

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}

resource "aws_instance" "myec2" {
  ami           = var.ami
  instance_type = var.instance_type
}

variable "ami" {}
variable "instance_type" {}
```

- `required_providers` maps a **local name** (`aws`) to a `source` (`hashicorp/aws`, the official AWS provider) and a `version` constraint.
- **How the instructor chose `>= 5.50`:** he checked which provider version was actually installed by reading the lock file `.terraform.lock.hcl` (the transcript says "log.hcl"): it was **5.51**, and the latest published three days earlier was 5.52.0. So `>= 5.50` is acceptable; you may also be much more specific.
- The `region` **variable was removed**, because the module no longer has a provider block.

### The final calling code

```hcl
provider "aws" {
  region = "ap-south-1"
}

module "ec2" {
  source        = "../../modules/ec2"
  instance_type = "t2.large"
  ami           = "ami-123"
}
```

- The **root module** now owns the `provider` block, and with it the region. The child **inherits** it.
- The `region` argument is gone from the `module` call.

### Gotcha demonstrated: the local name must match

After editing, `terraform plan` showed 1 to add plus a **warning** about the provider being implicitly specified but listed in `required_providers` under a different name. In the video, the instructor had typed a wrong local name (transcribed as "My Cloud") instead of `aws`. Fixing the name back to `aws` removed the warning.

> ⚠️ **Gotcha:** the local name in `required_providers` must match the provider prefix used by your resources (`aws_*` → `aws`).

> 🎯 **Exam focus:** child modules declare **requirements** (`required_providers`); the root module supplies **configuration** (`provider` blocks). `required_providers` entries have a `source` (e.g. `hashicorp/aws`) and a `version` constraint (`>=`, `~>`, `=`, `<=`, ...). Version constraint syntax and provider tiers are owned by [Chapter 02](02-providers.md).

---

## 12. Step 6 — Module outputs (lecture 124)

### The problem

You have a root module that calls a child module (creates an EC2 instance) and also an **Elastic IP** (`aws_eip`, a static public IPv4 address) that must be attached to that instance. A root-module resource cannot read a child-module resource directly.

Manually you would: (1) launch the instance, (2) allocate an Elastic IP, (3) associate it with the instance. An unattached EIP has no value and **incurs charges**; once associated, the instance's public IP equals the EIP. `aws_eip` has an `instance` argument that takes the instance ID.

```text
ROOT module                                   CHILD module (modules/ec2)
┌─────────────────────────────┐              ┌──────────────────────────────┐
│ module "ec2" { source=... } │─── calls ──> │ resource "aws_instance"...   │
│                             │              │ output "instance_id" {       │
│ resource "aws_eip" "this" { │ <── value ── │   value = aws_instance..id   │
│   instance = module.ec2.    │              │ }                            │
│              instance_id    │              └──────────────────────────────┘
│ }                           │
└─────────────────────────────┘
```

### Base code (before the fix)

Child module `modules/ec2/main.tf`:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = "t2.micro"
}
```

Root `teams/A/main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

module "ec2" {
  source = "../../modules/ec2"
}

resource "aws_eip" "this" {
  domain = "vpc"
}
```

`domain = "vpc"` tells the EIP it is for use in a VPC. (Extra context: older code used `vpc = true`; `domain = "vpc"` is the current provider syntax.)

### The failed attempt

The instructor first tried to reference the attribute directly: `instance = module.ec2.id`, then ran `terraform validate`:

```text
Error: Unsupported attribute

  on main.tf line 10, in resource "aws_eip" "this":
  10:   instance = module.ec2.id

This object does not have an attribute named "id".
```

Child-module resources are **not visible** to the parent. Only **declared outputs** are.

### The fix: add an `output` in the child module

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = "t2.micro"
}

output "instance_id" {
  value = aws_instance.myec2.id
}
```

- `output "instance_id"` - the output's **name**. Callers use this name.
- `value = aws_instance.myec2.id` - inside the child you reference the resource attribute normally (`id` is the instance ID, found in the attribute reference of the `aws_instance` docs).

The root module, final:

```hcl
provider "aws" {
  region = "us-east-1"
}

module "ec2" {
  source = "../../modules/ec2"
}

resource "aws_eip" "this" {
  domain   = "vpc"
  instance = module.ec2.instance_id
}
```

The instructor's own slip, worth learning from: his first attempt used the wrong output name. The output is `instance_id`, so the reference must be `module.ec2.instance_id`. After correcting it, `validate` succeeded.

### Reference syntax

| Where | Syntax | Example |
|---|---|---|
| Same configuration (earlier lectures) | `<resource_type>.<name>.<attribute>` | `aws_instance.myec2.id` |
| Module output, from the parent | **`module.<module_name>.<output_name>`** | `module.ec2.instance_id` |

### Verification

```bash
terraform validate
terraform apply -auto-approve
```

`validate` reports success. `apply` creates the EC2 instance and the EIP; in the console the instance's public IP equals the Elastic IP. Because of the reference, Terraform also understands the **dependency** (extra context: it is an implicit dependency, so the EIP waits for the instance; see [Chapter 05](05-resources-data-dependencies.md)).

```bash
terraform destroy -auto-approve    # release the EIP and terminate the instance
```

### Related repo example: security group output (un-narrated)

A security-group variant of the same idea (folder `module-outputs/`):

```text
module-outputs/
├── modules/sg/sg.tf        (child: SG + output "sg_id")
└── projects/C/
    ├── providers.tf        (aws provider us-west-2)
    └── my-sg.tf            (root: calls module, uses module.sgmodule.sg_id)
```

The child ends with:

```hcl
output "sg_id" {
  value = aws_security_group.ec2-sg.id
}
```

(The security group above it allows inbound TCP 8433 from `0.0.0.0/0` and all egress: demo-only settings.) The root:

```hcl
module "sgmodule" {
  source = "../../modules/sg"
}

resource "aws_instance" "web" {
  ami                    = "ami-0ca285d4c2cda3300"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [module.sgmodule.sg_id]
}

output "sg_id_output" {
  value = module.sgmodule.sg_id
}
```

Two points: the root attaches the module-created security group to an instance, and it **re-exports** the module output as a root output.

### Another un-narrated example: `module-locals`

The repo folder `module-locals/` has a child `modules/sg/sg.tf` with two security groups (`myec2-sg` and `myelb-sg`) that share an identical ingress rule (TCP 8433 from `0.0.0.0/0`) plus allow-all egress, and a root `projects/B` that calls it. The repeated values suggest a refactoring exercise with `locals` (see [Chapter 06](06-variables-outputs-locals.md)). It has no narration in this session. The wide-open CIDR is demo-only.

> 🎯 **Exam focus:**
> - A parent can only access a child module's **output values**, never its resources directly.
> - Syntax: `module.<MODULE NAME>.<OUTPUT NAME>`.
> - Outputs let other resources (or other projects, for cross-project collaboration) consume values from modules.
> - To see a child's output on the CLI after `apply`, you must **re-export it as a root-module output** (extra context).

> **Up to date (TF 1.12):** outputs can be marked `sensitive = true` and, in newer versions, `ephemeral = true` (see [Chapter 08](08-lifecycle-conditions-sensitive.md)). An ephemeral child-module output cannot be persisted to state.

---

## Root module vs child module

**Heads-up from the instructor: HashiCorp may test these two terms in the exam.**

| Term | Definition (lecture) | In our folders |
|---|---|---|
| **Root module** | Resides in your **main Terraform working directory**; it is the **entry point** of your infrastructure definition. The code that *calls* other modules. | `teams/A/` (or `projects/A/`), or the repo's `main.tf` that has `module {}` blocks. |
| **Child module** | A module that has been **called by another module**. | `modules/ec2`, `modules/sg`, `modules/network` |

```text
┌─ Root module (working directory: where you run terraform init/plan/apply) ─┐
│   module "ec2" { source = "../../modules/ec2" }  ---------------+          │
└──────────────────────────────────────────────────────────────── | ─────────┘
                                                                  v
                                           ┌─ Child module: modules/ec2 ─┐
                                           │  aws_instance ..., outputs  │
                                           └─────────────────────────────┘
```

| Root module | Child module |
|---|---|
| The working directory; the entry point | Called by another module |
| Contains `module {}` blocks and provider configurations | Contains reusable resources, `variable`s, `output`s |
| Receives the CLI commands (`init`, `plan`, `apply`) | Referenced through `source` |

- In `kplabs-terraform-modules`, everything under `modules/` (EC2, SG, ...) is a **child module**; the code that calls them is the **root module**.
- (Extra context) Every Terraform configuration has a root module (the `.tf` files in the directory where you run Terraform). A child module can itself call further child modules, forming a tree.

> 🎯 **Exam focus:** root module = the working directory with the `module` call; child = the called module.

---

## Step 7 — The standard module structure (lecture 126)

HashiCorp recommends a standard layout for reusable modules. It is "not a must-follow, but a should-follow" (except for publishing, see [Publishing modules](#publishing-modules-to-the-public-registry-lecture-128)).

### Minimal recommended structure

```text
my-module/
├── README.md       # documentation: what the module does, how to use it
├── main.tf         # the main resources
├── variables.tf    # input variables
└── outputs.tf      # output values
```

### Complete (expanded) structure

```text
my-module/
├── README.md
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/            # nested sub-modules
│   ├── nestedA/
│   │   ├── README.md
│   │   ├── variables.tf
│   │   ├── main.tf
│   │   └── outputs.tf
│   └── nestedB/ ...
└── examples/           # usage examples
    ├── exampleA/ ...
    └── exampleB/ ...
```

Popular modules often add `versions.tf`, which contains the `required_providers` block (and may carry licence info). Not every file is mandatory for every module; it depends on requirements. In the lecture the instructor inspected a Google Cloud pattern module (GCE) and `terraform-aws-ec2-instance`; both have `main.tf`, `outputs.tf`, `variables.tf`, `README.md` and `versions.tf`. The VPC module also has a `modules/` folder (e.g. `vpc-endpoints`) and `examples/`.

**Why it matters:** if every module follows the same layout, a *user* knows where to look (open `versions.tf` to find `required_providers`) instead of opening every file. Terraform itself does not care about file names: it merges all `.tf` files in a directory ([Chapter 03](03-core-workflow.md)), so the split is purely for humans.

### Refactor our EC2 module to the standard layout

Take the module from Step 5 and split it:

`modules/ec2/versions.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}
```

`modules/ec2/variables.tf`

```hcl
variable "ami" {
  description = "AMI ID to launch (must exist in the region of the root provider)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}
```

`modules/ec2/main.tf`

```hcl
resource "aws_instance" "myec2" {
  ami           = var.ami
  instance_type = var.instance_type
}
```

`modules/ec2/outputs.tf`

```hcl
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.myec2.id
}
```

`modules/ec2/README.md` (short but useful)

```markdown
# ec2 module
Creates one EC2 instance.

Inputs: ami (required), instance_type (default t2.micro)
Outputs: instance_id
```

The behaviour is identical to before: the `description`, `type` and `default` additions are improvements you get for free (see [Chapter 06](06-variables-outputs-locals.md)). With a `default` on `instance_type`, callers may now omit it.

### Plan a collection of modules, not a giant one

The slide architecture: Route 53 (DNS) → a VPC containing a load balancer, a firewall, EC2 instances and a database; plus S3 and IAM.

- **Do NOT build one giant module** that deploys the entire infrastructure. The instructor calls that "a big no-no".
- **Build a collection of modules**, one per service or concern: DNS, networking, IAM, database, S3, and so on.
- Teams pick what they need. A team that only needs a database uses just the database module, instead of writing database code from scratch.

> 🎯 **Exam focus:** minimal standard files are **README.md, main.tf, variables.tf, outputs.tf**. Best practice: one module per service or logical unit, composed together. The standard structure is also a **requirement for publishing** to the public registry.

---

## Step 8 — Passing aliased providers into a module (lecture 127)

### Starting point: default provider inheritance

So far the provider is configured in the **root module** and child resources **inherit** it. A root provider with region `us-east-1` means all child resources are created in `us-east-1`.

### New requirement

A child module has two resources, `dev-sg` and `prod-sg`. You want `dev-sg` in **North Virginia (`us-east-1`)** and `prod-sg` in **Mumbai (`ap-south-1`)**. Configuring both providers in the root is not enough by itself.

### Layout

```text
kplabs-terraform/
├── main.tf                 # ROOT module
└── modules/
    └── network/
        └── sg.tf           # CHILD module (two security groups)
```

(The transcript says the module file was `az.tf`; that was a transcription slip. The repo file is `modules/network/sg.tf`.)

### Phase 1 — default inheritance (works as before)

Child `modules/network/sg.tf`:

```hcl
resource "aws_security_group" "dev" {
  name = "dev-sg"
}

resource "aws_security_group" "prod" {
  name = "prod-sg"
}
```

Root `main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

module "sg" {
  source = "./modules/network"
}
```

```bash
terraform init
terraform plan            # 2 security groups to add
terraform apply -auto-approve
```

Both security groups land in N. Virginia. Local-path note: this source begins with `./` because the module is in a sub-folder of the current directory.

### Phase 2 — adding an alias is NOT enough

Add a second provider configuration to the root:

```hcl
provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}
```

Both resources **still** land in `us-east-1`. The **default** provider is inherited by the child, but **aliased providers are not inherited automatically**. Adding `provider = aws.mumbai` to the *module* block (the wrong place) gives a `terraform plan` error because the provider configuration is not found or passed. (The instructor made small typos and ran `terraform destroy -auto-approve` between attempts to start each step clean.)

### Phase 3 — the three-step solution

**Step A — root module: pass the provider with the `providers` map** (inside the `module` block):

```hcl
module "sg" {
  source = "./modules/network"
  providers = {
    aws.prod = aws.mumbai
  }
}
```

Read it as: "the root's `aws.mumbai` is handed to the child under the name `aws.prod`." The child-side name (`aws.prod`) can be any name you choose.

**Step B — child module: declare it with `configuration_aliases`** inside `required_providers`:

```hcl
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.prod]
    }
  }
}
```

**Step C — child resource: use the `provider` meta-argument**:

```hcl
resource "aws_security_group" "dev" {
  name = "dev-sg"                 # no provider argument -> default provider -> us-east-1
}

resource "aws_security_group" "prod" {
  name     = "prod-sg"
  provider = aws.prod             # -> whichever root provider is mapped to aws.prod (Mumbai)
}
```

### The final root `main.tf`

```hcl
provider "aws" {
  region = "us-east-1"
}

provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}

module "sg" {
  source = "./modules/network"
  providers = {
    aws.prod = aws.mumbai
  }
}
```

### Provider hand-off diagram

```text
ROOT                                CHILD (modules/network)
provider "aws" (default, us-east-1) ───(inherited)────────────> aws_security_group.dev   -> us-east-1
provider "aws" alias=mumbai ─┐
                             │ providers = { aws.prod = aws.mumbai }
                             └──────────> configuration_aliases = [aws.prod]
                                          aws_security_group.prod { provider = aws.prod } -> ap-south-1
```

### Verification

```bash
terraform validate
terraform apply -auto-approve
```

The state file shows one resource in `us-east-1` and the other in `ap-south-1`. In the AWS console `dev-sg` exists in N. Virginia and `prod-sg` in Mumbai. Clean up with `terraform destroy -auto-approve` (security groups are free, but tidy up anyway).

### Two pointers to remember

| Point | Detail |
|---|---|
| `provider` vs `providers` | On a **resource**, `provider = aws.xyz` takes a **single** reference. On a **module** block, `providers = { ... }` takes a **map**, because a module can contain resources of many different providers (key = name in the child, value = provider configuration in the root). |
| Aliased providers are never inherited | Provider configurations with `alias` are **never** inherited automatically by child modules; you must pass them explicitly with the `providers` map. Only the default (un-aliased) one is inherited. |

| Resource `provider` | Module `providers` |
|---|---|
| Single reference: `provider = aws.prod` | Map: `providers = { aws.prod = aws.mumbai }` |

> **Up to date (TF 1.12):** if a child only needs **one** non-default provider and no default at all, you can map the child's default to the root's alias: `providers = { aws = aws.mumbai }`. This is the shape lesson 8 mentions as extra context (`providers = { aws = aws.usa }`). Aliased providers themselves (the root-level concept) are owned by [Chapter 02](02-providers.md).

> 🎯 **Exam focus:**
> - Default provider config is inherited by child modules; aliased ones must be passed explicitly via `providers = { child_name = root_provider }`.
> - The child declares the aliases it expects with `configuration_aliases` in `required_providers`.
> - `providers` (module block, map) vs `provider` (resource, single reference).

---

## Versioning modules

A module can have **many versions**. Use the **`version`** argument to pin one:

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "18.8.0"
}
```

Selecting version `18.8.0` on the registry page changes the sample code's `version` to `18.8.0`. In the instructor's words: "Whatever code was written for this version will be pulled; the latest code will not be pulled." Without `version`, you get the **latest** release, which may contain breaking changes the next time someone runs `terraform init` in a fresh folder.

> 🎯 **Exam focus:** the `version` argument and its purpose (pin a module version).

### Version constraint operators (extra context for modules)

| Constraint | Meaning |
|---|---|
| `"6.1.4"` | Exactly that version |
| `">= 5.0"` | That version or newer |
| `"~> 5.1"` | Any `5.x` version `>= 5.1` (the right-most number may increase) |
| `"~> 5.1.2"` | `>= 5.1.2` and `< 5.2.0` |
| `">= 1.0, < 2.0"` | A range |

Full constraint syntax is covered in [Chapter 02](02-providers.md).

### ⚠️ Modules are NOT recorded in the lock file

From lesson 8 (dependency lock file): `.terraform.lock.hcl` tracks **only providers**. It does **not** remember versions of **remote modules**. Terraform always selects the **newest** available module version that satisfies your constraint. So **always pin or constrain registry module versions** yourself. See [Chapter 02](02-providers.md).

> **Up to date (TF 1.12):** `version` works only for **registry** modules (public and private). For Git, GitHub, Bitbucket and similar, pin with `?ref=<tag or commit>` in `source`. For local paths there is nothing to pin: you always get the files on disk. To upgrade a module to the newest allowed version, run `terraform init -upgrade`; `terraform get` (and `terraform get -update`) also exist for modules only.

---

## Publishing modules to the public registry (lecture 128)

Anyone can publish and share modules on the public Terraform Registry (sign in with GitHub through **Publish → Module**). Published modules get **versioning**, **automatically generated documentation**, **version history browsing**, **examples**, and **README rendering**. A module's page shows a description, publish date, who manages it, and a link to the **source code on GitHub**, where the actual module contents are stored.

### Requirements (exam relevant)

| Requirement | Detail |
|---|---|
| **GitHub** | The module must be on GitHub and must be a **public repository** (public registry). |
| **Name** | The repository must use the three-part name **`terraform-<PROVIDER>-<NAME>`**, e.g. `terraform-aws-vpc`, `terraform-aws-eks`, `terraform-aws-security-group`. |
| **Repository description** | The GitHub repo description populates the short description on the registry. |
| **Standard module structure** | Must follow the file/directory layout (minimal: `README.md`, `main.tf`, `variables.tf`, `outputs.tf`; see [Step 7](#step-7--the-standard-module-structure-lecture-126)). |
| **`x.y.z` tags for releases** | The registry uses Git tags to identify versions. Release tag names must be a **semantic version**, optionally prefixed with `v` (e.g. `v1.0.4` or `0.9.2`). E.g. the VPC module has `3.14.0`, `3.13.0`, `3.12.0`. |

Memorise the five: **GitHub (public), name `terraform-<provider>-<name>`, repo description, standard module structure, `x.y.z` release tags.**

> Extra context: in the name `terraform-<PROVIDER>-<NAME>`, `<PROVIDER>` is a single word (`aws`, `google`, `azurerm`) and `<NAME>` describes what the module builds (it may contain hyphens).

### Publishing a new version

A new module version = a new Git **tag** (release) such as `v1.0.5`. The registry picks it up from the tag. For the **private registry** in HCP Terraform (and Terraform Enterprise) you connect a Git provider, choose the repository and a publishing type (**tag-based** or **branch-based**); in lesson 9's demo, the private module was branch-based and the instructor published version `1.0.4` after `1.0.3`. That is the topic of [Chapter 12](12-hcp-terraform.md).

---

## Private registry: what to know here

- Organisations that do not want to publish internally used modules to the public registry use a **private registry**. HCP Terraform provides one as part of the platform, so you do not need to build your own. See [Chapter 12](12-hcp-terraform.md).
- Consuming a private module is like a public one; **only the `source` URL differs** (copy the exact string from the module's usage panel, such as `app.terraform.io/<org>/<module>/<provider>`), plus `version`.
- Outside HCP Terraform, `terraform init` on a private module without credentials fails with **unauthorized**. Configure an API token (for example `terraform login`).

```hcl
# (reconstructed; copy the exact source from the registry's usage panel)
module "private_module" {
  source  = "app.terraform.io/<your-org>/private-module/<provider>"
  version = "1.0.3"

  word_count = 4
}
```

---

## Other module features worth knowing

Everything in this section is **extra context** (not narrated in the lecture) but is helpful for the exam and for real work.

### Module addresses in state and CLI

Resources created by a module appear in state with a `module.<name>.` prefix:

```text
$ terraform state list
aws_eip.this
module.ec2.aws_instance.myec2
```

State commands, `-target`, `moved` blocks and `import` all use these addresses (for example `terraform plan -target=module.ec2`). See [Chapter 04](04-state-basics.md) and [Chapter 11](11-import-state-cli-logging.md). When you refactor loose resources into a module, a `moved` block tells Terraform the resource did not need to be destroyed and recreated ([Chapter 11](11-import-state-cli-logging.md)).

### `count` and `for_each` on modules

```hcl
module "web" {
  source   = "./modules/ec2"
  for_each = toset(["a", "b", "c"])

  ami           = var.ami
  instance_type = "t2.micro"
}
```

Each instance is addressed `module.web["a"]`. See [Chapter 07](07-types-loops-functions.md). This is not possible with legacy modules that contain their own `provider` blocks.

### `path.module`, `path.root`

Inside a module, `path.module` is the directory of **that module's own `.tf` files** (lesson 4 used `"${path.module}/foo.txt"` to avoid hard-coded absolute paths). `path.root` is the root module's directory. Use `path.module` for files that ship with the module (templates, scripts).

### Module nesting

A child module can call other modules. Each level is an independent set of variables and outputs, so the root can only see the top-level outputs of the modules it calls directly.

### Input validation in module variables

Because module inputs are plain variables, `validation` blocks make a module safe to consume; see [Chapter 08](08-lifecycle-conditions-sensitive.md).

### Workspaces

One configuration with several state files (dev/prod) is solved by **workspaces**, not by modules. See [Chapter 10](10-backends-locking-drift.md). Modules answer "how do I reuse code?"; workspaces answer "how do I keep multiple states of the same code?".

---

## 🧪 Lab 2 — Build your own module end to end

This lab assembles the whole progression. Use your own region and AMI. Total cost with immediate destroy: negligible; keep any EIP **attached** while it exists.

**Create the tree**

```text
kplabs-terraform-modules/
├── modules/
│   └── ec2/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── versions.tf
└── teams/
    └── A/
        └── main.tf
```

**`modules/ec2/versions.tf`**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.50"
    }
  }
}
```

**`modules/ec2/variables.tf`**

```hcl
variable "ami" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}
```

**`modules/ec2/main.tf`**

```hcl
resource "aws_instance" "myec2" {
  ami           = var.ami
  instance_type = var.instance_type
}
```

**`modules/ec2/outputs.tf`**

```hcl
output "instance_id" {
  value = aws_instance.myec2.id
}
```

**`teams/A/main.tf`**

```hcl
provider "aws" {
  region = "us-east-1"
}

module "ec2" {
  source        = "../../modules/ec2"
  ami           = "ami-08a0d1e16fc3f61ea"   # replace with a valid AMI for your region
  instance_type = "t2.micro"
}

resource "aws_eip" "this" {
  domain   = "vpc"
  instance = module.ec2.instance_id
}

output "instance_id" {
  value = module.ec2.instance_id
}
```

**Run it**

```bash
cd teams/A
terraform init
terraform validate
terraform plan
terraform apply -auto-approve
terraform state list
terraform output
terraform destroy -auto-approve
```

Expected `terraform state list`:

```text
aws_eip.this
module.ec2.aws_instance.myec2
```

Expected `terraform output`:

```text
instance_id = "i-0abcd1234ef567890"
```

**Experiments to repeat (each should give the error shown earlier):**

1. Remove `ami` from the call → `Missing required argument`.
2. Add `foo = "bar"` to the call → `Unsupported argument`.
3. Change `instance = module.ec2.instance_id` to `module.ec2.id` → `Unsupported attribute`.
4. Change `source` to `./modules/ec2` (wrong relative path) → `init` fails with a "Unreadable module directory" style error.
5. Change the source to `https://github.com/...` → `init` fails (must start with `github.com`).

---

## 🎯 Exam focus (summary)

- **What is a module?** A folder of Terraform code that can be called by a `module` block. The root module is the working directory; a child module is one that is called.
- **Why modules?** DRY, standardisation, change-once-use-everywhere, avoid starting from scratch.
- **`module` block:** `source` is **required**; `version` pins registry modules; other arguments are the child's input variables; `providers` passes provider configurations.
- **`terraform init`** downloads/registers modules; re-run it after changing a module's `source` or `version`.
- **Source types:** local (`./` or `../`), registry (`<NAMESPACE>/<NAME>/<PROVIDER>`), GitHub (`github.com/...`, no `https://`), Bitbucket, Git, HTTP, S3 (`s3::`).
- **Inputs** are `variable` blocks in the child; a variable without `default` is required (`Missing required argument` otherwise). An undeclared argument gives `Unsupported argument`.
- **Outputs** are the only way a parent sees the child's values: `module.<name>.<output>`; not `module.<name>.<resource attribute>`.
- **Providers in child modules:** avoid `provider` blocks; use `required_providers` (source + version); the default provider config is inherited; **aliased providers are not inherited** and must be passed via `providers = { child = root_alias }` with `configuration_aliases` in the child.
- **`provider` (resource, single) vs `providers` (module, map).**
- **Standard structure:** `README.md`, `main.tf`, `variables.tf`, `outputs.tf` (+ `modules/`, `examples/`, commonly `versions.tf`).
- **Publishing to the public registry:** public GitHub repo, name `terraform-<PROVIDER>-<NAME>`, repo description, standard structure, `x.y.z` (optionally `v`-prefixed) tags.
- **Trust:** anyone can publish; check downloads, contributors, issues, docs, versions, code quality, stars, partner badge; read unknown code for malicious behaviour.
- **Lock file** does not pin remote modules; pin them with `version` (or `?ref=` for Git).
- **Do not build one giant module:** build a collection of small, purposeful modules.

### Traps

- `https://github.com/...` in `source` fails; it must start with `github.com`.
- A local path without `./` or `../` is treated as a registry address and fails.
- Putting `version` on a local or Git source is invalid.
- Referencing `module.ec2.aws_instance.myec2.id` from the parent does not work; use an output.
- A `provider "aws" { region = ... }` in the child silently wins over the root's region.
- Adding an alias in the root and expecting the child to see it: it will not.
- `required_providers` local name must match the resource prefix.

---

## Key takeaways

1. Modules implement the **DRY** principle: write once, reuse everywhere, standardise, and change in one place.
2. A module is simply a **folder of Terraform code**, used through a `module` block with a required `source`.
3. **`terraform init`** downloads modules; `version` pins a registry module version.
4. Pick public modules carefully: downloads, GitHub contributors and issues, docs, version history, code quality, stars/forks, partner badge. Beware malicious modules; read the source if unsure.
5. Organisations usually maintain their own (private) modules. Public modules include every option; yours need only what you use.
6. Sources: local (`./`, `../`), Registry, GitHub (`github.com/...`, no `https://`), Bitbucket, Git, HTTP, S3 (`s3::`). Consult the docs for syntax.
7. **Avoid hard-coded values** in modules; use variables.
8. **Avoid `provider` blocks in child modules**; declare `required_providers` (source + version); configuration comes from the root.
9. Access a child's values only through **outputs**: `module.<name>.<output>`.
10. **Root module** = working directory entry point; **child module** = a module that is called.
11. Standard structure: README.md, main.tf, variables.tf, outputs.tf (+ `modules/`, `examples/`). Build a **collection** of small modules.
12. Aliased providers are **never inherited**: pass via the `providers` map; declare with `configuration_aliases`; use `provider = aws.<name>` on resources.
13. Publishing to the public registry: public GitHub repo, `terraform-<provider>-<name>`, repo description, standard structure, `x.y.z` tags.
14. The lock file does not track remote modules; pin them yourself.

---

## Quick commands / syntax cheat-sheet

```hcl
# Registry module (with version)
module "ec2-instance" {
  source    = "terraform-aws-modules/ec2-instance/aws"
  version   = "6.1.4"
  subnet_id = "subnet-xxxxxxxx"
}

# GitHub (must start with github.com - no https://)
module "ec2" {
  source = "github.com/zealvora/sample-kplabs-terraform-ec2-module"
}

# Local path (must begin with ./ or ../)
module "ec2" { source = "../../modules/ec2" }
module "sg"  { source = "./modules/network" }

# S3 source prefix:  s3::...   (see Module Sources docs for the rest of the format)

# variable (module input)
variable "instance_type" {}

# output (module return value)
output "instance_id" { value = aws_instance.myec2.id }

# use the output from the root
#   instance = module.ec2.instance_id      # module.<module_name>.<output_name>

# required providers inside a module
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.50" }
  }
}

# passing an aliased provider to a module
module "sg" {
  source    = "./modules/network"
  providers = { aws.prod = aws.mumbai }
}
# child:
#   required_providers { aws = { ..., configuration_aliases = [ aws.prod ] } }
#   resource "aws_security_group" "prod" { provider = aws.prod ... }
```

```bash
terraform init                 # downloads / registers modules, then providers
terraform init -upgrade        # re-select newest modules/providers within constraints
terraform validate
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve
terraform state list           # shows module.<name>.<resource>
```

| Standard structure (minimal) | Purpose |
|---|---|
| `README.md` | Documentation |
| `main.tf` | Resources |
| `variables.tf` | Inputs |
| `outputs.tf` | Outputs |

---

## ❓ Quiz

**Q1.** What does DRY stand for, and how do modules apply it?

**Q2.** Which argument is mandatory in every `module` block?

**Q3.** You change a module's `source` and run `terraform plan` immediately. What do you need to do first, and why?

**Q4.** Which of these is a valid local module source from `teams/A` when the module lives in `kplabs-terraform-modules/modules/ec2`?
- A. `modules/ec2`
- B. `../../modules/ec2`
- C. `https://github.com/...`
- D. `/modules/ec2`

**Q5.** `terraform init` fails on `source = "https://github.com/zealvora/sample-kplabs-terraform-ec2-module"` with "no source URL was returned". What is wrong?

**Q6.** The child module has no `instance_type` variable. The caller sets `instance_type = "t2.large"`. What happens?

**Q7.** A child module declares `variable "ami" {}` with no default and the caller omits `ami`. What error do you get?

**Q8.** The root has `provider "aws" { region = "ap-south-1" }`. The child module also has `provider "aws" { region = "us-east-1" }` and an `aws_instance`. Where is the instance created, and what should you do instead?

**Q9.** A root resource needs the ID of an instance created inside `module.ec2`. Write the reference and say what must exist in the child.

**Q10.** Define root module and child module.

**Q11.** Name the files of the minimal standard module structure.

**Q12.** A child module must create `prod-sg` in Mumbai using a root provider `aws.mumbai`. List the three pieces of code needed.

**Q13.** What is the difference between `provider` and `providers`?

**Q14.** List the five requirements to publish a module on the public Terraform Registry.

**Q15.** Does `.terraform.lock.hcl` lock the version of a registry module? How do you control module versions?

### Answers

**A1.** "Don't Repeat Yourself". Modules centralise common resource configuration so teams reference one standard template rather than copy-pasting, giving standardisation and a single place to change.

**A2.** `source`.

**A3.** Run `terraform init` again. `init` is what downloads or registers modules; `plan` otherwise reports that the module is not installed or has changed.

**A4.** **B.** Local paths must start with `./` or `../`. A is read as a registry address and fails; C is a wrong format; D is an absolute path and is not allowed for module sources.

**A5.** GitHub sources must **start with `github.com`**; the `https://` prefix is not allowed in that shorthand. Use `github.com/zealvora/sample-kplabs-terraform-ec2-module` (or the explicit `git::https://...` form).

**A6.** `Error: Unsupported argument - An argument named "instance_type" is not expected here.` A module can only be customised through variables it declares.

**A7.** `Error: Missing required argument` for `ami`. A variable without `default` is required.

**A8.** In **us-east-1**: the module's own provider block wins. Remove the `provider` block from the child, declare `required_providers` (source + version) there, and configure the provider in the root.

**A9.** `module.ec2.<output_name>` (e.g. `module.ec2.instance_id`). The child must declare `output "instance_id" { value = aws_instance.myec2.id }`. `module.ec2.id` fails with "Unsupported attribute".

**A10.** Root module: the main working directory and entry point where `module` blocks are written (the code Terraform commands run against). Child module: a module called by another module.

**A11.** `README.md`, `main.tf`, `variables.tf`, `outputs.tf`. Extended: `modules/` and `examples/`; `versions.tf` is common.

**A12.** Root: an aliased provider block (`alias = "mumbai"`, region `ap-south-1`) and `providers = { aws.prod = aws.mumbai }` in the `module` block. Child: `configuration_aliases = [aws.prod]` in `required_providers`. Child resource: `provider = aws.prod`.

**A13.** `provider` is a resource meta-argument taking a single provider reference. `providers` is a module-block argument taking a **map**, because a module may use several providers. Aliased providers are never inherited automatically.

**A14.** Public GitHub repository; repository named `terraform-<PROVIDER>-<NAME>`; repository description; standard module structure; `x.y.z` release tags (semantic version, optional `v` prefix).

**A15.** No. The lock file tracks **providers only**. Terraform always picks the newest module version that satisfies your constraint, so pin registry modules with `version` (and Git modules with `?ref=`).

---

## Glossary

| Term | Meaning |
|---|---|
| **Module** | A folder of Terraform configuration that other configurations can call; the unit of reuse. |
| **DRY** | "Don't Repeat Yourself": reduce duplication. |
| **Root module** | The configuration in the working directory; the entry point that calls other modules. |
| **Child module** | A module called by another module through a `module` block. |
| **`module` block** | Calls a module; requires `source`. |
| **`source`** | The location of the module (local path, registry address, GitHub, S3, ...). |
| **`version`** | Pins a module version (registry modules). |
| **Terraform Registry** | Public catalogue of modules and providers at `registry.terraform.io`; anyone can publish. |
| **Private registry** | Organisation-internal catalogue of modules/providers (part of HCP Terraform). |
| **HashiCorp Partner badge** | Registry badge showing a module is maintained by a HashiCorp partner. |
| **Input variable** | A `variable` block that makes a module configurable. |
| **Output value** | An `output` block exposing a value from a module; accessed as `module.<name>.<output>`. |
| **`required_providers`** | `terraform` sub-block declaring provider `source` and `version`. |
| **`configuration_aliases`** | Declares that a module expects aliased provider configurations to be passed in. |
| **Provider alias** | An extra named configuration of a provider (e.g. `alias = "mumbai"`) used as `aws.mumbai`. |
| **`providers` (module)** | A map in a `module` block handing provider configurations to the child. |
| **`provider` (resource)** | Meta-argument selecting which provider configuration a resource uses. |
| **Standard module structure** | HashiCorp's recommended layout: README.md, main.tf, variables.tf, outputs.tf (+ `modules/`, `examples/`). |
| **Semantic version tag (`x.y.z`)** | Git tag format (optional `v` prefix) the registry uses as the module version. |
| **Elastic IP (EIP)** | A static public IPv4 address in AWS; charges apply if left unattached. |
| **Legacy module** | A module containing its own `provider` blocks; cannot be used with `count`/`for_each`/`depends_on` (extra context). |
