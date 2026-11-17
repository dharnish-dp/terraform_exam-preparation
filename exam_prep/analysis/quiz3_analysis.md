# Quiz 3 analysis — score 38/57 (19 incorrect, 38 correct)

## Missed questions

### Q2 — for_each over a list of strings (Objective 4d)
- **Question (gist):** Create one `kubernetes_namespace` per entry of a `list(string)` variable using `for_each`.
- **What I chose / missed:** Chose `for_each = var.namespaces` with `each.key` (passing the raw list).
- **Correct answer:** `for_each = toset(var.namespaces)` with `name = each.value`.
- **Why it's right:** `for_each` accepts only a map or a set; `toset()` converts the list to a set, and for a set `each.key == each.value` is the string itself.
- **Why the traps are wrong:**
  - `tomap(var.namespaces)`: tomap needs key/value pairs, not a bare list.
  - `for i, n in var.namespaces : i => n` with `each.key`: key is the numeric index (0,1,2), not the name.
  - `for_each = var.namespaces` (my pick): a list is not allowed; `each.key` would also be an index.
- **Concept to remember:** `for_each` cannot take a list; wrap the list in `toset()` (or build a map) first.
```hcl
resource "kubernetes_namespace" "ns" {
  for_each = toset(var.namespaces)
  metadata { name = each.value }
}
```

### Q5 — HCP Terraform agents (Objective 8a)
- **Question (gist):** Primary function of HCP Terraform agents.
- **What I chose / missed:** Chose "store and manage state files across workspaces/projects".
- **Correct answer:** "execute Terraform plans and apply changes to isolated, private, or on-premises infrastructure".
- **Why it's right:** Agents are lightweight programs inside your private network; they pull runs from HCP Terraform and execute them locally, so no inbound public network access is needed.
- **Why the traps are wrong:** state storage is a core HCP Terraform service, not the agent's job; "remote access to manage workspaces" and "monitor/troubleshoot without the UI" are not the primary function.
- **Concept to remember:** An HCP Terraform agent is a worker you run inside your private network so HCP Terraform can run plan/apply against infrastructure it cannot reach from the internet.

### Q8 — apply with no state file (Objective 2d)
- **Question (gist):** Config for VMware resources, `terraform init` done, no state file. What does `terraform apply` do?
- **What I chose / missed:** Chose "all existing VMware infrastructure will be deleted, and config resources created".
- **Correct answer:** "Terraform will create the resources defined in the configuration file and write a new state file."
- **Why it's right:** No state is the normal first-apply situation; Terraform treats everything in config as new, creates it and writes state.
- **Why the traps are wrong:**
  - Error because no state: false, state is created on first apply.
  - Delete all existing infra (my pick): Terraform only manages what is in config/state, never unknown resources.
  - "Resources will not be created": false, they will be created.
