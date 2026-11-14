# 05 — Resources, Data Sources, Dependencies and Provisioners

> **Exam domain(s):** Read, generate and modify configuration · Terraform configuration (resources, data, dependencies) · Provisioners (practical knowledge)   **Source:** lesson 3 (lectures 28, 30), lesson 4 (lectures 38–48, 66–70, 89, 95–96), lesson 5 (lectures 105–112 plus the repo's `null.md`)   **Time:** ~6–8 h (reading ~2.5 h, labs ~4 h)

## What you will learn

By the end of this chapter you will be able to:

- Read and write a `resource` block and explain its parts: resource type, local name, arguments, and the address `TYPE.NAME`.
- Explain what Terraform does when you add, change or remove a resource (create, update in place, destroy and re-create, destroy), and why a manual change in the console gets reverted.
- Build an AWS security group with separate ingress and egress rule resources, an Elastic IP, and wire them together.
- Tell **arguments** (inputs you set) from **attributes** (values the provider returns and stores in state) and find both in the provider documentation.
- Reference one resource's attribute from another (`aws_eip.lb.public_ip`), combine it with text using string interpolation (`"${...}/32"`), and explain why that creates an **implicit dependency**.
- Use **data sources** (`data` blocks) to read information that lives outside your configuration, such as "the latest Amazon Linux AMI in this region", and use filters, `most_recent` and `owners`.
- Choose between **implicit** dependencies (a reference) and **explicit** dependencies (`depends_on`) and predict the creation and destruction order.
- Use **provisioners**: `local-exec`, `remote-exec` and `file`, the `connection` block, `self`, creation-time vs destroy-time provisioners, `on_failure`, tainting, and `null_resource`.
- Troubleshoot the classic provisioner failures (SSH key errors, missing `sudo`, port 22 closed, plan passes but apply fails).

---

## 🧠 Pre-concept

Think of a Terraform configuration as a **shopping list plus assembly instructions** for a house:

- A **resource** is one item on the list ("one security group", "one server"). You describe what you want; Terraform makes it exist.
- An **attribute** is a fact about an item that you only learn after it is built, like the street number of the new house. You could not write it on the list in advance, because the cloud decides it.
- A **reference** is a note that says "put the street number of house A on the delivery form for house B". Terraform sees the note, realises house A must be built first, and orders the work accordingly. That ordering rule is a **dependency**.
- A **data source** is a *lookup* rather than an order: "tell me the address of the existing shop that sells the newest paint". Nothing is built; you only read.
- A **provisioner** is a *handyman visit* after the item is built: "once the server exists, log in and install nginx". It is useful, but HashiCorp calls it a last resort because the handyman's work is not tracked in state the way the building is.

> **Where this fits:** the workflow commands (`init`, `plan`, `apply`, `destroy`) are in [03 — Core workflow](03-core-workflow.md). Providers and the registry are in [02 — Providers](02-providers.md). This chapter is about what goes *inside* the configuration files: the blocks that describe infrastructure and how they relate to each other.

---

## 1. Resource blocks

### 1.1 Anatomy of a resource block

A `resource` block describes **one infrastructure object** (or, with `count` / `for_each`, several) that belongs to a provider.

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

```text
resource   "aws_instance"   "myec2"   { ...arguments... }
   |             |             |
 keyword   RESOURCE TYPE   LOCAL NAME
           (fixed by the    (your choice, unique
            provider)        per resource type)
```

| Part | Can you change it? | Notes |
|---|---|---|
| `resource` | No | The block keyword. |
| Resource type (`aws_instance`) | **No**, it is defined by the provider and listed in its documentation | The prefix tells you the provider: `aws_`, `azurerm_`, `github_`, `digitalocean_`. |
| Local name (`myec2`) | **Yes**, any name you like | Only used **inside** Terraform to refer to this block. It is not the name AWS shows. |
| Arguments (`ami`, `instance_type`) | Yes, you set them | Which ones exist, and which are required, is in the provider docs (**Argument Reference**). |

Examples of resource types you will meet: `aws_instance` (EC2 server), `aws_security_group` (firewall), `aws_eip` (Elastic IP), `aws_iam_user` (IAM user), `aws_s3_bucket`, `github_repository`, `digitalocean_droplet`.

The **combination of resource type + local name is the resource's identifier (its address)** and must be **unique within the module**:

```text
aws_instance.myec2        <- <resource_type>.<local_name>
```

You use this address everywhere: to reference the resource (`aws_instance.myec2.id`), in `terraform state show`, in `-target`, in `depends_on`, and in plan output.

🎯 **Exam focus:** "A resource block declares an infrastructure object. Its address is `<type>.<name>`." Know which part you choose (the local name) and which part the provider decides (the type).

### 1.2 Experiment: duplicate local names fail

Two blocks may share a *type* but not a *type + name* pair:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}

resource "aws_instance" "myec2" {   # same type AND same name
  ami           = "ami-123"
  instance_type = "t3.micro"
}
```

`terraform plan` fails with an error saying the resource `aws_instance.myec2` was already declared. Rename the second block to `web` (`aws_instance.web`) and `plan` works and proposes two instances. Different configurations (different AMI, different size) therefore always need different local names.

> **Note:** the lesson's example also contains `access_key` / `secret_key` placeholders inside the `provider` block. Never hard-code real keys; see [02 — Providers](02-providers.md) for the proper authentication methods.

### 1.3 A resource only works with its own provider

A resource type belongs to **one** provider plugin. `aws_instance` can only be handled by the AWS plugin; installing the Azure plugin does not help. One working directory can contain several providers, so one configuration can create AWS and Azure and GitHub resources side by side.

**Do I have to relearn Terraform for every provider?** No. The syntax and concepts are identical. What differs per provider is the credentials, the resource types and their arguments, all found in the provider docs. The skill you need is **Terraform core + understanding the platform you manage** (if you must write Terraform for Azure, you must know how to create a VM in Azure by hand).

### 1.4 Same workflow, different provider: a GitHub repository

To prove that nothing changes between providers, the course creates a GitHub repository with Terraform. The recipe is always: **define the provider, supply credentials, pick a resource from the docs, then init, plan, apply.**

```hcl
terraform {
  required_providers {
    github = {
      source  = "integrations/github"   # partner-tier provider, namespace "integrations"
      version = "~> 5.0"
    }
  }
}

provider "github" {
  token = "your-token-here"   # placeholder: never commit a real token
}

resource "github_repository" "example" {
  name        = "example"
  description = "My awesome codebase"
  visibility  = "public"      # public or private
}
```

| Piece | Meaning |
|---|---|
| `required_providers { github = {...} }` | The GitHub provider is not in the `hashicorp` namespace, so you must say where to download it (`integrations/github`). Tiers and namespaces: [02 — Providers](02-providers.md). |
| `provider "github" { token = ... }` | The credential. The token is created in GitHub under Settings, Developer settings, Personal access tokens (fine-grained), with **Administration: read and write** to create repositories. |
| `resource "github_repository" "example"` | Type from the provider's **Resources** documentation, local name `example`. |

Then `terraform init`, `terraform plan` (1 to add) and `terraform apply`. The repository appears in your GitHub account; `terraform destroy` removes it.

⚠️ **Gotcha:** without `required_providers` and the `source`, `init` fails for GitHub, because Terraform assumes the `hashicorp` namespace. Also, multiple `.tf` files in the same folder are merged into one configuration: if `first_ec2.tf` and `github.tf` sit in one directory, `terraform destroy` removes **both** the instance and the repository.

> **Security reminder:** the token is placed in the file only to keep the demo short. Treat it like a password; prefer the `GITHUB_TOKEN` environment variable (extra context), and revoke it when finished.

### 1.5 How Terraform treats a resource: the four rules

A `resource` block says "I want this object to exist with these settings". When you run `apply`, Terraform compares the configuration with what it knows (state) and what exists, and applies four rules:

| # | Rule | Example |
|---|---|---|
| 1 | **Create** resources that are in the configuration but have no matching real object in state | You add a new block |
| 2 | **Destroy** resources that are in state but no longer in the configuration | You delete a block |
| 3 | **Update in place** resources whose arguments changed and can be changed without recreating | Changing a tag, or a security-group port from 22 to 80 |
| 4 | **Destroy and re-create** resources whose arguments changed but **cannot** be updated in place because of a limit in the remote API | Changing an EC2 AMI from Linux to Windows |

In plan output, rule 3 appears as `~` (update in place) and rule 4 as `-/+` (destroy and then create) with the attribute that caused it marked `# forces replacement`. See [03 — Core workflow](03-core-workflow.md) for how to read the plan.

#### Demo: rules 3 and 4 and "manual changes are reverted"

Base configuration:

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
}
```

1. `terraform apply -auto-approve` creates the instance. In the console you see the tag `Name = HelloWorld`.
2. **In-place update.** Change the tag value to `HelloEarth` and run `terraform plan`. The plan shows a modification (`HelloWorld` to `HelloEarth`); the instance is **not** replaced. Apply it and the console shows the new tag.
3. **Replacement.** Change `ami` to a Windows AMI ID. `terraform plan` now shows the instance will be **replaced** (`forces replacement`), because AWS cannot swap the operating system image of an existing instance. Revert the AMI afterwards.
4. **Manual change reverted.** In the AWS console, add a tag `Env = production` by hand. Run `terraform plan`: Terraform proposes to **remove** that tag because it is not in the configuration. `terraform apply` removes it and the console confirms.

**Why?** Terraform's default is "make the real world match the configuration, always". That is the heart of desired state vs current state (see [04 — State basics](04-state-basics.md)).

#### The limitation, and why meta-arguments exist

Sometimes something outside Terraform legitimately adds a tag and you do not want it reverted. That is the job of **meta-arguments**: special arguments you can put inside a resource block to change how Terraform treats that resource.

A first taste, using `lifecycle` (full coverage in [08 — Lifecycle, conditions, sensitive](08-lifecycle-conditions-sensitive.md)):

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-0f34c5ae932e6f0e4"
  instance_type = "t2.micro"

  tags = {
    Name = "HelloEarth"
  }

  lifecycle {
    ignore_changes = [tags]   # differences in "tags" are ignored
  }
}
```

With this `lifecycle` block, and a manual `Env = production` tag added in the console, `terraform plan` reports **no changes**. Remove the `lifecycle` block and plan again, and Terraform once more proposes to remove the tag.

### 1.6 Meta-arguments at a glance

