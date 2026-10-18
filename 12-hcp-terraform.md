# Lesson 12 — HCP Terraform (and Terraform Enterprise)

**Exam domain 8** · **Time:** 2.5 hours. Mostly concepts, so make **flashcards**. Hands-on is optional but very helpful (there is a free tier).

> ⚠️ HashiCorp renames and re-tiers features often. Check the current docs for exact plan names and prices. The concepts below are what the exam tests.

## 🧠 Pre-concept: what problem does it solve?

Terraform CLI on your laptop works for one person. A real team needs:

- Shared, secure, locked **remote state**
- A **consistent place to run** Terraform (not 10 laptops with different versions)
- **Access control** (who can apply to prod?)
- **Approval workflows** and **policy** (e.g. "no public S3 buckets")
- **Secret storage** for cloud credentials
- **Private module registry**
- **Audit logs** and **cost estimates**

**HCP Terraform** (formerly Terraform Cloud) is HashiCorp's **managed SaaS** that provides all of that. **Terraform Enterprise** is the **self-hosted** version of the same platform for organizations that must run it in their own infrastructure.

## Key concepts

### Organization

Top-level container for your team's resources, users, teams, and settings.

### Workspace ⭐ (different from CLI workspaces!)

In HCP Terraform a **workspace** is the unit that holds **one configuration's** infrastructure management: it has its **own**:

- **State** (with versions/history, locking, encryption)
- **Variables** (Terraform and environment variables)
- **Run history** and logs
- **Permissions**
- **Settings** (Terraform version, execution mode, VCS link)

Think: **one workspace ≈ one state ≈ one environment/stack** (e.g. `network-prod`, `app-dev`).

### CLI workspaces vs HCP Terraform workspaces (exam trap)

| | CLI workspace | HCP Terraform workspace |
|---|---|---|
| What | Multiple states in one config/backend | A full management unit |
| Variables | Shared | Per workspace |
| Permissions | None | Per workspace RBAC |
| Runs/history | No | Yes |
| Credentials | Your laptop | Stored in the workspace |

### Project

A way to **group workspaces** within an organization, so you can apply **permissions and settings** to a set of workspaces together (e.g. "Payments team" project).

### Teams and permissions (RBAC)

Users belong to **teams**. Teams get permissions on **projects/workspaces**. Examples of workspace-level access levels: read, plan, write, admin. Governance features and some roles depend on your plan tier.

## Ways to run (workflows)

### 1. VCS-driven workflow

Connect a workspace to a **Git repository** (GitHub, GitLab, Bitbucket, Azure DevOps).

