# 01 — Infrastructure as Code and Terraform Introduction

> **Exam domain(s):** 1 (Infrastructure as Code with Terraform), 2 (Terraform fundamentals; installation, providers overview, HCL)   **Source:** lesson 1 (lectures 1, 2, 4, 7, 8), lesson 2 (lecture 10), lesson 3 (lectures 23–25, 28), lesson 4 (lectures 38–39)   **Time:** ~4 h

## What you will learn

- Why Terraform matters, how the Terraform Associate exam is structured, and where the official blueprint lives.
- The difference between creating infrastructure **manually** and with **automation**, and why repeatable tasks should be automated.
- The definition of **Infrastructure as Code (IaC)** and its benefits (the classic four, plus extras).
- The two families of IaC tools, **infrastructure orchestration** vs **configuration management**, and how they work together.
- How to **choose an IaC tool** with a four-question framework, including the two worked use cases (CloudFormation vs Terraform).
- What Terraform is: its architecture (Terraform core + providers + state), what it does when you run it, and how it differs from CloudFormation.
- How to **install Terraform** on macOS, Linux and Windows, why `PATH` matters, and how to verify the install.
- The building blocks of **HCL**: blocks, labels, arguments, expressions, resource type vs local name.
- How to write, run and change your **first configuration** (an EC2 instance) and destroy it.

---

## 🧠 Pre-concept: the problem Terraform solves

Imagine your company needs three servers, a database, a load balancer and a firewall. You log in to the AWS console and click through every screen. Then:

- A teammate needs the same set-up for testing. They click through the screens again and forget one setting.
- Six months later nobody remembers exactly how production was built.
- A disaster destroys the environment. Rebuilding takes days of clicking.
- Something breaks after a change and nobody knows who changed what.

Doing infrastructure by hand ("ClickOps") is slow, inconsistent and undocumented.

**Analogy.** Clicking through the console is cooking from memory: the result varies with the cook and the day. Infrastructure as Code is a **written recipe**: anyone can follow it, it can be reviewed and improved, and the dish comes out the same every time. Terraform is a robot chef that reads the recipe, checks what is already in the kitchen, and buys or throws away only what is needed.

If you are new to terminals, `PATH`, JSON/YAML or AWS basics, read [00 — Prerequisites](00-prerequisites.md) first.

---

## 1. Why Terraform is worth learning

### 1.1 It is expected knowledge across many roles (lesson 1, lecture 1)

Job openings in **DevOps, Cloud Engineering, Automation Engineering, SRE, Security Engineering and even Network Engineering** ask for Terraform. The instructor tells of a senior network engineer (CCNA/CCNP type) who assumed Terraform was "a DevOps thing" and was nonetheless asked Terraform questions in almost every interview.

Postings the instructor showed:

| Company | Role | Terraform expectation |
|---|---|---|
| Netflix | Site Reliability Engineer | infrastructure-as-code tool like Terraform |
| Nvidia | Principal Network Architect | alongside BGP, VPN etc., an "automated configuration management system" including Terraform |
| (ML company) | ML Platform Engineer | Terraform expected |
| Apple | Senior Software Engineer | Terraform expected |

Takeaway: Terraform is expected even in roles that are not traditionally "infrastructure" roles.

### 1.2 The instructor's story: 100+ AWS accounts

- The organisation decided to store **credit/debit card data**, which needs extensive compliance work such as **PCI DSS**.
- To prepare for audit they had to implement **AWS hardening guidelines**. The popular reference is the **CIS Benchmark for AWS**: a PDF of hundreds of pages of controls (the foundations benchmark shown was about 277 pages), each with a rationale, remediation steps and audit steps. Example controls: "ensure no root user account access key exists", "ensure MFA is enabled".
- **The problem:** hardening one AWS account by hand took **2–3 days**. Fine for 1–2 accounts, but the organisation grew to 10, 20, 50 and eventually **more than 100 accounts**; each new account arrived with root credentials and the instruction "harden it first, then use it". Manually that is months of work.
- **The solution:** write the hardening rules **once as Terraform code** (rules for AWS Config, GuardDuty, IAM and so on) and **run the same code against every account**. With 100 or 1000 accounts the only human job is to author the rules.

### 1.3 The core idea of Terraform

> **Terraform lets us write reusable code that deploys an identical set of infrastructure resources in a repeatable fashion.**

```text
              ┌── Account 1   (identical result)
 Terraform ───┼── Account 2   (identical result)
 code (rules) ├── Account 3   (identical result)
              └── ... Account 99, 100, 1000
```

### 1.4 The first demo: `terraform apply`

The instructor's first demo is a folder with two Terraform files, pretending to be the "hardening rules":

| File | What it defines |
|---|---|
| virtual-machine file | a simple EC2 instance named `automated VM` |
| firewall file | a security group allowing inbound **port 22** and **port 443** |

He runs one command:

```bash
terraform apply
```

1. Terraform prompts for **confirmation** (`Do you want to perform these actions?`).
2. He types `yes`.
3. Terraform creates the resources.
4. In the AWS console (after refreshing) there is a new VM called **automated VM**, and a security group with two inbound rules (22 and 443). Everything, name and rules, came from the configuration.

Point: it could be 1 rule or 100 rules; once written, Terraform deploys them. You will rebuild this demo yourself in [Lab 2](#lab-2--the-lecture-1-demo-vm--firewall-from-code).

### 1.5 Providers: the reason for Terraform's popularity

Terraform is **not limited to AWS**. It supports **thousands of providers**: AWS, Azure, GCP, Kubernetes, Alibaba, Oracle, Cisco, Docker, Active Directory, Helm, Nomad, Akamai (a popular CDN), VMware vSphere and many partner and community providers. (The instructor showed more than 116 pages of providers on the registry; Lecture 28 quotes "3000+".)

> **Key insight:** once you learn Terraform's **core concepts**, you can write professional-level Terraform for **any** provider. Only the provider-specific resource types differ. A VM created in AWS today can be created in Azure, GCP or DigitalOcean tomorrow using the same core knowledge.

This is also why the exam is provider-agnostic and why AWS here is only the vehicle for learning ([00](00-prerequisites.md), "four building blocks").

### 1.6 The certification

Because Terraform is considered **the de facto IaC tool** of the industry, HashiCorp created the **HashiCorp Certified: Terraform Associate** certification to validate knowledge of **core Terraform concepts**. Employers can infer you know the fundamentals, and you can implement Terraform for your organisation. The instructor calls the Associate "not a very difficult exam; easy to pass". This course starts from scratch (no Terraform knowledge assumed): core concepts practically first, then advanced topics, covering **all** exam objectives.

---

## 2. The exam: format, blueprint, how this course maps to it

### 2.1 Facts (lesson 1, lecture 2)

| Item | Terraform **Associate** | Terraform **Professional** |
|---|---|---|
| Format | **Multiple choice** | **Fully lab-based** (practical scenarios; some multiple choice, but you must pass the labs) |
| Duration | **1 hour** | **4 hours** |
| Price (as quoted in the lecture) | **70.50 USD** | not stated |
| Difficulty | easier, entry level | "difficult" |
| Style | knowledge of core concepts | solve a set of scenarios; you must solve them all |

Long-term path: take the Associate first; if you enjoy Terraform, consider the Professional later (the instructor has a separate course for it).

> **Up to date (TF 1.12):** this material targets the Associate version **004**, which is based on Terraform 1.12 (the older 003 exam was retired). Question types can include single-answer multiple choice, multiple-answer, true/false and text-match. Prices, number of questions (historically about 57), duration and objectives change over time: **always confirm on HashiCorp's official certification page before booking** (the lecture's "70.50 USD" and "1 hour" are what was recorded; the 1-hour length and the ~57-question range have been stable).

