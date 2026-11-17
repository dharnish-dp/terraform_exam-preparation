# Quiz 1 analysis — score 36/57 (21 incorrect, 36 correct; counted from the file)

Source: `/Users/ddp/Desktop/terraform_course/quiz_result/quize1.txt`. Multi-select questions marked "Incorrect" are partial misses (wrong pick and/or missed pick).

## Missed questions

### Q1 — Why not commit terraform.tfstate to VCS (Objective 6a)
- **Question (gist):** Select two reasons not to commit `terraform.tfstate` to version control.
- **What I chose / missed:** Picked only "plaintext secrets" (correct). Missed the second correct option, so the answer was incomplete.
- **Correct answer(s):** "State can include plaintext secrets and detailed resource data and commit history can expose them." AND "VCS provides no state locking, so concurrent runs can cause conflicting commits and corrupt state."
- **Why it's right:** State holds real resource data and often plaintext secrets, and Git history keeps them forever. Git has no locking, so two simultaneous runs can corrupt state.
- **Why the trap options are wrong:** "Committing prevents Terraform reading it" — false, Terraform reads the file fine. "Git prevents safely reverting a resource change" — not a stated reason; made-up claim.
- **Concept to remember:** Never put state in Git: it leaks secrets and has no locking. Use a remote backend and a `.gitignore`.
```gitignore
*.tfstate
*.tfstate.*
.terraform/
```

### Q5 — Reconfigure backend without copying state (Objective 6c)
- **Question (gist):** Switching backend from S3 to HCP Terraform; which `init` flag reconfigures the backend WITHOUT copying existing state?
- **What I chose / missed:** Chose `terraform init -backend=false`.
- **Correct answer(s):** `terraform init -reconfigure`
- **Why it's right:** `-reconfigure` initialises the new backend config and ignores/doesn't migrate the old state.
- **Why the trap options are wrong:** `-migrate-state` copies state to the new backend (the opposite). `-force-copy` also migrates, just suppresses the prompt (auto-yes). `-backend=false` skips backend initialisation entirely.
- **Concept to remember:** `-migrate-state` = move my state to the new backend; `-reconfigure` = just point at the new backend and leave the old state behind.
```bash
terraform init -reconfigure     # new backend, no state copy
terraform init -migrate-state   # new backend, copy state
```

### Q6 — Advantages of IaC (Objective 1b)
- **Question (gist):** Select three advantages of IaC.
- **What I chose / missed:** Chose version control (correct), multi-cloud (correct), and "imperative approach" (WRONG). Missed "human-readable configuration language".
- **Correct answer(s):** "IaC allows you to save your configurations in version control, enabling safe collaboration on infrastructure." / "IaC uses a human-readable configuration language to help you write infrastructure code quickly." / "IaC code can be used to manage infrastructure on multiple cloud platforms."
- **Why it's right:** IaC is versionable, readable (HCL), and mostly platform agnostic.
- **Why the trap option is wrong:** "Imperative, run commands in order" — Terraform/IaC here is declarative (you state the desired end state).
- **Concept to remember:** Terraform is declarative: you describe what you want, not the steps.

### Q10 — Query existing resources (Objective 4a)
- **Question (gist):** Which snippet lets you read information about existing resources for use in config?
- **What I chose / missed:** Chose the `module` block.
- **Correct answer(s):** the `data "aws_ami" "btk-app" { most_recent = true ... filter {...} }` snippet (a `data` block).
- **Why it's right:** `data` blocks are read-only lookups of things that already exist.
- **Why the trap options are wrong:** `resource` creates/manages things; `locals` store computed values; `provider` configures the plugin; `module` packages reusable config (not a lookup).
- **Concept to remember:** `resource` = create and manage; `data` = look up something that already exists.
```hcl
data "aws_ami" "example" { most_recent = true  owners = ["self"] }
# use: data.aws_ami.example.id
```

