# Session 10 - Terraform Challenges

Study notes for the HashiCorp Certified Terraform Associate course (Zeal Vora / KPLabs).
Source material: video transcripts of lectures 167 and 169-181, plus the instructor's challenges repository `zealvora/kplabs-terraform-challenges` (folders `challenge-1` to `challenge-4`).

Notes on labelling: anything marked **(extra context)** is widely-known background I have added; it was not said in the videos. Everything else is taken from the transcripts or the repo. Where the instructor mis-speaks or the auto-generated transcript garbles a word, I silently correct it (for example "terraform.log.hcl" is really `.terraform.lock.hcl`).

---

## Session overview

Up to this point the course taught Terraform concept by concept. Session 10 closes the gap between *learning* and *practical experience* with a set of small, self-contained **challenges** kept in a separate Git repository (`kplabs-terraform-challenges`). Each challenge targets a different skill area (the instructor lists troubleshooting, security, optimization and code analysis as examples), and the instructor says more challenges will be added over time (at recording time there were "around four or five").

Every challenge follows the same three-video workflow:

1. **Challenge video** - what the requirement is.
2. **Solution hints video** - not the practical solution, but the probable approaches. Use it if you are stuck.
3. **Solution video** - the live, practical walkthrough.

The four challenges in this session:

| # | Theme | Core skills tested |
|---|-------|--------------------|
| 1 | Versioning / legacy code refactoring | `required_version`, provider `version`, `required_providers`, `.terraform.lock.hcl`, deprecated arguments, not hard-coding credentials |
| 2 | Best practices / optimization | `terraform fmt`, variables + `terraform.tfvars`, tags, descriptions, variable precedence, file structure, `terraform init -upgrade`, lock file |
| 3 | Loops | `for_each` over a map, `each.key` / `each.value`, resource addressing, add/remove keys |
| 4 | Data sources and functions | `aws_iam_users`, `aws_caller_identity`, `length()`, outputs, interpolation |

Suggested way to use the session: read the problem statement, close these notes, try it yourself, then read the hints, then compare with the walkthrough.

---

## Table of contents

