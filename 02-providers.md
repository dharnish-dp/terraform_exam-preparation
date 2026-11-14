# 02 — Providers: Plugins, Tiers, Authentication, Versioning and Multiple Configurations

> **Exam domain(s):** Understand Terraform's purpose and workflow (providers, `init`), Use Terraform outside of core workflow (provider installation, versioning, dependency lock file), Implement and maintain state (provider configuration)   **Source:** lesson 3, lectures 28–30, 32, 37; lesson 8, lectures 143 and 148; lesson 4 (Terraform settings / `required_providers` demo)   **Time:** ~4 h (reading ~2 h, labs ~2 h)

## What you will learn

- What a **provider** is, and why Terraform needs one for every platform it manages.
- How `terraform init` downloads provider plugins into the hidden `.terraform` folder.
- How a `resource` block is built (type + local name) and why the pair must be unique.
- The three **provider tiers** (official, partner, community) and what a **namespace** is.
- How to declare providers with `required_providers` and when you **must** do it.
- How to configure a provider, including a second, non-AWS provider (GitHub) as proof that the workflow is always the same.
- The AWS provider **authentication methods**, and why you should never hard-code keys.
- How provider **versions** work, every **version constraint operator**, and how Terraform picks a version.
- What the **dependency lock file** `.terraform.lock.hcl` is, what is inside it, and when to use `terraform init -upgrade`.
- How to run **multiple configurations of the same provider** (`alias`), for example two AWS regions in one project.

---

## 🧠 Pre-concept: why does Terraform need "providers"?

Terraform itself (the `terraform` program you installed in [Lesson 01](01-iac-and-terraform-intro.md)) knows how to read your `.tf` files, build a plan, and track state. What it does **not** know is how to talk to AWS, Azure, GitHub or DigitalOcean. Each of those platforms has its own web API with its own rules.

The knowledge about each platform lives in a separate **plugin** called a **provider**.

Think of Terraform core as a **universal remote control** and a provider as the **infrared code book for one brand of TV**. The remote (core) has the same buttons for every TV (the same HCL syntax, the same `plan` and `apply`), but without the right code book (provider) it cannot actually control a Samsung or a Sony.

```text
   Your .tf files            Terraform core            Provider plugin               The real platform
 ┌─────────────────┐       ┌───────────────┐        ┌────────────────────┐        ┌───────────────────┐
 │ resource        │  ───► │ reads config, │  ───►  │ hashicorp/aws      │  ───►  │ AWS API           │
 │ "aws_instance"  │       │ builds plan,  │        │ (translates to     │  API   │  ► EC2 instance   │
 │ "web" { ... }   │       │ tracks state  │        │  AWS API calls)    │ calls  │  ► IAM user ...   │
 └─────────────────┘       └───────────────┘        └────────────────────┘        └───────────────────┘
```

**Definition to memorise (it is a classic exam sentence):**

> A **provider** is a **plugin** that lets Terraform manage an **external API**.

Two consequences follow, and the rest of this chapter builds on them:

1. Plugins have to be **downloaded** before use. That is the job of `terraform init`.
2. Plugins are written and **versioned separately** from Terraform core, so you need a way to say *which provider, from where, and which version*. That is `required_providers`, version constraints and the lock file.

A reason Terraform became so popular is exactly this breadth of providers. The Terraform Registry (`registry.terraform.io`) lists **thousands** of providers (the instructor quotes "3000+"; the number keeps growing): AWS, Azure, GCP, Alibaba Cloud, Kubernetes, GitHub, DigitalOcean, Vault, Datadog and many more.

---

## 1. Providers and `terraform init`

### 1.1 What `terraform init` does with providers

Whenever your configuration mentions a provider (a `provider` block, a `required_providers` entry, or any resource such as `aws_instance`), the first command to run is:

```bash
terraform init
```

`init` does these provider-related things:

