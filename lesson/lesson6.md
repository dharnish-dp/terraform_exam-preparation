# Session 6 - Terraform Modules & Workspaces

HashiCorp Certified Terraform Associate (course by Zeal Vora / KPLabs) - detailed study notes built from lecture transcripts 113-130 and the instructor's code repository (`Section 4 - Terraform Modules & Workspaces`).

> Conventions used in these notes
> - "(extra context)" marks widely-known Terraform knowledge that was NOT said in the lecture or repo. Everything else comes from the transcripts or the repo.
> - Where the transcript was garbled by speech-to-text, the likely meaning is stated and flagged.
> - Credentials, keys and real-looking IDs are replaced with placeholders.

---

## Session overview

Session 6 covers two big Terraform topics.

**Part A - Modules (lectures 113-128)**
1. Why modules exist (the DRY principle, repetition, standardisation) and a first demo of consuming a module.
2. Consuming ready-made modules from the public Terraform Registry and how to judge whether a public module is trustworthy.
3. Building your own modules: base folder structure, a first EC2 module, module sources (GitHub, local path, registry, etc.), the `source` and `version` arguments.
4. Making a module professional: removing hard-coded values (variables), replacing the hard-coded `provider` block with `required_providers`, exposing values with module `output`s.
5. Terminology (root module vs child module) and the HashiCorp "standard module structure".
6. Advanced: passing multiple/aliased provider configurations into a module (`providers` map + `configuration_aliases`).
7. Requirements for publishing a module to the public Terraform Registry.

**Part B - Workspaces (lectures 129-130)**
1. One configuration, many state files: what a workspace is, and why it helps manage environments (dev/prod).
2. Practical: `terraform workspace new/list/select/show`, the `terraform.workspace` expression, and per-workspace values using a `locals` map.

Lecture numbers present in the folder: 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130. **No lecture numbers are missing** in this range (18 lectures).

---

## Table of contents

