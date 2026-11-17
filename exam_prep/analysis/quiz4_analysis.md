# Quiz 4 analysis — score 37/57 (20 incorrect)

Source: /Users/ddp/Desktop/terraform_course/quiz_result/quize4.txt. Multi-select questions are marked Incorrect if the selection set is wrong, so "missed" often means one wrong pick and one right answer left unticked.

## Missed questions

### Q5 — Moving a resource between stacks/states (Objective 6d)
- **Question (gist):** CI pipeline; move an existing resource from Stack A's state to Stack B's state without destroying it. Which TWO blocks enable the configuration-driven workflow?
- **What I chose / missed:** Chose `removed` block (right) + `moved` block (wrong). Missed `import` block.
- **Correct answer(s):** "removed block in the source stack" and "import block in the destination stack".
- **Why it's right:** `removed` tells the source stack to stop managing the address without deleting the real object; `import` in the destination binds the real object to a new address in the other state.
- **Trap options:** `moved` block = renames/relocates an address only within the SAME state file, never across states. `lifecycle` block = resource behaviour (prevent_destroy etc.), has nothing to do with moving between stacks.
- **Concept to remember:** To hand a resource from one state to another, use `removed` in the old stack and `import` in the new one; `moved` only works inside one state.
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

### Q8 — Advantages of IaC (Objective 1b)
- **Question (gist):** Which THREE are advantages of IaC for day-to-day operations?
- **What I chose / missed:** Chose API-driven workflows (right), version control (right), "ensures the security of applications" (wrong). Missed "self-service".
- **Correct answer(s):** "enables self-service for developers and operators alike"; "API-driven workflows"; "provides the ability to version control the infrastructure and application architecture".
- **Why it's right:** IaC lets others consume shared code by supplying variables, is driven by APIs rather than console clicks, and lives in VCS with PR/approval flow.
- **Trap options:** "ensures the security of applications" - IaC can help enforce practices but does not itself guarantee application security.
- **Concept to remember:** IaC benefits = self-service, API-driven automation, version control; it does NOT automatically make apps secure.

### Q9 — Managing permissions in HCP Terraform (Objective 8b)
- **Question (gist):** Which THREE are ways to manage permissions in HCP Terraform?
- **What I chose / missed:** Chose project-level team access (right), teams with workspace-level permissions (right), "workspace tags to automatically grant permissions" (wrong). Missed organization-level permissions.
- **Correct answer(s):** "Use organization-level permissions to control administrative access to settings and policies"; "Configure project-level team access to apply permissions across multiple workspaces"; "Create teams and assign workspace-level permissions to control which teams can plan or apply changes".
- **Why it's right:** Permissions are granted to teams at organization, project and workspace levels.
- **Trap options:** Tags only organise/filter workspaces, they never grant access. Public access mode does not exist (security risk). Per-user direct workspace permissions without teams is not the recommended approach (the file lists it as unselected/not correct).
- **Concept to remember:** HCP Terraform access = TEAMS at org, project, or workspace level; tags never grant permissions.

### Q12 — Terraform multi-cloud single workflow (Objective 1c)
- **Question (gist):** Company moving from ARM-only to Azure + AWS + on-prem Kubernetes wants one workflow and minimal retraining. Pick TWO approaches.
- **What I chose / missed:** Chose "keep ARM, CloudFormation, kubectl YAML" (wrong) + standardised CI/CD & common backend (right). Missed cloud-specific modules with a consistent interface.
- **Correct answer(s):** "Develop cloud-specific modules and offer a consistent input/output interface, enabling teams to reuse the same patterns."; "Standardize the CI/CD pipeline on the same lifecycle and a common remote backend for state/locking across all environments."
- **Why it's right:** Modules hide cloud-specific details behind a uniform interface; shared init/plan/apply plus a common backend keeps usage uniform.
- **Trap options:** Native tool per platform defeats the single-workflow goal. "Terraform cannot manage on-prem like Kubernetes" is false (providers exist for it).
- **Concept to remember:** One tool, one workflow (init/plan/apply), modules as the consistent interface, and a shared backend - across every cloud.

