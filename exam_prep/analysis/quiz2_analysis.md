# Quiz 2 analysis — score 36/57 (21 incorrect, 36 correct; counted from the file)

Note: "What I chose" is inferred from the file markers ("Your selection/answer is correct/incorrect" = I picked it; "Correct selection" with no "Your" = a right option I did NOT pick).

## Missed questions

### Q2 — Sensitive data & state best practices (Objective 4h)
- **Question (gist):** Vault for short-lived creds + remote backend; pick FOUR best-practice statements on sensitive data and state.
- **What I chose / missed:** Picked 2 right (HCP encrypts state + RBAC; remote backend encryption/access controls) and 2 wrong (Vault means secrets never in state; `sensitive = true` keeps value out of state). MISSED two right ones: local state is plain text; restrict + audit access to state.
- **Correct answer(s):**
  - "When using local state, the state file is stored in plain text by default"
  - "Terraform state can include sensitive data, so it is essential to restrict access to the state and audit any changes."
  - "HCP Terraform encrypts state at rest (and in transit) and provides RBAC to restrict who can access state"
  - "A properly configured remote backend improves security via encryption and access controls."
- **Why it's right:** Local state is plain JSON; state can hold secrets, so lock down and audit access; HCP Terraform and secured remote backends add encryption + access control.
- **Why the trap options are wrong:** "Vault ensures secrets never appear in state" — a standard Vault data source's returned credential IS recorded in state (only a supported ephemeral Vault resource passed to an ephemeral/write-only argument keeps it out of state and saved plans). "`sensitive = true` prevents storage in state" — it only redacts plan/apply display; value is still in state.
- **Concept to remember:** Secrets can still land in state (even with Vault or `sensitive = true`), so always protect and audit the state itself.
```hcl
output "db_pw" {
  value     = aws_db_instance.db.password
  sensitive = true   # hidden in CLI output only; STILL in terraform.tfstate
}
```

### Q3 — Passing a variable into a child module (Objective 5b)
- **Question (gist):** Child `modules/web` uses `var.env`; how to make it work?
- **What I chose / missed:** Chose "`parent.var.env`" reference from the child.
- **Correct answer(s):** "Declare variable "env" {} in the child module and pass it from root using env = var.env"
- **Why it's right:** Variables are scoped per module; the child declares the input, the root supplies it in the `module` block.
- **Why the trap options are wrong:** locals in root are not inherited by children; `terraform workspace` is for state/env separation, not passing values; there is no `parent.` reference syntax (no implicit parent access).
- **Concept to remember:** A child module only sees what you explicitly hand it through its declared input variables.
```hcl
# modules/web/variables.tf
variable "env" {}
# root main.tf
module "web" {
  source = "./modules/web"
  env    = var.env
}
```

### Q4 — .terraform.lock.hcl (Objective 3b)
- **Question (gist):** What is `.terraform.lock.hcl` and when is it created/modified?
- **What I chose / missed:** Chose "concurrency lock, updated on every terraform plan".
- **Correct answer(s):** "The .terraform.lock.hcl file is a dependency lock file used by Terraform. It is created or updated every time you run terraform init."
- **Why it's right:** It records the exact provider versions/hashes chosen; `init` writes/updates it; it belongs in version control, lives in the root working dir.
- **Why the trap options are wrong:** "state snapshot updated on apply" — state is `terraform.tfstate`; "concurrency lock on plan" — state locking is a separate mechanism, not this file; "backend connection/credentials" — the file holds no backend/credentials.
- **Concept to remember:** `.terraform.lock.hcl` pins provider versions, `terraform init` writes it, and you commit it to Git.

### Q6 — Using a new provider (Objective 2a)
- **Question (gist):** Required steps before a new provider can be used (select two).
- **What I chose / missed:** Picked `terraform init` (correct). Missed: declare/configure the provider in the configuration.
- **Correct answer(s):** "Initialize the working directory using terraform init to download and install the provider." AND "Declare and configure the provider in the configuration with the required arguments."
- **Why it's right:** Terraform must know the provider (provider block / `required_providers` / resource from it), then `init` downloads the plugin.
- **Why the trap options are wrong:** `terraform validate` checks syntax, does not fetch plugins; provider config is not placed in `terraform.tfvars`/`-var` (those are for variables).
- **Concept to remember:** Declare the provider in code, then run `terraform init` to download it.
```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" { region = "us-west-2" }
```

