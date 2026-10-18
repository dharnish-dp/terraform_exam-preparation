# Lesson 00 — Prerequisites (the pre-concepts)

**Time:** 1.5 to 2 hours. **Goal:** after this you can follow every other lesson without feeling lost.

If you already know a section, skim it. Don't skip the AWS section if you're shaky on it.

---

## Part 1: Terminal survival kit

The terminal is a text interface to your computer. Terraform is a command-line tool, so you will type commands constantly.

### Navigation

| Command | What it does | Example |
|---|---|---|
| `pwd` | Print the folder you are in | `pwd` |
| `ls` | List files in the folder | `ls -la` (also shows hidden files) |
| `cd` | Change folder | `cd ~/Desktop` |
| `cd ..` | Go up one folder | |
| `mkdir` | Make a folder | `mkdir tf-lab1` |
| `touch` | Create an empty file | `touch main.tf` |
| `cat` | Print a file's contents | `cat main.tf` |
| `rm` | Delete a file (no recycle bin!) | `rm old.txt` |
| `rm -rf` | Delete a folder and everything inside. **Dangerous** | `rm -rf tf-lab1` |
| `clear` | Clean the screen | |

Files that start with a dot (like `.terraform`) are **hidden**. `ls` won't show them. `ls -a` does.

### Editing a file

Easiest: open the folder in VS Code with `code .` (if the `code` command is installed) or open it from the VS Code menu. Terraform files end in `.tf`.

### Environment variables

An **environment variable** is a named value that programs can read from the shell.

```bash
export MY_NAME="Priya"      # set it (only for this terminal window)
echo $MY_NAME               # print it
env | grep MY_NAME          # search all variables
```

⚠️ Why this matters: Terraform and AWS read configuration from environment variables such as `AWS_ACCESS_KEY_ID`, `TF_VAR_region`, and `TF_LOG`. The exam asks about these.

### Running programs and exit

```bash
terraform version      # run a program with an argument
terraform -help        # most CLIs support -help or --help
```

Press `Ctrl+C` to stop a running command.

---

## Part 1B: Windows users — read this first

The lessons were written with macOS/Linux commands. On Windows, use **PowerShell** (not the old `cmd`). Terraform itself works exactly the same on Windows. Only the surrounding shell commands differ.

### Which terminal?

Open **Windows Terminal** or **PowerShell** from the Start menu. VS Code's built-in terminal (`Ctrl+``) can also be set to PowerShell. Don't use `cmd.exe`.

### Where to keep your lab folders

Create a short path such as `C:\tf-labs`, **not** your Desktop or Documents. Those are often synced by **OneDrive**, which will try to upload the `.terraform` folder (the AWS provider alone is hundreds of MB) and can cause locked-file errors.

```powershell
mkdir C:\tf-labs
cd C:\tf-labs
mkdir lab1
cd lab1
```

### Command translation table

| Task | macOS/Linux (in lessons) | Windows PowerShell |
|---|---|---|
| Print current folder | `pwd` | `pwd` (same) |
| List files | `ls` | `ls` (same) |
| List incl. hidden files | `ls -a` | `ls -Force` |
| Change folder | `cd` | `cd` (same) |
| Make folder | `mkdir x` | `mkdir x` (same) |
| Create empty file | `touch main.tf` | `New-Item main.tf` |
| Print a file | `cat f` | `cat f` (same, alias of `Get-Content`) |
| Delete a file | `rm f` | `rm f` or `Remove-Item f` |
| Delete a folder | `rm -rf x` | `Remove-Item -Recurse -Force x` |
| Search in a file | `grep text f` | `Select-String text f` |
| Count lines | `wc -l f` | `(Get-Content f).Count` |
| First lines | `... \| head` | `... \| Select-Object -First 10` |
| Clear screen | `clear` | `clear` (same) |
| Run two commands | `a && b` | put `a` and `b` on **separate lines** (`&&` only works in PowerShell 7+) |

The lessons that follow show a PowerShell note wherever the command differs.

### Environment variables on Windows

```powershell
$env:MY_NAME = "Priya"        # set (this PowerShell window only)
echo $env:MY_NAME             # read
Remove-Item Env:MY_NAME       # remove (the equivalent of unset)
Get-ChildItem Env:            # list all
```

