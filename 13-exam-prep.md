# Exam Prep — Practice Questions, Cheat Sheet and Strategy

Use this from **Day 15**. First finish all lessons and labs.

> These questions are **written by me for practice**. They are not real exam questions. Real questions vary in wording, so understand the concepts instead of memorizing phrases. The exam also commonly includes **true/false, multiple-answer, and fill-in-the-blank** formats.

---

## Part 1: Exam strategy

### Before the exam

- Book it only when you score **80%+ on two** full-length practice tests.
- Online proctoring: test your **webcam, mic, internet**, clear your desk, have a government ID. Read the proctor rules on the HashiCorp page.
- Sleep. Don't cram new topics the night before.

### During the exam (1 hour)

1. **Don't over-think.** About 1 minute per question. If stuck, **flag and move on**.
2. Read the **last line** of the question first ("which command...", "which is NOT true...").
3. Watch for **NOT / EXCEPT / ALWAYS / NEVER** words.
4. **Eliminate** wrong options first. Two are usually obviously wrong.
5. If two answers look right, pick the one that matches the **official terminology** (e.g. `-replace` over `taint`, `-refresh-only` over `refresh`, `moved` block over `state mv`).
6. For "select all that apply", the question tells you **how many** to choose.
7. Use remaining time to re-check flagged items.

### Common trap patterns

| Trap | Truth |
|---|---|
| "`validate` checks the cloud resources exist" | No. Syntax/consistency only, offline |
| "`plan` creates resources" | No. Read-only |
| "`sensitive` encrypts state" | No. Plain text in state |
| "`state rm` destroys the resource" | No. It forgets it |
| "`version` works on local modules" | No. Registry only |
| "Backend can use variables" | No |
| "`count` and `for_each` together" | Not allowed |
| "Data sources create resources" | No. Read-only |
| "Terraform is imperative" | Declarative |
| "Workspaces = strong isolation" | They aren't |

---

## Part 2: Cheat sheet

### CLI commands

| Command | One-liner |
|---|---|
| `init` | Install providers/modules, set up backend, write lock file |
| `fmt` | Canonical style |
| `validate` | Syntax and consistency check (offline) |
| `plan` | Preview (read-only) |
| `apply` | Make the changes |
| `destroy` | Destroy everything in state for this config |
| `show` | Human-readable state or saved plan |
| `output` | Print outputs (`-raw`, `-json`) |
| `console` | Test expressions |
| `graph` | Dependency graph |
| `providers` | Show providers needed |
| `version` | Versions |
| `login` / `logout` | HCP Terraform / registry token |
| `workspace` | `list`, `new`, `select`, `show`, `delete` |
| `state` | `list`, `show`, `mv`, `rm`, `pull`, `push` |
| `import` | Add existing resource to state |
| `force-unlock` | Remove a stale lock |
| `test` | Run `.tftest.hcl` tests |

### Flags

`-auto-approve` · `-out=file` · `-var` · `-var-file` · `-target` · `-replace` · `-refresh-only` · `-refresh=false` · `-destroy` · `-lock=false` · `-lock-timeout` · `-parallelism=n` · `-upgrade` · `-migrate-state` · `-reconfigure` · `-backend-config` · `-recursive` (fmt) · `-check` (fmt) · `-detailed-exitcode` · `-generate-config-out`

### Environment variables

| Variable | Use |
|---|---|
| `TF_VAR_name` | Set variable `name` |
| `TF_LOG` | Log level (TRACE most verbose) |
| `TF_LOG_PATH` | Log file |
| `TF_LOG_CORE` / `TF_LOG_PROVIDER` | Separate levels |
| `TF_INPUT=false` | No prompts |
| `TF_WORKSPACE` | Select a workspace |
| `TF_CLI_ARGS` | Extra default args |

### Files

| File | Meaning | Git? |
|---|---|---|
| `*.tf` | Config | ✅ |
| `terraform.tfvars`, `*.auto.tfvars` | Variable values | ⚠️ only if no secrets |
| `.terraform.lock.hcl` | Provider lock | ✅ |
| `terraform.tfstate`(`.backup`) | State | ❌ |
| `.terraform/` | Plugins, modules, backend cache | ❌ |
| `*.tfplan` | Saved plan | ❌ |
| `crash.log` | Crash report | ❌ |