### Q11 — Verbose logging env var (Objective 7c)
- **Question (gist):** Which environment variable enables detailed logging?
- **What I chose / missed:** Chose `TF_TRACE`.
- **Correct answer(s):** `TF_LOG`
- **Why it's right:** `TF_LOG` turns logging on; its value sets the level (TRACE, DEBUG, INFO, WARN, ERROR). TRACE is the most verbose and is the default if set to a non-level value. Logs go to stderr; `TF_LOG_PATH` sends them to a file.
- **Why the trap options are wrong:** `TF_INFO`, `TF_DEBUG`, `TF_TRACE` do not exist (TRACE is a level, not a variable).
- **Concept to remember:** Logging is `TF_LOG=<LEVEL>`; the levels are values, not variable names.
```bash
export TF_LOG=DEBUG
export TF_LOG_PATH=./terraform.log
```

### Q13 — New provider causes plan error (Objective 2a)
- **Question (gist):** Added resources from a new provider; `terraform plan` errors. What first?
- **What I chose / missed:** Chose "add to required_providers only; that installs the plugin".
- **Correct answer(s):** "Run terraform init so Terraform downloads the plugin for the newly added provider."
- **Why it's right:** Only `init` downloads provider plugins (and modules). Re-run `init` after adding a provider, changing a provider version, or adding/removing a module.
- **Why the trap options are wrong:** Declaring in `required_providers` doesn't install anything. `validate` checks syntax only, doesn't install. A config can use many providers; no separate module is needed.
- **Concept to remember:** Any time providers or modules change, run `terraform init` again.

### Q18 — Variable that causes a type error (Objective 4c)
- **Question (gist):** Which variable declaration will cause a type error before apply?
- **What I chose / missed:** Chose the `tags` `map(string)` declaration (it is valid).
- **Correct answer(s):** `variable "names" { type = list(string)  default = {} }`
- **Why it's right:** `{}` is a map/object literal, but the type is `list(string)`; a list needs `[ ]`.
- **Why the trap options are wrong:** `number` with `3`, `bool` with `true`, and `map(string)` with string key/values all match their types.
- **Concept to remember:** Lists use `[ ]`, maps/objects use `{ }`; a default must match the declared type.
```hcl
default = []   # list OK
default = {}   # map/object OK
```

### Q21 — "vpc_id is not a valid attribute for module.network" (Objective 5b)
- **Question (gist):** `module.network.vpc_id` errors; most likely cause?
- **What I chose / missed:** Chose "must declare vpc_id as a variable in the root module".
- **Correct answer(s):** "The network module did not define an output block that exports the VPC ID, resulting in the error."
- **Why it's right:** A parent can only read a child's `output` values, not its internal resources.
- **Why the trap options are wrong:** A root variable doesn't expose child values. A `data` block is unnecessary. Module outputs are available at plan time.
- **Concept to remember:** To read something from a child module, the child must `output` it, then use `module.<name>.<output>`.
```hcl
# in modules/network
output "vpc_id" { value = aws_vpc.main.id }
# in root
vpc_id = module.network.vpc_id
```

### Q24 — When does variable validation fire? (Objective 4g)
- **Question (gist):** `validation` block restricts `instance_count` to 1-10; user sets 15. When is the error reported?
- **What I chose / missed:** Chose "during terraform apply".
- **Correct answer(s):** "During terraform validate or terraform plan, before attempting to create any resources"
- **Why it's right:** Variable validation is evaluated early, before any resource is created.
- **Why the trap options are wrong:** Apply is too late. Passing the number type check doesn't skip the condition. `init` doesn't evaluate variable conditions.
- **Concept to remember:** Validation blocks fail fast at plan time (before any infrastructure changes).
- **Ambiguity note:** The file says "validate or plan"; strictly, a concrete input value like 15 is only known at plan time, but the file's answer is as written above.
```hcl
validation {
  condition     = var.instance_count > 0 && var.instance_count <= 10
  error_message = "Instance count must be between 1 and 10."
}
```

