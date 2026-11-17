## Objective 8 — HCP Terraform

**Why this section matters:** HCP Terraform (Objective 8) is your weakest area. It was missed in all five quizzes: 6 times under 8c, 6 times under 8b, 2 times under 8a, and 1 time under 8d. That is 15 misses in total. Most of them are "pick the right feature for the job" questions. Learn the one-line job of each feature and you win these.

**Codes:** 8a = create infrastructure and workflows. 8b = collaboration and governance. 8c = workspaces, projects, variable sets. 8d = integration with the CLI and other tools.

### The big picture (read this first)

Think of HCP Terraform as an office building.

- The **organization** is the whole building. Billing, teams, users and the private registry live here.
- A **project** is a floor or a folder. It holds a group of workspaces.
- A **workspace** is a room. It holds one config's code link, variables, state and runs.
- A **run** is one job done in that room: plan, then (cost estimate, policy check), then apply.

```
Organization
  +-- Project (folder of workspaces; team access set here)
        +-- Workspace (code link + variables + state + runs)
              +-- Run (plan -> cost estimate -> policy check -> apply)
```

(The run stage order is from your lesson notes.)

**HCP Terraform vs open-source CLI**

| Thing | Open-source CLI on your laptop | HCP Terraform |
|---|---|---|
| Where plan/apply runs | Your machine | HCP Terraform's own servers (a "remote operation") |
| State | Local `terraform.tfstate` by default | Stored, versioned and locked for you |
| Secrets | Shell env vars, `.tfvars` files | Sensitive workspace variables, variable sets |
| Who can do what | Whoever has the files | Teams with permissions (org, project, workspace) |
| Policy checks | None built in | Sentinel / policy sets (paid tiers) |
| Run history | Not saved | Every run saved with who triggered and approved it |
| Private module/provider sharing | You build it | Built-in private registry |

**The three workflows (how a run starts)**

| Workflow | Where your code lives | Where the run executes | One-line use |
|---|---|---|---|
| VCS-driven | A Git repo linked to the workspace | HCP Terraform | Most common. Traceability. A commit or PR starts runs. |
| CLI-driven | Your local folder | HCP Terraform (you type the command locally, output streams back) | "I do not want to commit to Git but I want remote runs." |
| API-driven | Anywhere, pushed through the API | HCP Terraform | Custom automation and integrations. |

---

### Variable sets and variable scope (8c) — missed 3x

**In one line:** A variable set is a "define once, share everywhere" bundle of variables. You can attach it to many workspaces, to a whole project, or to the whole organization.

**Explain it simply:** Imagine a shared company phone book. Instead of writing the same phone number on a sticky note in every room (every workspace), you put it in one book. Fix the number once and every room sees the new number.

**Where can a variable live?**

| Scope | What it means |
|---|---|
| Single workspace | Variable defined directly in that one workspace |
| Variable set on selected workspaces | Shared by the workspaces you pick |
| Variable set on a project | Shared by all current AND future workspaces (and Stacks) in that project |
| Variable set global to the organization | Shared by every workspace in that org |
| Across multiple organizations | Does NOT exist |

**Exam trap:** "Variable in each workspace, marked sensitive" looks safe but is the duplicated, error-prone answer. Also, "all workspaces across multiple organizations" is always wrong. Variable sets are org-level objects. Credentials in `terraform.tfvars`, `locals`, or run tasks are never the right way to share credentials.

**Example (share cloud credentials with a team):**
1. Create a variable set that holds the credentials (mark secrets sensitive).
2. Group the team's workspaces into a project.
3. Apply the variable set to the project.

**Seen in quizzes:**
- Quiz 2 Q18 (share third-party credentials; I missed "apply the variable set to the project").
- Quiz 2 Q40 (scope levels; I picked "across multiple organizations" and missed "single workspace").
- Quiz 4 Q25 (define credentials and tags once; I picked locals + run tasks).

---

### Run tasks vs run triggers (8b / 8c) — missed 2x (a look-alike pair)

**In one line:** Run TASKS plug an outside tool into a run (like a security scanner). Run TRIGGERS chain one workspace's run to another workspace's run.

