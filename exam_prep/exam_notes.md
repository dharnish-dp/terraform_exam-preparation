# Terraform Associate (004) — Exam-Crack Notes

Built from the 100 questions you missed across your 5 practice exams (scores 36, 36, 38, 37, 37 out of 57; pass ≈ 40/57). You are **3–4 questions** short — so the goal is not to learn everything, it's to stop losing the same points.

## How to use these notes (read this first)

**Study in this order (most-missed first):**
1. **Objective 8 — HCP Terraform** (missed 6+6 times in 8b/8c — your biggest leak)
2. **Objective 7 — Maintain infrastructure** (7a missed 6×)
3. **Objective 5 — Modules** (5a, 5b missed 5–6×)
4. **Objective 2 — Fundamentals** (2a providers/versions 5×, 2d state 4×)
5. **Objective 6 — State** (6a, 6c, 6d)
6. **Objective 4 — Configuration** (many different topics, 1–4× each)
7. Objectives 1 and 3 — quickest wins
8. **Last hour: the cheat-sheet at the bottom** (also saved separately as `cheatsheet.md`)

Each topic has: **In one line** (memorise this), a plain-English explanation, the **Exam trap**, and where you **saw it** in your quizzes. Each objective ends with flashcards — cover the answer and test yourself.

> Tip: if you only have ~1 hour, read every "In one line" and "Exam trap", then do the flashcards.

---

## Table of contents
- Objective 1 — Infrastructure as Code (IaC) Concepts
- Objective 2 — Terraform Fundamentals (providers and state basics)
- Objective 3 — Core Terraform Workflow
- Objective 4 — Terraform Configuration
- Objective 5 — Modules (sources, inputs/outputs, versions, registry)
- Objective 6 — State management (backends, locking, state commands, drift)
- Objective 7 — Maintain infrastructure (import, state inspection, logging)
- Objective 8 — HCP Terraform
- Last-hour cheat-sheet

---

## Objective 1 — Infrastructure as Code (IaC) Concepts

Think of IaC like a recipe card. Instead of cooking by hand each time (clicking in a console), you write the recipe once. Anyone can follow it and get the same dish.

Topics are listed most-missed first.

### Advantages of IaC (Obj 1b) — missed 4×

**In one line:** IaC is code you can version, reuse, share and automate, and it never replaces application languages or removes API calls.

**Explanation:** Real IaC benefits that showed up as correct answers:
- Saved in version control (Git), so teams collaborate safely and can review changes.
- Human-readable language (HCL), so it is quick to write and easy to learn.
- Works across many cloud platforms (multi-cloud).
- Consistency and standardisation: the same code gives the same result.
- Repeatable and reusable code.
- Automates manual tasks.
- Rebuild infrastructure for disaster recovery (just run the code again).
- Self-service: other people can use shared code by filling in variables.
- API-driven workflows (no clicking in a console).
- Self-documenting: the code describes what exists.

Analogy: a recipe card that anyone in the kitchen can follow, photocopy and improve. It still needs the kitchen (the cloud APIs) to cook the food.

**Exam trap:** The wrong options sound nice but are false:
- "Imperative approach / run commands in order" (Terraform is declarative).
- "Replaces dev languages like Go and .NET" (IaC does not replace app code).
- "Ensures the security of applications" (IaC can help enforce good practice, but it does not guarantee app security).
- "Eliminates API communication to the target platform" (providers still call platform APIs).
- Quiz 5 Q24 asked for the INACCURATE statement. The learner picked a true benefit by mistake. Read "inaccurate / NOT / except" twice.

**Seen in quizzes:** Quiz 1 Q6, Quiz 2 Q25, Quiz 4 Q8, Quiz 5 Q24.

### What kind of language is Terraform? (Obj 1a) — missed 1×

**In one line:** Terraform is an immutable, declarative, provisioning IaC language written in HCL (or JSON), never YAML.

**Explanation:**
- Declarative means you describe the end result you want ("I want 3 servers"). You do not list the steps.
- Analogy: you tell a taxi the address (declarative). You do not tell the driver every turn (imperative).
- Immutable means that when something must change in a big way, you replace the thing instead of patching it by hand.
- Provisioning means it builds the infrastructure. It is not a "configuration management" tool like Ansible or Chef.

**Exam trap:** Wrong options say "mutable", "imperative", "configuration management language" or "HCL or YAML". The right pair is HCL or JSON.

**Seen in quizzes:** Quiz 1 Q54 (also the "imperative" trap in Quiz 1 Q6).

### One tool for many clouds (Obj 1c) — missed 1×

**In one line:** Terraform gives one workflow (init, plan, apply) for every platform, with modules as the consistent interface and a shared backend for state.

**Explanation:**
- A company moving from Azure-only to Azure + AWS + on-prem Kubernetes should not keep a different tool for each place.
- The right answers were:
  - Build cloud-specific modules with the same inputs and outputs, so teams reuse the same patterns.
  - Standardise the CI/CD pipeline on the same lifecycle and use a common remote backend for state and locking.
- Analogy: one universal remote control, with a different plug-in for each TV brand. The plug-ins are providers.

**Exam trap:**
- "Keep ARM, CloudFormation and kubectl YAML" defeats the single-workflow goal.
- "Terraform cannot manage on-prem or Kubernetes" is false, because providers exist for them.

**Seen in quizzes:** Quiz 4 Q12.

### Objective 1 — Self-check

- **Q:** Is Terraform declarative or imperative?
  **A:** Declarative. You describe the end state, not the steps.
- **Q:** Which file syntaxes can Terraform use: HCL, JSON, YAML?
  **A:** HCL, or JSON as an alternative. Never YAML.
- **Q:** True or false: IaC removes the need to talk to cloud APIs.
  **A:** False. Providers still call the platform APIs for you.
- **Q:** Name three real IaC advantages.
  **A:** Any three of: version control, consistency or repeatability, automation, disaster-recovery rebuilds, self-service, API-driven, human-readable, multi-cloud.
- **Q:** Does IaC replace languages like Go or .NET, or guarantee application security?
  **A:** No to both. These are classic wrong options.
- **Q:** How do you keep one workflow across Azure, AWS and on-prem Kubernetes?
  **A:** Use Terraform with modules that have a consistent interface, and standardise the pipeline and a common remote backend.

---

## Objective 2 — Terraform Fundamentals (providers and state basics)

### State basics: what it is, where it lives (Obj 2d) — missed 4×

**In one line:** State is always required. It is a JSON file (`terraform.tfstate` locally by default) that maps your code to real objects, holds only the current snapshot, may contain secrets, and should be remote for teams.

**Explanation:** Terraform needs a memory of what it built. State is that memory. It is like a guest list that links "table 5 in my plan" to "table 5 in the real hall".

Facts to memorise (from the "select four true" question):
- Default location: a file named `terraform.tfstate` in the current working directory.
- Format: JSON.
- May contain sensitive data you do not want others to see.
- Remote state is recommended when more than one person manages the infrastructure.
- It does NOT store a complete history of changes. It stores the current mapping only.
- Terraform does NOT encrypt state everywhere automatically.

More facts from missed questions:
- You can NOT run Terraform with no state at all. You only choose where it lives (local or remote).
- No state file on the very first apply is normal, not an error. Terraform creates everything in the config and writes a new state file. It never deletes things it does not know about.
- You can usually migrate state between supported backends at any time, even after the first apply. Change the backend config, run init, and accept the migration prompt. (Limits exist, for example HCP Terraform back to local may not be supported.)

```bash
terraform init -migrate-state   # move my state to the new backend
```

**Exam trap:**
- "Terraform can work without state in special cases" is False (Quiz 5 Q12).
- "Backend is locked in after first apply" is False (Quiz 4 Q20).
- "No state means apply errors" or "apply deletes all existing VMware infra" are wrong (Quiz 3 Q8).
- "State stores a complete history" is wrong (Quiz 5 Q36).

**Seen in quizzes:** Quiz 3 Q8, Quiz 4 Q20, Quiz 5 Q12, Quiz 5 Q36.

### Installing a new provider: declare it, then run init (Obj 2a) — missed 2× here (plus Quiz 4 Q26 under Obj 3)

**In one line:** To use a new provider, declare it in the configuration (provider block or `required_providers`), then run `terraform init` to download the plugin.