| Meta-argument | Purpose (high level) | Where it is covered |
|---|---|---|
| `depends_on` | Explicit ordering between resources | [Section 7](#7-dependencies-implicit-and-explicit) of this chapter |
| `count` | Create several instances by number | [07 — Types, loops, functions](07-types-loops-functions.md) |
| `for_each` | Create several instances from a map or set | [07](07-types-loops-functions.md) |
| `lifecycle` | Customise create/update/destroy behaviour (`create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`) | [08](08-lifecycle-conditions-sensitive.md) |
| `provider` | Pick an alternate provider configuration for this one resource | [02 — Providers](02-providers.md) (multiple provider configs) |

⚠️ **Gotcha:** the `provider` **meta-argument** is not the same as the top-level `provider "aws" {}` **block**. The block configures a provider; the meta-argument selects which configuration a particular resource uses.

🎯 **Exam focus:** the five meta-arguments are `depends_on`, `count`, `for_each`, `lifecycle`, `provider`. They live **inside** resource blocks. Manual out-of-band changes are detected and reverted on the next apply unless you tell Terraform otherwise.

---

## 2. AWS building blocks used in the examples

The Terraform Associate exam is **provider-agnostic**. It tests Terraform concepts (state, variables, modules, workflow), not AWS. The course uses AWS only as a vehicle, and only four very basic services that exist in every cloud:

| # | Generic concept | AWS service | Used for |
|---|---|---|---|
| 1 | Virtual machine | EC2 (`aws_instance`) | A server to demonstrate features |
| 2 | Firewall | Security group (`aws_security_group` + rule resources) | Many demos that need rules |
| 3 | Users | IAM users (`aws_iam_user`) | Loops, `count`, `for_each`, provisioners |
| 4 | Public IP address | Elastic IP (`aws_eip`) | References, outputs, functions |

> Basic AWS set-up (account, IAM user, access keys, regions, billing alerts) is in [00 — Prerequisites](00-prerequisites.md). Use **one folder per practical** and **always `terraform destroy` when you finish**, so each practical has its own state and nothing is billed at the end of the month.

### 2.1 Background: ports, firewalls and security groups

If you already know AWS security groups, skip to [Section 3](#3-security-groups-with-terraform).

**Port.** A port is an *endpoint of communication used to identify a given application or process* on an operating system. When a service that serves clients starts (SSH, NGINX, Apache, vsftpd), it **opens (binds to) a port**. A client connects using `server-IP:port`.

```text
 Users on the internet                 Server  1.2.3.4
 ---------------------                 -------------------------------
                                       |  SSH daemon     -> port 22  |
   client ---- 1.2.3.4:22 -----------> |                             |
   client ---- 1.2.3.4:80 -----------> |  NGINX/Apache   -> port 80  |
                                       -------------------------------
```

| Software | Default port |
|---|---|
| SSH | 22 |
| HTTP web server (NGINX, Apache) | 80 |
| HTTPS | 443 |
| vsftpd (FTP) | 21 |

You can see what a Linux server is listening on with:

```bash
netstat -ntlp
```

(`-n` numeric, `-t` TCP, `-l` listening only, `-p` show the owning process.) On the demo server it shows nginx on port 80 and sshd on port 22. Browsing to `http://<public-ip>:80` works; `http://<public-ip>:22` fails because port 22 speaks SSH, not HTTP. Installing and starting `vsftpd` adds a new listener on port 21; the service's config decides which port it binds to.

**Firewall.** A firewall is a network security system that controls incoming and outgoing traffic according to rules. Typical need: the server runs SSH (22) and HTTP (80); you want the world to reach the website but not SSH.

```text
 User ---> [ FIREWALL ] ---> Server
              Rule 1: block port 22
              Rule 2: allow port 80
```

In AWS the firewall is the **security group**: a **virtual firewall** for an instance that controls inbound and outbound traffic.

| Direction | Terraform / CloudFormation term | Controls |
|---|---|---|
| **Inbound** | **ingress** | Who can connect **to** the server |
| **Outbound** | **egress** | Which remote systems the server can connect **to** |

Console behaviour you can try (EC2 > Security Groups):

| Step | Change to the inbound rules | Result |
|---|---|---|
| 1 | Remove the "all traffic from 0.0.0.0/0" rule | The website stops loading (if it still loads, it is browser cache; try another browser) |
| 2 | Add a rule: port 80, source 0.0.0.0/0 | The website loads immediately |
| 3 | (implied) SSH | Blocked, because only port 80 is allowed |

`0.0.0.0/0` means "all IPv4 addresses on the internet".

**Creating a security group by hand** (so you know what Terraform automates): EC2 console, Network & Security, Security Groups, Create. Give it a name (`myfirst.sg`) and a description; add an outbound rule (All traffic to `0.0.0.0/0`); add an inbound rule (a type preset such as SSH fills the port; **Custom TCP** lets you type any port; the source may be one IP such as `10.3.x.x/32` or a range); then attach it to the instance (Instance > Security tab > Change security groups > remove the auto-created group > add yours > **Add security group** > Save).

> Production note: do **not** open SSH (22) to the whole internet. Allow it only from your office network or, better, a VPN.

**Ping (ICMP) demo, and a classic mistake.** `ping <public-ip>` times out because there is no rule for it.

| Attempt | What was done | Result |
|---|---|---|
| 1 | ICMP rule added on the **outbound** tab | Still times out: wrong direction |
| 2 | ICMP rule deleted from outbound and added on the **inbound** tab from 0.0.0.0/0 | Ping works |

```text
 Someone connects TO my server    -> INBOUND  (ingress) rule
 My server connects OUT to others -> OUTBOUND (egress) rule
```

(Extra context: security groups are *allow lists*. There is no explicit deny rule; a connection is blocked simply because no rule allows it.)

---

## 3. Security groups with Terraform

### 3.1 Requirement

Create a security group named **`terraform-firewall`** with:

- **Inbound:** allow port **80** from `0.0.0.0/0`.
- **Outbound:** allow **all** traffic.

```text
           +-------------- terraform-firewall (SG) --------------+
 Internet  |  INBOUND : TCP 80   from 0.0.0.0/0                  |  Instance
 --------> |  OUTBOUND: ALL      to   0.0.0.0/0                  | ---------->
           +-----------------------------------------------------+
```

### 3.2 How to find the right Terraform code

1. AWS has hundreds of services, each with its own resource type. Search "terraform security group" and land on the registry page for `aws_security_group`: `registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group`.
2. Copy a documentation example into a new file and trim it to what you need.
3. To understand each argument, use the **documentation** (it marks required vs optional) or the **console form** (name, description, VPC ... map to arguments). If you can create it in the console, you can write it in Terraform.

You do not have to memorise resource syntax. Even experienced engineers copy it from the docs.

### 3.3 Step 1: the security group itself

`description` and `vpc_id` are optional (without `vpc_id` the **default VPC** is used); tags are dropped for simplicity.

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "allow_tls" {
  name        = "terraform-firewall"
  description = "Managed from Terraform"
}
```

| Part | Meaning |
|---|---|
| `provider "aws"` | Configures the AWS provider; `region` is where resources are created |
| `resource "aws_security_group" "allow_tls"` | Type `aws_security_group`, local name `allow_tls` (only used inside Terraform) |
| `name` | The name AWS shows (`terraform-firewall`) |
| `description` | Free text |

```bash
terraform init                    # only if there is no .terraform folder yet
terraform plan                    # Plan: 1 to add
terraform apply -auto-approve
```

In the console (EC2 > Security Groups, same region) the group exists but has **no inbound and no outbound rules**.

### 3.4 Step 2: the rules are separate resources

In the current AWS provider the group and its rules are **two different resource types**. The rule resources have their own docs pages: `aws_vpc_security_group_ingress_rule` ("Manages an inbound (ingress) rule for a VPC security group") and `aws_vpc_security_group_egress_rule`.

Full configuration (`firewall.tf`):

```hcl
provider "aws" {
  region = "us-east-1"
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
```

(The local name `allow_tls_ipv6` is a leftover from the docs example; the rule is actually IPv4. Local names are arbitrary labels.)

| Argument | Used in | Meaning |
|---|---|---|
| `security_group_id` | both | Which security group gets the rule. `aws_security_group.allow_tls.id` references the group above (see [Section 5](#5-attributes-and-cross-resource-references)) |
| `cidr_ipv4` | both | Source (ingress) or destination (egress) IPv4 range. `0.0.0.0/0` = everyone |
| `from_port` | ingress | Start of the port range |
| `to_port` | ingress | End of the port range |
| `ip_protocol` | both | `tcp`, `udp`, `icmp`, ... or **`-1` = all protocols** |

`ip_protocol = "-1"` means all protocols and therefore all ports, so the egress rule needs no `from_port`/`to_port`.

```bash
terraform plan                    # Plan: 3 to add (group + ingress rule + egress rule)
terraform apply -auto-approve
```

Console result: one inbound rule (port 80, 0.0.0.0/0) and one outbound rule (all traffic, all protocols, all ports, 0.0.0.0/0).

> The lesson states "2 to add" for the two rules when the group already exists from step 1. From an empty folder, the plan is **3 to add**.

⚠️ **Gotcha:** a security group created by Terraform with no egress rule has **no outbound access**. That is why the egress rule matters; for example, an instance in it could not download packages with `yum`. Keep this in mind for the `remote-exec` lab.

### 3.5 Port ranges: `from_port` and `to_port`

A customer may want a **range** (say 80 to 100). Creating 21 separate rules for 80, 81, ... 100 is impractical, so AWS supports a port range. Change only `to_port`:

```hcl
resource "aws_vpc_security_group_ingress_rule" "allow_tls_ipv6" {
  security_group_id = aws_security_group.allow_tls.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  ip_protocol       = "tcp"
  to_port           = 100      # range 80-100
}
```

`terraform apply -auto-approve` and the console shows **80 - 100**. To open a **single** port, set both to the same value.

(Do all edits through Terraform. If you edit the console by hand, you create drift; see [10 — Backends, locking, drift](10-backends-locking-drift.md).)

### 3.6 Demonstration: `security_group_id` decides where the rule goes

Because the group and rule are separate, the rule needs to know its group. Replace the reference with the **default** security group's ID (use your own; this one is a placeholder):

```hcl
security_group_id = "sg-0123456789abcdef0"   # placeholder: ID of the default SG
```

`terraform plan` shows **1 to add, 1 to destroy**: the rule is *replaced*, because a rule cannot be moved between groups in place. After apply, the rule is gone from `terraform-firewall` (it keeps its outbound rule) and appears in the default group. The rule is added to whichever group `security_group_id` points to.

### 3.7 Old inline style vs new rule resources

HashiCorp occasionally changes provider documentation. The same outcome can often be achieved in more than one way, and legacy code you inherit may not match today's examples.

| | **New (recommended) approach** | **Old approach** |
|---|---|---|
| Resource types | `aws_security_group` + `aws_vpc_security_group_ingress_rule` + `aws_vpc_security_group_egress_rule` | Only `aws_security_group` |
| Where rules live | Separate rule resources linked by `security_group_id` | Inline `ingress { }` and `egress { }` blocks inside the group |
| In the current docs example? | Yes | No (older docs only) |
| Still works with a new provider? | Yes | **Yes** (demonstrated with provider 5.38) |

Old approach (`old-approach-firewall.tf`):

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_security_group" "old_approach" {
  name        = "allow_tls"
  description = "Allow TLS inbound traffic"

  ingress {
    description = "TLS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.77.32.50/32"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}
```

Argument names differ between the two styles:

| Concept | Old inline block | New rule resource |
|---|---|---|
| Protocol | `protocol` | `ip_protocol` |
| IPv4 source/destination | `cidr_blocks = ["..."]` (a **list**) | `cidr_ipv4 = "..."` (a single **string**) |
| IPv6 | `ipv6_cidr_blocks` | `cidr_ipv6` (extra context) |
| Group link | implicit (inside the group) | `security_group_id = ...id` |

**Demo.** Rename the new-approach file to `firewall.tf.bak` (Terraform only loads files ending in `.tf` or `.tf.json`, so it ignores it), save the old-approach file as a `.tf` file, then `terraform init`, `plan`, `apply`. The group `allow_tls` is created with an inbound HTTPS rule (443 from 10.77.32.50/32) and an outbound rule. **The old approach still works with the newer provider.**

**Reading old docs.** Every Registry resource page has a **provider version selector**. Pick an older version (for example 5.31.0 instead of 5.38.0) and the examples change to the older style. The version appears in the URL:

```text
.../providers/hashicorp/aws/latest/docs/resources/security_group
.../providers/hashicorp/aws/<older-version>/docs/resources/security_group
```

Use this when you inherit legacy code written by someone who left the company.

Key points:

1. A newer recommended approach does **not** mean the older one stops working.
2. Large organisations often freeze Terraform and provider versions for **stability** (like staying on an operating system that works instead of upgrading without need).
3. Documentation is versioned per provider version.

⚠️ **Gotcha:** do not mix inline rules **and** separate rule resources for the *same* security group. The AWS provider treats the group's inline blocks as the full list of rules, so the two styles can fight each other and overwrite rules (extra context). Pick one style per group.

> **Up to date (TF 1.12):** the AWS provider has since moved to major version 6.x. Pinning provider versions with `required_providers` and `version` (and the lock file) is how you keep behaviour stable; see [02 — Providers](02-providers.md). The rule resources `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` remain the recommended approach.

---

## 4. Elastic IP

An **Elastic IP (EIP)** is a **static public IPv4 address** that you allocate in AWS and can optionally associate with an EC2 instance.

```text
  allocate EIP  ->  you get a public IP (e.g. 203.0.113.10)
                          |
                          |  (optional) associate
                          v
                    EC2 instance reachable at that IP
```

Console: EC2 > Elastic IPs > **Allocate Elastic IP address**. Association with an instance is a separate, optional step.

Terraform (`eip.tf`):

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_eip" "lb" {
  domain = "vpc"
}
```

The docs example has two arguments, `instance` and `domain`. `instance` is **optional** (we do not need association), so it is removed.

| Part | Meaning |
|---|---|
| `aws_eip` | Resource type for an Elastic IP |
| `lb` | Local name (from the docs example) |
| `domain = "vpc"` | The address is for use in a VPC. Older provider versions used `vpc = true`, which is now deprecated |

```bash
terraform plan                    # Plan: 1 to add
terraform apply -auto-approve
terraform destroy -auto-approve   # clean up
```

Verify in the console (the same region) that one Elastic IP exists, and that the same address is stored in `terraform.tfstate`. That sets up the next section.

💰 **Cost:** an **unused Elastic IP costs money**. Always destroy it, then refresh the console to confirm it is gone. `terraform destroy` removes only what is tracked in this directory's state; an EIP you allocated manually in the console is **not** touched.

---

## 5. Attributes and cross-resource references

### 5.1 Arguments vs attributes

Every resource has **attributes**: the fields that hold the values stored in the state file after the resource is created. Some are only known after creation, because the cloud decides them (an instance's `id`, its `public_ip`).

```text
 aws_instance created by Terraform
        |
        v   terraform.tfstate -> resource -> "attributes": {
        |        "id":          "i-0abc123..."
        |        "public_ip":   "203.0.113.25"
        |        "private_ip":  "10.0.1.15"
        |        "private_dns": "ip-10-0-1-15.ec2.internal"
        |        ... many more
        v    }
```

| | Argument | Attribute |
|---|---|---|
| Who sets it | **You**, in the resource block | The provider/API, often after creation |
| Docs section | **Argument Reference** | **Attribute Reference** |
| Example (`aws_eip`) | `domain = "vpc"` | `public_ip`, `id`, `public_dns` ... |
| Example (`aws_instance`) | `ami`, `instance_type` | `id`, `arn`, `public_ip`, `private_ip`, `instance_state` |

(Some arguments you set also appear as attributes in state.) Every resource documentation page lists both. Reading the Attribute Reference to find the right attribute name is the normal workflow.

🎯 **Exam focus:** do not confuse the **Argument Reference** (inputs you supply) with the **Attribute Reference** (values you can read). Attributes are stored in **state**, the source of truth for what Terraform knows about a resource.

### 5.2 Demo: attributes in the state file

`attributes.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_eip" "lb" {
  domain = "vpc"
}

resource "aws_instance" "web" {
  ami           = "ami-0440d3b780d96b29d"   # region-specific: use a valid AMI for YOUR region
  instance_type = "t2.micro"
}
```

```bash
terraform apply -auto-approve
```

Then open `terraform.tfstate`:

1. First resource: `"type": "aws_eip"`, `"name": "lb"`. In its `attributes` section, **`public_ip`** holds the Elastic IP. You can read it from state **without opening the AWS console**.
2. Second resource: `aws_instance` with its own `attributes` block. Compare with the console: `id` matches the instance ID, `public_ip` matches the public IP.

```bash
terraform destroy -auto-approve    # always clean up
```

> Reading raw JSON is the long way. Terraform has `terraform state list` and `terraform state show aws_eip.lb` for the same job; see [04 — State basics](04-state-basics.md).

⚠️ **Gotcha:** state files can contain sensitive data in attributes, so protect them (see [04](04-state-basics.md) and [10](10-backends-locking-drift.md)).

### 5.3 The problem: resource 2 needs a value from resource 1

In real configurations you define many resources (2, 15, 20 ...). Resource 2 may depend on a value that only exists **after** resource 1 is created.

Scenario: allow **port 443 from the Elastic IP's address** in a security group rule.

```text
   aws_eip (Elastic IP)  ----- public IP is known only AFTER creation
          |
          |  we want: security group rule that allows port 443 from THIS IP
          v
   aws_security_group + rule  (cidr_ipv4 = the EIP)
```

Bad idea: create the EIP, copy its IP by hand, and paste it into the rule. It is manual and does not scale. What we want: once the EIP exists, its `public_ip` is **automatically** used in the rule.

### 5.4 The solution: cross-resource attribute reference

**Syntax:**

```text
<resource_type>.<local_resource_name>.<attribute>

aws_eip.lb.public_ip
        |  |    |
        |  |    +-- attribute (from the Attribute Reference in the docs)
        |  +------- local name given in the resource block
        +---------- resource type
```

🎯 **Exam focus:** know `TYPE.NAME.ATTRIBUTE` by heart.

The reference file (`cross-reference-attributes.tf`):

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
```

There are **two** cross-references in this one file:

| Where | Reference | What it provides |
|---|---|---|
| `security_group_id` | `aws_security_group.example.id` | The group's ID (only known after the group exists) |
| `cidr_ipv4` | `aws_eip.lb.public_ip` (inside `"${...}/32"`) | The EIP's address (only known after the EIP exists) |

(The instructor poses spotting the second one as a quiz. The answer is `security_group_id`.)

### 5.5 Automatic ordering (implicit dependency)

Start from an empty folder and run `terraform apply -auto-approve`. Observed order:

```text
aws_eip.lb                                  creating... -> creation complete
aws_security_group.example                  creating... -> creation complete
aws_vpc_security_group_ingress_rule.example creating... -> creation complete
```

Terraform noticed that the rule **references** the EIP and the group, so it created those first. If it had tried the rule first, it would have failed because `id` and `public_ip` would not exist yet. This is an **implicit dependency**:

```text
  aws_eip.lb ───────────────┐
                            ├──> aws_vpc_security_group_ingress_rule.example
  aws_security_group.example ┘
```

In plan output such values show as `(known after apply)`.

### 5.6 Practical: a "plan passes, apply fails" lesson

Build the three resources by copying each docs example (`aws_eip`, `aws_security_group`, `aws_vpc_security_group_ingress_rule`), then:

- EIP: remove the optional `instance` argument.
- Security group: trim to the minimum and name it `attribute-sg`.
- Rule: keep `security_group_id` as a reference and set the port to **443**.
- **Local-name mismatch:** docs examples use different local names (`example` on one page, `allow_tls` on another). Your reference must use the local name you actually chose. Rename the resource or change the reference.
- For `cidr_ipv4`, the EIP attribute holding its public IPv4 is `public_ip`.

First (naive) version of the rule:

```hcl
resource "aws_vpc_security_group_ingress_rule" "example" {
  security_group_id = aws_security_group.example.id

  cidr_ipv4   = aws_eip.lb.public_ip      # <-- will FAIL on apply
  from_port   = 443
  ip_protocol = "tcp"
  to_port     = 443
}
```

```bash
terraform plan                   # Plan: 3 to add   <- looks fine
terraform apply -auto-approve
```

| Resource | Outcome |
|---|---|
| `aws_eip.lb` | Created |
| `aws_security_group.example` | Created |
| `aws_vpc_security_group_ingress_rule.example` | **Failed** |

The error (summarised) is `Invalid Attribute Value`: `cidr_ipv4` must be a valid IPv4 CIDR block representing a network address, and it prints the bare IP it received. In the console you now have "half" the infrastructure: the EIP and the group exist, but the group has no rule.

**Diagnosis.** A security group rule needs a **CIDR block**, not a bare address (the console says the same and suggests `/32`).

| Notation | Meaning |
|---|---|
| `203.0.113.10/32` | Exactly one IP address |
| `10.77.0.0/16` | A whole range (65,536 addresses) |
| `0.0.0.0/0` | Every IPv4 address |

The value needed is `<computed EIP> + "/32"`. Writing `aws_eip.lb.public_ip/32` directly is **not valid HCL**; the `/32` must be appended to the computed value as a string.

### 5.7 The fix: string interpolation

```hcl
cidr_ipv4 = "${aws_eip.lb.public_ip}/32"
```

How `"${ ... }"` works:

- Inside a quoted string, `${ expression }` is a **placeholder**.
- Terraform first **evaluates** the expression (reads the EIP's `public_ip`), converts it to text, **substitutes** it into the string, and then passes the final string (for example `203.0.113.10/32`) to the argument.

Re-run `terraform apply -auto-approve`: the EIP and group already exist, so only the rule is created. In the console the rule's source is the EIP followed by `/32`.

**Prove a clean first apply.** The instructor then ran `terraform destroy -auto-approve` followed by `terraform apply -auto-approve`, so everything was created in **one** run. Running apply repeatedly until it works does no harm, but production code is expected to create the whole configuration in one run.

**When is interpolation needed?** When you **combine** a computed value with other text:

```hcl
security_group_id = aws_security_group.example.id        # whole value is the reference: no ${} needed
cidr_ipv4         = "${aws_eip.lb.public_ip}/32"          # reference + literal text: use interpolation
```

> **Up to date (TF 1.12):** in Terraform 0.12 and later a lone expression such as `aws_eip.lb.public_ip` needs no quotes or `${}`. Wrapping a lone reference as `"${aws_eip.lb.public_ip}"` is old style and unnecessary.

### 5.8 The older variant: instance + EIP association

The repo also has an older example (`reference.tf`) combining an instance, an EIP association and an inline-style security group:

```hcl
provider "aws" {
  region = "us-west-2"
  # access_key / secret_key placeholders removed: never hard-code credentials
}

resource "aws_instance" "myec2" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = "t2.micro"
}

resource "aws_eip" "lb" {
  domain = "vpc"
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.myec2.id
  allocation_id = aws_eip.lb.id
}

resource "aws_security_group" "allow_tls" {
  name = "kplabs-security-group"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["${aws_eip.lb.public_ip}/32"]

    # cidr_blocks = [aws_eip.lb.public_ip/32]   # INVALID: not a valid expression
  }
}
```

- `aws_eip_association` ties an EIP to an instance with two more cross-references: `instance_id = aws_instance.myec2.id` and `allocation_id = aws_eip.lb.id`.
- The commented line shows the same mistake as before (appending `/32` outside a string).
- In some provider versions you may need `vpc_id = <your default VPC ID>` on `aws_security_group`, and the older `vpc = true` was replaced by `domain = "vpc"`.

### 5.9 Lessons from this section

| Lesson | Detail |
|---|---|
| `plan` success does not guarantee `apply` success | The plan cannot know computed values (the EIP) or validate them against the cloud API |
| A partial apply leaves half the infrastructure | Resources created before the failure stay (state records them); fix the code and re-apply and Terraform continues |
| Rules need a CIDR, not a bare IP | Use `/32` for a single IPv4 address |
| Use `${}` to embed expression results in strings | Terraform evaluates, substitutes, then passes the result |
| A reference creates an implicit dependency | No `depends_on` needed here |

🎯 **Exam focus:** expect questions about what happens when a resource fails mid-apply (successfully created resources remain in state and the next apply resumes), the `${}` syntax, and the fact that references build the dependency graph.

### 5.10 Outputs as a demo of attributes

Without outputs, after creating an EIP the CLI does not show you the IP; you would open the console and copy it. An **`output` block** prints chosen information after `apply`. (The full treatment of outputs, `terraform output`, `sensitive` and so on is in [06 — Variables, outputs, locals](06-variables-outputs-locals.md). Here we use outputs to show attribute references.)

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_eip" "lb" {
  domain = "vpc"
}

output "public-ip" {
  value = aws_eip.lb.public_ip
}
```

Adding the `output` block to an already-applied configuration changes nothing in AWS. Running apply again prints:

```text
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.

Outputs:

public-ip = "203.0.113.10"
```

The `value` can be any expression. Three variants shown in the course:

| Variant | `value` | What you get |
|---|---|---|
| 1 | `aws_eip.lb.public_ip` | Only the IP |
| 2 | `"https://${aws_eip.lb.public_ip}:8080"` | A custom string built with interpolation: `public-ip = "https://203.0.113.10:8080"` |
| 3 | `aws_eip.lb` | **All** attributes of the resource (`id`, `public_ip`, `public_dns`, `allocation_id`, `domain` ...) printed as an object |

Outputs are also recorded in the state file under `outputs`:

```json
"outputs": {
  "public-ip": {
    "value": "203.0.113.10",
    "type": "string"
  }
}
```

(Structure illustrative; the exact JSON varies.) Because outputs are stored in state, other configurations or modules can consume them; see `terraform_remote_state` in [10](10-backends-locking-drift.md).

🎯 **Exam focus:** `output "<name>" { value = <expression> }`; outputs are printed after `apply` and stored in state; available attribute names come from the resource's **Attribute Reference**.

---

## 6. Data sources

### 6.1 What a data source is

A **data source** lets Terraform **use or fetch information defined outside of Terraform**: something created by another team, by hand, by another Terraform project, or simply a fact about the provider ("the latest AMI in this region"). It makes your code more flexible and portable.

```text
 Terraform code
 ┌──────────────────────────┐
 │ data "..." "x" { ... }   │──── queries ───►  Provider / external source
 │                          │◄─── returns ───   (AWS, DigitalOcean, local file, ...)
 │ resource "..." "y" {     │
 │   arg = data....attr     │   (info passed to a resource block or an output)
 │ }                        │
 └──────────────────────────┘
```

Key facts:

- A `data` block **reads**; it does **not create** infrastructure.
- The fetched information is stored in the **state file**.
- In CLI output you see `Reading...` then `Read complete after Ns` instead of `Creating...`.
- `terraform apply` on a configuration with only data blocks finishes with "0 added".
- Data sources work for **any provider**.

| | `resource` block | `data` block |
|---|---|---|
| Purpose | **Create and manage** an object | **Read** an existing object or fact |
| Docs section | **Resources** | **Data Sources** |
| CLI wording | `Creating...` / `Creation complete` | `Reading...` / `Read complete` |
| Reference | `TYPE.NAME.ATTRIBUTE` | **`data.TYPE.NAME.ATTRIBUTE`** |
| Destroyed by `terraform destroy`? | Yes | Nothing real to destroy (it is only removed from state) |

(Extra context: Terraform normally reads data sources during **plan**. If a data block's arguments depend on a value that is not known until apply, or the block has a `depends_on` on something that still has pending changes, the read is deferred to apply and its values show as `(known after apply)`.)

### 6.2 Where to find data sources: the docs

Almost every provider's documentation has two sections:

| Section | Purpose |
|---|---|
| **Resources** | Things Terraform can **create** |
| **Data Sources** | Things Terraform can **read** |

```text
Provider docs (e.g. AWS -> EC2)
├── Resources
│     aws_ami, aws_instance, aws_eip, ...        <- create
└── Data Sources
      aws_ami, aws_instance, aws_instances, ...  <- read
```

Both sections may contain the **same name**, for example `aws_ami`: the *resource* creates an AMI (an operating system image) and the *data source* fetches the ID of an existing registered AMI. They are different docs pages with different purposes. Azure and GCP docs have the same structure. How to use the docs:

1. Decide what information you need (an IP, an AMI ID).
2. Find the service in the provider docs (AWS docs are organised by category, e.g. compute, then EC2).
3. Open the **Data Sources** subsection, not Resources.
4. Read the description and the references. For a data source, **arguments are inputs/filters** and **attributes are what is exported** after the read.

### 6.3 Three first examples

**Example 1: a DigitalOcean account (any provider works).**

```hcl
terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

provider "digitalocean" {
  token = "your-token-here"   # placeholder: never commit a real token
}

data "digitalocean_account" "example" {}
```

| Piece | Meaning |
|---|---|
| `required_providers` | DigitalOcean is not a HashiCorp provider, so its source must be declared |
| `provider "digitalocean"` | Credentials Terraform uses |
| `data "digitalocean_account" "example" {}` | `data` + data source type + local name; reads the account information |

`terraform init`, then `terraform apply -auto-approve`. The output shows `Reading...` / `Read complete`; no resources are created. Open `terraform.tfstate` and you will see what was fetched (droplet limit, email, email-verified flag, floating-IP limit, status ...), matching the data source's attribute list in the docs. A DigitalOcean account is not needed to follow the idea.

**Example 2: read a local file.**

```hcl
data "local_file" "foo" {
  filename = "${path.module}/demo.txt"
}

output "data" {
  value = data.local_file.foo.content
}
```

- `local_file` data source: *Reads a file from the local file system.* It belongs to the `local` provider, so run `terraform init` first.
- `demo.txt` contains `Hello World. I am learning Data Sources.`
- Rename earlier example files to `.bak` so they do not interfere.
- The next `apply` prints the file's text through the output. The attribute holding the text is `.content`.
- **Reference format:** `data.<TYPE>.<NAME>.<ATTRIBUTE>`, here `data.local_file.foo.content`. Without the `data.` prefix you would be referencing a *resource*.

**What is `path.module`?** The file system path of the module (folder) in which the expression is written, so you do not hard-code an absolute path such as `C:\Users\...\demo.txt`. For a configuration in the current directory it points to that folder. (Extra context: `path.root` is the root module's directory and `path.cwd` the directory you ran Terraform from.)

**Example 3: EC2 instances in a region.**

```hcl
provider "aws" {
  region = "us-east-1"
}

data "aws_instances" "example" {}
```

1. `terraform init` (installs the AWS plugin) and `terraform apply -auto-approve`.
2. With **no running instances** in the region the state shows empty values for `ids`, `instance_tags` and so on. The read succeeds but finds nothing.
3. Launch two test instances in the console, wait until `running`, then `terraform apply -auto-approve` again.
4. `terraform.tfstate` now lists both instance IDs, private IPs and public IPs. Terraform created nothing.

The **region** matters: the provider block decides where the data source looks.

**Where the data goes next.** The information read by a data block can be handed to other blocks: `output` blocks (as in example 2) or `resource` blocks. Feeding a resource is the main use case (see 6.6).

### 6.4 Data source format and filters

```hcl
data "<DATA_SOURCE_TYPE>" "<LOCAL_NAME>" {
  # optional arguments / filters (query constraints)
}
```

A data source is accessed through a special kind of resource called a **data resource**, declared with a `data` block. To use its information elsewhere, reference `data.<type>.<name>.<attribute>`.

A one-line block is not enough in a big environment: a region may have hundreds of servers, so *which* one do you want? Inside the braces you add **arguments and filters** to narrow the match.

```hcl
provider "aws" {
  region = "us-east-1"
}

data "aws_instance" "example" {
  filter {
    name   = "tag:Team"
    values = ["Production"]
  }
}
```

| Piece | Meaning |
|---|---|
| `provider "aws" { region = ... }` | Region to search in |
| `data "aws_instance" "example"` | Data source type `aws_instance`, local name `example` |
| `filter { name = "tag:Team" values = [...] }` | Match instances whose `Team` tag has one of the given values |

The filter `name` is `tag:<tagKey>`; `values` is a **list**. Filter values must match the stored tag value exactly (case-sensitive), so use whatever your tag actually contains.

**Demo scenario.** Two instances in `us-east-1`: one with tag `Team = staging`, one with `Team = production`. Goal: get full details (IP, AMI, ARN ...) for the production one.

1. `data "aws_instance" "example" {}` with **no filter** fails: `multiple EC2 instances matched; use additional constraints to reduce matches to a single EC2 instance`. `aws_instance` (singular) reads **one** instance, so it needs constraints that match exactly one.
2. `data "aws_instances" "example" {}` (plural) works with many instances but returns **less detail**: IDs, private IPs, public IPs.
3. Back to singular with the `tag:Team` filter: apply succeeds and `terraform.tfstate` now contains the AMI, ARN and much more for that single instance.

| | `aws_instance` | `aws_instances` |
|---|---|---|
| Returns | **One** instance | **Many** (lists) |
| Detail | Very detailed (AMI, ARN, tags, IPs ...) | Limited (IDs, private IPs, public IPs ...) |
| Needs a filter if several exist? | **Yes**, otherwise "multiple EC2 instances matched" | No |
| Typical use | Everything about a specific server | IDs or IPs for a group of servers |

Always read each data source's **description** and **attribute reference**, so you know what ends up in the state file.

### 6.5 Use case: fetch the latest OS image

**Requirement:** "Create a server using the **latest** operating system image."

**Naive approach:** open the EC2 console, launch wizard, copy the AMI ID, hard-code it:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-xxxxxxxx"   # copied from the console
  instance_type = "t2.micro"
}
```

Problems with hard-coded values (avoid them in production; otherwise you keep editing the code):

1. **AMI IDs are region-specific.** The same latest OS image has a different ID in every region (Mumbai, Singapore and Tokyo all differ for Ubuntu).
2. **Images get newer.** The AMI you copied today is not the latest tomorrow.

**Demonstration of the failure.** Hard-code the `us-east-1` AMI ID: works. Change the provider to `ap-south-1` (Mumbai) and run `terraform plan`: the plan looks **fine** (Terraform does not validate AMI existence at plan time). `terraform apply` then **fails** with an invalid AMI ID / not found error, because that ID does not exist in Mumbai.

**Solution:** ask AWS for the latest image and pass the result to the EC2 resource.

```text
 provider region ──► data "aws_ami"  ──(AMI ID)──►  resource "aws_instance"
                     filters: owner, name,            ami = data.aws_ami.x.image_id
                     most_recent
```

### 6.6 Practical: latest AMI with a data source

Finding the right data source: AWS provider docs, EC2, **Data Sources**, `aws_ami` (not the resource of the same name). Description: *use this data source to get the ID of a registered AMI for use in other resources.* In the EC2 console, AMIs, switch "Owned by me" to **Public images** and add the filter **Owner alias = amazon** to see Amazon-owned images.

Final code from the lecture (Ubuntu):

```hcl
provider "aws" {
  region = "ap-south-1"
}

data "aws_ami" "myimage" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.myimage.image_id
  instance_type = "t2.micro"
}
```

| Argument | What it does |
|---|---|
| `data "aws_ami" "myimage"` | Data source type `aws_ami`, local name `myimage` (any name) |
| `most_recent = true` | If several images match the filters, pick the **newest** |
| `owners = ["amazon"]` | Only consider images owned by Amazon. Always restrict owners: safer and faster |
| `filter { name = "name" values = [...] }` | Match images whose AMI **name** fits the pattern |
| trailing `-*` in `values` | **Wildcard** for the date/build stamp. AWS publishes patched images with the same OS but a newer creation date and new ID; the wildcard lets each new build match |
| `ami = data.aws_ami.myimage.image_id` | Reference to the attribute holding the AMI ID (the docs list both `id` and `image_id`; the lecture used `image_id`) |

> **Possible error in the lesson notes:** Ubuntu images are published by **Canonical** (owner ID `099720109477`), not by Amazon, so `owners = ["amazon"]` combined with an Ubuntu name pattern may match nothing in your account. If you get `Your query returned no results`, use `owners = ["099720109477"]` for Ubuntu. For Amazon's own images (Amazon Linux, Windows Server), `owners = ["amazon"]` is correct. The Amazon Linux example below is safe to use.

Safe variant for the labs (Amazon Linux 2023, x86):

```hcl
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}
```

**Walkthrough as in the video**

1. In the AMI list, note the naming structure: Ubuntu 22.04 is `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-...`; Amazon Linux 2023 is like `al2023-ami-2023...`. Build the pattern from the fixed part and wildcard the date suffix.
2. Write `data "aws_ami"` with `most_recent`, `owners` and the filter, plus `provider "aws"` with `region = "us-east-1"` for a first test.
3. `plan` still shows the old hard-coded AMI until you change the resource. Replace it with `data.aws_ami.myimage.image_id`.
4. `terraform plan` now shows the AMI populated automatically from AWS (a more recent build than the one first copied by hand).
5. Change the provider region to `ap-south-1`: `plan` shows a **different** AMI ID automatically, with no edits to the resource. That is the portability we wanted.
6. `terraform apply -auto-approve`. The first attempt **failed**:

   ```text
   Error: InvalidParameterValue: The architecture of the specified instance type does not match the architecture 'arm64' of the specified AMI.
   ```

   Cause: the first pattern was `...ubuntu-jammy-22.04-arm64-server-*`. ARM AMIs cannot run on `t2.micro` (x86).
7. Fix: use `...ubuntu-jammy-22.04-amd64-server-*` (architecture `x86_64`), apply again, success.

⚠️ **Gotchas**

- **Architecture must match the instance type.** `t2.micro` is x86_64, so use `amd64`/`x86_64` AMIs. An `arm64` AMI needs Graviton instance types such as `t4g.*` (extra context).
- `most_recent = true` is needed to avoid an error when multiple AMIs match.
- Make the filter specific enough (owner + name pattern) to get the OS you really want.
- If a newer image appears later, the next apply **replaces** the instance, because `ami` is a force-new argument (extra context). Teams that dislike that pin the AMI or use `lifecycle { ignore_changes = [ami] }` (see [08](08-lifecycle-conditions-sensitive.md)).
- Remember to destroy the instance afterwards.

🎯 **Exam focus**

- `data "aws_ami"` + `most_recent = true` + `owners` + `filter` + `data.aws_ami.<name>.image_id` is the standard "latest image" pattern.
- A data source lets the same code work across regions without hard-coded IDs.
- Data sources **read**; resources **create**. Reference with `data.<type>.<name>.<attribute>`.
- A singular data source that matches several objects errors out; narrow it with filters.
- `plan` can succeed even when a hard-coded AMI is invalid for the region; the error appears at `apply`.

---

## 7. Dependencies: implicit and explicit

### 7.1 Why order matters

Terraform builds a **dependency graph** of your resources and creates independent ones **in parallel**. If two resources have no relationship in the configuration, **there is no guaranteed order**. Usually that is fine, and it is what makes Terraform fast. But some resources need another to exist first.

**Scenario.** An application on an EC2 instance must store data in an **S3 bucket** before it can initialise. By hand you would obviously create the bucket first. In Terraform, defined side by side with nothing linking them, the instance might come up first and the app would fail to find its storage.

### 7.2 Two kinds of dependency

| Kind | How declared | Example |
|---|---|---|
| **Implicit** | Reference an attribute of another resource | `vpc_security_group_ids = [aws_security_group.prod.id]` |
| **Explicit** | The `depends_on` meta-argument | `depends_on = [aws_s3_bucket.example]` |

### 7.3 Explicit dependency: `depends_on`

`depends_on` tells Terraform to complete all actions on the listed dependency **before** performing actions on the resource that declares it.

Base code (the bucket name must be globally unique across **all** AWS accounts, so change it):

```hcl
resource "aws_instance" "example" {
  ami           = "ami-0e449927258d45bc4"
  instance_type = "t2.micro"
}

resource "aws_s3_bucket" "example" {
  bucket = "kplabs-demo-s3-007"
}
```

Final code:

```hcl
resource "aws_instance" "example" {
  ami           = "ami-0e449927258d45bc4"
  instance_type = "t2.micro"
  depends_on    = [aws_s3_bucket.example]
}

resource "aws_s3_bucket" "example" {
  bucket = "kplabs-demo-s3-007"
}
```

`depends_on` takes a **list** of resource addresses (`type.name`).

```text
 create:   aws_s3_bucket.example  -->  aws_instance.example
 destroy:  aws_instance.example   -->  aws_s3_bucket.example   (REVERSE order)
```

Demo:

1. `terraform plan`: 2 to add.
2. `terraform apply -auto-approve`: the bucket is created first; only after it completes does the EC2 creation start.
3. `terraform destroy -auto-approve`: the **order is reversed**. The instance is destroyed first, then the bucket, so a dependency is never removed while something still needs it.

### 7.4 Implicit dependency: a reference

New scenario: the EC2 instance must only accept traffic from trusted IPs, so it needs a security group. By hand you create the group first, then launch the instance with it. In Terraform, with no link between the two blocks they are created in parallel. You *could* add `depends_on = [aws_security_group.prod]`, but there is a better way.

`aws_instance` has the argument `vpc_security_group_ids` (a list of group IDs; see the Argument Reference). Without it the instance gets the **default** group. To attach `production-sg` you could create it, copy its ID, and paste it in, but that is not automation. Reference the other resource's `id` instead:

```hcl
resource "aws_instance" "example" {
  ami                    = "ami-0e449927258d45bc4"
  instance_type          = "t2.micro"
  vpc_security_group_ids = [aws_security_group.prod.id]
}

resource "aws_security_group" "prod" {
  name = "production-sg"
}
```

Reading `aws_security_group.prod.id`: `aws_security_group` is the type, `prod` the local name, `id` an **attribute** documented in the Attribute Reference.

Because the instance needs a value that exists only after the group is created, Terraform builds the graph automatically: **security group first, then instance.**

Demo:

1. `terraform plan` is valid. The group's `id` and the instance's `vpc_security_group_ids` show `(known after apply)`.
2. `terraform apply -auto-approve`: the group is created (its ID printed), then the instance is created with that ID.
3. In the console the instance's security group is `production-sg`. In `terraform.tfstate` the instance's `vpc_security_group_ids` holds the same ID.
4. `terraform destroy -auto-approve` (instance first, then group).

### 7.5 Which one should I use?

Implicit dependency needs an **argument that can accept the other resource's attribute**. EC2 + security group: `vpc_security_group_ids` exists, so it works. EC2 + S3 bucket: there is no `aws_instance` argument that takes a bucket value, so you need `depends_on`.

```text
 Does the dependent resource have an argument that can take an
 attribute of the other resource?
      |
      +-- yes --> use the reference (implicit; preferred)
      +-- no  --> use depends_on   (explicit)
```

| Aspect | Implicit | Explicit |
|---|---|---|
| Declared by | Attribute reference | `depends_on` |
| How Terraform learns it | Automatically from the expression | From your list |
| Needs a usable argument on the dependent resource | Yes | No |
| Extra benefit | The value flows automatically (IDs, IPs) | Pure ordering only |
| Typical use | Instance to security group; subnet to VPC; rule to EIP | Instance needs a bucket to exist first |

Production code uses implicit dependencies heavily, with explicit ones added where required.

> **Extra context (not in the lesson, consistent with HashiCorp docs):**
> - `depends_on` accepts references to **resources, data sources and modules**, not arbitrary expressions. Use it only as a **last resort** and add a comment saying why, because it is a "hidden" relationship that is easy to forget.
> - It also works on `module` blocks (see [09 — Modules](09-modules.md)).
> - A `depends_on` on a data source can defer the read to apply time.
> - Terraform walks the graph with limited parallelism (default `-parallelism=10`).
> - To *see* the graph, use `terraform graph` ([03 — Core workflow](03-core-workflow.md)).

> **Note on the lesson 10 challenge:** in the "challenge" exercises a resource lists `depends_on = [aws_eip.example]` while it already references that EIP's attribute. That `depends_on` is redundant, because the reference alone already creates the implicit dependency.

🎯 **Exam focus**

- Implicit = reference another resource's attribute; Terraform orders creation automatically and **destroys in reverse**.
- Explicit = `depends_on` for relationships Terraform cannot infer from references.
- Prefer implicit references (values flow automatically). Use `depends_on` only when no attribute link exists.
- Without any dependency information, independent resources may be created in any order, in parallel.
- Values such as `id` are `(known after apply)` at plan time.

> The `count` meta-argument's weakness with reordered lists (an insert at position 0 shifts every index and plans "1 to add, 4 to change") is covered in [07 — Types, loops, functions](07-types-loops-functions.md), together with `for_each` as the stable alternative.

---

## 8. Provisioners

### 8.1 Why provisioners exist

Everything so far created and managed infrastructure objects. That answers "how do I launch a VM?" but not "**the VM is launched, now what?**" A freshly launched VM is empty: no application, no packages, no configuration. **Provisioners** let Terraform run scripts or commands as part of resource creation or destruction.

> **Definition:** provisioners allow you to **execute scripts or any commands on a local or remote machine as part of resource creation and destruction.**

Typical example: after a virtual machine is launched, Terraform connects to it over SSH and installs the packages needed so it is ready for application deployment.

```text
        terraform apply
              |
              v
 +-----------------------------+
 | Stage 1: LAUNCH             |   Terraform calls the cloud API, creates the EC2 instance
 +-----------------------------+
              |
              v
 +-----------------------------+
 | Stage 2: INSTALL            |   Terraform logs in over SSH (user: ec2-user)
 | (provisioner runs)          |   and installs the required software (nginx)
 +-----------------------------+
              |
              v
      Browser -> http://<public-ip>  ->  "Welcome to nginx!"
```

> **Exam status.** The instructor states that provisioners are **not part of the newer Terraform Associate exam** (they were in the earlier version) but remain widely used, so this section is practical knowledge. Treat the exam angle as low-probability, but the related ideas (`self`, `connection`, tainting, destroy-time behaviour, `null_resource`) are still good background. Check the current blueprint in [01 — Intro](01-iac-and-terraform-intro.md).
>
> **Up to date (TF 1.12):** HashiCorp's own documentation describes provisioners as a **last resort**. Prefer: `user_data` / cloud-init, pre-built images (AMIs), or configuration-management tools, where possible. See [8.13](#813-alternatives-to-provisioners).

### 8.2 The provisioner types

| Provisioner | Where it runs | Purpose |
|---|---|---|
| `local-exec` | The **local machine** where Terraform runs | Run a local command after the resource is created |
| `remote-exec` | The **remote resource** (e.g. the new EC2 server) | Run commands/scripts directly on the server; needs a `connection` |
| `file` | Copies files from local to remote | Upload a file or directory to the new resource; needs a `connection` |

Earlier Terraform versions also had vendor provisioners (**Chef, Puppet, Salt** and others). HashiCorp **removed** them; only the three above remain, with `local-exec` and `remote-exec` the two major ones. (Extra context: the vendor provisioners were removed in Terraform 0.15.)

**local-exec** "invokes a local executable after a resource is created." Example: after an EC2 instance launches, fetch its IP and write it to a local file `server_ip.txt`; or run a `ping` from your workstation to confirm the server is reachable; or run **Ansible** after a server is created.

```text
 Your laptop (Terraform installed)
 +-----------------------------------+
 | 1. terraform apply                |
 |    -> creates VM in the provider  |-----------> [ New VM (remote) ]
 | 2. local-exec runs HERE           |
 |    -> creates server_ip.txt       |             (nothing happens on the
 |    -> writes the VM's IP into it  |              remote server in step 2)
 +-----------------------------------+
```

**remote-exec** runs a script/command **on the remote server**, for example installing or configuring packages after launch. By name: *remote*-exec = the remote machine; *local*-exec = the machine running Terraform.

The combined demo in the course ran **both**: `remote-exec` to install software on the EC2 instance (over SSH), then `local-exec` to store the instance's IP in a local file.

```text
 Terraform
    |
    +--(1) create EC2 + security group
    |
    +--(2) remote-exec  --SSH-->  EC2: install software (nginx)
    |
    +--(3) local-exec   -->  local file with the server's IP address
```

Every output line is **prefixed with the provisioner responsible**, for example `aws_instance.myec2 (remote-exec): ...`. After `remote-exec` completes, Terraform starts `local-exec`, which writes the IP into the file (it matched the EC2 console, and opening the IP in a browser showed the default nginx page).

Expected CLI shape (simplified; exact wording varies by version):

```text
aws_instance.myec2: Creating...
aws_instance.myec2: Still creating...
aws_instance.myec2: Provisioning with 'remote-exec'...
aws_instance.myec2 (remote-exec): Connecting to remote host via SSH...
aws_instance.myec2 (remote-exec):   Host: <public-ip>
aws_instance.myec2 (remote-exec):   User: ec2-user
aws_instance.myec2 (remote-exec): Connected!
aws_instance.myec2 (remote-exec): ... installing packages ...
aws_instance.myec2: Creation complete after ...
```

### 8.3 The format: four rules

**Rule 1: provisioners live INSIDE a resource block.** A provisioner defined outside a resource block does not work.

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-..."
  instance_type = "t2.micro"

  # provisioner blocks go here, between the resource's { and }
}
```

**Rule 2: `provisioner "<TYPE>"`.** The keyword `provisioner` followed by the type in quotes.

```hcl
provisioner "local-exec"  { ... }
provisioner "remote-exec" { ... }
provisioner "file"        { ... }
```

**Rule 3: `local-exec` needs a `command`.** The command runs on the machine where Terraform is running.

```hcl
resource "aws_instance" "myec2" {
  # ...
  provisioner "local-exec" {
    command = "echo Server has been created through Terraform"
  }
}
```

`echo` prints whatever you pass. After the server is created, the `apply` output shows "Server has been created through Terraform".

**Rule 4: `remote-exec` needs TWO things: commands and a `connection` block.**

```hcl
resource "aws_instance" "myec2" {
  # ...
  provisioner "remote-exec" {
    inline = [
      "sudo yum -y install nginx",
      "sudo systemctl start nginx",
    ]
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("./key.pem")   # the key through which Terraform can connect
    host        = self.public_ip      # the IP address of the server
  }
}
```

| Block | Contains |
|---|---|
| `provisioner "remote-exec"` | The commands to run **on the server** (not on your local system) |
| `connection` | How to reach the server: protocol (`type`), user, key, host/IP |

HashiCorp's docs pattern: for **local-exec**, a resource, then `provisioner "local-exec"`, then `command`. For **remote-exec**, the resource has a `connection` block **and** the provisioner block.

🎯 **Exam focus:** provisioner inside the resource block; syntax `provisioner "type" {}`; `local-exec` uses `command`; `remote-exec` uses `inline` (a list) **plus** a `connection` block; commands in `remote-exec` execute on the **server**.

### 8.4 `self`

Inside a provisioner or `connection` block, **`self`** refers to **the resource that contains the provisioner**. Because the provisioner sits under `aws_instance.myec2`, `self.public_ip` means that instance's public IP and `self.private_ip` its private IP. (Attributes of `aws_instance` are in its Attribute Reference.)

⚠️ **Gotcha (extra context):** refer to the resource's own attributes through `self`, not by its full address. A provisioner that names its own resource (`aws_instance.myec2.private_ip` inside `aws_instance.myec2`) creates a self-referential dependency cycle, and Terraform rejects it. The repo contains a variant `local-exec.tf` written with the full name; the lecture and `local-exec.md` use `self`, which is the correct form.

### 8.5 Practical: `local-exec`

**Goal:** after an EC2 instance is created, write its IP into a local file `server_ip.txt`.

Base code (resource only):

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-04e5276ebb8451442"
  instance_type = "t2.micro"
}
```