**Explain it simply:**
- Run **task** = a guest inspector who walks in between plan and apply, checks the plan, and says "OK" or "not OK". Examples are a security scanner or a cost check. It can be advisory (just a warning) or mandatory (blocks).
- Run **trigger** = dominoes. When workspace A finishes applying successfully, a new run is queued in workspace B.

| Feature | What it does | Think of it as |
|---|---|---|
| Run task | Calls an external service during a run (after plan, before apply) | Inspector |
| Run trigger | After workspace A applies, queue a run in workspace B | Dominoes |
| Health assessment | Checks over time for drift and failed conditions | Smoke alarm |
| Apply method (manual confirm) | Human clicks "Confirm & Apply" | Approval stamp |

**Exam trap:** "Require human approval before applying" is NOT run triggers. That is the manual apply setting. "Temporary credentials" is dynamic credentials, not triggers. "Always run the newest commit" is the VCS-driven workflow, not triggers. "Health assessments" is the wrong answer when the question says "third-party scanner between plan and apply".

**Seen in quizzes:**
- Quiz 1 Q32 (purpose of a run trigger; I picked "require human approval").
- Quiz 2 Q14 (third-party security scanners between plan and apply; I picked health assessments, correct is run tasks).

---

### Health assessments and drift detection (8b) — missed 2x

**In one line:** Health assessments watch your workspace on a schedule. They do drift detection (does real infrastructure still match?) and continuous validation (do your `check` conditions still pass?). They NEVER fix anything.

**Explain it simply:** Like a smoke alarm. It beeps when something is wrong. It does not put out the fire and it does not rebuild the house. A human decides whether to run an apply.

**Drift** means someone changed the real infrastructure by hand, so it no longer matches what Terraform expects.

**Exam trap:**
- "Drift detection can automatically run apply to fix drift" is FALSE. It only detects and notifies.
- "Automatic rollback" does not exist.
- "Runs Sentinel before every apply" is a different feature (policies). Health assessments are not Sentinel.

**From your lesson notes:** health assessments need paid tiers (Standard and Premium, and Enterprise). The lowest tier does not include them.

**Seen in quizzes:**
- Quiz 5 Q33 (benefits of workspace health checks; I picked "Sentinel before every apply" and "auto rollback", and missed "detect drift" + "continuously validate conditions").
- Quiz 5 Q42 (True/False: drift detection can auto-apply; I said True, correct is False).
- Quiz 2 Q14 (health assessments appeared as a wrong option next to run tasks).

---

### Projects and workspaces (8c) — missed 1x (plus it shows up inside other answers)

**In one line:** A project is a folder that groups workspaces. Every workspace sits in exactly one project, and you can set team access and share variable sets per project.

**Explain it simply:** Workspaces are files, projects are folders. Dozens of files in one pile is messy. Put each team's files in that team's folder, and give the team a key to that folder.

**Exam trap:** The scenario says "many workspaces, simplify structure, better access control, group by function". Wrong answers are "create multiple organizations" (more overhead, harder access control), "use tags" (tags only help you filter and give no access boundary), and "use variable sets" (they share values, not structure).

**Seen in quizzes:**
- Quiz 5 Q5 (organizing dozens of workspaces; I picked multiple organizations, correct is a team project).
- Quiz 2 Q18 and Quiz 4 Q25 (the project is the scope you attach a variable set to).

---

### Teams and permissions (8b) — missed 1x

**In one line:** You give permissions to TEAMS, at three levels: organization, project, and workspace. Tags never grant permissions.

**Explain it simply:** Teams are badge groups. A badge can open the whole building (organization level), one floor (project level), or one room (workspace level). A sticky label on a door (a tag) does not open anything. It only helps you find the door.

| Level | Example of what it controls |
|---|---|
| Organization | Admin access to settings and policies |
| Project | Permissions across all workspaces in the project |
| Workspace | Which teams can plan or apply in that one workspace |

**Exam trap:** "Workspace tags automatically grant permissions" is wrong. Tags only organize. "Public access mode" does not exist. Per-user permissions without teams is not the recommended way.

**From your lesson notes:** every org has a default `owners` team with the highest access. Creating extra teams needs a higher plan.

**Seen in quizzes:** Quiz 4 Q9 (ways to manage permissions, pick three; I picked tags and missed organization-level permissions).

---

### Policies and Sentinel (8b) — missed 1x