Everywhere a lesson says `export NAME=value`, use `$env:NAME = "value"`. Everywhere it says `unset NAME`, use `Remove-Item Env:NAME`.

⚠️ You **cannot** write `TF_LOG=DEBUG terraform plan` on one line in PowerShell. Set the variable first, then run the command.

### Installing Terraform on Windows

Pick one:

**Option A: winget (simplest on Windows 10/11)**

```powershell
winget install Hashicorp.Terraform
```

Close and reopen PowerShell, then run `terraform version`.

**Option B: Chocolatey** (if you already use it): `choco install terraform`

**Option C: manual**

1. Download the Windows AMD64 zip from developer.hashicorp.com/terraform/install.
2. Unzip `terraform.exe` into a folder such as `C:\terraform`.
3. Add that folder to your **PATH**: Start → "Edit the system environment variables" → Environment Variables → select `Path` under your user → Edit → New → `C:\terraform`.
4. Open a **new** PowerShell window and run `terraform version`.

If you get "terraform is not recognized", the PATH step failed or you didn't reopen the terminal.

### Installing the AWS CLI

Download the MSI installer from the AWS CLI install page, then in a new PowerShell window run `aws --version`, `aws configure`, `aws sts get-caller-identity`.

Credentials file location: `C:\Users\<you>\.aws\credentials` (that's what `~/.aws/credentials` means in the lessons).

### Quoting `-var` values in PowerShell

PowerShell treats quotes and `=` differently from bash. To avoid surprises:

```powershell
terraform plan -var 'env=cli'                 # use a space after -var and single quotes
terraform plan -var-file="prod.tfvars"        # file-based values avoid quoting problems
```

For list/map values, don't fight the quotes. Put them in a `.tfvars` file instead:

```hcl
names = ["x", "y", "z"]
```

then run `terraform plan -var-file="my.tfvars"`.

### Paths inside Terraform code

Use **forward slashes** in `.tf` files even on Windows (`"${path.module}/hello.txt"`). Terraform handles them. Avoid backslashes in strings, because `\` is an escape character in HCL.

### Other Windows notes

- **Antivirus** may slow or flag `terraform.exe` and provider binaries on first run. If `terraform init` hangs, check the antivirus log.
- **Line endings**: if you use Git, run `git config --global core.autocrlf true`. Terraform files work with either `\n` or `\r\n` line endings.
- **WSL (optional):** Windows Subsystem for Linux gives you a real Linux terminal where every command in the lessons works unchanged (`wsl --install`). It's nice to have, but not required. If you use it, install Terraform inside WSL following the Linux instructions, and keep lab folders inside the WSL home directory (`~`), not under `/mnt/c`, for speed.
- **`.gitignore` and hidden folders**: in File Explorer, turn on View → Show → Hidden items to see `.terraform`.

---

## Part 2: File formats you will see

### JSON

```json
{
  "name": "web",
  "ports": [80, 443],
  "enabled": true
}
```

- Curly braces `{}` = an object (key and value pairs)
- Square brackets `[]` = a list
- Strings in double quotes. Numbers and `true/false` without quotes.

Terraform's **state file** is JSON. You need to be able to read it.

### YAML (just recognize it)

```yaml
name: web
ports:
  - 80
  - 443
```

Common in Kubernetes and CI tools. Terraform doesn't use YAML for its main config.

### HCL (HashiCorp Configuration Language)

HCL is what Terraform files use. It looks like JSON that was made friendlier for humans. You'll learn it step by step. Preview:

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs-bucket"
}
```

---

## Part 3: What is "the cloud"?

Instead of buying and racking your own servers, you **rent** computing resources from a provider (AWS, Azure, Google Cloud) over the internet. You pay for what you use.

### Why is it relevant to Terraform?

Every cloud has a **web console** (click buttons) and an **API** (programs send requests). Clicking is slow, error-prone, and impossible to review. Terraform talks to the API for you based on a text file you wrote.

### An API in one paragraph

An **API** (Application Programming Interface) is a doorway that lets one program ask another to do things. Example: a program sends "create a server of size small in Mumbai" to AWS's API, and AWS creates it. Terraform is such a program.

---

## Part 4: AWS basics you need

You do **not** need to be an AWS expert. You need to recognize these words.

| Term | Plain meaning |
|---|---|
| **Region** | A geographic location with data centers, e.g. `us-east-1` (N. Virginia), `ap-south-1` (Mumbai) |
| **Availability Zone (AZ)** | One data center (or group) inside a region, e.g. `us-east-1a` |
| **EC2** | Virtual servers you rent ("instances") |
| **AMI** | The template/image a server boots from (like an OS installer + software) |
| **S3** | Object storage: buckets that hold files. Bucket names are **globally unique** |
| **VPC** | Your own private network inside AWS |
| **Subnet** | A slice of a VPC network, tied to one AZ |
| **Security group** | A firewall for servers. Rules say which ports/IPs are allowed |
| **IAM** | Identity and Access Management: users, roles, and permissions |
| **Access key** | An ID + secret that lets programs (like Terraform) act as an IAM user |
| **Tags** | Key/value labels on resources, e.g. `Environment = "dev"` |

### Getting AWS credentials for Terraform (needed from Lesson 05)

1. Create a free AWS account.
2. In IAM, create a user for practice and give it enough rights (for learning, `AdministratorAccess` is simplest, but never use it for real production).
3. Create an **access key** for that user. Save the ID and secret. Never share them. Never commit them to Git.
4. Install the AWS CLI and run:

```bash
aws configure
aws sts get-caller-identity     # proves your credentials work
```

Terraform's AWS provider automatically finds credentials from, among other places, environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and the file `~/.aws/credentials` that `aws configure` creates.

🎯 **Exam rule:** never hard-code credentials in `.tf` files.

### Protect your wallet

- In AWS Billing, create a **budget alert** (e.g. alert at $5).
- After every lab run `terraform destroy`.
- Prefer labs with `local` and `random` providers when possible. They cost nothing.

---

## Part 5: Git in two minutes

**Git** is version control: it records the history of your files.

| Term | Meaning |
|---|---|
| Repository (repo) | A project folder tracked by Git |
| Commit | A saved snapshot |
| `.gitignore` | A file listing things Git must **not** track |

Why it matters: Terraform code is stored in Git. The `.gitignore` for Terraform should exclude `.terraform/`, `*.tfstate`, and `*.tfstate.backup` (state can hold secrets). The **lock file** `.terraform.lock.hcl` **should** be committed.

---

## Part 6: Mental models you need

### Imperative vs declarative

- **Imperative** = you give step-by-step instructions: "create server, then attach disk, then open port." If you run it twice you might get two servers.
- **Declarative** = you describe the **end result**: "I want 1 server with this disk." The tool works out the steps. Running it twice still gives 1 server.

Terraform is **declarative**. This is a favorite exam question.

### Idempotent

An operation is **idempotent** if running it many times gives the same result as running it once. Declarative tools like Terraform aim for that.

### Desired state vs actual state

- **Desired state** = what your code says should exist.
- **Actual state** = what really exists in the cloud right now.

Terraform's job is to close the gap between them.

---

## Checklist before moving on

- [ ] I can `cd`, `ls`, `mkdir`, `touch`, `cat`
- [ ] I can set and read an environment variable
- [ ] I know what a region, EC2, S3, VPC and IAM are in one sentence each
- [ ] I can explain declarative vs imperative
- [ ] I know why credentials should not be in code or Git

## ❓ Quiz

1. What is the difference between imperative and declarative? Which one is Terraform?
2. Name two places Terraform's AWS provider can find credentials.
3. Why must `*.tfstate` be kept out of Git?
4. What does `export X=5` do and how long does it last?
5. Is an S3 bucket name unique per account or globally?

<details><summary>Answers</summary>

1. Imperative = step-by-step instructions; declarative = describe the end result. Terraform is declarative.
2. Environment variables and the shared credentials file (`~/.aws/credentials`).
3. It can contain sensitive values in plain text.
4. Sets a variable `X` to 5 for the current terminal session only.
5. Globally unique across all AWS accounts.
</details>
