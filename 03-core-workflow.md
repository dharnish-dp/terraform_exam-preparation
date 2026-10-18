# Lesson 03 — The Core Terraform Workflow

**Exam domain 3** · **Time:** 2 hours. This is a high-value domain: know exactly what each command does and does NOT do.

## 🧠 Pre-concept: the loop you will repeat forever

```
 write code ─► init ─► validate ─► plan ─► apply ─► (change code) ─► plan ─► apply ... ─► destroy
```

## `terraform init`

**Prepares the working directory.** Run it first, and again whenever you add providers/modules or change the backend.

What it does:

1. Downloads **providers** into `.terraform/providers/`
2. Downloads **modules** into `.terraform/modules/`
3. Initializes the **backend** (where state is stored)
4. Creates/updates `.terraform.lock.hcl`

Useful flags:

| Flag | Meaning |
|---|---|
| `-upgrade` | Upgrade providers/modules to the newest allowed versions |
| `-reconfigure` | Reconfigure the backend, ignoring existing setup (no state migration) |
| `-migrate-state` | Move state to the new backend |
| `-backend=false` | Skip backend initialization |
| `-input=false` | Never prompt |

⚠️ `init` is **safe**. It never changes your real infrastructure. It's idempotent, so run it as often as you like.

## `terraform fmt`

Rewrites `.tf` files to the **canonical style** (indentation, aligned `=`).

- `terraform fmt` formats the current folder
- `-recursive` also formats subfolders
- `-check` only reports (exit code non-zero if changes needed), good for CI
- `-diff` shows what would change

It changes **only style**, never meaning.

## `terraform validate`

Checks the configuration is **syntactically valid and internally consistent** (correct argument names, valid references, types).

- Does **not** contact cloud APIs
- Does **not** check credentials or whether the real infrastructure exists
- Needs `init` first (it needs provider schemas)
- Does **not** read state

🎯 Exam trap: "Does `validate` verify that the AMI ID exists?" → **No.**

## `terraform plan`

Creates an **execution plan**: a preview of what Terraform will do. **It changes nothing.**

How it works:

1. Reads your configuration (desired state)
2. Reads the state file
3. **Refreshes**: queries real infrastructure to update its knowledge
4. Compares and calculates the differences

Symbols in plan output:

| Symbol | Meaning |
|---|---|
| `+` | create |
| `-` | destroy |
| `~` | update in place |
| `-/+` | destroy and re-create (replace) |
| `+/-` | create then destroy (with `create_before_destroy`) |
| `<=` | read (data source) |

Summary line: `Plan: 2 to add, 1 to change, 0 to destroy.`

Useful flags:

| Flag | Meaning |
|---|---|
| `-out=tfplan` | Save the plan to a file |
| `-var 'x=1'` / `-var-file=f.tfvars` | Provide variables |
| `-target=addr` | Plan only a specific resource (use rarely) |
| `-destroy` | Plan a destroy |
| `-refresh-only` | Only update state to match reality, no config changes |
| `-replace=addr` | Force replacement of a resource |
| `-refresh=false` | Skip the refresh step |
| `-detailed-exitcode` | Exit 0 = no change, 2 = changes, 1 = error |

### Saved plans

```bash
terraform plan -out=tfplan
terraform apply tfplan      # applies exactly that plan, no confirmation prompt
```

A saved plan guarantees that what you reviewed is what gets applied. Saved plans may contain sensitive data, so protect the file.

## `terraform apply`

Executes the plan and changes real infrastructure, then updates state.

- With no plan file, it first generates a plan and asks `Enter a value:` → type **`yes`**.
- `-auto-approve` skips the prompt (used in automation; risky by hand).
- `terraform apply tfplan` applies a saved plan **without prompting**.
- Terraform applies in **dependency order** and runs independent actions **in parallel** (default 10 concurrent operations, controlled by `-parallelism=n`).
- If it fails halfway, resources already created stay created and are saved in state. Fix and re-apply.

## `terraform destroy`

Destroys **everything managed by the current configuration and state**.

- It's basically `terraform apply -destroy`.
- Asks for `yes` unless `-auto-approve`.
- `terraform plan -destroy` previews it.
- Use `-target` to destroy a single resource (rare).

🎯 Destroy removes what's in **state**, not everything in your cloud account.

## `terraform show` and `terraform output`

- `terraform show`: human-readable view of the current state (or a saved plan: `terraform show tfplan`)
- `terraform show -json`: machine-readable
- `terraform output`: print output values
- `terraform output -raw name` / `-json`

## Other helper commands

| Command | Purpose |
|---|---|
| `terraform version` | Show Terraform + provider versions |
| `terraform providers` | Show required providers |
| `terraform graph` | Print the dependency graph (DOT format) |
| `terraform console` | Interactive prompt to test expressions/functions |
| `terraform login` / `logout` | Authenticate to HCP Terraform / registry |
| `terraform workspace ...` | CLI workspaces (Lesson 10) |
| `terraform test` | Run Terraform's built-in tests (`.tftest.hcl` files) |

## Idempotency in action

Run `terraform apply` twice with no code changes. The second run says **"No changes. Your infrastructure matches the configuration."** That's the declarative model.

## Order to remember

`init` → `fmt` → `validate` → `plan` → `apply` → `destroy`

## 🧪 Lab 3

```bash
mkdir ~/tf-lab3      # Windows: mkdir C:\tf-labs\lab3
cd ~/tf-lab3         # Windows: cd C:\tf-labs\lab3
```

`main.tf` (deliberately badly formatted):

```hcl
terraform {
required_providers {
local = { source = "hashicorp/local" }
}
}
resource "local_file" "a" {
filename="${path.module}/a.txt"
    content = "first"
}
```

1. `terraform fmt -diff` → then `terraform fmt`. See the file fixed.
2. `terraform validate` before `init` → read the error. Run `terraform init`, validate again.
3. `terraform plan -out=tfplan`, then `terraform show tfplan`.
4. `terraform apply tfplan` (note: no prompt).
5. Run `terraform apply` again → "No changes".
6. Change `content`, run `terraform plan`. Read the symbols (`-/+` or `~`).
7. Add a second resource `local_file.b`. Plan, then apply.
8. `terraform plan -destroy` → then `terraform destroy`.
9. Typo test: change `filename` to `filenam` and run `validate`.

## 🎯 Exam focus

- What each command does, and the standard order.
- `plan` is **read-only** and `validate` is **offline**.
- `-auto-approve`, `-out`, `-target`, `-replace`, `-refresh-only`.
- Applying a saved plan skips the prompt.
- `init` downloads providers **and** modules and sets up the backend.
- Plan symbols.
- `destroy` = destroy everything in this configuration's state.

## ❓ Quiz

1. Which command downloads providers and sets up the backend?
2. Does `terraform validate` contact AWS?
3. How do you make sure what you reviewed is exactly what is applied?
4. What does `-/+` mean in a plan?
5. What does `terraform fmt -check` do?
6. Does `terraform plan` modify real infrastructure or state?
7. What flag skips the approval prompt on apply?

<details><summary>Answers</summary>

1. `terraform init`.
2. No. It only checks syntax and internal consistency.
3. Save with `terraform plan -out=file`, then `terraform apply file`.
4. The resource will be destroyed and re-created (replaced).
5. Reports whether files need formatting (non-zero exit) without changing them.
6. Neither infrastructure nor config. (A normal plan doesn't write state either, though it refreshes in memory.)
7. `-auto-approve`.
</details>