Final code:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-04e5276ebb8451442"
  instance_type = "t2.micro"

  provisioner "local-exec" {
    command = "echo ${self.private_ip} >> server_ip.txt"
  }
}
```

(The AMI is for `us-east-1`; use a valid AMI for your region, or the `aws_ami` data source from [Section 6](#66-practical-latest-ami-with-a-data-source).)

| Piece | Explanation |
|---|---|
| Provisioner inside the resource | Rule 1 |
| `provisioner "local-exec"` | Keyword plus type |
| `command = "..."` | Command run on the **local machine** after the resource is created |
| `echo ... >> server_ip.txt` | Shell redirection: **appends** the text to a local file (creates it if missing) |
| `${self.private_ip}` | Interpolation of an attribute of this very resource |
| `self` | "Refers to the resource to which this provisioner is associated" |
| `private_ip` / `public_ip` | Attributes of `aws_instance`. Either works; choose what you need |

(The instructor first read the docs example, then rewrote it as `self.public_ip`, but the recorded run showed the **private** IP in `server_ip.txt`, matching the final code above.)

**Walkthrough**

1. Confirm there is **no** `server_ip.txt` yet.
2. `terraform apply -auto-approve`.
3. The instance is created first. **Only after creation completes** does Terraform print `Provisioning with 'local-exec'`.
4. `server_ip.txt` appears next to your `.tf` file containing the IP; check it against the console.
5. Clean up: `terraform destroy -auto-approve` (the instance goes running, shutting-down, terminated).

Expected output (simplified):

```text
aws_instance.myec2: Creating...
aws_instance.myec2: Provisioning with 'local-exec'...
aws_instance.myec2 (local-exec): Executing: ["/bin/sh" "-c" "echo 172.31.x.x >> server_ip.txt"]
aws_instance.myec2: Creation complete after ...
```

⚠️ **Gotchas**

- `>>` **appends**, so applying again after a destroy adds another line to the same file.
- `local-exec` runs on **your** machine, so the command must exist there. On Windows a missing command gives "not recognized as an internal or external command"; on Linux/macOS you see a "command not found" style error.
- Always destroy demo resources.

> **Extra context (from the docs, not shown in the lecture): more `local-exec` arguments.** `command` is required. Optional arguments: `working_dir` (directory to run in), `interpreter` (override the default shell, for example `["/bin/bash", "-c"]` or `["PowerShell", "-Command"]`), `environment` (a map of environment variables), and `quiet`. By default commands run via `/bin/sh -c` (`cmd /C` on Windows).

### 8.6 The `connection` block

`remote-exec` and `file` need to log in to the new resource. The `connection` block describes how.

```hcl
connection {
  type        = "ssh"                       # or "winrm" for Windows
  user        = "ec2-user"                  # depends on the image
  private_key = file("./terraform-key.pem") # key CONTENTS, via file()
  host        = self.public_ip
}
```

| Argument | Meaning |
|---|---|
| `type` | `ssh` (Linux) or `winrm` (Windows Remote Management) |
| `user` | Login user: `ec2-user` (Amazon Linux), `root` on some providers, `Administrator` (Windows), `ubuntu` on Ubuntu AMIs (extra context) |
| `password` | Password authentication. **Disabled by default on AWS images**, so use a key |
| `private_key` | The **contents** of the private key, loaded with `file("path")` |
| `host` | Address of the server, for example `self.public_ip` |

| Protocol | Used for | Default user |
|---|---|---|
| `ssh` | Linux servers | Depends on the image (Amazon Linux = `ec2-user`; some providers use `root`) |
| `winrm` | Windows servers | `Administrator` |

> The docs state: "remote-exec provisioner requires connection and supports both `ssh` and `winrm`."

(Extra context: a `connection` block can sit at the **resource level**, as in the lab, in which case every provisioner in the resource uses it, or **inside an individual provisioner**, in which case it applies only to that one.)

### 8.7 Practical: `remote-exec` (install nginx)

**Goal:** install nginx on a new EC2 instance over SSH and see "Welcome to nginx!".

Docs referenced: the `remote-exec` provisioner page, the `connection` page, and the `file` function.

Final code from the lecture:

```hcl
resource "aws_instance" "myec2" {
  ami                    = "ami-04e5276ebb8451442"
  instance_type          = "t2.micro"
  key_name               = "terraform-key"
  vpc_security_group_ids = ["sg-0edf854d7112cfbf4"]   # replace with YOUR security group ID

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("./terraform-key.pem")
    host        = self.public_ip
  }

  provisioner "remote-exec" {
    inline = [
      "sudo yum -y install nginx",
      "sudo systemctl start nginx",
    ]
  }
}
```

**How it was built, step by step**

1. **Add `connection` and `provisioner` blocks.** The docs example has both; copy it and fix the indentation.
2. **Fill in the connection block.** `type = "ssh"` for Linux; `user = "ec2-user"` (changes with the OS image); `host = self.public_ip` (the instance's public IP, computed at creation). **Password vs private key:** the docs template shows `password`, but AWS images have password authentication **disabled**, so replace it with **`private_key`** (the instructor briefly typed the wrong argument name and corrected it from the docs).
3. **Create a key pair.** In the AWS console create a key pair named **`terraform-key`**, format **`.pem`** (required for SSH). It downloads automatically; place `terraform-key.pem` in the **same folder as the Terraform code**.
4. **Launch the EC2 with that key.** If the server is not created with the key pair you cannot log in. The `aws_instance` argument is **`key_name`** and takes the key **name** without `.pem` (`key_name = "terraform-key"`); the *file* is `terraform-key.pem`.
5. **Allow SSH.** The instance must accept inbound **SSH on port 22**, and HTTP on 80 to view the page. The instructor created a security group `provisioner-sg` by hand (SSH and HTTP from anywhere) and attached it with **`vpc_security_group_ids`**.
6. **Commands.** An `inline` list with `sudo yum -y install nginx` and `sudo systemctl start nginx` (note the comma between items).
7. **(Mac/Linux) fix key permissions.**

   ```bash
   chmod 400 terraform-key.pem
   ```

   Too-open permissions make SSH refuse the key.

**Running it, and the errors hit**

```bash
terraform validate
terraform apply -auto-approve
```

The instance goes pending, then running; then Terraform tries SSH.

| Problem | Message / symptom | Cause | Fix |
|---|---|---|---|
| Wrong `private_key` value | `Failed to read ssh private key: no key found` | `private_key` was given the file **path/name**, not the key's **contents** | `private_key = file("./terraform-key.pem")` |
| Missing `sudo` | `This command has to be run with superuser privilege` | `ec2-user` is not root; `yum` installs system-wide and nginx binds to port 80 | Prefix with `sudo` |
| Timeout / cannot connect | `timeout - last error: ...` | Port 22 closed, wrong key, wrong user, instance not ready | Test SSH by hand (below) |

After the first failure the instance already existed (with a failed provisioner), so the instructor ran `terraform destroy -auto-approve` and re-applied. (A failed provisioner leaves the resource **tainted**, so a plain re-apply would also have replaced it; see [8.10](#810-creation-time-vs-destroy-time-provisioners).)

Second `terraform apply -auto-approve`: Terraform shows **Connected**, installs nginx and its dependencies, completes. Browse to `http://<public-ip>` to see **"Welcome to nginx!"**.