**Explanation:** Analogy: a new phone app. You choose it (declare), then you press download (init). Plan and apply will not download it for you.

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" { region = "us-west-2" }
```

**Exam trap:**
- "Adding it to `required_providers` installs it" is false. Only `init` installs.
- `terraform validate` checks syntax but does not fetch plugins.
- Provider settings do not go in `terraform.tfvars` or `-var`. Those are for variables.

**Seen in quizzes:** Quiz 1 Q13, Quiz 2 Q6. (Same rule: Quiz 4 Q26, see Objective 3.)

### Where providers are downloaded from (Obj 2a) — missed 2×

**In one line:** A short source like `hashicorp/kubernetes` (no hostname) means the public Terraform Registry. Providers never come from "source code" or a local directory lookup.

**Explanation:** The valid install sources (pick four) are:
- The public Terraform Registry.
- A non-HashiCorp external registry that needs extra credentials.
- The HCP Terraform private registry.
- A local filesystem or network mirror (set in the CLI config `provider_installation` block, handy for air-gapped sites).

Analogy: an app store (registry), a company app store (private registry), or a USB stick (mirror).

```hcl
required_providers {
  kubernetes = { source = "hashicorp/kubernetes", version = "2.38.0" }
}
```

**Exam trap:**
- "From the `hashicorp/kubernetes` directory where Terraform runs", "from a VCS repo" and "from the Kubernetes GitHub repo" are all wrong.
- "The provider's source code" is not an install source.
- The plugin cache is also not an install source (per the analysis).

**Seen in quizzes:** Quiz 4 Q30, Quiz 5 Q21.

### What providers are for (Obj 2a/2b) — missed 2×

**In one line:** A provider is a plugin that talks to a platform's API. Backends (not providers) store and lock state.

**Explanation:** Three benefits that were correct answers:
- Providers are plugins, so new services can ship without changing Terraform Core.
- They hide the platform API behind a consistent resource and data-source schema.
- They let one workflow manage many platforms by plugging in different providers.

Plugin check: of module, provider, backend and variable, only the provider is a plugin. A module is a bundle of config, a backend is a state-storage setting, and a variable is an input.

Analogy: Terraform Core is a power strip. Providers are the adapters for each country's plug.

**Exam trap:**
- "Providers manage storage, encryption and locking of state" is wrong. That is a backend job.
- "Backend" as the answer to "which is a plugin?" is wrong. The provider is the plugin.

**Seen in quizzes:** Quiz 4 Q21 (benefits), Quiz 2 Q35 (plugin).

### Providers inside modules (Obj 2c) — missed 1×

**In one line:** Do not put `provider` blocks inside reusable modules. Let them inherit from the caller, or pass them with `providers = { ... }`.

**Explanation:** True statements (pick three):
- Child modules automatically inherit the default provider configurations of their parent.
- The `providers` argument in a module block explicitly passes specific provider configurations.
- A module that contains its own provider blocks cannot be used with `for_each` (also not `count` or `depends_on`).

Analogy: a visiting chef (module) should use the host kitchen's tools (inherited providers), not bring a second kitchen.

```hcl
module "vpc" {
  source    = "./modules/vpc"
  providers = { aws = aws.west }
}
```

**Exam trap:**
- "Modules with provider blocks can still use `depends_on` if providers are passed explicitly" is false.
- "Children must always define their own provider blocks" is the opposite of best practice.

**Seen in quizzes:** Quiz 2 Q38.

### Objective 2 — Self-check

- **Q:** Where does Terraform keep state by default, and in what format?
  **A:** A file named `terraform.tfstate` in the current working directory, formatted as JSON.
- **Q:** True or false: Terraform can run without any state.
  **A:** False. State is always required. You only choose where it is stored.
- **Q:** You run `terraform apply` with config but no state file yet. What happens?
  **A:** Terraform creates the resources in the config and writes a new state file. It does not error and does not delete unknown resources.
- **Q:** What do you do before using a brand-new provider?
  **A:** Declare it in the configuration, then run `terraform init` to download it.
- **Q:** Where is `source = "hashicorp/kubernetes"` downloaded from?
  **A:** The public Terraform Registry (registry.terraform.io).
- **Q:** Which of module, provider, backend and variable is a plugin?
  **A:** The provider.

---

## Objective 3 — Core Terraform Workflow

### Run `terraform init` whenever providers, modules or the folder change (Obj 3b) — missed 3× (more with provider/module cousins)

**In one line:** `terraform init` is per working directory. Re-run it after adding a provider, changing a provider version, or adding a module. It also writes `.terraform.lock.hcl`.

**Explanation:** `init` is like unpacking your toolbox at the start of a job. Plan, apply and validate cannot fetch tools for you.

What `init` does:
- Downloads provider plugins into `.terraform/providers` and modules into `.terraform/modules` (extra context: it also sets up the backend).
- Creates or updates `.terraform.lock.hcl`, the dependency lock file. It records exact provider versions and hashes, and you should commit it to Git. It is NOT a concurrency lock, NOT a state snapshot, and it holds no credentials.
- The `.terraform/` folder holds no state and no credentials.

Which folder? Every folder with `.tf` files is its own working directory. If you have `/dev`, `/staging` and `/prod`, run init in each one. Init in the parent does not cover them.

```bash
terraform init            # first time, or after adding a provider/module
terraform init -upgrade   # pick the newest versions the constraints allow
```

**Exam trap:**
- "Run `plan` / `apply` / `validate` and it downloads the new provider" is false. They error with a missing plugin.
- "Init only in the root directory covers all environments" is false.
- "Copy `.terraform` between directories" is discouraged.
- `.terraform.lock.hcl` options that say "concurrency lock updated on every plan", "state snapshot" or "backend credentials" are all wrong.
- "Add the module to `required_providers`" is wrong. That block is for providers only.

**Seen in quizzes:** Quiz 1 Q43, Quiz 2 Q4, Quiz 4 Q26. Same "re-run init" rule under other objectives: Quiz 1 Q13 and Q38, Quiz 2 Q6, Quiz 4 Q46.

### Destroy and replace (Obj 3f) — missed 3×

**In one line:** `terraform destroy` equals `terraform apply -destroy`. To rebuild one resource use `terraform apply -replace=ADDRESS`. To delete a few resources, delete their code and apply.

**Explanation:**
- Tear down everything: `terraform destroy` and `terraform apply -destroy` do the same thing. `terraform plan -destroy` only previews and deletes nothing.
- Rebuild one resource on purpose (no code change): `-replace`. It replaces the old `taint` command (extra context). `-refresh-only` just syncs state and changes nothing real.
- Remove only some resources (for example a Cloud SQL instance and its backup policy out of 50): remove those resource blocks from the configuration, then run `terraform apply`. Terraform destroys only what is no longer declared. This is reviewable in Git.
- `-target` is an exception tool. It is risky and can skip dependencies, so it is not the routine answer.

```bash
terraform destroy
terraform apply -destroy
terraform apply -replace="aws_instance.web"
```

**Exam trap:**
- "`terraform apply -delete`" is not a real flag.
- "`terraform plan -destroy` tears everything down" is wrong. It only previews.
- For "remove just two resources", the file's answer is delete the blocks and apply, not `destroy -target`. The option about two `removed` blocks was marked wrong by the file. Follow the file for the exam.
- `terraform fmt` just formats files.
- A full destroy followed by re-apply is destructive and wrong.

**Seen in quizzes:** Quiz 1 Q51, Quiz 2 Q28, Quiz 4 Q44. (Reminder in Quiz 4 Q18: `-replace` is safer than `-target`.)

### Apply: what it does and how to apply exactly what you reviewed (Obj 3e) — missed 2×

**In one line:** `terraform apply` changes real infrastructure and then updates the state file. To run exactly what was reviewed, save the plan and apply the plan file.

**Explanation:**
- Apply creates, updates or deletes only the difference, then records the result in state. It does not format code (that is `fmt`). It does not download providers or modules (that is `init`). It does not recreate everything.
- Plain `terraform apply` builds a NEW plan. It does not reuse your last plan. Even `-auto-approve` only skips the question, and it still makes a fresh plan.
- Analogy: you approve a quote (the saved plan file), and the builder must do exactly that quote. Re-planning is asking for a new quote.
- Terraform never rolls back a failed apply. Resources that succeeded stay in state. Fix the cause and re-run apply. (Extra context from the quick-reminder sections of other quizzes: a failed provisioner leaves that resource tainted.)

```bash
terraform plan -out=bk-project.tfplan
terraform apply bk-project.tfplan
```

**Exam trap:**
- "Run `plan` again, then `apply`" can give a different plan from the one reviewed.
- "`apply -auto-approve`" is not the same as applying the saved plan.
- "Apply formats configuration" or "apply recreates all infrastructure" are false.
- "Apply downloads providers" is false.

**Seen in quizzes:** Quiz 1 Q45, Quiz 3 Q24. (Related reminders: Quiz 3 Q47, Quiz 4 Q42.)

### The three core workflow steps (Obj 3a) — missed 1×

**In one line:** The core workflow is Write, Plan, Apply.

**Explanation:** Write the code, plan (preview the changes), apply (make them). Like drafting a letter, proofreading it, then sending it.

**Exam trap:** Destroy, Import and Validate are real commands, but they are NOT among the three core steps. The learner picked Destroy and missed Write.

**Seen in quizzes:** Quiz 2 Q21.

### Fast checking: fmt vs validate vs plan (Obj 3c) — missed 1×

**In one line:** `fmt` fixes how code looks, `validate` checks that the code is correct, `plan` shows what would change.

**Explanation:** The fastest way to catch syntax errors after splitting files is `terraform validate`. It checks syntax and internal consistency without contacting providers or state. Analogy: `fmt` is tidying your handwriting, `validate` is spell-check, `plan` is asking what the plan will change.

Extra context from quick reminders: run `terraform init` before `validate`, because it needs providers and modules installed. `terraform fmt -check` is the usual CI formatting check. It fails if files are not formatted.

```bash
terraform fmt -recursive   # style only
terraform validate         # syntax / consistency
```

**Exam trap:**
- `fmt` only reformats.
- `init` downloads things.
- `plan` is slower and talks to providers and state.

**Seen in quizzes:** Quiz 2 Q32.

### How Terraform picks the order of creation (Obj 3d) — missed 1×

**In one line:** Terraform builds a dependency graph automatically from references between resources. `depends_on` is only for hidden dependencies.

**Explanation:** If a subnet uses the VNet's ID, Terraform knows the VNet comes first. This is an implicit dependency. Analogy: you cannot hang a picture before the wall exists, and Terraform sees which one points at which.

Also from the quick reminders: in plan output, `~` means update in place and `-/+` means destroy and recreate. (The same idea, in a True/False form, was missed in Quiz 2 Q26 under another objective.)

```hcl
resource "azurerm_subnet" "s" {
  virtual_network_name = azurerm_virtual_network.v.name   # implicit dependency
}
```

**Exam trap:**
- "You must use `depends_on` for all resources" is false.
- "Order is alphabetical" or "order is the file order" are false.

**Seen in quizzes:** Quiz 5 Q53.

### Objective 3 — Self-check

- **Q:** You add a new provider block to a working project. What is the next command?
  **A:** `terraform init`.
- **Q:** You have `/dev`, `/staging` and `/prod` folders with separate configs. Where do you run init?
  **A:** In each folder, because each is its own working directory.
- **Q:** What is `.terraform.lock.hcl` and when does it change?
  **A:** A dependency lock file that pins provider versions. `terraform init` creates and updates it, and you commit it to Git.
- **Q:** How do you apply exactly the plan that was reviewed two hours ago?
  **A:** Save it with `terraform plan -out=file`, then run `terraform apply file`.
- **Q:** Name two commands that tear down everything, and one that only previews.
  **A:** `terraform destroy` and `terraform apply -destroy`. `terraform plan -destroy` only previews.
- **Q:** How do you force one resource to be destroyed and recreated with no code change?
  **A:** `terraform apply -replace=<address>`.
- **Q:** What is the fastest check for syntax errors, and what are the core workflow steps?
  **A:** `terraform validate`. The core workflow is Write, Plan, Apply.

---

## Objective 4 — Terraform Configuration

This is the "how do I write the code" part of the exam. Your five practice quizzes show the same traps again and again. The topics below are sorted with the most-missed first.

Quick map of what was missed (from your quiz analyses):

| Topic | Times missed |
|---|---|
| 4g Custom conditions (validation / precondition / postcondition / check) | 4 |
| 4a `resource` vs `data` | 3 |
| 4e Expressions and functions | 3 |
| 4b Referencing other resources | 3 |
| 4d Types, `count`, `for_each` | 4 (across 3 topics below) |
| 4h Sensitive data | 2 (plus 5 "got it right but be careful" reminders) |
| 4c Variables and outputs | 2 |
| 4f Dependencies | 1 (plus reminders) |

---

### 4g — validation vs precondition vs postcondition vs check (missed 4x, the biggest one)

**In one line:** `validation` checks a variable's input, `precondition` checks BEFORE a resource is built, `postcondition` checks AFTER (use `self`), and `check` only WARNS and never stops the run.

**Plain English.** Think of a restaurant kitchen.
- `validation` = the waiter checks your order is sensible ("you ordered 15 steaks, max is 10") before it goes to the kitchen.
- `precondition` = the chef checks the ingredients on the counter before cooking.
- `postcondition` = the chef tastes the dish after cooking. The dish already exists by then.
- `check` block = a health-inspector note on the wall. It warns, but the kitchen keeps cooking.

**Where each one lives:**

| Mechanism | Lives inside | Runs when | If it fails |
|---|---|---|---|
| `validation` | a `variable` block | As soon as the value is known, early in plan, before any resource is touched | Run stops with your error |
| `precondition` | `lifecycle` of a resource / data block | Before that resource is created or changed | Run stops, nothing is created |
| `postcondition` | `lifecycle` of a resource / data block | After the resource is created or read; can use `self` | Run stops (but the thing may already exist) |
| `check` + `assert` | its own `check` block | During plan/apply | Only a WARNING, run continues |

**Exam trap:**
- "Variable validation fires during `apply`" is WRONG. It fires early (plan / validate stage), before any resource is created. (Quiz 1 Q24; the answer there was "during terraform validate or terraform plan, before attempting to create any resources". Quiz 5 Q6 words it as "evaluated early during terraform plan".)
- To prove a data source really returned something, a `precondition` on the input (`var.rg_name != ""`) is the wrong tool. It only checks the input string. Use a `postcondition` with `self.id != ""`.
- `validation {}` only exists inside `variable` blocks. It is not valid inside a data or resource block.
- To "fail before creating the VM", use variable `validation` OR a resource `precondition`. A `check` block is wrong (only warns). A `postcondition` is wrong (too late).
- `precondition` and `postcondition` HALT the run. `check` does not. This was a wording trap in Quiz 5 Q6.

```hcl
variable "memory" {
  type = number
  validation {
    condition     = var.memory >= 4096
    error_message = "Memory must be at least 4096 MB."
  }
}

resource "vsphere_virtual_machine" "vm" {
  lifecycle {
    precondition {                      # BEFORE creation, checks inputs
      condition     = var.memory >= 4096
      error_message = "Memory must be at least 4096 MB."
    }
  }
}

data "azurerm_resource_group" "main" {
  name = var.rg_name
  lifecycle {
    postcondition {                     # AFTER reading, checks the result
      condition     = self.id != ""
      error_message = "Resource group not found."
    }
  }
}
```

**Also remember (got it right, but these are easy to flip):**
- Check a resource attribute after creation: `postcondition` in `lifecycle` (Quiz 2 Q55).
- `check` blocks only warn and the run continues. `precondition` / `postcondition` halt with an error (Quiz 4 Q1).
- Variable `validation` blocks fail at plan time (Quiz 2 Q15).
- (extra context) `terraform test` with `.tftest.hcl` files and `run` / `assert` blocks is a different thing. It is for testing modules. `terraform validate` only checks syntax and runs no assertions (Quiz 5 Q11, tagged 5c).

**Seen in quizzes:** Quiz 1 Q24, Quiz 3 Q14, Quiz 5 Q3, Quiz 5 Q6.

---

### 4a — resource blocks vs data blocks (missed 3x)

**In one line:** `resource` = create and manage something. `data` = only READ something that already exists. You point at data with `data.TYPE.NAME.ATTRIBUTE`.

**Plain English.** A `resource` is like building a house. A `data` block is like looking up a house address in the phone book. You did not build it. You cannot change it. You just read facts about it.

**Which block does what:**

| Block | Job |
|---|---|
| `resource` | Creates, updates, destroys things |
| `data` | Read-only lookup of existing things |
| `locals` | Stores a computed value for reuse |
| `provider` | Configures the plugin (region, credentials) |
| `module` | Packages reusable config (not a lookup) |

**Exam trap:**
- "Which snippet reads info about existing resources?" The answer is the `data` block. Do not pick `module` (Quiz 1 Q10).
- A `data` block NEVER creates or modifies anything. If a data source reads an existing network and a new subnet resource uses `data.google_compute_network.shared.id`, apply creates only the subnet. It does not create or change the network (Quiz 5 Q54).
- Reference syntax traps (Quiz 3 Q21):
  - Right: `data.aws_vpc.prod.id`
  - Wrong: `data.aws_vpc` (no name or attribute)
  - Wrong: `aws_vpc.cidr_blocks.data` (reversed, no `data.` prefix)
  - Wrong: `"data.aws_ami.al2.id"` in quotes. Quotes turn it into plain text, not a reference.
  - `cidr_blocks` wants a LIST, so wrap a single string: `[data.aws_vpc.prod.cidr_block]`.
- No `data.` prefix means you are pointing at a managed `resource` instead.

```hcl
data "aws_vpc" "prod" { default = true }