### Q8 — Advisory vs mandatory policies in HCP Terraform (Objective 8b)
- **Question (gist):** Some projects need advisory checks, others mandatory enforcement; how to configure?
- **What I chose / missed:** Chose "run triggers based on workspace names".
- **Correct answer(s):** "Configure different enforcement levels for each policy set and apply them to the appropriate workspaces or projects."
- **Why it's right:** Enforcement level is set per policy set (advisory / soft mandatory / hard mandatory); attach each set to the workspaces/projects that need it.
- **Why the trap options are wrong:** Separate orgs = needless overhead; run triggers only chain runs between workspaces (not policy enforcement); org-wide policy then disabling per workspace = inconsistent.
- **Concept to remember:** Enforcement strength belongs to the policy set, and you attach sets to workspaces or projects.

### Q10 — Partial backend configuration (Objective 6c)
- **Question (gist):** Keep sensitive S3 backend values (bucket, region) out of VCS while keeping the rest in code.
- **What I chose / missed:** Chose a separate `backends.tf` with secrets, gitignored.
- **Correct answer(s):** "define the backend block with only the type, then pass the bucket and region values using -backend-config flag during terraform init"
- **Why it's right:** That is exactly partial backend configuration: empty `backend "s3" {}` + values at init (via flags or a `-backend-config=<file>`).
- **Why the trap options are wrong:** `terraform.tfvars` can't hold backend settings (backend blocks can't use variables); custom env vars `TF_BACKEND_BUCKET` don't exist; `backends.tf` with values is a full config just hidden from Git, not partial config.
- **Concept to remember:** Leave the backend block mostly empty and feed the rest at `terraform init -backend-config`.
```hcl
terraform { backend "s3" {} }
```
```bash
terraform init -backend-config="bucket=my-bucket" -backend-config="region=us-west-2"
terraform init -backend-config=path/to/file
```

### Q14 — External tools between plan and apply (Objective 8b)
- **Question (gist):** HCP Terraform feature to run third-party security scanners between plan and apply.
- **What I chose / missed:** Chose "health assessments".
- **Correct answer(s):** "run tasks"
- **Why it's right:** Run tasks call external services after plan / before apply (security scan, cost estimate); can be advisory or mandatory.
- **Why the trap options are wrong:** health assessments = drift/continuous validation over time; run triggers = one workspace's run queues another's; change requests = tracking proposed changes, not tool integration.
- **Concept to remember:** Run TASKS plug external tools into a run; run TRIGGERS chain workspaces.

### Q18 — Sharing credentials across workspaces (Objective 8c)
- **Question (gist):** Share third-party credentials across multiple workspaces (select three).
- **What I chose / missed:** Picked variable set (right), group into a project (right), and "variable in each workspace marked sensitive" (wrong). MISSED "apply the variable set to the project".
- **Correct answer(s):** "Create a variable set that includes the third-party credentials"; "Group the team's workspaces into a project"; "Apply the variable set to the project"
- **Why it's right:** A variable set can be scoped to a project, so all current and future workspaces in it inherit the credentials.
- **Why the trap options are wrong:** Run trigger to copy variables = needless complexity/risk; per-workspace variables = duplication and drift.
- **Concept to remember:** Variable set + project scope = define once, inherited by every workspace in the project (scope credentials as narrowly as possible).

### Q21 — Core Terraform workflow (Objective 3a)
- **Question (gist):** The three core workflow steps (select three).
- **What I chose / missed:** Picked Plan, Apply (right) and Destroy (wrong). MISSED Write.
- **Correct answer(s):** "Write - Author infrastructure as code." "Plan - Preview changes before applying." "Apply - Provision reproducible infrastructure."
- **Why it's right:** Official core workflow is Write, Plan, Apply.
- **Why the trap options are wrong:** Import, Validate and Destroy are useful commands but not part of the three core steps.
- **Concept to remember:** Core workflow = Write, Plan, Apply (init/validate/destroy/import are supporting).