**Troubleshooting when Terraform cannot connect.** Reproduce the connection **manually** with exactly the values in the connection block:

```bash
ssh -i terraform-key.pem ec2-user@<public-ip>
```

If manual login fails you see the exact error to debug (security group, key mismatch, wrong user, wrong permissions). If it works, you can try the commands by hand.

```text
 terraform apply
   |
   | 1. create aws_instance (key_name = terraform-key, SG with 22 + 80 open)
   v
 [EC2 running, public_ip assigned]
   |
   | 2. connection{ ssh, ec2-user, file(terraform-key.pem), self.public_ip }
   v
 [SSH session]  --> sudo yum -y install nginx
                --> sudo systemctl start nginx
   |
   v
 http://<public-ip>  ->  "Welcome to nginx!"
```

🎯 **Exam focus**

- `remote-exec` **requires** a `connection`; it supports **ssh** and **winrm**.
- Instance must be launched with the **key pair** (`key_name`), and the security group must allow **port 22**.
- `private_key` expects key **contents**: use `file("path")`.
- Use `sudo` for admin commands as `ec2-user`; `chmod 400` the key on Mac/Linux.
- The default SSH user depends on the OS image/provider.
- Never commit private keys or real credentials to version control.

> **Extra context: other `remote-exec` arguments.** Instead of `inline` you can use `script` (one local script file, copied and run on the remote host) or `scripts` (a list of local script files, run in order). Exactly one of `inline`, `script`, `scripts` is allowed.