### 2.2 Where to find the blueprint

On HashiCorp's website, the **Infrastructure Automation** certifications page covers both Associate and Professional. The *HashiCorp Certified: Terraform Associate* page lists the **exam objectives** (everything you must know) and an **exam details** page. Use the objectives as a checklist.

The objectives are grouped into domains; the 004 outline is approximately:

| # | Domain (approximate wording) | Where in these notes |
|---|---|---|
| 1 | Infrastructure as Code (IaC) with Terraform | this chapter |
| 2 | Terraform fundamentals (providers, state, versions) | this chapter, [02](02-providers.md), [04](04-state-basics.md) |
| 3 | Core Terraform workflow (init, plan, apply, destroy, fmt, validate) | [03](03-core-workflow.md) |
| 4 | Terraform configuration (resources, variables, outputs, expressions, functions, validation, sensitive data) | [05](05-resources-data-dependencies.md), [06](06-variables-outputs-locals.md), [07](07-types-loops-functions.md), [08](08-lifecycle-conditions-sensitive.md) |
| 5 | Terraform modules | [09](09-modules.md) |
| 6 | Terraform state management (backends, locking, workspaces) | [04](04-state-basics.md), [10](10-backends-locking-drift.md) |
| 7 | Maintain infrastructure with Terraform (import, state commands, logging) | [11](11-import-state-cli-logging.md) |
| 8 | HCP Terraform capabilities | [12](12-hcp-terraform.md) |

(The exact domain names and numbering are paraphrased here; check the official page for the current wording.)

### 2.3 Course order vs blueprint order

The course does **not** follow blueprint order (1a, 1b, 1c, 2a...). Because it assumes no prior knowledge, the instructor orders topics for step-by-step learning. **All** blueprint topics are still covered, and the course is updated when HashiCorp changes the objectives. These chapters follow the course order; [13 — Exam prep](13-exam-prep.md) re-organises everything by domain.

### 2.4 Course design and resources (lesson 1, lecture 4)

Instructors usually pick one of two approaches:

| Approach | What it does | Result |
|---|---|---|
| 1. Theory + basic demos | cover exam theory with simple demos | shorter course |
| 2. Everything practical and detailed | practical coverage of every objective, caveats and real-world challenges | longer, deeper (this course) |