### Blocks

`terraform` · `provider` · `resource` · `data` · `variable` · `output` · `locals` · `module` · `moved` · `import` · `removed` · `check`

### Reference syntax

`var.x` · `local.x` · `aws_x.name.attr` · `data.aws_x.name.attr` · `module.name.output` · `each.key/value` · `count.index` · `path.module/root/cwd` · `terraform.workspace` · `self`

### Version constraints

`=` `!=` `>` `>=` `<` `<=` `~>` ( `~> 1.4` → ≥1.4,<2.0 ; `~> 1.4.2` → ≥1.4.2,<1.5.0 )

### Variable precedence (low → high)

default → `TF_VAR_*` → `terraform.tfvars` → `terraform.tfvars.json` → `*.auto.tfvars*` → `-var` / `-var-file`

### Lifecycle

`create_before_destroy` · `prevent_destroy` · `ignore_changes` · `replace_triggered_by` · `precondition` · `postcondition`

### Plan symbols

`+` create · `-` destroy · `~` update · `-/+` replace · `<=` read

### Deprecated → modern

| Old | New |
|---|---|
| `terraform taint` | `apply -replace=addr` |
| `terraform refresh` | `apply -refresh-only` |
| `backend "remote"` | `cloud` block |
| `terraform import` command | `import` block |
| `state mv` | `moved` block |
| `state rm` | `removed` block |
| DynamoDB locking for S3 | S3 native lockfile (newer versions) |

### HCP Terraform one-liners

- **Workspace** = own state + variables + runs + permissions
- **Project** = group of workspaces
- **Run task** = third-party check inside a run
- **Sentinel/OPA** = policy as code; Sentinel levels: advisory / soft-mandatory / hard-mandatory
- **Execution modes**: remote / local / agent
- **Workflows**: VCS / CLI / API
- **Speculative plan** = plan-only on PRs
- **Variable set** = reusable variables across workspaces
- **Private registry** = internal modules/providers
- **HCP Terraform** = SaaS; **Terraform Enterprise** = self-hosted

---

## Part 3: Practice questions (40)

### Domain 1: IaC

**Q1.** Which is a benefit of IaC? *(select two)*
A. Manual configuration of each server
B. Repeatable environments
C. Versioned infrastructure history
D. Removing the need for cloud providers

**Q2.** Terraform's configuration approach is best described as:
A. Imperative  B. Declarative  C. Procedural  D. Event-driven

**Q3.** What lets Terraform manage resources across many different platforms?
A. Modules  B. Providers  C. Workspaces  D. Backends

### Domain 2: Fundamentals

**Q4.** Which version constraint allows 3.2.0 and 3.9.0 but not 4.0.0?
A. `= 3.2`  B. `~> 3.2`  C. `~> 3.2.0`  D. `> 3.2`

**Q5.** Which file records the exact provider versions selected?
A. `terraform.tfstate`  B. `.terraform.lock.hcl`  C. `versions.tf`  D. `providers.tfvars`

**Q6.** How do you deploy to two AWS regions in one configuration?
A. Two `terraform` blocks
B. A second provider block with an `alias`
C. Use two workspaces only
D. Set `region` as a list

**Q7.** True or false: `required_version` in the `terraform` block constrains provider versions.

### Domain 3: Workflow

**Q8.** Which command downloads providers?
A. `plan`  B. `apply`  C. `init`  D. `validate`

**Q9.** `terraform validate`:
A. Checks that the AMI exists in AWS
B. Checks syntax and internal consistency without calling providers' APIs
C. Compares state to real infrastructure
D. Applies changes

**Q10.** How do you ensure the exact plan you reviewed is what gets applied?
A. `apply -auto-approve`
B. `plan -out=tfplan` then `apply tfplan`
C. `apply -target`
D. `validate -out`

**Q11.** What does `-/+` in plan output mean?
A. Update in place  B. Replace (destroy and recreate)  C. Read  D. Import

**Q12.** What does `terraform destroy` remove?
A. All resources in the cloud account
B. Resources tracked in the current configuration's state
C. Only data sources
D. Only the state file