resource "aws_security_group" "ssh" {
  vpc_id = data.aws_vpc.prod.id
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.prod.cidr_block]   # list, so wrap in [ ]
  }
}
```

**Seen in quizzes:** Quiz 1 Q10, Quiz 3 Q21, Quiz 5 Q54.

---

### 4e — expressions and functions (missed 3x)

**In one line:** To calculate, combine or reshape a value, use expressions and built-in functions. `merge` = maps, `concat` = lists, `join` = list into a string.

**Plain English.** Variables and outputs only carry values, like pipes. Expressions and functions are the machines that change the value on the way through. Functions are like kitchen tools: pick the right one for the job.

**Pick the right function:**

| Function | Takes | Gives | Example |
|---|---|---|---|
| `merge` | maps | one map (later map wins on duplicate keys) | `merge(var.common_tags, local.resource_tags)` |
| `concat` | lists | one list | `concat(["a"], ["b"])` gives `["a","b"]` |
| `join` | separator + list of strings | one string | `join("-", ["prod","us","web"])` gives `"prod-us-web"` |
| `flatten` | nested lists | one flat list | `flatten([["a"],["b"]])` |
| `format` | format string + values | a string | `format("%s-%s", a, b)` (the `%s-` hyphen matters) |
| `toset` / `tolist` / `tomap` | a value | converted type | `toset(var.names)` |
| `lookup` | map + key | one value | `lookup(var.image, "us-east-1")` |

**Exam trap:**
- Combine two tag maps: `merge(...)`. `concat` is for lists, `flatten` is for nested lists, `join` makes a string (Quiz 2 Q52).
- Build `prod-us-east-web` from three string vars: `join("-", [var.environment, var.region, var.app])`. `merge` is wrong (maps). `concat` is wrong (lists). A `format("%s+%s+%s", ...)` option was wrong because it used `+` not `-` (Quiz 3 Q19).
- "Which feature transforms, combines and derives values?" The answer is "expressions with built-in functions", not "variables and outputs" (Quiz 4 Q47).
- Map keys with a hyphen need brackets: `var.metadata["build-tag"]`. The dot form `var.metadata.build-tag` reads as `build minus tag` (Quiz 2 Q16).

```hcl
tags = merge(var.common_tags, local.resource_tags)
name = join("-", [var.environment, var.region, var.app])
name = join("-", [var.env, "web", format("%02d", count.index)])
```

**Seen in quizzes:** Quiz 2 Q52, Quiz 3 Q19, Quiz 4 Q47.

---

### 4b — referencing other resources (missed 3x)

**In one line:** To use one resource's value in another, reference it directly as `TYPE.NAME.ATTRIBUTE`. Do not use a data source for something you already manage in the same config.

**Plain English.** If your team built the subnet, just point at your own subnet. Do not look it up in the phone book (data source) like a stranger's house. A direct reference also tells Terraform "build the subnet first" for free (an implicit dependency).

**Reference forms:**

| What you point at | How you write it |
|---|---|
| Resource attribute | `aws_subnet.main.id` |
| Resource made with `count` | `aws_instance.web[0].id` |
| Resource made with `for_each` | `aws_instance.svc_apps["frontend"].id` |
| Data source | `data.aws_vpc.prod.id` |
| Variable | `var.region` |

**Exam trap:**
- Three GCP instances must share a subnet created in the same config. Reference the subnet's attribute in each instance (for example `google_compute_subnetwork.main.self_link`). Do not use a data source per instance, do not hard-code the ID, and do not make three subnets (Quiz 4 Q41).
- Pass an Azure SQL connection string to a web app? Reference the DB resource's attribute directly (`azurerm_mssql_database.main.connection_string`). A data source is overkill. Copy/pasting from `terraform output` is error-prone and gives no dependency (Quiz 3 Q56).
- Even auto-generated (computed) attributes can be referenced. You do not need to know the value in advance.
- The `for_each` reference trap is covered in the `count` vs `for_each` topic below.

```hcl
resource "google_compute_instance" "vm" {
  # ...
  network_interface {
    subnetwork = google_compute_subnetwork.main.self_link   # direct reference
  }
}
```

**Seen in quizzes:** Quiz 3 Q36, Quiz 3 Q56, Quiz 4 Q41.

---

### 4d — count vs for_each, and how to reference instances (missed 2x)

**In one line:** `for_each` only accepts a MAP or a SET (never a plain list, so use `toset()`). `count` instances use `[0]` numbers. `for_each` instances use `["key"]` strings.

**Plain English.** `count` is like numbering chairs 0, 1, 2. `for_each` is like putting name tags on chairs. Name tags (keys) are safer, because removing one chair does not re-number all the others (extra context).

| | `count` | `for_each` |
|---|---|---|
| Input | a whole number | a map or a set of strings (not a list) |
| Instance address | `aws_instance.web[0]` | `aws_instance.web["frontend"]` |
| Current item | `count.index` | `each.key` / `each.value` |
| For a set of strings | n/a | `each.key` equals `each.value` |

**Exam trap:**
- You have `list(string)` and want one resource per entry. Use `for_each = toset(var.namespaces)` and `name = each.value`. Passing the list directly fails (Quiz 3 Q2).
- `tomap(var.namespaces)` fails: it needs key/value pairs, not a bare list.
- A `for i, n in var.namespaces : i => n` makes the key the number (0, 1, 2), not the name.
- Referencing the `frontend` instance made by `for_each`: `aws_instance.svc_apps["frontend"]`. Wrong: `aws_instance.svc_apps.frontend` (dot form), `aws_instance["svc_apps"]["frontend"]` (type and name mixed up), and `[2]` (count-style number) (Quiz 3 Q36).
- Reminder: a `for_each` instance is addressed by key, for example `aws_subnet.app["private"].id` (Quiz 5, got right).
- (extra context) A `dynamic` block creates repeated NESTED blocks inside one resource (like many `ingress` blocks). It is not a way to read values from another workspace. One quiz trap offered it that way and it was wrong (Quiz 3 Q35).

```hcl
resource "kubernetes_namespace" "ns" {
  for_each = toset(var.namespaces)   # list -> set
  metadata { name = each.value }
}

# reference one instance
aws_instance.svc_apps["frontend"]    # for_each (string key)
aws_instance.web[0]                  # count (number)
```

**Seen in quizzes:** Quiz 3 Q2, Quiz 3 Q36.

---

### 4d — types: list, set, map, object (missed 3x)

**In one line:** Lists use `[ ]` and are ordered by position. Sets are unique values with no keys. Maps are `{ }` with ANY keys and ONE value type. Objects are `{ }` with FIXED named fields that can mix types.

**Plain English.**
- list = a numbered shopping list.
- set = a bag of unique marbles (no order, no duplicates).
- map = a phone book (any names, but every entry is the same kind of thing, like a phone number).
- object = a form with fixed boxes ("Name", "Age", "Is member") where each box has its own type.

| Type | Brackets | Keys | Value types | Use it for |
|---|---|---|---|---|
| `list(string)` | `[ ]` | index 0,1,2 | all one type | ordered items |
| `set(string)` | `[ ]` (via `toset`) | none | all one type, unique | `for_each` input |
| `map(string)` | `{ }` | any keys | all one type | lookup table, e.g. region to AMI |
| `object({...})` | `{ }` | fixed names you list | each field can differ | one structured record |

**Exam trap:**
- Region-to-image lookup table (arbitrary region keys): `map(string)`. An `object({ region = string, image_id = string })` is wrong because it fixes only two field names, not arbitrary region keys. Use `var.image[var.region]` (Quiz 1 Q57).
- Do not flip them: object = fixed keys, mixed types. Map = any keys, one type (Quiz 3 Q29, where you picked it backwards).
- A default must match the declared type. `type = list(string)` with `default = {}` gives a type error, because `{}` is a map/object and a list needs `[]` (Quiz 1 Q18).
- Reminder: `map(string)` values must all be strings (`"true"`, not `true`) (Quiz 2 Q24).

```hcl
variable "image" {
  type    = map(string)
  default = { "us-east-1" = "ami-111", "us-west-2" = "ami-222" }
}
ami = var.image[var.region]

variable "names" { type = list(string)  default = [] }   # [] for lists, {} for maps

type = object({ instance_type = string, count = number })   # fixed shape, mixed types
```

**Seen in quizzes:** Quiz 1 Q18, Quiz 1 Q57, Quiz 3 Q29.

---

### 4h — sensitive data (missed 2x, plus several reminders)

**In one line:** `sensitive = true` only HIDES a value on screen. The value is still saved in plain text in the state file. To truly keep a secret out of state, use `ephemeral` resources with write-only arguments.

**Plain English.** `sensitive = true` is like a black marker over a word in a printed report. The original document (state) still has the word under the marker. Anyone who can open the state file can read it.

**What does and does not keep secrets out of state:**

| Approach | Secret still in state? |
|---|---|
| `sensitive = true` on variable or output | YES (only hidden in CLI output; also visible via `terraform show -json`) |
| Reading a secret with a standard Vault data source | YES |
| Values from `tfvars` or declared variables | YES, if used in a stored attribute |
| `random_password` | YES |
| `ephemeral` resource + write-only argument (e.g. `password_wo`) | NO |

**Best practices (state can hold secrets, so protect the state itself):**
- Local state is stored in plain text by default.
- Restrict access to state and audit changes.
- HCP Terraform encrypts state at rest and in transit, and gives RBAC.
- A properly configured remote backend gives encryption and access controls.

**Exam trap:**
- "Vault means secrets never appear in state." Wrong for a standard Vault data source (Quiz 2 Q2).
- "`sensitive = true` keeps the value out of state." Wrong. It only redacts display (Quiz 2 Q2).
- "Which method ensures sensitive info is NOT stored in state?" The answer was "none of the above". Tfvars, variables, and a normal Vault data source all still end up in state (Quiz 3 Q48).
- Multi-select tip: in Quiz 2 Q2 you missed two correct options ("local state is plain text" and "restrict and audit access"). Tick every true best-practice statement.

```hcl
output "db_pw" {
  value     = aws_db_instance.db.password
  sensitive = true     # hidden in CLI only, STILL in terraform.tfstate
}

ephemeral "vault_kv_secret_v2" "db" { /* ... */ }   # never stored in state
```

**Seen in quizzes:** Quiz 2 Q2, Quiz 3 Q48. Reminders (answered right): Quiz 1 Q22, Quiz 2 Q37, Quiz 3 Q28, Quiz 3 Q49, Quiz 4 Q36, Quiz 5 Q41.

---

### 4c — input variables and TF_VAR_

**In one line:** Set a variable from the environment with `TF_VAR_<name>`. The variable name follows the prefix directly, and a variable's default must match its declared type.

**Plain English.** Input variables are the knobs on your config. You can turn a knob in a file, on the command line, or from your shell environment. For the shell, Terraform only looks for variables that start with `TF_VAR_`.

**Exam trap:**
- Prefix to use: `TF_VAR_`. `TF_ENV_`, `TF_ENV_VAR_name` and `TF_VAR_VALUE` are not recognised (Quiz 1 Q46). Reminder: `TF_VAR_<name>` also showed up in Quiz 5 (got right).
- The type-error question is really a type-matching question (see the types topic above). `default = {}` on a `list(string)` is the error (Quiz 1 Q18).
- Output `sensitive = true` only hides the CLI display. The value is still plain text in state (Quiz 3 Q49).

```bash
export TF_VAR_instructor_name="bryan"      # sets var.instructor_name
```

**Variable precedence, lowest to highest** (extra context, not from your missed questions):

| Order | Source |
|---|---|
| 1 (weakest) | `default` in the variable block |
| 2 | Environment variable `TF_VAR_name` |
| 3 | `terraform.tfvars` / `terraform.tfvars.json` |
| 4 | `*.auto.tfvars` files |
| 5 (strongest) | `-var` and `-var-file` on the command line (last one wins) |

**Seen in quizzes:** Quiz 1 Q46, Quiz 1 Q18.

---

### 4f — dependencies: implicit vs depends_on (missed 1x, plus reminders)

**In one line:** Terraform works out the order itself from references (implicit dependency). `depends_on` is the exception, for hidden dependencies that have no reference.

**Plain English.** If the subnet's code mentions the VNet's ID, Terraform knows "VNet first". You do not have to tell it. `depends_on` is you whispering "wait for X" when the code gives no clue.

| | Implicit dependency | Explicit `depends_on` |
|---|---|---|
| How it is created | By referencing another resource's attribute (`aws_vpc.main.id`) | You list it: `depends_on = [aws_iam_role.x]` |
| When to use | Almost always | Only when no reference shows the relationship |
| Needed on every resource? | No, automatic | No |

**Exam trap:**
- "Terraform manages dependencies only if `depends_on` is set." FALSE (Quiz 2 Q26).
- "You must manually use `depends_on` for all resources" is wrong. Terraform builds the dependency graph from references (Quiz 5 Q53, tagged 3d).
- The order is NOT alphabetical and NOT the order of files.
- Referencing `resource.name.attr` creates the dependency (reminder from Quiz 1: Q16, Q23, Q55).

```hcl
resource "azurerm_subnet" "s" {
  virtual_network_name = azurerm_virtual_network.v.name   # implicit dependency
}
resource "aws_instance" "app" {
  depends_on = [aws_iam_role_policy.p]   # explicit: only if nothing references it
}
```

**Seen in quizzes:** Quiz 2 Q26. Related: Quiz 5 Q53, Quiz 1 Q16/Q23/Q55 (reminders).

---

### 4 — lifecycle arguments (small topic, reminders only)

**In one line:** The `lifecycle` block changes how Terraform treats one resource. It also holds `precondition` and `postcondition`.

**Plain English.** It is the "special instructions" sticker on a resource.

| Setting | What it does |
|---|---|
| `ignore_changes = [tags]` | Ignore later changes to `tags` (Quiz 3 Q32, got right). `tags["key"]` ignores only that one key. |
| `precondition` | Check before the resource is built (see 4g) |
| `postcondition` | Check after it is built (see 4g) |
| `prevent_destroy = true` (extra context) | Makes a destroy fail for that resource |
| `create_before_destroy` (extra context) | Build the replacement first, then delete the old one |

**Exam trap:** `lifecycle` controls resource behaviour. It is not for moving resources between stacks or for pinning module versions (Quiz 4 Q5 and Quiz 5 Q31 used it as a wrong option).

```hcl
resource "aws_instance" "web" {
  lifecycle {
    ignore_changes = [tags]
  }
}
```

**Seen in quizzes:** Quiz 3 Q32 (reminder only, answered right).

---

### Objective 4 — Self-check

Cover the answers and test yourself.

**1. Variable `validation` blocks limit `instance_count` to 1-10 and you pass 15. When does the error show?**
Early, during `terraform validate` or `terraform plan`, before any resource is created. Not at apply. (Quiz 1 Q24)

**2. You want to check that a data source really returned a resource group. Which block?**
A `postcondition` in the data block's `lifecycle`, with `condition = self.id != ""`. A `precondition` only checks inputs, and `validation` only works in variables. (Quiz 3 Q14)

**3. Which condition blocks stop the run, and which only warn?**
`validation`, `precondition` and `postcondition` halt with an error. A `check` block only warns. (Quiz 5 Q3, Q6; Quiz 4 Q1)

**4. Which block reads an existing resource without managing it?**
A `data` block. A `resource` block creates and manages. (Quiz 1 Q10)

**5. How do you create one resource per item of a `list(string)` variable?**
`for_each = toset(var.names)` and use `each.value`. `for_each` cannot take a plain list. (Quiz 3 Q2)

**6. Reference the `frontend` instance of `aws_instance.svc_apps` made with `for_each`.**
`aws_instance.svc_apps["frontend"]`. `count` uses numbers `[0]`, `for_each` uses string keys. (Quiz 3 Q36)

**7. Map vs object: what is the key difference?**
Map = any keys, all values one type. Object = fixed named attributes, each can have a different type. A region-to-AMI lookup table is a `map(string)`. (Quiz 3 Q29, Quiz 1 Q57)

**8. Which function combines two tag maps? Which builds `a-b-c` from three strings?**
`merge(map1, map2)` for maps. `join("-", [a, b, c])` for strings. `concat` is for lists. (Quiz 2 Q52, Quiz 3 Q19)

**9. Does `sensitive = true` keep a secret out of the state file? What does?**
No. It only hides the value in CLI output, and the plain value stays in state. A standard Vault data source also still writes it to state. Only ephemeral resources with write-only arguments keep secrets out of state. (Quiz 2 Q2, Quiz 3 Q48)

**10. True or false: Terraform handles dependencies only when you write `depends_on`.**
False. References create implicit dependencies automatically. `depends_on` is only for hidden dependencies. (Quiz 2 Q26)

---

## Objective 5 — Modules (sources, inputs/outputs, versions, registry)

**Big picture:** A module is a folder of `.tf` files that you call from another folder. Think of it as a **sealed box (like a coffee machine)**. You put things in through the buttons (inputs = variables). You get things out through the spout (outputs). You cannot reach inside the box. This one picture answers most Objective 5 questions.

Most-missed codes here: **5b (7 misses)**, **5a (5 misses)**, **5c (3 misses)**, **5d (2 misses)**.

### 5b — Variables are sealed inside each module (missed 7x)

**In one line:** A child module only sees what you pass it in the `module` block. It never inherits anything from the parent.

- The **root module** is the folder where you run `terraform`. The **child module** is the folder you call.
- Arguments inside a `module { }` block (like `name`, `cidr`, `env`) are the child's **input variables**.
- The child must declare each input with a `variable` block. The parent supplies the value.
- No automatic inheritance. Root `terraform.tfvars`, root `locals`, and root variables are invisible to the child.
- There is no `parent.var.x` syntax.
- A variable declared inside the child cannot be used outside it. Data leaves the child only through `output`.

Analogy: a coffee machine has buttons. You cannot tell it "use whatever beans are in my kitchen". You must put beans in the hopper.

```hcl
# modules/web/variables.tf   (child declares the input)
variable "env" { type = string }

