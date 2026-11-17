## Objective 1 — Infrastructure as Code (IaC) Concepts

Think of IaC like a recipe card. Instead of cooking by hand each time (clicking in a console), you write the recipe once. Anyone can follow it and get the same dish.

Topics are listed most-missed first.

### Advantages of IaC (Obj 1b) — missed 4×

**In one line:** IaC is code you can version, reuse, share and automate, and it never replaces application languages or removes API calls.

**Explanation:** Real IaC benefits that showed up as correct answers:
- Saved in version control (Git), so teams collaborate safely and can review changes.
- Human-readable language (HCL), so it is quick to write and easy to learn.
- Works across many cloud platforms (multi-cloud).
- Consistency and standardisation: the same code gives the same result.
- Repeatable and reusable code.
- Automates manual tasks.
- Rebuild infrastructure for disaster recovery (just run the code again).
- Self-service: other people can use shared code by filling in variables.
- API-driven workflows (no clicking in a console).
- Self-documenting: the code describes what exists.

Analogy: a recipe card that anyone in the kitchen can follow, photocopy and improve. It still needs the kitchen (the cloud APIs) to cook the food.

**Exam trap:** The wrong options sound nice but are false:
- "Imperative approach / run commands in order" (Terraform is declarative).
- "Replaces dev languages like Go and .NET" (IaC does not replace app code).
- "Ensures the security of applications" (IaC can help enforce good practice, but it does not guarantee app security).
- "Eliminates API communication to the target platform" (providers still call platform APIs).
- Quiz 5 Q24 asked for the INACCURATE statement. The learner picked a true benefit by mistake. Read "inaccurate / NOT / except" twice.

**Seen in quizzes:** Quiz 1 Q6, Quiz 2 Q25, Quiz 4 Q8, Quiz 5 Q24.

### What kind of language is Terraform? (Obj 1a) — missed 1×

**In one line:** Terraform is an immutable, declarative, provisioning IaC language written in HCL (or JSON), never YAML.

**Explanation:**
- Declarative means you describe the end result you want ("I want 3 servers"). You do not list the steps.
- Analogy: you tell a taxi the address (declarative). You do not tell the driver every turn (imperative).
- Immutable means that when something must change in a big way, you replace the thing instead of patching it by hand.
- Provisioning means it builds the infrastructure. It is not a "configuration management" tool like Ansible or Chef.

**Exam trap:** Wrong options say "mutable", "imperative", "configuration management language" or "HCL or YAML". The right pair is HCL or JSON.

**Seen in quizzes:** Quiz 1 Q54 (also the "imperative" trap in Quiz 1 Q6).

### One tool for many clouds (Obj 1c) — missed 1×

**In one line:** Terraform gives one workflow (init, plan, apply) for every platform, with modules as the consistent interface and a shared backend for state.

**Explanation:**
- A company moving from Azure-only to Azure + AWS + on-prem Kubernetes should not keep a different tool for each place.
- The right answers were:
  - Build cloud-specific modules with the same inputs and outputs, so teams reuse the same patterns.
  - Standardise the CI/CD pipeline on the same lifecycle and use a common remote backend for state and locking.
- Analogy: one universal remote control, with a different plug-in for each TV brand. The plug-ins are providers.

**Exam trap:**
- "Keep ARM, CloudFormation and kubectl YAML" defeats the single-workflow goal.
- "Terraform cannot manage on-prem or Kubernetes" is false, because providers exist for them.

**Seen in quizzes:** Quiz 4 Q12.

### Objective 1 — Self-check

- **Q:** Is Terraform declarative or imperative?
  **A:** Declarative. You describe the end state, not the steps.
- **Q:** Which file syntaxes can Terraform use: HCL, JSON, YAML?
  **A:** HCL, or JSON as an alternative. Never YAML.
- **Q:** True or false: IaC removes the need to talk to cloud APIs.
  **A:** False. Providers still call the platform APIs for you.
- **Q:** Name three real IaC advantages.
  **A:** Any three of: version control, consistency or repeatability, automation, disaster-recovery rebuilds, self-service, API-driven, human-readable, multi-cloud.
- **Q:** Does IaC replace languages like Go or .NET, or guarantee application security?
  **A:** No to both. These are classic wrong options.
- **Q:** How do you keep one workflow across Azure, AWS and on-prem Kubernetes?
  **A:** Use Terraform with modules that have a consistent interface, and standardise the pipeline and a common remote backend.

---

## Objective 2 — Terraform Fundamentals (providers and state basics)

### State basics: what it is, where it lives (Obj 2d) — missed 4×

**In one line:** State is always required. It is a JSON file (`terraform.tfstate` locally by default) that maps your code to real objects, holds only the current snapshot, may contain secrets, and should be remote for teams.