**Q13.** Which command rewrites files into canonical style?
A. `terraform validate`  B. `terraform style`  C. `terraform fmt`  D. `terraform lint`

### Domain 4: Configuration

**Q14.** What's the difference between `resource` and `data` blocks?
A. None
B. `data` reads existing information and does not create it
C. `data` creates resources faster
D. `resource` is read-only

**Q15.** How do you reference the `id` of `data "aws_ami" "ubuntu"`?
A. `aws_ami.ubuntu.id`  B. `data.aws_ami.ubuntu.id`  C. `data.ubuntu.id`  D. `ami.ubuntu.id`

**Q16.** `TF_VAR_env=dev`, `terraform.tfvars` has `env = "qa"`, and you run `terraform apply -var="env=prod"`. Which value is used?
A. dev  B. qa  C. prod  D. error

**Q17.** What happens when a variable with no default has no value supplied?
A. It's `null`
B. Terraform prompts (or errors if non-interactive)
C. Empty string
D. Uses `TF_VAR` of another name

**Q18.** Which cannot be indexed with `[0]`?
A. list  B. tuple  C. set  D. string index via function

**Q19.** Why prefer `for_each` over `count` for a list of users where items may be removed?
A. `for_each` is faster
B. `for_each` tracks by key so removing one doesn't shift others
C. `count` isn't supported
D. `for_each` uses less memory

**Q20.** Can `count` and `for_each` be used together in one resource?
A. Yes  B. No

**Q21.** Which block generates repeated nested blocks (such as `ingress` rules)?
A. `for_each` on the resource  B. `dynamic`  C. `count` inside the block  D. `locals`

**Q22.** Which expression produces `["A","B"]` from `["a","b"]`?
A. `{ for x in l : upper(x) }`
B. `[for x in l : upper(x)]`
C. `upper(l)[*]`
D. `map(upper, l)`

**Q23.** What does `lookup({a=1}, "b", 5)` return?
A. error  B. null  C. 5  D. 1

**Q24.** Which lifecycle argument builds the replacement before destroying the old resource?
A. `prevent_destroy`  B. `ignore_changes`  C. `create_before_destroy`  D. `replace_triggered_by`

**Q25.** `sensitive = true` on a variable:
A. Encrypts it in state
B. Hides it from CLI output but it remains in state in plain text
C. Prevents it from being used in resources
D. Removes it from state

**Q26.** Which custom condition produces only a warning instead of an error?
A. `validation`  B. `precondition`  C. `postcondition`  D. `check` block

**Q27.** Which is the best way to give Terraform a database password?
A. Hard-code in `main.tf`
B. Commit a `.tfvars` file
C. Fetch from a secrets manager such as Vault or supply via an environment variable
D. Put it in the module name

**Q28.** Which dependency type is created automatically when one resource references another?
A. Explicit  B. Implicit  C. Lifecycle  D. Provider

### Domain 5: Modules

**Q29.** How does a parent module use a value created inside a child module?
A. `module.child.aws_instance.x.id` directly
B. Through an `output` in the child: `module.child.<output>`
C. Through `var.child`
D. Through `local.child`

**Q30.** Which module sources support the `version` argument?
A. Local paths  B. Git URLs  C. Terraform Registry (public/private)  D. HTTP URLs

**Q31.** After adding a new `module` block you must run:
A. `terraform fmt`  B. `terraform init`  C. `terraform refresh`  D. nothing

**Q32.** How do you pin a module from Git to a tag?
A. `version = "v1.0"`
B. `source = "git::https://...git?ref=v1.0"`
C. `tag = "v1.0"`
D. It cannot be pinned

### Domain 6: State

**Q33.** What does state locking prevent?
A. Provider downloads
B. Concurrent operations corrupting state
C. Variable changes
D. Destroy

**Q34.** Can a `backend` block reference `var.bucket`?
A. Yes  B. No

**Q35.** What's the modern way to update state to match real infrastructure without changing it?
A. `terraform refresh`  B. `terraform apply -refresh-only`  C. `terraform taint`  D. `terraform state pull`

**Q36.** Which is true of the default `terraform.tfstate`?
A. Always encrypted
B. It may contain sensitive values in plain text
C. It never contains secrets
D. It's stored in `.terraform/`