# root main.tf               (parent passes the value)
module "web" {
  source = "./modules/web"
  env    = var.env
}
```

**Exam trap:**
- "The child automatically inherits root variables / the root default." Wrong.
- "Use `parent.var.env`." No such syntax.
- "Use a root `local` or a `terraform workspace`." Neither passes values into a module.
- "Declare the variable in the root only." Wrong, the child needs its own `variable` block.
- The `name`/`cidr`/`azs` lines inside a `module` block are NOT variable declarations and NOT outputs. They are inputs passed into the child.
- If a child uses `var.environment` without declaring it, you get a hard error ("not declared"). It is not a prompt and not an inherited default.
- Error "Reference to undeclared input variable" for a variable that lives inside the `app` module means: variables are private to their module. It is not a "missing output" problem. `var.module.app.x` is not valid syntax.

**Seen in quizzes:** Quiz 1 Q29 (what are name/cidr/azs); Quiz 2 Q3 (pass `env` to child); Quiz 2 Q23 (what can the child access); Quiz 3 Q42 (child uses undeclared `var.environment`); Quiz 4 Q56 (undeclared input variable error). Also Quiz 1 Q21 (see next topic).

### 5b/5c — Getting values OUT of a module: the `output` block (missed 4x)

**In one line:** The child exports with an `output` block. The parent reads it as `module.<NAME>.<OUTPUT_NAME>`.

- A parent can read ONLY a child's outputs. It cannot read the child's internal resources or variables.
- "vpc_id is not a valid attribute for module.network" means the child never defined `output "vpc_id"`.
- You need BOTH halves: the output in the child, and the reference in the root.
- Outputs flow child to parent only. Never parent to child.

Analogy: the spout on the coffee machine. No spout, no coffee.

```hcl
# modules/web/outputs.tf  (child)
output "public_dns" {
  value = aws_lb.web.dns_name
}

# root outputs.tf  (parent)
output "website_url" {
  value = "https://${module.web.public_dns}:8080/index.html"
}
```

**Exam trap:**
- "Declare `vpc_id` as a variable in the root." Wrong, that does not expose child values.
- "Use a `data` block." Wrong. A `data` block looks up outside things. It does not export from a child (Quiz 5 Q51).
- `terraform` block and `resource` block are also wrong answers for "which block exports a value".
- `module.web.outputs.public_dns` is wrong. There is no `outputs` word in the path.
- An `output` nested inside the `module` block is invalid.
- A bare `${public_dns}` is out of scope.

**Seen in quizzes:** Quiz 1 Q21 (5b); Quiz 4 Q53 (5c, pick both snippets); Quiz 5 Q51 (5c, which block in the child).

### 5a — New module means run `terraform init` (missed 2x as a rule, plus the source questions)

**In one line:** Adding a new `module` block (or provider) means you must run `terraform init`. Only `init` downloads modules.

- `init` installs modules into `.terraform/modules`.
- `plan`, `apply`, and `validate` do NOT fetch modules. They fail until you run `init`.
- `terraform get` also installs modules, but `init` is the answer to pick.
- `required_providers` is for providers, not modules.
- You never copy files into `.terraform/modules` by hand.

```bash
terraform init      # after adding any new module or provider
```

**Exam trap:** "Add the module to `required_providers`." "Run `terraform validate`." "Run `plan`." "Copy it manually into `.terraform/modules/downloads`." All wrong. The answer is `terraform init`.

**Seen in quizzes:** Quiz 1 Q38; Quiz 4 Q46. (The same rule for providers: Quiz 1 Q13 and Quiz 4 Q26, objectives 2a/3b.)

### 5a — Reading the `source` string (missed 3x)

**In one line:** Look at the shape of `source` to know where the module lives.

| `source` looks like | Where it lives |
|---|---|
| `./modules/web` or `../shared/vpc` | Local folder on disk. No download from a registry. |
| `terraform-aws-modules/vpc/aws` (3 parts, no hostname) | Public Terraform Registry (`NAMESPACE/NAME/PROVIDER`) |
| `app.terraform.io/my-org/vpc/aws` (hostname first) | HCP Terraform private registry |
| `git::https://...` or other URL | Git repo or URL (not the registry) |

- In `source = "./modules/btk-cluster"`, `btk-cluster` is a LOCAL child module on disk.
- The file containing the `module` block is the **calling (root) module**.
- `servers = 5` inside the module block is an INPUT. The child needs `variable "servers"`, not an `output`.

Analogy: a `./` path is the box on your own shelf. A 3-part name is a box from the public shop. A hostname-first name is a box from your company's private shop.

**Exam trap:**
- "Private registry" for a plain 3-part source. A private registry needs the hostname prefix.
- "Local repo on your network" would use a git/URL source.
- "Download from the public registry" for a `./` source. Wrong.
- "`servers` must be an output in the child." Wrong, it is an input.

**Seen in quizzes:** Quiz 1 Q50 (where is `terraform-aws-modules/transit-gateway/aws` stored); Quiz 2 Q51 (read a module block, pick two). The same shape rule for providers: Quiz 5 Q21 (`hashicorp/kubernetes` comes from the public registry; there is no local directory lookup).

### 5d — Module versions: `version` and `~>` (missed 3x including the `version` argument)

**In one line:** Pin a registry module with `version = "..."`. Use `~>` so only the right-most digit can grow. Terraform picks the NEWEST allowed version, not the lowest.

- `version` works ONLY for registry modules (not local paths).
- It is optional. If omitted, you get the latest version at `init` time. Always pin it to avoid surprise changes.
- It pins the module only, not the Terraform CLI and not providers.
- Use `version` only once per module. Combine rules in ONE string: `version = ">= 1.0.0, < 2.0.0"`.

`~>` cheat sheet:

| Constraint | Allowed range |
|---|---|
| `~> 3.2.0` | >= 3.2.0 and < 3.3.0 (only patch grows) |
| `~> 3.2` | >= 3.2 and < 4.0 (minor can grow) |

- With `~> 3.2.0` and versions 3.2.0, 3.2.5, 3.3.0, 4.0.0 available, you get **3.2.5**.
- To move from 5.2.0 to 5.3.0: (1) change the constraint to allow it (e.g. `~> 5.3.0`), then (2) run `terraform init -upgrade`. `~> 5.2.0` would block 5.3.0.
- Do not delete the lock file. That file is for providers, and deleting it is unneeded risk.

```hcl
module "compute" {
  source  = "azure/compute/azurerm"
  version = "~> 5.3.0"
}
```
```bash
terraform init -upgrade
```

**Exam trap:**
- Picking the lowest version (3.2.0). Terraform takes the newest match.
- Thinking `~> 3.2.0` allows 3.3.0. It does not.
- Using `depends_on`, `for_each`, or `lifecycle` to "protect from registry updates". Only `version` does that (Quiz 5 Q31).

**Seen in quizzes:** Quiz 2 Q57 (upgrade 5.2.0 to 5.3.0); Quiz 3 Q26 (`~> 3.2.0` gives 3.2.5); Quiz 5 Q31 (which argument pins a registry module). Reminder from correct answers: Quiz 4 Q57 (one `version` per module).

### 5c — Testing modules with `terraform test` (missed 1x)

**In one line:** Write `.tftest.hcl` files with `run` and `assert` blocks, then run `terraform test`. `terraform validate` only checks syntax.

- `terraform test` runs the `run` blocks (plan or apply in an isolated context) and reports pass or fail on each `assert`.
- It does not touch your real infrastructure.
- `validate` checks syntax and internal consistency only. It never runs assertions.

```hcl
# tests/main.tftest.hcl
run "memory_ok" {
  command = plan
  assert {
    condition     = var.memory >= 4096
    error_message = "too small"
  }
}
```
```bash
terraform test
```

**Exam trap:** "Use `terraform validate` / `apply` / `plan` to run assertions." None of them run test files. You need BOTH steps: the `.tftest.hcl` files AND the `terraform test` command.

**Seen in quizzes:** Quiz 5 Q11.

### Objective 5 — Quick commands table

| Command | What it does |
|---|---|
| `terraform init` | Downloads providers AND modules (into `.terraform/`) and sets up the backend |
| `terraform init -upgrade` | Re-picks the newest version allowed by your constraints |
| `terraform get` | Downloads/updates modules only |
| `terraform test` | Runs `.tftest.hcl` tests |
| `terraform validate` | Syntax/consistency check only (needs `init` first) |

### Objective 5 — Self-check

1. **Q:** Your root has `terraform.tfvars` with variables. A child module is called with only `source`. What can the child use?
   **A:** Only what you pass in the `module` block. No automatic inheritance.
2. **Q:** `module.network.vpc_id` errors with "not a valid attribute". Most likely cause?
   **A:** The network module never defined an `output "vpc_id"`.
3. **Q:** You add a new `module` block with a registry source. What makes Terraform download it?
   **A:** `terraform init`.
4. **Q:** `source = "terraform-aws-modules/transit-gateway/aws"`. Where does it live?
   **A:** The public Terraform Registry (3 parts, no hostname).
5. **Q:** Which argument pins a registry module so updates do not surprise you?
   **A:** `version`.
6. **Q:** `version = "~> 3.2.0"`, with 3.2.0, 3.2.5, 3.3.0 and 4.0.0 available. Which one is installed?
   **A:** 3.2.5.
7. **Q:** Upgrade a module from 5.2.0 to 5.3.0. What are the two steps?
   **A:** Change the constraint to allow 5.3.0 (e.g. `~> 5.3.0`), then run `terraform init -upgrade`.
8. **Q:** How do you run assertions against several modules?
   **A:** Add `.tftest.hcl` files with `run` and `assert` blocks, then run `terraform test`. `validate` does not run assertions.

---

## Objective 6 — State management (backends, locking, state commands, drift)

**Big picture:** State (`terraform.tfstate`) is Terraform's **notebook**. It records "this block in my code = that real object in the cloud". Without the notebook, Terraform forgets what it built. A **backend** is where the notebook is kept. Local backend = a notebook on your desk. Remote backend = a shared notebook in a locked cabinet that only one person can write in at a time.