### Q23 — What a child module can access (Objective 5b)
- **Question (gist):** Root has vars in `terraform.tfvars`; child called with only `source`. What can the child access by default?
- **What I chose / missed:** Chose "all root variables; children inherit automatically".
- **Correct answer(s):** "Only values passed to it via the module block since root variables are not automatically accessible inside the module."
- **Why it's right:** No implicit inheritance of variables, locals, or outputs.
- **Why the trap options are wrong:** Inheritance doesn't exist; locals are module-scoped, not global; outputs flow child to parent, never parent to child.
- **Concept to remember:** Modules are sealed boxes: inputs in via the module block, outputs out via `output`.
```hcl
module "web" {
  source = "./modules/web"
  image  = data.aws_ami.ubuntu.id   # explicit input
}
```

### Q25 — Advantages of IaC (Objective 1b)
- **Question (gist):** Pick five advantages of IaC.
- **What I chose / missed:** Picked "replaces dev languages like Go and .Net" (wrong). MISSED "recreate infrastructure for disaster recovery".
- **Correct answer(s):** Easy to learn/write; consistency/standardization; ability to recreate infrastructure for disaster recovery; repeatable/reusable; automate manual tasks.
- **Why it's right:** IaC = codified, repeatable, reproducible infra (DR rebuild, consistency, automation).
- **Why the trap option is wrong:** IaC does not replace application development languages.
- **Concept to remember:** IaC benefits: consistency, repeatability, automation, version control, and rebuilding infra for disaster recovery; it never replaces app code.

### Q26 — Implicit vs explicit dependencies (Objective 4f)
- **Question (gist):** True/False: Terraform manages dependencies only if `depends_on` is set.
- **What I chose / missed:** Chose True.
- **Correct answer(s):** "False"
- **Why it's right:** Terraform builds a resource graph from references (implicit dependencies); `depends_on` is only for hidden/non-referenced dependencies.
- **Why the trap option is wrong:** "True" ignores implicit dependency detection.
- **Concept to remember:** Referencing another resource's attribute creates the dependency automatically; `depends_on` is the exception.

### Q28 — Force recreate a resource (Objective 3f)
- **Question (gist):** Command that forces destroy-and-recreate of a resource even with no config change.
- **What I chose / missed:** Chose `terraform apply -refresh-only`.
- **Correct answer(s):** "terraform apply -replace=<address>"
- **Why it's right:** `-replace` marks that one resource for replacement during apply (useful for degraded/damaged resources).
- **Why the trap options are wrong:** `-refresh-only` only updates state to match reality, changes nothing; `terraform destroy` removes everything; `terraform fmt` just formats files.
- **Concept to remember:** To rebuild one resource on purpose use `terraform apply -replace=ADDRESS` (it replaces the old `taint`).
```bash
terraform apply -replace="aws_instance.web"
```

### Q32 — Quick syntax check after refactor (Objective 3c)
- **Question (gist):** Fastest way to catch syntax errors before `plan` after splitting files.
- **What I chose / missed:** Chose `terraform fmt -recursive`.
- **Correct answer(s):** "run terraform validate"
- **Why it's right:** Validates syntax and internal consistency without contacting providers or state.
- **Why the trap options are wrong:** `fmt` only reformats style; `init` downloads providers/modules/backend; `plan` is slower and talks to providers/state.
- **Concept to remember:** `fmt` = looks, `validate` = correctness, `plan` = what would change.

### Q35 — What is a Terraform plugin (Objective 2b)
- **Question (gist):** Which of module/provider/backend/variable is a plugin.
- **What I chose / missed:** Chose "backend".
- **Correct answer(s):** "provider"
- **Why it's right:** A provider is a plugin binary (written in Go) that translates Terraform config into API calls.
- **Why the trap options are wrong:** module = reusable group of resources; backend = config setting for state storage/operations; variable = input parameter.
- **Concept to remember:** Providers are the plugins; modules, backends, and variables are just configuration.