**Explanation:** Terraform needs a memory of what it built. State is that memory. It is like a guest list that links "table 5 in my plan" to "table 5 in the real hall".

Facts to memorise (from the "select four true" question):
- Default location: a file named `terraform.tfstate` in the current working directory.
- Format: JSON.
- May contain sensitive data you do not want others to see.
- Remote state is recommended when more than one person manages the infrastructure.
- It does NOT store a complete history of changes. It stores the current mapping only.
- Terraform does NOT encrypt state everywhere automatically.

More facts from missed questions:
- You can NOT run Terraform with no state at all. You only choose where it lives (local or remote).
- No state file on the very first apply is normal, not an error. Terraform creates everything in the config and writes a new state file. It never deletes things it does not know about.
- You can usually migrate state between supported backends at any time, even after the first apply. Change the backend config, run init, and accept the migration prompt. (Limits exist, for example HCP Terraform back to local may not be supported.)

```bash
terraform init -migrate-state   # move my state to the new backend
```

**Exam trap:**
- "Terraform can work without state in special cases" is False (Quiz 5 Q12).
- "Backend is locked in after first apply" is False (Quiz 4 Q20).
- "No state means apply errors" or "apply deletes all existing VMware infra" are wrong (Quiz 3 Q8).
- "State stores a complete history" is wrong (Quiz 5 Q36).

**Seen in quizzes:** Quiz 3 Q8, Quiz 4 Q20, Quiz 5 Q12, Quiz 5 Q36.

### Installing a new provider: declare it, then run init (Obj 2a) — missed 2× here (plus Quiz 4 Q26 under Obj 3)

**In one line:** To use a new provider, declare it in the configuration (provider block or `required_providers`), then run `terraform init` to download the plugin.