### Q17 — Keeping backend credentials out of .terraform and plan files (Objective 6c)
- **Question (gist):** Remote state; credentials must not appear in the `.terraform` directory or saved plan files.
- **What I chose / missed:** Chose "add secrets in the provider block + .gitignore it".
- **Correct answer(s):** "supply the credentials using environment variables on the machine executing plan/apply".
- **Why it's right:** Anything passed to `terraform init` for the backend (including `-backend-config` files/flags) can be written into `.terraform` metadata and into plan files; environment variables are not persisted.
- **Trap options:** Secrets in provider block = stored in config and can reach plan; `-backend-config=secrets.hcl` = written to `.terraform`/plan; `terraform.tfvars` + `-var-file` = stays in project dir and plan.
- **Concept to remember:** To keep backend secrets off disk, use environment variables, not files or `-backend-config`.

### Q20 — Migrating state between backends (Objective 2d)
- **Question (gist):** True/False: in most cases you can migrate state between supported backends at any time, even after first apply.
- **What I chose / missed:** Chose False.
- **Correct answer(s):** True.
- **Why it's right:** Change the backend config, run init, and Terraform prompts you to migrate existing state. Limits exist (e.g. HCP Terraform to local may not be supported).
- **Trap options:** False - wrongly implies backend is locked in after the first apply.
- **Concept to remember:** You can switch backends whenever you like; just re-run `terraform init` and accept the state migration.
```bash
terraform init -migrate-state
```

### Q21 — Benefits of providers (Objective 2a)
- **Question (gist):** Which THREE statements describe key benefits of providers?
- **What I chose / missed:** Chose abstract-API schema (right), one workflow across platforms (right), "manage storage, encryption, locking of state" (wrong). Missed the plugin-model option.
- **Correct answer(s):** "Extend Terraform via a plugin model so new services/features can ship without changing Terraform Core"; "Abstract the target platform's API behind a consistent resource/data-source schema and lifecycle"; "Enable one workflow to manage resources across many platforms by plugging in different providers".
- **Why it's right:** Providers are plugins that implement resources/data sources, so Core stays stable while ecosystems grow.
- **Trap options:** State storage/encryption/locking is the job of BACKENDS, not providers.
- **Concept to remember:** Providers = plugins that talk to APIs; backends = where state is stored and locked.

### Q25 — Sharing credentials/tags across HCP workspaces (Objective 8c)
- **Question (gist):** Define cloud credentials and common tags once and have updates apply to all workspaces in a project.
- **What I chose / missed:** Chose "credentials as local values inside each module + run tasks".
- **Correct answer(s):** "create a variable set in HCP Terraform and assign it to all workspaces so shared credentials are updated".
- **Why it's right:** A variable set is defined once (can hold sensitive values) and can be applied to many workspaces or a whole project; editing it updates all attached workspaces.
- **Trap options:** Per-workspace Variables page = manual, error-prone; committing credentials to terraform.tfvars = insecure and not central; locals + run tasks = not a credential-sharing mechanism (run tasks integrate third-party checks).
- **Concept to remember:** Shared variables across workspaces = variable sets.

### Q26 — After adding a new provider block (Objective 3b)
- **Question (gist):** Working VMware project; you add an `aws` provider block for Route53. What next?
- **What I chose / missed:** Chose `terraform plan`.
- **Correct answer(s):** "run terraform init to download the newly required AWS provider".
- **Why it's right:** New providers must be installed by init; plan/apply do not download providers automatically (they error with missing plugin).
- **Trap options:** apply "downloads automatically" - false; validate - needs plugins installed first (errors without init); plan - fails without the plugin.
- **Concept to remember:** New provider, new module, or backend change means re-run `terraform init`.
```bash
terraform init
```

