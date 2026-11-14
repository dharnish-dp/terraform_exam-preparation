# 00 — Prerequisites (the pre-concepts)

> **Exam domain(s):** none directly (foundation for every domain)   **Source:** lesson 1 (lecture 4), lesson 2 (lecture 10, PATH), lesson 3 (lectures 23–24, 25), lesson 4 (lectures 38–41), plus standard beginner background   **Time:** ~3 h (skim what you already know)

This chapter is the "stuff the instructor assumes you already know". If you can already use a terminal, read JSON/YAML, and have an AWS account with an IAM user and billing alert, skim the headings and jump to [01](01-iac-and-terraform-intro.md). If any of that is shaky, work through the matching part: every later chapter leans on it.

## What you will learn

- Use a terminal confidently: move around folders, create and read files, run commands with flags, and stop a running command.
- Explain what `PATH` and environment variables are and why a freshly downloaded program can say "command not found".
- Read and write the three formats you meet in this course: JSON, YAML and HCL.
- Describe what "cloud" means and why everything in the cloud is, underneath, an API call.
- Set up a safe AWS learning environment: account, root-user MFA, billing alert, a non-root IAM user, access keys, the AWS CLI and a working `aws sts get-caller-identity`.
- Explain regions, EC2 instances, AMIs, instance types, key pairs, ports and security groups well enough to follow every demo.
- Use Git and `.gitignore` at a basic level, and never commit secrets.
- Hold the right mental model: declarative vs imperative, desired vs current state, "plan before apply".
- Know how this material and the original course are organised, and the three rules for doing labs.

---

## 🧠 Pre-concept: why a "prerequisites" chapter at all?

Terraform is a command-line tool that talks to cloud APIs on your behalf. That sentence already contains four things a beginner can trip on: the *command line*, *cloud*, *APIs* and *credentials*. The Terraform exam itself is **provider-agnostic**: it tests Terraform concepts (state, variables, modules, workflow) and not AWS knowledge. But you cannot learn the concepts without creating real things, and the course uses AWS for that.

The instructor is explicit about this (lesson 4, lecture 39):

> AWS has 200+ services, but the course does **not** aim to teach AWS. AWS is just the vehicle used to learn **Terraform core concepts**, using only a few very basic services that exist in every cloud.

So treat the AWS content below as "the minimum you need to follow the demos", nothing more.

---

## Part 1 — Terminal survival kit

A **terminal** (also called shell, console or command line) is a text window where you type commands and the computer prints results. Terraform has no graphical interface: you will type `terraform plan` and `terraform apply` many hundreds of times.

| OS | Open a terminal with | Default shell |
|---|---|---|
| macOS | Spotlight (`Cmd+Space`) → "Terminal" (or iTerm2) | `zsh` |
| Linux | `Ctrl+Alt+T` (varies) | `bash` |
| Windows | Start → "PowerShell" or "Windows Terminal" (WSL2 + Ubuntu gives you a Linux shell) | PowerShell |

The commands below are the same on macOS and Linux. The Windows PowerShell equivalents are in the right-hand column (PowerShell also accepts many of the Linux names like `ls`, `cd`, `cat`).

### Navigation and files

| Command | What it does | Example | PowerShell equivalent |
|---|---|---|---|
| `pwd` | Print the folder you are in ("print working directory") | `pwd` | `pwd` / `Get-Location` |
| `ls` | List files | `ls -la` (long format, includes hidden files) | `ls` / `dir` |
| `cd <folder>` | Change folder | `cd ~/Desktop` | `cd $HOME\Desktop` |
| `cd ..` | Go up one folder | | `cd ..` |
| `cd` (alone) / `cd ~` | Go to your home folder | | `cd ~` |
| `mkdir <name>` | Make a folder | `mkdir tf-lab1` | `mkdir tf-lab1` |
| `touch <file>` | Create an empty file | `touch main.tf` | `ni main.tf` (New-Item) |
| `cat <file>` | Print a file's contents | `cat main.tf` | `cat main.tf` / `Get-Content` |
| `cp a b` | Copy a file | `cp main.tf main.bak` | `cp` |
| `mv a b` | Move or rename | `mv main.tf first_ec2.tf` | `mv` |
| `rm <file>` | Delete a file (**no recycle bin**) | `rm old.txt` | `rm` |
| `rm -rf <folder>` | Delete a folder and everything inside. **Dangerous** | `rm -rf tf-lab1` | `rm -r -fo tf-lab1` |
| `clear` | Clear the screen (`Ctrl+L` also works) | | `cls` |

Key ideas:

- **Folder = directory.** Terraform cares enormously about the *current working directory*, because it reads every `.tf` file in the folder you run it from (see [03](03-core-workflow.md)). The most common beginner mistake in lesson 3 is running `terraform plan` from the wrong folder and getting "No configuration files".
- **Hidden files** start with a dot (`.terraform`, `.gitignore`). Plain `ls` hides them; `ls -a` shows them.
- **Paths**: `/Users/me/Desktop/tf-lab1` is an *absolute* path (starts at the root). `./main.tf` or `main.tf` is *relative* to where you are now. `~` means your home folder.
- **Tab completion**: type the first letters of a name and press `Tab`; the shell completes it. This saves typos.
- **Up arrow** recalls previous commands; `Ctrl+C` interrupts a running command. (Interrupting `terraform apply` mid-run is something you normally want to avoid; see [03](03-core-workflow.md) and the lock discussion in [10](10-backends-locking-drift.md).)

### Commands, arguments, flags

Most commands look like this:

```text
terraform apply -auto-approve -var="region=us-east-1"
│         │     │             └── a flag that takes a value (key=value)
│         │     └── a flag (on/off switch)
│         └── sub-command
└── the program
```

- A **flag** (also "option") starts with `-` or `--` and modifies behaviour. Terraform uses a single dash for long flags: `-auto-approve`, not `--auto-approve`.
- Quote values that contain spaces: `-var="name=my server"`.
- `terraform -help` or `terraform apply -help` shows the built-in manual for any command.

### Editing files

You need a text editor that does not add hidden formatting. **Visual Studio Code** (free) is what the instructor uses, and the official **HashiCorp Terraform** extension gives syntax colours and autocomplete for `.tf` files. Do **not** use Word or WordPad.

From the terminal you can open the current folder in VS Code with `code .` (if the `code` command is installed: in VS Code run "Shell Command: Install 'code' command in PATH" from the command palette).

For quick edits inside a terminal you can use `nano main.tf` (save with `Ctrl+O`, exit with `Ctrl+X`).

### Reading output and errors

- Commands print to the screen and then return control to you. If the cursor does not come back, the command is still running (or is waiting for you to type `yes`).
- An **exit code** tells scripts whether the command succeeded (`0` = success). `echo $?` shows the last one on macOS/Linux. Terraform uses this in automation: for example `terraform plan -detailed-exitcode` (see [03](03-core-workflow.md)).
- Read errors from the **top**: the first error is usually the cause and later ones are fall-out. Terraform's error messages are unusually good: they print the file name, line number and a snippet.

⚠️ **Gotcha:** `command not found` (macOS/Linux) or `'terraform' is not recognized` (Windows) almost never means "Terraform is broken". It means the shell cannot find the program. That is a `PATH` problem, explained next.

---

## Part 2 — `PATH` and environment variables

### Environment variables

An **environment variable** is a named value that the operating system hands to every program you start. Programs read them to change behaviour without changing code.

```bash
# macOS / Linux
export AWS_REGION=us-east-1      # set it (for this terminal session only)
echo $AWS_REGION                 # read it  -> us-east-1
env | grep AWS                   # list all variables whose line contains AWS
unset AWS_REGION                 # remove it
```

```powershell
# Windows PowerShell
$env:AWS_REGION = "us-east-1"
echo $env:AWS_REGION
Remove-Item Env:AWS_REGION
```

Why you care: Terraform and the AWS tools read many variables, for example `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `TF_VAR_<name>` (set an input variable, see [06](06-variables-outputs-locals.md)), `TF_LOG` (turn on debug logging, see [11](11-import-state-cli-logging.md)).

⚠️ **Gotcha:** a variable you `export` lives only in that terminal window. Open a new window and it is gone. To make it permanent on macOS (zsh) add the `export` line to `~/.zshrc`; on most Linux (bash) to `~/.bashrc`; on Windows use "Edit the system environment variables".

### The `PATH` variable

`PATH` is the environment variable that answers: **"When I type a command name, which folders should the shell search for a program with that name?"**

```bash
echo $PATH
# /opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin   <- folders separated by ':' (';' on Windows)
which terraform          # shows which file would run (macOS/Linux)
# /opt/homebrew/bin/terraform
```

When you type `terraform`, the shell looks in the first folder for a file called `terraform`, then the second folder, and so on. The first match runs. If no folder contains it you get "command not found".

```text
you type: terraform
          │
          ▼
shell searches PATH folders in order
  1. /opt/homebrew/bin   -> found "terraform"?  yes -> RUN IT
  2. /usr/local/bin      -> (not reached)
  3. ...
none contain it -> "command not found"
```

Consequences you will meet in [01](01-iac-and-terraform-intro.md) (installing Terraform):

1. A program is found only if its folder is on `PATH` (or you are standing in that folder: the Windows `cmd` shell checks the current folder first, whereas macOS/Linux shells need `./terraform`). The instructor demonstrates this live on Windows: `terraform.exe` works on the Desktop only because he runs it *from* the Desktop; from any other folder it fails until the folder (`C:\binaries`) is added to `PATH`.
2. A **package manager** (Homebrew, apt, Chocolatey) installs the program into a folder that is already on `PATH`, so it just works.
3. After you change `PATH`, **open a new terminal**; existing windows keep the old value.
4. This is not Terraform-specific: the same rule applies to the AWS CLI, `git`, `kubectl`, anything.

---

## Part 3 — File formats: JSON, YAML, HCL

Configuration and data in the cloud world is written in a handful of text formats. Terraform uses HCL for what you write and JSON for what it writes. You also need to read the other two because AWS policies, CloudFormation, Ansible and CI pipelines use them.

The **same information** in all three formats (a server description):

**JSON** (JavaScript Object Notation): strict, quoted keys, braces and brackets, no comments, no trailing commas.

```json
{
  "name": "web-1",
  "instance_type": "t2.micro",
  "monitoring": true,
  "ports": [22, 80, 443],
  "tags": { "env": "dev", "owner": "ravi" }
}
```

**YAML** (YAML Ain't Markup Language): indentation-based, no braces, comments with `#`. Used by CloudFormation, Ansible, GitHub Actions, Kubernetes.

```yaml
name: web-1
instance_type: t2.micro
monitoring: true
ports:
  - 22
  - 80
  - 443
tags:
  env: dev
  owner: ravi
```

**HCL** (HashiCorp Configuration Language): designed for humans to write infrastructure. Comments allowed, blocks and arguments, expressions and references.

```hcl
# a map of tags and a list of ports as input values
name          = "web-1"
instance_type = "t2.micro"
monitoring    = true
ports         = [22, 80, 443]
tags = {
  env   = "dev"
  owner = "ravi"
}
```