Most-missed codes here: **6a (4 misses)**, **6c (4 misses)**, **6d (3 misses)**.

### 6a — Local backend defaults and why it fails for teams (missed 4x)

**In one line:** The local backend writes `terraform.tfstate` in your current working directory. It has no sharing, no server-side locking, and no encryption by default.

- State is JSON and may contain plaintext secrets (extra context: even values marked `sensitive`).
- It holds the CURRENT snapshot, not a history of changes.
- For teams, move to a remote backend. You get one central copy, locking so one apply runs at a time, and usually versioning and encryption.
- Passing a state file around by Slack or email is error-prone and causes overwrites.

**Never commit state to Git.** Two reasons (pick both when asked for two):
1. State can hold plaintext secrets, and Git history keeps them forever.
2. Git has no state locking, so two runs at once can corrupt state.

```gitignore
*.tfstate
*.tfstate.*
.terraform/
```

**What happens if the local state file is deleted?** Terraform forgets everything.
- `plan` will try to CREATE all the previously managed resources again.
- `destroy` cannot find anything to destroy until state is restored.
- Data sources can still read remote systems, but they do not fix the resource state.
- Output values are LOST (they live in state). "Previous outputs are still available" is false.
- Recover from a backup, or re-import the resources.
- It is not a locking issue. The plan still runs.

**Exam trap:**
- "Local backend requires an S3 bucket for locking." No, S3 belongs to the `s3` backend.
- "Local backend does not support `plan` with multiple team members." Wrong. The real limits are no locking and no central storage.
- "State is a binary format." No, it is always JSON.
- "State stores a complete history." No, only the current snapshot.
- "Committing prevents Terraform from reading the file." Not a real reason.
- "Remote backend gives automatic encryption everywhere." Not guaranteed.
- A second "reason not to commit" must be locking. Do not stop at secrets only.

**Seen in quizzes:** Quiz 1 Q1 (why not commit state, pick two); Quiz 3 Q16 (state deleted, pick three); Quiz 4 Q31 (local backend defaults); Quiz 5 Q18 (why stop sharing state on Slack). Quiz 1 Q35 (reminder): losing local state means a plan may try to create duplicates.

### 6b — State locking (no misses, but exam-relevant) 

**In one line:** A lock stops two people from changing state at the same time. Not every backend supports locking.

- Think of a bathroom door lock: while one person is in, the others wait.
- Remote backends with locking and access control are the recommended way to share state (see Quiz 5 Q35 under 6c).
- S3 now supports native locking with `use_lockfile` (the old DynamoDB locking is deprecated). Older course examples still show `dynamodb_table`.
- A stuck lock (a crashed run) is released with `terraform force-unlock <LOCK_ID>`. Make sure nothing is actually running first.
- State locking is NOT the `.terraform.lock.hcl` file (that one pins provider versions).
- To see why a lock fails, turn on `TF_LOG` (see Objective 7c).

```bash
terraform force-unlock <LOCK_ID>
```

**Exam trap:** Mixing up `.terraform.lock.hcl` (provider version pins, written by `init`, commit it to Git) with the state lock. Different things.

**Seen in quizzes:** No direct misses. From "quick reminders": Quiz 2 Q39, Quiz 5 Q26; related trap Quiz 2 Q4 (`.terraform.lock.hcl`).

### 6c — Backend block, partial config, and switching backends (missed 4x)

**In one line:** The `backend` block takes only literal values (no variables). Leave values out and feed them at `init` time with `-backend-config`. Then use `-reconfigure` or `-migrate-state` when you switch.

**Backend block rules**
- A `backend` block cannot use variables, locals, or data sources. Literal values only (extra context: that is why partial configuration exists).
- **Partial configuration** keeps sensitive or changing values out of VCS. Write an empty-ish block, then pass the rest at init:

```hcl
terraform { backend "s3" {} }
```
```bash
terraform init -backend-config="bucket=my-bucket" -backend-config="region=us-west-2"
terraform init -backend-config=path/to/file
```

**Switching backends**

| Command | What it does |
|---|---|
| `terraform init -migrate-state` | Point at the new backend AND copy your state across |
| `terraform init -reconfigure` | Point at the new backend and do NOT copy state (old state is left behind) |
| `terraform init -force-copy` | Migrates too, just auto-answers "yes" |
| `terraform init -backend=false` | Skips backend setup entirely |

- You can move state between supported backends at any time, even after the first apply (extra context from Quiz 4 Q20, objective 2d: change the config, run `init`, accept the migration).
- After changing the `backend` block, run `terraform init -migrate-state` (or `-reconfigure`) to finish the move (Quiz 4 Q54 reminder).

**Keeping backend credentials off disk**
- Anything given to `init` (flags or `-backend-config` files) can be written into `.terraform/` and into saved plan files.
- To keep credentials out of `.terraform` and plan files, supply them as **environment variables** on the machine running plan/apply.
- Secrets in the `provider` block, `-backend-config=secrets.hcl`, or `terraform.tfvars` plus `-var-file` all stay on disk or in plans.

**Sharing state securely across teams**
- Use a remote backend that supports locking and access control.
- NOT: state in VCS, copying local files, or encrypting `terraform.tfstate` and parking it in Vault or a secrets manager. A secrets manager is not a state store (no locking, no backend behaviour).

**Exam trap:**
- Picking `-backend=false` for "no copy". It skips backend setup instead.
- Picking `-migrate-state` or `-force-copy` for "without copying". Those DO copy.
- `terraform.tfvars` or a `TF_BACKEND_BUCKET` env var for backend settings. Backend blocks cannot use variables, and that env var does not exist.
- A gitignored `backends.tf` with the secrets in it is a full config hidden from Git, not partial configuration.

**Seen in quizzes:** Quiz 1 Q5 (reconfigure without copying state); Quiz 2 Q10 (partial backend config, `-backend-config`); Quiz 4 Q17 (credentials not in `.terraform` or plan files, use env vars); Quiz 5 Q35 (share state securely). Reminders: Quiz 3 Q1 (backend takes literals only), Quiz 4 Q54.

### 6d — Drift, `-refresh-only`, `moved`, `removed`, and `import` blocks (missed 3x)

**In one line:** Drift = real infrastructure no longer matches state. Sync state with `terraform apply -refresh-only`. Moving or forgetting resources uses `moved` (rename in the same state) and `removed` (forget without deleting).

**Drift and refresh**
- Engineers changed things by hand in the console. Terraform's notebook is now out of date.
- `terraform apply -refresh-only` reads the real infrastructure, shows the drift, and (after you approve) writes it into state. It changes no real infrastructure.
- `terraform plan -refresh-only` is the safe preview. It writes nothing.
- A plain `terraform plan` refreshes in memory only. To SAVE refreshed values, use `apply -refresh-only`.
- `terraform show` only displays state. `validate` checks syntax. `graph` draws dependencies.
- HCP Terraform drift detection only DETECTS and notifies (Obj 8, extra context from Quiz 5 Q42). It does not auto-fix.

```bash
terraform plan  -refresh-only    # preview drift, writes nothing
terraform apply -refresh-only    # accept drift into state
```

**The three "address change" blocks**

| Block | Use it when | Works across state files? |
|---|---|---|
| `moved { from, to }` | You renamed a resource or moved it into a module and do not want destroy and recreate | NO, same state only |
| `removed { from }` + `lifecycle { destroy = false }` | You want Terraform to FORGET a resource but leave the real object running | Removes it from this state only |
| `import { to, id }` | You want to bring an existing real object into state | Writes into the state you are in |

**Hand a resource from Stack A to Stack B (no destroy):** `removed` block in the source stack AND `import` block in the destination stack.

```hcl
# source stack
removed {
  from = aws_instance.web
  lifecycle { destroy = false }
}
# destination stack
import {
  to = aws_instance.web
  id = "i-0abc123"
}
```

**Destroy everything except one server, which keeps running:** add a `removed` block with `from = <address>` and `destroy = false`, run `terraform apply`, then run `terraform destroy`. The server is no longer in state, so destroy does not touch it.

Notes:
- Deleting a resource block and applying DESTROYS it. A `removed` block with `destroy = false` only forgets it.
- `prevent_destroy = true` does not "unmanage" anything. It makes destroy error on that resource, and the resource stays managed.
- `moved` blocks: keep them for at least one full apply cycle across all users and automation, then remove later (Quiz 2 Q19 reminder).
- The Quiz 5 explanation states `destroy = false` only in the explanation, not in the option text. It goes inside `lifecycle` in the `removed` block.

**Exam trap:**
- `moved` for cross-stack moves. Wrong, it only works inside ONE state file.
- `lifecycle` block (like `prevent_destroy`) for moving between stacks. Wrong.
- `terraform show` for "detect drift and update state". It only displays.
- `destroy -target=...` for forgetting a resource. It still leaves the resource managed or destroys it.
- Deleting the resource block plus `-refresh-only` leaves it in state, so `destroy` kills it.

**Seen in quizzes:** Quiz 3 Q43 (sync state with manual changes); Quiz 4 Q5 (move resource between stacks: `removed` + `import`); Quiz 5 Q20 (destroy all but one server). Reminders: Quiz 1 Q37 (`plan -refresh-only`), Quiz 2 Q19 (keep `moved`), Quiz 4 Q16, Quiz 5 Q14/Q16.

### Objective 6 — Command table: state, backend, workspaces, import

| Command | What it does |
|---|---|
| `terraform state list` | Prints one resource address per line (no details). Pipe to `wc -l` to count. |
| `terraform state show ADDRESS` | Human-readable details of ONE resource (needs an address) |
| `terraform show` | Whole state (or a saved plan) in human-readable form. `show -json` gives JSON. |
| `terraform state rm ADDRESS` (extra context) | Forget a resource in state without deleting the real object |
| `terraform state mv A B` (extra context) | Rename or move an address in state |
| `terraform import ADDRESS ID` | Writes an existing object into state only (you write the resource block) |
| `terraform apply -refresh-only` | Update state to match reality; changes no infrastructure |
| `terraform plan -refresh-only` | Preview that sync; writes nothing |
| `terraform force-unlock LOCK_ID` | Release a stuck state lock |
| `terraform init -migrate-state` | Switch backend and copy state |
| `terraform init -reconfigure` | Switch backend, do not copy state |
| `terraform init -backend-config=...` | Supply backend values at init (partial config) |
| `terraform workspace new/select/list` (extra context) | Multiple state files for one configuration |

### Objective 6 — Self-check

1. **Q:** Give two reasons not to commit `terraform.tfstate` to Git.
   **A:** It can hold plaintext secrets that Git history keeps forever, and Git has no locking, so concurrent runs can corrupt state.
2. **Q:** Which `init` flag switches to a new backend WITHOUT copying state?
   **A:** `terraform init -reconfigure`. (`-migrate-state` and `-force-copy` copy it. `-backend=false` skips the backend.)
3. **Q:** You want to keep the S3 bucket and region out of Git. What do you do?
   **A:** Use a backend block with only the type (`backend "s3" {}`) and pass values with `-backend-config` at `terraform init`.
4. **Q:** How do you keep backend credentials out of `.terraform` and saved plan files?
   **A:** Supply them as environment variables on the machine that runs plan/apply.
5. **Q:** The local `terraform.tfstate` is deleted. What does `plan` do and what about `destroy`?
   **A:** Plan tries to create the previously managed resources again. Destroy finds nothing to destroy until state is restored. Outputs are lost.
6. **Q:** Which command detects manual changes and records them in state without changing infrastructure?
   **A:** `terraform apply -refresh-only`.
7. **Q:** Which two blocks move a resource between two stacks without destroying it?
   **A:** `removed` in the source stack and `import` in the destination stack. (`moved` only works inside one state.)
8. **Q:** How do you destroy everything except one web server that must keep running?
   **A:** Add a `removed` block (`from = <address>`, `destroy = false`), `terraform apply`, then `terraform destroy`.

---

## Objective 7 — Maintain infrastructure (import, state inspection, logging)

**Big picture:** After day one, you will inherit things Terraform does not know about, you will want to peek at state, and sometimes you will need to debug. Three tools: **import** (adopt), **state/show commands** (inspect), **TF_LOG** (debug).

Most-missed codes here: **7a (6 misses, the biggest repeat offender)**, **7b (2 misses)**, **7c (2 misses)**.

### 7a — Import: adopt existing resources (missed 6x)

**In one line:** Import needs a matching `resource` block. It only writes into STATE. It does not write your config for you. Think "name tag + ID card + paperwork".

Analogy: you found a stray dog (a real resource). To adopt it you need (1) a kennel ready in your house (the `resource` block), (2) the dog's ID tag number (the real-world `id`), and (3) the paperwork stamped (apply/plan writes it to state).

**Two ways to import**

| Way | What you do |
|---|---|
| **Import block** (config-driven, newer) | Write a `resource` block, add an `import { to = ..., id = ... }` block, then run `terraform plan` and `terraform apply`. No `terraform import` command. |
| **CLI command** (classic) | Write the `resource` block FIRST, then run `terraform import ADDRESS ID`. State only. |

- Use an import block OR the CLI command, not both for the same job.
- The import block has exactly TWO required attributes: `to` (the resource address in your config) and `id` (the provider-specific real-world ID).
- `from` is NOT an import attribute. It belongs to `moved` and `removed` blocks. `address`, `name`, `resource`, and `resource_id` are all invalid.
- The `to` address must match an existing `resource` block. Error "resource address does not exist" = write the resource block.
- The classic `terraform import` writes state only. It does not generate config and does not need a "generate" flag. (Extra context: Terraform 1.5+ can generate config with `plan -generate-config-out`, but the quizzes test the classic behaviour: config is your job.)
- After a successful import plus apply, you CAN delete the `import` block. It is a one-time instruction. The `resource` block stays and keeps managing the object.
- To adopt CLI-created resources without impacting them, do three things: write matching `resource` blocks, add `import` blocks (address to real ID), and run apply (it records them in state with no changes).
- Do NOT use `apply` to recreate (that destroys and recreates). Do NOT use data sources (they only read, they do not manage).

