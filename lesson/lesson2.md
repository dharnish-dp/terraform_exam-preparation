# Session 2 - Installing Terraform

> HashiCorp Certified Terraform Associate (Zeal Vora / KPLabs) - study notes
> Source: transcript "10. Installation Process of Terraform - New"
> Convention: anything marked **(extra context)** is NOT from the transcript. It is added background to make the notes more useful.

---

## Session overview

This session explains **how Terraform is installed** and why that is so simple. The instructor's core message:

1. Terraform is a **single binary**. There is **no installer** - you download it and run it.
2. It runs on **many operating systems** (Windows, macOS, Linux, FreeBSD, OpenBSD, Solaris).
3. On each OS you have two routes: a **package manager** (easiest, sets everything up for you) or a **manual binary download** (you must put the binary on the system **PATH** yourself).
4. A live Windows demo shows **why the PATH matters**: without it, `terraform` only works from the folder that contains the executable.

The lecture is mostly conceptual. The hands-on install walkthroughs (Windows and Linux; macOS is "very similar to Linux") are in later practical videos. For that reason the step-by-step sections below combine what the instructor said with clearly labelled extra context.

Note on the course repo (`/tmp/tf_repo_clone/repo/`): it contains only demo code and per-topic docs for Sections 1-7. It has **no Terraform installation instructions**. The only install-related reference is a link to the AWS CLI install guide inside `Section 1 .../aws-provider-auth.md` (used later for AWS authentication, not for Terraform itself):

```
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
```

## Table of contents