### Domain 7: Maintain

**Q37.** What does `terraform state rm aws_instance.web` do?
A. Destroys the instance
B. Removes it from state; the instance continues to exist
C. Removes it from config
D. Replaces it

**Q38.** Which environment variable writes logs to a file?
A. `TF_LOG`  B. `TF_LOG_PATH`  C. `TF_DEBUG`  D. `TF_OUT`

**Q39.** What must exist for `terraform import aws_s3_bucket.b my-bucket` to be useful?
A. A matching `resource "aws_s3_bucket" "b"` block in config
B. A module
C. A workspace
D. Nothing

### Domain 8: HCP Terraform

**Q40.** What does a speculative plan do?
A. Applies automatically
B. Runs a plan only (e.g. on a pull request) and can't be applied
C. Destroys resources
D. Imports resources

<details><summary><strong>Answers and explanations</strong></summary>

1. **B, C**. Automation, consistency, versioning are IaC benefits; manual config is the opposite.
2. **B**. Declarative.
3. **B**. Providers are plugins for each platform.
4. **B**. `~> 3.2` allows ≥3.2 and <4.0. `~> 3.2.0` would stop below 3.3.0.
5. **B**. The lock file stores exact versions and hashes.
6. **B**. Provider alias.
7. **False**. It constrains the Terraform CLI version.
8. **C**. `init`.
9. **B**. Offline syntax/consistency only.
10. **B**. Saved plan.
11. **B**. Replace.
12. **B**. Resources tracked in the state of this config.
13. **C**. `terraform fmt`.
14. **B**. Data sources are read-only.
15. **B**. Data sources need the `data.` prefix.
16. **C**. `-var` has the highest precedence.
17. **B**. Prompts (error in non-interactive mode).
18. **C**. Sets have no order or index; convert with `tolist`.
19. **B**. Key-based identity.
20. **B**. Mutually exclusive.
21. **B**. `dynamic`.
22. **B**. Square brackets produce a list.
23. **C**. The default value, 5.
24. **C**. `create_before_destroy`.
25. **B**. State still holds the value in plain text.
26. **D**. `check` blocks warn only.
27. **C**. Never hard-code or commit secrets.
28. **B**. Implicit dependency.
29. **B**. Only via outputs.
30. **C**. Only registry modules use `version`.
31. **B**. `init` installs modules.
32. **B**. Use `?ref=` for Git sources.
33. **B**. Locking prevents concurrent write corruption.
34. **B**. Backend blocks can't use variables.
35. **B**. `-refresh-only`; `terraform refresh` is deprecated.
36. **B**. Plain text; protect it.
37. **B**. Forget only.
38. **B**. `TF_LOG_PATH`.
39. **A**. You must write the resource block.
40. **B**. Plan-only, not applicable.
</details>

---

## Part 4: Self-explain checklist (say each out loud in 30 seconds)

- [ ] Why does Terraform need state?
- [ ] What happens during `init`, `plan`, `apply`?
- [ ] `count` vs `for_each`: when does each break?
- [ ] Explain variable precedence with an example.
- [ ] Why isn't `sensitive` real security?
- [ ] How do module inputs/outputs work, and why can't you reach inside a child?
- [ ] What is drift, how is it detected, and how is it fixed?
- [ ] `import` vs `state mv` vs `state rm`: pick the right one for three scenarios.
- [ ] What is a workspace in HCP Terraform, and how is it different from a CLI workspace?
- [ ] What does Sentinel do and what are the three enforcement levels?

If you can explain all ten without notes, you're ready.

---

## Part 5: Final-week schedule

| Day | Do |
|---|---|
| 15 | Practice test #1 (timed 60 min), list every missed topic |
| 16 | Re-study missed topics, redo related labs |
| 17 | Practice test #2 (aim ≥ 80%) |
| 18 | One end-to-end lab: modules + variables + remote state + import |
| 19 | Cheat sheet review, read the docs on `terraform state`, backends, and HCP Terraform |
| 20 | Light review only (1 hr). Rest. Exam. |

Also use the **official sample questions** and **study guide** on developer.hashicorp.com, and a reputable third-party practice test set (check recent reviews) because the more varied wording you see, the better.

Good luck. 🎯