### 8.8 The `file` provisioner

The third provisioner copies a file or directory from the machine running Terraform to the new resource. The lesson only names it ("not discussed at this stage"); this subsection is **extra context** from the Terraform docs.

```hcl
resource "aws_instance" "web" {
  # ... ami, instance_type, key_name, security group ...

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("./terraform-key.pem")
    host        = self.public_ip
  }

  provisioner "file" {
    source      = "app.conf"            # local file or directory
    destination = "/tmp/app.conf"       # path on the remote machine
  }

  # Or write literal text instead of a local file:
  provisioner "file" {
    content     = "hello from terraform"
    destination = "/tmp/hello.txt"
  }
}
```

| Argument | Meaning |
|---|---|
| `source` | Local path to copy (file or directory) |
| `content` | Literal text to write instead (use `source` **or** `content`) |
| `destination` | Absolute path on the remote machine (must be writable by the connection user, so `/tmp` is the usual choice) |

Like `remote-exec`, it needs a `connection`. A common pattern: `file` uploads a script to `/tmp`, then `remote-exec` runs it with `sudo`.

### 8.9 Points to note

**Point 1: provisioners work on ANY resource type.** The demos use `aws_instance`, which can mislead you into thinking provisioners belong to EC2. They can be placed in any resource block and run after that resource is created. The lecture uses `aws_iam_user`:

```hcl
resource "aws_iam_user" "lb" {
  name = "demoiamuser"

  provisioner "local-exec" {
    command = "echo local-exec provisioner is starting"
  }
}
```

`terraform apply -auto-approve`: the user is created, then the provisioner prints `local-exec provisioner is starting`. (`remote-exec` makes sense only on resources where a `connection` is possible.)

**Point 2: multiple provisioners in one resource.** You may add several provisioner blocks, and mix `local-exec`, `remote-exec` and `file`.

```hcl
resource "aws_iam_user" "lb" {
  name = "demoiamuser"

  provisioner "local-exec" {
    command = "echo local-exec provisioner is starting"
  }

  provisioner "local-exec" {
    command = "echo local-exec provisioner is starting for 2nd time"
  }
}
```

Walkthrough: destroy the earlier user, add the second block, apply again. Both messages appear, **in the order written**:

```text
aws_iam_user.lb: Creating...
aws_iam_user.lb: Creation complete after ...
aws_iam_user.lb: Provisioning with 'local-exec'...
aws_iam_user.lb (local-exec): local-exec provisioner is starting
aws_iam_user.lb: Provisioning with 'local-exec'...
aws_iam_user.lb (local-exec): local-exec provisioner is starting for 2nd time
```

**Why destroy first?** Provisioners are creation-time by default and do **not** re-run on an existing resource. To re-run them, destroy and re-apply (formalised next).

| Point | Detail |
|---|---|
| Location | Always inside a resource block |
| Resource type | Any, not just `aws_instance` |
| Quantity | Multiple provisioners per resource |
| Mixing | `local-exec`, `remote-exec`, `file` can be combined |
| Order | Run in the order they appear |

### 8.10 Creation-time vs destroy-time provisioners

**Creation-time (the default).** A provisioner runs **after the resource is created**, and **only then**. It does **not** run on updates. Example: an instance is created and the provisioner runs; later you change the size (an in-place update) and the creation-time provisioner does **not** run again. (Extra context: if a change forces the resource to be *replaced*, the new object is "created", so provisioners run for it again.)

**Destroy-time.** Runs **before the resource is destroyed**. Add `when = destroy`:

```hcl
provisioner "local-exec" {
  command = "echo This is destroy time provisioner"
  when    = destroy
}
```

On `terraform destroy` the provisioner runs first, then the resource is terminated.

**Common use case:** an EC2 instance in production is registered in a central dashboard (for example antivirus status). Before the instance is terminated, a destroy-time provisioner de-links the antivirus from the dashboard, and then the instance terminates.

Repo example `create-destroy-time-provisioner`:

```hcl
resource "aws_iam_user" "lb" {
  name = "provisioner-user"

  provisioner "local-exec" {
    command = "echo This is creation time provisioner"
  }

  provisioner "local-exec" {
    command = "echo This is destroy time provisioner"
    when    = destroy
  }
}
```

| Block | When it runs |
|---|---|
| First `local-exec` (no `when`) | At creation (the default is `when = create`) |
| Second `local-exec` with `when = destroy` | Before the resource is destroyed |

- **Apply:** the user is created; only the creation-time provisioner prints `This is creation time provisioner`.
- **Destroy:** the user is deleted; only the destroy-time provisioner prints `This is destroy time provisioner`.

> **Extra context (from the Terraform docs):** a destroy-time provisioner can only reference `self`, `count.index` and `each.key` (not other resources), and it does **not** run if you simply **delete the resource block** from the configuration (Terraform no longer has the block to read it from). Use `terraform destroy`, or keep the block while destroying. If a destroy-time provisioner fails with the default `on_failure = fail`, the destroy errors and the resource is kept.

#### Failure and tainting

> **If a creation-time provisioner fails, the resource is marked as _tainted_.**

**Why:** a failed provisioner can leave the resource **semi-configured**. For example a `remote-exec` that installs important software fails because of a network or permission problem: the EC2 instance exists but is not configured as needed. A tainted resource is **planned for destruction and re-creation on the next `terraform apply`**.

Simulating a failure: make the command not exist.

```hcl
resource "aws_iam_user" "lb" {
  name = "provisioner-user"

  provisioner "local-exec" {
    command = "This is creation time provisioner"   # not a real command: no "echo"
  }

  provisioner "local-exec" {
    command = "echo This is destroy time provisioner"
    when    = destroy
  }
}
```

1. `terraform apply -auto-approve`: the IAM user **is created** (visible in the console under Users); then `local-exec` fails with a "not recognized as an internal or external command" error (Windows wording; on Linux/macOS a "command not found" style message), and the apply ends in error.
2. Run `terraform apply` again: Terraform proposes to **destroy and recreate** the resource (the instructor answered "no" just to inspect).
3. Open `terraform.tfstate`: the resource's status is **`tainted`**.
4. Rule: whenever a provisioner fails, the **resource the provisioner is attached to** is marked tainted.

Illustrative plan shape (extra context):

```text
# aws_iam_user.lb is tainted, so must be replaced
-/+ resource "aws_iam_user" "lb" { ... }
```

```text
 terraform apply  (resource does not exist)
    create resource --> run creation-time provisioners
                          |-- success --> resource OK
                          |-- failure --> apply ERROR + resource TAINTED
                                          --> next apply: destroy + recreate

 terraform apply  (update in place)  --> creation-time provisioners DO NOT run

 terraform destroy
    run destroy-time provisioners (when = destroy) --> destroy resource
```

> **Up to date (TF 1.12):** `terraform taint` and `terraform untaint` still exist, but `taint` is deprecated. To force replacement of a resource manually, use `terraform apply -replace="<address>"` (see [11 — Import, state CLI, logging](11-import-state-cli-logging.md)). A provisioner failure still marks the object tainted automatically.

🎯 **Exam focus**

- The default is **creation-time**; provisioners do not run on updates.
- `when = destroy` makes a destroy-time provisioner that runs *before* destruction.
- A failed creation-time provisioner means the **apply fails**, and the resource is **tainted** and replaced on the next apply. The resource still **exists** in the cloud.
- Rationale: avoid leaving a resource semi-configured. The taint status is visible in state.

### 8.11 Failure behaviour: `on_failure`

By default, when a provisioner fails: the **`terraform apply` itself fails** and the resource is marked **tainted**. In production you may want the opposite: *even if the provisioner fails, the apply should not fail and the resource should not be tainted*. Use `on_failure`.

| Value | Behaviour |
|---|---|
| `fail` (**default**) | Raise an error and stop applying. A creation-time failure taints the resource |
| `continue` | **Ignore the error** and carry on with creation/destruction. Apply succeeds; the resource is **not** tainted |

Not specifying `on_failure` is the same as `on_failure = fail`. It is an argument **inside the provisioner block**, not the resource block.

Base code (fails because `echo1` is not a command):

```hcl
resource "aws_iam_user" "lb" {
  name = "demo-provisioner-user"

  provisioner "local-exec" {
    command = "echo1 This is creation time provisioner"
  }
}
```