**In one line:** Sentinel is "policy as code". A policy gets grouped into a policy set, and the policy set is attached to workspaces or projects. The enforcement level is set on the policy (or policy set) and decides if a failure blocks the run.

**Explain it simply:** A policy is a rule like "every EC2 must have tags". It is a bouncer at the door. The enforcement level says how strict the bouncer is.

| Enforcement level | If the policy fails |
|---|---|
| Advisory | Logs a warning only. The run keeps going. |
| Soft mandatory | Blocks the run, but an authorized person can override it. |
| Hard mandatory | Blocks the run. Nobody can override it. |

**Structure:** Policy -> Policy set -> attached to workspaces (all, or chosen ones) or to projects.

**Exam trap:** "Some projects need advisory checks, others need mandatory enforcement." The answer is: set different enforcement levels per policy set and attach each set to the right workspaces or projects. Wrong answers: separate organizations (needless overhead), run triggers (they only chain runs), or org-wide policy and then disable it per workspace (inconsistent).

**Extra context:** Besides Sentinel, HCP Terraform can also use OPA policies. **From your lesson notes:** Sentinel is a paid feature.

**Seen in quizzes:** Quiz 2 Q8 (advisory vs mandatory; I picked run triggers based on workspace names).

---

### Reading another workspace's outputs: tfe_outputs (8c) — missed 1x

**In one line:** To read the outputs of another HCP Terraform workspace, use the `tfe_outputs` data source.

**Explain it simply:** The webserver workspace publishes its public IP on a notice board (its output). The DNS workspace uses `tfe_outputs` to read that board live. No copy and paste.

```hcl
data "tfe_outputs" "webserver" {
  organization = "bk-organization"
  workspace    = "prod-webserver"
}
# use it:  data.tfe_outputs.webserver.values.public_ip
```

**Exam trap:** A `dynamic` block does not fetch anything (it just generates repeated nested blocks). A variable default would have to be edited by hand. A "remote_state backend block" is not how you do it here, because the exam answer is `tfe_outputs`.

**Seen in quizzes:** Quiz 3 Q35 (prod-dns needs the IP from prod-webserver; I picked a dynamic block).

---

### Explorer (8b) — missed 1x

**In one line:** Explorer is the HCP Terraform feature that searches across the whole organization for resources, workspaces, providers and module usage, without opening each state.

**Explain it simply:** It is the building's search bar. "Which rooms contain the S3 bucket production-data-lake?" Type it in and Explorer lists the workspaces.

**Exam trap:** "State inspector", "Workspace navigator", and "Resource finder" are made-up names. If you see these, they are decoys.

**Seen in quizzes:** Quiz 4 Q49 (find which workspaces manage a bucket; I picked "Workspace navigator").

---

### HCP Terraform agents (8a) — missed 1x

**In one line:** An agent is a small program you run INSIDE your private network. It pulls jobs from HCP Terraform and runs plan/apply locally against infrastructure the internet cannot reach.

**Explain it simply:** HCP Terraform is head office. Your private data center has a locked door. You place a trusted courier (the agent) inside. Head office hands the courier the job, and the courier does the work inside. Nobody needs to open the door from outside.

**Exam trap:** Agents do NOT store state (state storage is a core HCP Terraform service). They are not for "monitoring without the UI" and not mainly "remote access to manage workspaces". Their primary job is to execute plans and applies for private or on-premises infrastructure.

**Seen in quizzes:** Quiz 3 Q5 (primary function of agents; I picked "store and manage state files").

---

### VCS-driven workflow and speculative plans (8a) — missed 1x

**In one line:** In the VCS workflow, opening a pull request starts a speculative plan (plan only, changes nothing) and posts the result on the PR. The real apply happens only after merge, and only if configured.

**Explain it simply:** A speculative plan is a "dry run" printed on the PR so reviewers can see what would change. No bricks are laid.

**Exam trap:** On a PR, HCP Terraform does NOT create a workspace per branch, does NOT auto-apply to staging, and does NOT auto-merge the PR.

**Seen in quizzes:** Quiz 5 Q19 (what happens when a PR is opened; I picked "creates a new workspace for the PR branch").

---

### Remote operation, execution mode and CLI-driven runs (8d) — missed 1x

**In one line:** A remote operation means HCP Terraform's own servers do the plan and apply, even if you typed the command on your laptop. With the CLI-driven workflow, the output streams back to your terminal.