### Q30 — Where providers can be installed from (Objective 2a)
- **Question (gist):** Select FOUR valid provider installation sources.
- **What I chose / missed:** Chose public registry, external registry with credentials, HCP private registry (all right) + "the provider's source code" (wrong). Missed local filesystem/network mirror.
- **Correct answer(s):** "the public Terraform Registry"; "loaded from a local filesystem or network mirror"; "a non-HashiCorp external registry that requires additional credentials"; "HCP Terraform private registry".
- **Why it's right:** Registries follow the registry protocol; mirrors are configured in the CLI config `provider_installation` block (air-gapped use).
- **Trap options:** Compiling from source / manually placing binaries is not an official install source. The file's overall explanation also says the plugin cache is not an install source.
- **Concept to remember:** Providers come from a registry (public, private, third-party) or a filesystem/network mirror - never "from source" or the plugin cache.

### Q31 — Local backend defaults (Objective 6a)
- **Question (gist):** Which statement best describes the local backend with default settings?
- **What I chose / missed:** Chose "requires an S3 bucket or similar for state locking".
- **Correct answer(s):** "Terraform writes state to a file named terraform.tfstate in the current working directory."
- **Why it's right:** Local backend = file on the operator's disk; no remote sharing, no server-side locking, no encryption by default.
- **Trap options:** Remote collaboration - no; automatic encryption at rest - no; S3 requirement - no (that is for the s3 backend).
- **Concept to remember:** Local backend = `terraform.tfstate` in the working directory, nothing remote.

### Q32 — When to enable verbose logging (Objective 7c)
- **Question (gist):** Select THREE scenarios where verbose logging is most appropriate.
- **What I chose / missed:** Chose provider API failures (right), unexpected plan changes (right), "routine daily production deployments for audit trails" (wrong). Missed state-locking troubleshooting.
- **Correct answer(s):** "when troubleshooting state locking issues to understand which operations are attempting to acquire the lock"; "when provider API calls are failing and you need to see the exact requests and responses"; "when investigating why Terraform is reporting unexpected changes during a plan operation".
- **Why it's right:** Verbose logs are for debugging internals: locks, API request/response, plan decisions.
- **Trap options:** `terraform fmt`, first `terraform init`, routine daily deployments - just noisy output, not needed.
- **Concept to remember:** Turn on `TF_LOG` only when troubleshooting, not for routine runs.
```bash
export TF_LOG=TRACE            # levels: TRACE DEBUG INFO WARN ERROR
export TF_LOG_PATH=./tf.log    # optional: write to file (does not enable logging by itself)
```

### Q35 — Removing an import block after import (Objective 7a)
- **Question (gist):** True/False: after a successful import via an import block and apply, you can immediately delete the import block without affecting management.
- **What I chose / missed:** Chose False.
- **Correct answer(s):** True.
- **Why it's right:** Once applied, the resource is in state and managed via its `resource` block; the import block is only needed during the import (removing it is recommended). Resource block must remain.
- **Trap options:** False - confuses the import block with the resource block.
- **Concept to remember:** The `import` block is a one-time instruction; the `resource` block is what keeps managing it afterwards.
```hcl
import {
  to = aws_s3_bucket.logs
  id = "my-existing-bucket"
}
```

### Q41 — Same subnet for three instances (Objective 4b)
- **Question (gist):** Three GCP instances must share a subnet that another resource in the same config created.
- **What I chose / missed:** Chose "use a data source for each instance to query the subnet by name".
- **Correct answer(s):** "reference the subnet ID attribute in each instance's network interface block".
- **Why it's right:** A direct cross-resource reference guarantees the same subnet and creates an implicit dependency (subnet created first).
- **Trap options:** Data source for something already in your config = unnecessary, no dependency ordering; three subnets with the same name = wrong/confusing; hardcoding the ID = drift-prone, breaks dynamic linkage.
- **Concept to remember:** Resources you manage are referenced directly (`type.name.attribute`); data sources are for things NOT in your config.
```hcl
network_interface {
  subnetwork = google_compute_subnetwork.main.self_link
}
```