- **Concept to remember:** Missing state is not an error; Terraform simply creates everything in the config and builds a new state file (and never touches resources it doesn't know about).

### Q14 — validating a data source result (Objective 4g)
- **Question (gist):** Ensure an `azurerm_resource_group` data source actually returned a result.
- **What I chose / missed:** Chose `lifecycle { precondition { condition = var.rg_name != "" } }`.
- **Correct answer:** `lifecycle { postcondition { condition = self.id != ""  error_message = "Resource group not found." } }`
- **Why it's right:** A postcondition runs after the data is read and can use `self` to check the returned object; a precondition runs before and can only check inputs.
- **Why the traps are wrong:**
  - Precondition on `var.rg_name` (my pick): only checks the input string is non-empty, not that the group exists.
  - `validation {}` inside a data block: `validation` only exists inside `variable` blocks.
  - `resource "rg_exists"` with `assert {}`: fictitious type/block (a `check` block with `assert` is the valid alternative).
- **Concept to remember:** Precondition checks inputs before; postcondition checks results after (use `self`).
```hcl
data "azurerm_resource_group" "main" {
  name = var.rg_name
  lifecycle {
    postcondition {
      condition     = self.id != ""
      error_message = "Resource group not found."
    }
  }
}
```

### Q15 — count managed resources (Objective 7b)
- **Question (gist):** Quickly count resources managed in a workspace without detailed attribute output.
- **What I chose / missed:** Chose `terraform state -count` (not a real command).
- **Correct answer:** `terraform state list`
- **Why it's right:** Prints one resource address per line only, so it is easy to count (e.g. pipe to `wc -l`).
- **Why the traps are wrong:** `terraform state show` = full attributes of one resource; `terraform show` = whole state/plan with all attributes; `terraform state -count` does not exist.
- **Concept to remember:** `terraform state list` = just the addresses; `state show <addr>` = details of one.
```bash
terraform state list | wc -l
```

### Q16 — local state file deleted (Objective 6a) (select three)
- **Question (gist):** Local backend, `terraform.tfstate` deleted, config unchanged, run `terraform plan`. Which statements are true?
- **What I chose / missed:** Picked the two right ones (data sources still read remote systems; Terraform will try to create previously managed resources) but also picked "previous output values are still available" (false) and missed "terraform destroy cannot identify any resources to destroy until state is restored".
- **Correct answer(s):**
  - "Data sources may still read remote systems during planning, but they do not fix the resource state."
  - "terraform destroy cannot identify any resources to destroy until state is restored"
  - "Terraform will try to create previously managed resources."
- **Why it's right:** State is the only map from config to real objects; without it Terraform thinks nothing exists (plan proposes creates) and destroy has nothing to target.
- **Why the traps are wrong:** outputs live in state, so they are lost with it; state locking is unrelated to a missing file (the plan still runs).
- **Concept to remember:** Delete the state and Terraform "forgets" everything: plan wants to create it all again, destroy finds nothing, and outputs are gone (restore or re-import to recover).

### Q19 — build "prod-us-east-web" from three strings (Objective 4e)
- **Question (gist):** Combine three string variables with hyphens.
- **What I chose / missed:** Chose `merge(...)`.
- **Correct answer:** `name = join("-", [var.environment, var.region, var.app])`
- **Why it's right:** `join(separator, list)` glues list elements with the separator.
- **Why the traps are wrong:** `concat` joins lists, not strings with separators; `merge` combines maps; `format("%s+%s+%s", ...)` uses "+" not "-" (format("%s-%s-%s", ...) would work, but this option has plus signs).
- **Concept to remember:** `join` = list into a string with a separator; `concat` = lists into a list; `merge` = maps into a map.
```hcl
name = join("-", [var.environment, var.region, var.app])
```

### Q21 — using data source attributes (Objective 4a) (select two)
- **Question (gist):** Which snippets correctly use attributes from `data.aws_vpc.prod` and `data.aws_subnet.app`.
- **What I chose / missed:** Chose the correct security group (`vpc_id = data.aws_vpc.prod.id`, `cidr_blocks = [data.aws_vpc.prod.cidr_block]`) plus a broken one (`vpc_id = data.aws_vpc`, `cidr_blocks = aws_vpc.cidr_blocks.data`); missed the EC2 instance snippet.
- **Correct answer(s):**
  - `aws_instance.web` with `subnet_id = data.aws_subnet.app.id`
  - `aws_security_group.ssh` with `vpc_id = data.aws_vpc.prod.id` and `cidr_blocks = [data.aws_vpc.prod.cidr_block]`
- **Why it's right:** Data attributes are referenced as `data.<TYPE>.<NAME>.<ATTR>`; `cidr_blocks` needs a list so wrap the single string in `[ ]`.
- **Why the traps are wrong:**
  - My bad SG: `data.aws_vpc` has no type/name/attribute, and `aws_vpc.cidr_blocks.data` is reversed and missing `data.` prefix.
  - EC2 with `ami = "data.aws_ami.al2.id"`: quotes make it a literal string (also `"${...}"` wrapper is legacy-style).
- **Concept to remember:** Reference data with `data.TYPE.NAME.ATTRIBUTE`, never in quotes, and no `data.` prefix means you are pointing at a managed resource instead.

### Q24 — what terraform apply does (Objective 3e) (select two)
- **Question (gist):** Which actions does `terraform apply` perform after plan approval?
- **What I chose / missed:** Chose "create, update, or delete infrastructure" (correct) and "formats configuration to canonical HCL" (wrong); missed "update the state file".
- **Correct answer(s):** "Create, update, or delete infrastructure in the target environment based on the changes specified in your Terraform files." and "Update the state file to match the changes made to the infrastructure during the execution."
- **Why it's right:** Apply executes the plan and records the results in state.
- **Why the traps are wrong:** formatting is `terraform fmt`; downloading providers/modules is `terraform init`; "recreates all infrastructure" is false, apply only changes the diff.
- **Concept to remember:** Apply changes real infrastructure AND writes the state; it never formats code or installs plugins.

### Q26 — pessimistic constraint on modules (Objective 5d)
- **Question (gist):** `version = "~> 3.2.0"`; available 3.2.0, 3.2.5, 3.3.0, 4.0.0. Which is downloaded?
- **What I chose / missed:** Chose 3.2.0.
- **Correct answer:** 3.2.5
- **Why it's right:** `~> 3.2.0` means >= 3.2.0 and < 3.3.0 (only the patch number may rise); Terraform picks the newest match, 3.2.5.
- **Why the traps are wrong:** 3.2.0 is allowed but not the newest; 3.3.0 and 4.0.0 fall outside the range.
- **Concept to remember:** `~>` lets only the rightmost digit grow, and Terraform picks the newest allowed version, not the lowest.
```hcl
version = "~> 3.2.0"   # >= 3.2.0, < 3.3.0   -> 3.2.5
version = "~> 3.2"     # >= 3.2, < 4.0 (for comparison)
```

### Q29 — map vs object type (Objective 4d)
- **Question (gist):** Key difference between `map(string)` and an `object` type.
- **What I chose / missed:** Reversed it: chose "a map requires all keys defined up front, object allows dynamic keys".
- **Correct answer:** "An object type defines a fixed structure with specific attribute names and types, while a map allows any keys with values of the same type."
- **Why it's right:** Object = fixed schema (names + types, can mix types); map = arbitrary keys but one value type.
- **Why the traps are wrong:** object is not limited to strings; "no difference" is false; my pick had them swapped.
- **Concept to remember:** Object = fixed keys, mixed value types; map = any keys, one value type.
```hcl
type = object({ instance_type = string, count = number })  # fixed shape
type = map(string)                                          # any keys, all strings
```

### Q30 — what terraform import does (Objective 7a)
- **Question (gist):** Teammate expected `terraform import` to populate the config with the bucket's settings.
- **What I chose / missed:** Chose "import will fail unless you include the --generate-config flag".
- **Correct answer:** "Importing only adds the resource to Terraform state and you need to add the resource block to match the existing bucket settings."
- **Why it's right:** The classic `terraform import` writes state only; you must write the matching `resource` block yourself.
- **Why the traps are wrong:** it does not auto-generate a block to paste; import does not require a generate flag (my pick); the "forgot the import block" option is also wrong per the file.
- **Ambiguity note:** Newer Terraform (1.5+) can generate config using an `import` block plus `terraform plan -generate-config-out=file.tf`, but that is optional and is not what the file's answer tests. For this exam answer the classic-import behaviour: state only, config is your job.
- **Concept to remember:** `terraform import` fills state only; you write (or generate) the resource block separately.
```bash
terraform import google_storage_bucket.b my-bucket   # state only
```

### Q35 — read another workspace's output in HCP Terraform (Objective 8c)
- **Question (gist):** prod-dns workspace needs the public IP from prod-webserver automatically.
- **What I chose / missed:** Chose "add a dynamic block within the resource".
- **Correct answer:** "a tfe_outputs data source that references the prod-webserver workspace".
- **Why it's right:** `tfe_outputs` reads the outputs of another HCP Terraform workspace live.
- **Why the traps are wrong:** a `remote_state` backend block is not how you do this (note `terraform_remote_state` is a different data source; the file says tfe_outputs is the answer); a variable default must be updated by hand; a `dynamic` block generates nested blocks and retrieves nothing.
- **Concept to remember:** To pull outputs from another HCP Terraform workspace, use `data "tfe_outputs"`.
```hcl
data "tfe_outputs" "webserver" {
  organization = "bk-organization"
  workspace    = "prod-webserver"
}
# data.tfe_outputs.webserver.values.public_ip
```

### Q36 — referencing a for_each instance (Objective 4b)
- **Question (gist):** Reference the `frontend` instance of `aws_instance.svc_apps` created with `for_each` over a map.
- **What I chose / missed:** Chose `aws_instance.svc_apps.frontend`.
- **Correct answer:** `aws_instance.svc_apps["frontend"]`
- **Why it's right:** for_each instances are indexed by string key in square brackets.
- **Why the traps are wrong:** `.frontend` dot-syntax is not valid for instance keys; `aws_instance["svc_apps"]["frontend"]` mixes up type/name; `[2]` is a count-style numeric index.
- **Concept to remember:** `count` uses `[0]` numbers, `for_each` uses `["key"]` strings.

### Q42 — variable scope in child modules (Objective 5b)
- **Question (gist):** Root declares `variable "environment"`, child uses `var.environment` without declaring it.
- **What I chose / missed:** Chose "child will use the default production from the root".
- **Correct answer:** "Terraform will return an error stating that var.environment is not declared in the child module".
- **Why it's right:** Variables are local to each module; the child must declare its own variable and the parent must pass the value in the `module` block.
- **Why the traps are wrong:** no automatic inheritance (my pick and "automatically inherit"); no prompt, since an undeclared variable is a hard error.
- **Concept to remember:** Modules are sealed boxes: inputs only come through the module block's arguments.
```hcl
# root
module "web" { source = "./modules/web"  environment = var.environment }
# child: modules/web/variables.tf
variable "environment" { type = string }
```

### Q43 — sync state with out-of-band changes (Objective 6d)
- **Question (gist):** Engineers change infra by hand; which command detects the drift and updates state?
- **What I chose / missed:** Chose `terraform show`.
- **Correct answer:** `terraform apply -refresh-only`
- **Why it's right:** Reads real infrastructure, shows the drift, and (after approval) records it in state without changing infrastructure.
- **Why the traps are wrong:** `show` only displays existing state/plan; `validate` checks config syntax; `graph` draws dependencies.
- **Concept to remember:** `-refresh-only` = update state to match reality, change nothing real (`plan -refresh-only` previews it).
```bash
terraform apply -refresh-only
```

### Q48 — keeping secrets out of state (Objective 4h)
- **Question (gist):** Which method ensures sensitive info is not stored in state?
- **What I chose / missed:** Chose "retrieving credentials from a data source such as Vault".
- **Correct answer:** "none of the above".
- **Why it's right:** tfvars files, declared variables and a standard Vault data source all still end up in state if used in a tracked attribute. Only ephemeral resources plus write-only (`*_wo`) arguments avoid state.
- **Why the traps are wrong:** tfvars and variables just supply values; a normal Vault data source writes the value it reads into state (it only keeps secrets out of your .tf files).
- **Concept to remember:** `sensitive` only hides output in the CLI; to truly keep a secret out of state use `ephemeral` resources and write-only arguments.

### Q50 — import block error "resource address does not exist" (Objective 7a)
- **Question (gist):** Import block points at `aws_instance.web_app_42` which is not in the config; first step?
- **What I chose / missed:** Chose "Terraform cannot manage resources provisioned outside the core workflow".
- **Correct answer:** "create a new resource block in your configuration for the aws_instance resource".
- **Why it's right:** The import block's `to` address must match an existing `resource` block.
- **Why the traps are wrong:** `ignore_changes = all` doesn't create the missing address; a `data` block only reads, doesn't manage; Terraform can manage outside resources via import (my pick is false).
- **Concept to remember:** Import needs a destination: write the `resource` block that the `import` block's `to` points at.
```hcl
import {
  to = aws_instance.web_app_42
  id = "i-0abc123..."
}
resource "aws_instance" "web_app_42" { /* matching settings */ }
```

### Q56 — passing an auto-generated attribute to another resource (Objective 4b)
- **Question (gist):** Pass an Azure SQL DB connection string to a web app resource.
- **What I chose / missed:** Chose "use a data source to query Azure for all connection strings, then select".
- **Correct answer:** "reference the database resource's connection string attribute in the web app configuration".
- **Why it's right:** Resource attributes (even computed ones) can be referenced directly, e.g. `azurerm_mssql_database.main.connection_string`, which also creates an implicit dependency.
- **Why the traps are wrong:** a data source is overkill for something already managed in the same config; manual variable or copy/paste from `terraform output` is error-prone and creates no dependency.
- **Concept to remember:** Reference `resource_type.name.attribute` directly; Terraform wires up values and ordering for you.

## Quick reminders from correct answers
- **Q1 (6c):** A `backend` block takes only literal values (no vars, locals, data); use `-backend-config` / partial config for dynamic values.
- **Q23 (3e):** Renamed a resource and don't want destroy/create? Add a `moved { from = ... to = ... }` block.
- **Q28 (4h):** Keep secrets out of state with `ephemeral` resources and write-only args (`password_wo`), not just `sensitive = true`.
- **Q32 (4f):** `lifecycle { ignore_changes = [tags] }` ignores later tag changes; `tags["key"]` ignores only that key.
- **Q46 (2a):** `terraform init -upgrade` picks the newest version inside the constraint (`~> 6.0.0` gives 6.0.5, not 6.1.0).
- **Q47 (3d):** `terraform plan -out=file` then `terraform apply file` applies exactly the reviewed plan.
- **Q49 (4c):** `sensitive = true` on an output only hides it in CLI output; the value is still plaintext in state and visible in `terraform show -json`.
- **Q52 (2b):** After a partial failed apply nothing rolls back; successes stay, failed (provisioner) resources are tainted.

## Objective tally

| Objective | Missed | Questions |
|---|---|---|
| 4d (complex types) | 2 | Q2, Q29 |
| 4b (cross-resource references) | 2 | Q36, Q56 |
| 7a (import) | 2 | Q30, Q50 |
| 2d (state) | 1 | Q8 |
| 3e (apply) | 1 | Q24 |
| 4a (resource vs data) | 1 | Q21 |
| 4e (expressions/functions) | 1 | Q19 |
| 4g (custom conditions) | 1 | Q14 |
| 4h (sensitive data) | 1 | Q48 |
| 5b (module variable scope) | 1 | Q42 |
| 5d (module versions) | 1 | Q26 |
| 6a (local backend) | 1 | Q16 |
| 6d (drift/state) | 1 | Q43 |
| 7b (inspect state) | 1 | Q15 |
| 8a (HCP create infra / agents) | 1 | Q5 |
| 8c (HCP workspaces/projects) | 1 | Q35 |
| **Total** | **19** | |

By domain: Obj 4 Terraform Configuration = 8 misses (Q2, 14, 19, 21, 29, 36, 48, 56); Obj 7 = 3; Obj 6 = 2; Obj 5 = 2; Obj 8 = 2; Obj 2 = 1; Obj 3 = 1; Obj 1 = 0.
