# Lesson 01 — Infrastructure as Code and Terraform Intro

**Exam domain 1** · **Time:** 2 hours

## 🧠 Pre-concept: the problem Terraform solves

Imagine your company needs: 3 servers, 1 database, 1 load balancer, and a firewall. You click through the AWS console to build it. Then:

- A teammate needs the same setup for testing. They click through again and forget one setting.
- Six months later nobody remembers how it was built.
- A disaster destroys it. Rebuilding takes days.
- A change goes wrong and nobody knows who changed what.

Doing infrastructure by hand ("ClickOps") is slow, inconsistent, and undocumented.

## Infrastructure as Code (IaC)

**IaC means managing infrastructure (servers, networks, databases) by writing code files instead of clicking.** The files are stored in Git and run by a tool.

### Benefits (memorize these, the exam asks)

1. **Automation**: create hundreds of resources with one command
2. **Consistency / repeatability**: the same code gives the same result every time
3. **Version control**: history, code review, rollback, "who changed what"
4. **Documentation**: the code *is* the documentation
5. **Speed**: environments in minutes
6. **Reduced human error**
7. **Cost control**: easily tear down dev/test environments
8. **Collaboration**: teams review changes like any code

### Types of IaC tools

| Kind | Examples | Idea |
|---|---|---|
| Provisioning | **Terraform**, CloudFormation, Pulumi | Create and manage infrastructure |
| Configuration management | Ansible, Chef, Puppet | Configure software *inside* servers |

Terraform is mainly **provisioning**. Don't confuse the two on the exam.

## What is Terraform?

- Made by **HashiCorp**. Open-source CLI tool.
- You write **HCL** files describing the infrastructure you want.
- Terraform calls cloud **APIs** to make reality match your files.
- **Cloud-agnostic / multi-cloud**: one tool and one language for AWS, Azure, GCP, Kubernetes, GitHub, Datadog, and thousands more.
- **Declarative**: you describe the end state.
- Uses **state** to remember what it built.

### Terraform vs cloud-specific tools

- **CloudFormation** = AWS only (JSON/YAML). **ARM/Bicep** = Azure only.
- **Terraform** works across clouds with the same workflow.

🎯 **Exam:** "Which benefit does Terraform give over a cloud-specific tool?" → multi-cloud / one workflow across many providers.

## How Terraform works (architecture)

```
  Your .tf files ─┐
                  ├─► Terraform Core ──► Providers (plugins) ──► Cloud APIs (AWS, Azure...)
  State file ─────┘
```

- **Terraform Core** (the `terraform` binary): reads your config and state, builds a **dependency graph**, decides what must change, and orders the work.
- **Providers**: plugins that know how to talk to one specific platform's API (AWS provider, Azure provider...). Core doesn't know AWS. Providers do.
- **State**: Terraform's record of what it manages.

Providers are downloaded from the **Terraform Registry** (registry.terraform.io) when you run `terraform init`.

## Terraform's high-level workflow: Write → Plan → Apply

1. **Write** your configuration
2. **Plan**: Terraform shows what it *would* change
3. **Apply**: Terraform makes the changes

(There's also Init before everything and Destroy at the end. Lesson 03 covers each.)

## HCL syntax basics

Terraform files end in `.tf`. HCL is made of **blocks** and **arguments**.

```hcl
resource "local_file" "greeting" {     # block type, then two labels
  filename = "hello.txt"               # argument: name = value
  content  = "Hello, Terraform!"
}
```

- `resource` = block type
- `"local_file"` = first label: the **resource type** (which provider + what kind of thing)
- `"greeting"` = second label: **your name** for it (used to refer to it in code)
- Inside `{ }` are **arguments** (`name = value`)
- `#` or `//` start a comment. `/* ... */` is a multi-line comment.

### Value types

```hcl
name    = "web"          # string
count   = 3              # number
enabled = true           # bool
ports   = [80, 443]      # list
tags    = { env = "dev" } # map
```

### Common block types (you will meet them all)

| Block | Purpose |
|---|---|
| `terraform { }` | Settings: required Terraform version, required providers, backend |
| `provider "x" { }` | Configure a provider |
| `resource "type" "name" { }` | Create/manage something |
| `data "type" "name" { }` | Read existing info |
| `variable "x" { }` | Input |
| `output "x" { }` | Output |
| `locals { }` | Named expressions |
| `module "x" { }` | Reuse a group of config |

### File layout convention

Terraform loads **all `.tf` files in the folder** (the "root module") and merges them. File names are just convention:

```
main.tf        # resources
variables.tf   # variable blocks
outputs.tf     # output blocks
providers.tf   # terraform and provider blocks
terraform.tfvars  # variable values
```

⚠️ Terraform does **not** read subfolders automatically. Each folder is its own module.

## 🧪 Lab 1: Install Terraform and make your first resource

### Install on Windows (PowerShell)

```powershell
winget install Hashicorp.Terraform
```

Close and reopen PowerShell, then:

```powershell
terraform version
```

If that fails, see "Installing Terraform on Windows" in Lesson 00 (Chocolatey or manual PATH setup).

### Install on macOS

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform version
```

(Linux: follow the install page on developer.hashicorp.com.)

### First config

```bash
mkdir ~/tf-lab1      # Windows: mkdir C:\tf-labs\lab1
cd ~/tf-lab1         # Windows: cd C:\tf-labs\lab1
```

Create `main.tf`:

```hcl
resource "local_file" "greeting" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, Terraform!"
}
```

Run:

```bash
terraform init      # downloads the 'local' provider
terraform plan      # shows: 1 to add
terraform apply     # type 'yes'
cat hello.txt       # the file exists!
ls -a               # note .terraform/ and terraform.tfstate  (PowerShell: ls -Force)
```

Now change `content` to something else and run `terraform plan` again. Notice it says the file will be **replaced** or updated. Apply it. Finally:

```bash
terraform destroy   # hello.txt is deleted
```

You just used the declarative model: you never wrote "create file," only "this file should exist."

## 🎯 Exam focus

- Define IaC and list its benefits.
- Terraform is **declarative**, **cloud-agnostic**, uses **providers**, keeps **state**.
- Terraform is **not** a configuration-management tool like Ansible (it provisions).
- Providers are **plugins** distributed through the **registry**.
- Terraform is open-source, and **HCP Terraform** is the managed service (Lesson 12).

## ❓ Quiz

1. Name three benefits of IaC.
2. What's the job of Terraform Core vs a provider?
3. Is Terraform imperative or declarative?
4. Which files does Terraform read in a folder?
5. In `resource "aws_instance" "web" {}`, which part is the resource type and which is the local name?
6. Where do providers get downloaded from?

<details><summary>Answers</summary>

1. Automation, consistency, version control, speed, documentation, reduced error.
2. Core reads config/state, builds the graph and plans; providers talk to specific APIs.
3. Declarative.
4. All `*.tf` (and `*.tf.json`) files in the current directory.
5. Type = `aws_instance`; local name = `web`.
6. The Terraform Registry (by default), during `terraform init`.
</details>
