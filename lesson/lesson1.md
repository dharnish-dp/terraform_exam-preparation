# Session 1 - Introduction, Exam Blueprint and Infrastructure as Code Fundamentals

**Course:** HashiCorp Certified: Terraform Associate (Zeal Vora / KPLabs)

---

## Session overview

Session 1 sets the stage for the entire course. It is mostly conceptual, with a few short demos, and answers four questions:

1. **Why Terraform?** It appears in job descriptions across DevOps, SRE, cloud, security, networking and ML roles. The instructor also tells how Terraform solved his multi-account AWS hardening problem.
2. **What is the certification?** The exam format, price, how it differs from the Professional exam, and how the course maps to the official exam objectives (blueprint).
3. **How should I use the course?** The GitHub repo, PPT/PDF notes, the Discord community, and why AWS is used for practicals.
4. **What is Infrastructure as Code (IaC), and which IaC tool should I pick?** Manual vs automated infrastructure, the benefits of IaC, the two tool categories (orchestration vs configuration management), and a decision framework with two worked use cases.

> Note: the course's lecture numbering is not contiguous in the supplied transcripts (lectures 3, 5 and 6 are not included). The numbering below follows the file names and is kept as-is.

### Table of contents

| # | Lecture | Main theme |
|---|---------|-----------|
| 1 | [Overview of Terraform and Certification](#lecture-1---overview-of-terraform-and-certification) | Why Terraform matters, instructor's story, providers, associate vs professional |
| 2 | [Exploring Exam Blueprint](#lecture-2---exploring-exam-blueprint) | Where to find objectives, exam details, course ordering vs blueprint |
| 4 | [About the Course and Important Resources](#lecture-4---about-the-course-and-important-resources) | Course philosophy, GitHub repo, PPT notes, Discord, why AWS |
| 7 | [Basics of Infrastructure as Code (IaC)](#lecture-7---basics-of-infrastructure-as-code-iac) | Manual vs automation, IaC definition, benefits, CloudFormation demo |
| 8 | [Choosing Right IaC Tool](#lecture-8---choosing-right-iac-tool) | Orchestration vs configuration management, selection criteria, use cases |

Then: [Key takeaways](#key-takeaways) | [Quick revision Q&A](#quick-revision-qa) | [Glossary](#glossary)

---

## Lecture 1 - Overview of Terraform and Certification

### 1.1 Why Terraform is so important

- Across the industry, job openings in **DevOps, Cloud Engineering, Automation Engineering, SRE, Security Engineering and even Network Engineering** expect candidates to know Terraform.
- **Anecdote:** a senior network engineer friend (a CCNA/CCNP-type person) assumed Terraform was "a DevOps thing" he wouldn't need. Yet in almost every network-engineer interview he was asked Terraform questions.
- **Job postings the instructor showed (examples):**

| Company | Role | Terraform expectation |
|---------|------|----------------------|
| Netflix | Site Reliability Engineer | Infrastructure-as-code tool like Terraform |
| Nvidia | Principal Network Architect | Alongside BGP, VPN etc., "experience using automated configuration management system" including Terraform |
| (ML role) | ML Platform Engineer | Terraform expected |
| Apple | Senior Software Engineer | Terraform expected |

Takeaway: Terraform is expected even in roles that are not traditionally "infrastructure" roles, which is why it is worth learning in depth.

### 1.2 The instructor's story: how Terraform entered the picture

**Context**
- The organization decided to store **credit card / debit card data** on its servers. That requires an extensive set of security compliances such as **PCI DSS**.
- To prepare for compliance and audit they had to implement **AWS hardening guidelines**.
- The popular reference was the **CIS Benchmark for AWS** (a PDF of 100+ pages of controls; the Amazon Web Services Foundations benchmark shown was about 277 pages, another about 237 pages, and others range 300-400 pages). Each control has a rationale, remediation steps and audit steps. Example controls: "ensure no root user account access key exists", "ensure MFA is enabled".
- There was also a custom internal benchmark PDF.

**The problem**
- About **8-9 years earlier**, hardening was done manually. One AWS account took about **2-3 days** of manual effort.
- With 1-2 accounts this is tolerable. Each new account came with root credentials and the instruction "harden it first, then start using it".
- The organization grew: **10, 20, 50 accounts, and eventually more than 100 AWS accounts**. Doing this manually would take **months**.

**The solution - Terraform**
- Instead of manually creating the security configuration in each account, **write the hardening rules once as Terraform code** (they had Terraform rules for AWS Config, GuardDuty, IAM and so on) and **run the same code against every account**.
- Whether the organization has 100 or 1000 accounts, Terraform handles the deployment. The only human job is to author the hardening rules.

### 1.3 The core idea of Terraform

> **Terraform lets us write reusable code that deploys an identical set of infrastructure resources in a repeatable fashion.**

Visualise it as: *Terraform code (the rules)* deployed to *Account 1, Account 2, ... Account 99, ...* with identical results.

### 1.4 Demo: the first `terraform apply`

The instructor had a directory with two Terraform files (pretend they are the "hardening rules"):

| File | What it defines |
|------|----------------|
| virtual machine file | A simple virtual machine (EC2 instance) named `automated VM` |
| firewall file | A firewall (security group) with rules for inbound **port 22** and **port 443** |

Command run from the CLI:

```bash
terraform apply
```

Flow of the demo:
1. Terraform prompts for **confirmation** that the resources should be created.
2. The user types `yes`.
3. Terraform creates the resources.
4. In the AWS console (after refreshing): a new VM called **automated VM** exists, and its security group has two inbound rules (22 and 443). Everything (name, rules) came from the Terraform configuration.

Point: it could be 1 rule or 100 rules; once the rules are written, Terraform deploys them. (Note: the transcript uses "apply" for deployment; the practical details of the workflow come in later sections.)

### 1.5 Providers - the reason for Terraform's popularity

- Terraform is **not limited to AWS**. It supports **thousands of providers**: AWS, Azure, GCP, Kubernetes, Alibaba, Oracle, Cisco, Docker, Active Directory, Helm, Nomad, Akamai (a popular CDN), and many partner providers.
- On the provider registry the instructor showed **more than 116 pages** of providers.
- **Key insight:** once you learn the Terraform **core concepts**, you can write professional-level Terraform for **any** provider. Learning Terraform on AWS does not mean you must relearn everything for Azure. The core concepts stay the same; only the provider-specific resources differ. (This course teaches the core concepts in detail.)

### 1.6 Terraform as the de facto IaC tool, and the certification

- Because of its popularity and ease of writing configuration files, Terraform is considered **one of the most popular IaC solutions, the de facto Infrastructure as Code tool of the industry**.
- HashiCorp therefore introduced an official certification: **HashiCorp Certified: Terraform Associate**, designed to validate knowledge and skills in **core Terraform concepts**.
- Benefit: employers can infer from the certification that you know the core concepts, which helps in interviews. You will also be able to implement Terraform configurations for your organization.

### 1.7 What this course covers

- Starts **from absolute scratch** - no Terraform knowledge assumed.
- First the important **core concepts** (practically), then **advanced topics**.
- Covers **all topics of the official certification exam**.
- The Associate exam is described as **"not a very difficult exam; easy to pass"**.

### 1.8 Associate vs Professional

| | Terraform **Associate** | Terraform **Professional** |
|---|---|---|
| Difficulty | Easier, entry level | "Difficult" |
| Format | Multiple choice (see Lecture 2) | Practical, scenario/lab-based |
| Duration | 1 hour (per Lecture 2) | **4 hours** |
| Style | Knowledge of core concepts | Solve various scenarios; solve them all to pass |
| Course | This course | Separate course by the instructor ("the first Terraform professional certification course in the world") |

Long-term path: take the Associate first; if you love Terraform, consider the Professional later.

### 1.9 About the instructor (Zeal Vora)

- DevSecOps engineer in **defensive security**; long-standing passion for teaching (colleges and universities - wireless, network and cloud security) before online courses.
- Around **17 courses**, **440,000+ students** (as stated in this lecture).
- Certifications: **HashiCorp Terraform Associate and Professional**, Certified Ethical Hacker, multiple AWS certs (Solutions Architect Professional, Advanced Networking, Security Specialty), Red Hat Certified Architect, and 13+ others. Works part-time as a security consultant.

### Exam tips / things to remember (Lecture 1)

- Terraform's selling point: **reusable code -> identical infrastructure -> repeatable deployment**.
- Terraform supports **thousands of providers**; core concepts are provider-independent.
- Associate = core concepts, MCQ-style; Professional = 4-hour practical.
- `terraform apply` asks for confirmation (`yes`) before creating resources.

---

## Lecture 2 - Exploring Exam Blueprint

### 2.1 Why this lecture matters
This is a **certification-specific course**: it covers **all** the pointers of the official exam blueprint (the list of exam objectives).

### 2.2 Where to find the blueprint
- On the HashiCorp website there is a page for **Infrastructure Automation certifications** (link provided with the lecture) covering both **Terraform Associate** and **Terraform Professional**.
- The **HashiCorp Certified: Terraform Associate** page lists the key information to review before sitting the exam, most importantly:
  - **Exam objectives** - everything you must know. This course teaches each objective in detail from a practical viewpoint.
  - **Exam details** page.

### 2.3 Exam facts

| Item | Terraform Associate | Terraform Professional |
|------|--------------------|------------------------|
| Format | **Multiple choice (MCQ)** | **Completely lab-based** (some multiple choice, but you must pass the labs) |
| Duration | **1 hour** | **4 hours** |
| Price (at time of recording) | **70.50 USD** | not stated in this lecture |
| Difficulty | Not very difficult | Difficult |

- If you complete this course you should be well prepared for the Associate, mainly because the questions are MCQ-based.
- If you fail the labs in the Professional exam you cannot clear it. A detailed separate course exists for the Professional exam, to consider after the Associate.
- (Extra context) Prices, duration and the exam version change over time; always confirm on HashiCorp's official certification page before booking.

### 2.4 Course order vs blueprint order
- The **order of topics in this course differs from the blueprint** (e.g. it will not necessarily go objective 1a, 1b, 1c, 2a, 2b, 2c ...).
- This is deliberate: the course assumes **no prior Terraform experience**, so the instructor orders topics in the way that is best for learning step by step.
- **All** blueprint topics are still covered.

### Exam tips / things to remember (Lecture 2)

- Associate: **MCQ, 1 hour, 70.50 USD** (as quoted).
- Professional: **lab-based, 4 hours**.
- Use the official exam objectives as a checklist while studying; do not expect the course to follow it sequentially.

---

## Lecture 4 - About the Course and Important Resources

> The instructor says: "This video is very important. Do not skip it."

### 4.1 Course objective and alignment
- It is a **certification-specific** course covering all blueprint objectives.
- If HashiCorp **adds or changes objectives**, the course is **updated accordingly** - the course aims to always be aligned with the latest exam blueprint.

### 4.2 Course design philosophy
Instructors generally choose between two approaches:

| Approach | What it does | Result |
|----------|-------------|--------|
| 1. Theory + basic demos | Cover exam theory with basic demos | Shorter course |
| 2. Everything practically and in detail | Practical coverage of all objectives, explaining caveats and real-world challenges | Longer course, deeper learning |

This course (and all of the instructor's courses) uses **approach 2**. It is longer, but meant to help your career and improve the infrastructure your organization runs.

### 4.3 Important resources

| Resource | Purpose |
|----------|---------|
| **GitHub repository** ("Terraform beginner to advanced resources") | Holds all Terraform configuration files, commands and documentation links used in the practicals. Section and lecture folder names match the course (e.g. section "Remote State Management", "Deploying Infrastructure with Terraform"; lecture "Launch first virtual machine through Terraform"). |
| **PPT slides as PDF** | Downloadable from the lecture called **"Central PPT notes"** in the first section of the course. Very useful for revision. |
| **Discord community** (link: `kplabs.in/chat`) | Optional. Peers preparing for the same certification plus a dedicated technical support team; tens of thousands of members. |

**What the GitHub repo looks like (from the cloned repo, for reference):**
The repo `Readme.md` is titled "HashiCorp Certified Terraform: Associate", states it contains all code files used throughout the course, and mentions the Discord community (`https://kplabs.in/chat`). Top-level folders correspond to course sections:

```text
Section 1 - Deploying Infrastructure with Terraform
Section 2 - Read, Generate, Modify Congiruations
Section 3 - Terraform Provisioners
Section 4 - Terraform Modules & Workspaces
Section 5 - Remote State Management
Section 6 - Security Primer
Section 7 - Terraform Cloud & Enterprise Capabilities
```

(The folder name "Congiruations" is spelled that way in the repo.) Session 1 contains no code, so nothing from the repo is applied here.

### 4.4 Why AWS is used for the labs

- Terraform supports Azure, AWS, GCP, Kubernetes etc.; the course needs one for demos and picks **AWS**.
- The course is **not about learning AWS**. AWS is used only as a vehicle to learn **Terraform core concepts**, using very basic services: a **simple virtual machine**, a **simple AWS user**, simple firewall rules.
- **Terraform structure and concepts remain the same irrespective of provider.** A VM created in AWS during the course can tomorrow be created in Azure, GCP, DigitalOcean etc. using the same core knowledge.
- The student base is large (the lecture says **140,000+ students** - note this differs from the 440,000 figure in Lecture 1; the recordings were made at different times, so treat the numbers as approximate). Many come from Azure/GCP backgrounds, completed the course, and apply Terraform there.
- Prerequisite: only basic knowledge of **simple VMs and firewall rules** is enough.
- Outcome: certification **and** the ability to implement Terraform on the platform your organization uses (Kubernetes, Azure, GCP, ...).

### Exam tips / things to remember (Lecture 4)

- Course sections mirror the GitHub repo sections; use the repo for exact configs and commands.
- Download the PDFs (Central PPT notes) for revision.
- Core Terraform concepts are provider-agnostic - do not worry if you do not know AWS in depth.

---

## Lecture 7 - Basics of Infrastructure as Code (IaC)

### 7.1 Two ways to create and manage infrastructure
1. **Manual** - click through the console/GUI or run commands by hand.
2. **Automation** - mature medium/large organizations manage infrastructure this way, with many benefits.

### 7.2 The instructor's example: nightly database backup

**Requirement**
- Take a database backup **every day at 10:00 PM**.
- Store it in **Amazon S3** with a timestamped name, e.g. `backup-01-01-2024`, `backup-02-01-2024`, ...

**What happened**
1. **Manual phase:** because of other priorities and because untested code should not go to production, he did it by hand every night - including weekends. Wasteful and error-prone.
2. **Automated phase:** later he wrote a small **Python** script that took the backup, added the timestamp, uploaded to S3, and scheduled it with **cron** at 10 PM.

**Lesson:** *if a task must be done repeatedly, automate it.* The tool depends on the task: Python for the backup; Ansible, CloudFormation, Terraform etc. for other tasks.

### 7.3 Applying this to infrastructure: multiple environments

Scenario: one service needs a set of resources - **virtual machine, database, object storage (S3), AWS user** - with the **same configuration** in several environments:

```text
Development  ->  Staging  ->  Production
(VM + DB + S3 + user)  (same set)  (same set)
```

A medium/large organization may have **hundreds** of such services.

**Problems with the manual approach**
- After six months someone asks you to replicate the dev setup into staging - **you forget the configuration** and have to inspect resources one by one.
- High chance of **misconfiguration**, so the app doesn't work in staging.
- Very **time-consuming**.

**The automated approach**
- Use an **IaC tool** (because we are creating infrastructure like VMs and database servers).
- Even 7 months later, the code already exists - **you only have to deploy it** to the new environment.

### 7.4 Definition

> **Infrastructure as Code (IaC)** is the managing and provisioning of infrastructure through **code** instead of through manual processes.

- Manual: log in to AWS and create a server by hand.
- IaC: write code; the IaC tool deploys the infrastructure for you.
- The code **syntax depends on the tool**. The instructor showed the same "create an AWS server" in **CloudFormation** (left) and **Terraform** (right): different code, same idea - infrastructure deployed through code, nothing done manually.
- Organizations choose different tools. The instructor has used CloudFormation and Terraform extensively and has seen Terraform preferred in most organizations; this does **not** mean CloudFormation is bad - it is AWS-specific and has its own advantages.

### 7.5 Demo: manual vs CloudFormation (IaC)

1. **Manual way (avoid):** in the AWS console choose *Launch instance*, then specify the OS and many other options.
2. **IaC way with AWS CloudFormation:**
   - Create a stack and choose **"Upload a template file"**.
   - Upload a local template that defines a basic EC2 server.
   - Give the stack a name (`cf-ec2`), click **Next** through the options, then **Submit**.
   - CloudFormation reads the template and creates the resources; a new EC2 instance appears and goes to "running".

The instructor stressed this is a concept demo; you are not expected to replicate it.

### 7.6 Benefits of IaC

| Benefit | Explanation |
|---------|-------------|
| **Speed of infrastructure management** | Writing the code takes time once, but afterwards you can deploy e.g. 10 services to 100, 200, 300 AWS accounts repeatedly. |
| **Low risk of human error** | No more forgetting a specific option and breaking the app. |
| **Version control** | Code can be committed to GitHub; pull requests, approvals, history. |
| **Easy collaboration between teams** | Code lives in a shared repo so several members work on the same infrastructure code. |

### Exam tips / things to remember (Lecture 7)

- **Definition:** IaC = managing and provisioning infrastructure through code instead of manual processes.
- **Four benefits** (speed, fewer human errors, version control, collaboration) are classic exam material.
- IaC tools differ in code syntax (CloudFormation JSON/YAML templates vs Terraform configuration) but share the same goal.
- Repeatable task -> automate it.

---

## Lecture 8 - Choosing Right IaC Tool

### 8.1 The tool landscape
Once you decide IaC is right for your organization, you must pick a tool. Examples mentioned: **Terraform, CloudFormation, Heat, Ansible, SaltStack, Chef, Puppet** and others.

### 8.2 Two categories

| Category | Primary purpose | Examples |
|----------|----------------|----------|
| **Infrastructure Orchestration** | **Create and manage infrastructure** (raw infrastructure) | **Terraform, CloudFormation**, Heat (Heat is mentioned in the list of tools; it is OpenStack's orchestration tool - extra context) |
| **Configuration Management** | **Maintain the desired configuration of systems (inside the servers)** | **Ansible, Chef, Puppet**, SaltStack (extra context: SaltStack is also in this category) |

**Rule of thumb from the lecture:** to adopt IaC, **prefer infrastructure-orchestration tools** over configuration-management tools. Configuration-management tools *can* also create infrastructure (e.g. Ansible modules can create an EC2 instance), but that is only their **secondary** purpose.

### 8.3 Configuration management in more detail
- Used to configure what is *inside* servers after they are launched: configure the application, install an **antivirus agent** or **IPS agent**, tweak configuration inside the server.
- Example: **Ansible** managing a set of servers.
- Ansible also has documentation for creating AWS resources like EC2 - but that is not its main strength.

### 8.4 Infrastructure orchestration in more detail
- Aim: create and manage infrastructure.
- Example requirement: "Create **three servers with 4 GB RAM and 2 vCPUs**, each with a firewall rule allowing **SSH from office IPs**."
- This is **raw infrastructure** - it does *not* deal with what is installed inside the server (e.g. installing antivirus on the three servers).
- For such requirements use **Terraform or CloudFormation**; both can deploy an EC2 instance with wide-ranging options.

### 8.5 IaC (orchestration) and configuration management are friends
Larger organizations commonly combine them:

```text
1. Terraform (orchestration)  -> creates the EC2 instance (raw infrastructure)
2. Terraform notifies Ansible (configuration management)
3. Ansible logs in to the server via SSH
4. Ansible installs/configures the application or antivirus (desired state inside the server)
```

- The IaC tool is **not** the right place to manage the desired state *inside* servers.
- Not every IaC tool integrates with configuration management equally well. **Terraform works well with this kind of setup.** Other organizations may use CloudFormation or other tools, so the choice depends on requirements.

### 8.6 Four questions for choosing an IaC tool
1. Will your infrastructure be **vendor-specific** in the long term? (e.g. only AWS for the next 10 or 25 years)
2. Are you planning a **multi-cloud or hybrid-cloud** infrastructure? (e.g. part in AWS, part in your own data center)
3. How well should the IaC tool **integrate with configuration management** tools like Ansible, Puppet, etc.?
4. **Price and support** associated with the tool.

### 8.7 Worked use case 1 -> CloudFormation

**Requirements**
- Organization will be on **AWS for the next 25 years** (a clear-cut requirement that simplifies the decision).
- **Official support** needed - someone who can read your code and help diagnose an error (e.g. an EC2 deployment failing).
- A **graphical interface with automatic code generation**.

**Answer: CloudFormation.**
- **Designer** in the CloudFormation console: drag resources (e.g. search "EC2" and add an *EC2 Instance*; drag a *Security Group*; connect resources). The template code is generated automatically.
- **Support:** with an AWS Support subscription, you can contact the AWS support team to read your CloudFormation code and help find the issue.
- Instructor's side note: in larger organizations people usually do **not** use the GUI; they write the code by hand. But *for these requirements*, CloudFormation is the perfect fit.

### 8.8 Worked use case 2 -> Terraform

**Requirements**
- **Hybrid solution:** **VMware** on-premises plus **AWS, Azure and GCP** in the cloud (three clouds + VMware in the data center).
- **Official support** is required when the IaC tool has bugs or doesn't behave per documentation (larger organizations generally want vendor support rather than relying on community help).

**Answer: Terraform.**
- Terraform has hundreds (thousands, per Lecture 1) of providers and deploys across platforms: AWS, Azure, GCP, and **VMware** (the instructor showed the official **vSphere** provider).
- Terraform is primarily maintained by **HashiCorp**, which offers an **official support** portal (Help Center with ticketing and **SLAs for enterprises**). HashiCorp also makes other products such as **Vault** and **Consul**.
- CloudFormation is AWS-only, so it cannot meet requirement 1.

### 8.9 Decision summary

| Situation | Better choice |
|-----------|--------------|
| Only AWS long term, want AWS-backed support, want GUI/designer | **CloudFormation** |
| Multi-cloud / hybrid (AWS + Azure + GCP + VMware), want vendor support | **Terraform** |
| Need to configure software *inside* servers after creation | **Configuration management** (Ansible, Chef, Puppet), ideally triggered after Terraform creates the servers |
| Creating/managing raw infrastructure (VMs, networks, firewall rules) | **Infrastructure orchestration** (Terraform, CloudFormation) |

### Exam tips / things to remember (Lecture 8)

- Know the **two categories** and which tools belong to each:
  - Orchestration: Terraform, CloudFormation (Heat)
  - Configuration management: Ansible, Chef, Puppet (SaltStack)
- Recommendation: use **orchestration** tools for IaC; config-management is complementary ("friends").
- Terraform = **cloud-agnostic**, multi-provider, with official HashiCorp support; CloudFormation = **AWS-specific**.
- The workflow "Terraform provisions -> Ansible configures" is a typical large-organization pattern.

---

## Key takeaways

1. Terraform is expected knowledge across DevOps, SRE, cloud, security, networking and ML roles, and is the de facto IaC tool.
2. Terraform's core idea: write reusable code once and deploy an **identical** set of resources **repeatedly**, e.g. across 100+ AWS accounts.
3. Terraform supports **thousands of providers** (AWS, Azure, GCP, Kubernetes, Docker, VMware vSphere, Cisco, Oracle, Alibaba, Helm, Nomad, Akamai ...). Core concepts are the same for all of them.
4. **Exam facts quoted:** Terraform Associate = **multiple choice, 1 hour, 70.50 USD**. Professional = **lab-based, 4 hours**, difficult.
5. The course covers **all** official exam objectives, but not in blueprint order; it is updated when the blueprint changes.
6. Resources: **GitHub repo** (code and commands per lecture), **Central PPT notes** PDFs, optional **Discord** (kplabs.in/chat).
7. AWS is used only as the vehicle to learn Terraform core concepts; knowing a basic VM and firewall rule is enough.
8. Repeatable tasks should be **automated**. Manual infrastructure is slow, error-prone, hard to replicate (you forget the configuration).
9. **IaC** = managing and provisioning infrastructure through code instead of manual processes.
10. **IaC benefits:** speed, low risk of human error, version control, easy collaboration.
11. IaC tools fall into **infrastructure orchestration** (Terraform, CloudFormation) and **configuration management** (Ansible, Chef, Puppet). Prefer orchestration for IaC; use configuration management for in-server state, and combine them.
12. Choose a tool by asking: vendor lock-in? multi-/hybrid-cloud? integration with config management? price and support?
13. AWS-only + AWS support + GUI -> CloudFormation. Multi-cloud/hybrid + official support -> Terraform.

---

## Quick revision Q&A

**1. Why did the instructor start using Terraform?**
To implement AWS hardening guidelines (CIS benchmark) across a growing number of AWS accounts (10, 50, 100+). Manual implementation took 2-3 days per account; Terraform let them write the hardening rules once and apply them to every account.

**2. What is the main concept of Terraform?**
Reusable code that deploys an identical set of infrastructure resources in a repeatable fashion.

**3. What command was used in the first demo to create the VM and firewall, and what happens before resources are created?**
`terraform apply`; Terraform asks for confirmation, and you answer `yes`.

**4. Why is Terraform so popular?**
It supports thousands of providers (AWS, Azure, GCP, Kubernetes, VMware, Docker, etc.), and once you know the core concepts you can use them with any provider.

**5. What is the format, duration and price of the Terraform Associate exam?**
Multiple choice; 1 hour; 70.50 USD (as quoted in the lecture).

**6. How does the Professional exam differ?**
It is lab-based (scenario-solving), 4 hours, and considerably harder; you must pass the labs.

**7. Does this course follow the exam blueprint order?**
No. It reorders topics to be beginner-friendly but covers all exam objectives and is updated when the objectives change.

**8. Why is AWS used in the course if Terraform is multi-provider?**
Just to demonstrate the concepts with simple resources (VM, user, firewall rules). Terraform structure and concepts are the same regardless of provider.

**9. Where do you find the code used in each lecture, and where are the slides?**
The GitHub repository (sections and lectures named like the course) for code and commands; the "Central PPT notes" lecture in the first section for PDF slides.

**10. Define Infrastructure as Code.**
Managing and provisioning infrastructure through code instead of manual processes.

**11. List the benefits of IaC.**
Speed of infrastructure management, low risk of human errors, version control, easy collaboration between teams.

**12. What are the two categories of IaC tools, and which should you prefer for building infrastructure?**
Infrastructure orchestration (Terraform, CloudFormation) and configuration management (Ansible, Chef, Puppet). Prefer orchestration tools for creating and managing infrastructure.

**13. How do orchestration and configuration management tools work together?**
Terraform creates the servers, then hands off to a configuration management tool such as Ansible, which logs in (e.g. over SSH) to install and configure the application or antivirus inside the server.

**14. An organization uses only AWS for 25 years, needs official support and a GUI with code generation. Which tool?**
CloudFormation (Designer GUI, AWS Support). For multi-cloud/hybrid (AWS + Azure + GCP + VMware) with official support, choose Terraform (HashiCorp support, many providers).

---

## Glossary

| Term | Meaning |
|------|---------|
| **Terraform** | HashiCorp's infrastructure-as-code tool that deploys and manages infrastructure from configuration files across many providers. |
| **HashiCorp** | The company that maintains Terraform (and Vault, Consul, Nomad, etc.) and provides official support and the certifications. |
| **Infrastructure as Code (IaC)** | Managing and provisioning infrastructure using code rather than manual processes. |
| **Provider** | A plugin/integration that lets Terraform manage a platform (AWS, Azure, GCP, Kubernetes, VMware vSphere, etc.). |
| **Infrastructure orchestration** | Tools whose primary job is to create and manage raw infrastructure (Terraform, CloudFormation). |
| **Configuration management** | Tools whose primary job is to maintain the desired configuration inside systems/servers (Ansible, Chef, Puppet). |
| **CloudFormation** | AWS's own IaC service; AWS-specific; uses templates and has a Designer GUI. |
| **Ansible** | Popular configuration management tool; can SSH into servers to install and configure software. |
| **Hybrid cloud** | Infrastructure spread across on-premises data centers (e.g. VMware) and public cloud(s). |
| **Multi-cloud** | Using more than one cloud provider (e.g. AWS + Azure + GCP). |
| **CIS Benchmark** | Industry security hardening guidelines (e.g. for AWS), with rationale, remediation and audit steps per control. |
| **PCI DSS** | Payment Card Industry Data Security Standard; compliance needed when storing credit/debit card data. |
| **Hardening** | Applying security configuration to reduce attack surface (e.g. enforcing MFA, no root access keys). |
| **Exam blueprint / objectives** | The official list of topics tested in the certification exam. |
| **Terraform Associate** | Entry-level HashiCorp certification; MCQ, 1 hour. |
| **Terraform Professional** | Advanced HashiCorp certification; lab-based, 4 hours. |
| **MCQ** | Multiple-choice question. |
| **EC2 instance** | AWS virtual machine ("server"). |
| **Amazon S3** | AWS object storage. |
| **Cron** | Unix scheduler used in the lecture to run the backup script at 10 PM. |
| **Environment (dev/staging/prod)** | Separate deployments of the same application; IaC lets you replicate infrastructure identically across them. |
| **Central PPT notes** | The course lecture with downloadable PDF slides. |
| **Discord community** | Optional peer and support community at kplabs.in/chat. |
