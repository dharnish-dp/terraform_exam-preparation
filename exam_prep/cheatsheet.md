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