1. [Lecture to repo-file mapping](#lecture-to-repo-file-mapping)
2. [Lectures 167 and 169 - Overview of challenges and cloning the repo](#lectures-167-and-169---overview-of-challenges-and-cloning-the-repo)
3. [Challenge 1 - Versioning and legacy code (lectures 170-172)](#challenge-1---versioning-and-legacy-code-lectures-170-172)
4. [Challenge 2 - Best practices and optimization (lectures 173-175)](#challenge-2---best-practices-and-optimization-lectures-173-175)
5. [Challenge 3 - Loops with for_each (lectures 176-178)](#challenge-3---loops-with-for_each-lectures-176-178)
6. [Challenge 4 - Data sources, functions and outputs (lectures 179-181)](#challenge-4---data-sources-functions-and-outputs-lectures-179-181)
7. [Key takeaways](#key-takeaways)
8. [Self-test: how would you approach each challenge before looking at the solution](#self-test-how-would-you-approach-each-challenge-before-looking-at-the-solution)
9. [Quick revision Q&A](#quick-revision-qa)

---

## Lecture to repo-file mapping

| Lecture | Title | Challenge | Repo file(s) / notes |
|---------|-------|-----------|----------------------|
| 167 | Overview of Terraform Challenges | - | Introduces the repo `kplabs-terraform-challenges` and the 3-video workflow |
| 168 | *(not present in the provided transcripts)* | - | Missing. Lecture 167 says the repo link will be added "after this video", so 168 is probably the link/resources lecture, but that is only a guess |
| 169 | Cloning Git Repository For Challenges | - | Whole repo (zip download vs `git clone`) |
| 170 | Overview of Terraform Challenge - 1 | 1 | `challenge-1/tf-challenge-1.tf` (starter code) |
| 171 | Challenge 1 - Solution Hints | 1 | same starter file |
| 172 | Challenge 1 - Solution Video | 1 | edits `tf-challenge-1.tf`; generates `.terraform.lock.hcl` locally |
| 173 | Overview of Terraform Challenge - 2 | 2 | `challenge-2/tf-challenge-2.tf`, `challenge-2/.terraform.lock.hcl` |
| 174 | Challenge 2 - Solution Discussion and Hints | 2 | same |
| 175 | Challenge 2 - Solution Video | 2 | splits the file into `providers.tf`, `variables.tf`, `terraform.tfvars`, `sg.tf`, `eip.tf` |
| 176 | Overview of Terraform Challenge - 3 | 3 | `challenge-3/main.tf` (only the `instance_config` variable), `challenge-3/providers.tf` |
| 177 | Challenge 3 - and Hints | 3 | same |
| 178 | Challenge 3 - Solution Video | 3 | adds the `aws_instance` resource to `main.tf` |
| 179 | Overview of Challenge 4 | 4 | `challenge-4/` contains only a `.gitkeep` (empty folder placeholder) - you write everything from scratch |
| 180 | Challenge 4 - and Hints | 4 | - |
| 181 | Challenge 4 - Solution Video | 4 | creates `main.tf` in `challenge-4/` |

Repo contents as cloned:

```text
challenges/
  challenge-1/tf-challenge-1.tf
  challenge-2/tf-challenge-2.tf
  challenge-2/.terraform.lock.hcl      (hidden dotfile; pins the AWS provider to 2.70.4, constraint "~> 2.7")
  challenge-3/main.tf
  challenge-3/providers.tf
  challenge-4/.gitkeep                 (empty)
```

The repo file contents quoted below are what is actually in the clone (the challenge-1 credentials were replaced with placeholders).

---

## Lectures 167 and 169 - Overview of challenges and cloning the repo

### Lecture 167: Why challenges?

- Learning a technology (Terraform, Ansible, Jenkins, ...) is much more effective when you also build small practical projects. That is the purpose of the section: *reduce the gap between learning and gaining practical experience*.
- Each challenge tests a different area. Examples named by the instructor: troubleshooting, security, optimization, analysing existing Terraform code.
- Workflow for every challenge (diagram in the video): **Challenge video -> Solution Hints video -> Practical Solution video**. The hints video discusses *probable approaches*, not the actual solution, so you can unblock yourself without spoiling the whole thing.
- The section is new and will grow. The challenges live in a separate Git repo, `kplabs-terraform-challenges`, with one folder per challenge (`challenge-1`, ...).

### Lecture 169: Getting the repo

Two ways were shown:

1. **Download the ZIP** from GitHub. The extracted folder is named `kplabs-terraform-challenges-main`; the instructor renames it by dropping `-main`. Works, but you will have to re-download to get new challenges.
2. **`git clone <repo-url>`** (recommended). You need the Git CLI installed. Because it is a real clone, when new challenges are added you simply pull the latest changes later.

```bash
git clone <URL of kplabs-terraform-challenges>   # URL is given in the course resources
cd kplabs-terraform-challenges
git pull                                         # later, to fetch newly added challenges (extra context: standard git command)
```

Safety tip **(extra context)**: the repo is third-party content. Read a `.tf` file before running `terraform apply` on it, and use a throw-away/sandbox AWS account.

---

## Challenge 1 - Versioning and legacy code (lectures 170-172)

### Problem statement (lecture 170)

A developer at an organization called "Sample Small Corp" wrote a Terraform file *a few years ago* using an older Terraform version. Many organizations still run old versions (0.12, 0.13) while others are on newer ones (1.2, 1.3, ...), so you often have to **refactor legacy code** so that it works with current Terraform and current provider plugins.

Tasks, in order:

1. Create the infrastructure **using the provided code without modification** (the only permitted edit is replacing the access key and secret key so the resources get created in *your* AWS account).
2. Verify whether the code works with the **latest Terraform version and the latest provider plugins**.
3. Modify and fix the code so that it works with the latest Terraform and providers.
4. You are free to edit the code however you like to achieve step 3.

### The starter file: `challenge-1/tf-challenge-1.tf`

Credentials in the repo are placeholder/example values; below they are replaced with obvious placeholders.

```hcl
provider "aws" {
  version    = "~> 2.54"
  region     = "us-east-1"
  access_key = "<ACCESS_KEY_PLACEHOLDER>"
  secret_key = "<SECRET_KEY_PLACEHOLDER>"
}

provider "digitalocean" {}

terraform {
  required_version = "0.12.31"
}

resource "aws_eip" "kplabs_app_ip" {
  vpc = true
}
```

What is "wrong" with it, by design:

| Item | Why it is a problem |
|------|---------------------|
| `terraform { required_version = "0.12.31" }` | Locks the code to *exactly* Terraform 0.12.31; any newer binary refuses to run it ("Unsupported Terraform Core version") |
| `version = "~> 2.54"` inside `provider "aws"` | Old-style provider version pin (the argument inside provider blocks was later deprecated in favour of `required_providers`); also pins to an ancient AWS provider (2.x) |
| `provider "digitalocean" {}` with no `required_providers` entry | Worked in old Terraform because providers were auto-resolved by name; in modern Terraform non-HashiCorp providers must be declared in `required_providers` |
| `access_key` / `secret_key` hard-coded | Obvious security problem; secrets would end up in version control |
| `vpc = true` on `aws_eip` | Argument deprecated in newer AWS provider versions; replaced by `domain = "vpc"` |

### Concepts tested

- **Terraform core version constraints** (`required_version`) - covered in the earlier session on provider/Terraform versioning.
- **Provider versioning and `required_providers`** (official vs community/partner providers, `source` addresses).
- **Dependency lock file** `.terraform.lock.hcl` (it bites you at the end of this challenge).
- **Credential handling** (AWS CLI configuration / environment instead of hard-coding) - security best practice.
- **Reading deprecation warnings** and consulting registry documentation.

### Instructor's hints (lecture 171)

1. **Terraform version**: if you run `terraform init` with the latest Terraform, you immediately get *"Unsupported Terraform core version"*. So for step 1 you must install an **older Terraform binary (0.12.x)** that matches the `required_version` block. HashiCorp keeps old binaries available.
2. **Secrets**: although not a hard requirement, hard-coded access and secret keys are "very risky code" in production. Fix it so the keys are not in the code.
3. **Provider blocks**: HashiCorp has official providers, partner/community providers. Depending on the provider, a plain `provider` block is enough or the provider must be added to the `required_providers` block. In current Terraform the DigitalOcean provider block as written will not work - migrate to `required_providers`.
4. **Core version requirement**: to make it work on the latest Terraform, the `required_version = "0.12.31"` block "needs to go away" (or be relaxed).

### Step-by-step solution (lecture 172)

#### Part A - Make the original code run (requirement 1)

1. **Confirm the failure.** Using the latest Terraform (1.5.x at recording time) run `terraform init` in `challenge-1`. It fails because of `required_version = "0.12.31"`.
2. **Download Terraform 0.12.31.** The normal install page only lists 1.0+ releases, so search "terraform older version download" and use the HashiCorp releases archive, `releases.hashicorp.com/terraform`, which has every version back to 0.1.0.
   - Open the `0.12.31` folder and choose the archive for your OS/architecture.
   - macOS is not named explicitly; use the **`darwin_amd64`** zip. The instructor (on Windows) used `windows_amd64.zip`.
3. **Drop the binary into the challenge folder** (temporarily). Run it via a relative path (`terraform.exe` on Windows; `./terraform` on macOS/Linux **(extra context)**). `init` now succeeds and downloads the DigitalOcean and AWS provider plugins.
4. Two binaries now coexist:
   - the local one in the folder: `terraform version` -> 0.12.x
   - the one on the PATH (environment variable), used from any other folder: 1.5.1 in the video.
   The binary in the current directory wins when you invoke it as `./terraform` / `terraform.exe` in that folder (extra context: on Windows the current directory is searched before PATH, which is why the instructor later has to delete the local binary).
5. **Remove the hard-coded credentials** (the two lines `access_key`/`secret_key`). Two options were mentioned: pass them via environment, or - the chosen route - configure the **AWS CLI**:
   - Use an existing IAM user (the instructor reused his "Terraform" user, which has AdministratorAccess for simplicity), create a new access key under *Security credentials*.
   - Run `aws configure`, paste the access key ID and secret access key, leave the region at default.
   - Terraform's AWS provider then picks up the credentials from the CLI's shared credentials file automatically.
6. `terraform plan`, then `terraform apply -auto-approve`. The Elastic IP is created; verify it in the console: EC2 -> Elastic IPs (region us-east-1, "North Virginia", because the provider block hard-codes that region).

Requirement 1 done.

#### Part B - Modernize for latest Terraform and providers (requirements 2-4)

7. `terraform destroy` the infrastructure first (cost: an Elastic IP is charged when it is not attached to an instance).
8. **Switch back to the latest Terraform.** Download the latest binary (1.5.7 at recording time), replace the one in your PATH folder, **delete the old 0.12 binary from the challenge folder**, and open a *new* terminal so the PATH change is picked up. `terraform version` should now show the latest version.
9. **Remove the `terraform { required_version = "0.12.31" }` block.** Save and run `terraform init` again.
10. `init` now fails: *"Failed to query available provider packages"* for DigitalOcean. Reason: a partner/community provider can no longer be used just via `provider "digitalocean" {}`. Declare it in `required_providers`. Find the snippet on the Terraform Registry page for the DigitalOcean provider (search "terraform provider digitalocean"). The registry snippet has `source = "digitalocean/digitalocean"`; the version constraint is optional here ("not really required").
11. `terraform init` now succeeds, with a deprecation warning.
12. **Make sure the *latest* AWS provider is used.** Remove `version = "~> 2.54"` from the `provider "aws"` block. Run `terraform init` again - but it **reuses the old AWS provider version** because it is recorded in `.terraform.lock.hcl`. Options: delete the lock file (simplest here because nothing else exists yet) or run `terraform init -upgrade` **(extra context: the option used in Challenge 2)**. The instructor deleted the file and re-ran `init`; the provider downloaded was 5.17.0 in the video.
13. `terraform apply -auto-approve`: it works but prints a warning that `vpc` is **deprecated** (pointing at the exact line `vpc = true`).
14. **Treat deprecation warnings as errors-to-be.** The instructor stresses that in production you must not leave deprecation warnings behind; they become hard errors in later provider versions. Destroy the infra again.
15. Open the `aws_eip` resource page in the AWS provider documentation (resources, not data sources). The new way is `domain = "vpc"`. Replace `vpc = true` with it.
16. `terraform apply -auto-approve` again: no warnings, EIP created (a new EIP appears in the console). Finally `terraform destroy`.

### Final working code (modern version)

This is assembled from the steps in the video (the instructor edited in place and did not display a final listing). The `required_providers` entry for DigitalOcean follows the registry snippet he copied.

```hcl
terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      # version constraint optional (instructor: "not really required")
    }
  }
}

provider "aws" {
  region = "us-east-1"
  # no version = ...   -> latest provider is used
  # no access_key/secret_key -> taken from `aws configure` (AWS CLI credentials)
}

provider "digitalocean" {}

resource "aws_eip" "kplabs_app_ip" {
  domain = "vpc"
}
```

Explanation of each part:

- `terraform { required_providers { digitalocean = {...} } }` - tells Terraform where to download the DigitalOcean plugin (`source`). The `aws` provider is a HashiCorp provider; the instructor did not add it, since Terraform implicitly resolves `hashicorp/aws`. **(extra context)** Many teams add it explicitly too (as Challenges 2 and 3 do).
- `required_version` block removed - allows any current Terraform binary. **(extra context)** A better modern pattern is a *range* such as `required_version = ">= 1.5"` instead of deleting the constraint entirely.
- `provider "aws"` - only the region remains; the old `version` argument and the credentials were removed.
- `provider "digitalocean" {}` - kept as-is (empty). **(extra context)** Without a DigitalOcean token, plan/apply may only work because no DigitalOcean resources are used.
- `domain = "vpc"` - the replacement for the deprecated `vpc = true`.

### Common mistakes

- Running `terraform init` with the newest Terraform for step 1 and not realising the error is a version lock (`required_version`).
- Forgetting to delete the old 0.12 binary from the challenge folder, so `terraform version` keeps reporting 0.12 even after upgrading the PATH binary. Also forgetting to open a **new terminal** after changing PATH.
- Leaving the provider `version = "~> 2.54"` or an old `.terraform.lock.hcl` and wondering why "latest provider" is not installed. (The lock file pins the previous version.)
- Ignoring the deprecation warning because `apply` "succeeded".
- Committing credentials in the code (even example values); use `aws configure` / environment variables instead.
- Forgetting to destroy: an unattached Elastic IP is billed.

### What to take away

- `required_version` locks the **Terraform CLI**, `version` in `required_providers` (or a constraint) controls **provider plugins**, and `.terraform.lock.hcl` **freezes the exact provider version** between runs.
- Non-HashiCorp providers need an entry in `required_providers` with a `source`.
- Old binaries are available at the HashiCorp releases archive.
- Never hard-code credentials; use the AWS CLI configuration or environment variables.
- Deprecation warnings must be fixed (check the resource documentation for the new argument).

---

## Challenge 2 - Best practices and optimization (lectures 173-175)

### Problem statement (lecture 173)

You are given working-looking code that creates AWS resources. Your job is to **optimize it according to Terraform best practices**, with focus on a small subset (mainly variables). Conditions:

1. The code must **work** and the resources must be created successfully (if `plan` errors, fix the errors).
2. **Do not delete** the existing `.terraform.lock.hcl` file (it may be modified).
3. **Demonstrate** changing the variable `splunk` from `8088` to `8089` **without modifying any Terraform code** - so you may *not* edit it in the `.tf` file and may *not* put it in a `.tfvars` file. (Use a mechanism outside the code files.)

### The starter file: `challenge-2/tf-challenge-2.tf`

Reproduced as in the repo (indentation is intentionally messy):

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"

    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "splunk" {
  default = "8088"
}
resource "aws_security_group" "security_group_payment_app" {
  name        = "payment_app"
    description = "Application Security Group"
  depends_on = [aws_eip.example]

# Below ingress allows HTTPS  from DEV VPC
  ingress {
       from_port        = 443
     to_port          = 443
    protocol         = "tcp"
      cidr_blocks      = ["172.31.0.0/16"]
  }

# Below ingress allows APIs access from DEV VPC

  ingress {
    from_port        = 8080
      to_port          = 8080
    protocol         = "tcp"
       cidr_blocks      = ["172.31.0.0/16"]
  }

# Below ingress allows APIs access from Prod App Public IP.

  ingress {
    from_port        = 8443
      to_port          = 8443
    protocol         = "tcp"
       cidr_blocks      = ["${aws_eip.example.public_ip}/32"]
  }
}
 egress {
    from_port        = var.splunk
    to_port          = var.splunk
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
  }



resource "aws_eip" "example" {
   domain = "vpc"
}
```

Plus `.terraform.lock.hcl`, which pins `registry.terraform.io/hashicorp/aws` at **version 2.70.4** with constraint `"~> 2.7"` (hash lines omitted here).

Hidden "traps" planted in the file:

- The closing `}` of the security group comes *before* the `egress` block, so `egress` sits **outside** the resource (syntax error).
- The lock file forces an ancient AWS provider (2.70.4), which does not know `domain` on `aws_eip` (added in the 5.x provider line - the instructor confirms 5.0+ is needed).
- Everything is hard-coded, badly indented, un-tagged, un-described, one big file, and the resource local name is long and redundant.

### Concepts tested

- Debugging HCL syntax errors (block nesting).
- Dependency lock file and `terraform init -upgrade`.
- `terraform fmt`, `terraform validate`.
- Input variables and `terraform.tfvars`.
- **Variable definition precedence** (`-var`, `-var-file`, env vars, ...).
- Resource tagging; `description` fields.
- Naming conventions and a sensible file layout (Terraform merges all `.tf` files in a directory).
- Implicit resource replacement when the local name (address) of a resource changes.

### Instructor's hints (lecture 174)

1. **Indentation** - fix it (use the formatter, not by hand).
2. **Hard-coded values** (CIDRs, ports) - use **variables and `tfvars`** to minimise hard-coding; hard-coded values bloat code and make edits slow as the code grows.
3. **Tags** - in production with hundreds of resources, tags identify owner team, environment (test vs production), purpose. Example from the video: a Singapore-region account with 28 security groups, e.g. one called `launch-wizard-10` - you cannot tell what it is for, who owns it, or whom to ask before deleting. Tags such as `DB admin` owner and `stack = production/test` on servers make this obvious. Applies equally to manually created resources.
4. **Variable precedence** - to override `splunk` from 8088 to 8089 without touching code, use the correct precedence level.
5. **Folder structure / naming convention** - do not put everything in one `main.tf`; use `providers.tf`, `variables.tf`, `ec2.tf` (resource files), etc.

### Step-by-step solution (lecture 175)

#### Part A - Make it work

1. In the challenge-2 folder run `terraform init`. Error: *Blocks of type "egress" are not expected here*. Trace the braces: each `ingress { }` is balanced, and the `aws_security_group` resource closes **before** the `egress` block. Cut the `egress` block and paste it inside the resource (above the resource's closing brace). Re-run `init` - OK.
2. Note that `init` installed **AWS provider 2.70.4** although there is no version constraint in the code. Run `terraform validate`: error that the argument **`domain`** is not expected in `aws_eip`, even though the docs show `domain = "vpc"`.
3. Troubleshooting rule from the video: **when correct-looking code errors out, check (a) the Terraform binary version and (b) the provider plugin version.** Here the provider is far behind (the registry shows 5.x).
4. Why was 2.70.4 installed with no constraint in code? Because of **`.terraform.lock.hcl`**, which records the version and constraint. Deleting it would cure it, but condition 2 forbids deletion.
5. Solution: **`terraform init -upgrade`**. It installs the newest provider allowed by the constraints and **rewrites the lock file** (now 5.17.0 in the video). This is the recommended way.
6. `terraform plan` now works.

#### Part B - Optimize

7. **Format**: `terraform fmt <file name>` (the instructor passes the file name; running `terraform fmt` alone formats the current directory **(extra context)**). All `from_port`, `to_port`, etc. are aligned.
8. **Create variables** in a new `variables.tf`. Identify what repeats or is configuration:
   - `https` (port 443)
   - `apis` (port 8080)
   - `prod_apis` (port 8443)
   - `dev_vpc` (CIDR `172.31.0.0/16`, used by two rules - change once, applies to both)
   - move the existing `splunk` variable (default `"8088"`) out of the resource file into `variables.tf`.
9. **Create `terraform.tfvars`** with the values for `https`, `apis`, `prod_apis`, `dev_vpc` (`443`, `8080`, `8443`, `172.31.0.0/16`). (Mid-video the instructor misreads the CIDR as 173.31...; the correct value is the original `172.31.0.0/16`.) `splunk` is **not** put in the tfvars file, because condition 3 forbids that and because it keeps its default in `variables.tf`.
10. **Reference variables** in the resource: `var.https`, `var.apis`, `var.prod_apis`, `var.dev_vpc` (both in the 443 and 8080 rules). `terraform plan` -> still works.
11. **Observe the problem tags solve.** `terraform apply -auto-approve`, then look at the console (EC2 -> Security Groups in us-east-1). Among many default groups you can't tell which one came from Terraform. The instructor finds it by copying the security group ID from `terraform.tfstate`. The inbound rules (443, 8080, 8443) are present and the egress rule uses the `splunk` default - but name/ownership information is missing.
12. **Add tags** to the security group and the EIP: a Name (`payment_app`), a Team (a "payments team" - any value is fine, the point is to have one), and Environment (`production`).
13. **Override `splunk` without code changes** via variable precedence. The Terraform docs list the order (later sources override earlier): environment variables -> `terraform.tfvars` -> `terraform.tfvars.json` -> `*.auto.tfvars` -> `-var` / `-var-file` on the CLI. `-var` is last, so the easiest way is:
    ```bash
    terraform plan  -var "splunk=8089"
    terraform apply -var "splunk=8089" -auto-approve
    ```
    The plan's egress block shows 8089; after apply the console's outbound rule is 8089 and the tags show team and environment.
14. **Naming conventions**: the resource label `security_group_payment_app` repeats its type (`aws_security_group`) - "such long name is not required". Shorten it (and the instructor says doing so signals experience). Because the *address* changes, Terraform plans **1 to destroy, 1 to add**.
15. **Descriptions on rules**: the developer left comments in the code, but someone looking at the AWS console cannot see them (what is `172.31.0.0/16`?). Add a `description` to every `ingress` and the `egress` block (copy the comment text; for egress "Allow Splunk"). The console then shows descriptions for each rule.
16. **Apply the rename.** First apply failed after destroying the old group with an error that the security group `payment_app` **already exists** (the replace is destroy-then-create using the same `name`). Simply **running `terraform apply` again** fixes it (second run: "0 to destroy, 1 to add"). The instructor notes you will see similar behaviour in production.
17. **Split the file** into a clean structure:
    - `providers.tf` - terraform / provider blocks
    - `variables.tf` - all variables
    - `terraform.tfvars` - values
    - `sg.tf` - security group
    - `eip.tf` - the EIP resource (the original file renamed)
    - `.terraform.lock.hcl` - kept
18. **Prove nothing changes**: `terraform apply` (with the `-var` override as appropriate) shows no changes, because Terraform **merges all `.tf` files in the directory** into one configuration; moving blocks between files does not affect resources.

### Final working code

Assembled from the video's steps. The instructor typed the variable blocks without a type (not shown in detail); descriptions in ingress/egress and tags are as described. Exact label/tag spellings are chosen where he said "any value".

`providers.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

`variables.tf`

```hcl
variable "https" {}

variable "apis" {}

variable "prod_apis" {}

variable "dev_vpc" {}

variable "splunk" {
  default = "8088"
}
```

(extra context) In your own code add `type` and `description` to every variable; the instructor kept them minimal in the video.

`terraform.tfvars`

```hcl
https     = 443
apis      = 8080
prod_apis = 8443
dev_vpc   = "172.31.0.0/16"
```

`sg.tf`

```hcl
resource "aws_security_group" "payment_app" {
  name        = "payment_app"
  description = "Application Security Group"
  depends_on  = [aws_eip.example]

  # Below ingress allows HTTPS from DEV VPC
  ingress {
    description = "Allow HTTPS from DEV VPC"
    from_port   = var.https
    to_port     = var.https
    protocol    = "tcp"
    cidr_blocks = [var.dev_vpc]
  }

  # Below ingress allows APIs access from DEV VPC
  ingress {
    description = "Allow APIs access from DEV VPC"
    from_port   = var.apis
    to_port     = var.apis
    protocol    = "tcp"
    cidr_blocks = [var.dev_vpc]
  }

  # Below ingress allows APIs access from Prod App Public IP
  ingress {
    description = "Allow APIs access from Prod App Public IP"
    from_port   = var.prod_apis
    to_port     = var.prod_apis
    protocol    = "tcp"
    cidr_blocks = ["${aws_eip.example.public_ip}/32"]
  }

  egress {
    description = "Allow Splunk"
    from_port   = var.splunk
    to_port     = var.splunk
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "payment_app"
    Team        = "payments"
    Environment = "production"
  }
}
```

`eip.tf`

```hcl
resource "aws_eip" "example" {
  domain = "vpc"

  tags = {
    Name        = "payment_app"
    Team        = "payments"
    Environment = "production"
  }
}
```

Run it, including the override:

```bash
terraform init -upgrade                     # refresh provider + lock file
terraform fmt
terraform validate
terraform plan  -var "splunk=8089"
terraform apply -var "splunk=8089" -auto-approve
terraform destroy -var "splunk=8089" -auto-approve   # clean up when finished
```

What each part does:

- `providers.tf` - only provider and version-source configuration.
- `variables.tf` - declares inputs; `splunk` keeps its default, so it can still be overridden at higher precedence.
- `terraform.tfvars` - Terraform auto-loads this filename; the values for ports and CIDR live here so changing the dev CIDR is a one-line edit.
- `sg.tf` - consumes the variables, adds per-rule `description`, tags, and a short resource label. `cidr_blocks = ["${aws_eip.example.public_ip}/32"]` is kept from the original (interpolation inside a string, building a /32 CIDR from the EIP).
- `depends_on = [aws_eip.example]` is kept as in the original. **(extra context)** It is redundant, because the reference to `aws_eip.example.public_ip` already creates an implicit dependency; it can be removed.
- `eip.tf` - EIP with the same tags. `domain = "vpc"` needs the newer provider obtained through `init -upgrade`.

### Common mistakes

- Trying to fix the `domain` error by editing the code, when the real issue is the old provider locked by `.terraform.lock.hcl`.
- Deleting the lock file (forbidden by the conditions) instead of `terraform init -upgrade`.
- Placing `splunk = 8089` in a `.tfvars` file or editing the default (forbidden). Use `-var`, `-var-file` (file outside the standard auto-loaded names) or environment variable `TF_VAR_splunk` **(extra context: the env var also satisfies the condition, since `splunk` has only the default in code)**.
- Forgetting that `-var` is not remembered: the next plan/apply without `-var "splunk=8089"` will try to change the rule back to 8088. Put the override in the pipeline or environment if it must persist **(extra context)**.
- Misplaced braces (the `egress` block outside the resource).
- Renaming a resource label without realizing it triggers destroy and create. (Terraform 1.1+ offers `moved` blocks to avoid this **(extra context)**.)
- Typos in values copied from the video (the 172 vs 173 CIDR slip).

### What to take away

- Troubleshooting order for "valid" code that errors: **Terraform binary version -> provider version -> lock file**.
- `terraform init -upgrade` is the proper way to move forward a locked provider, and it rewrites the lock file.
- `terraform fmt` fixes style in one command.
- Use variables + `terraform.tfvars` for repeated/hard-coded values.
- Use tags (name, team, environment) and `description` fields so resources are identifiable *without* reading the code.
- Know variable precedence; `-var` is the highest level for ad-hoc overrides.
- Split code into `providers.tf`, `variables.tf`, resource files. Terraform merges all `.tf` files in a folder, so layout is for humans and does not change infrastructure.
- Keep local resource names short; the type is already in the address.

---

## Challenge 3 - Loops with for_each (lectures 176-178)

### Problem statement (lecture 176)

The challenge folder gives you a variable `instance_config` of type `map` with two key/value entries:

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}
```

(Repo file: `challenge-3/main.tf`. The AMI IDs differ - two different operating systems.)

Conditions:

1. **EC2 instances must be created from the values in the map**, one per key, using that key's `instance_type` and `ami` (if the map had 20 entries you should get 20 instances, each configured from its own entry).
2. **If a key/value pair is removed from the map, the corresponding instance must be destroyed** on the next `terraform apply`. Likewise, adding a new key (e.g. `instance3`, maybe with a larger type) creates a new instance.

Also in the folder: `providers.tf` (do not touch):

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

### Concepts tested

- **Loops / meta-arguments**: `for_each` (versus `count`).
- Maps and `each.key` / `each.value`.
- Resource addressing with keys (`aws_instance.web["instance1"]`) and the state file.
- How Terraform plans add/remove/modify by comparing the desired set of keys with state.

### Instructor's hints (lecture 177)

1. Use **some kind of loop**: the map may have 20 or 30 entries and changes over time; writing 20-30 resource blocks would create "an unnecessarily large code base".
2. Specifically **`for_each`**: "if a resource block includes a `for_each` argument whose value is a map or a set, Terraform creates one instance for each member of that map or set."

### Step-by-step solution (lecture 178)

1. Since the variable is already a map, `for_each` fits directly.
2. Start from the **`aws_instance` example in the AWS provider docs** (copy the base resource). Keep only `ami` and `instance_type`; remove tags ("we do not need the tags").
3. Add `for_each = var.instance_config`.
4. Replace the hard-coded arguments with `each.value.ami` and `each.value.instance_type`. `each.value` is the object for the current key; `each.key` would be `instance1`, `instance2`.
5. Cross-check the docs: Google "for_each terraform" -> HashiCorp developer docs; the map example (a `vpcs` variable looped with `each.value.cidr_block`) is the same pattern. Also the variable-types doc: a map is `{ key = value, ... }`.
6. `terraform init`, `terraform plan` -> two instances. `terraform apply -auto-approve`.
7. Look at the addresses: `aws_instance.web["instance1"]` and `aws_instance.web["instance2"]`. In `terraform.tfstate` the same appears as `aws_instance.web` with `index_key` `instance1` / `instance2`. The key *is* the identity of the instance.
8. **Test requirement 2**: delete the `instance2` entry from the map and add `instance3`. `terraform plan` shows **1 to destroy (instance2) and 1 to add (instance3)**. Apply (about 43 seconds). The console shows two running instances and one terminated.
9. **Bonus test**: change `instance3` from `t2.micro` to `t2.small`. `terraform plan` shows an **in-place modification** of only the `["instance3"]` entry. for_each re-reads all values each run.
10. `terraform destroy` to avoid charges.

### Final working code

`challenge-3/main.tf`

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}

resource "aws_instance" "web" {
  for_each      = var.instance_config
  ami           = each.value.ami
  instance_type = each.value.instance_type
}
```

(The resource label `web` is confirmed by the addresses shown in the video. The docs sample may carry more arguments or tags; the instructor removed them.)

Explanation:

- `variable "instance_config"` - the map of objects supplied by the repo, unchanged.
- `for_each = var.instance_config` - one `aws_instance.web` instance per key.
- `each.value.ami` / `each.value.instance_type` - pick attributes from the per-key object.
- The loop key (`instance1`...) becomes part of the address, which is what makes removal precise: removing `instance2` destroys exactly `aws_instance.web["instance2"]`.

### Common mistakes

- Writing one `aws_instance` block per entry instead of looping.
- Using `count` with a list index **(extra context)**: removing an item from the middle shifts indexes and can cause unwanted replacements; `for_each` with stable keys avoids that.
- Writing `each.value` where you need `each.value.ami`, or `each.key` where you need a value.
- Expecting that renaming a map key will update the instance in place: it is a destroy and create (the instructor's instance2 -> instance3 test shows exactly this).
- Using AMI IDs that don't exist in your region/account **(extra context)**: AMIs are region-specific and old public AMIs can be deprecated; replace with valid IDs for us-east-1 if apply fails.
- Forgetting `terraform destroy` afterwards.

### What to take away

- `for_each` is the right tool when you iterate a **map or set** and want **stable identities** (keys) for resources.
- `each.key` and `each.value` expose the current element; address format is `resource_type.name["key"]`.
- Adding/removing keys translates into create/destroy, and editing values translates into in-place update (or replacement, depending on the attribute).
- Reading documentation examples and adapting them is a skill the challenges are training.

---

## Challenge 4 - Data sources, functions and outputs (lectures 179-181)

### Problem statement (lecture 179)

The repo folder `challenge-4` is empty (only `.gitkeep`); you write the code from scratch. A client wants Terraform code that satisfies three requirements:

1. **Create an AWS IAM user named `admin-user-<account number>`**, where the account number is your AWS account ID. Example in the video: running the same code in account `12345` creates `admin-user-12345`; in account `67890` creates `admin-user-67890`. (No hard-coding of the account ID.)
2. **Show the names of all IAM users** in the AWS account as an output.
3. **Show the total number of users** as a numeric output (e.g. with 200 users a list is not enough; the client wants "200").

### Concepts tested

- **Data sources** (`data` blocks) to fetch information dynamically instead of hard-coding.
- **Output values**.
- **Built-in functions** (collection functions: `length`).
- **Interpolation** inside strings.
- Reading provider documentation (data sources vs resources sections).

### Instructor's hints (lecture 180)

1. **Data sources**: fetch information dynamically from the infrastructure (AWS) - the account ID and the user names - so the code works without hard-coded values. (Data sources can also read other state backends, but that is not what is needed here.)
2. **Terraform functions**: counting the users is outside what a data source does. A data source can return the list of names, but turning it into a number is the job of a function.

### Step-by-step solution (lecture 181)

The video solves requirements 2 and 3 first, then 1. Requirements 2 and 3 are "show" tasks, so they use **`output`** values. Requirement 1 creates infrastructure, so it uses a **resource** block.

#### Requirement 2 - list all usernames

1. In the console check IAM -> Users to see which users exist (the instructor has several; you might only have one, e.g. "Terraform"; create one if needed).
2. In the AWS provider docs, each service has a *Resources* and a *Data Sources* section. Open IAM -> **Data Sources**. There are `aws_iam_user` (one specific user) and **`aws_iam_users`** (plural; many users, optional name regex filter). We need the plural.
3. Create `challenge-4/main.tf`. Copy the example usage `data "aws_iam_users" "users" {}`.
4. Check the attribute reference of the data source: the exported attributes are `arns` and **`names`** (the instructor first typed a wrong attribute name, then fixed it to `names`).
5. Add an output and a provider block with region `us-east-1`. First run hit an error because the reference forgot the `data.` prefix. Data source references must start with `data.`.
6. `terraform init` (you may reuse provider plugins from earlier challenges to save bandwidth), then `terraform plan` shows the list.
7. `terraform apply -auto-approve` - outputs are stored in the state file (`terraform.tfstate`), which means other code could read them using **remote state** (data source `terraform_remote_state`) **(extra context: name of the data source)**. Lesson: values get committed to state only after `apply`, not after `plan`.

#### Requirement 3 - total number of users

8. Need a function: search "terraform functions". Functions are grouped by category (numeric, string, collection, ...). In **collection** functions use **`length`**, which "determines the length of a given list, map or string".
9. Add output `total_users = length(data.aws_iam_users.users.names)`. (A typo fixed on the way.) `terraform plan` shows `total_users` (6 in the video). Apply so it is saved to state.

#### Requirement 1 - IAM user with account ID in its name

10. Find a data source for the account ID: search "terraform data source account ID" -> **`aws_caller_identity`**: "get access to the effective Account ID, User ID, and ARN in which Terraform is authorized".
11. Add `data "aws_caller_identity" "current" {}`.
12. Copy the example from the **resource** page of `aws_iam_user` (note: this time the *resource* docs, not the data source docs). Keep only the name (tags removed).
13. First try: `name = "admin-user-data.aws_caller_identity.current"` - plan shows a literal string; text is not evaluated. Need **interpolation**: `"admin-user-${...}"`.
14. Second try: `${data.aws_caller_identity.current}` gives an error: the value is an *object with four attributes*. Pick the attribute **`account_id`**.
15. `terraform plan` now shows `admin-user-<12-digit account id>`; `terraform apply -auto-approve` creates it. Verify the last digits against the account ID in the console, and check IAM -> Users.

### Final working code

`challenge-4/main.tf` (assembled from the steps in the video; the local name of the IAM user resource is not stated in the transcript - it was copied from the docs example - so `admin` is used here)

```hcl
provider "aws" {
  region = "us-east-1"
}

# Requirement 2 - list the names of all IAM users
data "aws_iam_users" "users" {}

output "user_names" {
  value = data.aws_iam_users.users.names
}

# Requirement 3 - numeric count of users
output "total_users" {
  value = length(data.aws_iam_users.users.names)
}

# Requirement 1 - IAM user named admin-user-<account id>
data "aws_caller_identity" "current" {}

resource "aws_iam_user" "admin" {
  name = "admin-user-${data.aws_caller_identity.current.account_id}"
}
```

Explanation:

- `provider "aws"` - only the region (the instructor added it "for simplicity"; credentials come from the AWS CLI as in Challenge 1).
- `data "aws_iam_users" "users"` - reads all IAM users (optionally filterable with `name_regex`). Exposes `names` and `arns`.
- `output "user_names"` - prints the list of names.
- `length(...)` - collection function returning the number of elements, giving a numeric output.
- `data "aws_caller_identity" "current"` - exposes `account_id`, `user_id`, `arn` of the credentials Terraform runs with.
- `"admin-user-${...account_id}"` - string interpolation producing a different user name in each AWS account, with no hard-coded account number.

Behaviour to be aware of **(extra context)**: the user-list data source is read when Terraform refreshes/plans, so after the `admin-user-...` user is created the next plan's `user_names` / `total_users` will include it. The six users in the video were counted *before* the new admin user was created.

### Common mistakes

- Forgetting the `data.` prefix when referencing a data source.
- Using the wrong attribute (`users`/`name` instead of `names`) - always check the "Attribute Reference" in the docs.
- Using the singular `aws_iam_user` data source (single user) when the plural `aws_iam_users` is needed.
- Not wrapping the expression in `${ }` inside a string so the name comes out as literal text.
- Passing the whole `aws_caller_identity` object where a string (`account_id`) is needed.
- Reading docs for the wrong thing: *data source* page for fetching, *resource* page for creating.
- Expecting `plan` to save outputs to state - only `apply` does.

### What to take away

- **Data sources** let your code adapt to its environment (account ID, existing users) rather than hard-code values.
- **Outputs** are how to "show" something; they live in state after apply and can be consumed by other configurations.
- **Functions** (`length`) transform data that data sources return.
- **Interpolation** (`"text-${expr}"`) builds dynamic strings.
- Search technique: Google "terraform <thing you want>" (e.g. "terraform data source account ID") to discover the right data source quickly.

---

## Key takeaways

1. Challenges test **applied** skills in different areas: versioning, best practices, loops, data sources/functions.
2. **Versioning layers**: Terraform binary (`required_version`), provider plugin (`required_providers` + constraints), and the dependency lock file `.terraform.lock.hcl` that pins exact provider versions. If valid code errors, check all three.
3. Old Terraform binaries are downloadable from the HashiCorp releases archive; `terraform init -upgrade` refreshes providers and the lock file.
4. Non-official providers must be declared in `required_providers` (with `source`) in modern Terraform.
5. **Never hard-code credentials**; configure the AWS CLI or use environment variables.
6. **Treat deprecation warnings as bugs** to be fixed (e.g. `vpc = true` -> `domain = "vpc"`).
7. Best practices: `terraform fmt`, variables + `terraform.tfvars`, tags (name/team/environment), descriptions on rules, short resource labels, multiple files by purpose.
8. Variable precedence ends with `-var` / `-var-file`, which override lower sources without touching code.
9. Terraform merges all `.tf` files in the folder: splitting files has no effect on infrastructure.
10. `for_each` over a map gives one resource per key, keyed addresses, and clean add/remove behaviour.
11. Data sources (`aws_iam_users`, `aws_caller_identity`) + functions (`length`) + outputs + interpolation solve "dynamic" requirements.
12. Always `terraform destroy` after hands-on labs to avoid cost (unattached EIPs, EC2 instances).

---

## Self-test: how would you approach each challenge before looking at the solution

### Challenge 1 checklist

- [ ] Run `terraform init` as-is; read the error. What does `required_version` demand?
- [ ] Where do I get Terraform 0.12.31? Which archive matches my OS (`darwin_amd64`, `windows_amd64`, `linux_amd64`)?
- [ ] How do I stop hard-coding the access/secret keys (AWS CLI, env vars)?
- [ ] Which providers are official vs community? Which must go into `required_providers`?
- [ ] After going back to the latest Terraform: which blocks must be removed or changed (`required_version`, provider `version`)?
- [ ] Why is the old AWS provider still being used? (lock file) How do I refresh it?
- [ ] Do I get warnings? Which argument is deprecated and what replaces it (check docs)?
- [ ] Did I destroy everything?

### Challenge 2 checklist

- [ ] Does `terraform init` / `validate` pass? If not: syntax (braces) -> binary version -> provider version -> lock file.
- [ ] Can I upgrade the provider without deleting the lock file? (`init -upgrade`)
- [ ] Run `terraform fmt`.
- [ ] Which values repeat or are hard-coded? Which become variables and which values go into `terraform.tfvars`?
- [ ] Which tags (Name, Team, Environment) and which `description`s add identification value?
- [ ] How can I set `splunk` to 8089 without changing any code file or tfvars? (`-var`, env var, ...) Where is it in the precedence list?
- [ ] Is the resource label sensible? What happens to state if I rename it?
- [ ] Is each concern in its own file (`providers.tf`, `variables.tf`, `sg.tf`, `eip.tf`)? Does `terraform plan` show no changes after splitting?

### Challenge 3 checklist

- [ ] Which loop construct accepts a map, and keeps stable identity per entry? (`for_each`)
- [ ] How do I read the instance type and AMI from the current entry? (`each.value.<attr>`)
- [ ] What addresses will the instances have? (`aws_instance.web["instance1"]`)
- [ ] If I remove a key, what will `plan` show? If I add one? If I change a value?
- [ ] Did I destroy the instances afterwards?

### Challenge 4 checklist

- [ ] Which requirements are "show" (output) and which are "create" (resource)?
- [ ] Which data source lists IAM users? Which attribute holds the names?
- [ ] Which function counts elements in a list?
- [ ] Which data source gives me the AWS account ID? Which attribute?
- [ ] How do I embed an expression in a string? (`${...}`)
- [ ] Do I reference data sources with `data.` prefix?
- [ ] Did I `apply` (not just plan) so outputs are saved in state?

---

## Quick revision Q&A

**1. Why does `terraform init` fail on the Challenge 1 starter code when you use the latest Terraform?**
Because `terraform { required_version = "0.12.31" }` locks the code to exactly that Terraform version; newer binaries report "Unsupported Terraform core version".

**2. Where can you download an older Terraform binary, and which archive for macOS?**
From the HashiCorp releases archive (`releases.hashicorp.com/terraform`), which keeps versions back to 0.1.0. For macOS use the `darwin_amd64` zip (Windows: `windows_amd64`).

**3. How did the instructor remove the hard-coded AWS credentials?**
He deleted `access_key`/`secret_key` from the provider block and ran `aws configure` with a new access key for his IAM user; the AWS provider then used the CLI credentials.

**4. Why did `provider "digitalocean" {}` stop working on the latest Terraform, and what was the fix?**
Non-HashiCorp providers must be declared in `required_providers` with a `source` (`digitalocean/digitalocean`); without it `init` fails with "Failed to query available provider packages".

**5. After removing `version = "~> 2.54"` from the AWS provider, `init` still used the old provider. Why?**
`.terraform.lock.hcl` pinned the old version. Delete the lock file (Challenge 1) or, when deletion is forbidden, run `terraform init -upgrade` (Challenge 2).

**6. What fixes the deprecation warning on `aws_eip`?**
Replace `vpc = true` with `domain = "vpc"` (as in the current provider docs).

**7. In Challenge 2 why did `domain = "vpc"` fail validation even though the docs show it?**
The lock file forced AWS provider 2.70.4, which predates that argument. Run `terraform init -upgrade` (5.17.0 in the video) and the lock file is rewritten.

**8. What was wrong with the `egress` block in the Challenge 2 starter file?**
The security group's closing brace was placed before it, so `egress` was outside the resource ("Blocks of type egress are not expected here").

**9. How can you change variable `splunk` from 8088 to 8089 without editing any `.tf` or `.tfvars` file?**
Use a higher-precedence source, e.g. `terraform apply -var "splunk=8089"` (`-var`/`-var-file` are at the end of the precedence list; an environment variable `TF_VAR_splunk` also works, as extra context).

**10. Why split code into `providers.tf`, `variables.tf`, `sg.tf`, `eip.tf`? Does it change the infrastructure?**
For readability and easy maintenance. No effect on infrastructure: Terraform merges all `.tf` files in the directory, so `terraform apply` reports no changes after the split.

**11. Why did renaming the security group's local resource name cause "1 to add, 1 to destroy"?**
The resource address changed, so Terraform sees the old address as removed and the new one as added. The first apply failed with "already exists" after destroy; simply re-running `terraform apply` succeeded.

**12. How does `for_each` meet both requirements of Challenge 3?**
`for_each = var.instance_config` creates one `aws_instance.web["<key>"]` per map entry using `each.value.ami` and `each.value.instance_type`. Removing a key makes Terraform destroy that exact instance; adding a key creates a new one; changing values modifies in place.

**13. Which data sources and function solve Challenge 4?**
`aws_iam_users` (attribute `names`), `aws_caller_identity` (attribute `account_id`), and the collection function `length()`; results are shown with `output` blocks and the user name is built with `"admin-user-${data.aws_caller_identity.current.account_id}"`.