```hcl
import {
  to = aws_instance.web
  id = "i-0abc123456789"
}

resource "aws_instance" "web" {
  # match the existing settings
}
```
```bash
# classic way: write the resource block first, then:
terraform import aws_instance.example i-abcd1234
```

**Exam trap:**
- Before running the `terraform import` COMMAND, you must first write a matching `resource` block. "Add import blocks first" is the other method, so it is the wrong answer to that question.
- "Import will fail unless you use `--generate-config`." No.
- "Terraform cannot manage resources created outside Terraform." False, import exists for exactly that.
- `ignore_changes = all` or a `data` block does not fix a missing resource address.
- "You can't delete the import block after the apply." False. You can delete it.
- Wrong attributes: `from`/`to`, `address`/`name`.

**Seen in quizzes:** Quiz 1 Q44 (adopt CLI-created resources, pick three); Quiz 2 Q49 (before running `terraform import`); Quiz 3 Q30 (what import does); Quiz 3 Q50 (import block error, address does not exist); Quiz 4 Q35 (delete import block after import); Quiz 5 Q28 (correct import block syntax). Reminder: Quiz 2 Q12 (import block flow is just `plan` then `apply`).

### 7b — Inspecting state: `show` vs `state show` vs `state list` (missed 2x)

**In one line:** `state list` = names only. `state show ADDRESS` = details of one resource. `show` = everything.

Analogy: `state list` is the table of contents. `state show` is one page. `show` is the whole book.

- `terraform state list` prints one address per line. Easiest way to COUNT resources: `terraform state list | wc -l`.
- `terraform state show aws_instance.web` needs ONE resource address. It accepts a single address (no comma list). Output is human-readable, not JSON.
- `terraform show` needs no arguments. It displays the whole state (or a saved plan) as an overview. For JSON use `terraform show -json`.
- `terraform show` does not only display "resources with pending changes".

```bash
terraform state list | wc -l
terraform state show aws_instance.web
terraform show
terraform show -json
```

**Exam trap:**
- `terraform state -count` does not exist.
- "state show outputs JSON" is false.
- "state show accepts comma-separated resources" is false.
- Using `state show` or `show` to count: they print full attributes. The quiz wanted `state list` for "without detailed attribute output".

**Seen in quizzes:** Quiz 1 Q27 (show vs state show, pick three); Quiz 3 Q15 (count resources quickly).

### 7c — Verbose logging with `TF_LOG` (missed 2x)

**In one line:** `TF_LOG=<LEVEL>` turns logging on. `TF_LOG_PATH` sends the logs to a file. The level is the VALUE, not the variable name.

- Levels, from loudest to quietest: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`.
- `TRACE` is the most verbose. It is also what you get if `TF_LOG` is set to something that is not a level.
- Logs go to stderr by default.
- `TF_LOG_PATH` only sets the file. It does not turn logging on by itself. You still need `TF_LOG`.
- `TF_TRACE`, `TF_DEBUG`, and `TF_INFO` do not exist.

```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
```

**When to turn it on (pick these three):**
1. Troubleshooting state-locking issues (see which operations try to get the lock).
2. Provider API calls are failing (see exact requests and responses).
3. Investigating why Terraform shows unexpected changes in a plan.

NOT for: routine daily production deployments "for audit trails", `terraform fmt`, or a normal first `init`. That is just noisy output.

**Exam trap:** `TF_TRACE`. TRACE is a level, not a variable. The missed-answer trap in Quiz 4 was "routine deployments for audit trails" and forgetting the lock-troubleshooting option.

**Seen in quizzes:** Quiz 1 Q11 (which variable enables logging); Quiz 4 Q32 (when to enable verbose logging, pick three).

### Objective 7 — Quick table

| Task | Command or setting |
|---|---|
| Adopt an existing resource (config-driven) | `import { to = ..., id = ... }` + `resource` block, then plan/apply |
| Adopt an existing resource (classic) | `resource` block first, then `terraform import ADDRESS ID` |
| Count resources in state | `terraform state list \| wc -l` |
| See one resource's details | `terraform state show ADDRESS` |
| See everything | `terraform show` (`-json` for JSON) |
| Debug | `TF_LOG=DEBUG` (+ `TF_LOG_PATH=file`) |
| Sync state with reality | `terraform apply -refresh-only` (see Objective 6d) |

### Objective 7 — Self-check

1. **Q:** Which environment variable enables detailed logging?
   **A:** `TF_LOG` (set it to TRACE, DEBUG, INFO, WARN or ERROR). `TF_TRACE`, `TF_DEBUG`, and `TF_INFO` do not exist.
2. **Q:** Which variable writes the logs to a file, and does it turn logging on by itself?
   **A:** `TF_LOG_PATH`. No, you still need `TF_LOG`.
3. **Q:** Name three good times to enable verbose logging.
   **A:** Troubleshooting state locks, failing provider API calls, and unexpected changes in a plan. Not routine daily deployments.
4. **Q:** What must you do before running the `terraform import` command?
   **A:** Write a `resource` block that matches the object you want to import. The command only updates state.
5. **Q:** What are the two required attributes of an `import` block?
   **A:** `to` (resource address) and `id` (the real-world ID). There is no `from`.
6. **Q:** Your import block fails with "resource address does not exist". What is the first step?
   **A:** Create the matching `resource` block that `to` points at.
7. **Q:** After a successful import apply, can you delete the `import` block?
   **A:** Yes. It is a one-time instruction. The `resource` block must stay.
8. **Q:** Which command is the easiest for counting managed resources, and which shows one resource in detail?
   **A:** `terraform state list` to count (pipe to `wc -l`). `terraform state show ADDRESS` for one resource's details. `terraform show` displays the whole state.

---

## Objective 8 — HCP Terraform

**Why this section matters:** HCP Terraform (Objective 8) is your weakest area. It was missed in all five quizzes: 6 times under 8c, 6 times under 8b, 2 times under 8a, and 1 time under 8d. That is 15 misses in total. Most of them are "pick the right feature for the job" questions. Learn the one-line job of each feature and you win these.

**Codes:** 8a = create infrastructure and workflows. 8b = collaboration and governance. 8c = workspaces, projects, variable sets. 8d = integration with the CLI and other tools.

### The big picture (read this first)

Think of HCP Terraform as an office building.

- The **organization** is the whole building. Billing, teams, users and the private registry live here.
- A **project** is a floor or a folder. It holds a group of workspaces.
- A **workspace** is a room. It holds one config's code link, variables, state and runs.
- A **run** is one job done in that room: plan, then (cost estimate, policy check), then apply.

```
Organization
  +-- Project (folder of workspaces; team access set here)
        +-- Workspace (code link + variables + state + runs)
              +-- Run (plan -> cost estimate -> policy check -> apply)
