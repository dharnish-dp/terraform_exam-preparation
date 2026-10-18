# Terraform Associate (004) — Beginner Study Material

Written for someone with **basic terminal knowledge and very basic AWS**. Every lesson starts from zero, explains the *why*, then shows exam traps and a hands-on lab.

- **Exam:** HashiCorp Certified: Terraform Associate (004), tests **Terraform 1.12**
- **Format:** 1 hour, multiple choice, online proctored (check the official page for the current question count and passing score)
- **Official page:** https://developer.hashicorp.com/certifications/terraform-associate
- **Always re-check** the official exam objectives before you book. HashiCorp updates them.

---

## How to use this material

1. Do **one lesson per day**, in order. Each builds on the previous one.
2. Read the lesson, then **type the lab yourself** (never copy-paste). Typing is what makes commands stick.
3. Answer the **quiz at the end** without looking. Re-read any section you miss.
4. Keep a personal notebook of "things that surprised me". Those are usually exam questions.
5. Use `13-exam-prep.md` from Day 15 onward.

## Setup you need before Day 1

- A terminal: macOS/Linux terminal, or **PowerShell on Windows** (read Part 1B of Lesson 00 first)
- A free editor: VS Code + the "HashiCorp Terraform" extension
- Terraform installed (Lesson 01 shows how)
- An AWS free-tier account **only from Lesson 05** (earlier labs need no cloud account)
- A **billing alert** in AWS (Lesson 00 explains it)

---

## Lesson list

| Day | File | Topic | Exam domain |
|---|---|---|---|
| 0 / 1 | [00-prerequisites.md](00-prerequisites.md) | Terminal, cloud, AWS, JSON basics: the pre-concepts | none (foundation) |
| 1 | [01-iac-and-terraform-intro.md](01-iac-and-terraform-intro.md) | What IaC is, what Terraform is, install, first config | 1 |
| 2 | [02-providers.md](02-providers.md) | Providers, versions, lock file, aliases | 2 |
| 3 | [03-core-workflow.md](03-core-workflow.md) | init, validate, fmt, plan, apply, destroy | 3 |
| 4 | [04-state-basics.md](04-state-basics.md) | What state is and why it exists | 2, 6 |
| 5 | [05-resources-data-dependencies.md](05-resources-data-dependencies.md) | Resource vs data blocks, references, dependencies | 4 |
| 6 | [06-variables-outputs-locals.md](06-variables-outputs-locals.md) | Variables, precedence, outputs, locals | 4 |
| 7 | [07-types-loops-functions.md](07-types-loops-functions.md) | Complex types, count, for_each, for, dynamic, functions | 4 |
| 8 | [08-lifecycle-conditions-sensitive.md](08-lifecycle-conditions-sensitive.md) | lifecycle, validation/preconditions, sensitive data, Vault | 4 |
| 9 | Review days 1 to 8 | Redo labs, quiz yourself | 1 to 4 |
| 10-11 | [09-modules.md](09-modules.md) | Modules: sources, scope, versioning, build your own | 5 |
| 12 | [10-backends-locking-drift.md](10-backends-locking-drift.md) | Remote state, locking, drift | 6 |
| 13 | [11-import-state-cli-logging.md](11-import-state-cli-logging.md) | import, state commands, replace, logging | 7 |
| 14 | [12-hcp-terraform.md](12-hcp-terraform.md) | HCP Terraform: workspaces, projects, governance | 8 |
| 15-20 | [13-exam-prep.md](13-exam-prep.md) | Practice questions, cheat sheet, exam-day strategy | all |


---

## Exam domains at a glance

1. **Infrastructure as Code with Terraform** — concepts and benefits
2. **Terraform fundamentals** — providers, state
3. **Core Terraform workflow** — init, plan, apply, destroy, fmt, validate
4. **Terraform configuration** — resources, data, variables, outputs, expressions, functions, dependencies, custom conditions, sensitive data
5. **Terraform modules**
6. **Terraform state management** — backends, locking, drift
7. **Maintain infrastructure with Terraform** — import, state CLI, logging
8. **HCP Terraform** — workspaces, projects, collaboration, governance

**Where most marks live:** domains 3, 4, 5 and 6. Spend your time there.

## Legend used in lessons

- 🧠 **Pre-concept**: plain-English background you need first
- 🎯 **Exam focus**: what gets asked and the usual traps
- 🧪 **Lab**: hands-on practice
- ❓ **Quiz**: self-test with answers
- ⚠️ **Gotcha**: common beginner mistake

## Tip about versions

Terraform and its providers change. Features deprecated recently (like `terraform taint` and `terraform refresh`) still show up in exam questions as "what is the modern replacement?". The lessons call these out.
