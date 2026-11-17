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