Final code:

```hcl
resource "aws_iam_user" "lb" {
  name = "demo-provisioner-user"

  provisioner "local-exec" {
    command    = "echo1 This is creation time provisioner"
    on_failure = continue
  }
}
```

Demo:

1. Run the command text in a terminal to prove `echo` works and `echo1` reports "not recognized".
2. Apply the failing version: `echo1` is not recognised, the provisioner fails, the **apply fails**, and the resource is **immediately tainted**.
3. `terraform destroy -auto-approve` so the second scenario starts fresh.
4. Add `on_failure = continue` and `terraform apply -auto-approve`. The same error text still appears, **but Terraform ignores it and the apply completes**.
5. Check state: the resource is **not** tainted. `terraform plan` shows no changes (no re-creation).

| | `on_failure = fail` (default) | `on_failure = continue` |
|---|---|---|
| Provisioner command fails | Error raised | Error shown but ignored |
| `terraform apply` result | Fails | Succeeds |
| Resource tainted? | Yes | No |
| Next `plan` / `apply` | Wants to destroy and recreate | No changes |

⚠️ **Gotcha:** with `continue` the resource may be **partially configured** without Terraform knowing. Use it deliberately (for example non-critical health checks).

🎯 **Exam focus:** the default `on_failure` is `fail`; `continue` ignores the error, the apply goes on, and there is no tainting.

### 8.12 `null_resource`: a host for provisioners

Provisioners must live inside a resource. What if you want to run something that is **not tied to a real resource**, such as a health check before creating an Elastic IP? A **`null_resource`** (from the `null` provider) **creates nothing** in any cloud, so it is commonly used as a host for provisioners.

> The repo file `null.md` is not covered in the lecture transcripts. The explanation below goes slightly beyond the file and is marked where it does.

**Example 1: use `depends_on` to gate another resource on a provisioner.**

```hcl
provider "aws" {
  region = "ap-southeast-1"
}

resource "aws_eip" "lb" {
  domain     = "vpc"                              # the repo shows "vpc = true", deprecated
  depends_on = [null_resource.health_check]
}

resource "null_resource" "health_check" {
  provisioner "local-exec" {
    command = "curl https://google.com"
  }
}
```

`null_resource.health_check` runs `curl https://google.com` locally. `aws_eip.lb` has `depends_on = [null_resource.health_check]`, so the Elastic IP is created **only after** the health-check provisioner has run (and succeeded, with the default `on_failure = fail`). This is an example of an **explicit** dependency where no attribute reference is available.

**Example 2: re-run a provisioner when something changes, using `triggers`.**

```hcl
resource "aws_eip" "lb" {
  domain = "vpc"
  count  = 0
}

resource "null_resource" "ip_check" {
  triggers = {
    latest_ips = join(",", aws_eip.lb[*].public_ip)
  }

  provisioner "local-exec" {
    command = "echo Latest IPs are ${self.triggers.latest_ips} > sample.txt"
  }
}
```

- `triggers` is a **map**. When its values change, the `null_resource` is **replaced**, so its provisioners **run again**. Here the trigger is a comma-joined list of the EIPs' public IPs (`aws_eip.lb[*]` is a splat expression, see [07](07-types-loops-functions.md)).
- `count = 0` means zero EIPs exist (extra context: an empty list joins to an empty string). Change `count` and the trigger changes, and the provisioner re-runs.
- The command writes the latest IPs into `sample.txt`.
- The repo's version writes `${null_resource.ip_check.triggers.latest_ips}` (the resource's own address) in the command. As in 8.4, the self-reference form is `self.triggers.latest_ips`, shown above.

> **Up to date (TF 1.12):** since Terraform 1.4 there is a built-in **`terraform_data`** resource that does the job of `null_resource` without installing the `null` provider. It uses `triggers_replace` instead of `triggers`, and also has an `input`/`output` pair:
>
> ```hcl
> resource "terraform_data" "health_check" {
>   triggers_replace = [aws_eip.lb.public_ip]
>
>   provisioner "local-exec" {
>     command = "echo checking ${self.id}"
>   }
> }
> ```
>
> `null_resource` still works and is what the course (and older code) uses.

### 8.13 Alternatives to provisioners

Provisioners are a **last resort** in HashiCorp's guidance (extra context). Before reaching for one, consider:

| Need | Better option |
|---|---|
| Install packages / run a script on first boot | **`user_data`** (cloud-init). Runs on the instance at boot with no SSH or key handling, and is part of the resource's arguments so Terraform tracks it |
| Many identical servers with software already installed | A **pre-built image** (AMI) made with a tool such as Packer |
| Ongoing configuration | A configuration-management tool (Ansible, Chef, Puppet) |
| Tell another system about a new resource | The provider for that system, if one exists |

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t2.micro"

  user_data = <<-EOT
    #!/bin/bash
    dnf install -y nginx
    systemctl enable --now nginx
  EOT
}
```

Why the caution: provisioner actions are **not tracked in state** (Terraform cannot plan or reconcile what a script did), they need network access and credentials for SSH/WinRM, and a half-failed script leaves a tainted resource.

---

## 🧪 Labs

> All labs create real AWS resources. Use a separate empty folder for each lab and **run `terraform destroy` at the end**. Elastic IPs that are allocated but not attached cost money; EC2 `t2.micro` is free-tier eligible only within your account's free-tier limits (in newer accounts a `t3.micro` may be the eligible type; check your billing console). Set a billing alert first ([00 — Prerequisites](00-prerequisites.md)). Replace region and AMI IDs with ones valid for you, or use the `aws_ami` data source.

### Lab 1: security group, Elastic IP and cross-resource reference

Folder: `lab-05-sg-eip`.

1. Create `main.tf`:

   ```hcl
   provider "aws" {
     region = "us-east-1"
   }

   resource "aws_eip" "lb" {
     domain = "vpc"
   }

   resource "aws_security_group" "example" {
     name = "attribute-sg"
   }

   resource "aws_vpc_security_group_ingress_rule" "example" {
     security_group_id = aws_security_group.example.id

     cidr_ipv4   = aws_eip.lb.public_ip     # deliberately wrong for step 3
     from_port   = 443
     ip_protocol = "tcp"
     to_port     = 443
   }

   output "eip" {
     value = aws_eip.lb.public_ip
   }
   ```

2. `terraform init` then `terraform plan`. Expect `Plan: 3 to add` with `(known after apply)` values.
3. `terraform apply -auto-approve`. Expect the EIP and group to be created and the **rule to fail** with `Invalid Attribute Value` about a CIDR block. In the console confirm the group exists and has no rule.
4. Fix the rule: `cidr_ipv4 = "${aws_eip.lb.public_ip}/32"`. Apply again; only the rule is created (`1 added`).
5. Inspect state: `terraform state list`, then `terraform state show aws_eip.lb` and compare `public_ip` with the console.
6. `terraform destroy -auto-approve` and then `terraform apply -auto-approve` once more to confirm a clean one-shot apply; destroy again.
7. Confirm in the console that no Elastic IP remains.

### Lab 2: data source for the latest AMI

Folder: `lab-05-data-ami`.

1. Write:

   ```hcl
   provider "aws" {
     region = "us-east-1"
   }

   data "aws_ami" "al2023" {
     most_recent = true
     owners      = ["amazon"]

     filter {
       name   = "name"
       values = ["al2023-ami-2023*-x86_64"]
     }
   }

   resource "aws_instance" "web" {
     ami           = data.aws_ami.al2023.id
     instance_type = "t2.micro"
   }

   output "ami_used" {
     value = data.aws_ami.al2023.id
   }
   ```

2. `terraform plan`: note that the AMI ID is already filled in at plan time (the data source is read during plan).
3. Change the provider region to `ap-south-1` and `plan` again: the AMI ID changes with **no other edits**. Change it back.
4. `terraform apply -auto-approve`. Look for `Reading...` / `Read complete` for the data source and `Creating...` for the instance.
5. Experiment: set `filter` values to the `arm64` pattern (`al2023-ami-2023*-arm64`) and apply; expect the architecture mismatch error with `t2.micro`. Revert.
6. `terraform destroy -auto-approve`.

### Lab 3: implicit and explicit dependencies

Folder: `lab-05-deps`.

1. Use the S3 + EC2 example from [7.3](#73-explicit-dependency-depends_on) with **your own unique bucket name**.
2. `terraform apply -auto-approve`: watch the bucket finish before the instance starts. Then `terraform destroy -auto-approve` and watch the **reverse** order.
3. Remove `depends_on` and apply again several times (destroy between): notice that both resources are now created in parallel and the log order is no longer guaranteed.
4. Switch to the security-group example from [7.4](#74-implicit-dependency-a-reference); in `plan` find `(known after apply)` for `vpc_security_group_ids`. Apply, verify in console, destroy.

### Lab 4: `local-exec`, destroy-time provisioners and tainting

Folder: `lab-05-provisioner-local`. (This lab costs nothing; IAM users are free.)

1. Write:

   ```hcl
   provider "aws" {
     region = "us-east-1"
   }

   resource "aws_iam_user" "lb" {
     name = "provisioner-user"

     provisioner "local-exec" {
       command = "echo This is creation time provisioner"
     }

     provisioner "local-exec" {
       command = "echo This is destroy time provisioner"
       when    = destroy
     }
   }
   ```

2. `terraform apply -auto-approve`: only the creation message prints. `terraform destroy -auto-approve`: only the destroy message prints.
3. **Break it:** change the first command to `command = "This is creation time provisioner"` (remove `echo`). Apply: the user is **created**, the provisioner fails, the apply errors. Check the console for the user; check `terraform.tfstate` for `"status": "tainted"`.
4. Run `terraform plan`: expect `-/+` with "must be replaced".
5. Destroy, then add `on_failure = continue` to the broken provisioner and apply again. The error text appears but the apply succeeds, state shows no taint, and `terraform plan` shows no changes.
6. Finish with a `server_ip.txt` experiment: on an `aws_instance` add `command = "echo ${self.private_ip} >> server_ip.txt"`, apply, read the file, destroy.

### Lab 5: `remote-exec` with nginx over SSH

Folder: `lab-05-remote-exec`. **Cost:** one `t2.micro` while the lab runs. **Security:** the lab opens SSH to the world for convenience; narrow `cidr_ipv4` to your own IP (`x.x.x.x/32`) if you can.

1. In the EC2 console create a key pair `terraform-key` (type RSA, format `.pem`). Move `terraform-key.pem` into the lab folder and, on Mac/Linux, `chmod 400 terraform-key.pem`. Add `*.pem` to `.gitignore`.
2. Write `main.tf`:

   ```hcl
   provider "aws" {
     region = "us-east-1"
   }

   data "aws_ami" "al2023" {
     most_recent = true
     owners      = ["amazon"]

     filter {
       name   = "name"
       values = ["al2023-ami-2023*-x86_64"]
     }
   }

   resource "aws_security_group" "web" {
     name        = "provisioner-sg"
     description = "SSH and HTTP for provisioner lab"
   }

   resource "aws_vpc_security_group_ingress_rule" "ssh" {
     security_group_id = aws_security_group.web.id
     cidr_ipv4         = "0.0.0.0/0"   # lab only
     from_port         = 22
     to_port           = 22
     ip_protocol       = "tcp"
   }

   resource "aws_vpc_security_group_ingress_rule" "http" {
     security_group_id = aws_security_group.web.id
     cidr_ipv4         = "0.0.0.0/0"
     from_port         = 80
     to_port           = 80
     ip_protocol       = "tcp"
   }

   # Without this the instance cannot reach the internet to download packages.
   resource "aws_vpc_security_group_egress_rule" "all" {
     security_group_id = aws_security_group.web.id
     cidr_ipv4         = "0.0.0.0/0"
     ip_protocol       = "-1"
   }

   resource "aws_instance" "myec2" {
     ami                    = data.aws_ami.al2023.id
     instance_type          = "t2.micro"
     key_name               = "terraform-key"
     vpc_security_group_ids = [aws_security_group.web.id]

     connection {
       type        = "ssh"
       user        = "ec2-user"
       private_key = file("./terraform-key.pem")
       host        = self.public_ip
     }

     provisioner "remote-exec" {
       inline = [
         "sudo dnf -y install nginx",
         "sudo systemctl enable --now nginx",
       ]
     }

     provisioner "local-exec" {
       command = "echo ${self.public_ip} > server_ip.txt"
     }
   }

   output "url" {
     value = "http://${aws_instance.myec2.public_ip}"
   }
   ```

   (Amazon Linux 2023 uses `dnf`; `yum` also works as an alias. The lecture's AMI used `yum`.)

3. `terraform validate`, then `terraform apply -auto-approve`. Expect lines such as `Provisioning with 'remote-exec'...`, `Connected!`, nginx install output, then `Provisioning with 'local-exec'...`.
4. Open the `url` output in a browser: **Welcome to nginx**. Check `server_ip.txt` in the folder.
5. Provoke each error to recognise it (destroy between attempts):
   - `private_key = "./terraform-key.pem"` (no `file()`): `Failed to read ssh private key: no key found`.
   - Remove `sudo` from a command: superuser privilege error.
   - Delete the SSH ingress rule: the connection times out. Reproduce by hand with `ssh -i terraform-key.pem ec2-user@<ip>`.
6. `terraform destroy -auto-approve`. Delete the key pair in the console if you no longer need it.

---

## 🎯 Exam focus (summary)

What is asked and the usual traps:

- **Resource block:** `resource "TYPE" "NAME" { ... }`; address `TYPE.NAME`; unique per module; the type is fixed by the provider.
- **Arguments vs attributes:** Argument Reference (inputs) vs Attribute Reference (outputs); attributes live in state.
- **Behaviour:** create / destroy / update in place / destroy-and-recreate (`forces replacement`); manual out-of-band changes get reverted unless handled (for example `ignore_changes`).
- **References:** `TYPE.NAME.ATTRIBUTE`; a reference creates an **implicit dependency**; `"${...}"` interpolation only needed when mixing text with a value.
- **Plan vs apply:** plan can pass while apply fails (computed values, invalid AMI, wrong CIDR); a failed apply leaves successfully created resources in state.
- **Data sources:** `data` block, **read-only**, reference `data.TYPE.NAME.ATTR`; shown as `Reading...`; stored in state; filters narrow results; a singular data source matching several objects errors; `aws_ami` with `most_recent` and `owners`.
- **Dependencies:** implicit (reference) vs explicit (`depends_on`); creation in dependency order, destruction in **reverse**; independent resources run in parallel.
- **Meta-arguments:** `depends_on`, `count`, `for_each`, `lifecycle`, `provider`.
- **Provisioners (lower exam weight):** inside a resource; types `local-exec`, `remote-exec`, `file`; `remote-exec` needs `connection` (`ssh`/`winrm`); `self`; creation-time by default and `when = destroy`; failed creation-time provisioner **taints** the resource; `on_failure` is `fail` (default) or `continue`; any resource type, multiple blocks allowed; they are a last resort.
- **Terminology traps:** the `provider` meta-argument vs the `provider` block; resource (create) vs data source (read) with the same name `aws_ami`; `key_name` (name, no `.pem`) vs the `.pem` file; `private_key` takes the file **contents** (`file()`).

---

## Key takeaways

1. A `resource` block declares an infrastructure object: **type** (set by provider) + **local name** (yours) form the unique address `TYPE.NAME`.
2. Terraform makes reality match configuration: create new, destroy removed, update in place where possible, **replace** when the API forbids in-place change. Manual changes are reverted by default.
3. In the current AWS provider a security group and its rules are **separate resources** linked by `security_group_id`; `ip_protocol = "-1"` means all traffic. The older inline `ingress`/`egress` style still works, so do not mix the two on one group.
4. **Attributes** (`id`, `public_ip`, ...) are values the provider returns after creation and stores in state. **Arguments** are what you write. Both are listed in the provider docs.
5. `aws_eip.lb.public_ip` is a **cross-resource reference**. It supplies the value **and** an **implicit dependency**; Terraform orders creation automatically and destroys in reverse.
6. Rules need CIDR blocks: use `"${aws_eip.lb.public_ip}/32"`. A plan that passes does **not** guarantee a successful apply.
7. A **data source** reads existing information (`Reading...`), creates nothing, and is referenced with the `data.` prefix. `aws_ami` + `most_recent` + `owners` + `filter` gives a region-portable "latest image".
8. Use an attribute **reference** when an argument can take it; use **`depends_on`** only when there is no such argument (for example an instance that needs a bucket first).
9. **Provisioners** run commands locally (`local-exec`) or on the new resource (`remote-exec`, needs `connection`) or copy files (`file`). They live inside resource blocks, work on any resource, and can be combined.
10. Provisioners are creation-time by default; `when = destroy` makes them destroy-time. A failed creation-time provisioner **taints** the resource; `on_failure = continue` prevents that. `null_resource` (or `terraform_data`) hosts provisioners that are not tied to a real resource. Prefer `user_data`, images or config-management where possible.

---

## Quick commands / syntax cheat-sheet

### Blocks

```hcl
resource "<TYPE>" "<NAME>" {
  # arguments ...
  depends_on = [<TYPE>.<NAME>]     # explicit dependency (list of addresses)
}