### Q27 — terraform show vs terraform state show (Objective 7b)
- **Question (gist):** Select three correct differences between `terraform show` and `terraform state show`.
- **What I chose / missed:** Chose "show displays entire state w/o args" (correct), "show gives overview" (correct), and "state show outputs JSON" (WRONG). Missed "state show requires a resource address".
- **Correct answer(s):** "terraform state show requires you to specify a resource address to view that specific resource" / "terraform show displays the entire state file without requiring any additional arguments" / "terraform show is useful when you want a complete overview of all managed infrastructure"
- **Why it's right:** `show` = whole state (or a plan file) in human-readable form; `state show ADDRESS` = one resource.
- **Why the trap options are wrong:** "show only displays resources with pending changes" — false. "state show accepts comma-separated resources" — false, one address only. "state show outputs JSON" — false, it is human-readable (JSON is `terraform show -json`).
- **Concept to remember:** `show` = everything, `state show <address>` = one resource.
```bash
terraform show
terraform state show aws_instance.web
```

### Q29 — name/cidr/azs inside a module block (Objective 5b)
- **Question (gist):** In `module "vpc" { source=...; name = var.vpc_name; cidr = ...; azs = ... }`, what are `name`, `cidr`, `azs`?
- **What I chose / missed:** Chose "where variable declarations are created so Terraform knows about them in the calling module".
- **Correct answer(s):** "these are module-specific inputs that are passed into the child module used for resource creation"
- **Why it's right:** Arguments inside a `module` block are the child module's input variables, supplied by the caller (here from the caller's own `var.*`).
- **Why the trap options are wrong:** Not outputs (those flow out of the child). Variable declarations live in `variable` blocks inside the module, not in the module call. Values come from the caller, not from inside the child.
- **Concept to remember:** Arguments in a `module {}` block are the child's inputs; the child's `output` blocks are what come back.

### Q32 — Run triggers in HCP Terraform (Objective 8c)
- **Question (gist):** Purpose of a run trigger?
- **What I chose / missed:** Chose "require human approval before applying in specific workspaces".
- **Correct answer(s):** "to automatically queue a new run in one workspace after another workspace applies successfully"
- **Why it's right:** Run triggers chain workspaces: source workspace applies, then a run is queued in the downstream workspace.
- **Why the trap options are wrong:** Human approval = apply method/manual confirmation, not triggers. Temporary credentials = dynamic credentials/OIDC. "Always newest commit" = VCS-driven runs.
- **Concept to remember:** Run trigger = "when workspace A finishes applying, start a run in workspace B".

### Q38 — Make a new module available (Objective 5a)
- **Question (gist):** Added a module block with a remote source; what makes Terraform download it?
- **What I chose / missed:** Chose "add the module to required_providers".
- **Correct answer(s):** "Run terraform init to install the module into the current working directory."
- **Why it's right:** `init` downloads modules (into `.terraform/modules`) as well as providers.
- **Why the trap options are wrong:** `required_providers` is for providers, not modules. Manually copying into `.terraform/modules/downloads` is not how it works. `plan` doesn't fetch modules.
- **Concept to remember:** New provider or new module = run `terraform init`.

### Q43 — Where to run init with /dev /staging /prod (Objective 3b)
- **Question (gist):** Separate config in each env subdirectory; where must `terraform init` run?
- **What I chose / missed:** Chose "only in the root directory to initialize all environments".
- **Correct answer(s):** "In each directory (/dev, /staging, and /prod) since each is a separate working directory."
- **Why it's right:** Every directory with .tf files is its own working directory with its own `.terraform/`.
- **Why the trap options are wrong:** Root init doesn't cover subdirectories. Copying `.terraform` between directories is discouraged. Skipping dev/staging is wrong.
- **Concept to remember:** One folder of .tf files = one working directory = its own `terraform init`.

### Q44 — Adopt CLI-created resources into Terraform (Objective 7a)
- **Question (gist):** Select three steps to manage existing resources without impacting them.
- **What I chose / missed:** Chose only "add import blocks mapping address to real ID". Missed the other two.
- **Correct answer(s):** "run terraform apply to import them in state with no changes" / "write Terraform resource blocks that match the existing settings" / "add import blocks mapping each address to its real ID"
- **Why it's right:** You need matching resource blocks, an import mapping (address to real ID), and an apply to record them in state.
- **Why the trap options are wrong:** "apply to recreate all resources" — destroys/recreates, impacts them. "Define data sources for all" — data sources only read; they don't bring resources under management.
- **Concept to remember:** Import = resource block + import block (address and real ID) + apply to write it into state.
- **Note:** Wording of "apply to import" is the file's; the plan/apply with an `import` block performs the import.
```hcl
import {
  to = aws_instance.web
  id = "i-0abc123456789"
}
resource "aws_instance" "web" { /* match existing settings */ }
```

### Q45 — Apply exactly the reviewed plan (Objective 3e)
- **Question (gist):** Saved plan with `-out=bk-project.tfplan`, approved 2 hours later; how to run exactly what was reviewed?
- **What I chose / missed:** Chose "run terraform plan again, then terraform apply".
- **Correct answer(s):** "run terraform apply bk-project.tfplan to execute the saved plan"
- **Why it's right:** Applying a saved plan file executes exactly those reviewed actions.
- **Why the trap options are wrong:** Re-planning can produce a different plan than the one reviewed. `-auto-approve` just skips the prompt and still creates a fresh plan. Plain `apply` does NOT reuse the last plan; it builds a new one.
- **Concept to remember:** Save the plan, then apply the plan file, and you get exactly what was approved.
```bash
terraform plan -out=bk-project.tfplan
terraform apply bk-project.tfplan
```

### Q46 — Env var prefix for input variables (Objective 4c)
- **Question (gist):** Prefix needed to set an input variable via environment variable?
- **What I chose / missed:** Chose `TF_VAR_VALUE`.
- **Correct answer(s):** `TF_VAR_`
- **Why it's right:** Terraform reads `TF_VAR_<variable_name>`; the variable name follows the prefix directly.
- **Why the trap options are wrong:** `TF_ENV_`, `TF_ENV_VAR_name`, `TF_VAR_VALUE` are not recognised prefixes.
- **Concept to remember:** `TF_VAR_` + the variable's name sets that variable.
```bash
export TF_VAR_instructor_name="bryan"
```

### Q50 — Where is this module stored? (Objective 5a)
- **Question (gist):** `source = "terraform-aws-modules/transit-gateway/aws"` with `version = "3.0.3"`; where does the module live?
- **What I chose / missed:** Chose "HCP Terraform private registry".
- **Correct answer(s):** "the Terraform public registry"
- **Why it's right:** The `<NAMESPACE>/<NAME>/<PROVIDER>` format (3 parts, no hostname) is the public registry shorthand.
- **Why the trap options are wrong:** A private registry source adds a hostname prefix (`app.terraform.io/org/name/provider`). Local paths start with `./` or `../`. A "local repo on your network" would use a git/URL source.
- **Concept to remember:** `namespace/name/provider` = public registry; `host/org/name/provider` = private registry; `./path` = local.

### Q51 — Decommission only some resources (Objective 3f)
- **Question (gist):** 50 GCP resources; remove only the Cloud SQL instance and its backup policy.
- **What I chose / missed:** Chose `terraform destroy -target=... -target=...`.
- **Correct answer(s):** "Remove the database and backup resource blocks from your configuration, then run terraform apply."
- **Why it's right:** Config-driven: delete the blocks and apply; Terraform destroys only what is no longer declared. It is declarative and reviewable in VCS.
- **Why the trap options are wrong:** Full `destroy` then re-apply is destructive. `-target` is an exception tool (risky, can skip dependencies). The "two removed blocks" option was marked wrong by the file.
- **Concept to remember:** To delete a few resources, delete their code and apply; avoid `-target` for routine work.
- **Ambiguity note:** `removed` blocks are real Terraform syntax; the file marks that option wrong (a `removed` block by default only forgets the resource from state, not destroy it, unless `lifecycle { destroy = true }`). Follow the file's answer for the exam.

### Q54 — Most accurate description of the Terraform language (Objective 1a)
- **Question (gist):** Which statement best describes Terraform?
- **What I chose / missed:** Chose "mutable, declarative, ... configuration management language ... HCL or JSON".
- **Correct answer(s):** "Terraform is an immutable, declarative Infrastructure as Code language based on HashiCorp Configuration Language or JSON."
- **Why it's right:** Terraform follows immutable-infrastructure principles, is declarative (desired end state), uses HCL, with JSON as an alternative syntax.
- **Why the trap options are wrong:** "Mutable" is wrong. "Imperative" is wrong. "Optionally YAML" is wrong (JSON, not YAML). "Configuration management language" is wrong (Terraform is provisioning, not config management like Ansible/Chef).
- **Concept to remember:** Terraform = immutable + declarative + provisioning; HCL or JSON (never YAML).

### Q57 — Variable type for region-to-image-ID lookup (Objective 4d)
- **Question (gist):** Pick the variable type to look up image ID by region name.
- **What I chose / missed:** Chose `object({ region = string, image_id = string })`.
- **Correct answer(s):** `type = map(string)`
- **Why it's right:** A map is key-value with arbitrary keys: region name to image ID, looked up with `var.image[var.region]`.
- **Why the trap options are wrong:** `list(string)` is index-only. `set(string)` is unordered unique values with no keys. `object` has a fixed set of attribute names (here just `region`/`image_id`), not arbitrary region keys.
- **Concept to remember:** Look-up table with arbitrary keys = `map`; fixed named fields = `object`.
```hcl
variable "image" { type = map(string) }
# image = { "us-east-1" = "ami-111", "us-west-2" = "ami-222" }
ami = var.image[var.region]
```

## Quick reminders from correct answers
- **Q22 (4h):** `sensitive = true` only hides values in CLI/UI output; secrets still sit in state in plaintext. Protect state itself.
- **Q37 (6d):** Preview a drift sync without changing anything: `terraform plan -refresh-only` (`apply -refresh-only` writes state).
- **Q28 / Q4 (8a, 8d):** CLI-driven HCP Terraform runs plan/apply remotely and streams output back; Execution Mode = Local makes the workspace only a state backend (no Sentinel, cost estimation, etc.).
- **Q35 (6a):** Losing local state means Terraform forgets what it manages; next plan may try to create duplicates. Recover via backup or import.
- **Q39 (2a):** Provider plugins are downloaded to `.terraform/providers` in the working dir (modules to `.terraform/modules`); `.terraform/` holds no credentials or state.
- **Q42 / Q34 (5d):** Registry module `version` is optional but recommended; omitting it gives the latest at init. It applies only to registry sources and pins the module, not the Terraform CLI or providers.
- **Q16 / Q23 / Q55 (4b, 4f):** Referencing `resource.name.attr` creates an implicit dependency; `depends_on` is the explicit one.
- **Q52 (2b):** A provider dependency is created by a resource/data block using it, a provider block, or existing resources in state. (The file's option text also says "adding required_version constraints" for the provider-block option, which is oddly worded; treat `required_providers`/provider blocks as the real mechanism.)

## Objective tally (missed questions per objective)

| Objective | Topic | Missed | Questions |
|---|---|---|---|
| 4c | Variables and outputs | 2 | Q18, Q46 |
| 5a | How Terraform sources modules | 2 | Q38, Q50 |
| 5b | Variable scope within modules | 2 | Q21, Q29 |
| 1a | What IaC is | 1 | Q54 |
| 1b | Advantages of IaC | 1 | Q6 |
| 2a | Install/version providers | 1 | Q13 |
| 3b | Initialize a working directory | 1 | Q43 |
| 3e | Apply changes | 1 | Q45 |
| 3f | Destroy infrastructure | 1 | Q51 |
| 4a | resource vs data blocks | 1 | Q10 |
| 4d | Complex types | 1 | Q57 |
| 4g | Custom validation conditions | 1 | Q24 |
| 6a | Local backend / state in VCS | 1 | Q1 |
| 6c | Remote state/backend block | 1 | Q5 |
| 7a | Import existing infrastructure | 1 | Q44 |
| 7b | CLI inspect state | 1 | Q27 |
| 7c | Verbose logging | 1 | Q11 |
| 8c | HCP Terraform workspaces/projects | 1 | Q32 |
| **Total** | | **21** | |

By domain: Objective 4 (Configuration) 5 misses; Objective 5 (Modules) 4; Objective 3 (Workflow) 3; Objective 6 (State) 2; Objective 7 (Maintain) 3; Objective 1 (IaC) 2; Objective 2 (Fundamentals) 1; Objective 8 (HCP) 1.
