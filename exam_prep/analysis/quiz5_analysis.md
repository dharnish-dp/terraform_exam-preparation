# Quiz 5 analysis — score 37/57 (20 incorrect, 37 correct)

Note on multi-select: "Correct selection" in the file = a right option I did NOT pick; "Your selection is incorrect" = a wrong option I picked.

## Missed questions

### Q1 — HCP Terraform "remote operation" (Objective 8d)
- **Question (gist):** What does it mean to run Terraform as a remote operation in HCP Terraform?
- **What I chose / missed:** Chose "runs execute only on your local machine but store state in HCP Terraform".
- **Correct answer(s):** "Terraform runs are managed and executed on HCP Terraform infrastructure"
- **Why it's right:** HCP Terraform runs the workload on its own disposable VMs. Runs can start from VCS webhooks, the UI, the API or the CLI. With the CLI, progress streams to your terminal.
- **Why the traps are wrong:**
  - Local execution + remote state is the "local execution mode" idea, not a remote operation.
  - "Stored in Git but not executed" is meaningless.
  - "Executed locally via browser session" is wrong because execution is on HCP infrastructure.
- **Concept to remember:** A remote operation means HCP Terraform's servers do the plan and apply, even if you type the command locally.

### Q3 — Fail early if memory < 4 GB (Objective 4g)
- **Question (gist):** Enforce at least 4 GB VM memory and fail before creation (select two).
- **What I chose / missed:** Chose precondition (correct) and a `check` block (wrong). Missed the variable `validation` block.
- **Correct answer(s):** "Add a validation block to the variable" (`condition = var.memory >= 4096`) and "Add a lifecycle block with a precondition to the resource".
- **Why it's right:**
  - Variable validation runs as soon as the value is known, before planning.
  - A precondition runs before the resource is created or changed, so it errors with your message and no creation is attempted.