### Q44 — Commands that tear down everything (Objective 3f)
- **Question (gist):** Which TWO CLI commands completely tear down all managed resources in the current workspace?
- **What I chose / missed:** Chose `terraform destroy` only. Missed `terraform apply -destroy`.
- **Correct answer(s):** "terraform destroy" and "terraform apply -destroy".
- **Why it's right:** `terraform destroy` is an alias for `terraform apply -destroy`.
- **Trap options:** `terraform plan -destroy` = only previews, deletes nothing; `terraform apply -delete` = not a valid flag.
- **Concept to remember:** `terraform destroy` and `terraform apply -destroy` are the same thing; `plan -destroy` is just a preview.
```bash
terraform destroy
terraform apply -destroy
```

### Q46 — New module block added (Objective 5a)
- **Question (gist):** Added a new module block to an already-deployed config. What command must run before Terraform can create the resource?
- **What I chose / missed:** Chose `terraform validate`.
- **Correct answer(s):** `terraform init`.
- **Why it's right:** Modules must be installed (into `.terraform/modules`) before use; `terraform init` (or `terraform get`) installs/updates modules, init also handles backends and providers.
- **Trap options:** validate/plan need the module installed first; `terraform output` only reads outputs.
- **Concept to remember:** New module (or provider/backend change) = run `terraform init`.

### Q47 — Transforming/combining/deriving values (Objective 4e)
- **Question (gist):** Which feature lets you transform, combine and derive values for resource arguments?
- **What I chose / missed:** Chose "variables and outputs".
- **Correct answer(s):** "expressions with built-in functions".
- **Why it's right:** Expressions + functions (join, format, lookup, tolist, conditionals, for expressions) compute values before passing them to resources.
- **Trap options:** Variables/outputs only move/store values; modules organise configuration; providers/provisioners talk to APIs/bootstrap.
- **Concept to remember:** Computing a value = expressions and functions; passing a value = variables and outputs.
```hcl
name = join("-", [var.env, "web", format("%02d", count.index)])
```

### Q49 — Search resources across all HCP workspaces (Objective 8b)
- **Question (gist):** Find which workspaces in the org manage the S3 bucket `production-data-lake`.
- **What I chose / missed:** Chose "Workspace navigator".
- **Correct answer(s):** "Explorer".
- **Why it's right:** HCP Terraform Explorer searches across the org by resource name, type, provider, attributes (also module usage), without opening each state.
- **Trap options:** State inspector, Workspace navigator, Resource finder - not HCP Terraform features (file states they do not exist).
- **Concept to remember:** Org-wide search of resources/workspaces in HCP Terraform = Explorer.

### Q53 — Module output exposed in CLI (Objective 5c)
- **Question (gist):** Module `web` creates a DNS record for a load balancer; show a clickable URL after apply. Select TWO snippets.
- **What I chose / missed:** Chose the root `website_url` output using `module.web.public_dns` (right). Missed the child-module output `public_dns`.
- **Correct answer(s):** root `outputs.tf`: `output "website_url" { value = "https://${module.web.public_dns}:8080/index.html" }` AND `/modules/web/outputs.tf`: `output "public_dns" { description = "DNS name of the web load balancer"  value = aws_lb.web.dns_name }`.
- **Why it's right:** Child modules expose values via `output` blocks inside the module; the parent reads them with `module.<name>.<output_name>`. Both parts are required.
- **Trap options:** `output` nested inside the `module` block = invalid; bare `${public_dns}` = out of scope; `module.web.outputs.public_dns` = no `outputs` namespace.
- **Concept to remember:** A child module must declare an output; the parent reads it as `module.NAME.OUTPUT`.
```hcl
# modules/web/outputs.tf
output "public_dns" { value = aws_lb.web.dns_name }
# root outputs.tf
output "website_url" { value = "https://${module.web.public_dns}:8080/index.html" }
```