### Q38 — Provider configurations in modules (Objective 2c)
- **Question (gist):** True statements about provider configs in modules (select three).
- **What I chose / missed:** Picked `providers` argument (right), inherit default providers (right), and "modules with provider blocks can still use depends_on if providers passed explicitly" (wrong). MISSED "modules containing provider blocks cannot be used with for_each".
- **Correct answer(s):** "Modules containing provider blocks cannot be used with the for_each argument"; "The providers argument in a module block allows explicit passing of specific provider configurations"; "Child modules automatically inherit the default provider configurations from their parent module"
- **Why it's right:** A module with its own provider blocks is incompatible with `for_each`, `count`, and `depends_on`; reusable modules should receive providers from the caller (implicitly or via `providers = {}`).
- **Why the trap options are wrong:** the depends_on option contradicts the rule: a module that contains its own provider blocks cannot use depends_on, count or for_each, and passing providers explicitly does not change that; "children must always define own provider blocks" is the opposite of best practice.
- **Concept to remember:** Don't put provider blocks inside reusable modules; let them inherit or pass `providers = {}` (otherwise no `for_each`/`count`/`depends_on`).
```hcl
module "vpc" {
  source    = "./modules/vpc"
  providers = { aws = aws.west }
}
```

### Q40 — Variable scope levels in HCP Terraform (Objective 8c)
- **Question (gist):** Scope levels for providing variables to workspaces (select three).
- **What I chose / missed:** Picked project-scoped variable set (right), multiple workspaces with a variable set (right), and "all workspaces across multiple organizations" (wrong). MISSED "single workspace defining variables directly".
- **Correct answer(s):** "All current and future workspaces and Stacks within a project using a variable set."; "A single workspace by defining variables directly in that workspace."; "Multiple workspaces with a variable set" (global scope within an org also exists per the overall explanation).
- **Why it's right:** Scopes are: workspace-local variables, variable sets scoped to selected workspaces, to a project, or global in one org.
- **Why the trap option is wrong:** Variable sets are org-level objects; nothing spans multiple organizations.
- **Concept to remember:** Variables live at workspace level or in an organization's variable sets (global / project / selected workspaces); never across organizations.

### Q49 — Before running `terraform import` (Objective 7a)
- **Question (gist):** What must you do before running the `terraform import` command?
- **What I chose / missed:** Chose "add import blocks to the configuration".
- **Correct answer(s):** "update the Terraform configuration file to include new resource blocks that match the resources you want to import"
- **Why it's right:** CLI `terraform import` only writes into state; it does not generate config, so you must write the `resource` block first.
- **Why the trap options are wrong:** Import blocks are the alternative config-driven method (use import block OR the command, not both); hand-editing state is wrong; `-refresh-only` isn't required.
- **Concept to remember:** CLI import needs an existing empty `resource` block to map to; import blocks are the separate plan/apply way.
- **Ambiguity note:** The file says the exam objective 7a lists the CLI command explicitly, and Q12 shows import blocks are valid too; the answer here hinges on the word "terraform import command".
```bash
# 1. write: resource "aws_instance" "example" { ... }
terraform import aws_instance.example i-abcd1234
```

### Q51 — Reading a module block (Objective 5a)
- **Question (gist):** `module "servers" { source = "./modules/btk-cluster"  servers = 5 }`; which statements are correct (select two)?
- **What I chose / missed:** Picked "download from public registry on init" (wrong), "`servers` must be declared as an output in the child" (wrong), and "main.tf is the root (calling) module" (right). MISSED "btk-cluster refers to a local child module on disk". (File shows 2 wrong + 1 right selections for a select-two question; ambiguous how that was recorded.)
- **Correct answer(s):** "btk-cluster refers to a local child module on disk"; "main.tf is the root (calling) module"
- **Why it's right:** `./` path = local module, no registry download; the file containing the module block is the calling (root) module.
- **Why the trap options are wrong:** Registry sources look like `namespace/name/provider`; `servers = 5` is an INPUT, so the child needs `variable "servers"`, not an output.
- **Concept to remember:** A source starting with `./` or `../` is a local module; arguments in the module block are inputs (variables), not outputs.