| | JSON | YAML | HCL |
|---|---|---|---|
| Comments | no | `# ...` | `#`, `//`, `/* */` |
| Structure | `{}` and `[]` | indentation | blocks `{}` + `key = value` |
| Easy for humans to write | meh (quotes and commas) | yes, but whitespace errors | yes |
| Where you meet it here | `.tfstate` files, IAM policies, `aws` CLI output, `.tf.json`, `*.tfvars.json` | CloudFormation, Ansible, GitHub Actions | `.tf`, `.tfvars` |

Key facts:

- HCL is the language Terraform configurations are written in. Terraform *can* also read configuration written in JSON (file name ends `.tf.json`), meant for programs that generate config, not for humans. See [01](01-iac-and-terraform-intro.md).
- The **state file** `terraform.tfstate` is JSON. You never edit it by hand ([04](04-state-basics.md)).
- ⚠️ **Gotchas:** JSON does not allow a trailing comma after the last item; YAML uses spaces, never tabs; HCL values are separated by newlines, not commas, inside a block (commas are only used inside lists and maps written on one line).

---

## Part 4 — Cloud and "everything is an API"

**Cloud computing** = renting computing resources (servers, storage, databases, networks) from a provider over the internet, paying for what you use, and creating or deleting them in minutes.

| Layer | You rent | Example |
|---|---|---|
| IaaS (infrastructure) | raw servers, disks, networks | AWS EC2, Azure VM, Google Compute Engine, DigitalOcean droplet |
| PaaS (platform) | a managed runtime or database | AWS RDS, Elastic Beanstalk, Azure App Service |
| SaaS (software) | a finished application | Gmail, GitHub, Datadog |

Terraform mostly provisions **IaaS and PaaS** pieces, but its provider model means it can manage SaaS too (for example it can create GitHub repositories, as you will see in [02](02-providers.md)).

### The key insight: the console is just a client of an API

When you click **Launch instance** in the AWS web console, your browser sends an HTTPS request to AWS's EC2 **API** ("create this server"). AWS does the work and returns a result. The AWS CLI (`aws ec2 run-instances ...`) sends the *same kind* of request. So does Terraform, through its AWS provider plugin.

```text
        ┌── you click in the web console ──┐
        ├── you type an `aws` CLI command ─┼──►  AWS API  ──►  real server created
        └── Terraform calls the API ───────┘
```

That is why Terraform needs **credentials** (AWS must know who is calling) and why one tool can manage thousands of different platforms: for each platform someone writes a provider that knows that platform's API.

### Four ways to create infrastructure

| Method | Example | Repeatable? | Reviewable/versioned? |
|---|---|---|---|
| Console (GUI) | click through AWS console | no | no |
| CLI commands | `aws ec2 run-instances ...` | partly (scripts) | partly |
| SDK scripts | Python + boto3 | yes | yes, but you write the "how" |
| **Infrastructure as Code** | Terraform, CloudFormation | yes | yes (Git) |

The whole of [01](01-iac-and-terraform-intro.md) is about why the last row wins in practice.

---

## Part 5 — AWS basics you need

Everything in this part is what the instructor does by hand in the AWS console in lessons 3 and 4 before doing it with Terraform. Do these steps once; they are the foundation for every lab.

### 5.1 Create the account and protect the root user

