# Session 5 - Terraform Provisioners

*HashiCorp Certified Terraform Associate - Zeal Vora / KPLabs course. Study notes built from lecture transcripts 105-112 and the instructor's repo folder `Section 3 - Terraform Provisioners`.*

---

## Session overview

Up to this point in the course, Terraform has been used to **create and manage infrastructure objects** (EC2 instances, IAM users, security groups and so on). That answers the question "how do I launch a VM?" but not the follow-up question the instructor keeps returning to: **"The VM is launched - now what?"** A freshly launched VM is empty: no application, no packages, no configuration. **Provisioners** are the Terraform feature that answers that second question. They let Terraform **run scripts or commands on the local machine (where Terraform runs) or on the remote machine (the resource that was just created) as part of resource creation or destruction.**

What this session covers:

| Lecture | Theme |
|---|---|
| 105 | Why provisioners exist; high-level demo (launch EC2, then SSH in and install nginx) |
| 106 | The three provisioner types (`file`, `local-exec`, `remote-exec`) with a combined demo |
| 107 | Syntax/format: where provisioners live, `connection` block, `command` vs `inline` |
| 108 | Hands-on `local-exec` (write the IP address into a file) |
| 109 | Hands-on `remote-exec` (SSH + install nginx), including the errors hit and how they were fixed |
| 110 | Points to note: provisioners work on ANY resource type; multiple provisioners per resource |
| 111 | Creation-time vs destroy-time provisioners; tainting on failure |
| 112 | Failure behaviour: `on_failure = fail` (default) vs `continue` |

