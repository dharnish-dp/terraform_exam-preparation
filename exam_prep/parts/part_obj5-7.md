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