The resources (GitHub repo, "Central PPT notes" PDF, Discord) are listed in [00](00-prerequisites.md#part-8--how-to-use-this-course-material). The instructor's rules: separate folder per practical, always destroy ([00](00-prerequisites.md)).

**Why AWS for the labs:** Terraform supports Azure, AWS, GCP, Kubernetes and more; the course needs one for demos and picks AWS, using only a simple VM, a simple IAM user, simple firewall rules and an Elastic IP. Terraform structure and concepts are the same regardless of provider; only basic knowledge of "a VM and a firewall rule" is required. Many students come from Azure/GCP backgrounds, finish the course and apply it there.

🎯 **Exam focus:** the exam tests *Terraform* concepts, not AWS service knowledge.

---

## 3. Manual vs automated infrastructure

### 3.1 Two ways to manage infrastructure (lesson 1, lecture 7)

1. **Manual:** click through the console/GUI or type commands by hand.
2. **Automation:** how mature medium and large organisations manage infrastructure.

### 3.2 The instructor's backup example

Requirement: take a database backup **every day at 10:00 PM** and store it in Amazon S3 with a timestamped name (`backup-01-01-2024`, `backup-02-01-2024`, ...).

- **Manual phase:** because of other priorities (and because untested code should not go to production) he did it by hand every night, weekends included. Wasteful and error-prone.
- **Automated phase:** he later wrote a small **Python** script that takes the backup, adds the timestamp, uploads to S3, scheduled with **cron** at 10 PM.

> **Lesson: if a task must be done repeatedly, automate it.** The tool depends on the task: Python for the backup; Ansible, CloudFormation or Terraform for other tasks.

### 3.3 Multiple environments

One service needs a **virtual machine, a database, object storage (S3) and an AWS user**, with the same configuration in each environment:

```text
Development   ->   Staging   ->   Production
(VM+DB+S3+user)   (same set)      (same set)
```

A medium or large organisation can have **hundreds** of such services.

| | Manual | Automated (IaC) |
|---|---|---|
| Replicating dev to staging six months later | you forget the configuration and inspect resources one by one | the code exists; **deploy it to the new environment** |
| Misconfiguration risk | high; the app does not work in staging | low, same code |
| Time | very time-consuming | minutes |

### 3.4 Definition

> **Infrastructure as Code (IaC)** is the managing and provisioning of infrastructure through **code** instead of through manual processes.

- Manual: log in to AWS and create a server by hand.
- IaC: write code; the IaC tool deploys the infrastructure for you.
- The **syntax depends on the tool**. The instructor showed the same "create an AWS server" in **CloudFormation** and **Terraform**: different code, same idea.

The same EC2 instance in both tools:

```yaml
# AWS CloudFormation (YAML template)
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyServer:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abcdef1234567890      # placeholder
      InstanceType: t2.micro
```

```hcl
# Terraform (HCL)
resource "aws_instance" "myserver" {
  ami           = "ami-0abcdef1234567890"   # placeholder
  instance_type = "t2.micro"
}
```

### 3.5 Demo (concept only): manual vs CloudFormation

1. **Manual way (avoid):** console → *Launch instance* → choose OS and many options.
2. **IaC with CloudFormation:** create a **stack** → "Upload a template file" → upload a local template defining a basic EC2 server → name the stack (`cf-ec2`) → Next → Submit. CloudFormation reads the template, creates the EC2 instance, and it goes to *running*.

The instructor stressed this is a concept demo; you are not expected to replicate it. He notes that in most organisations he has seen, Terraform is preferred, but that does **not** mean CloudFormation is bad: it is AWS-specific and has its own advantages.

---

## 4. IaC: benefits and key properties

### 4.1 The classic four (exam material)

| Benefit | Explanation |
|---|---|
| **Speed of infrastructure management** | writing the code takes time once; afterwards you can deploy e.g. 10 services into 100, 200, 300 AWS accounts repeatedly |
| **Low risk of human error** | no more forgetting one option and breaking the application |
| **Version control** | code lives in Git: pull requests, approvals, history, rollback, "who changed what" |
| **Easy collaboration between teams** | several people work on the same infrastructure code in a shared repository |

### 4.2 Other benefits commonly listed

(Extra context, consistent with the lesson.)

- **Consistency / repeatability**: the same code yields the same result.
- **Documentation**: the code is the documentation of what exists.
- **Cost control**: dev/test environments can be torn down with one command (`terraform destroy`).
- **Automation of dependencies and order**: Terraform works out what to create first ([05](05-resources-data-dependencies.md)).

🎯 **Exam focus:** if a question asks you to *pick the benefits of IaC*, the answers are about repeatability, automation, versioning/collaboration and reduced error. A wrong answer would claim IaC "removes the need for credentials" or "makes infrastructure free".

### 4.3 Imperative vs declarative

| | Imperative | Declarative |
|---|---|---|
| You write | the **steps** ("launch, then attach, then...") | the **end state** ("there should be one server like this") |
| Tool decides | nothing, it follows your script | **how** to reach the state |
| Re-run behaviour | may duplicate things unless you guard it | no duplicates; only the difference is applied |
| Examples | shell/Python scripts, `aws` CLI | Terraform, CloudFormation |

Terraform is **declarative**.

---

## 5. Choosing the right IaC tool (lesson 1, lecture 8)

### 5.1 The landscape and two categories

Once you decide on IaC you must choose a tool: **Terraform, CloudFormation, Heat, Ansible, SaltStack, Chef, Puppet**, and others.

| Category | Primary purpose | Examples |
|---|---|---|
| **Infrastructure orchestration** | **create and manage infrastructure** (raw infrastructure) | **Terraform, CloudFormation**, Heat (OpenStack's orchestration tool: extra context) |
| **Configuration management** | **maintain the desired configuration inside systems/servers** | **Ansible, Chef, Puppet**, SaltStack (extra context) |

**Rule of thumb:** to adopt IaC, **prefer orchestration tools**. Configuration-management tools *can* create infrastructure too (an Ansible module can create an EC2 instance) but that is only their secondary purpose.

### 5.2 Configuration management in more detail

Used *after* servers exist, to configure what is **inside** them: install and configure the application, an antivirus or IPS agent, tweak settings. Example: Ansible managing a fleet of servers. Ansible has modules to create EC2, but that is not its main strength.

### 5.3 Orchestration in more detail

Aim: create and manage the infrastructure itself. Example requirement: "Create **three servers with 4 GB RAM and 2 vCPUs**, each with a firewall rule allowing **SSH from office IPs**." That is **raw infrastructure**: it does *not* cover what is installed inside the servers (such as antivirus). Use Terraform or CloudFormation.

### 5.4 Friends, not rivals

Larger organisations combine them:

```text
1. Terraform (orchestration)   -> creates the EC2 instance (raw infrastructure)
2. Terraform notifies Ansible  (configuration management)
3. Ansible logs in to the server via SSH
4. Ansible installs/configures the application or antivirus (desired state inside the server)
```

- The IaC tool is **not** the right place to manage the desired state *inside* servers.
- Not every IaC tool integrates equally well with config management. Terraform works well with this set-up. (Terraform's built-in hook for running things on a server, the *provisioner*, is covered in [05](05-resources-data-dependencies.md); HashiCorp itself recommends using config-management tools or pre-built images instead of provisioners where possible.)

### 5.5 Four questions for choosing a tool

1. Will your infrastructure be **vendor-specific** in the long term? (e.g. only AWS for 10 or 25 years)
2. Are you planning a **multi-cloud or hybrid-cloud** infrastructure? (part in AWS, part in your own data centre)
3. How well should the tool **integrate with configuration-management** tools such as Ansible or Puppet?
4. **Price and support** of the tool.

### 5.6 Worked use case 1 → CloudFormation

Requirements:

- the organisation will be on **AWS for the next 25 years**;
- **official support**: someone who can read your code and help diagnose an EC2 deployment failure;
- a **graphical interface with automatic code generation**.

**Answer: CloudFormation.** Its **Designer** lets you drag resources (e.g. an *EC2 Instance*, a *Security Group*) and connect them; the template is generated automatically. With an AWS Support subscription you can ask AWS to read your template and help find the issue. (The instructor's side note: in larger organisations people usually write the code by hand rather than using the GUI, but *for these requirements* CloudFormation is the perfect fit.)

> **Up to date:** AWS has since replaced CloudFormation Designer with **Infrastructure Composer** (the visual designer). The idea is the same.

### 5.7 Worked use case 2 → Terraform

Requirements:

- **hybrid solution:** **VMware** on-premises plus **AWS, Azure and GCP**;
- **official support** when the tool has bugs or does not behave per documentation (larger organisations want vendor support, not just community help).

**Answer: Terraform.** It has providers for AWS, Azure, GCP and **VMware** (the instructor showed the official **vSphere** provider). It is maintained by **HashiCorp**, which offers an official support portal (ticketing and **SLAs for enterprises**) and makes other products such as **Vault** and **Consul**. CloudFormation is AWS-only, so it cannot meet requirement 1.

### 5.8 Decision summary

| Situation | Better choice |
|---|---|
| Only AWS long term, want AWS-backed support, want a GUI/designer | **CloudFormation** |
| Multi-cloud / hybrid (AWS + Azure + GCP + VMware), want vendor support | **Terraform** |
| Need to configure software *inside* servers after creation | **Configuration management** (Ansible, Chef, Puppet), triggered after Terraform creates the servers |
| Create/manage raw infrastructure (VMs, networks, firewall rules) | **Infrastructure orchestration** (Terraform, CloudFormation) |

Other tools you may meet (extra context, not in the lesson): Azure **Bicep/ARM**, Google **Deployment Manager**, **Pulumi** and the AWS **CDK** (infrastructure in general-purpose programming languages), and **OpenTofu** (a community fork of Terraform created after HashiCorp's 2023 licence change to the Business Source License).

🎯 **Exam focus:** know the two categories and which tools belong to each; Terraform = **cloud-agnostic, multi-provider, HashiCorp support**; CloudFormation = **AWS-specific**; orchestration + configuration management are **complementary**.

---

## 6. What Terraform is

- Made by **HashiCorp** (also the makers of Vault, Consul, Nomad, Packer, Vagrant). HashiCorp is now part of IBM (extra context).
- A **command-line tool**: a single executable named `terraform`.
- You write **HCL** files describing the infrastructure you want. Terraform calls the target platform's **APIs** to make reality match the files.
- **Cloud-agnostic / multi-provider:** one tool and one workflow for AWS, Azure, GCP, Kubernetes, GitHub, Datadog and thousands more.
- **Declarative**: you describe the end state.
- Uses a **state file** to remember what it manages ([04](04-state-basics.md)).
- Reads the **dependencies** between resources and creates them in the right order, in parallel where possible.

> **Up to date (TF 1.12):** since version 1.6 (August 2023) Terraform's source code is under the **Business Source License (BUSL)**, no longer an OSI "open source" licence; it remains free to download and use. The fork **OpenTofu** (Linux Foundation) exists as an open-source alternative. The exam is about HashiCorp Terraform.

### 6.1 The three editions

| Edition | What it is | Chapter |
|---|---|---|
| **Terraform CLI** (the free binary) | what you install and use in this chapter | all |
| **HCP Terraform** (HashiCorp Cloud Platform; formerly "Terraform Cloud") | hosted service: remote state, remote runs, teams, policies | [12](12-hcp-terraform.md) |
| **Terraform Enterprise** | self-hosted version of the same platform | [12](12-hcp-terraform.md) |

### 6.2 Terraform vs CloudFormation

| | Terraform | CloudFormation |
|---|---|---|
| Scope | many providers (AWS, Azure, GCP, VMware, GitHub...) | AWS only |
| Language | HCL (also JSON) | YAML or JSON |
| State | a state file that **you** store (local, S3, HCP Terraform...) | managed by AWS (as stacks) |
| Support | HashiCorp support portal | AWS Support |
| GUI design | no built-in designer | Designer / Infrastructure Composer |
| Typical fit | multi-cloud / hybrid, mixed SaaS | AWS-only organisations |

### 6.3 Terraform vs scripting

Terraform is not a general scripting language. It does **not** run your steps in order; it builds a graph of resources and their dependencies and works out an order. That is the key behaviour the exam wants you to understand ([05](05-resources-data-dependencies.md)).

---

## 7. Terraform architecture

Terraform is built from a few cooperating pieces:

```text
 ┌──────────────────────┐
 │ Your configuration   │   *.tf files (HCL)
 │ (desired state)      │
 └──────────┬───────────┘
            │ read
            ▼
 ┌──────────────────────┐        ┌───────────────────────┐
 │  TERRAFORM CORE      │◄──────►│  STATE (current state)│  terraform.tfstate
 │  (the `terraform`    │        │  local file or remote │
 │   binary)            │        │  backend              │
 │  - parses config     │        └───────────────────────┘
 │  - builds dependency │
 │    graph             │
 │  - computes the plan │
 │  - runs the plan     │
 └──────────┬───────────┘
            │ RPC (plugin protocol)
            ▼
 ┌──────────────────────┐   download once with `terraform init`
 │ PROVIDER PLUGINS     │◄──────────  Terraform Registry (registry.terraform.io)
 │ (separate programs:  │
 │  aws, azurerm,       │
 │  github, ...)        │
 └──────────┬───────────┘
            │ API calls (HTTPS)
            ▼
 ┌──────────────────────┐
 │ Target platforms     │   AWS, Azure, GCP, GitHub, Kubernetes, VMware...
 │ (real infrastructure)│
 └──────────────────────┘
```

| Component | Responsibility |
|---|---|
| **Terraform core** (the `terraform` binary) | reads the configuration and state; builds the resource dependency graph; compares desired state with current state to produce a **plan**; executes the plan by talking to providers; manages plugins and backends |
| **Provider plugins** | separate executables that know one platform's API. They authenticate, define the available **resource types** and **data sources** (for example `aws_instance`), and translate Terraform's requests into API calls (create, read, update, delete). Definition to memorise: *a provider is a plugin that lets Terraform manage an external API* |
| **State** | Terraform's record of what it manages and the attributes of those objects; the "current state" side of the comparison ([04](04-state-basics.md)) |
| **Configuration** | the `.tf` files: your **desired state** |
| **Registry** | public directory of providers and modules, from which `terraform init` downloads plugins |

What happens, in order, on a typical run:

1. **`terraform init`**: core reads which providers you need and **downloads** them from the registry into the hidden `.terraform/` folder (the AWS plugin is about 300 MB; Azure about 184 MB, per lesson 3). Run it again whenever you add a new provider.
2. **`terraform plan`**: core loads the config and state, asks the providers to read the real objects, builds the graph, and shows what would change.
3. **`terraform apply`**: core asks the providers to perform the changes (in dependency order, in parallel where possible) and writes the result to state.

Why this design matters:

- Because **providers are separate plugins**, new platforms are supported without changing Terraform core, and the core learned once works everywhere.
- Because the **core is provider-agnostic**, the workflow `init → plan → apply` is identical for AWS, Azure or GitHub.
- Because plugins are downloaded separately, they are versioned separately: *Terraform version* and *provider version* are two different things ([02](02-providers.md)).

🎯 **Exam focus:** "Terraform core vs providers": core = workflow/graph/state; providers = API translation. `terraform init` is what downloads providers (and modules, and configures the backend; see [03](03-core-workflow.md)).

---

## 8. Installing Terraform (lesson 2, lecture 10)

### 8.1 A single binary

A nice property of **HashiCorp products in general** (Terraform, Consul, Vault...): installation is trivial. **No installer is needed**: you download the `terraform` executable from the HashiCorp website and use it. The official page is `https://developer.hashicorp.com/terraform/install` (older name: `terraform.io/downloads`); it lists package-manager commands and binary downloads per OS.

Supported operating systems:

| OS | Supported |
|---|---|
| Windows | yes |
| macOS | yes |
| Linux | yes |
| FreeBSD | yes |
| OpenBSD | yes |
| Solaris | yes |

Demo from the lecture: the instructor's folder contains **just one file, `terraform.exe`**. Typing `terraform` lists all sub-commands, proving it is ready to use.

### 8.2 Options per OS

| OS | Package manager | Manual binary |
|---|---|---|
| macOS | **recommended** (two commands) | AMD64 (Intel) or ARM64 (Apple silicon) |
| Windows | optional (e.g. Chocolatey); the course uses the direct binary | 386 (32-bit) or AMD64 (64-bit) |
| Linux | yes; commands **differ by distro** (Ubuntu/Debian apt vs RHEL-based yum/dnf) | AMD64 etc.; **one common binary per version** works on Ubuntu, Red Hat, etc. |

### 8.3 Package manager vs manual binary, and `PATH`

- **Package manager** → nothing else required: it puts the binary where it belongs and configures everything.
- **Manual download** → *you* must make sure the folder containing the executable is on the **`PATH`** environment variable. This is not specific to Terraform: any manually downloaded binary needs it. See [00, Part 2](00-prerequisites.md#part-2--path-and-environment-variables) for the concept.

The instructor's Windows demo, step by step:

1. A Terraform binary sits on the **Desktop**; open a terminal and `cd` to the Desktop.
2. Run `terraform` → **works**, because the executable is in the current folder.
3. Change to a folder that does **not** contain it and run `terraform` → **fails**: the system cannot find the binary.
4. Therefore we set `PATH`: we tell the OS where the binary lives so it works from any folder.
5. Second proof: a folder `C:\binaries` holds the binary. Run `terraform` there → works. Move to the `C:\` root → **still works**, because `C:\binaries` is on `PATH`.
6. In **Environment Variables → `Path`**, the entry `C:\binaries` is present (alongside others such as an `nmap` folder). When you type `terraform`, the shell searches each directory in `PATH` in turn; if the binary is found in any of them it runs, otherwise you get "not found".
7. The same concept exists on Linux/macOS.

### 8.4 Step-by-step installs

Always copy the *current* commands from the official page, because they change. These are the standard flows.

**macOS (Homebrew), the "two commands":**

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

No `PATH` set-up needed. To update later: `brew update && brew upgrade hashicorp/tap/terraform`.

**Ubuntu / Debian (apt):**

```bash
sudo apt update && sudo apt install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

**RHEL / CentOS / Fedora (extra context):**

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo yum -y install terraform
```

**macOS / Linux, manual binary:**

1. On the download page pick the build: **AMD64** (Intel/AMD) or **ARM64** (Apple silicon, ARM Linux).
2. Download the `.zip` and extract it: it contains the single `terraform` executable.
3. Move it to a folder already on `PATH`:

   ```bash
   unzip terraform_<version>_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

**Windows, manual binary (as demonstrated):**

1. Download the **AMD64** zip (or 386 for 32-bit).
2. Extract `terraform.exe`.
3. Place it in a folder of your choice, e.g. `C:\binaries`.
4. Add that folder to `Path`: search "Edit the system environment variables" → *Environment Variables* → select `Path` → *Edit* → *New* → `C:\binaries` → OK on all dialogs.
5. **Open a new terminal** (the open one will not see the change) and verify.
6. Alternative that handles `PATH` for you: Chocolatey `choco install terraform` (or `winget install Hashicorp.Terraform`).

### 8.5 Verify the installation

The instructor's check: type `terraform` and see the list of options. The more explicit check:

```bash
terraform -version        # or: terraform version
```

```text
Terraform v1.12.2
on darwin_arm64
```

(The version and platform on your machine will differ.) If a newer version exists, the command also prints `Your version of Terraform is out of date! The latest version is X.Y.Z.` Where the shell finds it:

```bash
which terraform           # macOS / Linux
where terraform           # Windows (cmd)
```

To test `PATH` the instructor's way, run `terraform` from a folder that does **not** contain the binary.

Optional extras (extra context): `terraform -install-autocomplete` enables tab-completion of sub-commands in bash/zsh; a version manager such as **tfenv** lets you switch between Terraform versions; the HashiCorp Terraform extension for VS Code adds syntax highlighting.

> **Up to date (TF 1.12):** exam scope is Terraform 1.12. Terraform follows semantic versioning (`1.12.2` = major.minor.patch) and a configuration can pin the CLI version it supports with `required_version` ([03](03-core-workflow.md)).

### 8.6 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `terraform` works in one folder, "not found" elsewhere | its folder is not on `PATH` | add the folder to `PATH` or move the binary into one already on `PATH` |
| Edited `PATH` but still "not found" | terminal opened before the change | open a **new** terminal |
| Binary will not start / wrong format | wrong architecture (ARM64 vs AMD64, 386 vs AMD64) | download the build matching your CPU/OS |
| Linux package commands fail | commands differ between Ubuntu/Debian and RHEL | use your distro's commands, or the common Linux binary |

🎯 **Exam focus (installation):** Terraform is a **single binary** distributed per OS/architecture; platforms to recall: **Windows, macOS, Linux, FreeBSD, OpenBSD, Solaris**; package managers configure everything, manual installs need `PATH`; "not found" outside its folder is a **PATH** problem, not a reason to reinstall.

---

## 9. HCL basics

Terraform configurations are written in **HCL (HashiCorp Configuration Language)**. HCL is a small, declarative language designed to be read and written by humans.

### 9.1 Files and folders

- Configuration files end in **`.tf`** (HCL) or **`.tf.json`** (JSON equivalent for machine-generated config). The **file name is free**; the **extension is not**.
- Terraform loads **every** `.tf` file in the working directory and treats them as one configuration; the order of files does not matter. Rules for load order, `.bak` tricks and splitting files are in [03](03-core-workflow.md).
- Run Terraform commands **from inside that folder**.

### 9.2 Syntax: blocks, arguments, expressions

```text
<BLOCK TYPE> "<LABEL 1>" "<LABEL 2>" {
  <ARGUMENT NAME> = <EXPRESSION>

  <NESTED BLOCK TYPE> {
    <ARGUMENT NAME> = <EXPRESSION>
  }
}
```

A real example:

```hcl
resource "aws_instance" "myec2" {      # block type, then two labels
  ami           = "ami-0abcdef1234567890"   # argument: name = value
  instance_type = "t2.micro"

  root_block_device {                   # nested block (no '=' sign)
    volume_size = 10
  }

  tags = {                              # argument whose value is a map
    Name = "my first EC2"
  }
}
```

| Concept | Meaning |
|---|---|
| **Block** | a container with a *type* (`resource`, `provider`...), zero or more *labels*, and a body in `{ }` |
| **Label** | extra identifying strings after the block type (`"aws_instance" "myec2"`) |
| **Argument** | `name = value` pair inside a block, **an input you give** |
| **Nested block** | a block inside a block, with no `=` (`root_block_device { ... }`) |
| **Expression** | a value or something that computes one: a literal (`"t2.micro"`, `5`, `true`), a reference (`aws_instance.myec2.id`), or a function call |
| **Attribute** | a value that exists on a resource, **either an argument you set or one the provider computes** (e.g. `id`, `arn`, `public_ip`); read with `<type>.<name>.<attribute>` ([05](05-resources-data-dependencies.md)) |

Syntax rules:

- Strings use **double quotes**. Insert a value into a string with `${ ... }`: `"server-${var.env}"` (see [06](06-variables-outputs-locals.md)).
- Basic types: `string`, `number`, `bool`; collections: lists `["a", "b"]`, maps `{ key = "value" }` ([07](07-types-loops-functions.md)).
- Identifiers (block names, argument names) use letters, digits, `_` and `-` and cannot start with a digit.
- Separate arguments with **new lines** (not commas).
- Comments exist (`#`, `//`, `/* ... */`); details in [03](03-core-workflow.md).
- `terraform fmt` canonicalises layout (alignment, indentation) ([03](03-core-workflow.md)).

### 9.3 The main block types

| Block type | Purpose | Chapter |
|---|---|---|
| `terraform { }` | settings: required Terraform version, required providers, backend / `cloud` block | [03](03-core-workflow.md), [02](02-providers.md), [10](10-backends-locking-drift.md), [12](12-hcp-terraform.md) |
| `provider "name" { }` | configure a provider (region, credentials) | [02](02-providers.md) |
| `resource "type" "name" { }` | a piece of infrastructure to manage | [05](05-resources-data-dependencies.md) |
| `data "type" "name" { }` | read information about something that exists | [05](05-resources-data-dependencies.md) |
| `variable "name" { }` | an input | [06](06-variables-outputs-locals.md) |
| `output "name" { }` | a value to print/export | [06](06-variables-outputs-locals.md) |
| `locals { }` | named expressions | [06](06-variables-outputs-locals.md) |
| `module "name" { }` | call a reusable group of config | [09](09-modules.md) |
| `moved`, `import`, `removed` | refactoring and state adoption | [11](11-import-state-cli-logging.md) |
| `check { }` | continuous validation | [08](08-lifecycle-conditions-sensitive.md) |

In this chapter you only need `provider` and `resource`.

### 9.4 The resource block

A **resource block describes one or more infrastructure objects** associated with a provider.

```text
resource  "aws_instance"   "myec2"   { ...arguments... }
   │            │             │
 keyword   RESOURCE TYPE   LOCAL NAME
           (fixed by the    (your choice;
            provider)        unique per type)
```

| Part | Can you change it? | Notes |
|---|---|---|
| **Resource type** (`aws_instance`) | **No**, it is defined in the provider docs | the prefix identifies the provider: `aws_`, `azurerm_`, `github_`, `digitalocean_` |
| **Local name** (`myec2`) | **Yes**, any name | used to refer to the resource inside the configuration |

Examples of resource types: `aws_instance` (EC2), `aws_alb` (load balancer), `aws_iam_user` (IAM user), `digitalocean_droplet`, `github_repository`.

> **The combination of resource type + local name is the resource's identifier and must be unique within the module.** `aws_instance.myec2` is how you refer to it everywhere else (and how Terraform labels it in the plan and the state).

Demo from lecture 28: two blocks with the same type and the same name:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}

resource "aws_instance" "myec2" {      # duplicate!
  ami           = "ami-123"
  instance_type = "t3.micro"
}
```

`terraform plan` (or `validate`) fails:

```text
Error: Duplicate resource "aws_instance" configuration

  on first_ec2.tf line 13:
  13: resource "aws_instance" "myec2" {

A aws_instance resource named "myec2" was already declared at first_ec2.tf:8,1-30.
Resource names must be unique per type in each module.
```

(Exact wording and line numbers vary.) Giving the second block a different local name (say `myec2b`) would fix it and make Terraform manage two instances.

### 9.5 The provider block (preview)

```hcl
provider "aws" {
  region = "us-east-1"
}
```

The label (`"aws"`) is the provider name and changes per platform (`"github"`, `"azurerm"`...). The block carries what is shared by all resources of that provider: **region and credentials**. Full treatment in [02](02-providers.md).

**Provider vs resource, the lasting insight:** today's resource is a VM; tomorrow it may be a database. The **resource block changes, but the provider block stays the same** as long as you work with the same platform, because the provider holds the authentication and region.

```text
        ┌──────────────────────┐
        │ first_ec2.tf         │
        │  provider "aws"      │  <- stays the same (auth + region)
        │  resource  ...       │  <- changes with what you build
        └──────────────────────┘
```

---

## 10. Authentication before your first resource

Before Terraform can create anything it must prove who it is to the platform (full explanation, the IAM user and the access keys are in [00, Part 5](00-prerequisites.md#53-iam-users-authentication-authorization)). Quick recap:

- **Authentication** = who are you; **authorization** = what may you do. Valid credentials alone are not enough: without the permission, the call fails at the authorization stage.
- The credential type is **provider-specific** (AWS: access key + secret key; GitHub: personal access token; Kubernetes: kubeconfig).
- Read the **Authentication** section of the provider's documentation first.
- Give Terraform only the permission it needs (least privilege). The course attaches `AdministratorAccess` to a learning-account user for simplicity.

How the lesson first passes credentials (lecture 25): directly inside the provider block.

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "PUT-YOUR-ACCESS-KEY-HERE"      # placeholder
  secret_key = "PUT-YOUR-SECRET-KEY-HERE"      # placeholder
}
```

⚠️ **Gotcha / best practice:** this is for the very first demo only. Hard-coded keys end up in Git and in the state/plan files. The next lecture of the course (lecture 32, [02](02-providers.md)) removes them in favour of the AWS CLI credentials file or environment variables. In this chapter's labs, run `aws configure` ([00](00-prerequisites.md)) and use a provider block with **only the region**.

---

## 11. Your first configuration: an EC2 instance (lesson 3, lecture 25)

### 11.1 Decisions when creating a VM

In AWS a virtual machine is an **EC2 instance**; in DigitalOcean it is a **droplet**; the concept is the same but the Terraform resource type changes.

| Decision | Meaning | In Terraform |
|---|---|---|
| **Region** | where the resource is created (`us-east-1` N. Virginia, `ap-southeast-1` Singapore...) | `region` in the `provider` block |
| **Configuration** | OS, CPU, memory | `ami` (OS image) and `instance_type` (CPU + memory) in the resource |

Do it once by hand first (see [00, section 5.7](00-prerequisites.md#57-ec2-virtual-machines)) so you understand what you are automating: choose AMI, instance type `t2.micro` (1 vCPU, 1 GiB, free-tier eligible), no key pair, launch, watch *pending → running*.

### 11.2 Project set-up

1. Create a folder (the instructor: `kplabs-terraform`) and open it in VS Code.
2. Create a file `first_ec2.tf`. The name is free, **the extension must be `.tf`**.
3. Open a terminal **in that folder**. Terraform commands must run there (a common beginner slip).

### 11.3 The code

The lecture's version (credentials as placeholders):

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

Recommended version for your labs (keys come from `aws configure`):

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"   # replace with a valid AMI for YOUR region
  instance_type = "t2.micro"
}
```

| Line | Meaning |
|---|---|
| `provider "aws" { ... }` | declares that this configuration uses the **AWS provider** (the instructor copied it from the AWS provider docs, Authentication → basic usage) |
| `region = "us-east-1"` | region for all resources |
| `resource "aws_instance" "myec2"` | resource **type** (fixed by the provider) and **local name** (your choice) |
| `ami = "ami-..."` | the OS image. **AMI IDs differ per region** for the same OS (the Singapore ID ended `...9F57`, N. Virginia's `...8778`). If you use a region other than `us-east-1`, replace it |
| `instance_type = "t2.micro"` | CPU/memory size; free-tier eligible |

⚠️ **Gotcha: the AMI.** The ID in the lecture was valid for Amazon Linux in `us-east-1` when recorded; AWS retires old images. Find a current ID in the console: EC2 → *Launch instance* → the AMI step shows an ID such as `ami-0...`. A cleaner option, previewed below, is to look the image up with a **data source** so you never hard-code an ID.

**Where did `aws_instance` come from?** In the AWS provider docs (`registry.terraform.io/providers/hashicorp/aws/latest/docs`), the left-hand menu lists AWS services (EC2...); under EC2 there are many resources (`aws_key_pair`, `aws_instance`...). Each resource page has **Example Usage** (a copy-paste start) and **Argument Reference** (every option, with required vs optional marked). You only need the mandatory arguments to start.

### 11.4 Run it

```bash
terraform init      # download the provider plugin
terraform plan      # preview
terraform apply     # create (asks for confirmation)
```

| Command | What happens in the demo |
|---|---|
| `terraform init` | downloads the AWS provider plugin into `.terraform/` (takes a minute or two; the plugin is large). Needed the first time and whenever you add a provider |
| `terraform plan` | shows `Terraform will create a new aws_instance` with the AMI and instance type. **Creates nothing.** Summary: `Plan: 1 to add, 0 to change, 0 to destroy.` |
| `terraform apply` | prints the plan again, waits for you to type `yes`, then creates the instance (about 37 seconds in the demo). Verify in the EC2 console (N. Virginia): one running `t2.micro` |

Expected output (abridged; versions and IDs differ):

```text
$ terraform init

Initializing the backend...

Initializing provider plugins...
- Finding latest version of hashicorp/aws...
- Installing hashicorp/aws v6.x.x...
- Installed hashicorp/aws v6.x.x (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!
```

```text
$ terraform plan

Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_instance.myec2 will be created
  + resource "aws_instance" "myec2" {
      + ami                          = "ami-00c39f71452c08778"
      + arn                          = (known after apply)
      + id                           = (known after apply)
      + instance_type                = "t2.micro"
      + public_ip                    = (known after apply)
      ... (many more attributes) ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

```text
$ terraform apply
...
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

aws_instance.myec2: Creating...
aws_instance.myec2: Still creating... [10s elapsed]
aws_instance.myec2: Creation complete after 37s [id=i-0123456789abcdef0]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

Reading the output: `+` = create, `~` = update in place, `-` = destroy, `-/+` = replace; `(known after apply)` marks values AWS decides (id, ARN, IP). Everything in the folder besides your `.tf` file was created by Terraform: `.terraform/` (plugins), `.terraform.lock.hcl`, and after the apply `terraform.tfstate` (never edit it; [04](04-state-basics.md)).

### 11.5 Changing a resource: add a tag

Add a `tags` argument (copied from the docs example) to give the instance a name:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"

  tags = {
    Name = "my first EC2"
  }
}
```

- `terraform plan` now reports **`1 to change`**: an *in-place update* of tags.

  ```text
    # aws_instance.myec2 will be updated in-place
    ~ resource "aws_instance" "myec2" {
          id   = "i-0123456789abcdef0"
        ~ tags = {
            + "Name" = "my first EC2"
          }
        ~ tags_all = {
            + "Name" = "my first EC2"
          }
          # (... unchanged attributes hidden)
      }

  Plan: 0 to add, 1 to change, 0 to destroy.
  ```

- `terraform apply` → `yes` → the console now shows the name.
- Remove the `tags` block and run `terraform apply` **directly** (the instructor deliberately skips `plan`) → apply prints the plan, asks for `yes`, and removes the tag; the Name disappears.

Key lesson: you only edit the *desired state* in the file; Terraform computes the difference and changes only what is needed (idempotent, declarative). `terraform plan` is the important command in production to see what will change; `apply` computes and shows the plan first anyway and waits for approval, so running `plan` separately is optional but a good habit.

⚠️ **Gotcha:** some arguments cannot be changed in place. Changing the `ami` of an existing instance, for example, forces Terraform to **destroy and recreate** it (`-/+`, "forces replacement"). Always read the plan.

### 11.6 Clean up

```bash
terraform destroy      # type yes
```

```text
Plan: 0 to add, 0 to change, 1 to destroy.
...
aws_instance.myec2: Destroying... [id=i-0123456789abcdef0]
aws_instance.myec2: Destruction complete after 30s

Destroy complete! Resources: 1 destroyed.
```

(`destroy -target`, `-auto-approve` and friends are in [03](03-core-workflow.md).)

### 11.7 Preview: don't hard-code the AMI

The course repo contains an `example.tf` (not discussed in the lectures) that looks up the latest Ubuntu image with a **data source** instead of hard-coding an AMI ID, which sidesteps the "AMI IDs differ per region" gotcha:

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

`data "aws_ami"` *reads* an existing image (the most recent matching one published by Canonical's account); `data.aws_ami.ubuntu.id` feeds its ID into the instance. (Extra context: Ubuntu 20.04 images are old; for a fresh lab use a newer name pattern such as `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*`.) Data sources are covered in [05](05-resources-data-dependencies.md); treat this as a preview.

---

## 🧪 Labs

> **Cost warning:** Labs 1–3 create paid-tier-eligible resources (`t2.micro`/`t3.micro` and a free security group). Always finish with `terraform destroy` and check the EC2 console in the right region.

### Lab 0 — Install and verify Terraform

1. Install Terraform with a package manager (macOS: the two `brew` commands) or manually (download, unzip, put on `PATH`).
2. Open a **new** terminal and run:

   ```bash
   terraform -version
   which terraform        # (Windows: where terraform)
   ```

3. `cd` to your home folder and run `terraform` (no arguments). Expected: the usage text with commands such as `init`, `validate`, `plan`, `apply`, `destroy`. If you get "not found" the `PATH` is wrong.
4. (Manual installs only) Reproduce the instructor's proof: run `terraform` from the folder with the binary, then from `~`/`C:\`. It must work from both.

### Lab 1 — First EC2 instance

Prerequisite: the pre-flight checklist in [00](00-prerequisites.md) passes (`aws sts get-caller-identity` works).

1. `mkdir -p ~/terraform-practicals/01-first-ec2 && cd ~/terraform-practicals/01-first-ec2`
2. Create `first_ec2.tf` with the provider-region-only version from section 11.3. Put a valid AMI for your region.
3. `terraform init` → expect "Terraform has been successfully initialized!". Look at the folder: `ls -a` shows `.terraform/` and `.terraform.lock.hcl`.
4. `terraform plan` → `Plan: 1 to add, 0 to change, 0 to destroy.`
5. `terraform apply` → `yes`. Check the EC2 console (correct region!).
6. Add the `tags` block (`Name = "my first EC2"`), `terraform plan` → `1 to change`; `apply`; confirm the Name in the console.
7. Remove the tags and run `terraform apply` straight away; confirm the Name disappears.
8. Change `instance_type` to `t3.micro` (stays free-tier eligible in many accounts); `plan` shows an in-place change or a stop/start update; read it, apply.
9. **Clean up:** `terraform destroy` → `yes`. Confirm in the console that the instance state is *terminated*.

### Lab 2 — The lecture 1 demo: VM + firewall from code

Goal: the "write rules once, deploy anywhere" demo, with two files in one folder `~/terraform-practicals/01-hardening-demo`.

`vm.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "automated_vm" {
  ami           = "ami-00c39f71452c08778"   # replace for your region
  instance_type = "t2.micro"

  tags = {
    Name = "automated VM"
  }
}
```

`firewall.tf`:

```hcl
resource "aws_security_group" "demo_firewall" {
  name        = "demo-firewall"
  description = "Managed from Terraform"
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.demo_firewall.id
  cidr_ipv4         = "0.0.0.0/0"          # lab only! never open SSH to the world in production
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.demo_firewall.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}
```

Steps: `terraform init` → `terraform plan` (expect `Plan: 4 to add`) → `terraform apply` → `yes`. In the console you see a VM `automated VM` and a security group `demo-firewall` with inbound 22 and 443. Notes:

- Terraform read **both** `.tf` files in the folder as one configuration.
- In this lab the security group is not yet *attached* to the VM; wiring resources together with attribute references is the topic of [05](05-resources-data-dependencies.md). (The reference `aws_security_group.demo_firewall.id` in the rule resources is exactly such a reference: it makes Terraform create the group **before** the rules.)
- Run `terraform destroy` → `yes` → `Destroy complete! Resources: 4 destroyed.`

### Lab 3 — Break it on purpose: duplicate names

1. In Lab 1's folder copy the `aws_instance` block so two blocks share the name `myec2`.
2. Run `terraform validate` (or `plan`). Read the **Duplicate resource** error.
3. Rename the second block `myec2b` and run `terraform plan`: now `Plan: 2 to add`. Do not apply; revert and destroy anything you created.

---

## 🎯 Exam focus (summary)

- **IaC definition:** managing and provisioning infrastructure through **code** instead of manual processes. Benefits: speed, low risk of human error, version control, easy collaboration (also: repeatability, documentation, automation).
- **Declarative** vs imperative; Terraform is declarative.
- **Two tool categories:** orchestration (Terraform, CloudFormation) vs configuration management (Ansible, Chef, Puppet). Prefer orchestration for provisioning; they are complementary.
- Terraform is **cloud-agnostic**, with thousands of providers; CloudFormation is **AWS-only**. Choose by vendor lock-in, multi-/hybrid cloud, config-management integration, price/support.
- **Architecture:** Terraform core (reads config, builds graph, plans) + provider plugins (talk to APIs) + state. A provider is *a plugin that lets Terraform manage an external API*. Providers are downloaded by `terraform init`.
- **Install:** single binary; Windows, macOS, Linux, FreeBSD, OpenBSD, Solaris; package manager sets `PATH`, manual install needs `PATH`.
- **HCL:** blocks, labels, arguments; resource = type (fixed) + local name (yours); type + name must be **unique**; file extension `.tf`, name arbitrary.
- **Workflow:** `init` → `plan` → `apply` (confirmation with `yes` unless `-auto-approve`) → `destroy`. `plan` never changes anything.
- Provider block stays the same across resource types; credentials are provider-specific; authentication is not authorization.
- Traps: AMI IDs are per region; hard-coded keys are for first demos only; Terraform commands must be run in the folder with the `.tf` files; exam is MCQ, 1 hour (Associate) vs lab-based 4 hours (Professional).

## Key takeaways

1. Terraform is the de facto IaC tool, expected across DevOps, SRE, cloud, security, networking and ML roles.
2. Core idea: write reusable code once and deploy an **identical** set of resources **repeatedly**.
3. Core concepts are provider-independent; AWS is only the vehicle in this course.
4. Repeatable tasks should be automated; manual infrastructure is slow, error-prone and hard to replicate.
5. **IaC** = managing and provisioning infrastructure through code instead of manual processes.
6. Pick orchestration tools (Terraform, CloudFormation) to create infrastructure and configuration-management tools (Ansible, Chef, Puppet) to configure inside servers; combine them.
7. AWS-only + AWS support + GUI → CloudFormation; multi-cloud/hybrid + vendor support → Terraform.
8. Terraform = core binary + provider plugins + state; `init` downloads providers.
9. Install = download a single binary (or use a package manager); fix "not found" with `PATH`.
10. A resource block is `resource "<type>" "<local name>" { arguments }`; type + local name is the unique identifier.
11. First workflow: `init`, `plan`, `apply`, edit and re-apply, `destroy`.

## Quick commands / syntax cheat-sheet

```bash
terraform                 # list sub-commands (is it installed?)
terraform -version        # installed version
terraform init            # download providers (run first, and after adding a provider)
terraform plan            # preview; creates nothing
terraform apply           # create/change; prompts for yes
terraform destroy         # delete everything in this folder's state
brew tap hashicorp/tap && brew install hashicorp/tap/terraform    # macOS install
which terraform           # where the shell finds it (Windows: where)
```

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-..."
  instance_type = "t2.micro"
  tags = {
    Name = "my first EC2"
  }
}
```

## ❓ Quiz

1. What is the instructor's one-sentence description of Terraform's core idea?
2. Why did the instructor's organisation adopt Terraform for AWS hardening?
3. What is the format, duration and (quoted) price of the Terraform Associate exam? How does the Professional exam differ?
4. Define Infrastructure as Code, and name four classic benefits.
5. Which of these are infrastructure-orchestration tools and which are configuration-management tools: Terraform, Ansible, CloudFormation, Chef, Puppet?
6. A company will use only AWS for 25 years, needs AWS-backed support and a GUI that generates code. Which tool fits? What if they run AWS, Azure, GCP and on-premises VMware and need vendor support?
7. Describe how Terraform and Ansible are typically used together.
8. In Terraform's architecture, which component builds the dependency graph and which one talks to AWS?
9. You run `terraform` in your Downloads folder and it works, but in your home folder you get "command not found". What is wrong and what are two fixes?
10. You added a folder to `PATH` but your open terminal still can't find `terraform`. Why?
11. Which command downloads provider plugins, and where are they stored?
12. In `resource "aws_instance" "web" { ... }`, which part is fixed by the provider and which part do you choose? What is the identifier of this resource?
13. You declare two `resource "aws_instance" "web"` blocks in the same folder. What happens?
14. You run `terraform plan` after adding `tags = { Name = "x" }` to an existing instance. What does the summary line say?
15. Does `terraform plan` create resources? Does `terraform apply` ask for confirmation by default?
16. You change `region` from `us-east-1` to `ap-southeast-1` and apply, and it fails with an invalid AMI. Why?
17. What file extension must Terraform configuration files have? Does the file name matter?
18. Why is it bad to leave `access_key`/`secret_key` inside the provider block?
19. True or false: the Terraform Associate exam tests detailed AWS service knowledge.

### Answers

1. Write reusable code that deploys an **identical** set of infrastructure resources in a **repeatable** fashion.
2. Hardening one AWS account (CIS Benchmark controls for PCI DSS) took 2–3 days by hand; with 100+ accounts that takes months. Terraform lets them write the rules once and apply them to every account.
3. Multiple choice, 1 hour, 70.50 USD (as quoted; verify on the official page). The Professional exam is lab-based, 4 hours, harder.
4. Managing and provisioning infrastructure through code instead of manual processes. Benefits: speed, low risk of human error, version control, easy collaboration (plus repeatability/documentation).
5. Orchestration: Terraform, CloudFormation. Configuration management: Ansible, Chef, Puppet.
6. CloudFormation (AWS-only, AWS Support, Designer GUI). For multi-cloud + VMware + vendor support: Terraform.
7. Terraform (orchestration) creates the servers; then a configuration-management tool such as Ansible logs in (e.g. via SSH) and installs/configures the software inside.
8. Terraform **core** builds the graph and plan; the **AWS provider plugin** makes the API calls.
9. The folder with the binary is not on `PATH`; it only works where the binary is. Fix: add that folder to `PATH`, or move the binary to a folder already on `PATH` (or install with a package manager).
10. The terminal was opened before the change; open a **new** terminal.
11. `terraform init`; stored in the hidden `.terraform/` folder of the working directory.
12. `aws_instance` (resource type) is fixed by the provider; `web` (local name) is your choice. Identifier: `aws_instance.web`.
13. Terraform errors with `Duplicate resource "aws_instance" configuration`; type + local name must be unique per module.
14. `Plan: 0 to add, 1 to change, 0 to destroy.` (an in-place update).
15. No, plan only previews. Yes, apply shows the plan and asks you to type `yes` (unless `-auto-approve`).
16. AMI IDs are **region-specific**; you must use an image ID that exists in the new region (or use a data source to look it up).
17. `.tf` (or `.tf.json`). The name is arbitrary (`first_ec2.tf`, `main.tf`, ...).
18. Keys can leak through Git, plan output or state; use `aws configure`/the shared credentials file or environment variables ([02](02-providers.md)).
19. **False.** It tests Terraform concepts; AWS is only the example platform.

## Glossary

| Term | Meaning |
|---|---|
| **Terraform** | HashiCorp's IaC tool: deploys and manages infrastructure from configuration files across many providers |
| **HashiCorp** | company behind Terraform, Vault, Consul, Nomad, Packer; provides support and certifications |
| **IaC** | managing and provisioning infrastructure through code instead of manual processes |
| **Orchestration** | tools that create/manage raw infrastructure (Terraform, CloudFormation) |
| **Configuration management** | tools that maintain configuration inside servers (Ansible, Chef, Puppet) |
| **CloudFormation** | AWS's own IaC service (AWS-only; templates in YAML/JSON) |
| **Multi-cloud / hybrid** | several cloud vendors / cloud plus on-premises (e.g. VMware) |
| **Declarative** | describe the desired end state; the tool computes the steps |
| **HCL** | HashiCorp Configuration Language, the language of `.tf` files |
| **Block / argument / attribute** | container with a type and labels / an input `name = value` / a value that exists on a resource |
| **Resource type / local name** | provider-defined kind (`aws_instance`) / your label (`myec2`); together unique |
| **Provider** | plugin that lets Terraform manage an external API |
| **Terraform core** | the `terraform` binary: config, graph, plan, state, plugin management |
| **Registry** | registry.terraform.io, public directory of providers and modules |
| **State** | Terraform's record of the infrastructure it manages |
| **AMI** | Amazon Machine Image: the OS image for an EC2 instance (region-specific ID) |
| **Blueprint / exam objectives** | official list of topics tested |
| **PATH** | environment variable listing folders searched for commands |
| **CIS Benchmark / PCI DSS** | AWS hardening guidelines / payment-card compliance standard (from the instructor's story) |