- Reads the configuration to work out which providers are needed.
- **Downloads** the matching plugin from the registry.
- Stores it in a hidden folder called **`.terraform`** inside your working directory.
- Creates or reads the dependency lock file `.terraform.lock.hcl` (see [section 8](#8-the-dependency-lock-file-terraformlockhcl)).

Where exactly does the plugin go? The path has this shape:

```text
.terraform/
└── providers/
    └── registry.terraform.io/          <- registry hostname
        └── hashicorp/                  <- namespace
            └── aws/                    <- provider type
                └── 5.57.0/             <- version
                    └── darwin_arm64/   <- operating system + CPU architecture
                        └── terraform-provider-aws_v5.57.0_x5   <- the plugin binary
```

(Your OS/architecture folder will differ, for example `linux_amd64` or `windows_amd64`.)

Everything in your folder other than your own `.tf` files was created automatically by Terraform: `.terraform/`, the lock file, and later the state file.

⚠️ **Gotcha:** provider plugins are **big**. The AWS plugin is roughly **300 MB** and Azure roughly **184 MB** in the lecture, so `terraform init` can take a minute or two on a slow connection. Do not interrupt it.

⚠️ **Gotcha:** `.terraform/` is generated. Never hand-edit it and (as you will see in [Lesson 10](10-backends-locking-drift.md)) never commit it to Git. The lock file, however, **should** be committed.

🎯 **Exam focus:** "Which command downloads provider plugins?" Answer: `terraform init`. "Where are they stored?" Answer: the `.terraform` directory in the working directory.

### 1.2 Demo: adding a second provider (Azure)

This short demo from lecture 28 shows how `init` reacts to a new provider. Start with the AWS configuration you already have (`first_ec2.tf`) and add one line:

```hcl
provider azurerm {}
```

(The quotes around `azurerm` are optional in older syntax, but the modern, recommended form is `provider "azurerm" {}`.)

Now run init again:

```bash
terraform init
```

Terraform finds a provider it has not downloaded yet, installs the Azure plugin next to the AWS plugin under `.terraform/providers/...`, and finishes with "Terraform has been successfully initialized!".

What this one line teaches:

| Observation | Meaning |
|---|---|
| One line was enough to make Terraform **download** the Azure plugin | A provider is identified by name; `init` resolves it from the registry |
| It was **not** enough to create Azure resources | You also need Azure credentials and resource blocks |
| **Whenever you add a new provider, run `terraform init` again** | `plan` and `apply` refuse to run until the plugin is installed |
| AWS and Azure plugins sit side by side | A single working folder can hold **several providers**, so one configuration can define resources on both clouds |

> **Up to date (TF 1.12):** the current `azurerm` provider requires a `features {}` block (and a subscription ID) before `plan` works, so a bare `provider "azurerm" {}` is good enough to **download** the plugin during `init`, but `terraform plan` would then ask for more configuration. The lecture only needed the download.

### 1.3 A provider is only usable by *its own* resource types

A resource type belongs to exactly one provider. `aws_instance` can only be handled by the AWS plugin. Having the Azure plugin installed does not help with it, and vice versa: an Azure-only resource such as `azurerm_kubernetes_fleet_manager` can only be managed by the Azure plugin.

The **prefix** of a resource type tells you which provider it belongs to:

| Prefix | Provider |
|---|---|
| `aws_` | `hashicorp/aws` |
| `azurerm_` | `hashicorp/azurerm` |
| `google_` | `hashicorp/google` |
| `github_` | `integrations/github` |
| `digitalocean_` | `digitalocean/digitalocean` |
| `local_`, `random_`, `null_` | `hashicorp/local`, `hashicorp/random`, `hashicorp/null` |

This prefix rule is also how Terraform guesses the provider when you do not declare one explicitly (see [section 4.5](#45-implicit-provider-requirements)).

### 1.4 "Do I have to relearn Terraform for every provider?"

**No.** The core concepts and syntax are identical across providers: `terraform init / plan / apply / destroy`, variables, outputs, state, modules, `count`, `for_each` and so on. This course teaches Terraform core and just uses AWS as the demo platform. What differs per provider is only:

- the **credentials** it needs,
- the **resource types and arguments** it offers (found in the provider's documentation on the Registry).

Section 5 proves this with GitHub.

There is one honest prerequisite: you must understand the platform you manage. If you are asked to write Terraform for Azure you must know how to create a VM in Azure by hand. **Terraform skill = Terraform core + understanding of the platform.**

### 1.5 Provider bugs

Even official providers can have bugs, or behave differently from what the documentation says. This is rare (the AWS provider has tens of millions of downloads a month), but if you hit one:

1. Open the provider's **GitHub repository** (linked on its Registry page).
2. Browse the open **issues** and **pull requests**.
3. Raise a new issue if nobody has reported it, or wait for a fix in a new provider release.

Note the practical consequence: upgrading **Terraform** will not fix a **provider** bug. You must move the **provider plugin** to a release that contains the fix (see [section 7](#7-provider-versioning)).

---

## 2. The `resource` block: type + local name

A **resource block describes one or more infrastructure objects** that belong to a provider.

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

```text
resource   "aws_instance"   "myec2"   { ...arguments... }
   │             │             │
 keyword    RESOURCE TYPE   LOCAL NAME
            (fixed: defined (your choice: unique
             by the provider) per resource type)
```

Example resource types: `aws_instance` (EC2 virtual machine), `aws_alb` (load balancer), `aws_iam_user` (IAM user), `digitalocean_droplet`, `github_repository`.

| Part | Can you change it? | Notes |
|---|---|---|
| Resource type (`aws_instance`) | **No.** It is defined in the provider docs | The prefix identifies the provider (`aws_`, `azurerm_`, `github_`, `digitalocean_`) |
| Local name (`myec2`) | **Yes.** Any valid name | Used to refer to the resource elsewhere in your configuration, for example `aws_instance.myec2.id` |

**The combination `resource_type.local_name` is the resource's identifier and must be unique** within the module. You will use this identifier constantly (`-target`, references, state addresses). Resource blocks and references are covered fully in [Lesson 05](05-resources-data-dependencies.md).

### 2.1 Demo: duplicate local names fail

Lecture 28 deliberately breaks this rule. The file contains **two** blocks both called `aws_instance.myec2`:

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "PUT-YOUR-ACCESS-KEY-HERE"   # placeholder, see section 6 for the safe way
  secret_key = "PUT-YOUR-SECRET-KEY-HERE"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}

resource "aws_instance" "myec2" {      # same type AND same local name
  ami           = "ami-123"
  instance_type = "t3.micro"
}

provider azurerm {}
```

Run:

```bash
terraform plan
```

Result: an **Error** saying the resource `aws_instance.myec2` is already declared. Resource names must be unique per type.

Fix it by renaming the second one:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-123"
  instance_type = "t3.micro"
}
```

Now `terraform plan` works and shows two instances to add. (The instructor then deleted the second block because he did not want an extra EC2 instance.)

Takeaways:

- Two instances may share the same **type** but must have **different local names**.
- Different configurations (for example different AMI/OS) belong in separate blocks with separate local names.
- The same rule appears again in [section 9](#9-multiple-provider-configurations-alias-lecture-143): the lecture-143 demo first fails with `Duplicate resource "aws_security_group" configuration`.

🎯 **Exam focus:** identifier = `<resource_type>.<local_name>`; it must be unique. The type is fixed by the provider; the local name is yours.

---

## 3. Provider tiers, namespaces and the Registry

### 3.1 The three tiers

The Terraform Registry marks every provider with a **tier** that tells you who owns and maintains it. The Registry UI has filters for each tier.

| Tier | Owned and maintained by | Namespace (examples) | Production guidance |
|---|---|---|---|
| **Official** | **HashiCorp** | `hashicorp` (`hashicorp/aws`, `hashicorp/azurerm`, Active Directory, other HashiCorp products) | Preferred. Official providers cover the most popular technologies: clouds, Kubernetes, Active Directory, other HashiCorp products |
| **Partner** | A technology company with a **direct partnership** with HashiCorp | Company-specific, for example `oracle/oci`, MongoDB Atlas, Alibaba Cloud, `digitalocean/digitalocean` | Also quite stable; fine to use |
| **Community** | **Individual contributors** | Contributor-specific (for example a 1Password provider under its author's namespace) | Avoid if possible. Bugs may exist and individual maintainers may not have time to fix them |

Quick memory aid:

```text
Official  = HashiCorp itself          -> namespace "hashicorp"
Partner   = a company, verified by HashiCorp   -> namespace = the company
Community = a person or small group   -> namespace = that person/group
```

> **Extra context (not stated in the lecture):** the Registry also shows an "Archived" badge for providers that are no longer maintained. The exam blueprint talks about the three tiers above.

### 3.2 Namespaces

A **namespace** organises providers by owner. In the Registry URL the namespace is the path segment after `providers/`:

```text
https://registry.terraform.io/providers/hashicorp/aws                  -> namespace "hashicorp", provider "aws"
https://registry.terraform.io/providers/hashicorp/azurerm              -> namespace "hashicorp", provider "azurerm"
https://registry.terraform.io/providers/digitalocean/digitalocean      -> namespace "digitalocean"
https://registry.terraform.io/providers/integrations/github            -> namespace "integrations"
```

Official providers always use the `hashicorp` namespace. Partner and community providers use their own namespace. Notice that **GitHub's provider is partner tier with the namespace `integrations`**, not `github` and not `hashicorp`.

### 3.3 Provider source address

A provider's full address has three parts, with an optional hostname in front:

```text
[hostname/]namespace/type

registry.terraform.io/hashicorp/aws          <- full form
hashicorp/aws                                <- shortened; hostname defaults to registry.terraform.io
integrations/github
digitalocean/digitalocean
```

The default hostname is `registry.terraform.io`. (A different hostname is used for private registries, for example HCP Terraform's private registry, see [Lesson 12](12-hcp-terraform.md).)

🎯 **Exam focus:** know the three tiers, who owns each, and that official providers live in the `hashicorp` namespace.

---

## 4. Declaring providers with `required_providers`

### 4.1 The problem: Terraform assumes the `hashicorp` namespace

If you write only:

```hcl
provider "digitalocean" {}
```

and run `terraform init`, you get an error like "Failed to query available provider packages ... could not find `hashicorp/digitalocean`". Terraform assumed that `digitalocean` lives in the default `hashicorp` namespace, where it does not exist (DigitalOcean is a partner provider).

You might try to fix it by putting the address inside the provider block (`digitalocean/digitalocean`), but that also fails: **the source cannot be given in the `provider` block**. The source goes in `required_providers`.

### 4.2 The fix: a `required_providers` block

`required_providers` is a **nested block inside the `terraform {}` settings block**. On every provider's Registry page, the **"Use Provider"** button shows exactly the snippet you need to copy.

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {}
```

After this, `terraform init` succeeds.

| Piece | Meaning |
|---|---|
| `terraform { ... }` | The **Terraform settings** block. It is not a resource. (More on it in [Lesson 03](03-core-workflow.md)) |
| `required_providers { ... }` | Lists the providers this configuration needs |
| `digitalocean = { ... }` | The **local name** of the provider. It is what you then use in `provider "digitalocean"` |
| `source = "digitalocean/digitalocean"` | `namespace/type`: where Terraform downloads it (`registry.terraform.io/digitalocean/digitalocean`) |
| `version = "~> 2.0"` | A **version constraint**: any 2.x release (see [section 7](#7-provider-versioning)) |

The `required_providers` entry for DigitalOcean also appears in the data source demo of lesson 4:

```hcl
terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

provider "digitalocean" {
  token = "your-token-here"     # placeholder; never commit a real token
}

data "digitalocean_account" "example" {}
```

Here there is a `source` but no `version`. That is allowed: Terraform then installs the newest release. (Data sources themselves are covered in [Lesson 05](05-resources-data-dependencies.md).)

### 4.3 Is `required_providers` always needed?

| Provider kind | `required_providers` | Why |
|---|---|---|
| HashiCorp-maintained (AWS, Azure, Google, `random`, `local`, ...) | **Optional** | `provider "aws" { ... }` alone works because Terraform assumes `hashicorp/aws`. You add it when you want to **pin a version** or change the source |
| Non-HashiCorp (partner and community) | **Essential** | Terraform cannot guess the namespace |

The AWS provider documentation's own example usage includes a `required_providers` block, and it is best practice to include one even for official providers, because it is the only place to pin the provider version.

### 4.4 `required_providers` vs `provider` (do not mix them up)

```text
  terraform {                                     provider "aws" {
    required_providers {                            region = "us-east-1"
      aws = {                                       profile = "dev"
        source  = "hashicorp/aws"                 }
        version = "~> 5.0"
      }
    }
  }
  WHICH plugin, from WHERE, which VERSIONS         HOW to configure it (region, credentials, endpoints)
```

| Block | Question it answers | Lives in |
|---|---|---|
| `required_providers` | Which plugin do I need, where do I get it, which versions are acceptable? | `terraform {}` block |
| `provider "<name>"` | How should this plugin behave (region, credentials, ...)? | Top level of a `.tf` file |

The `terraform {}` block can also hold `required_version` (restricts the **Terraform CLI** version), `backend`, `experiments` and `provider_meta`. Project-wide behaviour belongs there, not in the provider block.

Demo from lesson 4 (Terraform settings):

```hcl
terraform {
  required_version = "1.9.1"            # Terraform core (CLI) must be exactly this version

  required_providers {
    aws = {
      version = "5.54.1"                # provider version, exact
      source  = "hashicorp/aws"
    }
  }
}

resource "aws_security_group" "sg_01" {
  name = "app_firewall"
}
```

- If you set `required_version = "1.8"` while running 1.9.1, `terraform plan` fails with **"Unsupported Terraform Core version"**.
- `required_version` checks the **Terraform core** version; `required_providers` handles **provider** sources and versions.
- Without constraints, `init` pulls the **latest** provider.

### 4.5 Implicit provider requirements

If you use `resource "aws_instance" ...` without any `required_providers` or `provider` block, Terraform infers the provider from the resource-type prefix (`aws_` -> `hashicorp/aws`) and installs it. That is why the lecture-28 demos worked before anyone mentioned `required_providers`. Inference only works for providers in the `hashicorp` namespace.

⚠️ **Gotcha:** the **local name** in `required_providers` must match the name used by your `provider` block and by the resource prefixes. In [Lesson 09](09-modules.md) the instructor accidentally typed a wrong local name and got a warning that the provider `aws` is "implicitly specified, but it is listed in required_providers as ..." Changing the local name back to `aws` removed it.

⚠️ **Gotcha:** `terraform init` error "failed to query available providers ... `hashicorp/<name>`" almost always means a non-HashiCorp provider is missing its `source` in `required_providers`.

> **Child modules:** modules declare provider *requirements* with `required_providers`; the root module supplies the *configuration* (`provider` blocks). See [Lesson 09](09-modules.md) for modules and their provider rules.

🎯 **Exam focus:** non-HashiCorp providers require `required_providers` with a `source`. `required_providers` is optional for HashiCorp ones but is the place to pin versions.

---

## 5. A second provider as proof: GitHub repository (lecture 30)

Lecture 30 exists to prove section 1.4: once you know the workflow for one provider, you can use any provider.

```text
 define provider  ->  supply credentials  ->  pick a resource from the docs  ->  init -> plan -> apply
```

Target: create a GitHub repository with Terraform.

### 5.1 Provider facts

- The GitHub provider is **partner tier**, namespace `integrations`, so the source is `integrations/github`. It is not in the `hashicorp` namespace, so `required_providers` is mandatory.
- AWS authenticates with an access key and secret key. GitHub authenticates with a **token**. The provider's documentation tells you what it needs.

### 5.2 Getting a token

Prerequisite: a GitHub account.

1. GitHub, **Settings**, **Developer settings**, **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
2. Token name: `Terraform`. Keep the defaults for the rest.
3. Repository access: **All repositories** (for simplicity).
4. Repository permissions: **Administration** (covers creating/deleting repositories, settings, teams and collaborators) set to **Read and write**.
5. **Generate token** and copy it right away. It is displayed once.

> **Security reminder:** the lecture puts the token directly in the file only to keep the first demo simple. Treat it like a password: never commit it, revoke it when finished, and prefer an environment variable (the GitHub provider can read `GITHUB_TOKEN` from the environment).

### 5.3 The code

Put this in a **second file, `github.tf`**, in the same folder as `first_ec2.tf`:

```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

provider "github" {
  token = "your-token-here"     # placeholder: use your own, never commit it
}

resource "github_repository" "example" {
  name        = "example"
  description = "My awesome codebase"

  visibility = "public"
}
```

| Block / argument | Explanation |
|---|---|
| `required_providers { github = { ... } }` | Declares the provider, where to download it (`integrations/github`), and limits it to the 5.x series (`~> 5.0`) |
| `provider "github" { token = ... }` | Provider configuration. The token is the authentication credential |
| `resource "github_repository" "example"` | Resource type `github_repository` (taken from the provider docs, "Resources" section), local name `example` |
| `name = "example"` | The repository name shown on GitHub |
| `description` | Repository description |
| `visibility = "public"` | `public` or `private`, the same choice as in the GitHub UI |

> **Up to date:** newer major versions of the GitHub provider exist than the `~> 5.0` used in the lecture. If you follow along, either keep `~> 5.0` (what the lecture tested) or consult the Registry page for the current "Use Provider" snippet and re-check the arguments.

### 5.4 Commands and results

```bash
terraform init     # downloads integrations/github next to the AWS plugin
terraform plan     # Plan: 1 to add (github_repository.example)
terraform apply    # type yes -> the repository appears in your GitHub account
```

In the lecture the plan said **1 to add** because the EC2 instance from the earlier lecture already existed and only the repository was new.

**Terraform reads all `.tf` files in the working directory** and merges them into one configuration. That is why a later `terraform destroy` sees both the EC2 instance and the repository (see [Lesson 03](03-core-workflow.md) for `destroy` and `-target`).

⚠️ **Gotchas**

- Without `required_providers`/`source`, `init` fails, because GitHub is not in the `hashicorp` namespace.
- The token's permissions must allow the action (Administration read/write to create repositories). Otherwise you get an authorization failure.
- The repository is **real**. `terraform destroy` removes it.

🎯 **Exam focus:** the same workflow works for every provider (configure provider, add resources, `init`, `plan`, `apply`). Multiple `.tf` files in one directory are merged. The GitHub provider is partner tier with source `integrations/github`.

---

## 6. Configuring the AWS provider and authenticating (lecture 32)

### 6.1 The problem with hard-coded keys

Early in the course the provider block contained the keys:

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "PUT-YOUR-ACCESS-KEY-HERE"
  secret_key = "PUT-YOUR-SECRET-KEY-HERE"
}
```

It is simple and it works, but it is **not secure**:

- Developers commit the file to Git. If the repository is public, the credentials are compromised within minutes (bots scan GitHub for AWS keys).
- Even in a private repo, every collaborator can read them, and **if something bad happens with those credentials the blame lands on you**.
- Students paste entire files, keys included, into forums. A leaked key must be deactivated in IAM immediately and replaced.

The instructor used keys in the earliest videos on purpose, "so that we understand the disadvantages". Later videos may still show keys: simply delete those two lines once your machine is configured as described below.

**Target** (no secrets in the code, and it still works):

```hcl
provider "aws" {
  region = "us-east-1"
}
```

### 6.2 AWS provider authentication methods

| Method | How it works | Pros / cons |
|---|---|---|
| **Static credentials in the provider block** (`access_key`, `secret_key`) | Keys written in the `.tf` file | Simple but insecure. Do not use beyond the first demos |
| **Shared config/credentials files, explicit paths** (`shared_config_files`, `shared_credentials_files` arguments) | Keys live in separate files; the provider block points to them | No secrets in code, but each team member may keep the files elsewhere, so you would need to standardise paths |
| **Shared files at the default location (recommended)** | Provider block has *only* `region`; Terraform reads `~/.aws/config` and `~/.aws/credentials` automatically | Clean, works across the team with no path agreement, keys never enter the repo |
| **Environment variables** | Export the access key / secret key variables in the shell | Also works; handy in CI systems |
| **Assume an IAM role** (`assume_role` block, `role_arn`) | The provider assumes a role, often to work in another account | Useful and common in companies; not detailed in the course |

Default locations when `shared_config_files` / `shared_credentials_files` are not set:

| OS | Config file | Credentials file |
|---|---|---|
| Linux / macOS | `$HOME/.aws/config` | `$HOME/.aws/credentials` |
| Windows | `%USERPROFILE%\.aws\config` | `%USERPROFILE%\.aws\credentials` |

> **Extra context (not in the lecture):** the standard AWS environment variables are `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` (temporary credentials), `AWS_DEFAULT_REGION` or `AWS_REGION`, and `AWS_PROFILE` (choose a named profile from the shared files). The provider also supports single sign-on profiles, and on AWS compute (EC2 instance profile, ECS task role) it can pick up credentials from the machine itself with no keys at all.
>
> **Order of precedence for the AWS provider (from the provider documentation):** (1) parameters in the provider block, (2) environment variables, (3) shared credentials/configuration files, (4) container credentials, (5) EC2 instance profile credentials. The first source that supplies credentials wins, which is why a leftover `access_key` in the block silently overrides your CLI setup.

### 6.3 Why install the AWS CLI

The **AWS CLI** is a command-line tool for managing AWS (for example creating an EC2 instance with a command rather than the console). When you configure it with `aws configure`, it writes the access key and secret key into **exactly the same default files** that Terraform's AWS provider reads. So:

1. Install the AWS CLI.
2. Run `aws configure` once.
3. Terraform finds the credentials automatically.

It also fits single sign-on setups (Okta, AWS IAM Identity Center), which is why storing credentials through the CLI is recommended whenever you work with AWS. The CLI is not required for Terraform to run; it is simply the easiest supported way to create those files.

### 6.4 Demo walkthrough

Test file `aws-provider-config.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_user" "demouser" {
  name = "kplabs-demo-user"
}
```

| Block | Meaning |
|---|---|
| `provider "aws" { region = ... }` | No credentials in code. Terraform searches the default sources |
| `resource "aws_iam_user" "demouser"` | Creates an IAM user |
| `name = "kplabs-demo-user"` | The user's name inside IAM |

Steps:

1. **Baseline with keys in the block** (the starting file still had `access_key` and `secret_key`): `terraform apply -auto-approve` creates the IAM user. Check IAM, Users. Then `terraform destroy -auto-approve`.
2. **Remove** the `access_key` and `secret_key` lines. Paste them into a scratch file so they are not lost.
3. `terraform plan` now fails:

```text
Error: no valid credential sources for AWS Provider found.
```

   (Newer provider versions word it "No valid credential sources found", but the meaning is the same: Terraform looked in the block, environment variables and shared files and found nothing.)

4. **Install the AWS CLI** (macOS: `.pkg` installer, Windows: `.msi`, Linux supported too, follow the AWS CLI install guide). Open a **new** terminal and type `aws`. Help text confirms it is on your PATH.
5. Run:

```bash
aws configure
```

   It prompts for four values:

```text
AWS Access Key ID [None]: <paste your access key id>
AWS Secret Access Key [None]: <paste your secret key>
Default region name [None]: us-east-1
Default output format [None]: json
```

   The CLI writes `~/.aws/credentials` and `~/.aws/config` (on Windows under `C:\Users\<you>\.aws\`). The last two prompts are optional.
6. `terraform plan` now works with no error.
7. `terraform apply -auto-approve` creates the IAM user with **no secrets in the code**. You can now commit the code, even publicly, because the credentials live in your home directory, not the repo.
8. Clean up: `terraform destroy -auto-approve`.

`-auto-approve` skips the interactive `yes` confirmation. It is convenient for demos but be careful with it on real infrastructure.

What `aws configure` creates (names only, never paste your real values into notes or chats):

```text
~/.aws/credentials
[default]
aws_access_key_id     = AKIA................
aws_secret_access_key = ........................................

~/.aws/config
[default]
region = us-east-1
output = json
```

⚠️ **Gotchas**

- `no valid credential sources for AWS Provider found` means Terraform found no credentials in the block, environment variables or shared files.
- Open a **fresh terminal** after installing the CLI so `aws` is on the PATH.
- Credential files are in your home directory. Never copy them into the project folder or commit them. Also keep `*.tfstate` and secret-bearing `.tfvars` files out of Git.
- If you leak a key, **deactivate it in IAM immediately** and create a new one.
- A static `access_key` left in the provider block takes precedence over everything else (see the precedence note above).

🎯 **Exam focus:** never hard-code credentials in real projects. `aws configure` writes the default shared files; the AWS provider reads them automatically. Alternatives: environment variables, shared files with explicit paths, assumed IAM role. `-auto-approve` bypasses the confirmation prompt.

---

## 7. Provider versioning

### 7.1 Plugins are versioned separately from Terraform

Terraform core and each provider plugin are **released independently, with their own version numbers**. Terraform may stay on 1.12 while the AWS provider goes from 4.x to 5.x and beyond. A DigitalOcean provider can go from v1 to v2 regardless of the Terraform CLI version.

```text
 Terraform CLI:      1.9 ──────────── 1.10 ──────────── 1.12      (its own release cycle)
 AWS provider:   3.27 ── 4.0 ── 4.62 ── 5.0 ── 5.57 ── 6.0       (its own release cycle)
 DigitalOcean:       1.x ──────── 2.x ──────────────────────      (its own release cycle)
```

Analogy from the lecture: upgrading from Windows 7 straight to Windows 10 can break existing programs. In the same way, jumping to a new provider release unexpectedly can break working Terraform code, either because of a bug in the new plugin or because behaviour changed and the code needs small updates.

**If you do not specify a version, `terraform init` uses the most recent provider plugin.** Therefore, in production, **pin or constrain** provider versions in `required_providers`.

Documentation is versioned per provider version too: every Registry resource page has a **provider version selector**, so you can read the docs that match your older code (see the `aws_security_group` example in [Lesson 05](05-resources-data-dependencies.md)).

### 7.2 Version constraint operators

| Constraint | Meaning | Lecture example |
|---|---|---|
| `= 3.27.0` (or just `"3.27.0"`) | **Exactly** that version | The Registry's "Use Provider" snippet gives an exact version |
| `>= 1.0` | 1.0 **or newer** (never 0.8, 0.9, ...) | |
| `<= 1.0` | 1.0 **or older** (never 1.1, 1.2, ...) | `<= 2.60` installed 2.60.0 |
| `~> 2.0` ("tilde", "pessimistic") | Any version in the **2.x** range (2.1, 2.2, 2.20, 2.25, ...). The right-most number may increment | `~> 3.0` selected 3.27.0 at the time; `~> 2.0` selected 2.70.0 |
| `>= 2.10, <= 2.30` | A **range**: between 2.10 and 2.30 (not 2.8/2.9, not 2.31/2.32) | Selected 2.30.0, the highest in the range |

The repo's quick list:

```text
version = "2.7"             exactly 2.7
version = ">= 2.8"          2.8 or newer
version = "<= 2.8"          2.8 or older
version = ">=2.10,<=2.30"   anything from 2.10 to 2.30
```

**Terraform picks the newest version that satisfies the constraint.**

> **Extra context (not shown in the lecture, but exam-relevant):**
>
> | Constraint | Allowed range |
> |---|---|
> | `~> 3.0` | `>= 3.0` and `< 4.0` (the minor number may rise, the major may not) |
> | `~> 3.27` | `>= 3.27` and `< 4.0` |
> | `~> 3.0.0` or `~> 3.0.1` | `>= 3.0.x` and `< 3.1.0` (only the **patch** number may rise) |
> | `!= 3.5.0` | anything except 3.5.0 |
> | `> 1.0`, `< 2.0` | strictly greater / strictly less |
>
> The rule for `~>`: **only the right-most version number you wrote is allowed to increase.** Write two numbers and the second floats; write three numbers and the third floats.

⚠️ **Gotcha:** `~> 3.0` is **not** "3.0 only" and **not** `<= 3.0`. It means any 3.x. Also, `<= 2.30` will accept 2.30.0 but not a later patch such as 2.30.1.

### 7.3 Where to put the version

The old repo files put `version` **inside the `provider` block**:

```hcl
provider "aws" {
  region     = "us-west-2"
  access_key = "YOUR-ACCESS-KEY"
  secret_key = "YOUR-SECRET-KEY"
  version    = ">=2.10,<=2.30"     # OLD style, deprecated
}
```

> **Up to date (TF 1.12):** a `version` argument inside a `provider` block is the old, pre-0.13 style. It is deprecated and Terraform warns about it. The lecture video itself uses the recommended place, `required_providers`. Keys in the block are placeholders in these files; use the approach from [section 6](#6-configuring-the-aws-provider-and-authenticating-lecture-32) instead.

The modern equivalent:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 2.10, <= 2.30"
    }
  }
}

provider "aws" {
  region = "us-west-2"
}
```

### 7.4 Demo walkthrough: how constraints and the lock file interact

Folder `provider-versioning`, file `provider_version.tf`. There are **no resources**, only the `terraform` block, so there is nothing to pay for. (The versions below are historic AWS provider releases from the lecture; the exact numbers you see today will differ, and very old versions may not support your OS or architecture, for example Apple Silicon. Lab 3 below uses current versions.)

Starting configuration:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}
```

| Step | What you do | What happens |
|---|---|---|
| 1 | `~> 3.0`, run `terraform init` | Installs **3.27.0**, the newest 3.x at the time. A later 3.30 might be installed in future, which is why unrestricted use is risky: code that works on 3.27 might break on 3.30 |
| 2 | Open the new file `.terraform.lock.hcl` | Shows provider address `registry.terraform.io/hashicorp/aws`, **version 3.27.0**, **constraints** `~> 3.0`, and checksums (hashes) |
| 3 | Change the constraint to `~> 2.0`, run `terraform init` | **Error.** The locked provider 3.27.0 does not match the configured constraint. The lock file keeps you on the recorded version |
| 4 | Delete `.terraform.lock.hcl`, run `terraform init` | Installs the newest 2.x: **2.70.0** |
| 5 | Constraint `<= 2.60`, delete the lock file, `init` | Installs **2.60.0**. Output says "Terraform has created a lock file `.terraform.lock.hcl` to record the provider selections it made" |
| 6 | Constraint `>= 2.10, <= 2.30`, delete the lock file, `init` | Installs **2.30.0**, the highest version satisfying the range |
| 7 | Constraint back to `~> 3.0`, run `terraform init` | **Blocked** because the lock file exists (it says 2.30.0). Use the next command instead |
| 8 | `terraform init -upgrade` | Finds the newest version allowed by the constraints (3.27.0 then) and **updates the lock file** accordingly |

The error in step 3 looks roughly like this (wording differs a little between Terraform versions):

```text
Error: Failed to query available provider packages

Could not retrieve the list of available versions for provider hashicorp/aws:
locked provider registry.terraform.io/hashicorp/aws 3.27.0 does not match
configured version constraint ~> 2.0; must use terraform init -upgrade to allow
selection of new versions
```

A related error appears in the lesson-4 demo, when you change the version in the config **after** a successful init and then run `terraform plan`:

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are inconsistent
with the current configuration:
  - provider registry.terraform.io/hashicorp/aws: locked version selection
    5.57.0 doesn't match the updated version constraints "5.54.1"

To update the locked dependency selections to match a changed configuration,
run: terraform init -upgrade
```

In that demo the lock file said 5.57.0, the config was changed to `5.54.1`, `terraform plan` failed with "inconsistent dependency lock file", and the **error itself printed the fix**: `terraform init -upgrade`. Terraform then installed 5.54.1 and rewrote the lock file, and from then on `plan` used that exact version.

### 7.5 Do I have to move to a new provider version?

"It depends."

- If you need a **new service or feature** that the platform released *after* your provider version was published, only newer provider versions support it, so you must upgrade.
- Otherwise, large organisations deliberately stay on a known-good Terraform and provider version for **stability** (the instructor's analogy: staying on Windows 10 if everything works rather than moving to Windows 11 without a reason).
- Either way, **test properly**. Companies have switched directly to a newer provider and seen unexpected breakage.

⚠️ **Gotchas**

- No version specified = latest on the first `init`, then frozen by the lock file.
- Changing the constraint without deleting the lock file or running `-upgrade` gives an error when the locked version does not satisfy the new constraint.
- Terraform core version and provider versions are independent. Updating Terraform does not update providers, and vice versa.

🎯 **Exam focus:** providers have their own version numbers; pin provider versions in `required_providers` for production; know `=`, `>=`, `<=`, `~>` and comma-separated ranges; without a constraint, `init` installs the latest provider.

---

## 8. The dependency lock file: `.terraform.lock.hcl`

### 8.1 Two controls, not one

You now have **two** things that influence which provider version is used:

1. **Version constraints** in `required_providers`: the *acceptable range*, written by you.
2. **The dependency lock file** `.terraform.lock.hcl`: the *exact version actually chosen*, written by Terraform.

Why do we need the second one? Imagine this timeline:

```text
Day 0    You write code with Terraform 1.2 + AWS provider v1, test everything, commit to Git.
Week 4   AWS provider v2 is released.
Week 8   AWS provider v3 is released.
Month 2  A colleague clones your repo and runs `terraform init`.
         -> downloads v3, the newest version your constraint allows.
            The code may break: a plugin bug, or new behaviour that needs code changes.
```

Even a loose constraint such as `~> 4.0` lets different people get different 4.x versions on different days. The lock file removes that uncertainty.

### 8.2 What the lock file contains

After `terraform init` selects a version, Terraform records it in `.terraform.lock.hcl` in the working directory. (It is a plain-text HCL file; the course transcripts sometimes read it aloud as "terraform dot lock dot hcl".)

Conceptual shape with placeholder checksums:

```hcl
# This file is maintained automatically by "terraform init".
# Manual edits may be lost in future updates.

provider "registry.terraform.io/hashicorp/aws" {
  version     = "4.62.0"
  constraints = "~> 4.0"
  hashes = [
    "h1:<checksum-placeholder-1>",
    "zh:<checksum-placeholder-2>",
    "zh:<checksum-placeholder-3>",
  ]
}
```

| Field | Meaning |
|---|---|
| `provider "registry.terraform.io/hashicorp/aws"` | The provider's full source address |
| `version` | The **exact version actually selected** at `init` (the lecture showed `4.62.0`) |
| `constraints` | The version constraint from your configuration at that moment |
| `hashes` | Checksums of the provider package so the exact plugin can be verified on later installs |

> **Extra context:** hash prefixes tell you what was hashed. `zh:` entries are hashes of the provider's release `.zip` files as published, and `h1:` entries are hashes of the unpacked package contents for a platform. You do not need to know the format for the exam, only that hashes exist.

### 8.3 What the lock file does on `terraform init`

```text
              terraform init
                    │
        ┌───────────┴────────────┐
   lock file missing?       lock file exists?
        │                        │
 pick the NEWEST version   does the locked version still
 matching the constraint   satisfy the constraint?
 and WRITE the lock file        │
                         ┌──────┴──────┐
                        yes            no
                         │              │
              install EXACTLY the     ERROR: "run terraform init -upgrade"
              locked version and             │
              verify the hashes       terraform init -upgrade
                                      re-selects a version within the
                                      constraint and REWRITES the lock file
```

Key rules:

- If a provider already has a selection recorded in the lock file, Terraform **always re-selects that version** on `init`, even if a newer version exists. Example: locked at 2.70.0, even if 3.0 is out, plain `init` will not upgrade.
- If you **loosen or change** the constraint so the locked version still satisfies it, `init` just carries on.
- If the locked version **no longer satisfies** the constraint, `init` errors out. HashiCorp recommends `terraform init -upgrade` for this.
- `terraform init -upgrade` finds the newest version allowed by your constraints and **updates the lock file**. It will also let you move **down** to an older version, as in the 4.62.0 to 4.60 demo below.
- You can also delete the lock file by hand and run `init` again (the lecture 37 demo does this), but `-upgrade` is the proper tool.

### 8.4 Demo: go back to an older provider (lecture 148)

1. A folder holds a single `demo.tf` with a provider version range. Run `terraform init`:
   - Terraform finds the best version matching the constraint (the instructor saw **4.62.0**; "you may see a newer one"),
   - installs it,
   - creates `.terraform.lock.hcl` listing constraints, version `4.62.0` and hashes.
2. Later you decide to go back to **4.60** (assume 4.62 has a bug). Change `required_providers` to exactly 4.60 and run:

```bash
terraform init
```

   Result: **error**, because the lock file says 4.62.0 and does not match the new constraint.
3. Use the upgrade flag:

```bash
terraform init -upgrade
```

   This time 4.60 is installed and the lock file is updated to match.

The repo file (`dependency-lock.tf`) for this lecture:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.60"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-123"           # the repo file has this unquoted, which is invalid HCL
  instance_type = "t2.micro"
}
```

- `source = "hashicorp/aws"` is the provider's Registry address.
- `version = "4.60"` is an **exact** constraint. (The lecture slide showed a range such as `~> 4.0`; the lock file showed constraint `4.0`-style text and version `4.62.0`. The idea is the same: the constraint says what is allowed, the lock says what was chosen.)
- The repo has `ami = ami-123` **without quotes**. That is a typo; strings need quotes, so write `"ami-123"` (the file is only a teaching example and the AMI is fake).

### 8.5 Checksums and integrity

The first time a provider is installed, Terraform fills the `hashes` list with checksums that are covered by the provider developer's **cryptographic signature**, for the platforms that version supports. On later installs Terraform compares the downloaded package with the recorded hashes. If they do not match, **initialisation fails**. This ensures the exact intended version and package is installed, protecting you from a tampered or substituted plugin.

> **Extra context (not in the lecture):** a team where some people use macOS and others Linux can pre-record hashes for all platforms with `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=windows_amd64`. Otherwise a lock file created on one OS may contain only that OS's hashes, and CI on another OS may report a checksum mismatch. The command `terraform providers` prints the providers a configuration requires.

### 8.6 Important limitations and good practice

- The dependency lock file tracks **only provider dependencies**.
- It does **not** remember versions of **remote modules**. For a module, Terraform always selects the **newest** available module version that satisfies its constraint (see [Lesson 09](09-modules.md)).
- **Commit `.terraform.lock.hcl` to version control** alongside the code so teammates and CI use the same provider versions. Do not hand-edit it (the header says edits may be lost).
- **Do not commit** `.terraform/`, state files or credentials.
- It is a **newer feature**: older Terraform versions (0.11, 0.12) did not have it (it was introduced in Terraform 0.14).

⚠️ **Gotcha:** the **dependency lock file** `.terraform.lock.hcl` is **not** the **state lock** used to stop two people running `apply` at once. The names sound alike, but the lock file pins *provider versions*; state locking is a backend feature ([Lesson 10](10-backends-locking-drift.md)).

### 8.7 Constraints vs lock file

| Aspect | `version` constraint (in `.tf`) | `.terraform.lock.hcl` |
|---|---|---|
| Who writes it | You | Terraform (`init`) |
| Expresses | Acceptable range or exact version | The **exact selected version** plus hashes |
| Applies to | Providers (and modules, by the same syntax) | **Providers only** |
| Changed by | Editing the `.tf` file | `terraform init -upgrade` |
| Commit to Git? | Yes (it is your code) | Yes |

🎯 **Exam focus:** file name `.terraform.lock.hcl`, created by `terraform init` in the working directory. It locks **provider** versions (not remote modules), storing the selected version, the constraints and the checksums. If the configuration no longer matches the lock, `init` errors and you use `terraform init -upgrade`. Commit it so the whole team uses the same provider version. Providers and Terraform core have independent release cycles.

---

## 9. Multiple provider configurations: `alias` (lecture 143)

### 9.1 The problem

A single `.tf` file may need resources in **different regions** (or different accounts):

```text
                       one .tf file
        ┌──────────────────────────────────┐
        │  aws_instance      (EC2)         │  ---> should go to Singapore (ap-southeast-1)
        │  aws_security_group (firewall)   │  ---> should go to Mumbai    (ap-south-1)
        └──────────────────────────────────┘
```

By default every resource of a provider uses the **one default provider configuration**. Wherever the region comes from (the provider block, environment variables, the AWS config file), all resources land in that one region.

### 9.2 The solution: the `alias` meta-argument

`alias` lets you define **any number of alternate configurations** of the same provider. The alias is a code name used to refer to one specific provider block.

Two steps are always needed:

1. **Define** extra `provider` blocks, each with an `alias`.
2. **Associate** each resource with a block using `provider = <type>.<alias>`.

```text
 aws_security_group.sg_1  ── provider = aws.usa    ──►  provider "aws" { alias = "usa"    region = "us-east-1" }
 aws_security_group.sg_2  ── provider = aws.mumbai ──►  provider "aws" { alias = "mumbai" region = "ap-south-1" }
 any resource with no provider argument            ──►  provider "aws" { region = "ap-southeast-1" }   (default)
```

### 9.3 Final code

```hcl
provider "aws" {
  region = "ap-southeast-1"
}

provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}

provider "aws" {
  alias  = "usa"
  region = "us-east-1"
}

resource "aws_security_group" "sg_1" {
  name     = "prod_firewall"
  provider = aws.usa
}

resource "aws_security_group" "sg_2" {
  name     = "staging_firewall"
  provider = aws.mumbai
}
```

| Element | Meaning |
|---|---|
| `provider "aws" { region = "ap-southeast-1" }` | The **default** configuration (no alias). Used by every `aws_*` resource that has no `provider` argument. This is Singapore |
| `alias = "mumbai"` | Names this extra AWS configuration. The name is arbitrary ("you can give any name") |
| `alias = "usa"`, `region = "us-east-1"` | A second extra configuration, N. Virginia |
| `provider = aws.usa` | A **meta-argument on a resource**. The format is `<provider type>.<alias>` with **no quotes** |
| `sg_1` / `sg_2` | Local names. Unique per resource type (see the first step of the demo) |

### 9.4 Demo walkthrough (as done in the lecture)

**Step 1 — Base setup, one region.** The file has a default `provider "aws"` (ap-southeast-1) and two security groups, `prod_firewall` and `staging_firewall`. Security groups are free, so this demo costs nothing.

**Step 2 — `terraform validate` fails.**

```text
Error: Duplicate resource "aws_security_group" configuration
```

Cause: both resources had the same local name (`allow_tls`), exactly the mistake from [section 2.1](#21-demo-duplicate-local-names-fail). Fix: rename them to `sg_1` and `sg_2`. `validate` then passes.

**Step 3 — Apply, verify, destroy.**

```bash
terraform validate
terraform apply -auto-approve
# console: BOTH security groups appear in Singapore (ap-southeast-1)
terraform destroy -auto-approve
```

**Step 4 — Try a second `provider "aws"` block without an alias.** The instructor added a block with `region = "ap-south-1"`:

```text
Error: Duplicate provider configuration
```

Two un-aliased provider blocks of the same type are not allowed. The error message tells you to use `alias`.

**Step 5 — Add aliases only.** Add `alias = "mumbai"` to the second block and a third block with `alias = "usa"` and `region = "us-east-1"`. `terraform validate` now passes. If you apply at this point, **both security groups still go to ap-southeast-1**. Defining an aliased provider does nothing for a resource until the resource references it.

**Step 6 — Associate resources.** Add `provider = aws.usa` to `prod_firewall` and `provider = aws.mumbai` to `staging_firewall`. Clean up the previous run first, then apply:

```bash
terraform destroy -auto-approve   # remove the earlier run first
terraform validate
terraform apply -auto-approve
```

Expected result:

| Resource | Region it lands in |
|---|---|
| `staging_firewall` (`sg_2`) | Mumbai (`ap-south-1`) |
| `prod_firewall` (`sg_1`) | N. Virginia (`us-east-1`) |

In the AWS console, switch the region selector between Mumbai and N. Virginia to see each group. Remember to destroy afterwards.

### 9.5 Extra repo example: different account via `profile`

The repo also has `multiple-providers.md` (not covered in the lecture transcript):

```hcl
# providers.tf
provider "aws" {
  region = "us-west-1"
}

provider "aws" {
  alias   = "aws02"
  region  = "ap-south-1"
  profile = "account02"
}
```

```hcl
# eip.tf
resource "aws_eip" "myeip" {
  domain = "vpc"
}

resource "aws_eip" "myeip01" {
  domain   = "vpc"
  provider = aws.aws02
}
```

The repo comment says "1st EIP: one region, 2nd EIP: second region". The new idea is that an alias can point at a **different credentials profile** (`profile = "account02"`, a named profile from `~/.aws/credentials`), so an alias can select a different **account** as well as a different region.

> **Up to date (TF 1.12):** in the repo this reference is the quoted string `provider = "aws.aws02"`, the legacy style; today you write it **unquoted**, `provider = aws.aws02`. Also, the repo's older `vpc = "true"` argument on `aws_eip` was replaced by `domain = "vpc"` in newer AWS provider versions (the version above uses the new one).

### 9.6 Extra details worth knowing

- Data sources accept the `provider = aws.<alias>` meta-argument too (extra context), which is useful for reading something from another region.
- **Modules:** a child module can receive aliased providers through the `providers = { aws = aws.usa }` argument in the `module` block, and a module that expects extra aliases declares them with `configuration_aliases` in its `required_providers`. This is covered in [Lesson 09](09-modules.md); it was not part of the lecture-143 transcript.
- The alias name is free-form. It does not have to equal the region name, but descriptive aliases make code easier to read.

⚠️ **Gotchas**

- Two `provider` blocks of the same type with no `alias` give `Duplicate provider configuration`.
- A resource with no `provider` argument uses the **default (un-aliased)** configuration, even when aliased blocks exist.
- Local names must be unique per resource type (`Duplicate resource ... configuration`).
- The `provider` argument value is `aws.usa`, **not** `"aws.usa"` and not `aws["usa"]`.

🎯 **Exam focus:** `alias` is a meta-argument on `provider` blocks that allows multiple configurations of the same provider. Reference syntax is `provider = <PROVIDER>.<ALIAS>` (for example `aws.usa`). The un-aliased block is the default. Typical use: multi-region or multi-account deployments from one configuration. The instructor says that for the exam you should know at a high level what `alias` allows.

---

## 🧪 Labs

Labs 1 to 4 cost nothing: they create no paid resources. Lab 2 creates a free IAM user, Lab 4 creates free security groups. Always finish with `terraform destroy`.

### Lab 1 — Install a provider and inspect `.terraform`

1. Make an empty folder and enter it:

```bash
mkdir tf-providers-lab && cd tf-providers-lab
```

2. Create `main.tf`:

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

3. Run `terraform init`. Expected output (abridged):

```text
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.x.y...
- Installed hashicorp/aws v5.x.y (signed by HashiCorp)
Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!
```

4. Look around:

```bash
ls -a
ls .terraform/providers/registry.terraform.io/hashicorp/aws/
du -sh .terraform
terraform version
terraform providers
```

5. Add `provider "random" {}` to `main.tf`, run `terraform init` again, and watch a second plugin install (small this time). Notice you did not need `required_providers` for `random`: it is in the `hashicorp` namespace. Run `terraform providers` and check both are listed.
6. Remove the `random` line again when you are finished.

### Lab 2 — Authenticate without any secrets in the code

Prerequisite: an IAM user with access keys (see [Lesson 00](00-prerequisites.md)) and the AWS CLI installed.

1. Create `iam.tf` in a new folder:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_user" "demouser" {
  name = "tf-demo-user"
}
```

2. Make sure no credentials are available, then run `terraform init` and `terraform plan` to see the **"no valid credential sources"** error. (If your machine is already configured, you can simulate it by temporarily setting `AWS_SHARED_CREDENTIALS_FILE=/nonexistent` in the shell.)
3. Run `aws configure`, enter your keys, region `us-east-1`, output `json`.
4. `terraform plan` now shows `Plan: 1 to add`.
5. `terraform apply -auto-approve` and confirm the user in the IAM console.
6. **Variation (environment variables):** temporarily rename `~/.aws/credentials`, then:

```bash
export AWS_ACCESS_KEY_ID="<your key id>"
export AWS_SECRET_ACCESS_KEY="<your secret>"
terraform plan        # works again, credentials came from the environment
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
```

   Restore the renamed file afterwards.
7. Cleanup: `terraform destroy -auto-approve`.

### Lab 3 — Version constraints and the lock file (no resources)

1. New folder, file `versions.tf`:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

2. `terraform init`. Open `.terraform.lock.hcl` and note `version`, `constraints` and `hashes`.
3. Change the constraint to `"~> 4.0"` and run `terraform init`. Read the error. It tells you to use `-upgrade`.
4. Run `terraform init -upgrade`. Compare the lock file: version is now a 4.x release, constraints `~> 4.0`.
5. Change to `">= 5.0, < 5.50"`. Run `terraform init -upgrade` and note which version was selected (the newest below 5.50).
6. Now try the delete-the-lock-file route: `rm .terraform.lock.hcl && terraform init`, and compare with `-upgrade`.
7. Set `version = "~> 5.0"` again, run `terraform init -upgrade`, then run `terraform init` once more. Notice that plain `init` keeps the locked version even if a newer one exists.
8. Commit-readiness check: which of `.terraform/` and `.terraform.lock.hcl` should go into Git? (Answer: only the lock file.)

### Lab 4 — Two regions with `alias` (free)

1. New folder, file `multi-provider.tf`:

```hcl
provider "aws" {
  region = "ap-southeast-1"
}

provider "aws" {
  alias  = "mumbai"
  region = "ap-south-1"
}

provider "aws" {
  alias  = "usa"
  region = "us-east-1"
}

resource "aws_security_group" "sg_1" {
  name     = "prod_firewall"
  provider = aws.usa
}

resource "aws_security_group" "sg_2" {
  name     = "staging_firewall"
  provider = aws.mumbai
}

resource "aws_security_group" "sg_3" {
  name = "default_region_firewall"
}
```

2. `terraform init`, `terraform validate`, `terraform apply -auto-approve`.
3. In the AWS console, check each region: `prod_firewall` in N. Virginia, `staging_firewall` in Mumbai, `default_region_firewall` in Singapore.
4. Break it on purpose, one at a time, and read the error, then undo:
   - remove the `alias` line from the Mumbai provider -> `Duplicate provider configuration`,
   - rename `sg_2` to `sg_1` -> `Duplicate resource "aws_security_group" configuration`,
   - remove `provider = aws.usa` from `sg_1`, run `terraform plan` -> Terraform now wants to replace it in the default region.
5. Cleanup: `terraform destroy -auto-approve`.

> If your account has no default VPC in one of the regions, a security group may need `vpc_id`. Default VPCs exist in new accounts, so you normally do not hit this.

### Lab 5 (optional) — GitHub repository

1. Create a fine-grained token as in [section 5.2](#52-getting-a-token). Export it rather than writing it in a file:

```bash
export GITHUB_TOKEN="<your token>"
```

2. File `github.tf` (note: no token in the provider block now):

```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 5.0"
    }
  }
}

provider "github" {}

resource "github_repository" "example" {
  name        = "tf-example"
  description = "Created by Terraform"
  visibility  = "private"
}
```

3. `terraform init`, `terraform plan`, `terraform apply`, check GitHub, then `terraform destroy` and revoke the token.
4. Remove the `required_providers` block and run `terraform init` to reproduce the "failed to query available providers" error, then restore it.

---

## 🎯 Exam focus (summary)

- **Provider = a plugin that lets Terraform manage an external API.** Installed by `terraform init` into `.terraform`.
- After adding a new provider, run `terraform init` again.
- Resource identifier = `<type>.<local_name>`; must be unique. The type comes from the provider; the local name is yours.
- Three tiers: **official** (HashiCorp, namespace `hashicorp`), **partner** (a technology company in partnership), **community** (individuals). Prefer official and partner in production; be careful with community.
- Provider source address: `[hostname/]namespace/type`; default hostname `registry.terraform.io`.
- **Non-HashiCorp providers need `required_providers` with `source`.** HashiCorp providers do not, but you use `required_providers` to pin versions.
- `source` goes in `required_providers`, never in the `provider` block. A `version` argument in the provider block is deprecated.
- `required_version` limits the **Terraform CLI**; `required_providers` limits **providers**.
- Never hard-code credentials. AWS provider options: static keys (bad), shared files (default `~/.aws/credentials` and `~/.aws/config`), explicit shared file paths, environment variables, assumed IAM role. `aws configure` writes the default files.
- Providers and Terraform are versioned independently. No constraint means the newest provider is installed at the first `init`.
- Constraint operators: `=`, `>=`, `<=`, `~>` and comma ranges (also `!=`, `>`, `<`). `~> 2.0` means any 2.x. Terraform picks the newest version that satisfies the constraint.
- `.terraform.lock.hcl` is created by `init`, stores provider version, constraints and hashes, tracks **only providers (not remote modules)**, should be **committed**, and is overridden with `terraform init -upgrade`. It is not the state lock.
- `alias` allows multiple configurations of one provider; select with `provider = aws.<alias>`. Un-aliased block = default. Two un-aliased blocks = `Duplicate provider configuration`.
- Same workflow for every provider; core syntax is provider-agnostic.

## Key takeaways

1. Providers are the plugins that give Terraform knowledge of each platform. Terraform core stays the same; providers change per platform.
2. `terraform init` downloads providers into `.terraform` and writes the lock file. Run it again whenever you add a provider.
3. `required_providers` says which plugin, from where (`source`), and which versions. It is mandatory for non-HashiCorp providers.
4. Official, partner and community tiers tell you who maintains a provider and how much to trust it.
5. Keep secrets out of code: configure `aws configure` (or environment variables / roles) and keep only `region` in the provider block.
6. Pin provider versions in production, and commit `.terraform.lock.hcl` so every machine uses the same provider build.
7. To change a locked version, edit the constraint and run `terraform init -upgrade`.
8. Use `alias` plus `provider = type.alias` when one configuration must span regions or accounts.

## Quick commands / syntax cheat-sheet

```bash
terraform init                    # install providers, create/read .terraform.lock.hcl
terraform init -upgrade           # re-select provider versions within constraints, rewrite lock file
terraform version                 # Terraform + installed provider versions
terraform providers               # list providers required by the configuration
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64   # record hashes for several platforms
aws configure                     # writes ~/.aws/credentials and ~/.aws/config
```

```hcl
terraform {
  required_version = ">= 1.5"                 # Terraform CLI constraint

  required_providers {
    aws = {
      source  = "hashicorp/aws"               # namespace/type
      version = "~> 5.0"                      # any 5.x
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"   # needed: not in the hashicorp namespace
      version = ">= 2.10, <= 2.30"            # range
    }
  }
}

provider "aws" {
  region = "us-east-1"                        # default configuration
}

provider "aws" {
  alias   = "mumbai"                          # extra configuration
  region  = "ap-south-1"
  profile = "account02"                       # optional: different credentials profile
}

resource "aws_security_group" "sg" {
  name     = "staging_firewall"
  provider = aws.mumbai                       # <type>.<alias>, unquoted
}
```

| Constraint | Meaning |
|---|---|
| `"3.27.0"` or `"= 3.27.0"` | exactly 3.27.0 |
| `">= 1.0"` | 1.0 or newer |
| `"<= 1.0"` | 1.0 or older |
| `"~> 2.0"` | `>= 2.0, < 3.0` |
| `"~> 2.0.1"` | `>= 2.0.1, < 2.1.0` |
| `">= 2.10, <= 2.30"` | between 2.10 and 2.30 |
| `"!= 2.5.0"` | anything except 2.5.0 |

## ❓ Quiz

1. What is a Terraform provider, in one sentence?
2. Which command downloads provider plugins, and into which directory does it put them?
3. You add `provider "digitalocean" {}` to a configuration and run `terraform init`. It fails to find `hashicorp/digitalocean`. What is missing and where does it go?
4. Name the three provider tiers and say who maintains each. In which namespace do official providers live?
5. In `resource "aws_instance" "myec2" {...}`, which part can you rename freely, and which part is fixed by the provider? What must be unique?
6. Which of these keeps AWS credentials out of your code and works for the whole team without agreeing on file locations: (a) `access_key`/`secret_key` in the provider block, (b) `shared_credentials_files` with a custom path, (c) `aws configure` plus a provider block containing only `region`?
7. `terraform plan` says "no valid credential sources for AWS Provider found". What does this mean and what are two ways to fix it?
8. A configuration has `version = "~> 3.0"` for the AWS provider. Which of these versions can Terraform select: 3.0.0, 3.27.0, 3.99.9, 4.0.0, 2.70.0?
9. With constraint `>= 2.10, <= 2.30` and many releases available, which version does `terraform init` install?
10. You have a lock file recording AWS provider 3.27.0 and you change the constraint to `~> 2.0`. What happens on `terraform init`, and what are two ways to continue?
11. What three kinds of information does an entry in `.terraform.lock.hcl` hold? Does the file also lock versions of remote modules?
12. A new teammate clones your repo, which includes `.terraform.lock.hcl`, and runs `terraform init`. A newer provider version matching your constraint was released last week. Which one do they get?
13. Is `.terraform.lock.hcl` the file that prevents two people from running `apply` on the same state at the same time?
14. Your file has one `provider "aws" { region = "us-east-1" }` and a second `provider "aws" { region = "ap-south-1" }`. What happens on `terraform validate`, and how do you fix it?
15. You define `provider "aws" { alias = "mumbai" region = "ap-south-1" }` (written on separate lines) and a default `provider "aws"` in `ap-southeast-1`. A security group resource has no `provider` argument. Where is it created? What line would put it in Mumbai?

### Answers

1. A plugin that lets Terraform manage an external API (AWS, GitHub, and so on).
2. `terraform init`; into the hidden `.terraform` directory in the working folder (under `.terraform/providers/<hostname>/<namespace>/<type>/<version>/<os_arch>/`).
3. The `source` for the provider. DigitalOcean is a partner provider, not in the default `hashicorp` namespace. Add a `required_providers` block inside `terraform {}` with `source = "digitalocean/digitalocean"`. It cannot go in the `provider` block.
4. Official (HashiCorp), partner (a technology company in partnership with HashiCorp), community (individual contributors). Official providers use the `hashicorp` namespace.
5. The local name (`myec2`) is yours to choose; the resource type (`aws_instance`) is fixed by the provider. The combination `aws_instance.myec2` must be unique.
6. (c). (a) is insecure and gets committed. (b) keeps keys out of the code but each team member may store the files somewhere else, so paths must be standardised. The default location is found automatically.
7. Terraform found no credentials in the provider block, environment variables or shared files. Fix by running `aws configure` (writes `~/.aws/credentials`), or by exporting `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (also valid: a named profile, or an assumed role).
8. 3.0.0, 3.27.0 and 3.99.9. Not 4.0.0 (major changes) and not 2.70.0 (lower than 3.0). `~> 3.0` means `>= 3.0, < 4.0`.
9. The newest version that satisfies the range, 2.30.0 in the lecture (the highest version not above 2.30). Terraform picks the newest satisfying version, not the oldest.
10. `init` fails because the locked version 3.27.0 does not satisfy `~> 2.0`, and it tells you to use `terraform init -upgrade`. Either run `terraform init -upgrade` (re-selects within the constraint and rewrites the lock file) or delete the lock file and run `terraform init` again.
11. The selected exact `version`, the `constraints` from your configuration, and `hashes` (checksums). No. The lock file only tracks providers. Remote modules always get the newest version that satisfies their constraint.
12. The version recorded in the lock file, not the newer one. Plain `init` re-selects the locked version. Only `terraform init -upgrade` (after which you commit the updated lock file) moves to the newer one.
13. No. `.terraform.lock.hcl` is the **dependency lock file** that pins provider versions. State locking is done by the backend (see [Lesson 10](10-backends-locking-drift.md)).
14. `Error: Duplicate provider configuration`. Two un-aliased blocks of the same type are not allowed. Give the second one an `alias`, for example `alias = "mumbai"`, and reference it with `provider = aws.mumbai`.
15. In the default configuration, Singapore (`ap-southeast-1`), because defining an alias alone does nothing. Add `provider = aws.mumbai` (unquoted) to the resource.

## Glossary

| Term | Meaning |
|---|---|
| **Provider** | A plugin that lets Terraform manage an external API |
| **Plugin** | A separate program Terraform downloads and runs to talk to a platform |
| **Registry** | `registry.terraform.io`, the public index of providers and modules |
| **Tier** | Official, partner or community: who maintains the provider |
| **Namespace** | The owner prefix in a provider address (`hashicorp`, `digitalocean`, `integrations`) |
| **Source address** | `[hostname/]namespace/type`, for example `hashicorp/aws` |
| **Local name** | The key you use for a provider in `required_providers`, and the name in `provider "..."` |
| **Resource type / local name** | The two labels of a resource block (`aws_instance`, `myec2`); the pair must be unique |
| **`required_providers`** | Block inside `terraform {}` declaring provider sources and version constraints |
| **Version constraint** | A rule such as `~> 2.0` describing which versions are acceptable |
| **Pessimistic constraint (`~>`)** | Allows only the right-most written number to increase |
| **Dependency lock file** | `.terraform.lock.hcl`: records the exact provider versions and hashes chosen at `init` |
| **`terraform init -upgrade`** | Re-selects the newest provider versions allowed by the constraints and rewrites the lock file |
| **Hash / checksum** | A value in the lock file used to verify the downloaded provider package |
| **`aws configure`** | AWS CLI command that writes `~/.aws/credentials` and `~/.aws/config` |
| **Alias** | Name for an extra configuration of the same provider; referenced as `<type>.<alias>` |
| **Default provider configuration** | A `provider` block without `alias`; used by resources that name no provider |
| **Meta-argument** | An argument available on many block types, such as `provider`, `count`, `depends_on` |