**Explain it simply:** You press the button at home, but the machine that does the work is in HCP Terraform's factory. You watch a live video feed in your terminal.

**Related facts from your quizzes:**
- A workspace set to Execution Mode = Local is only a state backend. Plans and applies run on your machine, and you lose remote-run features such as Sentinel and cost estimation.
- The CLI-driven workflow is hooked up with a `cloud` block in your Terraform code.
- Setting `required_version` in code is not enough in HCP Terraform. Also set the workspace's own Terraform version setting (Quiz 4 Q13, answered correctly, so a reminder).

**Exam trap:** "Runs execute only on your machine but state is in HCP Terraform" describes local execution mode, not a remote operation.

**Seen in quizzes:** Quiz 5 Q1 (what is a remote operation; I picked "local execution, remote state").

---

### Private registry (related to 5a and 8c) — missed 1x as a module-source question

**In one line:** The HCP Terraform private registry lets your organization share modules and providers privately. A private module source has a hostname in front.

| Source string | Where it comes from |
|---|---|
| `terraform-aws-modules/transit-gateway/aws` (3 parts, no host) | Public Terraform Registry |
| `app.terraform.io/<org>/<name>/<provider>` (host + org) | Your private registry in HCP Terraform |
| `./modules/web` or `../x` | A local folder |

**Exam trap:** Quiz 1 Q50 had a 3-part source and I picked "private registry". No host in front means public. Outside HCP Terraform, using a private module needs an API token (`terraform login`) or `init` says "unauthorized" (from your lesson notes).

**Seen in quizzes:** Quiz 1 Q50 (module source location; I picked private registry).

---

### Comparison cheat-table: which HCP feature answers which question?

| If the question says... | The answer is... |
|---|---|
| Run an external scanner between plan and apply | Run tasks |
| When workspace A applies, start workspace B | Run triggers |
| Find drift or check conditions continuously | Health assessments |
| Auto-fix drift | Does not exist (False) |
| Block or warn on rule breaks (e.g. tags required) | Policies (Sentinel), set enforcement level |
| Share credentials with many workspaces | Variable set (attach to workspaces or a project) |
| Group many workspaces, set team access | Project |
| Control who can plan/apply | Teams with permissions (org, project, workspace) |
| Read another workspace's output | `tfe_outputs` data source |
| Search the whole org for a resource | Explorer |
| Run plan/apply inside a private network | Agent |
| Plan on pull request, no changes made | Speculative plan (VCS workflow) |
| Share private modules and providers | Private registry |
| Plan/apply run on HCP servers | Remote operation |

---

### Objective 8 — Self-check

Cover the answer with your hand and say it out loud.

**Q1. A run needs to call a third-party security scanner between plan and apply. Which HCP Terraform feature?**
A: Run tasks (not health assessments, not run triggers).

**Q2. What does a run trigger do?**
A: When one workspace applies successfully, it automatically queues a run in another workspace.

**Q3. True or False: HCP Terraform drift detection can automatically run apply to fix drift.**
A: False. It only detects and notifies. Humans decide to apply.

**Q4. Name the two real benefits of workspace health checks.**
A: Detect drift (real infra vs expected) and continuously validate your conditions. They never roll back or run Sentinel.

**Q5. You want to share cloud credentials with every workspace in a team, now and in the future. What do you do?**
A: Create a variable set with the credentials, put the workspaces in a project, and apply the variable set to the project.

**Q6. Dozens of workspaces owned by different teams. How do you simplify structure and access control?**
A: Put each team's workspaces in a project and set team access on the project. (Not multiple orgs, not tags.)

**Q7. Three valid ways to manage permissions in HCP Terraform?**
A: Organization-level permissions, project-level team access, and teams with workspace-level permissions. Tags never grant access.

**Q8. Some projects need advisory policies and others need mandatory ones. How?**
A: Set a different enforcement level on each policy set and attach each set to the right workspaces or projects.

**Q9. The prod-dns workspace needs the public IP output from prod-webserver. What do you use?**
A: A `tfe_outputs` data source that points at the prod-webserver workspace.

**Q10. What is the primary job of an HCP Terraform agent?**
A: Run plans and applies inside a private or on-premises network for infrastructure HCP Terraform cannot reach directly.
