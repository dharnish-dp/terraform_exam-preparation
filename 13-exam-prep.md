# 13 — Exam Preparation: Strategy, Cheat Sheets, Challenges and Practice Bank

> **Exam domain(s):** all eight   **Source:** lessons 1–9 (key takeaways, Q&A, exam tips) and lesson 10 (challenges 1–4)   **Time:** use from Day 15 onward, about 2 weeks

This is the last chapter. It does not teach new Terraform. It pulls everything from [00](00-prerequisites.md) to [12](12-hcp-terraform.md) into one place so you can **revise, practise and rehearse the exam**. If a cheat-sheet line is unclear, follow the link to the owning chapter and re-read the explanation there.

## What you will learn

- How the Associate exam works and how to manage your hour, your nerves and tricky wording
- A one-page cheat sheet for **each of the eight exam domains**
- How to solve the four course **challenges** (versioning/legacy code, best practices, `for_each`, data sources and functions) as worked scenarios
- A **table of deprecated versus modern** Terraform features (the exam targets Terraform 1.12, so this matters)
- **80 practice questions** grouped by domain (single choice, multiple select, true/false, fill-in) with answers and explanations
- A **self-explain checklist** to find the gaps in your understanding
- A **2-week final schedule**

## 🧠 Pre-concept: how to revise for a certification exam

Reading is not remembering. Three habits make the difference:

1. **Retrieval beats re-reading.** Close the book and try to recall the answer first. The practice bank in this chapter is built for that.
2. **Explain it out loud.** If you cannot explain a concept in two sentences to an imaginary beginner, you do not own it yet. The [self-explain checklist](#self-explain-checklist) is a list of those two-sentence tests.
3. **Type the commands.** Many exam questions are really "do you know what this command prints or changes?". Muscle memory from labs answers them faster than theory.

> **Facts that change.** Exam price, question count, passing score and objective wording change over time. The course quoted *multiple choice, 1 hour, 70.50 USD* when it was recorded. Always re-check the official page before you book: <https://developer.hashicorp.com/certifications/terraform-associate>.

---

## Part 1 — Exam strategy

### 1.1 The exam in one table

| Item | Terraform Associate (004) | Terraform Professional |
|---|---|---|
| Format | Multiple choice style questions, online proctored | Completely lab-based (you must pass the labs) |
| Duration | **1 hour** | **4 hours** |
| Price quoted in the course | **70.50 USD** (verify, it changes) | not stated |
| Version tested | **Terraform 1.12** | harder, separate course |
| Difficulty | Not very difficult if you have done the labs | Difficult |

The course does **not** follow the blueprint order, but it covers every objective. Use the official objectives page as your final checklist, and tick each line off as you can explain it.

### 1.2 Question types you should expect

Practise all of these. The practice bank below mixes them on purpose.

| Type | What it looks like | Tip |
|---|---|---|
| Single choice | One correct answer among 3–5 | Eliminate the clearly wrong ones first |
| Multiple select | "Select **two**" or "select **three**" | The number is given. Find exactly that many true statements |
| True / false | A statement to judge | Look for absolute words (*always*, *never*, *only*): they are often the trap |
| Fill-in / short answer | You type a command, flag or attribute | Spelling matters: `TF_VAR_`, `use_lockfile`, `-replace`, `.terraform.lock.hcl` |
| "What does this code do?" | A short HCL snippet | Trace it line by line, then substitute values |

### 1.3 Domain weighting: where your marks live

The README tells you where most marks live: **domains 3, 4, 5 and 6** (workflow, configuration, modules, state). Domain 4 is the biggest topic area in the course (variables, `count`, `for_each`, functions, lifecycle, conditions, sensitive data). Domain 8 (HCP Terraform) is conceptual and reading-heavy, so it is cheap marks if you memorise the vocabulary.

### 1.4 Managing the hour

Work out your pace **before** you start: *minutes available ÷ number of questions shown on the start screen*. Then:

1. **First pass (about two thirds of the time).** Answer what you know straight away. Flag anything that makes you stop for more than the pace allows.
2. **Second pass.** Return to flagged questions. Now use elimination and re-read the wording.
3. **Last five minutes.** Make sure nothing is unanswered. There is no reason to leave a blank.

### 1.5 How to read a question

- **Underline the verb.** "Which command *creates*", "which *reads*", "which *removes from state without destroying*"?
- **Spot the version trap.** If an option is a command or argument that is **deprecated or removed** (`terraform taint`, `terraform refresh`, `version =` inside a provider block, `dynamodb_table` for new setups), the exam usually wants the modern replacement. See the [deprecated vs modern table](#part-4--deprecated-versus-modern).
- **Spot the "plan versus apply" trap.** `plan` changes nothing and does **not** save outputs to state. `apply` does.
- **Spot the "resource versus data source" trap.** Resources *create*, data sources *read*.
- **Spot the "state versus config" trap.** `terraform state rm` and `removed` blocks touch **state only**. Deleting a resource block from code **destroys** the real resource on the next apply.
- **Spot the "which file" trap.** `.terraform.lock.hcl` (provider versions, commit it) is **not** the state lock, and **not** `terraform.tfstate`.
- **Multiple select:** after choosing, count. If the question says "two" and you chose three, one is wrong.

### 1.6 Elimination checklist for unknown questions

1. Does an option use a command or flag that **does not exist**? Remove it.
2. Does an option claim something is **stored/hidden/encrypted** when Terraform only masks it? (`sensitive = true` hides CLI output, **not** state.)
3. Does an option say a thing is **"always"** or **"never"** when Terraform has exceptions? Be suspicious.
4. Does an option mix up two similar names (`provider` vs `providers`, `terraform.workspace` vs HCP workspace, `variable` vs `local`)? Check the block name.
5. If still stuck, choose the option that follows **Terraform best practice**: remote state, no hard-coded secrets, version pinning, modules for reuse, least privilege.

### 1.7 Exam-day checklist

- [ ] ID ready, quiet room, desk cleared, stable internet (online proctored)
- [ ] Re-read the official objective list the night before, not new material
- [ ] Sleep and water. Do not cram new topics on exam morning
- [ ] Skim this chapter's [cheat sheets](#part-2--cheat-sheets-per-exam-domain) and the [deprecated table](#part-4--deprecated-versus-modern) one last time
- [ ] During the exam: flag, move on, return

---

## Part 2 — Cheat sheets per exam domain

Each cheat sheet is a compressed summary with the **traps** that the lesson notes flagged. The owning chapter is linked in each heading.

### Domain 1 — Infrastructure as Code with Terraform ([01](01-iac-and-terraform-intro.md))

| Concept | Remember |
|---|---|
| **IaC** | Managing and provisioning infrastructure through **code** instead of manual processes |
| **Benefits** | Speed, low risk of human error, version control, easy collaboration. Also repeatability: the same code deploys an identical set of resources again and again (the instructor's example: CIS hardening across 100+ AWS accounts) |
| **Manual infra problems** | Slow, error-prone, hard to replicate, you forget what you configured |
| **Two tool categories** | **Infrastructure orchestration** (Terraform, CloudFormation) vs **configuration management** (Ansible, Chef, Puppet) |
| **How they combine** | Terraform creates the servers, then a config-management tool such as Ansible logs in (for example over SSH) to install/configure software inside |
| **Choosing a tool** | Vendor lock-in? multi/hybrid cloud? integration with config management? price and support? |
| **AWS only + AWS support + GUI** | CloudFormation (Designer GUI) |
| **Multi-cloud / hybrid + official support** | Terraform (HashiCorp support, thousands of providers) |
| **Terraform core idea** | Reusable code that deploys an identical set of infrastructure repeatedly. Same syntax for every provider |
| **Install** | Single binary; no installer. Package manager sets PATH; manual install needs **you** to add the folder to `PATH` |
| **Supported OS** | Windows, macOS, Linux, FreeBSD, OpenBSD, Solaris |
| **Check install** | `terraform -version` (or just `terraform` to print usage) |

⚠️ **Gotcha:** "terraform works in its own folder but not elsewhere" means the folder is not on `PATH`. The fix is PATH, not reinstalling.

🎯 **Exam focus:** Terraform vs CloudFormation vs Ansible classification, the IaC benefit list, and "which tool for multi-cloud".

### Domain 2 — Terraform fundamentals ([02](02-providers.md), [04](04-state-basics.md))

**Providers**

| Concept | Remember |
|---|---|
| **Provider** | Plugin that lets Terraform talk to an external API (AWS, Azure, GitHub, DigitalOcean, Kubernetes...). Downloaded into `.terraform/` by `terraform init` |
| **Resource block** | `resource "aws_instance" "myec2" {}`: `aws_instance` = resource **type** (fixed by provider), `myec2` = **local name** (yours). Type + local name must be unique |
| **Tiers** | **Official** (HashiCorp, namespace `hashicorp`), **Partner** (technology companies, own namespace), **Community** (individuals; avoid in production) |
| **Non-HashiCorp provider** | Needs `required_providers` with a `source`, otherwise Terraform assumes `hashicorp/<name>` and `init` fails |
| **Version constraints** | `=`, `>=`, `<=`, `~>`, ranges with commas. `~> 2.0` = any 2.x. `>= 2.10, <= 2.30` picks the newest inside the range |
| **Provider vs Terraform version** | Independent release cycles. No constraint = newest provider is installed |
| **Lock file** | `.terraform.lock.hcl`: exact provider version + constraint + hashes. **Providers only** (not modules). Commit it. Change with `terraform init -upgrade` |
| **Aliases** | `provider "aws" { alias = "mumbai" ... }`, resource uses `provider = aws.mumbai` (unquoted). Unaliased block is the default. Two default blocks give `Duplicate provider configuration` |
| **Authentication vs authorization** | Authentication = who you are. Authorization = what you may do |
| **AWS credentials** | Do not hard-code. Use `aws configure` (`~/.aws/credentials`), environment variables, or a role. Provider block then needs only `region` |

**State (basics)**

| Concept | Remember |
|---|---|
| **State file** | `terraform.tfstate`, JSON; maps config to real resources. Never edit by hand, never lose it |
| **After destroy** | State file remains, but holds no resources (a `.backup` may exist) |
| **Desired vs current** | Desired = your config. Current = reality. Terraform changes current to match desired: (a) in config only → create, (b) differ → update, (c) only in reality (removed from config) → delete, (d) same → nothing |
| **Defaults trap** | Attributes you did **not** specify (default SG, 8 GB disk) are not desired state. Manual changes to them are **not** reverted |
| **Refresh** | Plan/apply refresh automatically. Standalone `terraform refresh` is **deprecated**; use `plan/apply -refresh-only` |
| **Sensitive data** | State can hold secrets in **plaintext** |

🎯 **Exam focus:** provider tiers, `required_providers`, `~>` meaning, the lock file, desired vs current, state contents.

### Domain 3 — Core Terraform workflow ([03](03-core-workflow.md))

```text
write code -> init -> (fmt, validate) -> plan -> apply -> change code -> plan -> apply -> destroy
```

| Command | What it does | Trap |
|---|---|---|
| `terraform init` | Downloads providers (and modules), configures backend, creates lock file | Re-run after adding a provider, module or backend. `-upgrade` re-selects newest allowed provider versions and rewrites the lock file |
| `terraform fmt` | Canonical style. Never changes infrastructure | Current dir only unless `-recursive`; `-check` exits **3** if formatting needed; `-diff` shows changes |
| `terraform validate` | Syntax and consistency (unsupported args, undeclared variables) | Needs `init` first; does not look at real infra |
| `terraform plan` | Refreshes, compares, shows `Plan: X to add, Y to change, Z to destroy` | Changes nothing; does **not** store outputs in state. A good plan does not guarantee a good apply |
| `terraform plan -out=FILE` + `terraform apply FILE` | Applies exactly the reviewed plan | File is **binary**: read with `terraform show FILE` (or `-json`) |
| `terraform apply` | Shows plan, asks `yes`. Also destroys resources removed from code | `-auto-approve` skips prompt |
| `terraform destroy` | Destroys **everything** in the folder's state | `-target type.name` for one resource; the next plan will want to **recreate** it if its code is still there |
| `-target=ADDR` | Limit plan/apply/destroy to specific resources | For exceptional cases only; Terraform warns |
| `-refresh=false` | Skip refresh (helps with API throttling on large infra) | Only if sure state matches reality |
| `-refresh-only` | Update state from reality, no infra changes | Replaces `terraform refresh` |
| `-replace="ADDR"` | Force destroy-and-recreate of one resource | Replaces `terraform taint` (since 0.15.2) |
| `-var "k=v"`, `-var-file=f` | Set variables on the command line (highest precedence) | Not remembered for the next run |
| `terraform output [name]` | Reads outputs from the state | Does not refresh or change infra |
| `terraform show` | Human-readable state or saved plan | |
| `terraform graph` | Dependency graph in **DOT**; render with Graphviz `dot -Tsvg` | Needs `init`; avoid uploading sensitive graphs to public sites |
| `terraform console` | Evaluate expressions and test functions | Exit with `Ctrl+D` |

**Load order:** Terraform reads **all `*.tf` and `*.tf.json`** files in the working directory (alphabetical), merges them, and **ignores subdirectories** unless referenced as a module. Two files declaring the same resource address cause an error. Splitting files has **no effect** on infrastructure.

**Comments:** `#` (preferred), `//`, and `/* ... */`.

**The `terraform {}` block** holds project settings: `required_version` (Terraform CLI), `required_providers`, `backend`/`cloud`. Mismatch gives *Unsupported Terraform Core version*.

🎯 **Exam focus:** what each command does and does **not** change; `-out`; `-replace`; `-target`; load order.

### Domain 4 — Terraform configuration ([05](05-resources-data-dependencies.md), [06](06-variables-outputs-locals.md), [07](07-types-loops-functions.md), [08](08-lifecycle-conditions-sensitive.md))

**Resources, data, dependencies**

| Concept | Remember |
|---|---|
| Attribute reference | `TYPE.NAME.ATTRIBUTE` (for example `aws_eip.lb.public_ip`). Creates an **implicit dependency** |
| Argument vs attribute | Argument = input you set. Attribute = value you can read |
| `(known after apply)` | Value unknown until creation |
| String interpolation | `"${aws_eip.lb.public_ip}/32"` |
| Data source | `data "type" "name" {}`, read with `data.type.name.attr`. Creates nothing; shows `Reading... / Read complete` |
| `depends_on` | Explicit dependency when no attribute links the resources |
| Order | Create in dependency order, **destroy in reverse** |
| Meta-arguments | `depends_on`, `count`, `for_each`, `lifecycle`, `provider` |

**Variables, outputs, locals**

| Concept | Remember |
|---|---|
| Declare / use | `variable "x" {}` / `var.x` |
| Auto-loaded value files | `terraform.tfvars`, `terraform.tfvars.json`, `*.auto.tfvars`, `*.auto.tfvars.json`. Anything else needs `-var-file` |
| Env var | `TF_VAR_<name>` (open a new terminal after setting it) |
| **Precedence (later wins)** | default < **env var** < `terraform.tfvars` < `terraform.tfvars.json` < `*.auto.tfvars(.json)` < `-var` / `-var-file` |
| No value anywhere | Interactive prompt (not remembered) |
| Locals | Defined in `locals {}` (plural), used as `local.x` (singular). Can hold expressions/functions. **Cannot** be overridden from tfvars/CLI/env |
| Variable defaults | Cannot contain function calls (`Function calls not allowed`) |
| Outputs | `output "x" { value = ... }`; printed after apply, stored in state, usable by other configs |

**Types, loops, functions**

| Concept | Remember |
|---|---|
| Types | string, number, bool, list, set, map, object, tuple |
| List vs set | List: ordered, duplicates, index from 0. Set: unique, unordered, `set(string)` |
| Map vs object | Map: all values one type, free keys. Object: fixed keys, each its own type; extra attributes are **discarded** |
| `count` | N identical copies; `count.index` from **0**; addresses `type.name[0]`; reordering a list shifts indexes |
| `for_each` | Accepts a **map or set of strings**; `each.key`, `each.value` (identical for a set); addresses `type.name["key"]` |
| Conditional | `condition ? true_val : false_val` |
| Splat | `aws_iam_user.lb[*].arn` = list of that attribute from all `count` instances |
| `dynamic` block | Generates repeated **nested blocks** (not resources): `dynamic "ingress" { for_each = ...; content { ... ingress.value ... } }` |
| Functions | Built-in only; **no user-defined functions**. Test in `terraform console`. Know `lookup`, `length`, `element`, `file`, `zipmap`, `timestamp`, `formatdate`, `max`, `jsonencode` |

**Lifecycle, conditions, sensitive**

| Concept | Remember |
|---|---|
| `lifecycle` args | `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by` |
| `create_before_destroy` | Reverses default replacement order (default: destroy then create) |
| `prevent_destroy` | Errors on any plan that destroys it. Does **not** protect if the block is deleted from code |
| `ignore_changes` | List of attributes or `all`; with `all` even your own config edits never trigger updates |
| Input validation | `validation { condition = ...; error_message = "..." }` in the variable. Runs at plan time |
| Precondition / postcondition | In `lifecycle`; `condition` + `error_message`; Terraform **1.2.0+**; `self` only in **postconditions**. Failed precondition = not created. Failed postcondition = created, later plans fail, destroy still works |
| `check` block | `check "name" { assert { condition, error_message } }`; failed checks produce **warnings**, not errors (extra context) |
| `sensitive = true` | Masks CLI output and logs. **State still plaintext.** Outputs referencing sensitive values must also be `sensitive = true` |
| Vault | `provider "vault"` + `data "vault_generic_secret"`. Secrets read this way **land in state** |
| Ephemeral / write-only | `ephemeral` blocks and `*_wo` arguments: **not** saved in state or plan. Terraform **1.11+**. Rotate by bumping `*_wo_version`. Cannot go in normal outputs |
| Provisioners | `file`, `local-exec`, `remote-exec`. Inside a resource. `remote-exec` needs a `connection` (ssh/winrm). `when = destroy` for destroy-time. Failed creation-time provisioner → resource **tainted**. `on_failure = continue` ignores failure (default `fail`) |

🎯 **Exam focus:** variable precedence scenarios, `count` vs `for_each`, lifecycle behaviours, `sensitive` limits, ephemeral values.

### Domain 5 — Terraform modules ([09](09-modules.md))

| Concept | Remember |
|---|---|
| Module | A folder of Terraform code called with a `module` block. DRY: write once, reuse |
| Required argument | `source`. `version` works for **registry** modules |
| Sources | Local (`./` or `../` required), Registry, `github.com/...` (**no** `https://`), Bitbucket, Git, HTTP, S3 (`s3::`) |
| Download | `terraform init` ("Initializing modules..."). Re-run after changing a source |
| Inputs | Module `variable` blocks. Unknown argument → *Unsupported argument*. No default → *Missing required argument* |
| Outputs | Parent reads only outputs: `module.<name>.<output>` |
| Root vs child | Root = working directory where you run Terraform. Child = called module |
| Providers in modules | Avoid `provider` blocks in child modules. Declare `required_providers` (source + version). Default provider config is inherited |
| Aliased providers | **Never inherited.** Pass `providers = { aws.prod = aws.mumbai }`; child declares `configuration_aliases = [aws.prod]` and uses `provider = aws.prod` |
| Standard structure | `README.md`, `main.tf`, `variables.tf`, `outputs.tf` (+ `modules/`, `examples/`) |
| Publish to public registry | Public GitHub repo, name `terraform-<PROVIDER>-<NAME>`, repo description, standard structure, `x.y.z` tags (optional `v` prefix) |
| Choosing public modules | Downloads, maintenance/issues, docs, versions, partner badge. Read the code if unsure |

⚠️ **Gotcha:** `provider` (resource, single reference) vs `providers` (module, a map).

### Domain 6 — Terraform state management ([10](10-backends-locking-drift.md))

| Concept | Remember |
|---|---|
| Code vs state | Code in Git. **State never in Git** (secrets in plaintext) |
| What to commit | `*.tf`, `.terraform.lock.hcl`, `.gitignore`, README |
| What not to commit | `.terraform/`, `*.tfstate`, `*.tfstate.backup`, `crash.log`, saved plans, sensitive `*.tfvars` |
| Backend | Decides where state lives. Default = **local** (`terraform.tfstate`). Re-run `terraform init` after any backend change |
| Local backend options | `backend "local" { path = "prod.tfstate" }` |
| S3 backend | `bucket`, `key`, `region`; locking via `use_lockfile = true` (legacy: `dynamodb_table`). Bucket names are globally unique |
| State locking | One writer at a time. Acquired and released automatically. Error text: *Error acquiring the state lock*. Not every backend supports it |
| `.terraform.lock.hcl` ≠ state lock | Provider lock file vs temporary lock mechanism |
| Remote state data | `data "terraform_remote_state" "x" { backend = "s3"; config = {...} }` then `data.terraform_remote_state.x.outputs.<name>` (outputs only) |
| CLI workspaces | `terraform workspace new/select/list/show`; `default` always exists; state for others in `terraform.tfstate.d/<name>/`; use `terraform.workspace` in code |
| Drift | Real infra differs from state/config. Detect with `plan` / `-refresh-only`; reconcile by apply (revert) or by updating code |

🎯 **Exam focus:** what goes in Git, why not state, backend basics, locking, `terraform_remote_state`, workspace storage.

### Domain 7 — Maintain infrastructure with Terraform ([11](11-import-state-cli-logging.md))

| Command / block | What it does |
|---|---|
| `terraform state list` | All addresses in state |
| `terraform state show ADDR` | Attributes of one resource |
| `terraform state pull` / `push` | Print state / upload state |
| `terraform state rm ADDR` | Remove from state, **do not destroy** |
| `terraform state mv SRC DST` | Rename/move address **without** recreate |
| `terraform state replace-provider FROM TO` | Change provider address recorded in state |
| `import { to = ..., id = ... }` | Adopt an existing resource (Terraform **1.5+**) |
| `terraform plan -generate-config-out=FILE` | Generate resource code for import blocks |
| `removed { from = ...; lifecycle { destroy = false } }` | Declarative "forget, don't destroy" |
| `moved { from = ...; to = ... }` | Declarative rename/refactor without recreation |
| `terraform apply -replace="ADDR"` | Force recreate (replaces `taint`) |
| `TF_LOG` | `TRACE` (most verbose) > `DEBUG` > `INFO` > `WARN` > `ERROR` |
| `TF_LOG_PATH` | Send logs to a file |
| Troubleshooting model | Errors come from **language, state, core or provider**. Core and providers are separate products with separate repos |
| Bug report | Terraform version, config, TRACE debug output, expected vs actual, steps to reproduce |

⚠️ **Gotcha:** `set TF_LOG=TRACE` is Windows; `export TF_LOG=TRACE` is Linux/macOS. Both last only for that terminal session.

### Domain 8 — HCP Terraform ([12](12-hcp-terraform.md))

| Concept | Remember |
|---|---|
| Naming | **HCP Terraform = Terraform Cloud** (renamed). Hosted at `app.terraform.io` |
| Self-managed | **Terraform Enterprise.** The **only** one supporting **air-gapped** installs (offline bundle) |
| Hierarchy | **Organization** (billing) > **Project** > **Workspace** |
| Workspace | Holds code source, variables, state, credentials, run history. Closer to a **directory** than to a CLI workspace |
| Three workflows | **VCS-driven**, **CLI-driven**, **API-driven**. Execution is **remote** in all |
| CLI-driven setup | `cloud` block → `terraform login` → `terraform init` → `plan/apply` |
| Credentials | Remote runs use **workspace variables** (AWS keys as sensitive environment variables), not your laptop |
| Run stages | Plan → cost estimation → policy check → apply (confirm or discard) |
| Sentinel | Policy as code (paid). Policy → policy set → workspaces. Levels: **advisory, soft mandatory, hard mandatory**. Cannot see resources created outside Terraform |
| Private registry | Share modules and providers in the org. Source starts `app.terraform.io/<org>/...` + `version`. Outside HCP you need an API token |
| Teams | `owners` = all permissions (avoid). Workspace permissions: **Read, Plan, Write, Admin, Custom**. State access: none / outputs only / read / read-write |
| Health assessments | **Drift detection** + **continuous validation** (paid tiers) |
| Run triggers | Workspace A applies → workspace B runs. Needs **remote state sharing** + a run trigger connection. `tfe_outputs` is the more secure data source |
| State migration | Add `cloud` block → `terraform login` → `terraform init` (answer yes). `-migrate-state` for automation, `-ignore-remote-version` for version mismatch |
| Version | Terraform version is **per workspace**, not always latest |

> **Up to date (TF 1.12):** the `cloud` block is the modern way to connect to HCP Terraform. The older `remote` backend still works but `cloud` is preferred. Pricing and tier details change often; know the **concepts and relative tiers**, not dollar values.

---

## Part 3 — The four challenges as worked scenarios

Lesson 10 closes the gap between *learning* and *doing*. The instructor's challenges live in a separate repository (`kplabs-terraform-challenges`, folders `challenge-1` to `challenge-4`). Each challenge has three videos: the **challenge**, **solution hints** (probable approaches only) and the **solution**.

**How to use this section:** read the scenario, close the chapter, attempt it in a sandbox AWS account, then compare. Each scenario ends with the **exam concepts** it exercises.

| # | Theme | Core skills |
|---|---|---|
| 1 | Versioning / legacy code | `required_version`, provider `version`, `required_providers`, `.terraform.lock.hcl`, deprecated arguments, no hard-coded credentials |
| 2 | Best practices / optimisation | `fmt`, variables + `terraform.tfvars`, tags, descriptions, precedence, file layout, `init -upgrade` |
| 3 | Loops | `for_each` over a map, `each.key` / `each.value`, resource addresses |
| 4 | Data sources and functions | `aws_iam_users`, `aws_caller_identity`, `length()`, outputs, interpolation |

> **Safety:** the challenge repo is third-party content. Read a `.tf` file before you apply it, and use a sandbox AWS account. Each challenge creates billable resources (Elastic IP, EC2), so **always destroy** at the end.

### Challenge 1 — Versioning and legacy code

**Scenario.** A developer at "Sample Small Corp" wrote Terraform years ago on version 0.12. Many organisations still run old versions, so you must be able to **refactor legacy code** to work with current Terraform and current providers.

**Tasks, in order**

1. Create the infrastructure with the provided code **unmodified** (only replace the credentials so it runs in your account).
2. Check whether it works with the **latest Terraform and latest provider plugins**.
3. Fix the code so it does.
4. You may edit the code freely to achieve step 3.

**Starter code (`tf-challenge-1.tf`, credentials replaced by placeholders)**

```hcl
provider "aws" {
  version    = "~> 2.54"
  region     = "us-east-1"
  access_key = "<ACCESS_KEY_PLACEHOLDER>"
  secret_key = "<SECRET_KEY_PLACEHOLDER>"
}

provider "digitalocean" {}

terraform {
  required_version = "0.12.31"
}

resource "aws_eip" "kplabs_app_ip" {
  vpc = true
}
```

**What is wrong with it (by design)**

| Item | Problem |
|---|---|
| `required_version = "0.12.31"` | Locks the code to **exactly** Terraform 0.12.31. Any newer binary fails with *Unsupported Terraform Core version* |
| `version = "~> 2.54"` inside `provider "aws"` | Old-style version pin (the argument inside provider blocks is deprecated in favour of `required_providers`) and an ancient AWS provider |
| `provider "digitalocean" {}` with no `required_providers` | A non-HashiCorp provider must declare its `source`. Otherwise `init` fails with *Failed to query available provider packages* |
| Hard-coded `access_key` / `secret_key` | Security problem: secrets end up in version control |
| `vpc = true` on `aws_eip` | Deprecated argument; replaced by `domain = "vpc"` |

**Think first (self-test)**

- What does `required_version` demand, and where do I get Terraform 0.12.31?
- How do I stop hard-coding keys?
- Which providers are official, and which must go in `required_providers`?
- After switching to the latest Terraform, why is the *old* AWS provider still used?
- Which argument is deprecated, and what replaces it?

**Solution, Part A: make the original code run (requirement 1)**

1. Run `terraform init` with the latest Terraform. It fails because of `required_version`.
2. Download Terraform **0.12.31** from the HashiCorp **releases archive** (`releases.hashicorp.com/terraform`), which keeps versions back to 0.1.0. Pick your OS: `darwin_amd64` (macOS), `windows_amd64`, `linux_amd64`.
3. Put the old binary in the challenge folder and run it as `./terraform` (macOS/Linux) or `terraform.exe` (Windows). `terraform version` now shows 0.12.x while the PATH binary is newer.
4. Delete `access_key` / `secret_key` from the provider block and configure credentials with the **AWS CLI**:

   ```bash
   aws configure        # paste access key ID and secret access key; region can stay default
   ```

   The AWS provider reads `~/.aws/credentials` automatically.
5. `plan`, then `apply -auto-approve`. The Elastic IP appears in the console (EC2 > Elastic IPs, `us-east-1`).

**Solution, Part B: modernise (requirements 2–4)**

6. `terraform destroy` first (an **unattached Elastic IP is billed**).
7. Switch back to the latest Terraform: replace the binary in your PATH folder, **delete the old 0.12 binary from the challenge folder**, and open a **new terminal** so PATH changes are picked up.
8. Remove the `terraform { required_version = "0.12.31" }` block and run `init`.
9. `init` fails for DigitalOcean. Add it to `required_providers` (copy the registry snippet):

   ```hcl
   terraform {
     required_providers {
       digitalocean = {
         source = "digitalocean/digitalocean"
       }
     }
   }
   ```

10. Remove `version = "~> 2.54"` from `provider "aws"`. `init` **still uses the old AWS provider**, because `.terraform.lock.hcl` pinned it. Delete the lock file (simplest here) **or** run `terraform init -upgrade`.
11. `apply` works but prints a **deprecation warning** for `vpc`. Treat warnings as future errors. Open the `aws_eip` resource page in the docs and replace `vpc = true` with `domain = "vpc"`.
12. Apply again with no warnings, then `terraform destroy`.

**Final working code**

```hcl
terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  # no version = ...        -> latest provider
  # no access_key/secret_key -> taken from `aws configure`
}

provider "digitalocean" {}

resource "aws_eip" "kplabs_app_ip" {
  domain = "vpc"
}
```

> **Up to date (TF 1.12):** instead of deleting the `required_version` constraint, a better pattern is a **range**, for example `required_version = ">= 1.5"`. Many teams also declare `hashicorp/aws` explicitly in `required_providers`, with a `~>` version constraint.

**Common mistakes**

- Running `init` with the newest Terraform and not realising the error is the version lock.
- Forgetting to delete the old 0.12 binary or to open a **new terminal**, so `terraform version` still says 0.12.
- Keeping the old lock file and wondering why the "latest provider" is not installed.
- Ignoring the deprecation warning because `apply` "succeeded".
- Forgetting to destroy.

**Exam concepts:** three version layers (Terraform binary via `required_version`, provider via `required_providers`, exact pin via `.terraform.lock.hcl`), non-HashiCorp providers need `source`, `init -upgrade`, no hard-coded credentials.

---

### Challenge 2 — Best practices and optimisation

**Scenario.** You are given working-looking code that creates a security group and an Elastic IP. **Optimise it according to Terraform best practices**, mainly around variables.

**Conditions**

1. The code must work and resources must be created (fix errors).
2. **Do not delete** `.terraform.lock.hcl` (it may be modified).
3. Show how to change variable `splunk` from `8088` to `8089` **without editing any Terraform code and without using a `.tfvars` file**.

**Starter code (`tf-challenge-2.tf`, indentation intentionally messy)**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"

    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "splunk" {
  default = "8088"
}
resource "aws_security_group" "security_group_payment_app" {
  name        = "payment_app"
    description = "Application Security Group"
  depends_on = [aws_eip.example]

# Below ingress allows HTTPS  from DEV VPC
  ingress {
       from_port        = 443
     to_port          = 443
    protocol         = "tcp"
      cidr_blocks      = ["172.31.0.0/16"]
  }

# Below ingress allows APIs access from DEV VPC

  ingress {
    from_port        = 8080
      to_port          = 8080
    protocol         = "tcp"
       cidr_blocks      = ["172.31.0.0/16"]
  }

# Below ingress allows APIs access from Prod App Public IP.

  ingress {
    from_port        = 8443
      to_port          = 8443
    protocol         = "tcp"
       cidr_blocks      = ["${aws_eip.example.public_ip}/32"]
  }
}
 egress {
    from_port        = var.splunk
    to_port          = var.splunk
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
  }



resource "aws_eip" "example" {
   domain = "vpc"
}
```

The folder also contains `.terraform.lock.hcl`, which pins the AWS provider to **2.70.4** with constraint `"~> 2.7"`.

**Hidden traps**

| Trap | Symptom |
|---|---|
| `egress` sits **outside** the resource (closing `}` too early) | `Blocks of type "egress" are not expected here` |
| Lock file forces provider **2.70.4** | `domain` is "not expected" in `aws_eip`, although the docs show it |
| Everything hard-coded, badly indented, no tags, no descriptions, one big file, redundant resource label | Poor maintainability |

**Troubleshooting rule from the lesson:** when correct-looking code errors, check **(a) the Terraform binary version, (b) the provider version, (c) the lock file**.

**Think first (self-test)**

- Does `init`/`validate` pass? If not: braces → binary version → provider version → lock file.
- Can I upgrade the provider **without** deleting the lock file?
- Which values repeat? Which go in `variables.tf` and which in `terraform.tfvars`?
- Where is `-var` in the precedence list?
- What happens to state if I rename a resource label?

**Solution, Part A: make it work**

1. Move the `egress` block **inside** the `aws_security_group` resource. `init` now works.
2. `terraform validate` complains about `domain`. The lock file installed provider 2.70.4.
3. Run **`terraform init -upgrade`**. It installs the newest allowed provider (5.17.0 in the video) and **rewrites** the lock file. The lock file is kept, so condition 2 is satisfied.
4. `terraform plan` now works.

**Solution, Part B: optimise**

5. **Format:** `terraform fmt` aligns everything.
6. **Variables** (`variables.tf`): `https`, `apis`, `prod_apis`, `dev_vpc` (used by two rules, so you change the CIDR once) and move `splunk` here.
7. **Values** (`terraform.tfvars`): `443`, `8080`, `8443`, `172.31.0.0/16`. `splunk` is **not** in tfvars (condition 3).
8. **Tags** on both resources (Name, Team, Environment). In production with hundreds of resources, tags tell you the owner, purpose and environment. The instructor showed an account with 28 security groups such as `launch-wizard-10` where nobody knew what each was for.
9. **Override `splunk` without touching code**, using the highest-precedence source:

   ```bash
   terraform plan  -var "splunk=8089"
   terraform apply -var "splunk=8089" -auto-approve
   ```

10. **Naming:** shorten the label `security_group_payment_app` to `payment_app` (the type is already in the address). Because the **address changes**, Terraform plans **1 to destroy, 1 to add**. The first apply failed with "security group already exists" (destroy then create with the same `name`); running `terraform apply` again succeeded.
11. **Descriptions** on every `ingress` and the `egress` block, so people in the AWS console can see what a rule is for.
12. **Split into files:** `providers.tf`, `variables.tf`, `terraform.tfvars`, `sg.tf`, `eip.tf`, and keep `.terraform.lock.hcl`. Run `plan`: **no changes**, because Terraform merges all `.tf` files in a directory.

**Final working code**

`providers.tf`

```hcl
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

`variables.tf`

```hcl
variable "https" {}

variable "apis" {}

variable "prod_apis" {}

variable "dev_vpc" {}

variable "splunk" {
  default = "8088"
}
```

`terraform.tfvars`

```hcl
https     = 443
apis      = 8080
prod_apis = 8443
dev_vpc   = "172.31.0.0/16"
```

`sg.tf`

```hcl
resource "aws_security_group" "payment_app" {
  name        = "payment_app"
  description = "Application Security Group"
  depends_on  = [aws_eip.example]

  ingress {
    description = "Allow HTTPS from DEV VPC"
    from_port   = var.https
    to_port     = var.https
    protocol    = "tcp"
    cidr_blocks = [var.dev_vpc]
  }

  ingress {
    description = "Allow APIs access from DEV VPC"
    from_port   = var.apis
    to_port     = var.apis
    protocol    = "tcp"
    cidr_blocks = [var.dev_vpc]
  }

  ingress {
    description = "Allow APIs access from Prod App Public IP"
    from_port   = var.prod_apis
    to_port     = var.prod_apis
    protocol    = "tcp"
    cidr_blocks = ["${aws_eip.example.public_ip}/32"]
  }

  egress {
    description = "Allow Splunk"
    from_port   = var.splunk
    to_port     = var.splunk
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "payment_app"
    Team        = "payments"
    Environment = "production"
  }
}
```

`eip.tf`

```hcl
resource "aws_eip" "example" {
  domain = "vpc"

  tags = {
    Name        = "payment_app"
    Team        = "payments"
    Environment = "production"
  }
}
```

Run it:

```bash
terraform init -upgrade
terraform fmt
terraform validate
terraform plan  -var "splunk=8089"
terraform apply -var "splunk=8089" -auto-approve
terraform destroy -var "splunk=8089" -auto-approve   # clean up
```

> **Up to date (TF 1.12):** the redundant `depends_on = [aws_eip.example]` can be removed because the reference to `aws_eip.example.public_ip` already creates an implicit dependency. In your own code also add `type` and `description` to every variable. Environment variable `TF_VAR_splunk` would also satisfy condition 3. Terraform 1.1+ also offers `moved` blocks so the label rename would not destroy anything.

**Common mistakes**

- Editing the code to fix `domain` when the real issue is the locked old provider.
- **Deleting** the lock file (forbidden) instead of `init -upgrade`.
- Putting `splunk = 8089` in a tfvars file (forbidden). Use `-var`, `-var-file`, or `TF_VAR_splunk`.
- Forgetting `-var` is **not remembered**: the next plan without it tries to change the rule back to 8088.
- Misplaced braces, and renaming a label without expecting destroy + create.

**Exam concepts:** `init -upgrade`, lock file, `fmt`, `validate`, variable precedence, tags/descriptions, merged file loading, resource address changes.

---

### Challenge 3 — Loops with `for_each`

**Scenario.** The folder gives you a map variable `instance_config` with two entries. Create one EC2 instance per entry, and make sure removing an entry destroys that instance.

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}
```

`providers.tf` (do not touch):

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

**Conditions**

1. EC2 instances are created from the map: one per key, using that key's `instance_type` and `ami` (20 entries would give 20 instances).
2. Removing a key **destroys** the matching instance on the next apply. Adding a key creates one.

**Think first (self-test)**

- Which loop construct accepts a map and keeps a **stable identity** per entry?
- How do I read the AMI from the current entry?
- What addresses will the instances have?
- What will `plan` show if I remove, add or edit a key?

**Hints:** use a loop (20 hand-written blocks would be an "unnecessarily large code base"), specifically `for_each`, which creates one instance for each member of a map or set.

**Solution**

1. Start from the `aws_instance` example in the AWS provider docs. Keep only `ami` and `instance_type`.
2. Add `for_each = var.instance_config`.
3. Use `each.value.ami` and `each.value.instance_type`.
4. `terraform init`, `plan` (2 instances), `apply -auto-approve`.
5. Addresses are `aws_instance.web["instance1"]` and `aws_instance.web["instance2"]`. In `terraform.tfstate` they appear with `index_key` `instance1` / `instance2`. **The key is the identity.**
6. **Test condition 2:** remove `instance2`, add `instance3`. `plan` shows **1 to destroy (`instance2`) and 1 to add (`instance3`)**.
7. **Bonus:** change `instance3` from `t2.micro` to `t2.small`. `plan` shows an **in-place update** of only `["instance3"]`.
8. `terraform destroy`.

**Final working code**

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}

resource "aws_instance" "web" {
  for_each      = var.instance_config
  ami           = each.value.ami
  instance_type = each.value.instance_type
}
```

> **Up to date (TF 1.12):** a more precise type is `map(object({ instance_type = string, ami = string }))`. AMI IDs are **region-specific** and old public AMIs get deprecated. If `apply` fails, look up a valid AMI for your region (or use a data source, see [05](05-resources-data-dependencies.md)).

**Common mistakes**

- Writing one `aws_instance` block per entry.
- Using `count` with a list: removing an item from the middle **shifts indexes** and causes unwanted replacements. `for_each` keys are stable.
- `each.value` where `each.value.ami` is needed.
- Expecting renaming a map key to update in place. It is **destroy + create** (as `instance2 → instance3` showed).
- Forgetting to destroy.

**Exam concepts:** `for_each` on map or set of strings, `each.key`/`each.value`, address format `type.name["key"]`, add/remove keys vs edit values.

---

### Challenge 4 — Data sources, functions and outputs

**Scenario.** The folder is empty (`.gitkeep` only). A client wants:

1. An IAM user named `admin-user-<account number>`, using your AWS account ID without hard-coding it (account `12345` → `admin-user-12345`).
2. An output listing the **names of all IAM users**.
3. A **numeric** output with the total number of users.

**Think first (self-test)**

- Which requirements are "show" (output) and which are "create" (resource)?
- Which data source lists IAM users, and which attribute holds the names?
- Which function counts elements?
- Which data source gives the account ID?
- How do I embed an expression in a string? Do I need the `data.` prefix?

**Hints:** data sources fetch information dynamically (account ID, user names). Counting is **not** a data source job: use a **function**.

**Solution**

*Requirement 2, list names*

1. In the AWS provider docs, open IAM → **Data Sources**. Use **`aws_iam_users`** (plural; many users). The singular `aws_iam_user` reads one user.
2. Check the **Attribute Reference**: the attributes are `arns` and **`names`**.
3. Add an output. Data sources must be referenced with the **`data.` prefix**.
4. `terraform apply`. Outputs are saved to state **after apply**, not after plan.

*Requirement 3, count*

5. Search "terraform functions", open **collection** functions, use **`length`**: `length(data.aws_iam_users.users.names)`.

*Requirement 1, the user*

6. Use data source **`aws_caller_identity`** (exports `account_id`, `user_id`, `arn`).
7. Copy the example from the **resource** page of `aws_iam_user`.
8. First attempt `"admin-user-data.aws_caller_identity.current"` gives a literal string. Use interpolation `"${...}"`.
9. Second attempt `${data.aws_caller_identity.current}` fails: it is an **object with four attributes**. Pick **`account_id`**.

**Final working code**

```hcl
provider "aws" {
  region = "us-east-1"
}

# Requirement 2: names of all IAM users
data "aws_iam_users" "users" {}

output "user_names" {
  value = data.aws_iam_users.users.names
}

# Requirement 3: numeric count
output "total_users" {
  value = length(data.aws_iam_users.users.names)
}

# Requirement 1: IAM user named admin-user-<account id>
data "aws_caller_identity" "current" {}

resource "aws_iam_user" "admin" {
  name = "admin-user-${data.aws_caller_identity.current.account_id}"
}
```

> **Note:** the local name `admin` is not stated in the transcript; it was copied from the docs example. After the new user is created, the next plan's `user_names` and `total_users` will **include** it, because the user list is read again on refresh/plan.

**Common mistakes**

- Forgetting `data.`, using a wrong attribute (`users`/`name` instead of `names`), or using singular `aws_iam_user`.
- Not wrapping the expression in `${ }` inside a string (literal text results).
- Passing the whole `aws_caller_identity` object instead of `account_id`.
- Reading the *data source* docs when you need to **create** (use the *resource* page).
- Expecting `plan` to store outputs in state.

**Exam concepts:** data sources vs resources, `data.` references, attribute reference, `length()`, string interpolation, outputs stored in state, outputs consumed by other configs via `terraform_remote_state` ([10](10-backends-locking-drift.md)).

**Search technique:** Google "terraform <thing you want>" (for example "terraform data source account ID") to discover the right data source quickly.

---

## Part 4 — Deprecated versus modern

The exam tests **Terraform 1.12**. If an answer option uses something on the left, the right-hand side is usually what the exam wants. Lesson notes and the repo sometimes still show the old form, so keep both in mind.

| Old / deprecated | Modern replacement | Notes |
|---|---|---|
| `terraform refresh` | `terraform plan -refresh-only` / `terraform apply -refresh-only` | Standalone refresh is deprecated and risky: after a provider region change it emptied the state in the lesson demo. Plan/apply refresh automatically anyway |
| `terraform taint` / `untaint` | `terraform apply -replace="ADDRESS"` | Recommended from Terraform 0.15.2. Forced replacement shows `1 to add, 1 to destroy` |
| `version = "~> 2.54"` inside `provider "aws" {}` | `required_providers { aws = { source = "hashicorp/aws", version = "..." } }` | Version belongs in the `terraform` block |
| Provider with no `required_providers` entry (non-HashiCorp) | `required_providers` with `source` | Else `init` assumes `hashicorp/<name>` and fails |
| `aws_eip { vpc = true }` | `aws_eip { domain = "vpc" }` | Argument deprecated in newer AWS provider versions (5.x) |
| Inline `ingress {}` / `egress {}` in `aws_security_group` | Separate `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` | Inline style **still works** with new providers. Use the provider-version selector in the Registry docs for legacy code |
| `terraform import ADDR ID` (CLI) | `import { to = ADDR  id = "..." }` block + `terraform plan -generate-config-out=FILE` | Block form needs Terraform **1.5+** and can generate the config |
| `terraform state rm ADDR` | `removed { from = ADDR  lifecycle { destroy = false } }` | Declarative, visible in Git. Imperative command still exists |
| `terraform state mv` for renames | `moved { from = ...  to = ... }` | Code-visible to the team. `state mv` is still useful for scripting |
| S3 locking with `dynamodb_table` | S3 backend `use_lockfile = true` | Native S3 locking, default `false`. DynamoDB is the legacy mechanism |
| Hard-coded `access_key` / `secret_key` in provider or backend | `aws configure`, env vars, shared profile, IAM role | Keys in backend config are also written into `.terraform/` and plan files |
| `terraform_remote_state` between HCP workspaces | `tfe_outputs` data source (and run triggers) | Reads outputs only, so more secure. `terraform_remote_state` still valid for plain backends |
| `remote` backend for HCP Terraform | `cloud` block | `cloud` is the current integration. Product renamed **Terraform Cloud → HCP Terraform** |
| Secrets as normal arguments with `sensitive = true` | `ephemeral` blocks + write-only `*_wo` arguments (1.11+) | `sensitive` only masks output; **state still has the value** |
| Old `config { ... }` (0.11 syntax) in remote state data | `config = { ... }` and `.outputs.<name>` | Old syntax omitted `.outputs.` |
| Chef/Puppet/Salt provisioners | Removed | Only `file`, `local-exec`, `remote-exec` remain; provisioners are a last resort |
| `count` over lists of distinct items | `for_each` with stable keys | Reordering a list shifts `count` indexes |

> **Up to date (TF 1.12) — items the lessons only hint at (extra context):** `null_resource` (used to host provisioners) is commonly replaced by the built-in `terraform_data` resource in newer Terraform. Verify against the official objectives before relying on it for an answer.

---

## Self-explain checklist

For every line, **explain it aloud in two sentences without looking**. If you hesitate, follow the link, re-read, and try again tomorrow. Tick it only when you could teach it.

**Domain 1 and 2: IaC and fundamentals**

- [ ] What is IaC, and what are its four benefits?
- [ ] Orchestration vs configuration management: what is each, and how do Terraform and Ansible work together?
- [ ] When would I choose CloudFormation, and when Terraform?
- [ ] What is a provider, and what does `terraform init` do with it?
- [ ] Official vs partner vs community providers: which need `required_providers`?
- [ ] What does `~> 2.0` allow? What does the lock file record, and how do I update it?
- [ ] What is in `terraform.tfstate`, what happens if I lose it, why can it contain secrets?
- [ ] Desired state vs current state: the four possible actions
- [ ] What is an alias, and how does a resource pick one?
- [ ] Authentication vs authorization

**Domain 3: workflow**

- [ ] Order of the standard workflow, and what each command changes or does not change
- [ ] `fmt` vs `validate`; what is exit status 3 for?
- [ ] How do I apply exactly what I reviewed? How do I read the saved plan?
- [ ] `-target`, `-refresh=false`, `-refresh-only`, `-replace`: when and why
- [ ] How does Terraform load a directory (merge, alphabetical, subfolders ignored)?

**Domain 4: configuration**

- [ ] Resource vs data source; attribute reference syntax; implicit vs explicit dependency
- [ ] The variable precedence order, from memory
- [ ] Variable vs local: which can be overridden, which can hold functions?
- [ ] `count` vs `for_each`: when to use which, and why `count` breaks on list changes
- [ ] List vs set vs map vs object
- [ ] The four lifecycle arguments and one use case each
- [ ] Input validation vs precondition vs postcondition vs `check`
- [ ] What `sensitive = true` does **and does not** do; how ephemeral/write-only values differ
- [ ] Why does the Vault integration still put secrets in state?
- [ ] Provisioners: local vs remote, creation vs destroy, `on_failure`, tainting

**Domain 5: modules**

- [ ] What problems do modules solve (DRY, standardisation)?
- [ ] Module sources, `version`, local path rule, GitHub rule
- [ ] How does a root module read a child's value?
- [ ] Why avoid provider blocks in child modules? How do aliased providers get passed?
- [ ] Five requirements to publish a public module

**Domain 6: state management**

- [ ] Why code goes to Git but state does not
- [ ] What a backend is; default backend; what to run after changing it
- [ ] What state locking prevents; S3 `use_lockfile`; difference from `.terraform.lock.hcl`
- [ ] `terraform_remote_state`: what it reads and the reference path
- [ ] CLI workspaces: commands, storage location, `terraform.workspace`
- [ ] What is drift, and how do I detect and reconcile it?

**Domain 7: maintain infrastructure**

- [ ] `state list/show/mv/rm/pull/push/replace-provider`: one sentence each
- [ ] Import block vs old import command; what `-generate-config-out` does
- [ ] `removed` vs `state rm`; `moved` vs `state mv`
- [ ] `TF_LOG` levels, `TF_LOG_PATH`, how to set them on Windows vs Linux/macOS
- [ ] The four error categories (language, state, core, provider)

**Domain 8: HCP Terraform**

- [ ] HCP Terraform vs Terraform Enterprise; which supports air-gapped installs?
- [ ] Organization > Project > Workspace
- [ ] The three workflows; the CLI-driven setup steps
- [ ] Why remote runs need workspace variables for credentials
- [ ] Sentinel levels; what Sentinel cannot catch
- [ ] Owners team and permission levels; health assessments; run triggers; `tfe_outputs`; state migration flags

---

## Part 5 — Final two-week schedule

Assumes you have finished chapters 00–12. If you have not, finish them first; this schedule is for **revision and practice**, about 1.5–2 hours per day.

| Day | Focus | What to do |
|---|---|---|
| **1** | Strategy + Domain 1 and 2 | Read Part 1 of this chapter. Re-read [01](01-iac-and-terraform-intro.md), [02](02-providers.md), [04](04-state-basics.md). Do practice questions Q1–Q16 |
| **2** | Domain 3 | Re-type a full init → plan → apply → destroy loop with `-out`, `-replace`, `-target`. Do Q17–Q26 |
| **3** | Domain 4a | Variables, outputs, locals, precedence. Re-type the precedence experiment. Do Q27–Q37 |
| **4** | Domain 4b | Types, `count`, `for_each`, functions in `terraform console`. Do Q38–Q48 |
| **5** | Domain 4c | Lifecycle, validation, conditions, sensitive/ephemeral, provisioners. Fill the self-explain boxes for Domain 4 |
| **6** | Challenges 1 and 2 | Attempt both from scratch in a sandbox (Part 3), then compare. **Destroy** everything |
| **7** | Rest + weak spots | Light day. Review every question you got wrong so far and re-read the linked chapters |
| **8** | Domain 5 | Re-do the module lab. Questions on modules, root vs child, aliases. Do Q49–Q56 |
| **9** | Domain 6 | S3 backend with `use_lockfile`, workspaces, `terraform_remote_state`. Do Q57–Q65 |
| **10** | Domain 7 | Practise `import` block, `removed`, `moved`, `state mv/rm`, logging. Do Q66–Q72 |
| **11** | Domain 8 | Read [12](12-hcp-terraform.md) again; memorise the vocabulary table. Do Q73–Q80. Challenges 3 and 4 in the sandbox |
| **12** | Mock paper 1 | Take [paper-1.html](paper-1.html) timed. Review every wrong answer and note the topic |
| **13** | Mock paper 2 or 3 | Take [paper-2.html](paper-2.html) or [paper-3.html](paper-3.html) timed. Re-read the [deprecated table](#part-4--deprecated-versus-modern) and the cheat sheets |
| **14** | Light review + exam day prep | Skim cheat sheets and the self-explain list. Check the official objectives one more time. Stop studying early, sleep well |

**If you only have one week:** do days 1–2 together, 3–5 as one day each for Domain 4 theory, day 8–11 compressed into two days, then one mock paper, then rest.

---

## Part 6 — Practice question bank (80 questions)

**How to use it:**

1. Cover the answers. Write down your answer for every question first.
2. Check the [answers section](#part-7--answers-and-explanations) and note **why** each wrong option is wrong.
3. Log misses by domain. Re-read the linked chapter, wait a day, and retry only the questions you missed.

Question types are marked: **(single)** one correct answer, **(select N)** choose exactly N, **(T/F)** true or false, **(fill-in)** type the answer. Questions are grouped by exam domain, **Q1–Q80**.

---

### Domain 1 — Infrastructure as Code (Q1–Q6)

**Q1 (single).** Which of the following is **not** a benefit of Infrastructure as Code?

- A. Speed of infrastructure management
- B. Lower risk of human error
- C. Cloud resources stop costing money once they are defined in code
- D. Version control and easier collaboration between teams

**Q2 (single).** Which option classifies the tools correctly?

- A. Orchestration: Ansible, Chef. Configuration management: Terraform, CloudFormation
- B. Orchestration: Terraform, CloudFormation. Configuration management: Ansible, Chef, Puppet
- C. Orchestration: Puppet, Terraform. Configuration management: CloudFormation, Chef
- D. All of them are configuration management tools

**Q3 (T/F).** AWS CloudFormation can deploy resources to AWS, Azure and GCP from the same template.

**Q4 (single).** A company runs workloads on AWS, Azure, GCP and on-premises VMware. It wants one tool with official vendor support. Which is the best fit?

- A. AWS CloudFormation
- B. Ansible only
- C. Terraform
- D. A shell script per platform

**Q5 (select 2).** Which **two** statements are true?

- A. Terraform can create servers, then Ansible can log in over SSH to configure software inside them
- B. Configuration management tools are the preferred way to create the raw infrastructure
- C. Orchestration tools such as Terraform primarily create and manage infrastructure
- D. Terraform needs a completely different syntax for each provider

**Q6 (fill-in).** Terraform is distributed as a single ______. To run it from any folder, the folder that contains it must be on the system ______.

---

### Domain 2 — Terraform fundamentals (Q7–Q16)

**Q7 (single).** Which file records the **exact provider versions** chosen during `terraform init`?

- A. `terraform.tfstate`
- B. `terraform.tfstate.backup`
- C. `.terraform/`
- D. `.terraform.lock.hcl`

**Q8 (single).** A configuration contains only `provider "digitalocean" {}` and `terraform init` fails. What is the most likely reason?

- A. The DigitalOcean provider does not exist
- B. Without a `source`, Terraform assumes `hashicorp/digitalocean`, which does not exist; a `required_providers` entry with the right `source` is needed
- C. `terraform init` cannot download partner providers
- D. The provider block must have an `alias`

**Q9 (select 2).** Which **two** statements about provider tiers are true?

- A. Official providers are owned by HashiCorp and use the `hashicorp` namespace
- B. Partner providers are written by individual hobbyists
- C. Community providers are the recommended choice for production without review
- D. Partner providers are maintained by technology companies in partnership with HashiCorp

**Q10 (single).** Which version satisfies the constraint `~> 2.0`?

- A. 1.9.0
- B. 3.0.0
- C. 2.9.1
- D. 3.1.0

**Q11 (T/F).** The version of a provider plugin is always the same as the version of the Terraform CLI.

**Q12 (single).** You lose `terraform.tfstate` and have no backup. What happens when you run `terraform apply` on the same configuration?

- A. Terraform rebuilds the state by reading the cloud account automatically and changes nothing
- B. Terraform does not know it created the resources earlier and tries to create everything again, which can produce duplicates
- C. Terraform destroys everything in the cloud account
- D. Terraform refuses to run until you recreate the file by hand

**Q13 (T/F).** `terraform destroy` deletes the `terraform.tfstate` file.

**Q14 (single).** A configuration does not specify a security group for an EC2 instance, so AWS attaches the default group. A colleague manually edits that default group. What does `terraform plan` show?

- A. A change to revert the edit
- B. No change: the attribute was never in the desired state
- C. An error about drift
- D. A request to destroy the instance

**Q15 (single).** You defined `provider "aws" { alias = "mumbai" region = "ap-south-1" }` next to a default AWS provider. How does a security group choose the aliased provider?

- A. `provider = "aws.mumbai"` (quoted)
- B. `provider = aws.mumbai`
- C. `alias = aws.mumbai`
- D. `region = "mumbai"`

**Q16 (fill-in).** The modern replacement for the deprecated standalone `terraform refresh` is `terraform apply ______`.

---

### Domain 3 — Core Terraform workflow (Q17–Q26)

**Q17 (single).** Which command downloads provider plugins into the `.terraform` directory?

- A. `terraform plan`
- B. `terraform validate`
- C. `terraform init`
- D. `terraform fmt`

**Q18 (select 2).** Which **two** things does `terraform init` do?

- A. Downloads the provider plugins the configuration needs
- B. Creates the cloud resources
- C. Downloads modules referenced by `module` blocks
- D. Reformats the code to canonical style

**Q19 (single).** You add a new provider block to an already initialised project. What must you run before `plan`?

- A. `terraform refresh`
- B. `terraform init` again
- C. `terraform destroy`
- D. Nothing; plan downloads providers on its own

**Q20 (single).** In a CI pipeline, `terraform fmt -check` finds a badly formatted file. What happens?

- A. It rewrites the file and exits 0
- B. It rewrites the file and exits 3
- C. It changes nothing and returns exit status 3
- D. It changes nothing and returns exit status 0

**Q21 (T/F).** `terraform plan` saves output values to the state file.

**Q22 (single).** You want to apply **exactly** the plan your team reviewed, even if the code is edited afterwards. Which workflow is correct?

- A. `terraform plan` then `terraform apply -auto-approve`
- B. `terraform plan -out=infra.plan` then `terraform apply infra.plan`
- C. `terraform apply -refresh=false`
- D. `terraform validate -out=infra.plan` then `terraform apply infra.plan`

**Q23 (fill-in).** Write the command that forces `aws_instance.myec2` to be destroyed and recreated (the modern replacement for `taint`): `terraform apply ______`.

**Q24 (single).** You run `terraform destroy -target aws_instance.myec2` and afterwards `terraform plan` says `Plan: 1 to add`. Why?

- A. The state file was corrupted
- B. The resource block is still in the configuration, so it is still part of the desired state
- C. `-target` only destroys the state entry
- D. Providers re-create deleted resources automatically

**Q25 (single).** A folder contains `main.tf`, `sg.tf` and a subfolder `old/` that has more `.tf` files (not referenced by any `module` block). Which files does Terraform load?

- A. All files, including those in `old/`
- B. Only `main.tf`
- C. `main.tf` and `sg.tf`; subdirectories are ignored
- D. Only files whose names start with `main`

**Q26 (select 2).** Which **two** statements about `terraform validate` are true?

- A. It needs the working directory to have been initialised so provider schemas are known
- B. It contacts AWS to confirm the resources exist
- C. It detects problems such as unsupported arguments or undeclared variables
- D. It reformats the code

---

### Domain 4 — Terraform configuration (Q27–Q48)

**Q27 (single).** `variable "instance_type"` has `default = "t2.nano"`. `TF_VAR_instance_type=t2.micro` is exported. `terraform.tfvars` sets `t2.large`. You run `terraform apply -var="instance_type=m5.large"`. Which value is used?

- A. `t2.nano`
- B. `t2.micro`
- C. `t2.large`
- D. `m5.large`

**Q28 (single).** A variable `ami` has these sources: default `a`, environment variable `b`, `terraform.tfvars` `c`, `prod.tfvars` `d` (not passed on the command line), `team.auto.tfvars` `e`. No flags are used. Which value wins?

- A. `a`
- B. `c`
- C. `d`
- D. `e`

**Q29 (fill-in).** The environment variable that supplies a value for variable `region` is named ______.

**Q30 (single).** `count = 3` and `name = var.users[count.index]` with `users = ["a","b","c","d","e"]`. What happens?

- A. Three users: `a`, `b`, `c`
- B. Five users
- C. An error because the list is longer than `count`
- D. Three users all named `a`

**Q31 (single).** `for_each` accepts which kinds of value?

- A. A list of numbers
- B. A map, or a set of strings
- C. Any list
- D. A single string

**Q32 (T/F).** When `for_each` iterates a **set of strings**, `each.key` and `each.value` return the same element.

**Q33 (single).** What is the result?

```hcl
instance_type = var.environment == "production" && var.region == "us-east-1" ? "m5.large" : "t2.micro"
```

with `environment = "production"` and `region = "ap-south-1"`.

- A. `m5.large`
- B. `t2.micro`
- C. An error: `&&` is not allowed in conditions
- D. `null`

**Q34 (select 2).** Which **two** statements about **locals** are true?

- A. They are defined in a `locals` block and referenced as `local.<name>`
- B. They can be overridden with `-var`
- C. They can contain expressions and function calls
- D. They are referenced as `locals.<name>`

**Q35 (single).** A `data "aws_ami" "myimage"` block exists. How do you pass its image ID to an `aws_instance`?

- A. `ami = aws_ami.myimage.image_id`
- B. `ami = data.aws_ami.myimage.image_id`
- C. `ami = var.aws_ami.myimage`
- D. `ami = data.myimage.aws_ami`

**Q36 (T/F).** You can define your own custom functions in the Terraform language.

**Q37 (single).** A security group rule references `aws_eip.lb.public_ip`. What is the **destroy** order?

- A. EIP first, then the rule
- B. Rule first, then EIP (reverse of creation)
- C. Both at the same time, always
- D. The order is random

**Q38 (single).** A database has `lifecycle { prevent_destroy = true }`. You **delete the whole resource block** from the configuration and run `terraform apply`. What happens?

- A. Terraform errors and keeps the database
- B. Terraform destroys the database, because the protection is gone with the block
- C. Terraform removes it from state only
- D. Terraform ignores the removal permanently

**Q39 (single).** What does `lifecycle { ignore_changes = all }` do?

- A. Terraform ignores the resource completely, including creation
- B. Terraform still creates and destroys the object but never proposes updates, even for edits in your own configuration
- C. It only ignores changes made manually in the cloud console
- D. It ignores changes to tags only

**Q40 (single).** An EC2 instance must be replaced because its AMI changed. By default Terraform:

- A. Creates the new instance first, then destroys the old one
- B. Destroys the old instance first, then creates the new one; `create_before_destroy = true` reverses this
- C. Updates the AMI in place
- D. Always refuses to replace

**Q41 (select 2).** Which **two** statements about preconditions and postconditions are true?

- A. `self` can be used in postconditions but not in preconditions
- B. They require Terraform 1.0
- C. A failed precondition prevents the resource from being created
- D. Postconditions run before the resource exists

**Q42 (single).** A variable has this validation, and the user passes `"ab"`:

```hcl
variable "bucket_name" {
  type = string
  validation {
    condition     = length(var.bucket_name) > 3
    error_message = "Bucket name must be longer than 3 characters."
  }
}
```

When does the user see the error?

- A. During `apply`, after AWS rejects the name
- B. At plan time, before any resource is touched
- C. Only if `-var` was used
- D. Never; validation is advisory

**Q43 (T/F).** Marking a variable `sensitive = true` removes its value from `terraform.tfstate`.

**Q44 (single).** An output refers to a sensitive variable but is **not** marked `sensitive = true`. What happens?

- A. The value is printed in plain text
- B. Terraform raises an error asking you to mark the output sensitive
- C. The output is silently omitted
- D. The value is encrypted

**Q45 (single).** Which statement about write-only arguments (for example `password_wo`) is correct?

- A. They need Terraform 1.11+ and a provider resource that supports them; the value is not stored in state or plan
- B. They work on every resource in every provider
- C. They are stored in state but encrypted
- D. To change the value you edit `password_wo` and Terraform detects the diff

**Q46 (single).** What does `zipmap(["a","b"], [1,2])` return?

- A. A list `["a",1,"b",2]`
- B. A map `{ a = 1, b = 2 }`
- C. A set `["a","b"]`
- D. An error, because the types differ

**Q47 (select 2).** Which **two** statements about provisioners are true?

- A. `remote-exec` requires a `connection` block
- B. `local-exec` runs on the remote resource
- C. A creation-time provisioner that fails marks the resource as tainted by default
- D. The default `on_failure` is `continue`

**Q48 (single).** A variable has `type = object({ Name = string, userID = number })`. A caller passes an extra attribute `age`. What happens?

- A. Error: unexpected attribute
- B. The extra attribute is silently discarded
- C. The variable becomes a map
- D. `age` is stored in state

---

### Domain 5 — Terraform modules (Q49–Q56)

**Q49 (single).** Which argument is **required** in every `module` block?

- A. `version`
- B. `providers`
- C. `source`
- D. `count`

**Q50 (single).** Which is a valid local path source for a module two directories up?

- A. `source = "modules/ec2"`
- B. `source = "../../modules/ec2"`
- C. `source = "local:modules/ec2"`
- D. `source = "~/modules/ec2"`

**Q51 (single).** Which GitHub source is written correctly?

- A. `https://github.com/zealvora/sample-kplabs-terraform-ec2-module`
- B. `github.com/zealvora/sample-kplabs-terraform-ec2-module`
- C. `github:zealvora/sample-kplabs-terraform-ec2-module.tf`
- D. `git@github/zealvora`

**Q52 (single).** A child module contains `output "instance_id" { value = aws_instance.myec2.id }` and is called as `module "ec2"`. How does the root read it?

- A. `module.ec2.id`
- B. `module.ec2.instance_id`
- C. `aws_instance.myec2.id`
- D. `output.ec2.instance_id`

**Q53 (select 2).** Which **two** statements about providers in child modules are true?

- A. A child module should declare `required_providers` (source and version) instead of hard-coding a provider block
- B. A child module must always contain its own `provider` block
- C. The provider configuration normally comes from the root module
- D. Aliased providers are inherited automatically

**Q54 (single).** In the child module, which setting declares that it expects an aliased provider from its caller?

- A. `provider_alias`
- B. `configuration_aliases` inside `required_providers`
- C. `alias = "prod"` in a `variable`
- D. `providers = { }` in `variable`

**Q55 (select 3).** Which **three** are requirements for publishing a module to the **public** Terraform Registry?

- A. A public GitHub repository
- B. Repository name in the form `terraform-<PROVIDER>-<NAME>`
- C. A private Bitbucket repository
- D. Release tags in `x.y.z` format (optional `v` prefix)
- E. A Dockerfile in the root

**Q56 (T/F).** After adding a new `module` block, you must run `terraform init` so Terraform can download or register the module.

---

### Domain 6 — Terraform state management (Q57–Q65)

**Q57 (single).** Why should you **not** commit `terraform.tfstate` to Git?

- A. It is too small to be useful
- B. It can contain secrets in plain text
- C. Git cannot store JSON
- D. Terraform refuses to read state from a repository

**Q58 (single).** What is Terraform's **default backend**?

- A. `s3`
- B. `remote`
- C. `consul`
- D. `local`

**Q59 (single).** You just added a `backend "s3"` block to `terraform {}`. What do you run next?

- A. `terraform apply`
- B. `terraform init`
- C. `terraform state push`
- D. Nothing; it is picked up automatically

**Q60 (single).** Which S3 backend setting enables native state locking?

- A. `lock = true`
- B. `use_lockfile = true`
- C. `dynamodb = true`
- D. `native_lock = "yes"`

**Q61 (T/F).** `.terraform.lock.hcl` is the file that locks the state during `apply`.

**Q62 (single).** A data source is declared `data "terraform_remote_state" "vpc" { backend = "s3" config = {...} }`. The other project exposes `output "eip_addr"`. How do you read it?

- A. `data.terraform_remote_state.vpc.eip_addr`
- B. `data.terraform_remote_state.vpc.outputs.eip_addr`
- C. `terraform_remote_state.vpc.outputs.eip_addr`
- D. `data.vpc.outputs.eip_addr`

**Q63 (single).** With the local backend, where is the state of a non-default workspace `dev` stored?

- A. `terraform.tfstate` in the working directory
- B. `terraform.tfstate.d/dev/terraform.tfstate`
- C. `.terraform/dev.tfstate`
- D. `dev/.terraform.lock.hcl`

**Q64 (select 2).** Which **two** statements about CLI workspaces are true?

- A. `terraform workspace new dev` creates the workspace and switches to it
- B. The `default` workspace can be deleted at any time
- C. `terraform.workspace` returns the name of the current workspace
- D. `terraform workspace select dev` creates `dev` if it does not exist

**Q65 (select 2).** A configuration reads a database password with `data "vault_generic_secret"`. Which **two** statements are true?

- A. The secret is still persisted in the state file, so the state must be protected
- B. The Vault provider guarantees the secret never reaches the state
- C. `sensitive = true` only masks CLI output; it does not remove the value from state
- D. A remote backend needs no access control if Vault is used

---

### Domain 7 — Maintain infrastructure with Terraform (Q66–Q72)

**Q66 (single).** Which pair of arguments does an `import` block (Terraform 1.5+) take?

- A. `from` and `to`
- B. `to` and `id`
- C. `address` and `name`
- D. `source` and `target`

**Q67 (fill-in).** The flag used with `terraform plan` to write configuration for imported resources to a file is `-______`.

**Q68 (single).** Which feature declaratively removes a resource from state **without destroying** it?

- A. A `moved` block
- B. A `removed` block with `lifecycle { destroy = false }`
- C. `terraform destroy -target`
- D. `ignore_changes = all`

**Q69 (single).** You renamed `aws_instance.web` to `aws_instance.app` in code and do **not** want it recreated. Which declarative approach works?

- A. `removed { from = aws_instance.web }`
- B. `moved { from = aws_instance.web  to = aws_instance.app }`
- C. `terraform taint aws_instance.web`
- D. `prevent_destroy = true`

**Q70 (single).** How do you send Terraform's debug logs to a file?

- A. Set `TF_LOG_PATH` to a file name (together with `TF_LOG`)
- B. Set `TF_FILE=true`
- C. Use `terraform plan > out.log` only
- D. `terraform logs --save`

**Q71 (single).** You suspect a bug in the AWS provider. What is the right move?

- A. Upgrade Terraform core; it fixes provider bugs
- B. Upgrade the provider plugin and, if needed, report the bug in the provider's repository
- C. Delete the state file
- D. Disable logging

**Q72 (T/F).** In Terraform 1.12, `terraform taint` is the recommended way to force a resource to be recreated.

---

### Domain 8 — HCP Terraform (Q73–Q80)

**Q73 (single).** What is the correct hierarchy in HCP Terraform?

- A. Workspace > Organization > Project
- B. Organization > Project > Workspace
- C. Project > Organization > Workspace
- D. Organization > Workspace > Project > Team

**Q74 (single).** Which offering supports **air-gapped** installation?

- A. HCP Terraform free tier
- B. HCP Terraform Standard
- C. Terraform Enterprise
- D. Terraform CLI only

**Q75 (single).** What is the correct order to set up the CLI-driven workflow?

- A. `terraform init` → `cloud` block → `terraform login` → `plan`
- B. `cloud` block → `terraform login` → `terraform init` → `plan/apply`
- C. `terraform login` → `plan` → `cloud` block → `init`
- D. `apply` → `login` → `init`

**Q76 (single).** A remote plan in HCP Terraform fails with AWS credential errors, although your laptop has working keys. Why?

- A. Remote runs use the workspace's variables, not your laptop's environment; add the keys as sensitive environment variables in the workspace
- B. HCP Terraform does not support AWS
- C. You must run `terraform refresh` first
- D. The keys must be in the `cloud` block

**Q77 (select 2).** Which **two** statements about Sentinel are true?

- A. Enforcement levels are advisory, soft mandatory and hard mandatory
- B. It cannot prevent resources created manually outside Terraform
- C. It runs before the plan stage
- D. It is available in every free-tier workspace by default

**Q78 (single).** Which team has all permissions by default and should have as few members as possible?

- A. `admins`
- B. `owners`
- C. `readers`
- D. `default`

**Q79 (single).** Which settings are required for a **run trigger** from workspace A to workspace B?

- A. Remote state sharing on A and a run trigger connection on B
- B. A shared `terraform.tfvars` only
- C. Both workspaces in the same Git repository
- D. A Sentinel hard-mandatory policy

**Q80 (select 2).** Which **two** make up HCP Terraform **health assessments**?

- A. Drift detection
- B. Continuous validation
- C. Cost estimation
- D. Policy check

---

## Part 7 — Answers and explanations

### Domain 1 (Q1–Q6)

**Q1: C.** IaC makes infrastructure repeatable and reviewable. It does not make cloud resources free. A, B and D are the standard benefits (speed, low risk of human error, version control, easy collaboration).

**Q2: B.** Orchestration tools (Terraform, CloudFormation) create and manage infrastructure. Configuration management tools (Ansible, Chef, Puppet) configure the inside of servers. Prefer orchestration to build infrastructure. See [01](01-iac-and-terraform-intro.md).

**Q3: False.** CloudFormation is AWS-specific. Use Terraform for multi-cloud or hybrid.

**Q4: C.** Multi-cloud/hybrid + official support points to Terraform (HashiCorp support, thousands of providers). CloudFormation is AWS-only.

**Q5: A and C.** B is the reverse of the best practice. D is wrong: the core Terraform syntax is the same for every provider.

**Q6: binary; PATH.** No installer is needed. If the folder is not on PATH, `terraform` works only from the folder that contains it.

### Domain 2 (Q7–Q16)

**Q7: D.** `.terraform.lock.hcl` stores the provider, exact version, constraints and checksums. `terraform.tfstate` stores resources, not provider pins. `.terraform/` holds the downloaded plugins.

**Q8: B.** Without a `source`, Terraform assumes the `hashicorp` namespace, so it looks for `hashicorp/digitalocean`. Add `required_providers { digitalocean = { source = "digitalocean/digitalocean" } }`. See [02](02-providers.md).

**Q9: A and D.** B and C are wrong: community providers come from individuals and should be avoided in production; partner providers come from technology companies.

**Q10: C.** `~> 2.0` means any 2.x (at least 2.0, below 3.0).

**Q11: False.** Providers are released separately with their own version numbers. Without a constraint, `init` installs the newest provider.

**Q12: B.** The state is Terraform's only record of what it manages. Without it, Terraform plans to create everything again. Never edit or lose state; keep backups or use a remote backend.

**Q13: False.** The state file stays after `destroy` but holds no resources. A `.backup` may also exist.

**Q14: B.** Attributes you did not specify (default security group, default disk size) are not part of the desired state, so manual changes to them are not reverted. Specify what matters explicitly.

**Q15: B.** The reference is `<provider>.<alias>`, **unquoted**: `provider = aws.mumbai`. Resources with no `provider` argument use the default provider.

**Q16: `-refresh-only`.** (`terraform apply -refresh-only` or `terraform plan -refresh-only`.) The standalone `terraform refresh` is deprecated and can be dangerous (it emptied the state in the lesson's demo after a region change).

### Domain 3 (Q17–Q26)

**Q17: C.** `init` downloads providers into `.terraform/` and creates/uses the lock file.

**Q18: A and C.** `init` also configures the backend. It does not create resources (B) or format code (D).

**Q19: B.** Run `terraform init` whenever you add a provider, module or backend.

**Q20: C.** `-check` modifies nothing. Exit status is 0 if formatted and **3** if formatting is needed, which makes it useful in CI/CD.

**Q21: False.** `plan` changes nothing. Outputs are saved to state only after `apply`.

**Q22: B.** A saved plan guarantees you apply exactly what was reviewed. The file is binary; read it with `terraform show infra.plan`.

**Q23: `-replace="aws_instance.myec2"`.** Introduced as the recommended replacement for `terraform taint` from 0.15.2. The plan shows `1 to add, 1 to destroy`.

**Q24: B.** `-target` destroyed the real resource, but its code is still there, so Terraform wants to recreate it. Remove or comment out the code to stop that.

**Q25: C.** Terraform reads all `*.tf` and `*.tf.json` files in the working directory, merged. Subdirectories are ignored unless referenced as a module.

**Q26: A and C.** `validate` checks syntax and consistency. It does not contact AWS (B) or reformat (D, that is `fmt`).

### Domain 4 (Q27–Q48)

**Q27: D.** Precedence (later wins): default < env var < `terraform.tfvars` < `terraform.tfvars.json` < `*.auto.tfvars` < `-var` / `-var-file`. `-var` is highest.

**Q28: D.** `prod.tfvars` is not auto-loaded (it would need `-var-file`). Among the loaded sources, `*.auto.tfvars` beats `terraform.tfvars`, which beats the environment variable, which beats the default.

**Q29: `TF_VAR_region`.** `TF_VAR_` plus the exact variable name. Open a new terminal after exporting it.

**Q30: A.** `count = 3` uses only the first three list items; extra items are ignored. `count.index` starts at 0.

**Q31: B.** `for_each` takes a **map** or a **set of strings**. Convert a list with `toset()` if needed.

**Q32: True.** A set has no keys, so both return the element. `each.value` is recommended for clarity.

**Q33: B.** With `&&`, one false part makes the whole condition false, so the false value is chosen.

**Q34: A and C.** Locals cannot be overridden by tfvars, `-var` or env vars (B is wrong). They are referenced as `local.x` (singular), although defined in `locals {}` (plural), so D is wrong.

**Q35: B.** Data sources are referenced as `data.<type>.<name>.<attribute>`.

**Q36: False.** Terraform supports only its built-in functions. Test them in `terraform console`.

**Q37: B.** The rule depends on the EIP (implicit dependency from the attribute reference). Creation is EIP first, then the rule. Destruction runs in **reverse**.

**Q38: B.** `prevent_destroy` only works while it is in the configuration. If you remove the block, nothing protects the resource.

**Q39: B.** With `all`, Terraform can still create and destroy, but never proposes updates, even for edits you make in your own config.

**Q40: B.** The default replacement is destroy then create. `create_before_destroy = true` creates the replacement first.

**Q41: A and C.** `self` refers to the resource's own attributes, which exist only after creation, so it is postcondition-only. They need Terraform **1.2.0+** (B wrong). Postconditions run **after** (D wrong).

**Q42: B.** Input validation runs at plan time, before any resource is touched, catching what providers would only reject at apply.

**Q43: False.** `sensitive = true` masks CLI output and logs. The state still contains plaintext. Protect the state (remote backend, encryption, access control).

**Q44: B.** Terraform errors when an output references a sensitive value but is not itself marked `sensitive = true`.

**Q45: A.** Write-only arguments (usually `*_wo`) need Terraform 1.11.0+ and provider support. Terraform cannot diff them, so rotation uses a companion `*_wo_version` that you increment.

**Q46: B.** `zipmap(keys, values)` builds a map. Typical use: `zipmap(aws_iam_user.lb[*].name, aws_iam_user.lb[*].arn)`.

**Q47: A and C.** `local-exec` runs where Terraform runs (B wrong). Default `on_failure` is `fail` (D wrong). `continue` ignores the error and does not taint.

**Q48: B.** Extra attributes passed to an object variable are discarded during type conversion; no error is raised.

### Domain 5 (Q49–Q56)

**Q49: C.** `source` is mandatory. `version` applies to registry modules and is optional.

**Q50: B.** Local paths must begin with `./` or `../`.

**Q51: B.** GitHub sources start with `github.com`, **not** `https://`. The `https://` form gave "no source URL was returned".

**Q52: B.** Parents can only read a child's **outputs**: `module.<module_name>.<output_name>`. `module.ec2.id` fails because no such output exists.

**Q53: A and C.** A hard-coded provider block overrides what the caller wants (the demo created resources in `us-east-1` even though the root asked for `ap-south-1`). Aliased providers are **never** inherited (D wrong).

**Q54: B.** Declare `configuration_aliases = [aws.prod]` in the child's `required_providers`, and the caller passes `providers = { aws.prod = aws.mumbai }`.

**Q55: A, B and D.** The full list is: public GitHub repo, `terraform-<PROVIDER>-<NAME>` name, repository description, standard module structure, `x.y.z` release tags.

**Q56: True.** `terraform init` downloads modules ("Initializing modules...") and must be re-run when a module `source` changes.

### Domain 6 (Q57–Q65)

**Q57: B.** State can contain plaintext secrets however they were supplied (literal, variable or `file()`). Anyone with repo access could read them. Keep **code in Git, state in a remote backend**.

**Q58: D.** The default is the local backend, writing `terraform.tfstate` in the working directory.

**Q59: B.** `terraform init` is required after configuring or changing a backend.

**Q60: B.** `use_lockfile = true` (default false). The older `dynamodb_table` setting is the legacy approach.

**Q61: False.** `.terraform.lock.hcl` locks **provider versions** and should be committed. The state lock is a temporary mechanism. Error text: *Error acquiring the state lock*.

**Q62: B.** `data.terraform_remote_state.<name>.outputs.<output_name>`. Only the other project's **outputs** are readable.

**Q63: B.** Non-default workspaces use `terraform.tfstate.d/<workspace>/terraform.tfstate`. The default workspace uses `terraform.tfstate`.

**Q64: A and C.** `new` creates and switches; `select` only switches (D wrong). `default` always exists (B wrong).

**Q65: A and C.** Secrets read from or written to Vault by Terraform are **persisted in state**, so secure the state. See [08](08-lifecycle-conditions-sensitive.md).

### Domain 7 (Q66–Q72)

**Q66: B.** `import { to = aws_security_group.mysg  id = "sg-..." }`. Requires Terraform **1.5+**.

**Q67: `generate-config-out`.** Full form: `terraform plan -generate-config-out=mysg.tf`. Review the generated code; it is a starting point.

**Q68: B.** A `removed` block with `lifecycle { destroy = false }` is the declarative alternative to `terraform state rm`. A `moved` block changes the address, not the existence.

**Q69: B.** `moved` updates the state address on apply, so no destroy/recreate. The CLI alternative is `terraform state mv`.

**Q70: A.** `TF_LOG_PATH` sends logs to a file; `TF_LOG` chooses the level (`TRACE` most verbose, then `DEBUG`, `INFO`, `WARN`, `ERROR`). Windows: `set`; Linux/macOS: `export`.

**Q71: B.** Core and providers are separate products with separate repositories. Fix provider bugs by upgrading the provider, and report in the provider's repo.

**Q72: False.** `taint` is deprecated; use `terraform apply -replace="ADDRESS"`.

### Domain 8 (Q73–Q80)

**Q73: B.** Organization (billing) > Project > Workspace. HCP Terraform is the renamed Terraform Cloud.

**Q74: C.** Air-gapped installation (offline bundle) is a **Terraform Enterprise** feature only.

**Q75: B.** `cloud` block → `terraform login` → `terraform init` → `plan/apply`. Local files, **remote execution**.

**Q76: A.** Remote runs do not see your laptop's environment. Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_REGION` as workspace environment variables and mark the keys sensitive.

**Q77: A and B.** Sentinel runs **after** the plan (and cost estimation) and **before** apply (C wrong). It is a paid-tier feature (D wrong). To stop manual console changes you need cloud-level controls such as AWS Config.

**Q78: B.** The `owners` team has all permissions. Put people in the least-privileged team they need. Workspace permission levels: Read, Plan, Write, Admin, Custom.

**Q79: A.** Remote state sharing on the source workspace plus a run trigger (connected workspace) on the downstream one. `tfe_outputs` is the more secure way to read outputs.

**Q80: A and B.** Health assessments = drift detection + continuous validation (Standard tier or higher). Cost estimation and policy check are **run stages**.

### Score yourself

| Score | Meaning |
|---|---|
| 72–80 | Excellent. Do a mock paper and rest |
| 60–71 | Good. Review the domains where you missed 2 or more |
| 48–59 | Revisit the cheat sheets and re-read the weak chapters |
| below 48 | Go back through the chapters and labs, then retry in a week |

---

## 🎯 Exam focus (summary)

- **Plan vs apply:** plan changes nothing and saves nothing to state. Apply changes things and saves outputs.
- **Variable precedence:** env < `terraform.tfvars` < `.json` < `*.auto.tfvars` < `-var`/`-var-file`. Know that `prod.tfvars` is not auto-loaded.
- **Version layers:** Terraform binary (`required_version`), provider (`required_providers` + constraints), exact pin (`.terraform.lock.hcl`). `init -upgrade` moves the lock forward.
- **Secrets:** `sensitive = true` hides output only; state is plaintext; Vault values land in state; ephemeral/write-only (1.11+) keep values out of state.
- **State edits:** `state rm`/`removed` = forget without destroy. `state mv`/`moved` = rename without recreate. `import` = adopt (1.5+). `-replace` = force recreate.
- **Count vs for_each:** index vs stable key; reordering lists breaks `count`.
- **Modules:** `source` required; read only outputs; avoid provider blocks in child modules; aliases are passed explicitly.
- **HCP Terraform:** Org > Project > Workspace; VCS/CLI/API; remote execution uses workspace variables; Sentinel levels; Enterprise = air-gapped.
- **Deprecated vs modern:** refresh, taint, DynamoDB locking, `vpc = true`, provider `version`, `remote` backend.

## Key takeaways

1. Revise by **retrieval and explanation**, not by re-reading. Use the self-explain checklist and the practice bank.
2. Spend most time on **domains 3, 4, 5 and 6**; collect easy marks from domain 8 vocabulary.
3. Many questions hide a **trap**: deprecated command, plan vs apply, resource vs data source, state vs config, lock file vs state lock.
4. **Troubleshoot version issues in order:** Terraform binary → provider version → lock file.
5. **Never hard-code credentials**; keep state out of Git; commit `.terraform.lock.hcl`.
6. Terraform merges all `.tf` files in a directory, so **file layout is for humans** and does not change infrastructure.
7. Data sources + functions + outputs + interpolation solve "dynamic" requirements without hard-coding.
8. **Always destroy** lab resources (unattached Elastic IPs and EC2 instances cost money).
9. Re-check the **official exam objectives** shortly before the exam; details such as price and question count change.

## Quick cheat-sheet: commands you must be able to type

```bash
terraform init [-upgrade] [-migrate-state] [-ignore-remote-version]
terraform fmt [-check] [-diff] [-recursive]
terraform validate
terraform plan [-out=FILE] [-target=ADDR] [-refresh=false] [-refresh-only] [-var "k=v"] [-var-file=F] [-generate-config-out=FILE]
terraform apply [FILE] [-auto-approve] [-replace="ADDR"] [-refresh-only]
terraform destroy [-target ADDR] [-auto-approve]
terraform output [NAME]
terraform show [FILE] [-json]
terraform graph | dot -Tsvg > graph.svg
terraform console
terraform state list | show ADDR | pull | push FILE | rm ADDR | mv SRC DST | replace-provider FROM TO
terraform workspace show | list | new NAME | select NAME
terraform login
terraform -version
aws configure
export TF_LOG=TRACE && export TF_LOG_PATH=terraform.txt     # Linux/macOS (Windows: set)
```

## Glossary

| Term | Meaning |
|---|---|
| **Drift** | Real infrastructure differs from state/config because of manual or outside changes |
| **Desired state** | What your configuration describes |
| **Current state** | What really exists |
| **Lock file** | `.terraform.lock.hcl`: provider versions and hashes (not the state lock) |
| **Backend** | Where state is stored (default: local) |
| **Address** | Identifier such as `aws_instance.web["a"]`; used by `state`, `import`, `moved`, `removed`, `-target`, `-replace` |
| **Workspace (CLI)** | Separate state for the same configuration |
| **Workspace (HCP)** | Unit holding code source, variables, state, credentials and runs |
| **Ephemeral value** | Value not saved in state or plan files |
| **Write-only argument** | Argument (`*_wo`) that accepts a value but is never persisted (Terraform 1.11+) |
| **Sentinel** | HashiCorp policy-as-code framework |
| **Air gap** | Isolation from the internet; supported by Terraform Enterprise |

## Where to go next

- Take the three timed browser papers: [paper-1.html](paper-1.html), [paper-2.html](paper-2.html), [paper-3.html](paper-3.html).
- Re-open any chapter from your weak list: [00](00-prerequisites.md), [01](01-iac-and-terraform-intro.md), [02](02-providers.md), [03](03-core-workflow.md), [04](04-state-basics.md), [05](05-resources-data-dependencies.md), [06](06-variables-outputs-locals.md), [07](07-types-loops-functions.md), [08](08-lifecycle-conditions-sensitive.md), [09](09-modules.md), [10](10-backends-locking-drift.md), [11](11-import-state-cli-logging.md), [12](12-hcp-terraform.md).