### Q52 — Combining tag maps (Objective 4e)
- **Question (gist):** Combine `var.common_tags` and `local.resource_tags` (both maps).
- **What I chose / missed:** Chose `concat(...)`.
- **Correct answer(s):** "merge(var.common_tags, local.resource_tags)"
- **Why it's right:** `merge` combines maps; on duplicate keys, later maps win.
- **Why the trap options are wrong:** `concat` joins lists; `flatten` flattens nested lists; `join` makes a string from a list.
- **Concept to remember:** Maps use `merge()`, lists use `concat()`.
```hcl
tags = merge(var.common_tags, local.resource_tags)
```

### Q57 — Upgrading a module version (Objective 5d)
- **Question (gist):** Safely move a module from 5.2.0 to 5.3.0 (select two).
- **What I chose / missed:** Picked `terraform init -upgrade` (right). MISSED updating the version constraint.
- **Correct answer(s):** "update the version argument to allow 5.3.0 using version = "~> 5.3.0"" AND "run terraform init -upgrade to download the new module version"
- **Why it's right:** First loosen the constraint so 5.3.0 is permitted, then `init -upgrade` fetches the newest allowed version.
- **Why the trap options are wrong:** Deleting the lock file isn't the safe/right way (lock file is for providers; unneeded risk); `~> 5.2.0` allows only 5.2.x, so 5.3.0 is excluded.
- **Concept to remember:** `~> 5.2.0` stays within 5.2.x; to reach 5.3.0 change the constraint, then run `terraform init -upgrade`.
```hcl
module "compute" {
  source  = "azure/compute/azurerm"
  version = "~> 5.3.0"
}
```
```bash
terraform init -upgrade
```

## Quick reminders from correct answers
- **Q12 (3e):** Config-driven `import {}` block: just `terraform plan` then `terraform apply` (no `terraform import` command, no `-import-only`).
- **Q16 (4d):** Map keys with hyphens need brackets: `var.metadata["build-tag"]` (dot form reads as `build - tag`).
- **Q19 (6d):** Keep `moved` blocks for at least a full apply cycle across all users/automation; remove later.
- **Q20 (3d):** `~` = update in place; `-/+` = destroy and recreate.
- **Q24 (4d):** `map(string)` values must all be strings (`"true"`, not `true`); maps use `{ k = "v" }`.
- **Q37 (4h):** `sensitive = true` only redacts display; value is still stored in state.
- **Q39 (6b):** Not all remote backends support locking; S3 now uses native locking via `use_lockfile` (DynamoDB locking deprecated).
- **Q55 (4g):** Check a resource's attribute after creation with a `postcondition` in its `lifecycle` block; `precondition` runs before; `validation` is for variables.
- (Also: Q56 CI formatting check = `terraform fmt -check`; Q15 variable `validation` blocks fail at plan time.)

## Objective tally (missed count)
| Objective | Missed | Questions |
|---|---|---|
| 8b HCP governance | 2 | Q8, Q14 |
| 8c HCP workspaces/projects/variable sets | 2 | Q18, Q40 |
| 5b Variable scope in modules | 2 | Q3, Q23 |
| 1b Advantages of IaC | 1 | Q25 |
| 2a Install/version providers | 1 | Q6 |
| 2b How Terraform uses providers | 1 | Q35 |
| 2c Multiple providers / module providers | 1 | Q38 |
| 3a Terraform workflow | 1 | Q21 |
| 3b Initialize working dir | 1 | Q4 |
| 3c Validate configuration | 1 | Q32 |
| 3f Destroy / replace | 1 | Q28 |
| 4e Expressions and functions | 1 | Q52 |
| 4f Resource dependencies | 1 | Q26 |
| 4h Sensitive data / Vault | 1 | Q2 |
| 5a Module sources | 1 | Q51 |
| 5d Module versions | 1 | Q57 |
| 6c Remote state / backend block | 1 | Q10 |
| 7a Import existing infra | 1 | Q49 |
| **Total** | **21** | |

By domain: Obj 8 (HCP Terraform) 4; Obj 5 (Modules) 4; Obj 3 (Core workflow) 4; Obj 4 (Configuration) 3; Obj 2 (Fundamentals) 3; Obj 6 (State) 1; Obj 7 (Maintain) 1; Obj 1 (IaC) 1.