- Pull request → HCP Terraform runs a **speculative plan** (plan-only, can't be applied) and posts the result
- Merge to the main branch → triggers a **plan**, then (after approval or auto-apply) an **apply**
- Best for GitOps

### 2. CLI-driven workflow

Use the `cloud` block in config and run `terraform plan/apply` locally. The run actually **executes remotely** in HCP Terraform and streams output back.

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "dev"
    }
  }
}
```

Authenticate with `terraform login` (stores an API token).

### 3. API-driven workflow

Other tools or pipelines trigger runs through the **HCP Terraform API** (or the `tfe` provider).

## Runs

A **run** is one plan/apply cycle. Stages:

1. **Pending** → 2. **Plan** → 3. (**Cost estimation**, **policy checks**, **run tasks**) → 4. **Approval** (manual confirm, or auto-apply) → 5. **Apply**

- **Speculative plans** = plan-only runs for PRs (can't apply)
- **Execution modes:**
  - **Remote**: runs on HCP Terraform's infrastructure (default)
  - **Local**: runs on your machine, HCP Terraform is only used to store state
  - **Agent**: runs on **your own** private agents inside your network, so it can reach private resources (firewalled databases, on-prem)

## Variables and secrets in HCP Terraform

- Two categories: **Terraform variables** (like `TF_VAR`/tfvars) and **environment variables** (like `AWS_ACCESS_KEY_ID`)
- Mark any as **sensitive**: write-only afterwards (can't be read back in the UI/API)
- **Variable sets**: define once, apply to many workspaces or projects (e.g. shared cloud credentials)
- Best practice: use **dynamic provider credentials** (OIDC) so no long-lived keys are stored

## State in HCP Terraform

- Automatically stored, **encrypted**, **versioned**, **locked** during runs
- Can **roll back** to prior state versions
- Workspaces can share outputs with each other (`tfe_outputs`, remote state sharing settings)

## Private registry

Host your organization's **own modules and providers** internally:

- Modules published from VCS repos with semantic version tags
- Source address: `app.terraform.io/<ORG>/<NAME>/<PROVIDER>`
- Provides versioning, docs, and a no-code provisioning option (**no-code modules** let non-experts deploy approved modules from a UI)

## Governance and policy as code

### Sentinel

HashiCorp's **policy-as-code framework**. Policies are written in the Sentinel language and checked **between plan and apply**.

- Examples: "all resources must have an `owner` tag", "no instance bigger than t3.large", "S3 buckets must be private"
- **Enforcement levels:** 
  - **advisory**: warns but allows
  - **soft-mandatory**: can be overridden by authorized users
  - **hard-mandatory**: must pass, no override

### OPA (Open Policy Agent)

HCP Terraform also supports policies written in **Rego** with OPA, as an alternative to Sentinel.

### Run tasks

Integrate **third-party tools** (security scanners, cost tools) at set stages of a run (pre-plan, post-plan, pre-apply, post-apply).

### Cost estimation

Shows estimated monthly cost changes after the plan (for supported clouds).

### Drift detection / Health assessments

Periodically checks the real infrastructure against state and flags **drift**, and checks **continuous validation** (the `check` blocks from Lesson 08).

## Collaboration features

- Shared state and run history visible to the team
- Comments on runs
- **Notifications** (Slack, email, webhooks) for run events
- **Audit trails** / logging of actions

## Plans and tiers (concept level)

- **Free**: remote state, VCS workflow, a limited number of managed resources, basic features
- **Standard / Plus (paid)**: teams & governance, policy enforcement (Sentinel/OPA), run tasks, drift detection, SSO and more
- **Terraform Enterprise**: self-hosted, for strict compliance/air-gapped needs

The exam asks "which feature requires a paid tier / which is available for free?". Check the current pricing page to refresh your memory.

## How Terraform CLI connects

1. `terraform login` → creates an API token in `~/.terraform.d/credentials.tfrc.json` (Windows: `%APPDATA%\terraform.d\credentials.tfrc.json`)
2. Add the `cloud { }` block
3. `terraform init` → links your folder to the workspace
4. `terraform plan/apply` → runs remotely

(In the legacy form, `backend "remote"` did the same thing. `cloud` is the recommended block now.)

## 🧪 Lab 12 (optional but recommended, free tier)

1. Create a free HCP Terraform account at app.terraform.io and an **organization**.
2. Create a workspace (CLI-driven) named `lab12`.
3. In your folder, use a `local`/`random` config (no cloud account needed) and add the `cloud` block.
4. Run `terraform login` then `terraform init`.
5. Run `terraform apply` and watch the run in the browser. See the state version appear under **States**.
6. Add a **variable** in the workspace UI, mark one as **sensitive**, and try to view it afterwards.
7. Explore: **Projects**, **Variable sets**, **Settings → Execution Mode**, **Registry**.
8. Destroy the resources when finished (workspace settings → Destruction and Deletion).

> Note: with **remote execution**, runs happen on HashiCorp's servers, so a `local_file` resource would be created there rather than on your laptop. That's fine for learning.

## 🎯 Exam focus

- What HCP Terraform provides vs plain CLI.
- Workspace definition and how it differs from CLI workspaces.
- Projects group workspaces; teams/RBAC.
- VCS-driven vs CLI-driven vs API-driven.
- Speculative plans.
- Remote vs local vs agent execution.
- Variables: sensitive, variable sets.
- Sentinel and enforcement levels; OPA; run tasks; cost estimation.
- Private registry.
- `cloud` block, `terraform login`.
- HCP Terraform (SaaS) vs Terraform Enterprise (self-hosted).

## ❓ Quiz

1. What does an HCP Terraform workspace contain?
2. What runs on a pull request in the VCS workflow, and can it be applied?
3. Which Sentinel enforcement level can't be overridden?
4. When would you use agent execution?
5. How is an HCP Terraform workspace different from a CLI workspace?
6. How do you apply one set of cloud credentials to many workspaces?
7. What's the difference between HCP Terraform and Terraform Enterprise?
8. Which command stores your API token?

<details><summary>Answers</summary>

1. Its own state, variables, run history, permissions and settings.
2. A speculative plan (plan-only). It cannot be applied.
3. `hard-mandatory`.
4. When Terraform must reach private resources inside your own network.
5. HCP workspaces are full management units (separate variables, permissions, runs, credentials); CLI workspaces only provide multiple state files for one config.
6. A variable set.
7. HCP Terraform is the managed SaaS; Terraform Enterprise is self-hosted.
8. `terraform login`.
</details>