Important framing from the instructor (Lecture 105): **provisioners are NOT part of the newer Terraform Associate exam** (they were in the earlier exam version, and the topic was removed from the newer one). They are included in the course because they enable a wide variety of real-world use cases and are actively used in many organisations. Treat this session as "practical knowledge and conceptual clarity" rather than strict exam syllabus - but the concepts (tainting, `self`, `connection`, destroy-time) are still useful background. (Extra context: HashiCorp's own docs describe provisioners as a **last resort**; prefer cloud-init/user_data, prebuilt images, or configuration-management tools where possible.)

---

## Table of contents

1. [Lecture-to-repo file mapping](#lecture-to-repo-file-mapping)
2. [Lecture 105 - Overview of Provisioners](#lecture-105---overview-of-provisioners)
3. [Lecture 106 - Types of Provisioners](#lecture-106---types-of-provisioners)
4. [Lecture 107 - Format of Defining Provisioners](#lecture-107---format-of-defining-provisioners)
5. [Lecture 108 - Practical: local-exec Provisioner](#lecture-108---practical-local-exec-provisioner)
6. [Lecture 109 - Practical: remote-exec Provisioner](#lecture-109---practical-remote-exec-provisioner)
7. [Lecture 110 - Points to Note: Provisioners](#lecture-110---points-to-note-provisioners)
8. [Lecture 111 - Creation-Time and Destroy-Time Provisioners](#lecture-111---creation-time-and-destroy-time-provisioners)
9. [Lecture 112 - Failure Behaviour for Provisioners](#lecture-112---failure-behaviour-for-provisioners)
10. [Bonus repo file: null.md (null_resource)](#bonus-repo-file-nullmd-null_resource)
11. [Command / syntax cheat-sheet](#command--syntax-cheat-sheet)
12. [Key takeaways](#key-takeaways)
13. [Quick revision Q&A](#quick-revision-qa)
14. [Glossary](#glossary)

---

## Lecture-to-repo file mapping

Repo folder: `Section 3 - Terraform Provisioners/`. The repo `Readme.md` contains a "Video-Document Mapper" that only lists the five practical lectures (its numbering is a bit off: two rows are numbered "3"). The mapping below is reconstructed from transcripts and file contents.

| Lecture | Transcript | Repo file(s) | Notes |
|---|---|---|---|
| 105 | Overview of Provisioners | *(none)* | Demo used `provisioner.tf` + `terraform-key.pem` from the instructor's local `kplabs-terraform` folder; **not in the repo**. Instructor deliberately did not walk through the code. |
| 106 | Type of Provisioners | `provisioner-types.md` | Repo demo code (SG + EC2 + `remote-exec` + `connection`). See the discrepancy note in Lecture 106. |
| 107 | Format of Defining Provisioners | *(none - slides only)* | Concepts shown on slides and in HashiCorp docs. |
| 108 | Practical - local-exec Provisioner | `local-exec.md`, `local-exec.tf` | `local-exec.md` has Base/Final code; `local-exec.tf` is a slightly different variant (see notes). |
| 109 | Practical - remote-exec Provisioner | `remote-exec.md` | Base code + final code (connection block + remote-exec). |
| 110 | Points to Note - Provisioners | `points-to-note.md` | Base code and "Scenerio 2" (two local-exec blocks). |
| 111 | Creation-Time and Destroy-Time Provisioners | `create-destroy-time-provisioner.md` | Base code and "Simulating failure to see Tainting". |
| 112 | Failure Behaviour for Provisioners | `failure-behaviour.md` | Base code and Final code (`on_failure = continue`). |
| *(not in this session's lectures)* | - | `null.md` | `null_resource` examples; no transcript in lectures 105-112 covers it. Included as a bonus section. |
| *(repo only)* | - | `Readme.md` | Index of the folder (the "Video-Document Mapper"). |

**Lecture numbers:** all of 105, 106, 107, 108, 109, 110, 111, 112 are present - no missing lecture numbers in this session.

---

## Lecture 105 - Overview of Provisioners

### 1. Why provisioners matter

- Provisioners are described as "one of my favourite topics" and something that makes Terraform "much more unique" compared with other IaC solutions, because they allow **end-to-end** automation, not just resource creation.
- So far we only did simple things: launch a VM, destroy a VM, create a resource. That only satisfies the *first* part of an organisation's need ("create infrastructure").
- The *second* part: after the VM is launched in any provider (AWS, Azure, GCP ...), it is an **empty VM** - no application, no software packages. Provisioners solve this.

### 2. Definition

> Provisioners allow you to **execute scripts or any commands on a local or remote machine as part of resource creation and destruction.**

Typical example: after a virtual machine is launched, Terraform connects to it through SSH and installs the software packages needed so the VM is ready for application deployment.

### 3. The two-stage flow of the demo

```
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

### 4. Demo walkthrough (as shown)

Files in the instructor's working directory (not in the repo):

- `provisioner.tf` - contains the logic to launch a server **and** install software after launch.
- `terraform-key.pem` - the private SSH key (explained properly in Lecture 109).

Steps:

1. Run `terraform apply -auto-approve`.
2. Phase 1: Terraform creates the EC2 instance.
3. Phase 2: Terraform logs into the EC2 using SSH as `ec2-user` (visible in the CLI log - the instructor matches the IP in the log, ending `197.218`, to the instance in the AWS console).
4. Once connected, Terraform installs the required packages (log shows installation output). The provisioner section then completes.
5. Open the instance's public IP in a browser: the default **"Welcome to nginx!"** page appears. (With your own custom site you would see that instead.)

Expected CLI shape (simplified, extra context on exact wording):

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

### 5. Gotchas / notes

- The instructor intentionally did **not** show the code in this lecture; the goal was only the concept. Code is covered in 107-112.
- Terraform needs a way to log in (SSH key / password) for remote provisioning - this foreshadows the `connection` block.

### Exam tips (Lecture 105)

- Provisioners = run commands/scripts **locally or remotely** around resource **creation/destruction**.
- Provisioners are **not** in the newer exam according to the instructor, but still appear in real-world use.
- Typical remote use: install packages after VM launch via SSH.

---

## Lecture 106 - Types of Provisioners

### 1. The three provisioners

| Provisioner | Where it runs | Purpose |
|---|---|---|
| `local-exec` | **Local machine** where Terraform is running | Invokes a local executable/command after the resource is created |
| `remote-exec` | **Remote resource** (e.g., the new EC2 server) | Invokes a script/command directly on the remote server (needs a `connection`) |
| `file` | Copies files from local to remote | Third provisioner; "not discussed at this stage" in this lecture |

- Earlier Terraform versions also had vendor provisioners (**Chef, Puppet, Salt** and others), but HashiCorp later **removed** them. As of the lecture only the three above remain, with `local-exec` and `remote-exec` being the two major ones.

### 2. local-exec explained

> "Invokes a local executable after a resource is created."

Example: after an EC2 instance is launched, `local-exec` fetches the instance's IP address and stores it in a local file (`server_ip.txt`). Another example: run a `ping` from your workstation to confirm the new server is reachable.

```
 Your laptop (Terraform installed)
 +-----------------------------------+
 | 1. terraform apply                |
 |    -> creates VM in the provider  |-----------> [ New VM (remote) ]
 | 2. local-exec runs HERE           |
 |    -> creates server_ip.txt       |             (nothing happens on the
 |    -> writes the VM's IP into it  |              remote server in step 2)
 +-----------------------------------+
```

### 3. remote-exec explained

`remote-exec` runs a script/command **on the remote server** - e.g., install or configure packages after the EC2 instance has launched. By its very name: *remote*-exec = remote machine; *local*-exec = the machine running Terraform.

### 4. The combined demo

Goal of the demo: run **both**:

1. `remote-exec` -> install software on the EC2 instance.
2. `local-exec` -> store the instance's public IP in a local file.

```
 Terraform
    |
    +--(1) create EC2 + security group
    |
    +--(2) remote-exec  --SSH-->  EC2: install software (instructor says nginx)
    |
    +--(3) local-exec   -->  local file with the server's IP address
```

Folder at the time: `provisioner.tf` + `terraform-key.pem`. The PEM file is needed because `remote-exec` must log into the server via SSH, so the private key lives in the same folder.

Steps shown:

1. `terraform apply -auto-approve`.
2. In AWS console one EC2 instance appears (created by Terraform).
3. Terraform connects via SSH ("Connected"), then installs packages. Every output line is prefixed with the **provisioner responsible**, e.g. `aws_instance.myec2 (remote-exec): ...`. After remote-exec completes, Terraform starts `local-exec`.
4. `local-exec` prints that it is starting and writes the IP into a new file, `private_ips.txt` (instructor's file name in this demo). Open it in the editor: it contains the server's public IP (`13.201.82.237` in the recording). It matches the EC2 console, and opening that IP in the browser shows the basic nginx website.

### 5. Repo code for this lecture - `provisioner-types.md`

Important note in the repo: *"Make sure to have the `ec2-key.pem` file present in the working directory for the provisioner to be able to connect to the instance."*

```hcl
provider "aws" {
  region     = "ap-southeast-1"
  access_key = "YOUR-KEY"        # placeholder - never hard-code real credentials
  secret_key = "YOUR-KEY"        # placeholder
}


resource "aws_security_group" "allow_ssh" {
  name        = "allow_ssh"
  description = "Allow SSH inbound traffic"

  ingress {
    description = "SSH into VPC"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    description = "Outbound Allowed"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_instance" "myec2" {
   ami = "ami-0b1e534a4ff9019e0"
   instance_type = "t2.micro"
   key_name = "ec2-key"
   vpc_security_group_ids  = [aws_security_group.allow_ssh.id]

   provisioner "remote-exec" {
     inline = [
       "sudo yum -y install nano"
     ]
   }
   provisioner "remote-exec" {
       when    = destroy
       inline = [
         "sudo yum -y remove nano"
       ]
     }
   connection {
     type = "ssh"
     user = "ec2-user"
     private_key = file("./ec2-key.pem")
     host = self.public_ip
   }
}
```

Block-by-block explanation:

| Block / argument | Meaning |
|---|---|
| `provider "aws"` with `access_key`/`secret_key` | The repo shows hard-coded placeholder credentials. (Extra context: in real work use environment variables or a shared credentials file, never commit keys.) |
| `aws_security_group.allow_ssh` | Opens inbound TCP 22 (SSH) from anywhere so Terraform can connect. Egress is set to TCP 0-65535 to anywhere. |
| `key_name = "ec2-key"` | Name of an **existing AWS key pair**; the instance is launched with the matching public key so the private key (`ec2-key.pem`) can log in. |
| `vpc_security_group_ids` | Attaches the security group (references `aws_security_group.allow_ssh.id`). |
| `provisioner "remote-exec"` + `inline` | A list of commands run on the server. First block (creation time) installs `nano`. |
| `provisioner "remote-exec"` with `when = destroy` | A **destroy-time** provisioner (Lecture 111): runs `sudo yum -y remove nano` before the instance is destroyed. |
| `connection` | How Terraform logs into the server: `type = "ssh"`, `user = "ec2-user"` (Amazon Linux default), `private_key = file(...)`, `host = self.public_ip`. |

**Discrepancy to be aware of:** the lecture talks about installing **nginx** (and a `private_ips.txt` file via `local-exec`), whereas the repo's `provisioner-types.md` installs **nano** (and has no `local-exec` block). The instructor's actual `provisioner.tf` for this demo is not in the repo. The repo file is a related example of both creation-time and destroy-time `remote-exec`. Also note the transcript's slide says `server_ip.txt` while the live demo wrote `private_ips.txt`, and that file held the *public* IP - the names are just demo labels.

### Exam tips (Lecture 106)

- Remember three: **`file`, `local-exec`, `remote-exec`**. Chef/Puppet/Salt provisioners were removed.
- `local-exec` -> runs where Terraform runs. `remote-exec` -> runs on the created resource.
- `remote-exec` needs credentials/connection info (SSH key etc.).
- Provisioner output lines are labelled with the provisioner name, e.g. `(remote-exec)`.
- Order seen in the demo: remote-exec output finished first, then local-exec (they run in the order written in the resource; extra context - see Lecture 110).

---

## Lecture 107 - Format of Defining Provisioners

A theory-only lecture (slides + HashiCorp docs) that sets up the syntax rules before the hands-on lectures.

### Rule 1 - Provisioners live INSIDE a resource block

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-..."
  instance_type = "t2.micro"

  # provisioner blocks go here, between the resource's { and }
}
```

A provisioner defined **outside** a resource block does not work.

### Rule 2 - `provisioner "<TYPE>"`

The block header is the keyword `provisioner` followed by the type in quotes:

```hcl
provisioner "local-exec"  { ... }
provisioner "remote-exec" { ... }
provisioner "file"        { ... }
```

### Rule 3 - local-exec needs a `command`

After declaring `local-exec`, specify the command to run on the machine where Terraform is running.

```hcl
resource "aws_instance" "myec2" {
  # ...
  provisioner "local-exec" {
    command = "echo Server has been created through Terraform"
  }
}
```

The instructor illustrates `echo`: whatever you pass to `echo` is printed. So after the server is created, the `terraform apply` output will show "Server has been created through Terraform".

### Rule 4 - remote-exec needs TWO things: commands + a `connection` block

```hcl
resource "aws_instance" "myec2" {
  # ...
  provisioner "remote-exec" {
    inline = [
      "yum -y install nginx",     # slide used these two example commands
      "systemctl start nginx",
    ]
  }

  connection {
    type        = "ssh"
    user        = "ec2-user"
    private_key = file("./key.pem")   # slide: "the key through which Terraform can connect"
    host        = self.public_ip      # slide: "the IP address of the server"
  }
}
```

| Block | Contains |
|---|---|
| `provisioner "remote-exec"` | The commands to run **on the server** (not on the local system). |
| `connection` | How to reach the server: protocol (type), user, private key, host/IP. |

(The slide's `yum -y install nginx` omits `sudo`; Lecture 109 demonstrates why `sudo` is required on `ec2-user`.)

### Documentation pattern

- HashiCorp docs for **local-exec**: a resource -> `provisioner "local-exec"` -> `command`. Simple.
- HashiCorp docs for **remote-exec**: the resource has a `connection` block **and** the provisioner block.

### Exam tips / gotchas (Lecture 107)

- Provisioner inside resource block - always.
- Syntax: `provisioner "type" {}`.
- `local-exec` -> `command`. `remote-exec` -> `inline` (list of commands) **plus** a `connection` block.
- Commands in remote-exec execute on the **server**, not the local system.

---

## Lecture 108 - Practical: local-exec Provisioner

### Goal

After an EC2 instance is created, use `local-exec` to store the instance's IP in a file `server_ip.txt` on the local machine.

### Repo files

**`local-exec.md` - Base code** (just the resource, no provisioner):

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-04e5276ebb8451442"
   instance_type = "t2.micro"
}
```

**`local-exec.md` - Final code:**

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-04e5276ebb8451442"
   instance_type = "t2.micro"

   provisioner "local-exec" {
    command = "echo ${self.private_ip} >> server_ip.txt"
   }
}
```

**`local-exec.tf`** (a variant in the repo; uses the resource's full name instead of `self` and a different file name/AMI):

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-082b5a644766e0e6f"
   instance_type = "t2.micro"

   provisioner "local-exec" {
    command = "echo ${aws_instance.myec2.private_ip} >> private_ips.txt"
  }
}
```

Documentation referenced: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec

### Understanding every piece

| Piece | Explanation |
|---|---|
| Provisioner inside the resource | Rule 1 from Lecture 107 - defining it outside would not work. |
| `provisioner "local-exec"` | Provisioner keyword + type. |
| `command = "..."` | The command to run on the **local machine** after the resource is created. |
| `echo ... >> server_ip.txt` | Shell redirection - **appends** the echoed text to a local file (creates it if missing). |
| `${self.private_ip}` | Interpolation of an attribute of this very resource. |
| `self` | "Refers to the resource to which this provisioner is associated." Because the provisioner sits under `aws_instance.myec2`, `self` means that instance. |
| `private_ip` / `public_ip` | Attributes of `aws_instance` (see the Attribute Reference in the docs). `public_ip` = public IP assigned to the instance; `private_ip` = private IP assigned. |

The instructor first read the file's example (`self.private_ip` -> `private_ip.txt`), then said "if you don't see the same example that's fine" and rewrote it as `self.public_ip` -> `server_ip.txt` while explaining; the recorded run actually showed the **private IP** (ending `25.213`) in `server_ip.txt`, matching `local-exec.md` Final code. Either attribute works - choose what you need.

(Extra context: `self` is the standard way to reference the resource's own attributes inside provisioner and connection blocks. Referring to the resource by its own address, as `local-exec.tf` does, would normally create a self-referential dependency cycle in a real config; the instructor's lecture and `local-exec.md` use `self`, which is the recommended form.)

### Demo walkthrough

1. Region note: the AMI is for **us-east-1**. In a different region, replace the AMI.
2. Confirm there is **no** `server_ip.txt` yet.
3. Run:

```bash
terraform apply -auto-approve
```

4. The EC2 instance is created first. **Only after creation completes** does Terraform start `Provisioning with 'local-exec'`.
5. A file `server_ip.txt` appears next to your `.tf` file. It contains the private IP (ending `25.213` in the recording).
6. Verify in AWS console (North Virginia): the instance's private IP matches the file.
7. **Clean up** to avoid charges:

```bash
terraform destroy -auto-approve
```

The instance goes running -> shutting-down -> terminated.

Expected output shape (extra context for exact text):

```text
aws_instance.myec2: Creating...
aws_instance.myec2: Provisioning with 'local-exec'...
aws_instance.myec2 (local-exec): Executing: ["/bin/sh" "-c" "echo 172.31.x.x >> server_ip.txt"]
aws_instance.myec2: Creation complete after ...
```

### Other use cases mentioned

Running scripts locally after the instance is created; running **Ansible** (a very popular tool) after a server gets created - all implementable with `local-exec`.

### Gotchas

- `>>` appends; re-running apply after destroy will add another line to the same file.
- `local-exec` runs on the machine running Terraform, so the command must exist there. (On the instructor's Windows machine, a missing command gave "not a recognized internal or external command" in later lectures.)
- Always destroy demo resources.

### Exam tips (Lecture 108)

- `self` = the resource that contains the provisioner.
- `local-exec` needs only `command`.
- Provisioner runs **after** the resource is created (creation-time is the default).

---

## Lecture 109 - Practical: remote-exec Provisioner

### Goal

Install nginx on a newly created EC2 instance via SSH using `remote-exec` and verify "Welcome to nginx!".

### Repo file `remote-exec.md`

Documentation referenced:
- https://www.terraform.io/language/resources/provisioners/remote-exec
- https://www.terraform.io/language/resources/provisioners/connection
- https://www.terraform.io/language/functions/file

**Base code:**

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-04e5276ebb8451442"
   instance_type = "t2.micro"
}
```

**Final code:**

```hcl
resource "aws_instance" "myec2" {
   ami = "ami-04e5276ebb8451442"
   instance_type = "t2.micro"
   key_name = "terraform-key"
   vpc_security_group_ids = ["sg-0edf854d7112cfbf4"]   # replace with YOUR security group ID

 connection {
    type     = "ssh"
    user     = "ec2-user"
    private_key  = file("./terraform-key.pem")
    host     = self.public_ip
  }

 provisioner "remote-exec" {
    inline = [
      "sudo yum -y install nginx",
      "sudo systemctl start nginx",
    ]
  }
}
```

### How the final code was built, step by step (as in the video)

**Step 1 - Add `connection` and `provisioner` blocks.** The docs' example usage already includes both; copy and fix indentation. Docs state: *"remote-exec provisioner requires connection and supports both `ssh` and `winrm`."*

| Protocol | Used for | Default user |
|---|---|---|
| `ssh` | Linux servers | Depends on the image (Amazon Linux = `ec2-user`; other providers e.g. DigitalOcean often `root`) |
| `winrm` (Windows Remote Management) | Windows servers | `Administrator` |

**Step 2 - Fill in the connection block.**

- `type = "ssh"` - Linux.
- `user = "ec2-user"` - changes with the OS image.
- **Password vs private key:** the docs' template shows `password`. AWS images have **password authentication disabled by default**, so a password cannot be used (another provider's images may allow it). Replace `password` with **`private_key`**. (The instructor briefly typed `private` / "terraform-key" then corrected to the exact argument name `private_key`, checking the docs.)
- `host = self.public_ip` - the public IP of this very instance, computed at creation time.

**Step 3 - Create a key pair.** In the AWS console create a key pair named **`terraform-key`**, format **`.pem`** (required for SSH). It downloads automatically; place `terraform-key.pem` in the **same folder as the Terraform code** (`kplabs-terraform` in the demo).

**Step 4 - Launch the EC2 with that key.** If the server isn't created with the key pair, you cannot log in. Docs search of `aws_instance` argument reference gives **`key_name`**: `key_name = "terraform-key"` (the key **name**, without `.pem`; the *file* is `terraform-key.pem`).

**Step 5 - Allow SSH.** The instance must accept inbound **SSH on port 22**. For simplicity the instructor manually created a security group `provisioner-sg` allowing SSH and HTTP (since nginx serves HTTP) from anywhere, then attached it using **`vpc_security_group_ids`** with that SG's ID. (HTTP/80 is needed to view the page.)

**Step 6 - Commands.** `inline` list with `sudo yum -y install nginx` and `sudo systemctl start nginx` (note the trailing comma between list items).

**Step 7 - (Mac/Linux) fix key permissions:**

```bash
chmod 400 terraform-key.pem
```

Too-open permissions make SSH refuse the key. (The instructor is on Windows, where the command doesn't apply.)

### Running it - and the errors hit

1. `terraform validate` - configuration valid.
2. `terraform apply -auto-approve` - instance and SG attach; instance goes pending -> running; then Terraform begins `remote-exec` and tries SSH.

**Error #1:**

```text
Failed to read ssh private key: no key found
```

Cause: `private_key` was given the plain **path/name** instead of the key's **contents**. The docs describe `private_key` as *"The contents of SSH key to use for the connection. This can be loaded from file on disk using the `file` function."*

**Fix:** use the `file()` function:

```hcl
private_key = file("./terraform-key.pem")
```

Because the instance was already created at that point (and had a failed provisioner), the instructor ran `terraform destroy -auto-approve`, re-verified the code, and re-applied. (Extra context: instead of destroy, a failed provisioner leaves the resource tainted, so a re-apply would also recreate it - see Lecture 111.)

**Gotcha #2 - `sudo`:** `ec2-user` is not root. `yum` installs packages system-wide and nginx binds to port 80, so use `sudo`. Demonstrated manually: running a `yum install` as `ec2-user` without `sudo` gives *"This command has to be run with superuser privilege"*.

3. Second `terraform apply -auto-approve`: Terraform shows **"Connected"** (SSH success), then installs nginx and dependencies; install completes successfully.
4. Browse to `http://<public-ip>` -> **"Welcome to nginx!"** (customisable).

### Troubleshooting when Terraform can't connect

If the instance is created but Terraform cannot connect (timeouts etc.): **reproduce the connection manually** using exactly the values in the connection block:

```bash
ssh -i terraform-key.pem ec2-user@<public-ip>
```

If manual login fails you will see the exact error to debug (security group, key mismatch, wrong user, wrong permissions ...). If manual login works, you can try commands by hand (e.g., test the `sudo` issue).

### Diagram

```
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

### Exam tips / gotchas (Lecture 109)

- `remote-exec` **requires** a `connection`; supports **ssh** and **winrm**.
- Linux -> SSH; Windows -> WinRM (default user `Administrator`).
- Instance must be created with the **key pair** (`key_name`) and security group must allow **port 22**.
- `private_key` expects key **contents** -> use `file("path")`.
- Use `sudo` for admin commands on `ec2-user`.
- `chmod 400 <key>.pem` on Mac/Linux.
- Default SSH user depends on the OS image/provider.
- Troubleshoot by SSHing manually with the same values.
- Never commit private keys or real credentials to version control (extra context).

---

## Lecture 110 - Points to Note: Provisioners

### Point 1 - Provisioners work on ANY resource type

Throughout the demos `aws_instance` was used, which can mislead learners into thinking provisioners are tied to EC2. **Not true** - provisioners can be placed in any resource block; they run after that resource is created. The lecture uses `aws_iam_user`.

**Repo `points-to-note.md` - Base Code:**

```hcl
resource "aws_iam_user" "lb" {
  name = "demoiamuser"

  provisioner "local-exec" {
    command = "echo local-exec provisioner is starting"
  }
}
```

Demo: `terraform apply -auto-approve` -> the IAM user is created, then the local-exec provisioner prints `local-exec provisioner is starting`. Remote-exec could also be used on resources where a connection makes sense (the instructor says it would be "initiated after resource creation" the same way).

### Point 2 - Multiple provisioners in a single resource

You may add **multiple provisioner blocks** in one resource, and you can mix: `local-exec` several times, `remote-exec`, `file` etc., depending on your use case.

**Repo `points-to-note.md` - "Scenerio 2":**

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

Walkthrough:

1. `terraform destroy -auto-approve` the earlier user.
2. Edit the file to add the second block ("... for second time").
3. `terraform apply -auto-approve` again.
4. Output shows both messages, in the order written:

```text
aws_iam_user.lb: Creating...
aws_iam_user.lb: Creation complete after ...
aws_iam_user.lb: Provisioning with 'local-exec'...
aws_iam_user.lb (local-exec): local-exec provisioner is starting
aws_iam_user.lb: Provisioning with 'local-exec'...
aws_iam_user.lb (local-exec): local-exec provisioner is starting for 2nd time
```

(Exact log wording is extra context; the lecture shows both outputs appear.)

### Why destroy first?

Provisioners are creation-time by default and do **not** re-run on an existing resource. To re-run them, the instructor destroyed and re-applied (this behaviour is formalised in Lecture 111).

### Summary table

| Point | Detail |
|---|---|
| Location | Always inside a resource block |
| Resource type | Any resource type, not just `aws_instance` |
| Quantity | Multiple provisioners per resource allowed |
| Mixing | local-exec, remote-exec, file can be combined |
| Order | Run in the order they appear (shown in the demo; extra context: documented behaviour) |

### Exam tips (Lecture 110)

- Don't assume provisioners are EC2-only.
- A single resource may contain several provisioner blocks.

---

## Lecture 111 - Creation-Time and Destroy-Time Provisioners

### 1. Creation-time provisioners (the default)

- By default, any provisioner defined in a resource block runs **after the resource is created**: a **creation-time provisioner**.
- They run **only during creation**. They do **not** run on updates or other lifecycle events.
- Example: an EC2 instance with 1 GB RAM is created -> provisioner runs. Later you change it to 2 GB RAM (an update) -> creation-time provisioner does **not** run again. (Extra context: if a change forces the resource to be *replaced*, the new resource is "created" so provisioners run again for that new object.)
- Everything in Lectures 105-110 used creation-time provisioners.

### 2. Destroy-time provisioners

- Run **before the resource is destroyed**.
- Syntax: same as before, plus `when = destroy`.

```hcl
provisioner "local-exec" {
  command = "echo This is destroy time provisioner"
  when    = destroy
}
```

- On `terraform destroy`: provisioner runs first, then the resource is terminated.

**Common use case (instructor's experience):** an EC2 instance in production is linked to a central dashboard (e.g., antivirus status). Before the instance is terminated, a destroy-time provisioner **removes/de-links the antivirus** from the system/dashboard, then the system terminates.

### 3. Repo file `create-destroy-time-provisioner.md`

**Base Code** (`create-destroy-time-provisioner.tf` in the repo text):

```hcl
resource "aws_iam_user" "lb" {
  name = "provisioner-user"

  provisioner "local-exec" {
    command = "echo This is creation time provisioner"
  }

  provisioner "local-exec" {
    command = "echo This is destroy time provisioner"
    when    =  destroy
  }
}
```

| Block | When it runs |
|---|---|
| First `local-exec` (no `when`) | At creation (default is `when = create`; extra context) |
| Second `local-exec` with `when = destroy` | Before resource destruction |

### 4. Demo walkthrough

**Scenario A - apply:**

```bash
terraform apply -auto-approve
```

The IAM user is created; only the creation-time provisioner runs, printing `This is creation time provisioner`.

**Scenario B - destroy:**

```bash
terraform destroy -auto-approve
```

The user is deleted; this time only the destroy-time provisioner runs, printing `This is destroy time provisioner`.

### 5. Failure and tainting

> **If a creation-time provisioner fails, the resource is marked as _tainted_.**

- Why: a failed provisioner can leave the resource in a **semi-configured state**. Example: a `remote-exec` that installs important software fails (network problem, permission issue ...). The EC2 exists but isn't configured as needed - useless for the application.
- A tainted resource is **planned for destruction and recreation on the next `terraform apply`**.

**Repo - "Simulating failure to see Tainting of Resource":** remove the `echo` so the command does not exist.

```hcl
resource "aws_iam_user" "lb" {
  name = "provisioner-user"

  provisioner "local-exec" {
    command = "This is creation time provisioner"
  }

  provisioner "local-exec" {
    command = "echo This is destroy time provisioner"
    when    =  destroy
  }
}
```

Walkthrough:

1. `terraform apply -auto-approve`:
   - the IAM user is created (visible in the AWS console under Users),
   - then local-exec runs and fails with a "not recognized as an internal or external command" error (message from the instructor's Windows machine; on Linux/Mac it would be `command not found`-style),
   - apply ends in error.
2. Run `terraform apply` again: Terraform proposes to **destroy and recreate** the resource (instructor answered "no" at the prompt, just to inspect).
3. Open `terraform.tfstate`: the resource's status is **`tainted`**. On the next apply it will be destroyed and recreated.
4. Rule: whenever a provisioner fails, the **resource the provisioner is attached to** is marked tainted.

Illustrative state/plan shapes (extra context):

```text
# aws_iam_user.lb is tainted, so must be replaced
-/+ resource "aws_iam_user" "lb" { ... }
```

### Diagram - lifecycle

```
 terraform apply  (resource does not exist)
    create resource --> run creation-time provisioners
                          |-- success --> resource OK
                          |-- failure --> apply ERROR + resource TAINTED
                                          --> next apply: destroy + recreate

 terraform apply  (update in place)  --> creation-time provisioners DO NOT run

 terraform destroy
    run destroy-time provisioners (when = destroy) --> destroy resource
```

### Exam tips (Lecture 111)

- Default = **creation-time**. They don't run on updates.
- `when = destroy` makes a **destroy-time** provisioner; runs *before* destruction.
- **Failed creation-time provisioner -> resource tainted -> destroyed & recreated next apply.**
- The resource itself **is** created and exists in the cloud even when the provisioner fails (the IAM user was visible in the console).
- Rationale: avoid leaving resources semi-configured.
- Taint status can be seen in the state file (`terraform.tfstate`).
- (Extra context) Related: `terraform taint` / `terraform untaint` exist; in newer Terraform the recommended manual replacement is `terraform apply -replace=<address>`.

---

## Lecture 112 - Failure Behaviour for Provisioners

### 1. Default behaviour

By default, when a provisioner fails:

- the **`terraform apply` itself fails**, and
- the resource is **marked tainted**, so the next apply destroys and recreates it.

The screenshot example in the lecture: the command `echo1` is "not recognized as an internal or external command" -> provisioner fails -> apply fails -> resource tainted.

### 2. The `on_failure` setting

For production you may want flexibility: **even if the provisioner fails, the apply should not fail and the resource should not be tainted.** Use `on_failure`.

| Value | Behaviour |
|---|---|
| `fail` (**default**) | Raise an error and stop applying. Resource is marked tainted (creation-time provisioners). |
| `continue` | **Ignore the error** and continue with the creation/destruction of resources. Apply succeeds; resource is **not** tainted. |

Not specifying `on_failure` is the same as `on_failure = fail`.

### 3. Repo file `failure-behaviour.md`

**Base Code** (fails because `echo1` is not a real command):

```hcl
resource "aws_iam_user" "lb" {
  name = "demo-provisioner-user"

  provisioner "local-exec" {
    command = "echo1 This is creation time provisioner"
  }
}
```

**Final Code (on-failure to continue):**

```hcl
resource "aws_iam_user" "lb" {
  name = "demo-provisioner-user"

  provisioner "local-exec" {
    command = "echo1 This is creation time provisioner"
    on_failure = continue
  }
}
```

### 4. Demo walkthrough (file `provisioner-behavior.tf` locally)

1. Prove the command works with plain `echo`: run the command text in the CLI and it prints output. With `echo1` (non-existent) the shell says "not recognized".
2. Apply the **failing** version:

```bash
terraform apply -auto-approve
```

Result: `echo1` not recognized -> local-exec provisioner fails -> **apply fails**; the resource is **immediately marked tainted**.

3. Clean up so the second scenario starts fresh:

```bash
terraform destroy -auto-approve
```

4. Add `on_failure = continue` and re-apply:

```bash
terraform apply -auto-approve
```

Result: the same "no internal or external command" error text still appears in the output, **but Terraform ignores it and apply completes successfully**.

5. Check the state: the **taint is gone** - the resource is not tainted.
6. Run `terraform plan` to prove it: Terraform does **not** try to recreate the resource (no changes).

### Comparison

| | `on_failure = fail` (default) | `on_failure = continue` |
|---|---|---|
| Provisioner command fails | Error raised | Error shown but ignored |
| `terraform apply` result | Fails | Succeeds |
| Resource tainted? | Yes | No |
| Next `terraform plan/apply` | Wants to destroy and recreate | No changes |

### Gotchas

- With `continue`, the resource may be **partially configured** without Terraform knowing - use deliberately (e.g., non-critical health checks).
- `on_failure` is an argument inside the **provisioner** block (not the resource block).

### Exam tips (Lecture 112)

- Default `on_failure` = **`fail`**.
- `continue` = ignore error, apply goes on, no tainting.
- A failing provisioner (default) fails the whole apply.

---

## Bonus repo file: null.md (null_resource)

`null.md` is in the repo folder but **not discussed in any transcript of lectures 105-112** (it belongs to a null-resource topic). It is recorded here so nothing in the folder is left out; the explanation below is labelled extra context where it goes beyond the file.

A `null_resource` (from the `null` provider) is a resource that **creates nothing** in any cloud. Because provisioners must live inside a resource, it is commonly used as a **host for provisioners that are not tied to a real resource** (e.g., running a health check).

**`null-example-1.tf`:**

```hcl
provider "aws" {
  region     = "ap-southeast-1"
  access_key = "YOUR-KEY"
  secret_key = "YOUR-KEY"
}

resource "aws_eip" "lb" {
  vpc      = true
  depends_on = [null_resource.health_check]
}


resource "null_resource" "health_check" {

 provisioner "local-exec" {

    command = "curl https://google.com"
  }
}
```

- `null_resource.health_check` runs `curl https://google.com` locally.
- `aws_eip.lb` has `depends_on = [null_resource.health_check]`, so the Elastic IP is created **only after** the health check provisioner has run (and succeeded).
- (Extra context: `vpc = true` on `aws_eip` is deprecated in newer AWS provider versions in favour of `domain = "vpc"`.)

**`null-example-2.tf`:**

```hcl
provider "aws" {
  region     = "ap-southeast-1"
  access_key = "YOUR-KEY"
  secret_key = "YOUR-KEY"
}

resource "aws_eip" "lb" {
  vpc      = true
  count = 0
}


resource "null_resource" "ip_check" {

 triggers = {
    latest_ips = join(",", aws_eip.lb[*].public_ip)
  }

 provisioner "local-exec" {

   command = "echo Latest IPs are ${null_resource.ip_check.triggers.latest_ips} > sample.txt"

  }
}
```

- `triggers` is a map; when its values change, the `null_resource` is **replaced**, so its provisioners **run again**. Here the trigger is a comma-joined list of the EIPs' public IPs (`aws_eip.lb[*]` is a splat expression).
- `count = 0` on the EIP means zero EIPs exist (extra context: an empty list joins to an empty string); change `count` to see the trigger change and the provisioner re-run.
- The command writes the latest IPs into `sample.txt`.

---

## Command / syntax cheat-sheet

### Provisioner skeletons

```hcl
resource "<TYPE>" "<NAME>" {
  # ... resource arguments ...

  # 1) local-exec (runs on the machine running Terraform)
  provisioner "local-exec" {
    command    = "echo ${self.private_ip} >> server_ip.txt"
    when       = destroy      # optional; omit for creation-time (default)
    on_failure = continue     # optional; default is fail
  }

  # 2) remote-exec (runs on the remote resource; needs connection)
  provisioner "remote-exec" {
    inline = [
      "sudo yum -y install nginx",
      "sudo systemctl start nginx",
    ]
  }

  # 3) connection block (for remote-exec / file)
  connection {
    type        = "ssh"                       # or "winrm" for Windows
    user        = "ec2-user"                  # depends on the image
    private_key = file("./terraform-key.pem") # key CONTENTS, via file()
    host        = self.public_ip
  }
}
```

### Argument reference (as used in this session)

| Argument | In | Meaning |
|---|---|---|
| `command` | `local-exec` | Command to run locally |
| `inline` | `remote-exec` | List of commands to run on the remote host |
| `when = destroy` | any provisioner | Run before destroy instead of after create |
| `on_failure = fail \| continue` | any provisioner | What to do if the provisioner errors (default `fail`) |
| `type` | `connection` | `ssh` (Linux) or `winrm` (Windows) |
| `user` | `connection` | Login user (`ec2-user`, `root`, `Administrator` ...) |
| `password` | `connection` | Password auth (disabled on AWS images by default) |
| `private_key` | `connection` | Contents of private key -> `file("path")` |
| `host` | `connection` | Address of server, e.g. `self.public_ip` |
| `self` | provisioner/connection | The resource containing the provisioner |
| `key_name` | `aws_instance` | EC2 key pair name (no `.pem`) |
| `vpc_security_group_ids` | `aws_instance` | Security groups to attach |

### CLI commands

```bash
terraform validate
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve
chmod 400 terraform-key.pem               # Mac/Linux: restrict PEM permissions
ssh -i terraform-key.pem ec2-user@<ip>    # manual connection test
```

---

## Key takeaways

1. Provisioners run scripts/commands **locally or remotely** as part of resource creation/destruction - they bridge "resource created" to "resource configured".
2. Three provisioners remain: `file`, `local-exec`, `remote-exec` (Chef/Puppet/Salt removed).
3. Provisioners must be **inside a resource block**, written `provisioner "<type>" { ... }`; they can be on **any** resource type and you can have **multiple** per resource.
4. `local-exec` = `command`, runs where Terraform runs. `remote-exec` = `inline` commands on the server and **requires a `connection` block** (ssh/winrm).
5. `self` refers to the enclosing resource (`self.public_ip`, `self.private_ip`).
6. For SSH: key pair attached at launch (`key_name`), SG with port 22 open, `private_key = file("...")`, correct default user, `sudo` for admin commands, `chmod 400` on the key (Mac/Linux).
7. Default provisioners are **creation-time** and only run on creation. `when = destroy` makes destroy-time ones.
8. A **failed creation-time provisioner taints the resource** and fails the apply; the next apply recreates it.
9. `on_failure = continue` ignores failure: apply succeeds and no tainting. Default is `fail`.
10. Provisioners are not part of the newer exam but remain valuable; treat as a last resort in practice (extra context).

---

## Quick revision Q&A

**1. What are provisioners used for?**
To execute scripts or commands on a local or remote machine as part of resource creation and destruction, e.g., installing software after a VM launches.

**2. Which provisioner types exist?**
`file`, `local-exec`, `remote-exec`. Older Chef, Puppet, Salt provisioners were removed.

**3. Where do you place a provisioner block?**
Inside a resource block; outside will not work.

**4. Difference between local-exec and remote-exec?**
local-exec runs on the machine where Terraform runs; remote-exec runs on the remote resource (e.g., the new EC2) and needs a `connection` block.

**5. What two blocks does remote-exec need?**
The `provisioner "remote-exec"` block (with `inline` commands) and a `connection` block.

**6. Which protocols does the connection block support?**
`ssh` (Linux) and `winrm` (Windows Remote Management).

**7. What does `self` mean in a provisioner?**
The resource the provisioner is defined in (e.g., `self.public_ip` is that instance's public IP).

**8. Why couldn't the instructor use a password for the EC2 connection?**
AWS images disable password authentication by default, so a `private_key` is used instead.

**9. What caused "Failed to read ssh private key: no key found" and how was it fixed?**
`private_key` was given a file name/path rather than the key contents. Fix: `private_key = file("./terraform-key.pem")`.

**10. What must be configured on the EC2 so Terraform can SSH in?**
Launch with `key_name` of the matching key pair, and attach a security group allowing inbound SSH on port 22 (and HTTP if you want to view nginx).

**11. Why is `sudo` needed in the remote-exec commands?**
`ec2-user` isn't root; `yum` and binding nginx to port 80 need admin privilege. Without it: "This command has to be run with superuser privilege".

**12. Can provisioners be used only with aws_instance?**
No. Any resource type (the lecture used `aws_iam_user`). Multiple provisioner blocks in one resource are allowed.

**13. What is the difference between creation-time and destroy-time provisioners?**
Creation-time (default) run after the resource is created and not on updates. Destroy-time (`when = destroy`) run before the resource is destroyed.

**14. What happens if a creation-time provisioner fails?**
The apply fails and the resource is marked **tainted** (it exists, but is considered semi-configured) so the next apply destroys and recreates it.

**15. How do you stop a provisioner failure from failing the apply?**
Set `on_failure = continue`. Default is `fail`. With `continue`, the error is ignored and the resource is not tainted.

**16. How do you troubleshoot a Terraform-to-EC2 SSH connection issue?**
Try SSH manually with the same key, user and IP as in the connection block (`ssh -i key.pem ec2-user@ip`) and read the error.

**17. Are provisioners in the new exam?**
According to the instructor, no - they were in the earlier version only.

---

## Glossary

| Term | Meaning |
|---|---|
| **Provisioner** | A block inside a resource that runs commands/scripts/file copies on local or remote machines around resource creation/destruction. |
| **local-exec** | Provisioner that runs a command on the machine running Terraform. |
| **remote-exec** | Provisioner that runs commands on the remote resource over SSH/WinRM. |
| **file provisioner** | Provisioner that copies files to the remote resource (mentioned, not practised in this session). |
| **connection block** | Configuration describing how Terraform connects to a remote resource (type, user, key/password, host). |
| **inline** | `remote-exec` argument: list of commands to execute remotely. |
| **command** | `local-exec` argument: the command line to execute locally. |
| **self** | Reference to the resource that contains the provisioner/connection block. |
| **SSH** | Secure Shell; the protocol Terraform uses to log into Linux servers. |
| **WinRM** | Windows Remote Management; protocol for Windows servers (default user `Administrator`). |
| **PEM file** | Private key file for SSH (e.g., `terraform-key.pem`). |
| **key pair / key_name** | AWS-registered key; `key_name` on `aws_instance` associates it at launch. |
| **file() function** | Reads a file's contents into a string (used for `private_key`). |
| **Creation-time provisioner** | Default provisioner; runs after the resource is created. |
| **Destroy-time provisioner** | Provisioner with `when = destroy`; runs before the resource is destroyed. |
| **Tainted** | Resource state meaning it should be destroyed and recreated at next apply; set when a creation-time provisioner fails. |
| **on_failure** | Provisioner setting: `fail` (default) or `continue`. |
| **null_resource** | Resource that creates nothing itself; often used to host provisioners (see bonus section). |
| **triggers** | `null_resource` map; changes force the null resource to be replaced and its provisioners to re-run. |
| **IaC** | Infrastructure as Code. |