### Q56 — Variable declared inside a module (Objective 5b)
- **Question (gist):** Error "Reference to undeclared input variable db_connection_string" on `var.db_connection_string` at main.tf line 35, when the variable was declared inside the `app` module. Why?
- **What I chose / missed:** Chose "an output block was not created in the module, and therefore the variable cannot be referenced".
- **Correct answer(s):** "since the variable was declared within the module, it cannot be referenced outside of the module".
- **Why it's right:** Variables are scoped to the module where they're declared; only module outputs are accessible from the parent.
- **Trap options:** Missing output - wrong cause (error is about an undeclared input variable in this scope); `var.module.app.db_connection_string` - not valid syntax; "variables don't use var prefix" - they do.
- **Concept to remember:** Variables are private to their module; share data out with `output`, in with module-call arguments.
- **Note (file ambiguity):** In the file, the explanation texts under the options appear shuffled (e.g. the text "var.module.app... is not valid syntax" sits under the correct-answer option). The correct answer marked is the one above.

## Quick reminders from correct answers
- **Q1 (4g):** `check` blocks only WARN and the run continues; `precondition`/`postcondition` halt with an error.
- **Q16 (6d):** Plain `terraform plan` refreshes state in memory only; to save refreshed values use `terraform apply -refresh-only`.
- **Q18 (3f):** Rebuild one resource without editing config with `terraform apply -replace="aws_instance.database"` (safer than `-target`).
- **Q13 (8d):** In HCP Terraform, `required_version` in code is not enough; also set the workspace's Terraform version setting.
- **Q36 (4h):** Use an `ephemeral` block (e.g. `ephemeral "vault_kv_secret_v2"`) so a secret is never stored in state; sensitive vars, data sources and `random_password` all still land in state.
- **Q42 (3e):** Terraform never rolls back a failed apply; successful resources stay in state, fix the cause and re-run apply.
- **Q57 (5d):** `version` can appear only once per module; combine constraints in one string: `version = ">= 1.0.0, < 2.0.0"`.
- **Q54 (6c):** After changing the `backend` block, run `terraform init -migrate-state` (or `-reconfigure`) to complete the move and copy state.

## Objective tally

| Objective | Topic | Missed |
|---|---|---|
| 8b | HCP Terraform collaboration/governance (Q9, Q49) | 2 |
| 2a | Install and version providers (Q21, Q30) | 2 |
| 1b | Advantages of IaC (Q8) | 1 |
| 1c | Multi-cloud/service-agnostic workflows (Q12) | 1 |
| 2d | State use and management (Q20) | 1 |
| 3b | Initialize working directory (Q26) | 1 |
| 3f | Destroy infrastructure (Q44) | 1 |
| 4b | Cross-resource references (Q41) | 1 |
| 4e | Expressions and functions (Q47) | 1 |
| 5a | How Terraform sources modules (Q46) | 1 |
| 5b | Variable scope in modules (Q56) | 1 |
| 5c | Using modules in configuration (Q53) | 1 |
| 6a | Local backend (Q31) | 1 |
| 6c | Remote state / backend block (Q17) | 1 |
| 6d | Drift and state management (Q5) | 1 |
| 7a | Import existing infrastructure (Q35) | 1 |
| 7c | Verbose logging (Q32) | 1 |
| 8c | HCP workspaces and projects (Q25) | 1 |
| **Total** | | **20** |

By domain (Objectives): 2 Fundamentals = 3, 5 Modules = 3, 6 State = 3, 8 HCP Terraform = 3, 1 IaC = 2, 3 Core Workflow = 2, 4 Configuration = 2, 7 Maintain = 2.

Patterns worth noting: 9 of the 20 misses are multi-select questions where one correct option was left unticked (Q5, Q8, Q9, Q12, Q21, Q30, Q32, Q44, Q53). Two misses are the "run `terraform init` after adding a provider/module" rule (Q26, Q46). Q20 and Q35 were both True/False questions answered False.