**Explanation:** Analogy: a new phone app. You choose it (declare), then you press download (init). Plan and apply will not download it for you.

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" { region = "us-west-2" }
```

**Exam trap:**
- "Adding it to `required_providers` installs it" is false. Only `init` installs.
- `terraform validate` checks syntax but does not fetch plugins.
- Provider settings do not go in `terraform.tfvars` or `-var`. Those are for variables.

**Seen in quizzes:** Quiz 1 Q13, Quiz 2 Q6. (Same rule: Quiz 4 Q26, see Objective 3.)

### Where providers are downloaded from (Obj 2a) — missed 2×

**In one line:** A short source like `hashicorp/kubernetes` (no hostname) means the public Terraform Registry. Providers never come from "source code" or a local directory lookup.

**Explanation:** The valid install sources (pick four) are:
- The public Terraform Registry.
- A non-HashiCorp external registry that needs extra credentials.
- The HCP Terraform private registry.
- A local filesystem or network mirror (set in the CLI config `provider_installation` block, handy for air-gapped sites).

Analogy: an app store (registry), a company app store (private registry), or a USB stick (mirror).

```hcl
required_providers {
  kubernetes = { source = "hashicorp/kubernetes", version = "2.38.0" }
}
```

**Exam trap:**
- "From the `hashicorp/kubernetes` directory where Terraform runs", "from a VCS repo" and "from the Kubernetes GitHub repo" are all wrong.
- "The provider's source code" is not an install source.
- The plugin cache is also not an install source (per the analysis).

**Seen in quizzes:** Quiz 4 Q30, Quiz 5 Q21.

### What providers are for (Obj 2a/2b) — missed 2×

**In one line:** A provider is a plugin that talks to a platform's API. Backends (not providers) store and lock state.

**Explanation:** Three benefits that were correct answers:
- Providers are plugins, so new services can ship without changing Terraform Core.
- They hide the platform API behind a consistent resource and data-source schema.
- They let one workflow manage many platforms by plugging in different providers.

Plugin check: of module, provider, backend and variable, only the provider is a plugin. A module is a bundle of config, a backend is a state-storage setting, and a variable is an input.

Analogy: Terraform Core is a power strip. Providers are the adapters for each country's plug.

**Exam trap:**
- "Providers manage storage, encryption and locking of state" is wrong. That is a backend job.
- "Backend" as the answer to "which is a plugin?" is wrong. The provider is the plugin.

**Seen in quizzes:** Quiz 4 Q21 (benefits), Quiz 2 Q35 (plugin).

### Providers inside modules (Obj 2c) — missed 1×

**In one line:** Do not put `provider` blocks inside reusable modules. Let them inherit from the caller, or pass them with `providers = { ... }`.

**Explanation:** True statements (pick three):
- Child modules automatically inherit the default provider configurations of their parent.
- The `providers` argument in a module block explicitly passes specific provider configurations.
- A module that contains its own provider blocks cannot be used with `for_each` (also not `count` or `depends_on`).

Analogy: a visiting chef (module) should use the host kitchen's tools (inherited providers), not bring a second kitchen.

```hcl
module "vpc" {
  source    = "./modules/vpc"
  providers = { aws = aws.west }
}
```

**Exam trap:**
- "Modules with provider blocks can still use `depends_on` if providers are passed explicitly" is false.
- "Children must always define their own provider blocks" is the opposite of best practice.

**Seen in quizzes:** Quiz 2 Q38.

### Objective 2 — Self-check

- **Q:** Where does Terraform keep state by default, and in what format?
  **A:** A file named `terraform.tfstate` in the current working directory, formatted as JSON.
- **Q:** True or false: Terraform can run without any state.
  **A:** False. State is always required. You only choose where it is stored.
- **Q:** You run `terraform apply` with config but no state file yet. What happens?
  **A:** Terraform creates the resources in the config and writes a new state file. It does not error and does not delete unknown resources.
- **Q:** What do you do before using a brand-new provider?
  **A:** Declare it in the configuration, then run `terraform init` to download it.
- **Q:** Where is `source = "hashicorp/kubernetes"` downloaded from?
  **A:** The public Terraform Registry (registry.terraform.io).
- **Q:** Which of module, provider, backend and variable is a plugin?
  **A:** The provider.

---

## Objective 3 — Core Terraform Workflow

### Run `terraform init` whenever providers, modules or the folder change (Obj 3b) — missed 3× (more with provider/module cousins)

**In one line:** `terraform init` is per working directory. Re-run it after adding a provider, changing a provider version, or adding a module. It also writes `.terraform.lock.hcl`.

**Explanation:** `init` is like unpacking your toolbox at the start of a job. Plan, apply and validate cannot fetch tools for you.

What `init` does:
- Downloads provider plugins into `.terraform/providers` and modules into `.terraform/modules` (extra context: it also sets up the backend).
- Creates or updates `.terraform.lock.hcl`, the dependency lock file. It records exact provider versions and hashes, and you should commit it to Git. It is NOT a concurrency lock, NOT a state snapshot, and it holds no credentials.
- The `.terraform/` folder holds no state and no credentials.

Which folder? Every folder with `.tf` files is its own working directory. If you have `/dev`, `/staging` and `/prod`, run init in each one. Init in the parent does not cover them.

```bash
terraform init            # first time, or after adding a provider/module
terraform init -upgrade   # pick the newest versions the constraints allow
```

**Exam trap:**
- "Run `plan` / `apply` / `validate` and it downloads the new provider" is false. They error with a missing plugin.
- "Init only in the root directory covers all environments" is false.
- "Copy `.terraform` between directories" is discouraged.
- `.terraform.lock.hcl` options that say "concurrency lock updated on every plan", "state snapshot" or "backend credentials" are all wrong.
- "Add the module to `required_providers`" is wrong. That block is for providers only.

**Seen in quizzes:** Quiz 1 Q43, Quiz 2 Q4, Quiz 4 Q26. Same "re-run init" rule under other objectives: Quiz 1 Q13 and Q38, Quiz 2 Q6, Quiz 4 Q46.

### Destroy and replace (Obj 3f) — missed 3×

**In one line:** `terraform destroy` equals `terraform apply -destroy`. To rebuild one resource use `terraform apply -replace=ADDRESS`. To delete a few resources, delete their code and apply.

**Explanation:**
- Tear down everything: `terraform destroy` and `terraform apply -destroy` do the same thing. `terraform plan -destroy` only previews and deletes nothing.
- Rebuild one resource on purpose (no code change): `-replace`. It replaces the old `taint` command (extra context). `-refresh-only` just syncs state and changes nothing real.
- Remove only some resources (for example a Cloud SQL instance and its backup policy out of 50): remove those resource blocks from the configuration, then run `terraform apply`. Terraform destroys only what is no longer declared. This is reviewable in Git.
- `-target` is an exception tool. It is risky and can skip dependencies, so it is not the routine answer.

```bash
terraform destroy
terraform apply -destroy
terraform apply -replace="aws_instance.web"
```

**Exam trap:**
- "`terraform apply -delete`" is not a real flag.
- "`terraform plan -destroy` tears everything down" is wrong. It only previews.
- For "remove just two resources", the file's answer is delete the blocks and apply, not `destroy -target`. The option about two `removed` blocks was marked wrong by the file. Follow the file for the exam.
- `terraform fmt` just formats files.
- A full destroy followed by re-apply is destructive and wrong.

**Seen in quizzes:** Quiz 1 Q51, Quiz 2 Q28, Quiz 4 Q44. (Reminder in Quiz 4 Q18: `-replace` is safer than `-target`.)

### Apply: what it does and how to apply exactly what you reviewed (Obj 3e) — missed 2×

**In one line:** `terraform apply` changes real infrastructure and then updates the state file. To run exactly what was reviewed, save the plan and apply the plan file.

**Explanation:**
- Apply creates, updates or deletes only the difference, then records the result in state. It does not format code (that is `fmt`). It does not download providers or modules (that is `init`). It does not recreate everything.
- Plain `terraform apply` builds a NEW plan. It does not reuse your last plan. Even `-auto-approve` only skips the question, and it still makes a fresh plan.
- Analogy: you approve a quote (the saved plan file), and the builder must do exactly that quote. Re-planning is asking for a new quote.
- Terraform never rolls back a failed apply. Resources that succeeded stay in state. Fix the cause and re-run apply. (Extra context from the quick-reminder sections of other quizzes: a failed provisioner leaves that resource tainted.)

```bash
terraform plan -out=bk-project.tfplan
terraform apply bk-project.tfplan
```

**Exam trap:**
- "Run `plan` again, then `apply`" can give a different plan from the one reviewed.
- "`apply -auto-approve`" is not the same as applying the saved plan.
- "Apply formats configuration" or "apply recreates all infrastructure" are false.
- "Apply downloads providers" is false.

**Seen in quizzes:** Quiz 1 Q45, Quiz 3 Q24. (Related reminders: Quiz 3 Q47, Quiz 4 Q42.)

### The three core workflow steps (Obj 3a) — missed 1×

**In one line:** The core workflow is Write, Plan, Apply.

**Explanation:** Write the code, plan (preview the changes), apply (make them). Like drafting a letter, proofreading it, then sending it.

**Exam trap:** Destroy, Import and Validate are real commands, but they are NOT among the three core steps. The learner picked Destroy and missed Write.

**Seen in quizzes:** Quiz 2 Q21.

### Fast checking: fmt vs validate vs plan (Obj 3c) — missed 1×

**In one line:** `fmt` fixes how code looks, `validate` checks that the code is correct, `plan` shows what would change.

**Explanation:** The fastest way to catch syntax errors after splitting files is `terraform validate`. It checks syntax and internal consistency without contacting providers or state. Analogy: `fmt` is tidying your handwriting, `validate` is spell-check, `plan` is asking what the plan will change.

Extra context from quick reminders: run `terraform init` before `validate`, because it needs providers and modules installed. `terraform fmt -check` is the usual CI formatting check. It fails if files are not formatted.

```bash
terraform fmt -recursive   # style only
terraform validate         # syntax / consistency
```

**Exam trap:**
- `fmt` only reformats.
- `init` downloads things.
- `plan` is slower and talks to providers and state.

**Seen in quizzes:** Quiz 2 Q32.

### How Terraform picks the order of creation (Obj 3d) — missed 1×

**In one line:** Terraform builds a dependency graph automatically from references between resources. `depends_on` is only for hidden dependencies.

**Explanation:** If a subnet uses the VNet's ID, Terraform knows the VNet comes first. This is an implicit dependency. Analogy: you cannot hang a picture before the wall exists, and Terraform sees which one points at which.

Also from the quick reminders: in plan output, `~` means update in place and `-/+` means destroy and recreate. (The same idea, in a True/False form, was missed in Quiz 2 Q26 under another objective.)

```hcl
resource "azurerm_subnet" "s" {
  virtual_network_name = azurerm_virtual_network.v.name   # implicit dependency
}
```

**Exam trap:**
- "You must use `depends_on` for all resources" is false.
- "Order is alphabetical" or "order is the file order" are false.

**Seen in quizzes:** Quiz 5 Q53.

### Objective 3 — Self-check

- **Q:** You add a new provider block to a working project. What is the next command?
  **A:** `terraform init`.
- **Q:** You have `/dev`, `/staging` and `/prod` folders with separate configs. Where do you run init?
  **A:** In each folder, because each is its own working directory.
- **Q:** What is `.terraform.lock.hcl` and when does it change?
  **A:** A dependency lock file that pins provider versions. `terraform init` creates and updates it, and you commit it to Git.
- **Q:** How do you apply exactly the plan that was reviewed two hours ago?
  **A:** Save it with `terraform plan -out=file`, then run `terraform apply file`.
- **Q:** Name two commands that tear down everything, and one that only previews.
  **A:** `terraform destroy` and `terraform apply -destroy`. `terraform plan -destroy` only previews.
- **Q:** How do you force one resource to be destroyed and recreated with no code change?
  **A:** `terraform apply -replace=<address>`.
- **Q:** What is the fastest check for syntax errors, and what are the core workflow steps?
  **A:** `terraform validate`. The core workflow is Write, Plan, Apply.