```

(The run stage order is from your lesson notes.)

**HCP Terraform vs open-source CLI**

| Thing | Open-source CLI on your laptop | HCP Terraform |
|---|---|---|
| Where plan/apply runs | Your machine | HCP Terraform's own servers (a "remote operation") |
| State | Local `terraform.tfstate` by default | Stored, versioned and locked for you |
| Secrets | Shell env vars, `.tfvars` files | Sensitive workspace variables, variable sets |
| Who can do what | Whoever has the files | Teams with permissions (org, project, workspace) |
| Policy checks | None built in | Sentinel / policy sets (paid tiers) |
| Run history | Not saved | Every run saved with who triggered and approved it |
| Private module/provider sharing | You build it | Built-in private registry |

**The three workflows (how a run starts)**

| Workflow | Where your code lives | Where the run executes | One-line use |
|---|---|---|---|
| VCS-driven | A Git repo linked to the workspace | HCP Terraform | Most common. Traceability. A commit or PR starts runs. |
| CLI-driven | Your local folder | HCP Terraform (you type the command locally, output streams back) | "I do not want to commit to Git but I want remote runs." |
| API-driven | Anywhere, pushed through the API | HCP Terraform | Custom automation and integrations. |

---

### Variable sets and variable scope (8c) — missed 3x

**In one line:** A variable set is a "define once, share everywhere" bundle of variables. You can attach it to many workspaces, to a whole project, or to the whole organization.

**Explain it simply:** Imagine a shared company phone book. Instead of writing the same phone number on a sticky note in every room (every workspace), you put it in one book. Fix the number once and every room sees the new number.

**Where can a variable live?**

| Scope | What it means |
|---|---|
| Single workspace | Variable defined directly in that one workspace |
| Variable set on selected workspaces | Shared by the workspaces you pick |
| Variable set on a project | Shared by all current AND future workspaces (and Stacks) in that project |
| Variable set global to the organization | Shared by every workspace in that org |
| Across multiple organizations | Does NOT exist |

**Exam trap:** "Variable in each workspace, marked sensitive" looks safe but is the duplicated, error-prone answer. Also, "all workspaces across multiple organizations" is always wrong. Variable sets are org-level objects. Credentials in `terraform.tfvars`, `locals`, or run tasks are never the right way to share credentials.

**Example (share cloud credentials with a team):**
1. Create a variable set that holds the credentials (mark secrets sensitive).
2. Group the team's workspaces into a project.
3. Apply the variable set to the project.

**Seen in quizzes:**
- Quiz 2 Q18 (share third-party credentials; I missed "apply the variable set to the project").
- Quiz 2 Q40 (scope levels; I picked "across multiple organizations" and missed "single workspace").
- Quiz 4 Q25 (define credentials and tags once; I picked locals + run tasks).

---

### Run tasks vs run triggers (8b / 8c) — missed 2x (a look-alike pair)

**In one line:** Run TASKS plug an outside tool into a run (like a security scanner). Run TRIGGERS chain one workspace's run to another workspace's run.

**Explain it simply:**
- Run **task** = a guest inspector who walks in between plan and apply, checks the plan, and says "OK" or "not OK". Examples are a security scanner or a cost check. It can be advisory (just a warning) or mandatory (blocks).
- Run **trigger** = dominoes. When workspace A finishes applying successfully, a new run is queued in workspace B.

| Feature | What it does | Think of it as |
|---|---|---|
| Run task | Calls an external service during a run (after plan, before apply) | Inspector |
| Run trigger | After workspace A applies, queue a run in workspace B | Dominoes |
| Health assessment | Checks over time for drift and failed conditions | Smoke alarm |
| Apply method (manual confirm) | Human clicks "Confirm & Apply" | Approval stamp |

**Exam trap:** "Require human approval before applying" is NOT run triggers. That is the manual apply setting. "Temporary credentials" is dynamic credentials, not triggers. "Always run the newest commit" is the VCS-driven workflow, not triggers. "Health assessments" is the wrong answer when the question says "third-party scanner between plan and apply".

**Seen in quizzes:**
- Quiz 1 Q32 (purpose of a run trigger; I picked "require human approval").
- Quiz 2 Q14 (third-party security scanners between plan and apply; I picked health assessments, correct is run tasks).

---

### Health assessments and drift detection (8b) — missed 2x

**In one line:** Health assessments watch your workspace on a schedule. They do drift detection (does real infrastructure still match?) and continuous validation (do your `check` conditions still pass?). They NEVER fix anything.

**Explain it simply:** Like a smoke alarm. It beeps when something is wrong. It does not put out the fire and it does not rebuild the house. A human decides whether to run an apply.

**Drift** means someone changed the real infrastructure by hand, so it no longer matches what Terraform expects.

**Exam trap:**
- "Drift detection can automatically run apply to fix drift" is FALSE. It only detects and notifies.
- "Automatic rollback" does not exist.
- "Runs Sentinel before every apply" is a different feature (policies). Health assessments are not Sentinel.

**From your lesson notes:** health assessments need paid tiers (Standard and Premium, and Enterprise). The lowest tier does not include them.

**Seen in quizzes:**
- Quiz 5 Q33 (benefits of workspace health checks; I picked "Sentinel before every apply" and "auto rollback", and missed "detect drift" + "continuously validate conditions").
- Quiz 5 Q42 (True/False: drift detection can auto-apply; I said True, correct is False).
- Quiz 2 Q14 (health assessments appeared as a wrong option next to run tasks).

---

### Projects and workspaces (8c) — missed 1x (plus it shows up inside other answers)

**In one line:** A project is a folder that groups workspaces. Every workspace sits in exactly one project, and you can set team access and share variable sets per project.

**Explain it simply:** Workspaces are files, projects are folders. Dozens of files in one pile is messy. Put each team's files in that team's folder, and give the team a key to that folder.

**Exam trap:** The scenario says "many workspaces, simplify structure, better access control, group by function". Wrong answers are "create multiple organizations" (more overhead, harder access control), "use tags" (tags only help you filter and give no access boundary), and "use variable sets" (they share values, not structure).

**Seen in quizzes:**
- Quiz 5 Q5 (organizing dozens of workspaces; I picked multiple organizations, correct is a team project).
- Quiz 2 Q18 and Quiz 4 Q25 (the project is the scope you attach a variable set to).

---

### Teams and permissions (8b) — missed 1x

**In one line:** You give permissions to TEAMS, at three levels: organization, project, and workspace. Tags never grant permissions.

**Explain it simply:** Teams are badge groups. A badge can open the whole building (organization level), one floor (project level), or one room (workspace level). A sticky label on a door (a tag) does not open anything. It only helps you find the door.

| Level | Example of what it controls |
|---|---|
| Organization | Admin access to settings and policies |
| Project | Permissions across all workspaces in the project |
| Workspace | Which teams can plan or apply in that one workspace |

**Exam trap:** "Workspace tags automatically grant permissions" is wrong. Tags only organize. "Public access mode" does not exist. Per-user permissions without teams is not the recommended way.

**From your lesson notes:** every org has a default `owners` team with the highest access. Creating extra teams needs a higher plan.

**Seen in quizzes:** Quiz 4 Q9 (ways to manage permissions, pick three; I picked tags and missed organization-level permissions).

---

### Policies and Sentinel (8b) — missed 1x

**In one line:** Sentinel is "policy as code". A policy gets grouped into a policy set, and the policy set is attached to workspaces or projects. The enforcement level is set on the policy (or policy set) and decides if a failure blocks the run.

**Explain it simply:** A policy is a rule like "every EC2 must have tags". It is a bouncer at the door. The enforcement level says how strict the bouncer is.

| Enforcement level | If the policy fails |
|---|---|
| Advisory | Logs a warning only. The run keeps going. |
| Soft mandatory | Blocks the run, but an authorized person can override it. |
| Hard mandatory | Blocks the run. Nobody can override it. |

**Structure:** Policy -> Policy set -> attached to workspaces (all, or chosen ones) or to projects.

**Exam trap:** "Some projects need advisory checks, others need mandatory enforcement." The answer is: set different enforcement levels per policy set and attach each set to the right workspaces or projects. Wrong answers: separate organizations (needless overhead), run triggers (they only chain runs), or org-wide policy and then disable it per workspace (inconsistent).

**Extra context:** Besides Sentinel, HCP Terraform can also use OPA policies. **From your lesson notes:** Sentinel is a paid feature.

**Seen in quizzes:** Quiz 2 Q8 (advisory vs mandatory; I picked run triggers based on workspace names).

---

### Reading another workspace's outputs: tfe_outputs (8c) — missed 1x

**In one line:** To read the outputs of another HCP Terraform workspace, use the `tfe_outputs` data source.

**Explain it simply:** The webserver workspace publishes its public IP on a notice board (its output). The DNS workspace uses `tfe_outputs` to read that board live. No copy and paste.

```hcl
data "tfe_outputs" "webserver" {
  organization = "bk-organization"
  workspace    = "prod-webserver"
}
# use it:  data.tfe_outputs.webserver.values.public_ip
```

**Exam trap:** A `dynamic` block does not fetch anything (it just generates repeated nested blocks). A variable default would have to be edited by hand. A "remote_state backend block" is not how you do it here, because the exam answer is `tfe_outputs`.

**Seen in quizzes:** Quiz 3 Q35 (prod-dns needs the IP from prod-webserver; I picked a dynamic block).

---

### Explorer (8b) — missed 1x

**In one line:** Explorer is the HCP Terraform feature that searches across the whole organization for resources, workspaces, providers and module usage, without opening each state.

**Explain it simply:** It is the building's search bar. "Which rooms contain the S3 bucket production-data-lake?" Type it in and Explorer lists the workspaces.

**Exam trap:** "State inspector", "Workspace navigator", and "Resource finder" are made-up names. If you see these, they are decoys.

**Seen in quizzes:** Quiz 4 Q49 (find which workspaces manage a bucket; I picked "Workspace navigator").

---

### HCP Terraform agents (8a) — missed 1x

**In one line:** An agent is a small program you run INSIDE your private network. It pulls jobs from HCP Terraform and runs plan/apply locally against infrastructure the internet cannot reach.

**Explain it simply:** HCP Terraform is head office. Your private data center has a locked door. You place a trusted courier (the agent) inside. Head office hands the courier the job, and the courier does the work inside. Nobody needs to open the door from outside.

**Exam trap:** Agents do NOT store state (state storage is a core HCP Terraform service). They are not for "monitoring without the UI" and not mainly "remote access to manage workspaces". Their primary job is to execute plans and applies for private or on-premises infrastructure.

**Seen in quizzes:** Quiz 3 Q5 (primary function of agents; I picked "store and manage state files").

---

### VCS-driven workflow and speculative plans (8a) — missed 1x

**In one line:** In the VCS workflow, opening a pull request starts a speculative plan (plan only, changes nothing) and posts the result on the PR. The real apply happens only after merge, and only if configured.

**Explain it simply:** A speculative plan is a "dry run" printed on the PR so reviewers can see what would change. No bricks are laid.

**Exam trap:** On a PR, HCP Terraform does NOT create a workspace per branch, does NOT auto-apply to staging, and does NOT auto-merge the PR.

**Seen in quizzes:** Quiz 5 Q19 (what happens when a PR is opened; I picked "creates a new workspace for the PR branch").

---

### Remote operation, execution mode and CLI-driven runs (8d) — missed 1x

**In one line:** A remote operation means HCP Terraform's own servers do the plan and apply, even if you typed the command on your laptop. With the CLI-driven workflow, the output streams back to your terminal.

**Explain it simply:** You press the button at home, but the machine that does the work is in HCP Terraform's factory. You watch a live video feed in your terminal.

**Related facts from your quizzes:**
- A workspace set to Execution Mode = Local is only a state backend. Plans and applies run on your machine, and you lose remote-run features such as Sentinel and cost estimation.
- The CLI-driven workflow is hooked up with a `cloud` block in your Terraform code.
- Setting `required_version` in code is not enough in HCP Terraform. Also set the workspace's own Terraform version setting (Quiz 4 Q13, answered correctly, so a reminder).

**Exam trap:** "Runs execute only on your machine but state is in HCP Terraform" describes local execution mode, not a remote operation.

**Seen in quizzes:** Quiz 5 Q1 (what is a remote operation; I picked "local execution, remote state").

---

### Private registry (related to 5a and 8c) — missed 1x as a module-source question

**In one line:** The HCP Terraform private registry lets your organization share modules and providers privately. A private module source has a hostname in front.

| Source string | Where it comes from |
|---|---|
| `terraform-aws-modules/transit-gateway/aws` (3 parts, no host) | Public Terraform Registry |
| `app.terraform.io/<org>/<name>/<provider>` (host + org) | Your private registry in HCP Terraform |
| `./modules/web` or `../x` | A local folder |

**Exam trap:** Quiz 1 Q50 had a 3-part source and I picked "private registry". No host in front means public. Outside HCP Terraform, using a private module needs an API token (`terraform login`) or `init` says "unauthorized" (from your lesson notes).

**Seen in quizzes:** Quiz 1 Q50 (module source location; I picked private registry).

---

### Comparison cheat-table: which HCP feature answers which question?

| If the question says... | The answer is... |
|---|---|
| Run an external scanner between plan and apply | Run tasks |
| When workspace A applies, start workspace B | Run triggers |
| Find drift or check conditions continuously | Health assessments |
| Auto-fix drift | Does not exist (False) |
| Block or warn on rule breaks (e.g. tags required) | Policies (Sentinel), set enforcement level |
| Share credentials with many workspaces | Variable set (attach to workspaces or a project) |
| Group many workspaces, set team access | Project |
| Control who can plan/apply | Teams with permissions (org, project, workspace) |
| Read another workspace's output | `tfe_outputs` data source |
| Search the whole org for a resource | Explorer |
| Run plan/apply inside a private network | Agent |
| Plan on pull request, no changes made | Speculative plan (VCS workflow) |
| Share private modules and providers | Private registry |
| Plan/apply run on HCP servers | Remote operation |

---

### Objective 8 — Self-check

Cover the answer with your hand and say it out loud.

**Q1. A run needs to call a third-party security scanner between plan and apply. Which HCP Terraform feature?**
A: Run tasks (not health assessments, not run triggers).

**Q2. What does a run trigger do?**
A: When one workspace applies successfully, it automatically queues a run in another workspace.

**Q3. True or False: HCP Terraform drift detection can automatically run apply to fix drift.**
A: False. It only detects and notifies. Humans decide to apply.

**Q4. Name the two real benefits of workspace health checks.**
A: Detect drift (real infra vs expected) and continuously validate your conditions. They never roll back or run Sentinel.

**Q5. You want to share cloud credentials with every workspace in a team, now and in the future. What do you do?**
A: Create a variable set with the credentials, put the workspaces in a project, and apply the variable set to the project.

**Q6. Dozens of workspaces owned by different teams. How do you simplify structure and access control?**
A: Put each team's workspaces in a project and set team access on the project. (Not multiple orgs, not tags.)

**Q7. Three valid ways to manage permissions in HCP Terraform?**
A: Organization-level permissions, project-level team access, and teams with workspace-level permissions. Tags never grant access.

**Q8. Some projects need advisory policies and others need mandatory ones. How?**
A: Set a different enforcement level on each policy set and attach each set to the right workspaces or projects.

**Q9. The prod-dns workspace needs the public IP output from prod-webserver. What do you use?**
A: A `tfe_outputs` data source that points at the prod-webserver workspace.

**Q10. What is the primary job of an HCP Terraform agent?**
A: Run plans and applies inside a private or on-premises network for infrastructure HCP Terraform cannot reach directly.

---

## Last-hour cheat-sheet

Built from all five of your quiz analyses (scores 36, 36, 38, 37, 37 out of 57; you need about 40). Miss counts below are my own rough tallies from the analyses, so read them as "about N times". Items marked "(extra context)" are widely known facts that are not from your quizzes.

You are only 3 to 4 questions short of passing each time. Most of your lost points come from three habits: misreading the question, leaving one correct box unticked in "select two or three" questions, and mixing up look-alike features. This sheet attacks those three things.

---

### Top 15 most-missed concepts

Ranked by how often they cost you points across the five quizzes.

1. **HCP Terraform: pick the right feature for the job (about 15 misses, all five quizzes).** Run tasks = external tools in a run. Run triggers = workspace A applies, then workspace B runs. Variable set = share variables. Project = folder of workspaces. Health assessment = detects drift and checks conditions, never fixes. Explorer = org-wide search. `tfe_outputs` = read another workspace's output. Agent = runs jobs inside a private network. (Full detail is in the Objective 8 section.)
2. **State and backends (about 12).** State is always required (no state-less mode). Local default is `terraform.tfstate` in the working directory, in plain JSON, and it can hold secrets. Never commit it to Git (leaks secrets, no locking). Share state with a remote backend that has locking and access control. Missing state is not an error: apply creates everything and writes new state. Lose the state and Terraform forgets what it manages (plan wants to create it all again, destroy finds nothing, outputs are gone).
3. **Modules are sealed boxes (about 8).** Inputs go in only through arguments in the `module` block, and the child must declare a matching `variable`. Outputs come out only through the child's `output` block, read as `module.NAME.OUTPUT`. There is no inheritance and no `parent.var.x`. A variable declared inside a module cannot be used outside it.
4. **Core workflow and command roles (about 7).** The core workflow is Write, Plan, Apply (not Destroy, not Import, not Validate). `fmt` fixes looks, `validate` checks syntax and consistency, `plan` previews, `apply` changes real infrastructure AND writes state. `.terraform.lock.hcl` is written by `init` and pins provider versions (commit it). To apply exactly what was reviewed: `terraform plan -out=FILE`, then `terraform apply FILE`. Each folder of .tf files needs its own `init`.
5. **Destroy, replace, forget and drift (about 6).** `terraform destroy` equals `terraform apply -destroy`; `plan -destroy` only previews. Rebuild one resource with `terraform apply -replace=ADDRESS`. To drop a few resources, delete their blocks and apply (avoid `-target`). To forget a resource without deleting it, use a `removed` block with `destroy = false`. `moved` only renames inside ONE state. To hand a resource to another state, use `removed` in the old stack and `import` in the new one. Sync state to reality with `terraform apply -refresh-only`.
6. **Import (about 6).** The `import` block takes exactly `to` (resource address) and `id` (real-world ID). The `from` attribute belongs to `moved` and `removed`, not `import`. Import needs a matching `resource` block in your config. The classic `terraform import` command writes state only and does not write your config. After a successful import you can delete the `import` block. A data source never brings something under management.
7. **`data` vs `resource`, and references (about 6).** `resource` creates and manages. `data` reads something that already exists. Reference a resource you manage directly as `type.name.attribute` (this also creates the dependency). Use a data source only for things NOT in your config. Data is written `data.TYPE.NAME.ATTR`, with no quotes. Instances: `count` uses `[0]`, `for_each` uses `["key"]`.
8. **IaC concepts (about 6).** Terraform is declarative, immutable, a provisioning tool (not config management), HCL or JSON (never YAML). Benefits: version control, repeatability, consistency, automation, self-service, API-driven workflows, disaster-recovery rebuilds, human-readable code. IaC does NOT replace dev languages, does NOT remove API calls, does NOT guarantee app security.
9. **Providers (about 5).** A provider is the plugin; modules, backends and variables are not plugins. Providers give a consistent schema, a plugin model, and one workflow across platforms. Backends (not providers) store and lock state. Short source `hashicorp/kubernetes` means the public registry. Valid install sources: public registry, private registry, third-party registry that needs credentials, filesystem or network mirror. Never "compile from source".
10. **Re-run `terraform init` after a change (about 5).** New provider, new module, or backend change means `terraform init`. `required_providers` does not install anything. `validate` and `plan` do not download plugins. Changing the version constraint needs `init -upgrade`.
11. **Module sources and versions (about 5).** `namespace/name/provider` is public registry; `host/org/name/provider` is private registry; `./` or `../` is local. `version` works only for registry modules, so pin it. `~> 3.2.0` means 3.2.x only (picks the newest, e.g. 3.2.5). `~> 3.2` allows up to but not including 4.0. To go from `~> 5.2.0` to 5.3.0, change the constraint and run `init -upgrade`. `version` appears once per module (combine as `">= 1.0.0, < 2.0.0"`).
12. **Inspecting, logging and env vars (about 5).** `terraform state list` = addresses only. `terraform state show ADDRESS` = one resource (human-readable). `terraform show` = whole state or a plan. Logging is `TF_LOG=<LEVEL>` (TRACE is a level, not a variable), and `TF_LOG_PATH` only sends it to a file. Input variables come from `TF_VAR_<name>`.
13. **Custom conditions (about 4).** Variable `validation` fires early at plan (or validate), before anything is built. `precondition` runs before the resource (checks inputs). `postcondition` runs after (checks results, uses `self`). Pre- and postconditions halt with an error. `check` blocks only WARN. `validation` exists only inside `variable` blocks.
14. **Complex types and `for_each` (about 4).** `map` = any keys, one value type. `object` = fixed keys, mixed types. Lists use `[ ]`, maps use `{ }`, and a default must match the type. `for_each` accepts only a map or a set, so wrap a list with `toset()`. A lookup by region name is `map(string)`.
15. **Functions (about 3).** `merge` for maps, `concat` for lists, `join(sep, list)` for a string, `format` for patterns. Computing a value = expressions and functions. Passing a value = variables and outputs.

Also repeated in many quizzes (answered right some times, wrong other times): `sensitive = true` only hides output on screen; the value is STILL in state. Standard Vault data sources also still land in state. Only `ephemeral` resources plus write-only arguments keep secrets out of state.

---

### Commands at a glance

| Command | What it does | What it changes |
|---|---|---|
| `terraform init` | Downloads providers and modules, sets up the backend, writes `.terraform.lock.hcl` | `.terraform/` folder, lock file. No infrastructure. |
| `terraform init -upgrade` | Re-picks the newest providers/modules allowed by constraints | `.terraform/`, lock file |
| `terraform init -reconfigure` | Points at a new backend and does NOT copy old state | Backend config only |
| `terraform init -migrate-state` | Points at a new backend AND copies existing state | State moves to new backend |
| `terraform init -backend-config=...` | Supplies the missing backend values (partial config) | Backend settings (can be saved in `.terraform`) |
| `terraform validate` | Checks syntax and internal consistency. Needs init first. | Nothing |
| `terraform fmt` | Rewrites files into canonical style | Your .tf files (`-check` only reports, `-recursive` includes subfolders) |
| `terraform plan` | Previews changes. Refreshes in memory only. | Nothing real |
| `terraform plan -out=FILE` | Saves the plan | A plan file |
| `terraform plan -refresh-only` | Previews drift | Nothing |
| `terraform apply` | Makes the changes, then writes state | Real infrastructure and state |
| `terraform apply FILE` | Runs exactly the saved plan | Real infrastructure and state |
| `terraform apply -refresh-only` | Updates state to match reality | State only |
| `terraform apply -replace=ADDRESS` | Destroys and recreates that one resource | That resource (replaces the old `taint`) |
| `terraform apply -destroy` / `terraform destroy` | Tears down everything managed (same thing) | Real infrastructure and state |
| `terraform plan -destroy` | Previews a destroy | Nothing |
| `terraform show` | Shows the whole state or a plan, human-readable (`-json` for JSON) | Nothing |
| `terraform state list` | One address per line | Nothing |
| `terraform state show ADDRESS` | Details of one resource | Nothing |
| `terraform state rm ADDRESS` (extra context) | Removes a resource from state without destroying it | State only |
| `terraform state mv A B` (extra context) | Renames or moves an address inside state | State only |
| `terraform import ADDRESS ID` | Writes an existing object into state (you must already have the `resource` block) | State only |
| `import { to, id }` block + plan/apply | Config-driven import | State on apply |
| `terraform output` | Prints output values | Nothing |
| `terraform workspace new/select/list/show/delete` (extra context) | Separate state per CLI workspace | Which state you use |
| `terraform force-unlock LOCK_ID` | Releases a stuck state lock (check nothing is running) | Lock |
| `terraform test` | Runs `.tftest.hcl` files (`run` + `assert` blocks) | Nothing real when using plan-mode runs |
| `terraform login` (extra context) | Stores an API token for HCP Terraform / private registry | Credentials file |
| `terraform get` | Installs/updates modules | `.terraform/modules` |
| `terraform graph` (extra context) | Prints the dependency graph | Nothing |

---

### Look-alike pairs people confuse

| Pair | The difference (from your mistakes) |
|---|---|
| `count` vs `for_each` | `count` = number index `[0]`. `for_each` = map or set, string key `["key"]`. A list needs `toset()` first. |
| variable vs local vs output | Variable = input from outside. Local = a named value inside the module. Output = value passed OUT (to the CLI or the parent module). |
| `data` vs `resource` | `data` reads existing things. `resource` creates and manages them. |
| `data` vs direct reference | If the thing is in your own config, reference `type.name.attr`. Do not use a data source. |
| `plan` vs `plan -refresh-only` vs `apply -refresh-only` | Normal plan compares config to state. `plan -refresh-only` previews drift. `apply -refresh-only` writes the refreshed values into state. |
| `fmt` vs `validate` vs `plan` | Looks vs correctness vs what will change. |
| `init` vs `validate` | `init` downloads. `validate` never downloads. |
| `-reconfigure` vs `-migrate-state` vs `-backend=false` | No copy vs copy vs skip the backend. |
| `terraform show` vs `terraform state show` vs `state list` | Whole thing vs one resource vs addresses only. |
| `terraform import` command vs `import` block | Command: state only, needs a resource block first. Block: config-driven, run plan then apply. Use one or the other. |
| `moved` vs `removed` vs `import` | `moved` renames inside one state. `removed` forgets (with `destroy = false` it keeps the real object). `import` adopts. |
| `precondition` vs `postcondition` vs `check` vs `validation` | Before (inputs) vs after (results, `self`) vs warn only vs variable-only. |
| `map` vs `object` | Any keys, one type vs fixed keys, mixed types. |
| `merge` vs `concat` vs `join` | Maps vs lists vs list to string. |
| `-target` vs config edit vs `-replace` | `-target` is a risky exception. Delete the blocks to remove things. `-replace` rebuilds one resource. |
| `depends_on` vs implicit reference | A reference builds the dependency graph automatically. `depends_on` is only for hidden dependencies. |
| provider vs backend | Provider = plugin that talks to the API. Backend = where state is stored and locked. |
| `.terraform.lock.hcl` vs state lock vs `terraform.tfstate` | Provider version pins vs concurrency lock vs the state data. |
| `~> 3.2.0` vs `~> 3.2` | 3.2.x only vs anything below 4.0. |
| run task vs run trigger vs health assessment | Outside tool vs chain workspaces vs watch for drift. |
| variable set vs project vs tag | Shares values vs groups workspaces (and sets access) vs filters only. |
| `sensitive = true` vs `ephemeral` | Hides on screen, still in state vs never stored. |
| `TF_LOG` vs `TF_LOG_PATH` vs `TF_VAR_` | Turns logging on (value = level) vs where the log goes vs input variables. |

---

### Wrong-answer patterns

Recurring trap styles from your five quizzes, and how to spot them.

1. **Answers that claim Terraform does something it does not.** Examples: "drift detection auto-applies", "automatic rollback", "state stores a full history", "`terraform state -count`", "`--generate-config` flag required for import". Terraform never rolls back, and HCP drift detection only reports. If an option sounds like magic, it is probably a decoy.
2. **Made-up names that sound official.** "Workspace navigator", "State inspector", "Resource finder", "TF_TRACE", "TF_INFO", "TF_ENV_", "public access mode", "`module.web.outputs.x`", "`parent.var.env`". If you have never seen the name in the docs or your notes, be suspicious.
3. **Absolutes: always, never, only, all, must, automatically.** "Terraform manages dependencies only if depends_on is set" was False. "Only run init in the root" was wrong. Absolutes are usually wrong, but not always, so check the fact.
4. **Right tool, wrong job.** `validate` for assertions (it does not run tests), `terraform plan` for downloading plugins, `data` for creating, `required_providers` for installing, a data source for something already in your config, tags for permissions. Ask: "What is this thing really for?"
5. **Reversed or swapped definitions.** Object vs map reversed, `to` vs `from`, `precondition` vs `postcondition`, output vs input in the module. Re-read which is which.
6. **"INACCURATE", "NOT", "EXCEPT" in the question.** Quiz 5 Q24 asked which IaC benefit was inaccurate, and I picked a true one. Circle the negative word first.
7. **True/False answered "False" by reflex.** Quiz 4 Q20 and Q35 were True and I said False. Quiz 5 Q12 and Q42 were False and I said True. Decide from the facts, not from a gut feeling.
8. **Plausible but heavier answers.** Multiple organizations, separate backends, extra data sources, re-creating everything. The correct answer is usually the simple built-in feature.
9. **Half-right options.** One option is true but answers a different question (for example `sensitive = true` hides output, but the question asks about state).
10. **Quoted references.** `"data.aws_ami.al2.id"` in quotes is a plain string, not a reference.

---

### Multi-select tactics

Quiz 4's analysis showed that 9 of 20 misses were multi-select questions where one correct option stayed unticked. This is your easiest place to win points.

1. **Count first.** Read "select two", "select three", "select four". Count how many boxes you ticked before you move on. If you ticked fewer, you are missing one.
2. **Tick the sure ones, then hunt for the missing one.** You usually find the first answers quickly. Ask what the remaining options say and whether any is clearly true.
3. **Cross out the decoys.** Strike out options with absolutes, made-up names, or "Terraform does X" claims that are false. What is left is your answer.
4. **Pairs often come together.** Many two-part answers are "write the thing" plus "run the command" (for example update the version constraint AND run `init -upgrade`; add `.tftest.hcl` files AND run `terraform test`; child `output` AND root `module.x.y`; `removed` in the old stack AND `import` in the new one). If you picked the command, look for the setup step, and the other way around.
5. **Do not pad.** If you are sure of two, do not add a third "just in case" for a select-two question. Wrong picks cost you the whole question (you lost Quiz 1 Q6, Quiz 2 Q18 and Quiz 2 Q40 this way).
6. **Flag and move on.** If you cannot decide, flag it, pick your best set, and come back at the end.

---

### Exam-day checklist and time plan

**Time plan for 57 questions in about 60 minutes (about 1 minute per question):**

| Minutes | What to do |
|---|---|
| 0 to 40 | First pass. Answer fast. About 40 seconds on easy ones. Flag anything that takes more than 90 seconds, and still pick a best guess. |
| 40 to 52 | Go through the flagged questions. |
| 52 to 58 | Re-check multi-select counts and "NOT/INACCURATE" questions. |
| 58 to 60 | Make sure nothing is blank. Submit. |

Never leave a question unanswered. A guess is free.

**Checklist:**

- Read each question's last line first, then the scenario.
- Circle (mentally) NOT, EXCEPT, INACCURATE, "select N".
- Eliminate decoys before you choose.
- For commands, ask whether it changes state, real infrastructure, or neither.
- For HCP questions, match the feature to its one-line job.
- Keep calm. You only need about 40 of 57, so you can miss 17.

**Logistics (extra context — verify on the HashiCorp site):**

- The Terraform Associate exam is taken online with a proctor. Check the current exam length, price, and retake rules on the HashiCorp certification page.
- Do a system check beforehand and log in early.
- Expect to need a valid photo ID, a quiet private room, and a clear desk.
- Do not use notes, a second screen, or a phone.
- Close other apps and notifications.
- Do not expect to pause the clock for breaks, so use the bathroom before you start.

---

### Final 10-minute recap

Say each one out loud.

1. New provider, new module, or backend change means run `terraform init`.
2. Core workflow is Write, Plan, Apply.
3. `fmt` = style, `validate` = correctness, `plan` = preview, `apply` = change and write state.
4. Save and review a plan, then `terraform apply planfile`.
5. `destroy` = `apply -destroy`. Rebuild one with `-replace`. Forget with `removed` and `destroy = false`.
6. `import { to = ADDRESS, id = "real-id" }` plus a matching `resource` block. State only for the command.
7. `data` reads, `resource` manages. Reference your own resources directly.
8. Modules: variables in via the module block, outputs out via `output`. Nothing is inherited.
9. Registry source with 3 parts is public. Host in front is private. `./` is local. Pin `version`.
10. `~> 3.2.0` means 3.2.x only.
11. State: always required, JSON, may hold secrets, not in Git, remote with locking for teams.
12. `sensitive = true` hides output only. State still has the value. `ephemeral` plus write-only keeps it out.
13. `precondition` before, `postcondition` after, `validation` for variables, `check` only warns.
14. `for_each` needs a map or set (`toset()`). `map` = any keys. `object` = fixed keys.
15. `merge` maps, `concat` lists, `join` strings.
16. HCP: run tasks = external tools. Run triggers = chain workspaces. Health assessment = detect only. Variable set = share. Project = folder. Teams = permissions (never tags). Explorer = search. `tfe_outputs` = other workspace's output. Agent = private network.
17. HCP VCS workflow: PR gives a speculative plan, merge gives the real run.
18. Read twice: "NOT", "INACCURATE", "select N". Count your ticks.

---