1. Go to aws.amazon.com and **Create an AWS account**. You need an email, a phone, and a credit/debit card (used for identity and for anything beyond the free tier).
2. The email+password you sign up with is the **root user**: it can do *everything*, including closing the account and changing billing. Treat it like a master key.
3. Immediately: **enable MFA (multi-factor authentication)** on the root user (Console → top-right account menu → Security credentials → Assign MFA device; an authenticator app is fine).
4. **Do not create access keys for the root user, and do not use the root user for daily work.** (The instructor's own story in lesson 1: the CIS Benchmark for AWS, the hardening guideline his company followed, has controls literally named "ensure no root user account access key exists" and "ensure MFA is enabled".)

> Lesson note: "Each new AWS account came with root credentials and the instruction *harden it first, then start using it*". Terraform later let that organisation apply the same hardening code to 100+ accounts ([01](01-iac-and-terraform-intro.md)).

### 5.2 Free tier, cost and the billing alert (do this before labs)

AWS bills for what runs. The golden rule of the course (lesson 4, lecture 38, rule 3):

> **Always destroy resources after a practical.** Forgotten resources are billed at the end of the month.

Set up a safety net first:

1. Console → search **Billing and Cost Management** → **Budgets** → **Create budget**.
2. Choose the **"Use a template (simplified)"** option and either **Zero spend budget** (emails you as soon as anything beyond the free tier is charged) or **Monthly cost budget** with a small amount such as 5 USD.
3. Enter your email and create it.
4. Also in Billing preferences, switch on **Free tier usage alerts** and **Alert preferences**.

> **Up to date:** AWS changed the free tier for accounts created from mid-2025: new accounts get a time-limited "free plan" with credits instead of the old 12-month fixed allowance, so check the **Billing → Free Tier** page for what your account has. Older accounts keep the classic "750 hours/month of a `t2.micro`/`t3.micro` for 12 months" allowance. Either way, a single stopped-and-deleted `t2.micro` for a few minutes costs a few cents; things that quietly cost money if forgotten are running EC2 instances, NAT gateways, load balancers, unattached Elastic IPs and EBS volumes.

Rule of thumb for this course: every lab ends with `terraform destroy`, and afterwards you glance at the **EC2 console** (right region!) to confirm nothing is left running.

### 5.3 IAM: users, authentication, authorization

**IAM (Identity and Access Management)** is the AWS service that controls *who* can do *what*.

Two words you must not mix up (lesson 3, lecture 23, and a likely exam topic):

| | Authentication (AuthN) | Authorization (AuthZ) |
|---|---|---|
| Question | **Who are you?** | **What are you allowed to do?** |
| Provider checks | does this identity exist and are the credentials valid? | does this identity hold permission for this action? |
| Typical form | password, access key + secret key, token | policies, roles, permission scopes |
| Example | "Is Alice a real user?" | "Alice exists but she is read-only, so she cannot launch servers" |
| Failure looks like | invalid credentials / unauthorized | `UnauthorizedOperation` / "not authorized to perform ec2:RunInstances" |

When Terraform asks AWS to create a server, AWS first refuses and says "authenticate first", exactly like being redirected to the login page. Terraform therefore needs **credentials that carry the right permissions** to create and manage things:

```text
Terraform ──"create a server"──────────────────────► AWS API
          ◄──"denied: who are you?"────────────────
Terraform ──request + access key / secret key──────► AWS API
                                      AuthN: does this identity exist?
                                      AuthZ: may it create servers?
          ◄──OK, created─────────────────────────────
```

**The credential type depends on the provider** (the lecture shows both AWS and GitHub):

| Platform | What Terraform needs | Where you get it |
|---|---|---|
| AWS | access key ID + secret access key (or a role/SSO session) | IAM user → Security credentials |
| GitHub | personal access token | GitHub → Settings → Developer settings |
| Kubernetes | kubeconfig file / cluster credentials | cluster admin |
| Azure / GCP | provider-specific (service principal, service account...) | cloud console |

🎯 **Exam focus:** know that Terraform authenticates to each provider with that provider's own mechanism, and that you should **read the "Authentication" section of the provider docs first**. The details of the AWS options (environment variables, shared credentials file, assume role...) are in [02](02-providers.md).

**Least privilege.** Credentials should have only as much permission as you intend to manage through Terraform. The instructor's example: if you only want Terraform to manage GitHub repositories, do not create a token that can delete *all* your repositories; the GitHub token screen lets you pick which repositories and which features. For AWS the learner course attaches `AdministratorAccess` "for simplicity in a learning account", which is fine for a personal sandbox and **not** acceptable in a real company.

### 5.4 Create the `Terraform` IAM user and access keys (lecture 24)

Assumption: you already have an AWS account and are logged in (as root or an admin) to the console.

1. Open the **IAM** service → **Users** → **Create user**.
2. User name: `Terraform` (any name works). Leave "Provide user access to the AWS Management Console" **unticked**: this user is for programmatic access only.
3. **Next** → **Permissions options: Attach policies directly** → search and tick **AdministratorAccess**.
4. **Next** → **Create user**.
5. Click the new user → **Security credentials** tab → **Create access key**.
6. Use case: **Command Line Interface (CLI)**; tick the acknowledgement checkbox → **Next** → (optional description) → **Create access key**.
7. You now see an **Access key ID** and a **Secret access key**. Copy both somewhere safe on your workstation (or click **Download .csv file**).

What the two keys look like (these are AWS's own documentation examples, not real):

```text
Access key ID:     AKIAIOSFODNN7EXAMPLE
Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

⚠️ **Gotchas:**

- The secret key is **shown only once**. Lose it and you must create a new key pair.
- A text file on your laptop is only a stop-gap. The next section stores the keys in the AWS CLI's credentials file instead, and [02](02-providers.md) explains why you should not hard-code them in `.tf` files.
- **Never commit keys to Git, post them in a forum, or paste them into a chat.** The instructor says leaked keys pasted into the course Q&A had to be removed and deactivated. Bots scan GitHub constantly and can rack up thousands of dollars of mining servers in your account within minutes.
- If a key leaks: IAM → the user → Security credentials → **Deactivate** and then **Delete** the key, create a new one, and check CloudTrail/billing for abuse.
- `AdministratorAccess` violates least privilege. In real life you attach a narrower policy (EC2, IAM, S3... as needed).

### 5.5 The AWS CLI and `aws configure`

The **AWS CLI** is the official command-line client for the AWS API. You do not need it for Terraform itself, but it is the standard way to store credentials safely on your machine and to check "who am I?".

Install it (see the official guide: `https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html`):

```bash
# macOS (Homebrew)
brew install awscli

# Linux (official installer)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Windows: download and run the MSI installer from the AWS docs page
aws --version          # confirm it works, e.g. aws-cli/2.x.x ...
```

Configure it with the keys from 5.4:

```bash
aws configure
# AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name [None]: us-east-1
# Default output format [None]: json
```

This writes two small files in your home folder:

```text
~/.aws/credentials      [default] aws_access_key_id=...  aws_secret_access_key=...
~/.aws/config           [default] region=us-east-1  output=json
```

The Terraform AWS provider finds these files automatically, so your `.tf` files need **no keys at all**. (How and in what order the provider looks for credentials is covered in [02](02-providers.md).)

Verify that authentication works (this is your standard "am I who I think I am?" check):

```bash
aws sts get-caller-identity
```

```json
{
    "UserId": "AIDAEXAMPLEUSERID",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/Terraform"
}
```

If you see your user's ARN (Amazon Resource Name, AWS's unique ID string), authentication works. If you see `Unable to locate credentials` or `InvalidClientTokenId`, fix this **before** touching Terraform.

### 5.6 Regions and availability zones

AWS runs data centres around the world. A **region** is a geographic area; each has a code:

| Code | Place |
|---|---|
| `us-east-1` | N. Virginia (the lesson's default) |
| `us-west-2` | Oregon |
| `eu-west-1` | Ireland |
| `ap-southeast-1` | Singapore |
| `ap-south-1` | Mumbai |

Each region contains several **availability zones (AZs)**, named like `us-east-1a`, `us-east-1b`: separate data-centre groups in the same region.

Facts that bite beginners:

- **Resources live in one region.** The AWS console shows only the region selected in the top-right corner. If your Terraform created an instance in `us-east-1` and you are looking at `ap-southeast-1`, the console looks empty. Always check the region selector.
- **AMI IDs are region-specific** (next section): the same Ubuntu image has a different ID in each region (the lesson shows a Singapore ID ending `...9F57` vs N. Virginia's `...8778`). Change `region` in Terraform and you usually must change the `ami` too.
- Some services (IAM, Route 53) are **global**: no region applies to them. That is why IAM users appear no matter which region is selected.
- Terraform picks the region from the `region` argument of the `provider "aws"` block (or from `AWS_REGION`/your CLI config).

### 5.7 EC2: virtual machines

**EC2 (Elastic Compute Cloud)** is AWS's virtual-machine service; a running VM is an **instance**. (Other clouds use different names: Azure *virtual machine*, DigitalOcean *droplet*, GCP *Compute Engine instance*. The concept is the same; only the Terraform resource type changes.)

When you launch an instance by hand, the wizard asks for:

| Decision | Meaning | Terraform argument (preview) |
|---|---|---|
| **Name / tags** | A label (shown in the console as the Name) | `tags = { Name = "..." }` |
| **AMI** (Amazon Machine Image) | The OS image: Amazon Linux, Ubuntu, Windows... IDs look like `ami-0abcd1234...` and **differ per region** | `ami` |
| **Instance type** | Combination of CPU and memory. `t2.micro` = 1 vCPU, 1 GiB RAM, free-tier eligible. At the other extreme `c3.8xlarge` has 32 vCPU and 60 GiB RAM and is expensive | `instance_type` |
| **Key pair** | SSH login key. The lesson skips it ("proceed without a key pair") because we never log in | `key_name` |
| **Network / firewall** | Which VPC and which security group | `vpc_security_group_ids` etc. |

The lesson's manual run (lesson 3, lecture 25), which you should repeat once to understand what Terraform will later automate:

1. EC2 console → **Launch instance**.
2. Name `manual EC2`, AMI **Amazon Linux**, type **t2.micro** (free-tier eligible; some newer regions/accounts show `t3.micro` instead, which is fine), **Proceed without a key pair**, keep defaults → **Launch instance**.
3. Watch the **Instance state**: *pending* → *running*.
4. **Terminate** it when done (Instance state → Terminate). *Stopped* instances still pay for their disks; *terminated* instances are gone.

Instance life cycle: `pending → running → stopping → stopped → terminated` (a stopped instance can be started again; a terminated one cannot).

### 5.8 Ports, firewalls and security groups

(Lesson 4, lectures 40–41. This is background for the Terraform security-group practicals in [05](05-resources-data-dependencies.md).)

**Port.** A port is an endpoint of communication that identifies a given application on a machine. When a server program starts (SSH, NGINX, Apache, an FTP daemon) it **opens (binds to) a port**; clients connect with `server-IP:port`.

| Software | Default port |
|---|---|
| SSH | 22 |
| HTTP web server | 80 |
| HTTPS | 443 |
| FTP (vsftpd) | 21 |

The instructor's demo: a server named `website-ec2` runs NGINX and SSH. On the server:

```bash
netstat -ntlp
# -n numeric  -t TCP  -l listening only  -p show owning process
# shows listeners on port 80 (nginx) and port 22 (sshd)
```

Browsing to `http://<ip>:80` shows "Welcome to NGINX"; browsing to `http://<ip>:22` fails because port 22 is not a web server. Start `vsftpd` and a new listener on port 21 appears. The service's own config file decides which port it uses.

**Firewall.** A network security system that controls incoming and outgoing traffic according to rules. Scenario: the server runs SSH (22) and HTTP (80); you want the world to reach the website but not SSH. The firewall sits in the middle:

```text
 User ──► [ FIREWALL ] ──► Server
            Rule 1: block port 22
            Rule 2: allow port 80
```

**Security group (SG) = the virtual firewall of an AWS instance** (the one definition to remember). It controls inbound and outbound traffic.

| Direction | Terraform/CloudFormation word | Controls |
|---|---|---|
| Inbound | **ingress** | who can connect **to** the server |
| Outbound | **egress** | where the server can connect **out** to |

```text
Rule direction guide
  Someone connects TO my server    -> INBOUND  (ingress) rule
  My server connects OUT to others -> OUTBOUND (egress)  rule
```

A rule has: a **protocol and port range** (e.g. TCP 80, or `-1` for all), a **source/destination** as a CIDR block, and an optional description.

**CIDR basics (just enough):** `0.0.0.0/0` means **every IPv4 address on the internet**. `203.0.113.7/32` means exactly one address. `10.0.0.0/16` is a private range of about 65,000 addresses.

The instructor's console demo of what happens:

| Step | Inbound rules | Result |
|---|---|---|
| 0 | "All traffic from 0.0.0.0/0" | website (80) and SSH (22) both work |
| 1 | remove the allow-all rule | website stops loading (if it still loads it is browser cache; try another browser) |
| 2 | add port 80 from 0.0.0.0/0 | website loads immediately; SSH is blocked |

Creating a SG from scratch (lecture 41): EC2 → Network & Security → **Security Groups** → **Create security group**, name `myfirst.sg`, description `Firewall`, an **outbound** rule *All traffic to 0.0.0.0/0* so the instance can reach out, an **inbound** rule (type SSH auto-fills port 22; "Custom TCP" lets you enter any port such as 21) and attach it to the instance (instance → Security tab → Change security groups).

⚠️ **Gotcha (the ping demo):** trying `ping <public-ip>` times out because no rule allows **ICMP** (the protocol used by ping). The instructor first adds the ICMP rule in the **outbound** tab: still fails, because a ping comes *from the internet to your server*, which is **inbound**. Deleting that and adding ICMP in the **inbound** tab makes ping work. Wrong direction is the classic mistake.

⚠️ **Production note from the lesson:** never open SSH (22) to the whole internet. Allow it only from your office network or a VPN.

🎯 Extra context: security groups are *allow-lists*; there is no explicit deny rule. Traffic is blocked simply because no rule allows it.

### 5.9 Elastic IP and the four building blocks of the course

A public IP assigned to an instance normally changes when it is stopped and started. An **Elastic IP (EIP)** is a static public IPv4 address you reserve and attach. (An allocated-but-unattached EIP is billed, which is one more reason to destroy.)

The course uses only these four AWS building blocks (lesson 4, lecture 39), each of which has an equivalent on every cloud:

| Generic concept | AWS service | Terraform resource (later chapters) | Used to demonstrate |
|---|---|---|---|
| Virtual machine | EC2 | `aws_instance` | the first resources, count, lifecycle, provisioners |
| Firewall | Security Group | `aws_security_group` + rule resources | attributes, references, dynamic blocks |
| Users | IAM user | `aws_iam_user` | count, for_each, loops, functions |
| Public IP | Elastic IP | `aws_eip` | attributes, outputs, references |

(Occasionally one video uses another service, for example S3 for state storage later.)

---

## Part 6 — Git and `.gitignore` basics

**Git** records the history of changes to a folder of files. **GitHub** is a website hosting Git repositories ("repos"). IaC is code, so it lives in Git: history, review, rollback, "who changed what" (benefits explained in [01](01-iac-and-terraform-intro.md)).

Minimum workflow:

```bash
git init                         # make the current folder a repo (once)
git status                       # what changed?
git add main.tf                  # stage a file (or: git add . for everything)
git commit -m "Add first EC2"    # save a snapshot with a message
git log --oneline                # list history
git remote add origin <url>      # link to GitHub (once)
git push -u origin main          # upload
git clone <url>                  # download someone's repo (the course repo, for example)
git pull                         # fetch + merge latest changes
```

Concepts: a **commit** is a saved snapshot; a **branch** is an independent line of commits (the default is usually `main`); a **pull request (PR)** is a request on GitHub to merge a branch after review.

### `.gitignore`

A file named `.gitignore` lists patterns Git must **never** track. One pattern per line; `#` is a comment; `*` is a wildcard; a trailing `/` means a folder.

```text
# local plugin cache (large, regenerated by terraform init)
.terraform/

# state files can contain secrets in plain text
*.tfstate
*.tfstate.*

# crash logs
crash.log

# local variable files that may hold secrets
*.tfvars
```

⚠️ **Gotchas:**

- `.gitignore` only prevents *new* files from being tracked. If you already committed a secret, ignoring it later does **not** remove it from history; treat the secret as leaked and rotate it.
- Never commit access keys, secret keys, GitHub tokens or `terraform.tfstate`.
- Provider plugins under `.terraform/` are hundreds of MB (the AWS plugin is about 300 MB, the Azure one 184 MB, per lesson 3) and must not go in Git.

The full "what to commit and what not to commit in a Terraform repo, and why Git is the wrong place for state" discussion is in [10](10-backends-locking-drift.md). The `.terraform.lock.hcl` file, in contrast, **should** be committed ([02](02-providers.md)).

---

## Part 7 — Mental models you will use all course

1. **Declarative, not imperative.** Imperative = a list of steps ("launch server, then attach firewall"). Declarative = describe the end result ("there should be one server with this firewall") and let the tool work out the steps. HCL is declarative. You say *what*, Terraform works out *how*.
2. **Desired state vs current state.** Your `.tf` files are the **desired state**. What actually exists in AWS is the **current state**. Terraform's job is to compare the two and make the *minimum changes* that close the gap. Nothing happens if they already match. (Deep dive in [04](04-state-basics.md).)
3. **Plan before apply.** `terraform plan` is a dry run that shows what would change; `terraform apply` does it. Reading plans carefully is a habit worth forming from day one.
4. **Idempotent.** Running the same configuration twice produces the same result and does not create duplicates. Contrast with a script that always launches another server when run.
5. **State = Terraform's memory.** Terraform remembers what it created in a **state file**, because AWS cannot tell it "which servers did *Terraform* create?". Lose the state and Terraform forgets (you will see this in [04](04-state-basics.md) and [11](11-import-state-cli-logging.md)).
6. **Provider = translator.** Terraform itself knows nothing about AWS. A provider plugin translates "aws_instance" into real EC2 API calls ([02](02-providers.md)).
7. **One folder = one configuration.** Terraform reads every `.tf` file in the working directory as one configuration (called a root module), with its own plugins and its own state.

The core loop (from lesson 3):

```text
write .tf ─► terraform init ─► terraform plan ─► terraform apply ─► (change code) ─► plan/apply ─► terraform destroy
```

---

## Part 8 — How to use this course material

### The three rules of the course (lesson 4, lecture 38)

| # | Rule | Why |
|---|---|---|
| 1 | Use a **separate folder for each practical** | stay organised and easily revisit old labs |
| 2 | Find source code in the **instructor's GitHub repo**, organised by section; each section has a `Readme.md` "Video-Document Mapper" from video name to code page | code lives in one place |
| 3 | **Always `terraform destroy` after a practical** | forgotten resources are billed at the end of the month |

Rule 1 in practice:

```text
terraform-practicals/
├── create-first-ec2-instance/   <- .tf files for that lab
├── tainting-resource/
└── conditional-expression/
```

Why folders matter beyond tidiness:

- A folder is a **working directory** with its own `.terraform/` plugin cache and its own `terraform.tfstate`. Destroying one lab never touches another.
- Terraform reads **all** `*.tf` files in a folder. If you mix two practicals in one folder, every `apply` tries to create both sets.
- Terraform only loads files ending in `.tf` or `.tf.json`. In lecture 43 the instructor temporarily renames a file to `.bak` to make Terraform ignore it.

### Course resources

| Resource | Purpose |
|---|---|
| GitHub repo ("Terraform Beginner to Advance") | Terraform files, commands and doc links per lecture. Folders mirror the course sections: Deploying Infrastructure with Terraform; Read, Generate, Modify Configurations; Terraform Provisioners; Modules & Workspaces; Remote State Management; Security Primer; Terraform Cloud & Enterprise |
| "Central PPT notes" lecture (first section) | downloadable PDF slides; great for revision |
| Discord (`kplabs.in/chat`) | optional community and support |
| Terraform Registry (registry.terraform.io) | providers, resources, modules and their documentation |

Placeholders in repo files (`PUT-YOUR-ACCESS-KEY-HERE`) are intentional; replace them locally and never commit the result.

### Map of these study chapters

| Chapter | Topic |
|---|---|
| [00](00-prerequisites.md) | this chapter |
| [01](01-iac-and-terraform-intro.md) | exam overview, IaC, what Terraform is, install, HCL, first config |
| [02](02-providers.md) | providers, versions, lock file, aliases |
| [03](03-core-workflow.md) | init, plan, apply, destroy, CLI details |
| [04](04-state-basics.md) | state file, desired vs current, drift preview |
| [05](05-resources-data-dependencies.md) | resources, data sources, dependencies, provisioners |
| [06](06-variables-outputs-locals.md) | variables, outputs, locals |
| [07](07-types-loops-functions.md) | types, count, for_each, functions |
| [08](08-lifecycle-conditions-sensitive.md) | lifecycle, validation, sensitive, Vault |
| [09](09-modules.md) | modules |
| [10](10-backends-locking-drift.md) | backends, locking, workspaces |
| [11](11-import-state-cli-logging.md) | import, state commands, logging |
| [12](12-hcp-terraform.md) | HCP Terraform / Enterprise |
| [13](13-exam-prep.md) | exam strategy, cheat sheet, practice questions |

### Suggested approach per chapter

1. Read "What you will learn" and "Pre-concept".
2. Read the body, **typing** (not pasting) the code in a fresh lab folder.
3. Do the 🧪 lab, end with `terraform destroy`.
4. Answer the ❓ quiz **without** looking back; re-read what you missed.
5. Come back to the 🎯 Exam focus bullets the week before the exam ([13](13-exam-prep.md)).

---

## 🧪 Lab — pre-flight checklist (about 45 minutes)

Do not skip: every later lab assumes this passes.

1. **Terminal**: open it and run

   ```bash
   pwd
   mkdir -p ~/terraform-practicals/00-preflight
   cd ~/terraform-practicals/00-preflight
   pwd
   ```

   Expected: the last `pwd` prints a path ending in `00-preflight`.

2. **Editor**: install VS Code and the HashiCorp Terraform extension. Run `code .` (or open the folder via File → Open).
3. **Git**: `git --version` prints a version. (Install from git-scm.com or `brew install git` if not.)
4. **PATH check**: `echo $PATH` and `which git`.
5. **AWS account hardening**: root MFA enabled; no root access keys (IAM → Security credentials shows none).
6. **Billing alert**: a Zero-spend or small monthly budget exists and your email is confirmed.
7. **IAM user**: create user `Terraform` with `AdministratorAccess` and an access key (section 5.4).
8. **AWS CLI**: install, run `aws configure`, then

   ```bash
   aws sts get-caller-identity
   ```

   Expected: JSON with an `Arn` ending in `:user/Terraform`.
9. **Manual EC2**: launch one `t2.micro` (or free-tier type) named `manual EC2`, observe *pending → running*, then **terminate** it.
10. **Manual security group**: create `myfirst.sg` with inbound TCP 80 from `0.0.0.0/0`, then **delete** it (it cannot be deleted while attached to an instance; terminate the instance first).
11. **Git ignore**: in `00-preflight` run `git init`, create a `.gitignore` containing the lines from Part 6, create a dummy `terraform.tfstate` file, and confirm `git status` does **not** list it.

Cleanup: nothing running in EC2 (all regions you used), no leftover security groups other than `default`, no unattached Elastic IPs.

---

## 🎯 Exam focus (summary)

The exam does not test this chapter directly, but these ideas show up as the "reason" behind questions:

- Authentication (who are you) vs authorization (what may you do); credentials are provider-specific; apply least privilege.
- Terraform talks to platforms **through their APIs** (via providers); the exam is **provider-agnostic**.
- Never commit secrets; `.gitignore` and credential files/environment variables exist for this reason.
- Terraform works in the **current directory**; one directory = one configuration.
- `terraform destroy` acts only on resources tracked in the current directory's state.
- Declarative (describe the end state), desired vs current state, and plan-before-apply are the basis of many scenario questions.

## Key takeaways

1. A terminal, a text editor, Git and an AWS CLI are the whole toolbox.
2. "command not found" = the folder holding the program is not on `PATH`; package managers fix that for you.
3. JSON for data and state, YAML for CloudFormation and CI, HCL for Terraform configuration.
4. The cloud console, the CLI and Terraform are all clients of the same cloud API.
5. Protect the AWS root user with MFA, never give it keys, create a `Terraform` IAM user for labs, and set a billing alert **first**.
6. AuthN = who you are; AuthZ = what you may do. Terraform needs credentials that have the right permissions.
7. Regions matter: resources, AMI IDs and the console view are all region-specific.
8. A security group is AWS's virtual firewall; ingress = inbound, egress = outbound; `0.0.0.0/0` = everyone.
9. One folder per practical, and always destroy afterwards.
10. Never commit keys or state files.

## Quick commands cheat-sheet

```bash
pwd; ls -la; cd <dir>; mkdir <dir>; cat <file>      # navigate and read
echo $PATH; which <program>                          # PATH diagnosis
export NAME=value; echo $NAME; unset NAME            # environment variables
aws configure                                        # store credentials
aws sts get-caller-identity                          # who am I in AWS?
git init; git add .; git commit -m "msg"; git push   # Git basics
terraform destroy                                    # always, at the end of a lab
```

## ❓ Quiz

1. You type `terraform` and the shell answers `command not found`, yet the file exists in your Downloads folder. What is the most likely cause?
2. You added a folder to `PATH` in your system settings but an already-open terminal still cannot find the program. What do you do?
3. Which format cannot contain comments: JSON, YAML or HCL? Which of the three do you write your Terraform configuration in?
4. Why can one tool (Terraform) create resources in AWS, Azure and GitHub?
5. Terraform's request to AWS is rejected with "you are not authorized to perform ec2:RunInstances", although the access key is valid. Is this an authentication or an authorization failure?
6. Name two things you must never do with an IAM access key.
7. You can see your instance in the AWS console but Terraform says it created it in `ap-southeast-1`; the console shows nothing. What is the first thing to check?
8. Which direction is a rule that lets the internet open your website: ingress or egress? What about the rule that lets your server call a package repository?
9. In the lesson's ping demo, why did the ICMP rule in the **outbound** tab not make `ping` work?
10. What does `0.0.0.0/0` mean? What does `203.0.113.7/32` mean?
11. You accidentally committed `terraform.tfstate` containing a password to GitHub, then added it to `.gitignore`. Is the secret safe now?
12. Why does the course use one folder per practical?
13. What is the difference between a *stopped* and a *terminated* EC2 instance?
14. Where does `aws configure` store the keys, and why is that better than putting them in a `.tf` file?

### Answers

1. The folder with the binary is not on `PATH` (and you are not in that folder). Fix `PATH` or install via a package manager.
2. Open a **new** terminal; running sessions keep the old value of `PATH`.
3. JSON has no comments. You write HCL (`.tf`).
4. Because each platform has a **provider** plugin that translates Terraform resources into that platform's API calls.
5. **Authorization**: the identity is known (authentication succeeded) but lacks the permission.
6. Any two of: commit it to Git, share it in chat/forums, hard-code it in files you share, give it more permissions than needed, create keys for the root user. Also: lose track of it without rotating.
7. The **region selector** in the console (top-right). Resources are per region.
8. Website = **ingress** (inbound). Server calling out = **egress** (outbound).
9. A ping goes from the internet **to** the server, so it is inbound traffic. An outbound rule controls connections the server starts.
10. `0.0.0.0/0` = all IPv4 addresses; `/32` = exactly that one address.
11. **No.** The secret is in Git history and must be considered leaked: rotate/delete it. `.gitignore` only affects untracked files going forward.
12. Each folder has its own `.terraform/` and state, so labs do not interfere; Terraform loads every `.tf` file in the folder; and `destroy` in that folder removes exactly that lab's resources.
13. Stopped = powered off, can be started again, disk still billed. Terminated = deleted permanently.
14. In `~/.aws/credentials` (and `~/.aws/config`) in your home folder, outside any Git repo; the provider finds it automatically so no secrets are in the code ([02](02-providers.md)).

## Glossary

| Term | Meaning |
|---|---|
| Shell / terminal | Text interface for typing commands |
| `PATH` | Environment variable listing folders searched for commands |
| Environment variable | Named value passed by the OS to programs |
| JSON / YAML / HCL | Three config/data text formats (HCL is Terraform's language) |
| API | Interface through which programs (console, CLI, Terraform) ask a cloud to do things |
| IAM | AWS Identity and Access Management |
| Root user | The account owner identity; protect with MFA, never use for daily work |
| Access key / secret key | Programmatic credentials for an IAM user |
| ARN | Amazon Resource Name: AWS's unique ID format |
| Region / AZ | Geographic area / data-centre group within a region |
| EC2 / AMI / instance type | AWS VM service / OS image / CPU+memory size |
| Security group | AWS virtual firewall (allow-list) |
| Ingress / egress | Inbound / outbound traffic rules |
| CIDR | IP range notation such as `10.0.0.0/16` |
| Elastic IP | Static public IPv4 address in AWS |
| Git / commit / branch | Version control system / snapshot / line of work |
| `.gitignore` | File listing patterns Git must not track |
| Declarative | Describe the end state; the tool works out the steps |