1. [113. Basics of Terraform Modules](#113-basics-of-terraform-modules)
2. [114. Creating EC2 instance using Modules](#114-creating-ec2-instance-using-modules)
3. [115. Choosing the Right Terraform Module](#115-choosing-the-right-terraform-module)
4. [116. Creating Base Module Structure for Custom Module](#116-creating-base-module-structure-for-custom-module)
5. [117. Creating Custom Module for EC2](#117-creating-custom-module-for-ec2)
6. [118. Module Sources - Calling a Module](#118-module-sources---calling-a-module)
7. [119. Using Local Paths to Call Custom Module](#119-using-local-paths-to-call-custom-module)
8. [120. Improvements in Custom Module Code](#120-improvements-in-custom-module-code)
9. [121. Variables in Terraform Modules](#121-variables-in-terraform-modules)
10. [122. Converting Hardcoded Values to Variables in Custom Module](#122-converting-hardcoded-values-to-variables-in-custom-module)
11. [123. Improvements in Provider Configuration in Custom Module](#123-improvements-in-provider-configuration-in-custom-module)
12. [124. Module Outputs](#124-module-outputs)
13. [125. Root Module vs Child Module](#125-root-module-vs-child-module)
14. [126. Standard Module Structure](#126-standard-module-structure)
15. [127. Multiple Provider Configuration in Modules](#127-multiple-provider-configuration-in-modules)
16. [128. Requirement for Publishing Modules in Terraform Registry](#128-requirement-for-publishing-modules-in-terraform-registry)
17. [129. Overview of Terraform Workspace](#129-overview-of-terraform-workspace)
18. [130. Terraform Workspace Practical](#130-terraform-workspace-practical)
19. [Command / syntax cheat-sheet](#command--syntax-cheat-sheet)
20. [Key takeaways](#key-takeaways)
21. [Quick revision Q&A](#quick-revision-qa)
22. [Glossary](#glossary)
23. [Appendix - repo files not tied to a transcript](#appendix---repo-files-not-tied-to-a-transcript)

---

## Lecture to repo-file mapping

Repo root: `Section 4 - Terraform Modules & Workspaces/`

| Lecture | Title | Repo file(s) | Notes |
|---|---|---|---|
| 113 | Basics of Terraform Modules | `terraform-registry.md` (older registry demo), `note-points-modules.md` (registry module pages: EC2, EKS, IAM) | The `demo-modules.tf` file shown in the video is not in the repo. `Readme.md` does not list this lecture. |
| 114 | Creating EC2 instance using Modules | `ec2-module.md` | Registry module `terraform-aws-modules/ec2-instance/aws`, version `6.1.4` in repo. |
| 115 | Choosing the Right Terraform Module | `note-points-modules.md` | EC2 / EKS / IAM module pages and pinned versions. No code is run in the lecture. |
| 116 | Creating Base Module Structure | (none) | Folder layout only. Repo tree `kplabs-modules/` mirrors it (`modules/` + `projects/`). |
| 117 | Creating Custom Module for EC2 | `creating-module.md`, `kplabs-modules/modules/ec2/ec2.tf` | Hard-coded EC2 module. |
| 118 | Module Sources - Calling a Module | `module-sources.md` | GitHub source `github.com/zealvora/sample-kplabs-terraform-ec2-module`. |
| 119 | Using Local Paths to Call Custom Module | `local-paths.md`, `kplabs-modules/projects/A/myec2.tf`, `kplabs-modules/projects/A/providers.tf` | `source = "../../modules/ec2"`. |
| 120 | Improvements in Custom Module Code | (none; analysis lecture) | Shows the problems that 121-123 fix. |
| 121 | Variables in Terraform Modules | (none; theory) | |
| 122 | Converting Hardcoded Values to Variables | `variables-custom-module.md` | Final main module + final calling code (with `region` variable). |
| 123 | Improvements in Provider Configuration | `provider-custom-module.md` | `required_providers` instead of `provider`; `region` variable removed. |
| 124 | Module Outputs | `module-outputs.md` | Elastic IP attached to module-created EC2. Folder `module-outputs/` (security-group variant) is a related, un-narrated example - see Appendix. |
| 125 | Root Module vs Child Module | (none) | Terminology; relates to every `kplabs-modules` example. |
| 126 | Standard Module Structure | (none) | |
| 127 | Multiple Provider Configuration in Modules | `module-multi-provider.md` | Child `modules/network/sg.tf` and root `main.tf`. |
| 128 | Requirement for Publishing Modules in Terraform Registry | (none) | Theory only. |
| 129 | Overview of Terraform Workspace | `kplabs-workspace.md` (commands + final code) | Demo code not shown on screen in the video. |
| 130 | Terraform Workspace Practical | `kplabs-workspace.md` | Base code + final code with `terraform.workspace`. |
| (no lecture in 113-130) | - | `module-locals/` (projects/B + modules/sg) | Un-narrated in this session; see Appendix. |

The repo `Readme.md` "Video-Document Mapper" lists: (1) Creating EC2 instance using Modules -> `ec2-module.md`; (2) Creating Custom Module for EC2 -> `creating-module.md`; (3) Module Sources -> `module-sources.md`; (4) Using Local Paths -> `local-paths.md`; (5) Converting Hardcoded Values to Variables -> `variables-custom-module.md`; (6) Improvements in Provider Configuration -> `provider-custom-module.md`; (7) Module Outputs -> `module-outputs.md`; (8) Multiple Provider Configuration in Modules -> `module-multi-provider.md`; (9) Implementing Terraform Workspace -> `kplabs-workspace.md`.

---

## 113. Basics of Terraform Modules

### Why this matters
The instructor stresses that mid-to-large organisations use modules "quite extensively", and even small organisations save writing time in the long run by using them.

### The DRY principle
- **DRY = "Don't Repeat Yourself".** It applies to any language: reduce repetition in software patterns.
- Benefits stated: smaller code base, better overall performance, easier long-term maintenance.

### The problem without modules (the 10-team example)
An organisation has 10 teams (or hundreds in a big company). Each team writes its own Terraform to create EC2 instances for its team members.

```
 Team 1 --> own EC2 code      Team 4 --> own EC2 code
 Team 2 --> own EC2 code      Team 5 --> own EC2 code
 Team 3 --> own EC2 code      Team 6 --> own EC2 code   ... (hundreds of teams)
```

Five long-term challenges named in the lecture:

| # | Challenge | Explanation from the lecture |
|---|---|---|
| 1 | Repetition of code | Very similar code is copied across all teams. |
| 2 | Change ripple | If the AWS provider changes an argument (the lecture's hypothetical: `ami` becomes `image id`), every team's EC2 block must be edited. |
| 3 | Lack of standardisation | Each team owns its code; nobody can guarantee best practices (security and Terraform) are followed. |
| 4 | Hard to manage | |
| 5 | Hard for developers to use | |

### The solution: a central, standard template = a module
A DevOps (or security) team writes one **standard EC2 template** in a central location that follows best practices. All teams reference it.

```
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
- Standardisation is maintained.
- A change caused by the AWS provider is made once, in the module; teams do not change their own code.

> **Definition (as taught):** Terraform modules let you **centralise resource configuration**, making it easy for multiple projects to reuse the same Terraform code.

### Demo: `demo-modules.tf`
The file in the video contains only three lines: `module`, a `source`, and the closing brace. The `source` points to the standard template. This tiny block is "what each team writes in their own code base".

Illustrative shape (the exact source value is not shown in the transcript or repo):

```hcl
module "ec2" {
  source = "<location-of-the-standard-template>"
}
```

Running `terraform plan` showed a new `aws_instance` being created, with all its arguments **not defined in the calling file** but inside the module. The developer team only references it.

### Multiple ready-made modules in one project
A single project can use several modules, possibly written by other teams or other organisations, instead of writing code from scratch.

```
Team 1 ---+                     +--> EC2 module
Team 2 ---+--- each uses -------+
Team 3 ---+                     +--> VPC module
Team 6 (new team later) also just references them
```

### The Terraform Registry (first look)
- The registry has modules for many infrastructure objects: IAM, VPC, EKS (Kubernetes), and more.
- Example contrasted: to build an EKS cluster from scratch you would read the docs for `aws_eks_cluster`, copy, modify and learn many options. Instead you can use the **EKS module**; its GitHub repo shows a very large code base that you get "for free".
- Registry modules are stored in a central location - GitHub is the typical home of the source.

> The main and most important benefit of modules, per the lecture: you do not have to create the entire code from scratch.

### Related repo file: `terraform-registry.md` (older demo)
This older registry demo shows the module-call shape with several input arguments (note: `instance_count` and the `~> 2.0` version belong to an old module release; the later lecture 114 uses a newer version). Credentials below are placeholders - never hard-code real keys.

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

Block explanation:
- `module "ec2_cluster"` - the label is a local name you choose; it is used later as `module.ec2_cluster.<output>`.
- `source` - location of the module (here, a registry address `<namespace>/<name>/<provider>`).
- `version` - which published module version to download (here constraint `~> 2.0`).
- `name`, `ami`, `instance_type`, `subnet_id`, `tags` (and `instance_count` in that old release) - **input variables** declared by the module.

### Exam tips
- Modules = reuse + standardisation + DRY. Be ready to name the problems they solve.
- A module is "just Terraform code in a folder" that another configuration calls with a `module` block.
- Multiple modules may be used in one project, from different authors.

---

## 114. Creating EC2 instance using Modules

### Scenario
Create an EC2 instance plus an associated security group - quickly - by using a ready-made registry module instead of writing resources.

### Finding the module
1. Go to the Terraform Registry (`registry.terraform.io`) and use **Browse -> Modules**.
2. Each module targets a specific use case (e.g. KMS, VPC, IAM for AWS).
3. Popularity signal: the IAM module showed ~104 million downloads (98 million "over time" as stated). The point: modules are heavily used in industry.
4. Searching for "EC2" shows many modules (33 pages in this video); anyone can publish a module to the registry, so **do not blindly trust every module** - use the most popular one when unsure.
5. Searching Google for "Terraform EC2 module" leads to the registry page for `terraform-aws-modules/ec2-instance/aws` (about 32 million downloads over time in the video). Its GitHub page shows usage examples, extensive docs, and ~48 contributors (issues get looked after).

### The code (repo: `ec2-module.md`)
Create `ec2.tf` in an empty folder:

```hcl
module "ec2-instance" {
  source     = "terraform-aws-modules/ec2-instance/aws"
  version    = "6.1.4"
  subnet_id  = "subnet-xxxxxxxxxxxxxxxxx"   # (Change this value to a subnet in YOUR account)
}
```

| Argument | Meaning |
|---|---|
| `module "ec2-instance"` | Local name for this module call. |
| `source` | Registry address: `terraform-aws-modules` (namespace) / `ec2-instance` (module name) / `aws` (provider). The lecture points out it mirrors the registry page URL. |
| `version` | Exact module version to download. A module can have many versions. |
| `subnet_id` | An input of this module version. Required here because the module otherwise errors (see below). |

> Note: `note-points-modules.md` pins `5.6.1` for this same module; `ec2-module.md` pins `6.1.4`. Different versions are used in different parts of the course. Always follow the usage instructions of the version you choose.

### Step-by-step demo
1. Empty folder opened in VS Code; create `ec2.tf` with the module block (copy the "provision instructions" from the registry page).
2. Run `terraform init`.
   - Output highlights: *Initializing the backend*, **Initializing modules**, the module is downloaded from `registry.terraform.io`, then provider plugins are installed.
   - The whole module code is downloaded locally.
3. Run `terraform plan` (first attempt, without `subnet_id`).
   - **Error** (transcribed as "Multiple EC2 instances matched ... use additional constraints to reduce the match to a single EC2 subnet"). Likely meaning: the module could not choose one subnet automatically, so you must provide `subnet_id`. Instructor note: when you write your own module you can design it so default VPC/subnets are picked automatically; it varies module to module.
4. Pick a subnet: AWS Console -> VPC -> default VPC -> its subnets -> copy any subnet ID -> set `subnet_id`. The instance will launch in that subnet.
5. Run `terraform plan` again - no error. Plan shows **4 resources** to create: the EC2 instance, the security group, and the security-group rules (in the video, outbound rules).
6. `terraform apply -auto-approve`.
   - Result: one EC2 instance and an associated security group with automatically created outbound rules.
7. Where is the module code? In the working directory under `.terraform/modules/...` (the lecture shows the `.terraform` folder containing the providers and `modules`). The module's `main.tf` was **835 lines** in this version - mature registry modules do much more than a simple instance (multiple instances, spot instances, etc.).
8. Examples and docs on the registry page are pulled automatically from GitHub.
9. Clean up: `terraform destroy -auto-approve` so you are not charged.

Commands used (repo):

```sh
terraform init
terraform apply -auto-approve
terraform destroy -auto-approve
```

### Exam / interview note from the instructor
Modules are a very common interview topic, and a scenario question on modules appears in the **Terraform Professional** (4-hour, practical) certification. (Associate level: understand module calling, sources, variables, outputs.)

### Exam tips
- `terraform init` downloads modules (and then providers). If you add or change a `module` block's `source`, re-run `init`.
- Registry module `source` format: `<NAMESPACE>/<NAME>/<PROVIDER>`; `version` argument is available **only for registry modules** (extra context).
- A module's inputs are whatever variables it declares; read the usage section of the module page.

---

## 115. Choosing the Right Terraform Module

For one infrastructure object (EC2, IAM, ...) the registry offers many modules from different contributors (13+ pages for "EC2" in the video). A checklist for selecting one:

| # | Check | What to look at | Good sign | Bad sign (from the video) |
|---|---|---|---|---|
| 1 | Total downloads | Right side of the registry page ("downloads over time") | Millions of downloads (e.g. 14.4 million for `terraform-aws-modules/ec2-instance/aws`) | Only ~2,000 downloads |
| 2 | GitHub page: commits & contributors | Link from registry page | 42 contributors committing regularly | Last commit 4 years ago, no contributors |
| 3 | Reported issues | GitHub "Issues" tab | Few open (3) vs many closed (187) | Many unresolved issues |
| 4 | Avoid single-maintainer modules | Contributors count | Many maintainers keep module in sync with provider changes | One person may never update after provider changes |
| 5 | Documentation | README: overview, usage, examples | Detailed README with examples | README with little info |
| 6 | Version history | "Versions" dropdown / "show all" | Many versions = regularly updated | Only `1.0.0` |
| 7 | Code quality | Open `main.tf` | Clean, professionally structured code | Messy / minimal |
| 8 | Community feedback | GitHub stars and forks | Many stars/forks | 1 fork, 0 stars |
| 9 | HashiCorp Partner badge | Filter on module browse page ("partner") | Partner badge (e.g. Google Cloud project factory) = trusted | - |

Notes on the partner badge:
- The registry has a filter to show only partner-maintained modules, and you can filter by provider.
- The `terraform-aws-modules` namespace does **not** carry the partner tag in the video, yet it is "very popular" and widely used in industry (56 modules, e.g. EKS). So partner badge is helpful but not the only signal: "it is not always that modules written by a HashiCorp Partner are the best".

### Security warnings (important)
- Avoid random, unmaintained or "shady" modules.
- Module code can contain **malicious code** that sends information about your environment to an attacker.
- If you must use an unknown module, **read its source code first**.

### What do real organisations do?
- Most maintain **their own modules**.
- A common path: fork a registry module and modify it heavily for the organisation's needs.
- Those modules live in a **private registry** inside the organisation (not the public registry).
- The course later teaches building/maintaining your own modules.

### Related repo file: `note-points-modules.md`
Registry module pages referenced: EC2 instance, EKS, IAM (`registry.terraform.io/modules/terraform-aws-modules/...`).

```hcl
module "ec2-instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "5.6.1"
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.11.1"
}

# EKS - final code (inputs supplied)
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

### Exam tips
- Know the trust/selection criteria conceptually (downloads, maintenance, docs, versions, partner badge).
- Anyone can publish to the public registry; trust is your responsibility.
- Organisations often use a **private registry** (extra context: Terraform Cloud / HCP Terraform and Terraform Enterprise offer one).

---

## 116. Creating Base Module Structure for Custom Module

### Why write your own modules
Many organisations instruct teams **not** to depend on public modules because public maintainers update on their own timeline, and organisations have niche requirements about how modules are designed and which aspects developers can modify.

### Base structure

```
kplabs-terraform-modules/
├── modules/                 <-- point 1: central modules folder
│   ├── ec2/                 <-- each sub-folder = one module (actual Terraform code)
│   ├── sg/
│   ├── iam/                 (examples named in the slide: EC2, IAM, VPC, SG)
│   └── vpc/
└── teams/                   <-- teams call modules from here (point 2)
    ├── A/
    └── B/
```

- The base folder has a `modules` sub-folder; inside it, **one sub-folder per module**.
- Each module sub-folder contains the actual module Terraform code that other projects reference - just like referencing a module from GitHub/Registry.
- **Calling the module:** each team can call whichever modules it needs. Example: Team 2 needs IAM resources -> references the IAM module; another team needs a security group -> references the SG module.

### What was created in the demo
Folder `kplabs-terraform-modules` containing:
- `modules/ec2`, `modules/sg` (security group)
- `teams/A`, `teams/B`

Plan: `teams/A` will reference `modules/ec2` to create infrastructure. *How* it references it is the topic of lectures 118-119.

> Repo equivalent: `kplabs-modules/modules/ec2/ec2.tf` and `kplabs-modules/projects/A/` (folder names `projects` rather than `teams`).

### Exam tips
- A module is simply a folder of `.tf` files; there is no special "module" file type.
- Nothing needs registering: a folder with Terraform code is already a module.

---

## 117. Creating Custom Module for EC2

### Key idea
The "module" is not special code - **ordinary resource code placed in the modules folder** is a module. Nothing complex or extra.

### The code (repo: `creating-module.md`; also `kplabs-modules/modules/ec2/ec2.tf`)
Create `modules/ec2/main.tf` with:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
    ami = "ami-0bb84b8ffd87024d8"
    instance_type = "t2.micro"
}
```

- `provider "aws"` - hard-coded region `us-east-1` (a flaw fixed in 120-123).
- `aws_instance.myec2` - hard-coded AMI and instance type (flaw fixed in 122).

The repo copy under `kplabs-modules/modules/ec2/ec2.tf` is an early variant that already uses a variable for the type:

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-082b5a644766e0e6f"
   instance_type = var.instance_type
}
```

> That repo variant references `var.instance_type` but declares no `variable` block in the file shown - it is a snapshot from a different point of the course. Treat `creating-module.md` as the lecture's code.

### Size of a module
It can be a 3-4 line module or a 100-line module - depends on need. The only requirement: whatever is in the modules folder must be referenceable by several teams, without those teams writing `aws_instance` themselves.

### Public vs your own modules (why registry modules are huge)
- The registry EC2 module `main.tf` is around 605 lines (in the version shown) and contains **every option** of the resource (tags, subnet, source/destination check, `user_data_base64`, `maintenance_options`, ...). It must serve hundreds of organisations with differing needs.
- Your organisation's module only needs the options **your use cases** require, so it can be much smaller.
- Professional modules also ship examples, licence file, etc.

### Exam tips
- A child module's resources behave like any other Terraform resources.
- Keep organisation modules small and purposeful; expose only what you need.

---

## 118. Module Sources - Calling a Module

### Where module source code can live
GitHub, Bitbucket, generic Git repositories, HTTP URLs, S3 buckets, the Terraform Registry, and local paths (same workstation).

### Calling a module: the `module` block
- A `module` block **must** contain a `source` argument with the location of the module. The `module` block + `source` is constant; only the *format* of the `source` string changes with the location.

```hcl
module "ec2" {
  source = "<where the module lives>"
}
```

Examples of how the value changes:

| Location | Style of `source` (as discussed) |
|---|---|
| Local path | `../path/to/module` (starts with `./` or `../`) |
| Generic Git repo | Git-style address (see docs) |
| GitHub | `github.com/<user>/<repo>` |
| S3 bucket | Must start with `s3::` (the lecture highlights this prefix) |
| Terraform Registry | `<namespace>/<name>/<provider>` |
| HTTP URL | URL form per docs |

**How to know the exact syntax?** Read the official **Module Sources** documentation (`developer.hashicorp.com/terraform/language/modules/sources`). Each source type has a documented format and examples.

### Demo: calling a GitHub module (repo: `module-sources.md`)
Sample repo: `https://github.com/zealvora/sample-kplabs-terraform-ec2-module` (contains a simple `main.tf`).

```hcl
module "ec2" {
  source = "github.com/zealvora/sample-kplabs-terraform-ec2-module"
}
```

Steps:
1. Empty `kplabs-terraform` folder -> create `modules.tf`.
2. First attempt copied the format with `https://` in front of `github.com/...`.
3. `terraform init` -> **error: "error downloading ... no source URL was returned"**.
4. Cause: the GitHub source format must **start with `github.com`**; the extra `https://` is not allowed. Remove it and save.
5. `terraform init` again -> succeeds; it installs the AWS provider plugin.
6. `terraform plan` -> shows the EC2 instance defined inside the module.

```sh
terraform init
terraform plan
```

Debugging tip from the lecture: when `init` fails to fetch a module, compare your `source` string with the documented format for that source type.

### Module versions
- A module can have multiple versions; use the **`version`** argument to pin one.
- Example (EKS from registry): selecting version `18.8.0` on the registry page changes the sample code's `version` to `18.8.0`. "Whatever code was written for this version will be pulled; the latest code will not be pulled."

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "18.8.0"
}
```

> Exam point stressed by the instructor: the `version` argument and its purpose (pin a module version).
> (extra context) `version` works for registry modules; for Git sources you pin with `?ref=<tag>` in the `source` URL instead.

### Exam tips
- `module` block requires `source`. Know that sources include local, Registry, GitHub, Bitbucket, Git, HTTP, S3 (`s3::`), etc.
- Module `version` pins a version; without it you get the latest.
- Changing the source requires `terraform init` again.

---

## 119. Using Local Paths to Call Custom Module

### Question
Team A's folder and the module folder are on the same machine. Which source type? -> **Local path**.

### Rule
Local path source **must begin with `./` or `../`** (documentation, stated in the lecture).

### Understanding `../`
`..` means "go up one directory". The lecture demonstrates with `cd ..`.

```
kplabs-terraform-modules/
├── modules/
│   └── ec2/            <-- target
└── teams/
    └── A/              <-- module.tf lives here (starting point)
```

From `teams/A`:
- first `../` -> `teams/`
- second `../` -> `kplabs-terraform-modules/`
- then `modules/ec2` -> the module folder.

Therefore: `../../modules/ec2`.

### The code (repo: `local-paths.md`)

```hcl
module "ec2" {
  source = "../../modules/ec2"
}
```

(Repo project files: `kplabs-modules/projects/A/myec2.tf` contains `module "ec2module" { source = "../../modules/ec2" }`, and `providers.tf` holds the AWS provider with placeholder credentials - use environment variables/profiles instead of hard-coding keys.)

```hcl
# kplabs-modules/projects/A/providers.tf  (placeholders)
provider "aws" {
  region     = "us-west-2"
  access_key = "YOUR-KEY-HERE"
  secret_key = "YOUR-KEY-HERE"
}
```

### Demo
```sh
cd teams/A
terraform init     # "Initializing modules... ec2" + installs hashicorp/aws provider
terraform plan     # 1 EC2 instance, t2.micro, AMI as defined inside the module
```

Team B referencing a security-group module would look almost identical (`../../modules/sg`).

### Exam tips
- Local path = `./` or `../` prefix, relative to the directory containing the calling configuration.
- `terraform init` registers the local module ("Initializing modules"). (extra context: local modules are not copied; they are referenced in place.)

---

## 120. Improvements in Custom Module Code

The module works, but a "professional" module needs improvements. Two major shortcomings are examined.

### Shortcoming 1: hard-coded values
In the module: **region, AMI, instance type** are hard-coded.

Demo: from Team A's calling code, try to override `instance_type`:

```hcl
module "ec2" {
  source        = "../../modules/ec2"
  instance_type = "t2.large"      # try to override
}
```

`terraform plan` ->

```
Error: Unsupported argument
An argument named "instance_type" is not expected here.
```

Because the module declares no such input variable. Takeaways:
- With hard-coded values every consumer is stuck with the same value.
- In **public** modules hard-coded values are "a big no-no" (everyone's environment differs); even for your organisation, avoid them.

### Shortcoming 2: hard-coded provider and region
Experiment: in the calling (root) code add a provider with region `ap-south-1` while the module has its own `provider "aws" { region = "us-east-1" }`.

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
- `terraform plan` shows **no error** (1 to add) - and does not show the region.
- `terraform apply -auto-approve` creates the instance in **`us-east-1`**, because the module's own provider block won (a Mumbai AMI would have failed: AMI IDs are region-specific).
- Confirmed via the state file (the `arn` contains `us-east-1`) and the EC2 console in N. Virginia. Instance terminated afterwards.

So: a provider block inside a module silently overrides what the caller intended. (Lecture's words: "this code can only run in the us-east-1 region".)

### The recommended fix (preview of 123)
Do not hard-code the provider; add a **`required_providers`** block with a version constraint stating which provider versions the module code works with, e.g. `>= 5.5`. This avoids errors for users when the module is incompatible with a particular provider version.

### Exam tips
- A module can only be customised through its **input variables**. Passing an undeclared argument = "Unsupported argument" error.
- Don't put `provider` blocks (with regions) in reusable child modules; use `required_providers` to declare requirements.
  (extra context: HashiCorp docs say provider configurations in modules are discouraged; provider blocks belong in the root module.)

---

## 121. Variables in Terraform Modules

Theory video preceding the practical in 122.

### Bad vs good

```
BAD (hard-coded)                      GOOD (variables)
resource "aws_instance" "x" {         resource "aws_instance" "x" {
  ami           = "ami-0abc..."         ami           = var.ami
  instance_type = "t2.micro"            instance_type = var.instance_type
}                                     }
```

With variables, callers override per environment:

```
Team 1:  instance_type = "t2.micro"   -> t2.micro instance
Team 2:  instance_type = "m5.large"   -> m5.large instance
```

- The professionally written registry EC2 module makes **nearly every argument a variable** (`instance_type`, hibernation, etc.) because thousands of users have different needs.
- Not every value in an organisational module must be a variable ("depends on environment and use case"), but as a best practice, make arguments variables if you want flexibility.

### Exam tips
- Module inputs are defined with `variable` blocks inside the module; the caller sets them as arguments in the `module` block.

---

## 122. Converting Hardcoded Values to Variables in Custom Module

### Step 1 - the child module (repo: `variables-custom-module.md`, "Final Main Module Code")

```hcl
provider "aws" {
  region = var.region
}

resource "aws_instance" "myec2" {
    ami = var.ami
    instance_type = var.instance_type
}

variable "ami" {}
variable "instance_type" {}
variable "region" {}
```

- Three `variable` blocks (empty - no default, no type) make `ami`, `instance_type` and `region` **required inputs**.
- The lecture notes the red squiggle in the editor disappears once each variable is declared.
- Recommended (not done in the lecture, for simplicity): put variable declarations in a separate file (`variables.tf`).

### Step 2 - run `terraform plan` in `teams/A` without values
```
Error: Missing required argument
  ... ami / instance_type / region
```
The module now **requires** the three values.

### Step 3 - the calling module (repo: "Final Calling Module Code")
First remove the earlier `provider "aws" { region = "ap-south-1" }` block from the caller, then:

```hcl
module "ec2" {
  source        = "../../modules/ec2"
  instance_type = "t2.large"
  ami           = "ami-123"
  region        = "ap-south-1"
}
```

- Each argument other than `source` sets the child module's variable of the same name.
- `ami-123` is a dummy value, used only to demonstrate `terraform plan`.

### Verification
`terraform plan` shows `instance_type = "t2.large"`, `ami = "ami-123"`, and the region from the module call. Change `t2.large` to `t2.micro` (the lecture toggles between values) and the plan changes accordingly.

### Exam tips
- A variable with no `default` is required.
- Module arguments (besides the meta-arguments `source`, `version`, `providers`, `count`, `for_each`, `depends_on`) are input variables. (extra context for the meta-argument list.)

---

## 123. Improvements in Provider Configuration in Custom Module

### Goal
Remove the hard-coded provider block from the module and use **`required_providers`** instead.

### Why
Your code may work only with certain AWS provider versions. List the working versions in `required_providers` so `terraform init` installs only compatible plugins and users do not hit surprise errors.

### Final child module (repo: `provider-custom-module.md`, "Final Main Module Code")

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
    ami = var.ami
    instance_type = var.instance_type
}


variable "ami" {}
variable "instance_type" {}
```

Explanations:
- `required_providers` - the **local name** (`aws`) maps to `source = "hashicorp/aws"` (the official AWS provider) and a `version` constraint.
- How the instructor chose `>= 5.50`: he checked the provider version that actually got installed, using the lock file (`.terraform.lock.hcl`; the transcript says "log.hcl") - version **5.51** - and noticed the latest published (3 days earlier) was 5.52.0. So `>= 5.50` is acceptable; you may also be very specific.
- The `region` **variable was removed** from the module, since the module no longer has a provider block.

### Final calling code (repo: "Final Calling Module Code")

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

- The **root module** now owns the `provider` block (and its region). The child inherits it.
- The `region` argument is removed from the `module` call.

### Gotcha demonstrated
After editing, `terraform plan` showed 1 to add **plus a warning**:

> The provider of "aws" is implicitly specified, but it is listed in required_providers as "<wrong name>" ...

(In the video the instructor had typed a wrong local name - transcribed as "My Cloud" - instead of `aws`.) Changing the local name back to `aws` removed the warning. Lesson: the name in `required_providers` must match the provider used by resources (`aws_*` -> `aws`).

### Exam tips
- Child modules declare **requirements** (`required_providers`); the root module provides **configuration** (`provider` blocks).
- `required_providers` entries: `source` (e.g. `hashicorp/aws`) and `version` constraint.
- Typical constraint operators: `>=`, `~>`, `=`, `<=` etc.

---

## 124. Module Outputs

### Problem: cross-project / cross-resource collaboration
You have a root module that calls a child module (creates an EC2 instance) and also an **Elastic IP** (`aws_eip`) which must be attached to that instance. A root-module resource cannot read a child module's resource attributes directly.

```
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

### Manual analogy shown in the lecture
1. Launch an EC2 instance. 2. Allocate an Elastic IP (static public IP). 3. Associate the EIP to the instance. An unattached EIP has no value and **incurs charges** unnecessarily. After association, the instance's public IP matches the EIP.

`aws_eip` has an `instance` argument that takes the instance ID.

### Base code (repo: `module-outputs.md`)

Child module:
```hcl
resource "aws_instance" "myec2" {
    ami = "ami-08a0d1e16fc3f61ea"
    instance_type = "t2.micro"
}
```

Root module:
```hcl
provider "aws" {
  region = "us-east-1"
}

module "ec2" {
  source = "../../modules/ec2"
}

resource "aws_eip" "this" {
  domain  = "vpc"
}
```
`domain = "vpc"` tells the EIP it is for use in a VPC (current AWS provider syntax; older code used `vpc = true` - extra context).

### The failed attempt
Adding `instance = module.ec2.id` (the instructor tried referencing the attribute directly) and running `terraform validate`:

```
Error: Unsupported attribute
This object does not have an attribute named "id".
```

Child-module resources are **not visible** to the parent; only declared outputs are.

### The fix: add an `output` in the child module

```hcl
resource "aws_instance" "myec2" {
    ami = "ami-08a0d1e16fc3f61ea"
    instance_type = "t2.micro"
}

output "instance_id" {
    value = aws_instance.myec2.id
}
```
- `output "instance_id"` - the output's name (this name is what callers use).
- `value = aws_instance.myec2.id` - inside the child, referencing the resource attribute (`id` = the instance ID, found in the attribute reference of the `aws_instance` docs).

Root module final code:

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

The instructor's own slips (good to learn from): first attempt used the wrong output name; the output is `instance_id`, so the reference must be `module.ec2.instance_id`. Validate succeeded after correcting.

### Reference syntax

| Where | Syntax | Example |
|---|---|---|
| Same configuration (earlier lectures) | `<resource_type>.<name>.<attribute>` | `aws_instance.myec2.id` |
| Module output from the parent | **`module.<module_name>.<output_name>`** | `module.ec2.instance_id` |

### Verification
`terraform validate` -> success. `terraform apply -auto-approve` creates the EC2 instance and the EIP; in the console the instance's public IP equals the Elastic IP (the demo showed both ending the same, e.g. `164.21...`). Terraform also understands the **dependency**: the EIP waits for the instance (extra context: implicit dependency through the reference).

### Related repo example (un-narrated): `module-outputs/`
A security-group variant of the same idea:

```
module-outputs/
├── modules/sg/sg.tf        (child: SG + output "sg_id")
└── projects/C/
    ├── providers.tf        (aws provider us-west-2)
    └── my-sg.tf            (root: calls module, uses module.sgmodule.sg_id)
```

Child `modules/sg/sg.tf` (ends with the output):
```hcl
output "sg_id" {
  value = aws_security_group.ec2-sg.id
}
```
(the `aws_security_group "ec2-sg"` resource above it allows inbound TCP 8433 from `0.0.0.0/0` and all egress - demo-only settings.)

Root `projects/C/my-sg.tf`:
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
Here the root attaches the module-created security group to an instance and **re-exports** the module output as a root output.

### Exam tips
- A parent can only access a child module's **output values**, never its resources directly.
- Syntax: `module.<MODULE NAME>.<OUTPUT NAME>`.
- Adding an output lets other resources (or other projects, for cross-project collaboration) consume values from modules.
- To see child outputs from the CLI you must re-export them as root outputs (extra context).

---

## 125. Root Module vs Child Module

| Term | Definition (lecture) | In our folders |
|---|---|---|
| **Root module** | Resides in your **main Terraform working directory**; it is the **entry point** of your infrastructure definition. The code that *calls* other modules. | `teams/A/` (or `projects/A/`), the repo's `main.tf` that has `module {}` blocks. |
| **Child module** | A module that has been **called by another module**. | `modules/ec2`, `modules/sg`, `modules/network` |

```
┌─ Root module (working directory: where you run terraform init/plan/apply) ─┐
│   module "ec2" { source = "../../modules/ec2" }  ---------------+          │
└──────────────────────────────────────────────────────────────── | ─────────┘
                                                                  v
                                           ┌─ Child module: modules/ec2 ─┐
                                           │  aws_instance ..., outputs  │
                                           └─────────────────────────────┘
```

- In the `kplabs-terraform-modules` folder: everything under `modules/` (EC2, SG, ...) are **child modules**; the code that calls them is the **root module**.
- Instructor warns that HashiCorp may test these two terms in the exam.
- (extra context) Every Terraform configuration has a root module (the `.tf` files in the working directory); a child module can itself call further child modules.

### Exam tips
- Root module = working directory with the `module` call. Child = the called module.

---

## 126. Standard Module Structure

HashiCorp recommends a standard layout for reusable modules. It is "not a must-follow, but a should-follow".

### Minimal recommended structure

```
my-module/
├── README.md       # documentation: what the module does, how to use it
├── main.tf         # the main resources
├── variables.tf    # input variables
└── outputs.tf      # output values
```

### Complete (expanded) structure (shown in lecture 128 too)

```
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

- Popular modules often add `versions.tf` (contains the `required_providers` block; may also carry licence info).
- Not every file is mandatory for every module; it depends on requirements.

### Why a standard structure matters
If all modules follow the same layout, a *user* knows where to look (e.g. open `versions.tf` to find `required_providers`) instead of opening every file. The lecture inspected a Google Cloud pattern module (GCE) and `terraform-aws-ec2-instance` - both have `main.tf`, `outputs.tf`, `variables.tf`, `README.md`, `versions.tf`.

### Planning a module collection (use-case)
Architecture on the slide: Route 53 (DNS) -> VPC containing load balancer, firewall, EC2 instances, database; plus S3 and IAM.

- **Do NOT build one giant module** that deploys the entire infrastructure - "a big no-no".
- **Build a collection of modules**, one per service/concern: DNS (Route 53), networking, IAM, database, S3, ...
- Teams then pick what they need. E.g. a team that only needs a database uses just the database module instead of writing database code from scratch.

### Exam tips
- Minimal standard files: **README.md, main.tf, variables.tf, outputs.tf**.
- Best practice: one module per service/logical unit; compose them.
- Standard structure is also a requirement for publishing in the public registry (see 128).

---

## 127. Multiple Provider Configuration in Modules

### Starting point: default provider inheritance
So far the provider is configured in the **root module** and child-module resources inherit it. A root provider with region `us-east-1` means all child resources are created in `us-east-1`.

### New requirement
A child module has two resources: `dev-sg` and `prod-sg`. We want `dev-sg` in **North Virginia (us-east-1)** and `prod-sg` in **Mumbai (ap-south-1)**. Just configuring providers in the root is not enough.

### Layout used in the demo

```
kplabs-terraform/
├── main.tf                 # ROOT module
└── modules/
    └── network/
        └── sg.tf           # CHILD module (two security groups)
```
(The transcript says the module file was `az.tf` - a transcription slip; the repo file is `modules/network/sg.tf`.)

### Phase 1 - default inheritance (works as before)
Child resources `aws_security_group.dev` (name `dev-sg`) and `aws_security_group.prod` (name `prod-sg`). Root `main.tf` has the module call (`source = "./modules/network"`, module name "sg(security group)") and `provider "aws" { region = "us-east-1" }`. `terraform init`, `plan` (2 SGs), `apply -auto-approve` -> both SGs created in N. Virginia (`us-east-1`).

### Phase 2 - adding an alias is NOT enough
Adding a second provider instance to the root:

```hcl
provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}
```
Resources still land in `us-east-1`: the **default** provider is inherited by the child, but **aliased providers are not inherited automatically**. Adding `provider = aws.mumbai` on the *module* block (wrong place) -> `terraform plan` errors because the provider configuration is not found/passed. (The instructor made small typos and destroyed/recreated resources between attempts - `terraform destroy -auto-approve` - to start each step clean.)

### Phase 3 - the three-step solution

**Step 1 - root module: pass the provider with the `providers` map** (module block):
```hcl
module "sg" {
  source = "./modules/network"
  providers = {
    aws.prod = aws.mumbai
  }
}
```
Read as: "the root's `aws.mumbai` is handed to the child under the name `aws.prod`." The child-side name (`aws.prod`) can be any name you choose.

**Step 2 - child module: declare it with `configuration_aliases`** inside `required_providers`:
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
      configuration_aliases = [ aws.prod ]
    }
  }
}
```

**Step 3 - child module resource: use the `provider` meta-argument**:
```hcl
resource "aws_security_group" "dev" {
  name = "dev-sg"                 # no provider argument -> default provider -> us-east-1
}

resource "aws_security_group" "prod" {
  name     = "prod-sg"
  provider = aws.prod             # -> whatever root provider is mapped to aws.prod (Mumbai)
}
```

### Final root `main.tf` (repo: `module-multi-provider.md`)
```hcl
provider "aws" {
    region = "us-east-1"
}

provider "aws" {
    alias = "mumbai"
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
```
ROOT                                CHILD (modules/network)
provider "aws" (default, us-east-1) ───(inherited)────────────> aws_security_group.dev   -> us-east-1
provider "aws" alias=mumbai ─┐
                             │ providers = { aws.prod = aws.mumbai }
                             └──────────> configuration_aliases = [aws.prod]
                                          aws_security_group.prod { provider = aws.prod } -> ap-south-1
```

### Verification
`terraform validate` OK, `terraform apply -auto-approve`. State file shows one resource in `us-east-1` and the other in `ap-south-1`; in the AWS console `dev-sg` exists in N. Virginia and `prod-sg` in Mumbai.

### Two pointers to remember

| Point | Detail |
|---|---|
| `provider` vs `providers` | On a **resource**, `provider = aws.xyz` takes a single reference (string-like). On a **module** block, `providers = { ... }` takes a **map**, because a module can contain resources of many different providers (key = name in child, value = provider config in root). |
| Aliased providers are never inherited | Provider configurations with `alias` are **never inherited automatically** by child modules; you must pass them explicitly with the `providers` map. (Only the default/unaliased one is inherited.) |

### Exam tips
- Default provider config is inherited by child modules; aliased ones must be passed explicitly via `providers = { child_name = root_provider }`.
- Child declares needed aliases with `configuration_aliases` in `required_providers`.
- `providers` (module, map) vs `provider` (resource, single).

---

## 128. Requirement for Publishing Modules in Terraform Registry

Theory only. Anyone can publish and share modules on the public Terraform Registry (you sign in with GitHub via the **Publish -> Module** option). Published modules get **versioning, automatically generated documentation, version history browsing, examples and README rendering**.

### Registry listing facts
A module's registry page shows a description, publish date, who manages it, and a link to the **source code on GitHub** where the actual module contents are stored.

### Requirements table (exam relevant)

| Requirement | Detail |
|---|---|
| **GitHub** | The module must be on GitHub and must be a **public repository** (applies to the public registry). |
| **Named** | Repository must use the three-part name **`terraform-<PROVIDER>-<NAME>`**, e.g. `terraform-aws-vpc`, `terraform-aws-eks`, `terraform-aws-security-group`. |
| **Repository description** | The GitHub repo description populates the short description on the registry. |
| **Standard module structure** | Must follow the file/directory layout (minimal: README.md, main.tf, variables.tf, outputs.tf; see 126). |
| **`x.y.z` tags for releases** | The registry uses Git tags to identify module versions. Release tag names must be a **semantic version**, optionally prefixed with `v` (e.g. `v1.0.4` or `0.9.2`). E.g. VPC module versions `3.14.0`, `3.13.0`, `3.12.0`. |

### Standard structure formats (recap)
- **Minimal:** `README.md`, `main.tf`, `variables.tf`, `outputs.tf`.
- **Complete:** minimal + `modules/` (nested sub-modules, each with its own README/main/variables/outputs) + `examples/`.
- Real modules checked: the VPC module has `main.tf`, `outputs.tf`, `variables.tf`, a `modules/` folder (e.g. `vpc-endpoints`) and `examples/`; the security-group module also has `modules/` and `examples/`.

### Exam tips
- Memorise the five requirements: **GitHub (public), name `terraform-<provider>-<name>`, repo description, standard module structure, `x.y.z` release tags.**
- Tag format: semantic version, optional leading `v`.

---

## 129. Overview of Terraform Workspace

### Analogy: desktops/workspaces in an OS
Like multiple virtual desktops in Windows: each desktop has its own set of open windows (browser, terminal, editor). Switching desktop gives a clean environment. A Terraform workspace similarly **separates environments**.

### Background: configuration <-> state
Infrastructure created by Terraform is tied to a configuration **and** a state file (`terraform.tfstate`). Add another resource to the same file and apply: it is tracked in the same state file.

**Question:** can one configuration have multiple state files, so that different environments are tracked separately? **Yes -> Terraform workspaces.**

```
                          ┌── workspace "dev"  ──> dev state  ──> EC2 in dev environment
 one configuration  ──────┤
 (EC2 code)               └── workspace "prod" ──> prod state ──> EC2 in prod environment
```
(The slide names the states `dev.tfstate` and `prod.tfstate` conceptually; on disk they are `terraform.tfstate.d/dev/terraform.tfstate`, etc.)

- Being in the dev workspace and running `terraform apply` creates the infrastructure in the development environment; in the prod workspace it creates it in production.
- Benefit: the same configuration deploys to multiple environments, **avoiding code repetition**, and simplifying life for smaller environments.

### Demo (code not shown, to avoid confusion; details in 130)
1. `terraform workspace list` shows: `default`, `dev`, `prod`; the `*` marks the current workspace.
2. `terraform workspace select dev`.
3. `terraform plan` -> 1 EC2 instance to be created. `terraform apply -auto-approve` -> created (took ~26 seconds). Instance type `t2.micro`.
4. `terraform workspace select prod`.
5. `terraform plan` -> **again 1 to add**. The prod workspace's state is empty, so Terraform does not know about the instance created in dev.
6. Look at the file layout: a new directory **`terraform.tfstate.d`** appears with one sub-folder per workspace:

```
.
├── workspace.tf
├── terraform.tfstate.d/
│   ├── dev/
│   │   └── terraform.tfstate     # contains the EC2 instance created in dev
│   └── prod/                     # empty until something is applied in prod
└── (terraform.tfstate)           # the "default" workspace state lives in the working dir
```

### Same code, different values per workspace
Organisations often want identical code but one argument different. E.g. `t2.micro` (1 GB RAM) is fine for dev; production needs e.g. 8 GB (`m5.large`). Workspaces allow the value to depend on the active workspace: dev -> `t2.micro`, prod -> `m5.large`. In the demo the dev instance was `t2.micro` and the prod one `m5.large`. (Implementation shown in 130.)

### Exam tips
- A workspace = a separate **state** for the same configuration. Resources applied in one workspace are invisible to another.
- State for non-default workspaces is stored under `terraform.tfstate.d/<workspace>/` (local backend).
- Default workspace always exists and is named `default`.

---

## 130. Terraform Workspace Practical

### Base code (repo: `kplabs-workspace.md`; file `workspace.tf`)
```hcl
resource "aws_instance" "myec2" {
   ami = "ami-08a0d1e16fc3f61ea"
   instance_type = "t2.micro"
}
```
The AMI is for N. Virginia; change it if you use another region (instructor note).

### Workspace commands
Running just `terraform workspace` lists the available subcommands.

```sh
terraform workspace              # list subcommands
terraform workspace show         # show current workspace (default at the start)
terraform workspace new dev      # create "dev" AND switch to it
terraform workspace show         # -> dev
terraform workspace new prod     # create "prod" AND switch to it
terraform workspace list         # default / dev / * prod  (star = current)
terraform workspace select dev   # switch to dev
```

| Subcommand | Purpose (as shown) |
|---|---|
| `terraform workspace show` | Print the current workspace name. |
| `terraform workspace new <name>` | Create a new workspace **and switch to it**. |
| `terraform workspace list` | List workspaces; `*` marks the current one. |
| `terraform workspace select <name>` | Switch to an existing workspace. |

(extra context) Other subcommands: `terraform workspace delete <name>` (you cannot delete the workspace you are currently in, nor `default`).

### Problem with the base code
Plans in both `dev` and `prod` show instance type `t2.micro` - we want different types per workspace.

### Solution: map in `locals` + `terraform.workspace`
Needed: one value per workspace (`default`, `dev`, `prod`) -> a **map** (key = workspace name).

Final code (repo "Final Code"):
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

Explanation:
- `locals { instance_type = { ... } }` - a local value that holds a map: key = workspace name, value = instance type.
- `terraform.workspace` - a built-in expression returning the **name of the current workspace** (`default`, `dev` or `prod`).
- `local.instance_type[terraform.workspace]` - looks up the map entry whose key equals the workspace name.

### Demo
1. In `prod`: `terraform plan` -> `instance_type = "m5.large"`.
2. `terraform workspace list` confirms `* prod`.
3. `terraform workspace select dev`, then `terraform plan` -> `instance_type = "t2.micro"`.
4. (default workspace would produce `t2.nano`.)

### On-disk layout
Using workspaces creates the folder `terraform.tfstate.d/` with a sub-folder per non-default workspace (`dev/`, `prod/`). **There is no sub-folder for `default`**: its `terraform.tfstate` file stays in the working directory as usual.

### Gotchas
- `terraform workspace new` also **switches** you - check `terraform workspace show` before `apply` to avoid deploying to the wrong environment. (practical point; the `*` in `list` shows the current one.)
- (extra context) If you create a workspace whose name has no key in the `locals` map (e.g. `staging`), `local.instance_type[terraform.workspace]` fails with an error - add the key or use `lookup()` with a default.
- (extra context) Workspaces share the **same backend and the same configuration**; they isolate state only. For strict separation (different accounts, access control) many teams prefer separate directories/repos.
- (extra context) CLI workspaces are different from HCP Terraform/Terraform Cloud "workspaces" (those are full workspace objects with their own variables, runs, etc.).

### Exam tips
- `terraform.workspace` gives the current workspace name; combine with a map to vary values.
- `terraform workspace new` creates and switches; `select` only switches; `list` shows `*`; `show` prints current.
- Default workspace state file: `terraform.tfstate` in working dir; others: `terraform.tfstate.d/<name>/terraform.tfstate`.
- Workspaces avoid repeating code across environments, mostly for smaller setups.

---

## Command / syntax cheat-sheet

### Module blocks and sources
```hcl
# Registry module (with version)
module "ec2-instance" {
  source  = "terraform-aws-modules/ec2-instance/aws"
  version = "6.1.4"
  subnet_id = "subnet-xxxxxxxx"
}

# GitHub (must start with github.com - no https://)
module "ec2" { source = "github.com/zealvora/sample-kplabs-terraform-ec2-module" }

# Local path (must begin with ./ or ../)
module "ec2" { source = "../../modules/ec2" }
module "sg"  { source = "./modules/network" }

# S3 source prefix:  s3::...   (see Module Sources docs for the rest of the format)
```

### Module internals
```hcl
# variable (module input)
variable "instance_type" {}

# output (module return value)
output "instance_id" { value = aws_instance.myec2.id }

# use the output from the root
instance = module.ec2.instance_id      # module.<module_name>.<output_name>

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

### CLI
```sh
terraform init                       # downloads modules and providers
terraform validate
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve

terraform workspace                  # list subcommands
terraform workspace show             # current workspace
terraform workspace new dev          # create + switch
terraform workspace list             # * = current
terraform workspace select dev       # switch
# (extra context) terraform workspace delete dev
```

### Workspace code pattern
```hcl
locals {
  instance_type = { default = "t2.nano", dev = "t2.micro", prod = "m5.large" }
}
resource "aws_instance" "myec2" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = local.instance_type[terraform.workspace]
}
```

### Quick comparison tables

| Root module | Child module |
|---|---|
| Working directory; entry point | Called by another module |
| Contains `module {}` blocks and provider configurations | Contains reusable resources, `variable`s, `output`s |
| Receives CLI commands | Referenced via `source` |

| Resource `provider` | Module `providers` |
|---|---|
| Single reference: `provider = aws.prod` | Map: `providers = { aws.prod = aws.mumbai }` |

| Standard structure (minimal) | Purpose |
|---|---|
| `README.md` | Docs |
| `main.tf` | Resources |
| `variables.tf` | Inputs |
| `outputs.tf` | Outputs |

---

## Key takeaways

1. Modules implement the **DRY** principle: write once, reuse everywhere, standardise and change in one place.
2. A module is simply a **folder of Terraform code**; it is used through a `module` block with a required `source` argument.
3. **`terraform init`** downloads modules; the `version` argument pins a registry module version.
4. Pick public modules carefully: downloads, GitHub contributors/issues, docs, version history, code quality, stars/forks, partner badge. Beware malicious/shady modules; read the source if unsure.
5. Organisations usually maintain their own (private) modules; public modules include every option, yours need only what you use.
6. Module sources: local (`./`, `../`), Registry, GitHub (`github.com/...`, no `https://`), Bitbucket, Git, HTTP, S3 (`s3::`). Consult the docs for syntax.
7. **Avoid hard-coded values** in modules - use variables. Undeclared arguments cause "Unsupported argument"; undeclared-default variables cause "Missing required argument".
8. **Avoid `provider` blocks in child modules**; declare `required_providers` (source + version) instead; provider config comes from the root module.
9. Access a child's values only through **outputs**: `module.<name>.<output>`.
10. **Root module** = working directory entry point; **child module** = module that is called.
11. Standard module structure: README.md, main.tf, variables.tf, outputs.tf (+ `modules/`, `examples/`). Build a **collection** of small modules, not one giant one.
12. Aliased providers are **never inherited**: pass via `providers` map and declare with `configuration_aliases`; use `provider = aws.<name>` on resources.
13. Publishing to the public registry: public GitHub repo, `terraform-<provider>-<name>`, repo description, standard structure, `x.y.z` tags.
14. **Workspaces** = multiple state files for one configuration; `default` always exists; others stored in `terraform.tfstate.d/<name>/`.
15. `terraform.workspace` + a `locals` map yields per-environment values from one code base.

---

## Quick revision Q&A

**1. What does DRY stand for and how do modules apply it?**
"Don't Repeat Yourself". Modules centralise common resource configuration so teams reference one standard template instead of copy-pasting code, giving standardisation and a single place to change.

**2. Name the problems of every team writing its own EC2 code.**
Repetition of code; provider changes force edits in every team's code; no standardisation of best practices; hard to manage; hard for developers to use.

**3. Which argument is mandatory in a `module` block and what does `version` do?**
`source` is mandatory (location of the module). `version` pins a particular module version so that exact version's code is pulled instead of the latest (registry modules).

**4. What command downloads modules?**
`terraform init` ("Initializing modules...").

**5. How do you reference a module from a local folder two levels up?**
`source = "../../modules/ec2"`; local paths must begin with `./` or `../`.

**6. Why did `source = "https://github.com/..."` fail and what is the correct form?**
GitHub sources must start with `github.com`; the error was "error downloading ... no source URL was returned". Use `github.com/<user>/<repo>`.

**7. What happens if you pass `instance_type = "t2.large"` to a module that has no such variable?**
Error: "An argument named instance_type is not expected here" (Unsupported argument).

**8. Why avoid a `provider` block in a child module and what to use instead?**
It hard-codes region/provider and overrides what the caller wants (the demo created the instance in us-east-1 despite the root saying ap-south-1). Use `required_providers` with source and version constraint; configure the provider in the root.

**9. How does a root module use a value created inside a child module?**
Declare an `output` in the child and reference it as `module.<module_name>.<output_name>`, e.g. `instance = module.ec2.instance_id`. Direct references like `module.ec2.id` fail ("object does not have an attribute named id").

**10. Define root module and child module.**
Root module: the main working directory / entry point where `module` blocks are written. Child module: a module called by another module (e.g. `modules/ec2`).

**11. What is the minimal standard module structure?**
`README.md`, `main.tf`, `variables.tf`, `outputs.tf`. Extended: `modules/` (nested) and `examples/`; `versions.tf` is common.

**12. How do you create one security group in Mumbai and another in N. Virginia from the same child module?**
Root: default provider (us-east-1) + `provider "aws" { alias = "mumbai" region = "ap-south-1" }`; call module with `providers = { aws.prod = aws.mumbai }`. Child: `configuration_aliases = [aws.prod]` in `required_providers`; on the prod resource set `provider = aws.prod`.

**13. Difference between `provider` (resource) and `providers` (module)?**
`provider` takes a single provider reference; `providers` takes a map because a module may use several providers. Aliased providers are never inherited automatically.

**14. List the requirements for publishing a module to the public registry.**
Public GitHub repository; repo name `terraform-<PROVIDER>-<NAME>`; repository description; standard module structure; `x.y.z` (semver, optional `v` prefix) release tags.

**15. What is a Terraform workspace and where is its state stored?**
A way to have multiple state files for one configuration so you can manage different environments. Default workspace state is `terraform.tfstate` in the working directory; others live in `terraform.tfstate.d/<workspace>/terraform.tfstate` (local backend).

**16. Which commands create/switch/list workspaces and how do you use the name in code?**
`terraform workspace new <n>` (creates and switches), `select <n>`, `list` (star = current), `show`. In code use `terraform.workspace`, e.g. `local.instance_type[terraform.workspace]`.

---

## Glossary

| Term | Meaning |
|---|---|
| **Module** | A folder of Terraform configuration that can be called by other configurations; unit of reuse. |
| **DRY** | "Don't Repeat Yourself" - reduce duplication. |
| **Root module** | The main working directory configuration; entry point that calls other modules. |
| **Child module** | A module called by another module via a `module` block. |
| **`module` block** | Block used to call a module; requires `source`. |
| **`source`** | Argument giving the module's location (local path, registry, GitHub, S3, ...). |
| **`version`** | Argument to pin a module version (registry modules). |
| **Terraform Registry** | Public catalogue of modules/providers at registry.terraform.io; anyone can publish; supports versioning and auto docs. |
| **Private registry** | Organisation-internal module catalogue (not public). |
| **HashiCorp Partner badge** | Registry badge showing a module is maintained by a HashiCorp partner. |
| **Input variable** | `variable` block making a module configurable. |
| **Output value** | `output` block exposing a value from a module; accessed as `module.<name>.<output>`. |
| **`required_providers`** | `terraform` sub-block declaring provider `source` and `version` constraints. |
| **`configuration_aliases`** | Argument in `required_providers` declaring that a module expects aliased provider configurations to be passed in. |
| **Provider alias** | Extra named instance of a provider (e.g. `alias = "mumbai"`) usable as `aws.mumbai`. |
| **`providers` (module)** | Map passed in a `module` block to hand provider configurations to the child. |
| **`provider` (resource)** | Meta-argument selecting which provider configuration a resource uses. |
| **Standard module structure** | HashiCorp-recommended layout: README.md, main.tf, variables.tf, outputs.tf (+ modules/, examples/). |
| **Semantic version tag (x.y.z)** | Git tag format (optionally `v`-prefixed) the registry uses as module version. |
| **Workspace** | A named state instance for one configuration (default, dev, prod...). |
| **`terraform.workspace`** | Expression returning the current workspace name. |
| **`terraform.tfstate.d`** | Directory holding per-workspace state for non-default workspaces. |
| **Elastic IP (EIP)** | Static public IPv4 address in AWS; charges apply if unattached (as noted in the lecture). |
| **`.terraform.lock.hcl`** | Provider dependency lock file (the instructor read the installed provider version, 5.51, from it). |

---

## Appendix - repo files not tied to a transcript

### `module-locals/` (no narrated lecture in 113-130)
```
module-locals/
├── modules/sg/sg.tf        # child module: two security groups
└── projects/B/
    ├── providers.tf        # provider "aws" { region = "us-west-2" }
    └── my-sg.tf            # module "sgmodule" { source = "../../modules/sg" }
```
`modules/sg/sg.tf` defines `aws_security_group.ec2-sg` (name `myec2-sg`) and `aws_security_group.elb-sg` (name `myelb-sg`). Both have an identical ingress rule (TCP 8433 from `0.0.0.0/0`, description "Allow Inbound from Secret Application") and an allow-all egress rule. The repeated values suggest it is a demo for refactoring with `locals`; the narration is not part of this session. The wide-open CIDR is demo-only - never use `0.0.0.0/0` for real private services (extra context).

### `module-outputs/` (security group variant of lecture 124)
Described inside lecture 124 above.

### Repo vs transcript differences worth remembering
- `ec2-module.md` pins module `6.1.4`; `note-points-modules.md` pins `5.6.1`; `terraform-registry.md` shows an old `~> 2.0` example. The lecture shows the concept; versions change over time - always read the module's current usage page.
- Repo uses folder names `kplabs-modules/projects/A`; the video uses `kplabs-terraform-modules/teams/A`.
- Transcript says the multi-provider child file was `az.tf`; repo has `modules/network/sg.tf`.