- **Why the traps are wrong:**
  - A postcondition runs after creation, so the VM would already exist.
  - A `check` block only warns and never blocks (the file's explanation for it is vague, but Q6 confirms it is non-blocking).
- **Concept to remember:** To block bad input before anything is built, use variable `validation` or a resource `precondition`; `check` blocks only warn and postconditions are too late.
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
    precondition {
      condition     = var.memory >= 4096
      error_message = "Memory must be at least 4096 MB."
    }
  }
}
```

### Q5 — Organizing many HCP workspaces (Objective 8c)
- **Question (gist):** Dozens of workspaces across teams. Simplify structure, improve access control, group by function.
- **What I chose / missed:** Chose "create multiple organizations and move workspaces between them".
- **Correct answer(s):** "place each team-related workspace into a team project"
- **Why it's right:** A project is a folder holding workspaces. Every workspace belongs to exactly one project, and you apply permissions per project.
- **Why the traps are wrong:**
  - Multiple orgs add overhead and make access control harder.
  - Tags only help filtering and give no structure or access boundary.
  - Variable sets share config values, not structure.
- **Concept to remember:** Projects are the folders of HCP Terraform: group workspaces and set team access at the project level.

### Q6 — When each validation mechanism runs (Objective 4g)
- **Question (gist):** True statements about how variable validation, preconditions, postconditions and check blocks are evaluated (select two).
- **What I chose / missed:** Chose "variable validation evaluated early" (correct) and "check blocks halt execution" (wrong). Missed "preconditions and postconditions cause Terraform to halt with an error".
- **Correct answer(s):**
  - "variable validation blocks are evaluated early during terraform plan, before the plan is generated"
  - "preconditions and postconditions cause Terraform to halt execution with an error if they fail"
- **Why it's right:** Pre- and postconditions are hard assertions that stop the run. Variable validation fires as soon as the variable has a value.
- **Why the traps are wrong:**
  - Postconditions run after the resource operation, not before.
  - Mechanisms are not all evaluated simultaneously in apply.
  - `check` blocks only produce warnings and do not block.
- **Concept to remember:** Validation and pre/postconditions stop the run when they fail; `check` blocks only warn.

### Q11 — Testing modules and the root module (Objective 5c)
- **Question (gist):** Validate several new modules plus the root module (select two).
- **What I chose / missed:** Chose `terraform test` (correct) and `terraform validate` to run assertions (wrong). Missed adding `.tftest.hcl` files with run and assert blocks.
- **Correct answer(s):** "add .tftest.hcl files with run and assert blocks to each module" and "run the terraform test command to validate the modules".
- **Why it's right:** `terraform test` finds `.tftest.hcl` files and runs their `run` blocks (plan or apply in an isolated context). It evaluates `assert` blocks and reports pass or fail without touching real infrastructure.
- **Why the traps are wrong:**
  - `validate` only checks syntax and internal consistency; it runs no assertions.
  - `apply` would create real infrastructure and does not run test assertions.
  - `plan` does not run test-file assertions.
- **Concept to remember:** Write `.tftest.hcl` files, then run `terraform test`; `validate` only checks syntax.
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
```
terraform test
```

### Q12 — Can Terraform work without state? (Objective 2d)
- **Question (gist):** True or False: under special circumstances Terraform can be used without state.
- **What I chose / missed:** Chose True.
- **Correct answer(s):** False
- **Why it's right:** State is always required. It maps config to real objects and stores metadata. You can choose where it is stored (local or remote), but not skip it.
- **Why the trap is wrong:** There is no state-less mode.
- **Concept to remember:** State is mandatory in Terraform; you only choose where it lives.

### Q18 — Why replace sharing terraform.tfstate via Slack (Objective 6a)
- **Question (gist):** Five engineers pass a local state file around. What is the primary reason to move to a remote backend?
- **What I chose / missed:** Chose "local backend does not support terraform plan with multiple team members".
- **Correct answer(s):** "Remote backends provide state locking to prevent concurrent modifications and centralized storage for team collaboration."
- **Why it's right:** Manual sharing is error-prone. Remote backends give one central state, locking (one apply at a time) and usually versioning and encryption.
- **Why the traps are wrong:**
  - Local backend can manage AWS fine.
  - State is always JSON, and there is no binary format.
  - Local backend does support plan; the limitation is locking and central storage.
- **Concept to remember:** Remote backend = one shared state plus a lock so teammates cannot clobber each other.

### Q19 — VCS-driven workflow on a pull request (Objective 8a)
- **Question (gist):** What happens automatically in HCP Terraform when a PR with Terraform changes is opened?
- **What I chose / missed:** Chose "creates a new workspace for the PR branch".
- **Correct answer(s):** "HCP Terraform runs a speculative plan and posts the results as a comment on the pull request"
- **Why it's right:** A speculative plan is plan-only, so it makes no changes. Apply happens only after merge, and only if configured.
- **Why the traps are wrong:**
  - Auto-apply to staging on PR is wrong.
  - It never auto-merges the PR.
  - It does not create a workspace per branch.
- **Concept to remember:** Open a PR and you get a speculative (plan-only) run shown on the PR; merge triggers the real run.

### Q20 — Destroy everything except one server, leave it running (Objective 6d)
- **Question (gist):** Destroy all resources except one web server, which keeps running but is no longer managed.
- **What I chose / missed:** Chose `prevent_destroy = true` on the web server, then destroy.
- **Correct answer(s):** "Add a removed block with from = <address> to stop managing the web server, then run terraform apply followed by terraform destroy". The file's explanation adds that `lifecycle { destroy = false }` goes inside the `removed` block.
- **Why it's right:** `removed` with `destroy = false` drops the resource from state on the next apply without deleting the real VM. After that, `terraform destroy` only touches what remains in state.
- **Why the traps are wrong:**
  - `prevent_destroy` makes `terraform destroy` error out on that resource (the file's explanation of this is loose), and the resource stays managed.
  - Deleting the block plus `-refresh-only` leaves it in state, so destroy kills it.
  - `destroy -target` leaves it still managed.
- **Concept to remember:** To "forget" a resource without deleting it, use a `removed` block with `destroy = false`, then apply.
- **Ambiguity:** The option text only shows `from = <address>`; `destroy = false` is stated only in the explanation.
```hcl
removed {
  from = aws_instance.web
  lifecycle {
    destroy = false
  }
}
```
```
terraform apply
terraform destroy
```

### Q21 — Where provider is downloaded from (Objective 2a)
- **Question (gist):** `source = "hashicorp/kubernetes"` in `required_providers`. Where is it downloaded from?
- **What I chose / missed:** Chose "from the hashicorp/kubernetes directory where Terraform is executed".
- **Correct answer(s):** "the official Terraform public registry"
- **Why it's right:** A short `namespace/name` source defaults to the public registry (registry.terraform.io).
- **Why the traps are wrong:**
  - There is no local directory lookup.
  - Providers are not pulled from a VCS repo.
  - Providers are not pulled from the Kubernetes GitHub repo.
- **Concept to remember:** `namespace/name` with no hostname means the public Terraform Registry.
```hcl
required_providers {
  kubernetes = { source = "hashicorp/kubernetes", version = "2.38.0" }
}
```

### Q24 — Which statement about IaC benefits is INACCURATE (Objective 1b)
- **Question (gist):** Pick the inaccurate IaC benefit.
- **What I chose / missed:** Chose "creates self-documenting infrastructure" (this is a true benefit). Misread the "inaccurate" wording.
- **Correct answer(s):** "eliminates API communication to the target platform"
- **Why it's right:** IaC and Terraform depend on provider plugins talking to platform APIs.
- **Why the traps are wrong:** Versioning, sharing/reuse and self-documenting code are all genuine IaC benefits.
- **Concept to remember:** Terraform never removes API calls; providers make them for you. Read "inaccurate/NOT" questions twice.

### Q28 — import block syntax (Objective 7a)
- **Question (gist):** Pick the correct import block for an Azure resource group, with the resource block already written.
- **What I chose / missed:** Chose the block using `from =` and `to =`.
- **Correct answer(s):**
```hcl
import {
  to = azurerm_resource_group.production
  id = "/subscriptions/.../resourceGroups/production-rg"
}
```
- **Why it's right:** An import block has exactly two required attributes. `to` is the config resource address and `id` is the provider-specific ID of the existing object.
- **Why the traps are wrong:**
  - `from` is not an import attribute (it belongs to `moved` and `removed` blocks).
  - `address`/`name` are invalid.
  - `resource`/`resource_id` are invalid.
- **Concept to remember:** `import { to = <resource address>  id = "<real-world ID>" }`.

### Q31 — Protect against unexpected registry module updates (Objective 5a)
- **Question (gist):** What argument prevents surprises when a registry module is updated?
- **What I chose / missed:** Chose `depends_on`.
- **Correct answer(s):** `version`
- **Why it's right:** `version` takes a constraint string and works only for registry modules. Always pin it to avoid unwanted changes.
- **Why the traps are wrong:**
  - `for_each` makes multiple instances.
  - `lifecycle` controls resource behaviour.
  - `depends_on` sets ordering.
- **Concept to remember:** Pin registry modules with `version = "..."`.
```hcl
module "x" {
  source  = "namespace/name/provider"
  version = "~> 1.2"
}
```

### Q33 — HCP Terraform workspace health checks (Objective 8b)
- **Question (gist):** Benefits of enabling workspace health checks (select two).
- **What I chose / missed:** Chose both wrong options (Sentinel before every apply, and automatic rollback). Missed both correct ones.
- **Correct answer(s):**
  - "Detecting drift by checking whether real infrastructure still matches what Terraform expects."
  - "Continuously validating that resources continue to meet the required conditions you've defined."
- **Why it's right:** Health assessments = drift detection + continuous validation (your custom conditions), run periodically.
- **Why the traps are wrong:**
  - Sentinel is a separate policy feature.
  - There is no auto-rollback.
- **Concept to remember:** Health checks watch (drift plus condition checks); they never fix or roll back.

### Q35 — Securely sharing state across teams (Objective 6c)
- **Question (gist):** Recommended approach for teams to consume shared state securely.
- **What I chose / missed:** Chose "encrypt terraform.tfstate and store in a secrets manager like Vault".
- **Correct answer(s):** "configure a remote backend that supports locking and access control"
- **Why it's right:** It centralizes state with locking, versioning and permissions.
- **Why the traps are wrong:**
  - State in VCS is an anti-pattern.
  - Copying local files causes conflicts and data loss.
  - Secrets managers are not state stores (no locking or backend behaviour).
- **Concept to remember:** Share state through a remote backend with locking, not through Git or Vault.
```hcl
terraform {
  backend "s3" { bucket = "..." key = "..." dynamodb_table = "..." }
}
```

### Q36 — True statements about the state file (Objective 2d)
- **Question (gist):** Select four true statements.
- **What I chose / missed:** Chose three correct plus "state stores a complete history of changes" (wrong). Missed "remote state is recommended when more than one person manages the infrastructure".
- **Correct answer(s):**
  - "remote state is recommended when more than one person wants to manage the infrastructure managed by Terraform"
  - "by default, state is stored in a file named terraform.tfstate in the current working directory"
  - "it may contain sensitive data that you might not want others to view"
  - "the state file is formatted using JSON"
- **Why the traps are wrong:**
  - State holds only the current mapping, not a history.
  - Terraform does not automatically encrypt state everywhere.
- **Concept to remember:** State is JSON, local by default, may hold secrets, holds the current snapshot only, and should be remote for teams.

### Q42 — HCP drift detection auto-remediation (Objective 8b)
- **Question (gist):** True or False: HCP Terraform drift detection can automatically run apply to fix drift.
- **What I chose / missed:** Chose True.
- **Correct answer(s):** False
- **Why it's right:** Drift detection only detects and notifies. A human decides whether to run apply.
- **Why the trap is wrong:** There is no auto-remediation.
- **Concept to remember:** HCP drift detection reports drift; you fix it.

### Q51 — Expose a child module value to the root (Objective 5c)
- **Question (gist):** Which block in the child lets the root read the subnet ID?
- **What I chose / missed:** Chose `data` block.
- **Correct answer(s):** `output` block
- **Why it's right:** Children return values only via outputs, read in the parent as `module.<name>.<output>`.
- **Why the traps are wrong:**
  - `data` queries external or existing objects.
  - `terraform` block is global settings.
  - `resource` creates infrastructure.
- **Concept to remember:** Child exports with `output`; parent reads with `module.NAME.OUTPUT` (related to Q2).
```hcl
# child
output "subnet_id" { value = aws_subnet.main.id }
# root
module.network.subnet_id
```

### Q53 — How Terraform orders resource creation (Objective 3d)
- **Question (gist):** VNet, subnet and VM. How is creation order determined? (select two)
- **What I chose / missed:** Chose "implicit dependency via subnet referencing VNet ID" (correct) and "must manually use depends_on for all resources" (wrong). Missed "analyzes resource references to build a dependency graph automatically".
- **Correct answer(s):**
  - "Terraform analyzes resource references to build a dependency graph automatically"
  - "Terraform detects that the subnet references the Virtual Network's ID, establishing an implicit dependency"
- **Why the traps are wrong:**
  - `depends_on` is needed only when there is no reference.
  - Order is not alphabetical.
  - Order is not file order.
- **Concept to remember:** References create the dependency graph, so `depends_on` is only for hidden dependencies.

### Q54 — Data source feeding a new resource (Objective 4a)
- **Question (gist):** `data "google_compute_network"` plus a subnetwork resource that uses its `.id`. What does apply do?
- **What I chose / missed:** Chose "creates a new network called bk-company-network along with the subnet".
- **Correct answer(s):** "Terraform will create the subnet in the existing shared network without modifying the network itself"
- **Why it's right:** A `data` block only reads an existing object and does not create or manage it. The `resource` block creates the subnet.
- **Why the traps are wrong:**
  - Data sources can be referenced by resources.
  - Nothing is created for the network.
  - Nothing is imported into state.
- **Concept to remember:** `data` = read existing things; `resource` = create and manage things.
```hcl
data "google_compute_network" "shared" { name = "bk-company-network" }
resource "google_compute_subnetwork" "app" {
  network = data.google_compute_network.shared.id
}
```

## Quick reminders from correct answers
- **Q14 / Q20:** Deleting a resource block and running `terraform apply` destroys it. A `removed` block with `destroy = false` only forgets it in state.
- **Q16:** A `moved` block records a rename or move into a module so Terraform does not destroy and recreate the resource.
- **Q30 / Q34:** `.terraform.lock.hcl` pins provider versions (not modules). A relaxed or changed constraint needs `terraform init -upgrade`. Q34: a constraint the lock file no longer satisfies makes plan error until `init -upgrade`.
- **Q48:** `~> 3.0.0` allows only patch updates (>= 3.0.0, < 3.1.0). `~> 3.0` allows minor updates up to 4.0.
- **Q41:** `sensitive = true` only redacts CLI/UI output. Values are still stored in state and plan files. Use ephemeral values or write-only arguments to keep them out of state.
- **Q26:** A stuck lock is released with `terraform force-unlock <LOCK_ID>`, after confirming nothing is running.
- **Q9 / Q8:** Environment variables use `TF_VAR_<name>`. A `for_each` instance is addressed by key: `aws_subnet.app["private"].id`.
- **Q32 / Q23:** Before `validate`, run `terraform init` (it downloads providers and modules). `validate` does not create infrastructure.

## Objective tally (missed count)

| Objective | Missed | Questions |
|---|---|---|
| 4g Custom conditions | 2 | Q3, Q6 |
| 5c Use modules in configuration | 2 | Q11, Q51 |
| 2d Explain how Terraform uses and manages state | 2 | Q12, Q36 |
| 8b HCP collaboration and governance | 2 | Q33, Q42 |
| 8d HCP integration | 1 | Q1 |
| 8c Workspaces and projects | 1 | Q5 |
| 8a HCP create infrastructure | 1 | Q19 |
| 6a Local backend | 1 | Q18 |
| 6c Remote state / backend block | 1 | Q35 |
| 6d Drift and state management | 1 | Q20 |
| 2a Install and version providers | 1 | Q21 |
| 1b Advantages of IaC | 1 | Q24 |
| 7a Import existing infrastructure | 1 | Q28 |
| 5a How Terraform sources modules | 1 | Q31 |
| 3d Generate and review a plan | 1 | Q53 |
| 4a Resource and data blocks | 1 | Q54 |
| **Total** | **20** | |

By domain: HCP Terraform (8) = 5 misses; Terraform Configuration (4) = 3; Terraform State Management (6) = 3; Terraform Modules (5) = 3; Terraform Fundamentals (2) = 3; IaC (1) = 1; Core Workflow (3) = 1; Maintain Infrastructure (7) = 1. Pattern: HCP Terraform (Objective 8) is the weakest area, followed by custom-condition behaviour and wording slips ("inaccurate", "select two").