data "<TYPE>" "<NAME>" {
  # query arguments / filters
}

# references
<TYPE>.<NAME>.<ATTR>               # resource attribute (implicit dependency)
data.<TYPE>.<NAME>.<ATTR>          # data source attribute
"${<expression>}/32"               # interpolation inside a string
path.module                        # directory of the current module
```

### Security group, Elastic IP

```hcl
resource "aws_security_group" "sg" { name = "x" }

resource "aws_vpc_security_group_ingress_rule" "in" {
  security_group_id = aws_security_group.sg.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"          # "-1" = all
}

resource "aws_vpc_security_group_egress_rule" "out" {
  security_group_id = aws_security_group.sg.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_eip" "lb" { domain = "vpc" }
```

### Provisioners

```hcl
resource "<TYPE>" "<NAME>" {
  provisioner "local-exec" {                 # runs where Terraform runs
    command    = "echo ${self.private_ip} >> server_ip.txt"
    when       = destroy                     # optional; default is creation time
    on_failure = continue                    # optional; default is fail
  }

  provisioner "remote-exec" {                # runs on the new resource
    inline = ["sudo yum -y install nginx", "sudo systemctl start nginx"]
  }

  provisioner "file" {                       # copies local -> remote
    source      = "app.conf"
    destination = "/tmp/app.conf"
  }

  connection {                               # needed by remote-exec and file
    type        = "ssh"                      # or "winrm"
    user        = "ec2-user"
    private_key = file("./terraform-key.pem")
    host        = self.public_ip
  }
}
```

| Argument | In | Meaning |
|---|---|---|
| `command` | `local-exec` | Command to run locally |
| `inline` | `remote-exec` | List of commands to run remotely (`script` / `scripts` are alternatives) |
| `source`, `destination` / `content` | `file` | What to copy and where |
| `when = destroy` | any provisioner | Run before destroy instead of after create |
| `on_failure = fail \| continue` | any provisioner | Behaviour on error (default `fail`) |
| `type`, `user`, `password`, `private_key`, `host` | `connection` | How to log in |
| `self` | provisioner / connection | The resource containing the provisioner |
| `key_name` | `aws_instance` | EC2 key pair **name** (no `.pem`) |
| `vpc_security_group_ids` | `aws_instance` | Security groups to attach |

### CLI

```bash
terraform validate
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve
terraform state list
terraform state show aws_eip.lb
chmod 400 terraform-key.pem               # Mac/Linux: restrict PEM permissions
ssh -i terraform-key.pem ec2-user@<ip>    # manual connection test
```

---

## ❓ Quiz

1. In `resource "aws_instance" "web" { ... }`, which part can you choose freely and which is fixed by the provider? What is the resource's address?
2. You have two blocks `resource "aws_instance" "app"` with different AMIs in the same configuration. What happens on `terraform plan` and how do you fix it?
3. You change the `Name` tag of an existing EC2 instance in your configuration, and separately change its `ami`. What does `plan` show for each change?
4. Someone adds a tag `Env = production` to an instance in the console. You run `terraform plan`. What does Terraform propose, and what lets you stop it?
5. What is the difference between an argument and an attribute? Where in the docs do you find each?
6. A rule contains `cidr_ipv4 = aws_eip.lb.public_ip`. `terraform plan` shows "3 to add" but `terraform apply` fails on the rule. Why, and what is the fix? What state is the infrastructure in afterwards?
7. In what order does Terraform create and destroy `aws_security_group.prod` and an `aws_instance` that uses `vpc_security_group_ids = [aws_security_group.prod.id]`? Which kind of dependency is this?
8. Your EC2 instance must not start before an S3 bucket exists, but `aws_instance` has no argument that accepts a bucket value. What do you use?
9. What is the difference between a `resource "aws_ami"` and a `data "aws_ami"`, and how would you reference an attribute of the data source?
10. Your configuration has `data "aws_instance" "x" {}` and the region contains two instances. What happens? How is `aws_instances` different?
11. Which three arguments make `data "aws_ami"` return "the newest Amazon-owned image whose name matches a pattern"?
12. Where must a provisioner be written, and what does `remote-exec` need that `local-exec` does not?
13. What does `self` mean in `host = self.public_ip`, and why not write `aws_instance.myec2.public_ip` there?
14. Terraform reports `Failed to read ssh private key: no key found`. What is the usual cause?
15. A creation-time `local-exec` provisioner fails. What happens to the apply, to the resource in the cloud, and to the next `terraform apply`? How do you change that?
16. Does a creation-time provisioner run when you change an instance's tag later (an in-place update)? What about `when = destroy`?

### Answers

1. The **local name** (`web`) is yours; the **type** (`aws_instance`) is fixed by the provider. The address is `aws_instance.web`.
2. `plan` errors because the resource `aws_instance.app` is already declared: type + name must be unique. Rename one (for example `app_v2`) and both are planned.
3. The tag change is an **in-place update** (`~`). The `ami` change shows `-/+` with `# forces replacement`, because AWS cannot swap the image of an existing instance.
4. Terraform proposes to **remove** the tag, because it is not in the configuration (real world should match config). Adding `lifecycle { ignore_changes = [tags] }` makes plan show no changes ([08](08-lifecycle-conditions-sensitive.md)).
5. An **argument** is an input you set in the resource block (Argument Reference); an **attribute** is a value the provider returns and stores in state (Attribute Reference). Both are on the resource's docs page.
6. Plan cannot know computed values (the EIP is not known until it exists), and a rule requires a **CIDR** (`x.x.x.x/32`), not a bare IP, which the API rejects at apply. The EIP and security group were created but the rule was not, so you have "half" the infrastructure. Fix: `cidr_ipv4 = "${aws_eip.lb.public_ip}/32"` and apply again; only the missing rule is created.
7. Create: security group first, then the instance. Destroy: instance first, then the group (reverse). It is an **implicit** dependency (an attribute reference).
8. The **`depends_on`** meta-argument: `depends_on = [aws_s3_bucket.example]`. This is an explicit dependency, used because no argument can take the bucket's value.
9. The **resource** creates an AMI; the **data source** reads the ID of an existing registered AMI. They are in different docs sections. Reference: `data.aws_ami.<name>.id` (or `.image_id`). Without the `data.` prefix you would be referencing a resource.
10. It **errors**: `multiple EC2 instances matched; use additional constraints ...`. The singular data source must match exactly one, so add a `filter`. `aws_instances` (plural) returns lists of IDs/IPs for many instances, with less detail.
11. `most_recent = true`, `owners = ["amazon"]`, and a `filter { name = "name" values = ["<pattern>-*"] }`.
12. Inside a **resource block**. `remote-exec` needs a **`connection`** block (`ssh` or `winrm`) to reach the new resource; `local-exec` needs only a `command`.
13. `self` is the resource that contains the provisioner. Naming the resource by its own address inside itself creates a self-referential cycle; `self` avoids it.
14. `private_key` was given a path/name instead of the key **contents**. Use `private_key = file("./terraform-key.pem")`.
15. By default (`on_failure = fail`) the **apply fails**, but the resource **still exists** in the cloud and is marked **tainted**; the next apply destroys and recreates it. Setting `on_failure = continue` on the provisioner makes the error ignored, the apply succeeds, and the resource is not tainted.
16. No: creation-time provisioners run only on creation (or when the resource is replaced). A provisioner with `when = destroy` runs **before** the resource is destroyed.

---

## Glossary

| Term | Meaning |
|---|---|
| **Resource** | A block that creates and manages an infrastructure object |
| **Local name** | Your label for a resource block; with the type forms the address `TYPE.NAME` |
| **Argument** | An input value you set inside a block |
| **Attribute** | A value exported by a resource or data source (often known only after creation) and stored in state |
| **Reference** | An expression like `aws_eip.lb.public_ip` that reads another object's attribute |
| **Interpolation** | `${...}` inside a string: evaluate the expression and substitute the text |
| **CIDR block** | An IP range written `address/prefix`; `/32` is a single address, `0.0.0.0/0` is all of IPv4 |
| **Ingress / egress** | Inbound / outbound firewall rules |
| **Security group** | AWS's virtual firewall for instances |
| **Elastic IP (EIP)** | A static public IPv4 address in AWS |
| **Data source** | A `data` block that reads existing information; creates nothing |
| **Implicit dependency** | Order inferred because one resource references another's attribute |
| **Explicit dependency** | Order declared with `depends_on` |
| **Meta-argument** | A special argument usable in resource blocks (`depends_on`, `count`, `for_each`, `lifecycle`, `provider`) |
| **Provisioner** | A block inside a resource that runs commands or copies files around creation or destruction |
| **`local-exec` / `remote-exec` / `file`** | Run locally / run on the remote resource / copy to the remote resource |
| **`connection`** | Block describing how Terraform logs in (`ssh` or `winrm`, user, key, host) |
| **`self`** | Reference to the resource that contains the provisioner |
| **Tainted** | Marked for destroy-and-recreate on the next apply; set when a creation-time provisioner fails |
| **`on_failure`** | Provisioner setting: `fail` (default) or `continue` |
| **`null_resource` / `terraform_data`** | Resources that create nothing themselves; used to host provisioners or triggers |
| **AMI** | Amazon Machine Image: the OS image an EC2 instance boots from; IDs are region-specific |