- [Lecture 10. Installation Process of Terraform](#lecture-10-installation-process-of-terraform)
  - [10.1 Why installation is simple: a single binary](#101-why-installation-is-simple-a-single-binary)
  - [10.2 Supported operating systems](#102-supported-operating-systems)
  - [10.3 Demo: Terraform as a single `terraform.exe`](#103-demo-terraform-as-a-single-terraformexe)
  - [10.4 Installation options per OS](#104-installation-options-per-os)
  - [10.5 Package manager vs manual binary, and the PATH requirement](#105-package-manager-vs-manual-binary-and-the-path-requirement)
  - [10.6 Demo: what happens with and without PATH (Windows)](#106-demo-what-happens-with-and-without-path-windows)
  - [10.7 Step-by-step walkthroughs](#107-step-by-step-walkthroughs)
  - [10.8 Verifying the installation](#108-verifying-the-installation)
  - [10.9 Common pitfalls and troubleshooting](#109-common-pitfalls-and-troubleshooting)
- [Exam tips / things to remember](#exam-tips--things-to-remember)
- [Key takeaways](#key-takeaways)
- [Quick revision Q&A](#quick-revision-qa)
- [Command cheat-sheet](#command-cheat-sheet)

---

## Lecture 10. Installation Process of Terraform

### 10.1 Why installation is simple: a single binary

- The instructor points out a good property of **HashiCorp products in general** (Terraform, Consul, Vault, etc.): the **installation process is very simple**.
- All you do is **download the appropriate binary** (the `terraform` executable) from the **HashiCorp website** and use it directly.
- To be precise: **no installation is actually required**. You download the binary and start using it.
- Instructor flags this as an aspect to "keep a note of".

**(extra context)** The official download page is `https://developer.hashicorp.com/terraform/install` (older name: `https://www.terraform.io/downloads`). It lists, per OS, the package-manager commands and the binary download links. The instructor shows this page in the video but the URL is not spoken in the transcript.

### 10.2 Supported operating systems

Terraform supports all major operating systems:

| OS | Supported |
|----|-----------|
| Windows | Yes |
| macOS | Yes |
| Linux | Yes |
| FreeBSD | Yes |
| OpenBSD | Yes |
| Solaris | Yes |

### 10.3 Demo: Terraform as a single `terraform.exe`

Demonstration on the instructor's Windows machine:

- The folder contains **just one file: `terraform.exe`** - the whole of Terraform. No setup wizard, no extra files needed.
- Typing `terraform` in a terminal lists all the available sub-commands/options, which proves Terraform is "ready to use" (once you have configuration files to work on).

```
terraform
```

**(extra context)** Running `terraform` with no arguments prints the usage help and the main commands (init, validate, plan, apply, destroy, etc.) - this doubles as a quick "is it installed?" check.

### 10.4 Installation options per OS

The instructor shows the HashiCorp download page and walks through what is offered per OS. Methods differ per OS but are all easy.

**macOS**
- **Recommended: package manager** ("this will make your life simple"). You run **two commands** and nothing else is required.
- Alternative (if you do not want the package manager): **download the binary**. Choices: **AMD64** (Intel) and **ARM64** (Apple silicon).

**Windows**
- Uses the **direct binary** approach: download the **386** (32-bit) or **AMD64** (64-bit) binary and start using it.

**Linux**
- "A lot of options".
  - **Ubuntu / Debian**: one set of package-manager commands.
  - **RHEL-based** operating systems: slightly different commands.
  - The **package manager differs depending on the distribution**, so the commands change accordingly.
- **Binary route is straightforward**: e.g. download the **AMD64** binary. There is **no different binary per distribution** - a **common binary per version** works on Ubuntu, Red Hat, and so on.

Summary table:

| OS | Package manager | Manual binary |
|----|-----------------|---------------|
| macOS | Recommended (two commands) | AMD64 or ARM64 |
| Windows | (not highlighted by instructor; direct binary used in course) | 386 or AMD64 |
| Linux | Yes, commands differ by distro (Ubuntu/Debian vs RHEL-based) | AMD64 etc.; one common binary for all distros |

**Plan for the course:** the practical video(s) cover installation on **Windows and Linux**. **macOS is very similar to Linux**, so macOS users can follow the Linux walkthrough.

### 10.5 Package manager vs manual binary, and the PATH requirement

This is the most important conceptual point in the lecture.

- **Package manager install** -> **nothing else required.** The package manager takes care of placing the binary and configuring everything for you.
- **Manual binary download** -> you **must ensure the directory containing the Terraform executable is included in the system's `PATH` environment variable.**
- This is **not specific to Terraform**: any binary you download manually must be on the PATH, otherwise you cannot run it from arbitrary folders.

### 10.6 Demo: what happens with and without PATH (Windows)

Instructor's Windows sandbox demo, in order:

1. A Terraform binary sits on the **Desktop**. Open a terminal and `cd` to the Desktop.
2. Listing the folder shows the single Terraform binary.
3. Run `terraform` **from the Desktop** -> works (it prints the sub-options) because the executable is in the **current folder**.
4. Change to **a different folder that does not contain** `terraform.exe` and run `terraform` -> **fails**: the system cannot find the binary.
5. Conclusion: this is **why we set the environment PATH** - we tell the OS "the Terraform binary lives in this location", so it works from any folder.
6. Second proof: the instructor has a folder `C:\binaries` that contains the Terraform binary.
   - Run `terraform` from inside that folder -> works (same folder).
   - Move to another folder (e.g. the `C:\` drive root) where the binary is **not** present and run `terraform` -> **still works**, because `C:\binaries` is on the PATH.
7. Looking at **Environment Variables -> `Path`**: the entry `C:\binaries` is present (alongside other entries such as an `nmap` folder).
   - When you type `terraform`, the shell **searches each directory in the PATH** in turn (e.g. `C:\binaries`, the nmap folder, ...). If the binary is found in **any** of them, it runs; otherwise you get the "not found" error.
8. The same concept exists on **Linux** too (it also has environment variables / `PATH`).

Key sentence from the instructor: when using a package manager "it takes care of setting all of the things for you"; when downloading manually, "setting up the path is one of the things you will have to do" - and the process is the same for any binary.

### 10.7 Step-by-step walkthroughs

The transcript itself only describes these routes at overview level (details come in the practical videos). The command listings below are **(extra context)** based on HashiCorp's standard documentation; always copy the current commands from the official install page because they change over time.

#### macOS (package manager - Homebrew) - the "two commands"
**(extra context)** The "two commands" the instructor refers to are, on the HashiCorp page for macOS (Homebrew):

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

No PATH setup needed - Homebrew handles it.

#### macOS / Linux (manual binary)
1. Open the HashiCorp download page and pick the correct build: **AMD64** (Intel/AMD) or **ARM64** (Apple silicon / ARM Linux).
2. Download the `.zip` and extract it - it contains the single `terraform` executable.
3. **(extra context)** Move it to a directory already on the PATH, e.g.:

```bash
unzip terraform_<version>_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

4. Verify (see 10.8).

#### Linux (package manager)
- Ubuntu/Debian use `apt`-based commands; RHEL-based systems use `yum`/`dnf`-based commands (the instructor only says the commands differ by distro).
- **(extra context)** Typical Ubuntu/Debian flow from HashiCorp (add the HashiCorp apt repo, then install) - check the official page for exact current lines:

```bash
sudo apt update && sudo apt install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

#### Windows (manual binary, as demonstrated)
1. Download the **AMD64** (64-bit; or 386 for 32-bit) zip from the HashiCorp download page.
2. Extract `terraform.exe`.
3. Place it in a folder of your choice, e.g. `C:\binaries` (the instructor's choice in the demo).
4. Add that folder to the **`Path`** environment variable:
   - **(extra context)** Windows: search "Edit the system environment variables" -> *Environment Variables* -> select `Path` -> *Edit* -> *New* -> enter `C:\binaries` -> OK on all dialogs.
5. **Open a new terminal** (the already-open one will not see the updated PATH) and verify (see 10.8).
6. **(extra context)** Alternative package managers on Windows exist (e.g. Chocolatey: `choco install terraform`), which handle the PATH for you.

### 10.8 Verifying the installation

Instructor's check: type `terraform` and see the list of options. Because Terraform is just the binary, success = the command is found and prints its usage.

```
terraform
```

**(extra context)** The most common explicit check is the version command, which confirms both that the binary is found on the PATH and which version you have:

```bash
terraform -version
# or
terraform version
```

To test the PATH specifically (as the instructor did), run it from a folder that does **not** contain the binary.

**(extra context)** To see where the shell finds it:

```bash
which terraform        # macOS / Linux
where terraform        # Windows (cmd)
```

### 10.9 Common pitfalls and troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `terraform` works in one folder but "not found" elsewhere | Binary is only in the current folder; its directory is not on the PATH | Add the binary's directory to the system `PATH` (or move it into a folder already on the PATH) |
| Edited PATH but still "not found" | **(extra context)** Terminal opened before the PATH change | Open a new terminal session |
| Wrong binary downloaded | Architecture mismatch (e.g. ARM64 vs AMD64; 386 vs AMD64) | Download the build matching your CPU/OS |
| Linux package manager commands fail | Commands differ between Ubuntu/Debian and RHEL-based distros | Use the commands for your distro, or use the common Linux binary |

Reminder from the instructor: PATH handling is the same for **any** manually installed binary, not just Terraform.

---

## Exam tips / things to remember

- Terraform is distributed as a **single binary**; "installation" = download and (if manual) put it on the **PATH**.
- Supported platforms to recall: **Windows, macOS, Linux, FreeBSD, OpenBSD, Solaris**.
- **Package manager installs** configure everything for you; **manual binary installs** need the **PATH** set up by you.
- macOS: package manager recommended; binary builds are **AMD64 and ARM64**. Windows binaries: **386 and AMD64**. Linux: one common binary per version across distros.
- Package manager commands differ by Linux distribution (Ubuntu/Debian vs RHEL-based).
- If `terraform` is "not found" outside its own folder, the fix is **PATH**, not reinstalling.
- **(extra context)** Check the installed version with `terraform -version`; this is the typical way to confirm the installation.

## Key takeaways

1. HashiCorp tools install by simply downloading a binary - no installer.
2. Terraform runs on Windows, macOS, Linux, FreeBSD, OpenBSD and Solaris.
3. Best practice: use the OS package manager (macOS: two commands; Linux: distro-specific commands).
4. Manual binary downloads must be placed in a directory on the system `PATH`.
5. Without the PATH, Terraform only works from the directory that contains the executable (demonstrated live on Windows).
6. The shell searches every directory listed in `PATH` for the command; it runs if found in any of them.
7. The practical videos cover Windows and Linux; macOS follows the Linux flow.

## Quick revision Q&A

**1. Does Terraform need an installer or setup wizard?**
No. It is a single binary; download it and start using it.

**2. Where do you get the Terraform binary?**
From the HashiCorp website (download/install page).

**3. Which operating systems does Terraform support?**
Windows, macOS, Linux, FreeBSD, OpenBSD and Solaris.

**4. What is the recommended way to install Terraform on macOS?**
The package manager (two commands). A binary download (AMD64 or ARM64) is the alternative.

**5. Which binary architectures are offered for Windows?**
386 and AMD64.

**6. Do you need a different Linux binary for Ubuntu and Red Hat?**
No. There is one common binary per version (e.g. AMD64) usable across distributions. Only the package-manager commands differ by distro.

**7. When is it necessary to modify the PATH environment variable?**
When you install by manually downloading the binary. Package managers do it for you.

**8. Why does `terraform` work on the Desktop but not in another folder?**
Because the executable sits in the Desktop folder, and that folder is not on the PATH; elsewhere the shell cannot locate it.

**9. In the demo, why did `terraform` still work from the C drive root?**
Because `C:\binaries` (where the binary lives) was added to the `Path` environment variable.

**10. How do you quickly confirm Terraform is working?**
Run `terraform` (prints the options) or, **(extra context)**, `terraform -version`.

## Command cheat-sheet

```bash
# Check that Terraform is installed / on PATH (shows usage and sub-commands)
terraform

# (extra context) Show the installed version
terraform -version

# (extra context) macOS install via Homebrew (the "two commands")
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# (extra context) Manual Linux/macOS binary install: put it on a PATH directory
sudo mv terraform /usr/local/bin/

# (extra context) Locate the binary the shell will run
which terraform      # macOS / Linux
where terraform      # Windows
```

Windows manual install checklist: download zip (AMD64/386) -> extract `terraform.exe` -> place in a folder (e.g. `C:\binaries`) -> add folder to `Path` environment variable -> open a new terminal -> run `terraform`.

Official download page **(extra context)**: `https://developer.hashicorp.com/terraform/install`
