# 07 — Data Types, Loops and Functions

> **Exam domain(s):** Objective 4 — Read, generate and modify configuration (collection and structural types, `count`, `for_each`, `for` expressions, splat, dynamic blocks, conditionals, built-in functions)   **Source:** lesson 4 (Part 2 lectures 55–58, Part 3 lectures 59–64, Part 4 lectures 77 and 80, Part 5 lectures 87 and 94, Part 6 lectures 97–99) plus lesson 10 challenges 3 and 4   **Time:** ~4–5 h (this is the heaviest chapter, go slowly)

## What you will learn

- What a **data type** is, why Terraform cares, and how to read an argument's expected type from the provider docs.
- The primitive types (`string`, `number`, `bool`, `null`), the collection types (`list`, `set`, `map`) and the structural types (`object`, `tuple`), and how they differ.
- How to read one value out of a list (`var.list[0]`) or a map (`var.map["key"]`).
- How to create many copies of a resource with **`count`**, and how to give each copy its own identity with **`count.index`**.
- Why `count` breaks down when the list changes order, and how **`for_each`** (over a set or a map) fixes it with `each.key` and `each.value`.
- How to write **conditional expressions** (`condition ? a : b`) and use them to switch resources on or off.
- How to call **built-in functions** (`max`, `file`, `jsonencode`, `lookup`, `length`, `element`, `timestamp`, `formatdate`, `zipmap`, and many more), and how to test them with **`terraform console`** without touching real infrastructure.
- How to read code that is full of functions and predict what it will create.
- **`for` expressions** and **splat expressions** (`[*]`) for transforming collections and collecting an attribute from every instance.
- **Dynamic blocks** for generating repeated nested blocks (such as many `ingress` rules) from a collection.

## 🧠 Pre-concept

Up to now every resource block you wrote created exactly one thing, with values typed directly into the file. That is like writing every letter by hand. Real projects need more:

- "Give me **10** identical servers" (not one).
- "Use a big server in production and a small one in development" (a **decision**).
- "Take this list of user names and make one IAM user per name" (a **loop**).
- "Turn this timestamp into a readable date" (a **calculation**).

Terraform handles all of that with **expressions**. An expression is just a small formula, like the formulas in a spreadsheet cell. You already use the simplest ones: a literal value (`"t2.micro"`), a reference (`var.region`, `aws_instance.web.id`). This chapter adds the rest of the toolbox:

| Tool | Spreadsheet analogy | Terraform |
|---|---|---|
| Data types | The format of a cell (text, number, true/false, a whole range) | `string`, `number`, `list`, `map`, ... |
| `count` / `for_each` | "Fill down" a row N times | Create many instances from one block |
| Conditional | `=IF(A1="prod","big","small")` | `cond ? "big" : "small"` |
| Functions | `=MAX(A1:A5)`, `=UPPER(A1)` | `max(...)`, `upper(...)` |
| `for` expression | Apply a formula to every cell in a column | `[for x in list : upper(x)]` |
| Dynamic block | Generate repeated sub-rows | `dynamic "ingress" { ... }` |

> **Two ground rules to remember through the whole chapter**
> 1. **Terraform only has built-in functions.** You cannot write your own.
> 2. **Terraform has no loops in the programming sense** (no `for i = 0; i < 10`). It has declarative repetition: you describe the collection and Terraform creates one thing per item.

This chapter assumes you already know variables, `default`, and `terraform.tfvars` from [06 — Variables, outputs and locals](06-variables-outputs-locals.md). Resources and attribute references are in [05 — Resources, data sources and dependencies](05-resources-data-dependencies.md).

---

## 1. Your sandbox: `terraform console`

Before learning types and functions, set up a safe place to try things. **`terraform console`** opens an interactive prompt where you type an expression and Terraform prints the result. It changes nothing: no resources are created, no state is modified.

```bash
terraform console
```

```text
> max(10, 30, 50)
50
> upper("hello")
"HELLO"
> 1 + 2 * 3
7
> exit
```

- Leave with `exit` or `Ctrl+D`.
- Strings are printed **with quotes**, numbers without. Lists and maps print over several lines.
- You can run it in an **empty folder** and test any pure function (`max`, `length`, `zipmap`, ...). Inside a project folder it can also see your variables, locals and (after an apply) resource attributes, for example `var.region` or `aws_instance.web.public_ip`.
- You can also pipe a single expression: `echo 'max(1,2,3)' | terraform console`.

This is the method the instructor uses for every function in this chapter: **read the docs, test in the console, then use it in code.**

> 🎯 **Exam focus:** "How can you test a function without applying anything?" Answer: `terraform console`. It evaluates expressions interactively and does not change infrastructure.

> ⚠️ **Gotcha:** While `terraform console` is open inside a project that uses a remote backend, it reads the state (and may hold a state lock). Close it when you are done.

---

## 2. Data types

### 2.1 What a data type is

A **data type** is the *kind* of value you give to an argument or variable. Different arguments expect different types, so you must know what each one needs. The idea is the same as in Python or Java, so it transfers.

| Value | Data type |
|---|---|
| `"Hello World"`, `"earth"`, `"KP Labs"` | **string** (text, a sequence of Unicode characters) |
| `7575` | **number** |
| `true` / `false` | **bool** (boolean) |
| `["a", "b", "c"]` | **list** |
| `{ team = "payments" }` | **map** (or object) |
| (a unique unordered group) | **set** |
| `null` | **null** (the absence of a value) |

### 2.2 Why restrict a variable to a type? The IAM username demo

**Requirement:** usernames created in AWS through Terraform must be **numbers only** (for example an employee ID), not words.

Start from the base code:

```hcl
resource "aws_iam_user" "lb" {
  name = "loadbalancer"
}
```

Make the name come from a variable and restrict it to a number:

```hcl
variable "username" {
  type = number
}

resource "aws_iam_user" "lb" {
  name = var.username
}
```

> The course repo text shows `variable "username {` with a missing closing quote. The correct form is `variable "username" {`.

**Walkthrough**

1. `terraform apply` on the base code creates IAM user `loadbalancer` (check the AWS console), then `terraform destroy` to start clean.
2. Change the code to use `variable "username" {}` **with no type** and `name = var.username`. Run `terraform plan`. Terraform prompts for a value. Type `zeal`. It works: a user called "zeal" is planned, because there is no restriction.
3. Add `type = number`. Run `terraform plan` and enter `zeal` again:

```text
Error: Invalid value for input variable

  The given value is not suitable for var.username: a number is required.
```

A string is rejected where a number is required. Typing `1234` passes.

> **Extra context:** a numeric-looking string such as `"1234"` is **automatically converted** to a number, so only non-numeric text such as `zeal` is rejected. Terraform converts between types when it safely can (`"5"` to `5`, `5` to `"5"`, `"true"` to `true`).

If a variable has **no `type`**, any value is accepted. Adding `type` makes mistakes appear early and clearly. (Basic variable declaration is in [chapter 06](06-variables-outputs-locals.md); here we focus on what goes inside `type`.)

### 2.3 Finding out what type an argument needs: read the docs

Different resource arguments want different shapes. Look at the example usage for `aws_instance` in the AWS provider docs:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c101f26f147fa7fd"
  instance_type = "t3.micro"                         # string
  tags = {                                           # { } means a map
    Name = "HelloWorld"
  }
}
```

How do you know whether to write `"..."`, `[ ... ]` or `{ ... }`? Open the **Argument Reference** section of the docs and read the wording:

| Argument | Wording in the docs | What you write |
|---|---|---|
| `instance_type` | plain text | string `"t3.micro"` |
| `tags` | "Map of tags to assign to the resource" | **map** `{ Name = "x" }` |
| `vpc_security_group_ids` | "List of security group IDs to associate with" | **list** `["sg-..."]` |

### 2.4 Demo of a type error

```hcl
resource "aws_instance" "web" {
  ami                    = "ami-0c101f26f147fa7fd"
  instance_type          = "t3.micro"
  vpc_security_group_ids = "sg-06dc77ed59c310f03"      # a string, but a list is required
}
```

```text
Error: Incorrect attribute value type
```

Fix it with square brackets:

```hcl
resource "aws_instance" "web" {
  ami                    = "ami-0c101f26f147fa7fd"
  instance_type          = "t3.micro"
  vpc_security_group_ids = ["sg-06dc77ed59c310f03"]    # list with one element
}
```

`terraform plan` now works. If you have not studied data types, "Incorrect attribute value type" looks cryptic. With them, you instantly check the docs and fix the brackets.

⚠️ **Gotcha:** "Incorrect attribute value type" almost always means you used the wrong *shape* (string vs list vs map). Look at the argument's documented type. Even a **single** value must be wrapped in `[ ]` if the argument is a list.

### 2.5 The big picture of all types

Terraform's types fall into three families:

```text
                          Terraform types
                                |
      +-------------------------+---------------------------+
      |                         |                           |
  PRIMITIVE                 COLLECTION                  STRUCTURAL
  one value             many values, SAME type        many values, MIXED types
      |                         |                           |
  string                    list(type)                  object({ k = type, ... })
  number                    set(type)                   tuple([type, type, ...])
  bool                      map(type)
  (null = "no value")
```

| Type | Written as | Ordered? | Duplicates? | Mixed element types? | Typical use |
|---|---|---|---|---|---|
| `string` | `"hello"` | n/a | n/a | n/a | names, AMI IDs |
| `number` | `42`, `3.14` | n/a | n/a | n/a | ports, counts |
| `bool` | `true` / `false` | n/a | n/a | n/a | feature switches |
| `list(T)` | `["a", "b"]` | **Yes**, index from 0 | **Yes** | No (all `T`) | security group IDs |
| `set(T)` | `toset(["a","b"])` | **No** | **No**, removed silently | No | `for_each` input |
| `map(T)` | `{ k = "v" }` | keys are unique | keys unique | No (all values `T`) | tags |
| `object({...})` | `{ Name = "x", id = 1 }` | by attribute name | n/a | **Yes**, each attribute has its own type | structured config |
| `tuple([...])` | `["a", 1, true]` | **Yes** | Yes | **Yes**, per position | rare |
| `any` | (anything) | | | | "let Terraform work out the type" |

The next sections go through each in detail, using the lesson demos.

---

### 2.6 Data type: list

#### Concept

A **list** stores a **collection of values** in a single variable or argument. It is written with square brackets and comma-separated values:

```hcl
["A", "B", "C"]
```

Use a list when an argument can take **multiple values**. Contrast:

- `instance_type = "t3.micro"` has a single value (string).
- `vpc_security_group_ids = ["sg-1", "sg-2"]` can take many (list).

A list with a default (the name `cities` is illustrative):

```hcl
variable "cities" {
  type    = list
  default = ["Mumbai", "Bangalore", "Delhi"]
}
```

Lists are **ordered** and **indexed from 0**. The position of an item matters, and **duplicates are allowed** (`["hello", "world", "hello"]` has three items).

#### Demo 1: a variable with no type, then with `type = list`

```hcl
variable "my-list" {
  type = list
}

output "variable_value" {
  value = var.my-list
}
```

The lecture first runs with **no `type`**, i.e. only `variable "my-list" {}`:

```bash
terraform plan                 # Enter a value: hello-world
terraform apply -auto-approve  # Enter a value: hello world
```

The output simply echoes what you gave (`variable_value = "hello world"`), because without a type any value is accepted.

Then `type = list` is added:

```bash
terraform apply -auto-approve
# Enter a value: hello
```

```text
Error: No value for required variable
```

The message is unhelpful. The real cause is that `hello` is **not a list**. Provide square brackets:

```text
Enter a value: ["test", "hello"]
```

Outputs after apply:

```text
variable_value = [
  "test",
  "hello",
]
```

⚠️ **Gotcha:** "No value for required variable" can actually be a **type mismatch** when you type at the prompt. If you are sure you gave a value, suspect the data type. Also, strings inside a list need quotes and brackets even at the prompt: `["a","b"]`.

#### Demo 2: a realistic example, security groups on an EC2 instance

```hcl
resource "aws_instance" "web" {
  ami                    = "ami-123"        # placeholder, we are only learning the concept
  instance_type          = "t3.micro"
  vpc_security_group_ids = ["sg-1234"]
}
```

**Scenario:** the account has two security groups (`default` and a new one called `test`) and the instance must use both, like selecting multiple groups in the EC2 console. How do you pass two IDs?

Attempt 1, both IDs comma-separated inside **one string** (does not work):

```hcl
vpc_security_group_ids = "sg-aaaa, sg-bbbb"
```

`terraform plan` returns an error. The correct way is a list with two elements:

```hcl
vpc_security_group_ids = ["sg-aaaa", "sg-bbbb"]    # placeholders for real IDs
```

`terraform plan` works and shows two groups attached.

#### A single value still needs a list

```hcl
vpc_security_group_ids = ["sg-aaaa"]      # OK, a list with one element
vpc_security_group_ids = "sg-aaaa"        # ERROR: the argument requires a list
```

You cannot simplify a one-item list into a plain string when the argument is typed as a list.

#### Restricting the element type: `list(number)`

You can say what **kind of values** the list may contain:

```hcl
variable "my-list" {
  type = list(number)       # only numbers allowed inside the list
}
```

| Input at the prompt | Result |
|---|---|
| `hello` | Error (not a list) |
| `["hello"]` | Error (an element is not a number) |
| `[1, 2]` | Accepted |

With plain `type = list` (no element type) any list is accepted. Typed collections give far more control.

> **Up to date (TF 1.12):** the normal forms are `list(string)`, `list(number)`, `list(bool)`. A bare `list` is shorthand for `list(any)`: it still works, but writing the element type explicitly is best practice. The lesson uses the bare form in many demos to keep them short; in your own code, prefer `list(string)`.

#### String vs list

| | string | list |
|---|---|---|
| Syntax | `"value"` | `["v1","v2"]` |
| Holds | one value | zero or more ordered values |
| `vpc_security_group_ids` | rejected | required |

---

### 2.7 Data type: map

#### Concept

A **map** is a collection of **key-value pairs**. Lists hold only values; maps hold keys *and* values.

| Type | Holds | Example |
|---|---|---|
| list | values | `["a", "b"]` |
| map | key = value pairs | `{ team = "payments", location = "US" }` |

A map variable with a default:

```hcl
variable "instance_tags" {
  type = map
  default = {
    name        = "app servers"
    environment = "development"
    team        = "payments"
  }
}
```

#### The most common practical use: tags

AWS tags are key-value pairs (in the EC2 console, Tags such as `team = dev`, `location = USA`). A list cannot represent that, so the `tags` argument of `aws_instance` is a **map**. The docs say: "Map of tags to assign to the resource."

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c101f26f147fa7fd"
  instance_type = "t3.micro"
  tags = {                   # curly braces = map
    Name = "HelloWorld"
  }
}
```

#### Demo: a map variable at the prompt

```hcl
variable "my-map" {
  type = map
}

output "variable_value" {
  value = var.my-map
}
```

```bash
terraform apply
# Enter a value: ["a","b"]   -> Error: a map is required (you gave a list)
```

```bash
terraform apply -auto-approve
# Enter a value: { team = "payments" }
```

```text
variable_value = {
  "team" = "payments"
}
```

Multiple pairs separated by commas:

```text
Enter a value: { team = "payments", location = "US" }
```

```text
variable_value = {
  "location" = "US"
  "team"     = "payments"
}
```

Terraform prints keys in alphabetical order, not the order you typed them.

#### Final code with a default

```hcl
variable "my-map" {
  type = map
  default = {
    Name = "Alice"
    Team = "Payments"
  }
}

output "variable_value" {
  value = var.my-map
}
```

```bash
terraform apply -auto-approve      # no prompt this time, the default is used
```

```text
variable_value = {
  "Name" = "Alice"
  "Team" = "Payments"
}
```

#### Map syntax notes

| Item | Rule |
|---|---|
| Outer braces | `{ ... }` |
| Pair | `key = value` (HCL also accepts `key : value`; the course uses `=`) |
| Separator | A comma on one line, or a newline between pairs |
| Keys | Usually plain identifiers, or quoted strings when they contain dashes or special characters |

⚠️ **Gotchas**

- Passing a list where a map is required (or the reverse) is rejected with "a map is required".
- `tags` in AWS resources is a map. Use `{ }`, not `[ ]`.
- A default for a map variable means **no prompt** appears.

> 🎯 **Exam focus:** Map = key-value pairs in `{ }`; list = values in `[ ]`. The docs phrase "Map of tags" tells you to write `{ }`. The typed form is `map(string)` (all values strings), like `list(number)`.

---

### 2.8 Fetching one value from a list or a map

A very common real-world and exam pattern: pick **one** value out of a list or map variable.

```hcl
provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "myec2" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = var.list[1]
}

variable "list" {
  type    = list
  default = ["m5.large", "m5.xlarge", "t2.medium"]
}

variable "types" {
  type = map
  default = {
    us-east-1  = "t2.micro"
    us-west-2  = "t2.nano"
    ap-south-1 = "t2.small"
  }
}
```

(The original repo example hard-codes `access_key` and `secret_key` in the provider block. Never do that. Use the credentials methods from [02 — Providers](02-providers.md).)

#### From a map: use the key

```hcl
instance_type = var.types["us-west-2"]
```

`terraform plan` shows `instance_type = "t2.nano"`. Change the key to `ap-south-1`:

```hcl
instance_type = var.types["ap-south-1"]
```

`terraform plan` now shows `t2.small`. Pattern: `var.<map_variable>["<key>"]`.

#### From a list: use the position (index)

Lists have no keys, only positions starting at **0**.

| Index | Value in `var.list` |
|---|---|
| `0` (first) | `m5.large` |
| `1` (second) | `m5.xlarge` |
| `2` (third) | `t2.medium` |

```hcl
instance_type = var.list[0]      # plan shows m5.large
instance_type = var.list[1]      # plan shows m5.xlarge
```

Pattern: `var.<list_variable>[<index>]`.

```text
var.list   = [ "m5.large", "m5.xlarge", "t2.medium" ]
                  [0]          [1]          [2]

var.types  = { us-east-1="t2.micro", us-west-2="t2.nano", ap-south-1="t2.small" }
                var.types["us-west-2"]  ->  "t2.nano"
```

| | List | Map |
|---|---|---|
| Declared with | `["a","b","c"]` | `{ k1 = "a", k2 = "b" }` |
| Pick an element by | position `var.list[1]` | key `var.types["us-west-2"]` |
| Starts at | `0` | n/a (the key name) |

> **Extra context:** asking for an index beyond the end of the list (`var.list[3]` on three items) or a key that does not exist gives an error such as "Invalid index" / "Invalid key". The functions `lookup()` (map with a default) and `element()` (list that wraps around) are covered in section 6.

For a map whose keys are simple identifiers you can also use dot syntax (`var.tags.Name`). Keys with dashes or other special characters need the quoted bracket form (`var.types["us-west-2"]`).

> 🎯 **Exam focus:** "What instance type will be used?" questions. Reading from a list: `var.name[index]` (index 0 = first element). Reading from a map: `var.name["key"]`. Check you are looking at the right variable name (`var.types[...]` vs `var.list[...]`).

---

### 2.9 Data type: set

#### Quick revision: the list

To see why `set` exists, recall what a list does:

- Stores multiple items in one variable.
- **Duplicates are allowed**: `["hello", "world", "hello"]` has three items.
- Items are **indexed** (ordered): `0`, `1`, `2`, ...

```hcl
variable "my-list" {
  type    = list
  default = ["hello", "world", "hello"]
}

output "mylist" {
  value = var.my-list
}
```

Output: `["hello", "world", "hello"]`, the duplicate is kept.

#### The set type

A **set** looks like a list but has two defining properties:

| Property | List | Set |
|---|---|---|
| Duplicates | Allowed | **Not stored**, silently removed |
| Order / index | Ordered, indexed from 0 | **Unordered**, no index |
| Element type declaration | Optional (`type = list`) | **Mandatory**: `set(string)`, `set(number)`, ... |

```hcl
variable "my-set" {
  type    = set(string)
  default = ["alice", "bob", "john"]
}

output "myset" {
  value = var.my-set
}
```

The type inside the brackets (`string`, `number`, ...) is the type of every element.

```text
   list ["hello","world","hello"]            set(string) ["hello","world","hello"]
   +-------+-------+-------+                 +---------+---------+
   | hello | world | hello |   (idx 0,1,2)   |  hello  |  world  |   (no index, unique)
   +-------+-------+-------+                 +---------+---------+
```

#### Demo walkthrough

Create `set.tf` and test list and set side by side.

**Step 1 — list**

```hcl
variable "my-list" {
  type = list
}
```

`terraform plan` prompts for a value (no default). Entering `["hello","world","hello"]` works and shows "No changes". (The instructor hit a parse error once because a bracket was not closed. Type the full value, including the closing `]`.)

To save typing, move the value into a `default` and print one element by index:

```hcl
output "mylist" {
  value = var.my-list[0]    # lists start at index 0
}
```

`terraform apply -auto-approve` prints `mylist = "hello"`.

**Step 2 — a set without an element type (error)**

```hcl
variable "my-set" {
  type = set
}
```

```text
Error: Invalid type specification
The set type constructor requires one argument specifying the element type.
```

Fix: `type = set(string)`.

**Step 3 — duplicates are removed silently**

Run `terraform plan` and enter `["hello","world","hello"]`. The output shows only `hello` and `world`. **No error is raised** for the duplicate. Terraform just drops it. After `terraform apply -auto-approve`, the state file also contains only the unique values.

**Step 4 — a set is unordered**

```hcl
variable "my-set" {
  type    = set(string)
  default = ["alice", "bob", "john"]
}
```

Apply it, then move `john` to the front of the default (`["john","alice","bob"]`) and run `terraform plan`. Result: **"No changes."** For a set, Terraform only tracks *presence* of an element, not its position.

**Step 5 — contrast with a list**

Apply the same names as a `list`, then move `bob` from index 2 to index 0 and run `terraform plan`. This time Terraform **does** show changes, because the element at each index changed. If infrastructure is built from list positions (for example with `count` and `count.index`), reordering a list modifies or recreates infrastructure.

| Action | Set result | List result |
|---|---|---|
| Add a duplicate | Silently dropped | Kept |
| Reorder elements | No change | Plan shows changes |
| Access by index (`[0]`) | Not meaningful (no index) | Works |

⚠️ **Gotchas**

- `type = set` alone is invalid. Always write `set(string)` and so on.
- Duplicates are removed **without a warning**. If you expected 3 items and see 2, that is why.
- Do not rely on position in a set. Convert with `tolist()` or `sort()` if you need an order (`tolist(toset(["b","a"]))` gives `["a","b"]` for strings, because sets are ordered lexicographically when converted).
- Indexing a set with `[0]` is an error. Convert it first: `tolist(var.my-set)[0]`.

> 🎯 **Exam focus:** Set = **unique + unordered**; list = **duplicates allowed + ordered/indexed**. A set type must declare its element type. Duplicates in a set vanish with no error. Reordering a set causes no plan diff; reordering a list does. Sets are the natural input for `for_each` (section 7).

---

### 2.10 Data type: object (and how it differs from a map)

#### Revision: the map type

A **map** is a collection of key-value pairs (widely used for AWS tags).

- Keys are strings.
- All **values must be the same type**.
- No strict structure is required, so you can add any keys.

```hcl
variable "my-map" {
  type = map
}

output "variable_value" {
  value = var.my-map
}
```

Test inputs at the `terraform plan` prompt:

```text
{"Name"="Zeal", "Age"="32"}
{"Name"="Zeal", "Age"="32","Location"="India"}
```

Both are accepted. With a plain `map` there is no defined structure and the values are treated as strings.

#### A map constrained to numbers

```hcl
variable "my-map" {
  type = map(number)
}

output "variable_value" {
  value = var.my-map
}
```

```text
{"Name"="Zeal", "Age"="32","Location"="India"}   # FAILS - "a number is required"
{"Name"="12", "Age"="32","Location"="45"}        # accepted
```

The first fails because `"Zeal"` and `"India"` are not numbers. In the second, all the *values* are numeric (quoted numerals are converted to numbers). The restriction applies to **values**, not keys.

#### The object type

An **object** is also a collection of key-value pairs, but:

- **Each attribute can have a different type** (`Name` is a string, `userID` is a number, ...).
- A **structure must be defined**: you declare exactly which attributes are expected and their types.

```hcl
variable "my-object" {
  type = object({ Name = string, userID = number })
}

output "variable_value" {
  value = var.my-object
}
```

```text
{"Name"="Zeal", "userID"=1234}      # accepted
{"Name"="Zeal", "userID"="hello"}   # error: a number is required
```

#### Errors you will meet while learning (from the live demo)

1. `type = object` with nothing else:

   ```text
   Error: Invalid type specification
   The object type constructor requires one argument specifying the attribute types and values as a map.
   ```

   An object **needs a schema**.

2. Quoted attribute names in the schema, `object({"name" = string, "userID" = number})`:

   ```text
   Error: Object constructor map keys must be attribute names.
   ```

   Fix: remove the double quotes around the attribute names, as in the code above.

3. `terraform plan`, enter `{Name="Zeal", userID=1234}`: accepted.
4. Re-run with `userID = "hello"`: `A number is required.`

#### Extra attributes are discarded

Object syntax facts:

1. An object is a collection of **named attributes, each with its own type**.
2. The schema is written `{ <KEY> = <TYPE>, <KEY> = <TYPE>, ... }`: curly braces and a comma-separated series of `key = type`.
3. **Extra attributes** in the value that are not in the schema do **not** raise an error. They are **discarded** during type conversion.

With the schema `{Name = string, userID = number}`, supply:

```text
{ Name = "Zeal", userID = 123, email = "instructor@example.com" }
```

The plan is accepted but the output shows only `Name` and `userID`. `email` is dropped.

#### map vs object

| Aspect | `map(...)` | `object({...})` |
|---|---|---|
| Value types | All values the **same** type | **Each attribute** can have its own type |
| Structure | Not required, any keys | **Required**: keys and types declared |
| Extra keys | Accepted as part of the map | Silently **discarded** |
| Typical use | Tags, simple lookups | Structured config (name + id + flag) |
| Bare keyword | `type = map` is allowed | `type = object` alone is an **error** |

⚠️ **Gotchas**

- `type = object` with no schema fails. You must write `object({ ... })`.
- Use attribute names **without quotes** in the schema.
- A wrong-typed value (`"hello"` for a number) is an error. An extra key is silently dropped.
- For `map(number)` the keys are still strings. Only the values are validated.

> 🎯 **Exam focus:** Map: values all the same type. Object: each attribute has its own type and the structure is declared. Extra attributes passed to an object variable are discarded (no error). Object schema: `object({ key = type, key = type })`.

#### Tuple (extra context)

A **tuple** is the structural sibling of a list: ordered, but **each position has its own type**. It is written `tuple([string, number, bool])` and a matching value is `["web", 80, true]`. You rarely declare tuples yourself. Terraform infers them: any list literal with mixed element types, like `["a", 1]`, is really a tuple. Remember: *list = same type, tuple = mixed types by position; map = same type, object = mixed types by name*.

#### Optional attributes and `any` (extra context)

- `type = any` means "accept anything, work out the type from the value".
- In an object type you can mark an attribute optional (Terraform 1.3 and later): `object({ name = string, port = optional(number, 80) })`. If the caller leaves `port` out it becomes `80` instead of causing an error.

#### Nested collections (used heavily by `for_each`)

Collections can contain other collections. This variable is a **map of objects**, and you will meet it again in the `for_each` challenge:

```hcl
variable "instance_config" {
  type = map(object({
    instance_type = string
    ami           = string
  }))
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}
```

Reading nested values: `var.instance_config["instance1"].instance_type` gives `"t2.micro"`. A **list of objects** reads as `var.servers[0].name`.

### 2.11 Converting between types

Terraform converts automatically where safe, and gives you functions to convert explicitly:

| Function | Example | Result |
|---|---|---|
| `tostring(5)` | number to string | `"5"` |
| `tonumber("12")` | string to number | `12` |
| `tobool("true")` | string to bool | `true` |
| `tolist(...)` | set or tuple to list | `["a","b"]` |
| `toset(["a","b","a"])` | list to set (drops duplicates) | `toset(["a","b"])` |
| `tomap({a="x"})` | object to map | map of strings |

`toset()` is the one you will use the most, because `for_each` only accepts a map or a set of strings (section 7).

---

## 3. The `count` meta-argument

### 3.1 The problem `count` solves

By default, **one `resource` block configures exactly one real infrastructure object**. One `aws_instance` block means one EC2 instance. If you need a second, you would add a second block.

In real organisations you often need a *pool* of servers (10, 20, 50...) with identical configuration (same AMI, same instance type). Copy-pasting the block 30 times technically works but is not optimal:

- every copy needs a **unique local resource name**, otherwise you get a duplicate-resource error,
- real resource blocks can be 40-50 lines, so the file becomes huge,
- changing the configuration later means editing every copy.

`count` adds the missing "how many?" logic to a single block.

```text
WITHOUT count                         WITH count
-------------                         ----------
resource "aws_instance" "myec2-1" {}  resource "aws_instance" "myec2" {
resource "aws_instance" "myec2-2" {}      ...
resource "aws_instance" "myec2-3" {}      count = 3
   (names must all differ)            }
                                      -> 3 instances from ONE block
```

`count` takes a **whole number** and creates that many instances of the resource. It works on *any* resource type, not only EC2. It is a **meta-argument**: it is understood by Terraform itself, not by the provider, so it is available on every resource (and, in current versions, on `data` blocks and `module` blocks too).

### 3.2 Demo 1 — EC2 instances

Base code (one instance):

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

Walkthrough:

1. Copy the block three times **without changing the local name**. `terraform plan` fails with a **duplicate resource aws_instance configuration** error, because the local name (`myec2`) must be unique per resource type.
2. Rename the copies (add a digit). `terraform plan` shows `Plan: 3 to add`.
3. Replace the three copies with one block and add `count = 3`. You no longer need to rename anything. `plan` again shows `3 to add`.
4. `terraform apply -auto-approve` creates three EC2 instances (visible in the AWS console).

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
  count         = 3
}
```

With `count`, Terraform distinguishes the copies by **index**, so the local name no longer needs to change:

```text
aws_instance.myec2[0]
aws_instance.myec2[1]
aws_instance.myec2[2]
```

> AMI IDs are **region specific** and old public AMIs get retired. The AMI IDs in the lesson are from the course repo. If `apply` fails with an invalid AMI error, look up a current Amazon Linux AMI for your region (or use the `aws_ami` data source from [chapter 05](05-resources-data-dependencies.md)).

### 3.3 Limitation 1: the copies are identical

Everything created by `count` is an exact copy. None of the three instances has a name, so with 20-30 instances it is hard to tell them apart (instance IDs are unique but not friendly). In AWS the console name of an EC2 instance comes from the `Name` tag. Add a static tag:

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
  count         = 3

  tags = {
    Name = "payments-system"
  }
}
```

After `apply` (an in-place update), **all three instances have the same name** `payments-system`. Still not distinguishable.

### 3.4 Limitation 2: resources that need unique values fail

Many resources cannot have identical copies at all. Classic example: **IAM user names are unique** in an AWS account.

```hcl
resource "aws_iam_user" "this" {
  name = "payments-user"
}
```

Add `count = 3` to this block. `terraform plan` happily says it will create three users (all named `payments-user`), but `terraform apply` behaves like this:

```text
aws_iam_user.this[0]: Creating...      <- first one succeeds
aws_iam_user.this[1]: Creating...      <- Error: user already exists
aws_iam_user.this[2]: Creating...      <- Error: user already exists
```

**Quiz answer from the lecture:** *one* user is created. The first creation succeeds because no `payments-user` exists yet. The other two fail the uniqueness check.

This teaches an important point: **`plan` cannot always predict provider-side validation errors.** Uniqueness conflicts are only detected by the AWS API during `apply`. The solution to both limitations is `count.index`.

---

### 3.5 `count.index`

When you use `count`, every copy gets its own **distinct index number starting from 0**, exposed as `count.index`.

```text
count = 3

  instance #1  ->  count.index = 0   address: aws_instance.myec2[0]
  instance #2  ->  count.index = 1   address: aws_instance.myec2[1]
  instance #3  ->  count.index = 2   address: aws_instance.myec2[2]
```

You see these addresses in `plan`/`apply` output. The index starts at **0**, so with `count = 3` the indexes are 0, 1, 2 (never 3).

#### Use 1: make names unique with the index

```hcl
resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
  count         = 3

  tags = {
    Name = "payments-system-${count.index}"
  }
}

resource "aws_iam_user" "this" {
  name  = "payments-user-${count.index}"
  count = 3
}
```

| Piece | Meaning |
|---|---|
| `"payments-system-${count.index}"` | **String interpolation.** `${...}` is evaluated for each copy and substituted into the string. |
| 1st copy | `payments-system-0` |
| 2nd copy | `payments-system-1` |
| 3rd copy | `payments-system-2` |

Demo steps:

1. Change the `Name` tag to include `${count.index}`.
2. `terraform plan` shows each `Name` tag changing from `payments-system` to `payments-system-0`, `-1`, `-2` (in-place updates, marked `~`).
3. `terraform apply -auto-approve` changes three resources. In the EC2 console the instances now show unique names, which also makes troubleshooting easier for teams.
4. For IAM, `name = "payments-user-${count.index}"` with `count = 3` now creates three users (`payments-user-0`, `-1`, `-2`) with **no error**, because every name is unique.

(In the lecture the IAM block was temporarily removed, so the plan also showed one destroy. That is not relevant to the topic.)

#### Use 2: pick your own names from a list variable

Numbers 0, 1, 2 are basic. Often you want real names. Combine `count.index` with a **list variable**:

```hcl
variable "users" {
  type    = list
  default = ["alice", "bob", "johncorner", "james", "mrA"]
}

resource "aws_iam_user" "that" {
  name  = var.users[count.index]
  count = 3
}
```

```text
var.users = ["alice", "bob", "johncorner", "james", "mrA"]
               [0]      [1]       [2]         [3]     [4]

count = 3  ->  index 0,1,2
   copy 0:  name = var.users[0] = "alice"
   copy 1:  name = var.users[1] = "bob"
   copy 2:  name = var.users[2] = "johncorner"
   (james and mrA are never used)
```

Points raised in the lecture:

- `type = list` is needed for this use. Indexing with `[count.index]` needs a list.
- `var.users[count.index]` is a **reference**, so do **not** wrap it in quotes. (In the demo the first `plan` errored because the expression was still inside quotes. Removing the quotes fixed it.) Write `name = var.users[count.index]`, not `name = "var.users[count.index]"`.
- The list may contain **more** items than `count`. Only the first `count` items are used. Adding `james` and `mrA` to the list (with `count = 3`) gave `terraform plan` -> **no changes**.
- If `count = 2`, only two names are taken.
- **Gotcha (extra context):** if `count` is *greater* than the list length, the index goes out of range and Terraform errors. The common safe pattern is `count = length(var.users)` (the `length` function is in section 6).

```hcl
resource "aws_iam_user" "that" {
  count = length(var.users)           # one user per list item, always in step
  name  = var.users[count.index]
}
```

| Question | Answer |
|---|---|
| What is `count.index`? | The distinct zero-based index of the current copy |
| Where is it usable? | Only inside a resource (or data/module) block that has `count` set |
| Typical uses | Unique names/tags; selecting the Nth element of a list |
| Address format | `<type>.<name>[<index>]`, for example `aws_instance.myec2[0]` |

> 🎯 **Exam focus:** `count.index` starts at **0**. You can only use `count.index` in a block that uses `count`. `count.index` plus a list variable is the standard pattern for unique names per copy. Two things `count` does *not* mean: it is not "a loop variable you can declare", and `count.index` does not exist in a `for_each` block (that one has `each.key`/`each.value`).

### 3.6 Challenge: how `count` identifies resources (and why it breaks)

With `count`, each instance is addressed by its **index**. Look at this configuration:

```hcl
variable "iam_names" {
  type    = list
  default = ["user-01", "user-02", "user-03"]
}

resource "aws_iam_user" "iam" {
  name  = var.iam_names[count.index]
  count = 3
  path  = "/system/"
}
```

| Resource address | Index | Name |
|---|---|---|
| `aws_iam_user.iam[0]` | 0 | user-01 |
| `aws_iam_user.iam[1]` | 1 | user-02 |
| `aws_iam_user.iam[2]` | 2 | user-03 |

After `terraform apply`, the state file records each user under its index key (index 0 holds `user-01`, index 1 holds `user-02`, and so on).

Because **identity = position in the list**, inserting or reordering elements changes what each index means. The lecture experiment:

1. **Append at the end.** Add `"user-04"` to the end and set `count = 4`. `terraform plan` shows only **1 to add** (new index 3). `terraform apply -auto-approve` works fine.
2. **Insert at the start.** Add `"user-00"` as the first element and set `count = 5`. Now `terraform plan` shows **1 to add and 4 to change**: index 0 used to be `user-01` but is now `user-00`, index 1 is now `user-01`, and so on. Every existing address now points at a different name.

```text
 BEFORE (count=4)            AFTER inserting user-00 at the start (count=5)
 [0] user-01                 [0] user-00   <- index 0 now wants a different name
 [1] user-02                 [1] user-01
 [2] user-03                 [2] user-02
 [3] user-04                 [3] user-03
                             [4] user-04   <- only the "new" element at the end
```

3. Applying this fails. The plan looks like a simple in-place update, but IAM users cannot simply be renamed like this, so `terraform apply -auto-approve` returns multiple failure messages.

Depending on the resource type, shifted addresses lead either to destroy/re-create or to in-place updates. Either way it is risky and, as here, can fail. Never try such changes first in production.

| Situation | Recommended |
|---|---|
| Resources that are **almost identical** (4 EC2 instances with the same AMI and type) | `count` |
| Instances that need **different values** (one `t2.micro`, one `t3.micro`, ...) | `for_each` (section 7) |
| A list whose order may change, or that gains/loses items in the middle | `for_each` (keys are stable) |

> 🎯 **Exam focus:** `count` addresses instances by numeric index (starting at 0). Changing the order of the list or removing an element from the middle re-addresses the others and can cause unwanted updates or destroys. Use `count` for near-identical resources, `for_each` for distinct values or stable identities.

### 3.7 Referencing resources created with `count`

Once a resource has `count`, the resource name is no longer a single object but a **list of objects**:

| Expression | Meaning |
|---|---|
| `aws_instance.myec2[0].id` | the ID of the first instance |
| `aws_instance.myec2[*].id` | a list of every instance's ID (splat, section 9) |
| `length(aws_instance.myec2)` | how many instances there are |

Use `terraform state list` to see the addresses (see [chapter 04](04-state-basics.md)). When you want to run a command against one copy, quote the address in the shell: `terraform apply -target='aws_instance.myec2[1]'` (more in [chapter 11](11-import-state-cli-logging.md)).

⚠️ **Gotchas about `count`**

- The value must be a **whole number known at plan time**. It cannot depend on an attribute that Terraform only learns after `apply`.
- `count = 0` is valid and means "create none". That is how conditionals switch a resource off (section 4).
- You cannot use `count` and `for_each` on the same resource block.
- Remember to `terraform destroy` practice resources to avoid charges.

---

## 4. Conditional expressions

### 4.1 Concept

A **conditional expression** chooses between **two values** based on a condition. It is not a resource. It is logic you put *inside* an argument of a resource (for example `instance_type`).

```text
condition ? true_val : false_val
```

- If `condition` evaluates to `true`, the result is `true_val`.
- If `false`, the result is `false_val`.

Business example from the lecture:

| environment | result |
|---|---|
| development | launch a small server (`t2.micro`, about 1 GB RAM) |
| production | launch a large server (`m5.large`) |

The value of "environment" typically comes from a **variable** (it could come from other places too).

```text
 var.environment ──► [ var.environment == "development" ? "t2.micro" : "m5.large" ]
                                   │                          │            │
                              condition                  true value   false value
                                   └──► value for instance_type
```

### 4.2 Demo base code

The base file has a variable that is **not connected** to the resource, so `t2.micro` is always used regardless of the variable:

```hcl
variable "environment" {
  default = "development"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = "t2.micro"
}
```

(The repo snippet has a missing closing quote after `t2.micro`. The correct line is `instance_type = "t2.micro"`.)

### 4.3 Equality (`==`)

```hcl
variable "environment" {
  default = "production"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = var.environment == "development" ? "t2.micro" : "m5.large"
}
```

- Condition: `var.environment == "development"`.
- True gives `t2.micro`, false gives `m5.large`.
- With `default = "development"`, `terraform plan` shows `instance_type = "t2.micro"`.
- Change the default to `"production"` (or anything other than `development`) and `plan` shows `m5.large`.

### 4.4 Not-equals (`!=`)

```hcl
variable "environment" {
  default = "production"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = var.environment != "development" ? "t2.micro" : "m5.large"
}
```

Reasoning: environment is `production`, so `production != development` is **true**, so the result is `t2.micro`. If the environment is changed to `development`, the condition is false and the result is `m5.large`. The logic is deliberately inverted compared with the previous example, so **read the condition carefully**.

### 4.5 Empty-value check

You can also test for "no value" by comparing to an empty string. If empty, use `t2.micro`, otherwise `m5.large` (reconstructed from the lecture transcript):

```hcl
variable "environment" {
  default = ""
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = var.environment == "" ? "t2.micro" : "m5.large"
}
```

- Default is empty: `t2.micro`.
- Default set to, say, `"production"`: `m5.large`.

(The repo file's "Empty Value Based Example" section is just a copy of the `!=` example, so it does not show the empty comparison. Follow the version above.)

### 4.6 Multiple conditions with `&&`

```hcl
variable "environment" {
  default = "production"
}

variable "region" {
  default = "ap-south-1"
}

resource "aws_instance" "myec2" {
  ami           = "ami-00c39f71452c08778"
  instance_type = var.environment == "production" && var.region == "us-east-1" ? "m5.large" : "t2.micro"
}
```

- Condition: `var.environment == "production" && var.region == "us-east-1"`.
- **Both** parts must be true for the true value (`m5.large`). If either is false, the false value (`t2.micro`) applies.
- In the lecture the region default was `us-east-1` first (both true, so `m5.large`), then changed to `ap-south-1` (second part false, so `t2.micro`). The story: "production's main region is us-east-1, so only there use the big server."

Truth table for `A && B`:

| A | B | result |
|---|---|---|
| true | true | true value |
| true | false | false value |
| false | true | false value |
| false | false | false value |

### 4.6b Operators you can use in a condition

| Kind | Operators | Example |
|---|---|---|
| Equality | `==`, `!=` | `var.env == "prod"` |
| Comparison | `<`, `<=`, `>`, `>=` | `var.disk_size >= 50` |
| Logical | `&&` (and), `\|\|` (or), `!` (not) | `var.a \|\| var.b` |
| Arithmetic | `+`, `-`, `*`, `/`, `%` | `var.count + 1` |

The condition must evaluate to a **bool**. Both result values should be of the same type (or convertible to one): `cond ? "a" : 5` is not what you want.

### 4.7 Bonus: conditional + `count` to switch resources on and off

The repo has a second snippet from the same video section that combines a conditional with `count`. A count of 0 means the resource is **not created**:

```hcl
variable "istest" {}

resource "aws_instance" "dev" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = "t2.micro"
  count         = var.istest == true ? 3 : 0
}

resource "aws_instance" "prod" {
  ami           = "ami-082b5a644766e0e6f"
  instance_type = "t2.large"
  count         = var.istest == false ? 1 : 0
}
```

`terraform.tfvars`:

```hcl
istest = false
```

| `istest` | `dev` count | `prod` count | Result |
|---|---|---|---|
| `true` | 3 | 0 | 3 small dev instances, no prod |
| `false` | 0 | 1 | no dev, 1 large prod instance |

(The repo's sample provider block has hard-coded keys. Use placeholders or environment credentials, never real keys in code.) The pattern `count = condition ? N : 0` is a very common way to create a resource **only conditionally**. A shorter form for a bool variable is `count = var.istest ? 3 : 0`.

> 🎯 **Exam focus:** Syntax is `condition ? true_val : false_val`. Operators in the condition include `==`, `!=`, `&&`, `||`. The conditional is used *inside* an argument and creates nothing by itself. With `&&`, one false part makes the whole condition false. `count = cond ? n : 0` turns a resource on or off.

---
## 5. Built-in functions

### 5.1 What is a function?

A function is a block of code that performs a specific task: it takes **input(s)** and returns an **output**. This idea is the same as in Python or any other language.

```text
       input                function              output
  (10, 30, 20)   ───►      max(...)     ───►        30
```

The benefit: you do not need to write the logic yourself. Terraform ships with many **built-in functions**. A function call always looks like `name(argument, argument, ...)`.

Two examples used in the lecture:

| Function | What it does | Example |
|---|---|---|
| `max` | Takes one or more numbers and returns the greatest | `max(10, 30, 50)` -> `50` |
| `file` | Reads the contents of a file at a given path and returns them as a string | `file("./random-file.txt")` -> the file contents |

### 5.2 Testing functions with `terraform console`

(Introduced in section 1.) Commands from the lecture:

```bash
terraform console
```

```text
> max(10,30,50)
50
> file("./random-file.txt")
"This is a random file for testing\n"
```

(The repo snippet is missing the closing quote in the `file(...)` call. The correct form is `file("./random-file.txt")`. A file's trailing newline shows up as `\n`.)

Demo steps:

1. Create a text file `random-file.txt` containing "This is a random file for testing" (any content works).
2. Run `terraform console`.
3. Type `max(<some numbers>)`: it prints the greatest.
4. Type `file("random-file.txt")`: it prints the file content.
5. `Ctrl+D` to leave.

### 5.3 Why `file()` matters in the real world

`file()` lets you move large content (like a JSON IAM policy of 20-100 lines) **out of the `.tf` file** and load it at run time. The Terraform code becomes smaller, easier to read, and less error-prone to edit.

### 5.4 Demo: shrinking an IAM policy with `file()` (and `jsonencode`)

**Scenario:** create an IAM user and give it a policy. (An AWS user has no permissions by default. Permissions are given by *policies*, which are JSON documents.)

**Before.** The policy JSON is inline via the `jsonencode` function:

```hcl
resource "aws_iam_user" "this" {
  name = "demo-kplabs-user"
}

resource "aws_iam_user_policy" "lb_ro" {
  name = "demo-user-policy"
  user = aws_iam_user.this.name

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Action" : "ec2:*",
        "Effect" : "Allow",
        "Resource" : "*"
      },
      {
        "Effect" : "Allow",
        "Action" : "elasticloadbalancing:*",
        "Resource" : "*"
      },
      {
        "Effect" : "Allow",
        "Action" : "cloudwatch:*",
        "Resource" : "*"
      },
      {
        "Effect" : "Allow",
        "Action" : "autoscaling:*",
        "Resource" : "*"
      },
      {
        "Effect" : "Allow",
        "Action" : "iam:CreateServiceLinkedRole",
        "Resource" : "*",
        "Condition" : {
          "StringEquals" : {
            "iam:AWSServiceName" : [
              "autoscaling.amazonaws.com",
              "ec2scheduled.amazonaws.com",
              "elasticloadbalancing.amazonaws.com",
              "spot.amazonaws.com",
              "spotfleet.amazonaws.com",
              "transitgateway.amazonaws.com"
            ]
          }
        }
      }
    ]
  })
}
```

| Piece | Purpose |
|---|---|
| `aws_iam_user.this` | Creates the IAM user `demo-kplabs-user` |
| `aws_iam_user_policy.lb_ro` | Attaches an inline policy to that user |
| `user = aws_iam_user.this.name` | A reference to the user's name (this creates an implicit dependency, see [chapter 05](05-resources-data-dependencies.md)) |
| `jsonencode({...})` | A second built-in function: converts the HCL object into a JSON **string** |

**After.** The JSON goes into its own file and is loaded with `file()`:

```hcl
resource "aws_iam_user" "this" {
  name = "demo-kplabs-user"
}

resource "aws_iam_user_policy" "lb_ro" {
  name = "demo-user-policy"
  user = aws_iam_user.this.name

  policy = file("./iam-user-policy.json")
}
```

`iam-user-policy.json` (plain JSON, **no** `jsonencode` wrapper):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "ec2:*",
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "elasticloadbalancing:*",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "cloudwatch:*",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "autoscaling:*",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "iam:AWSServiceName": [
            "autoscaling.amazonaws.com",
            "ec2scheduled.amazonaws.com",
            "elasticloadbalancing.amazonaws.com",
            "spot.amazonaws.com",
            "spotfleet.amazonaws.com",
            "transitgateway.amazonaws.com"
          ]
        }
      }
    }
  ]
}
```

Step-by-step walkthrough from the video:

1. For context, show the manual console flow: create the user `demo-kplabs-user`, notice it has no permissions, and note that attached policies are JSON documents. (The instructor then deletes the manually created user so Terraform can create it.)
2. Exit the console with `Ctrl+D`. Run `terraform validate`. It complains the AWS provider is not available, so run `terraform init` and then `terraform validate` again. It is valid.
3. `terraform apply -auto-approve`. The user and policy are created. The console shows the user with policy `demo-user-policy` containing the JSON.
4. **Refactor.** Cut the JSON out of the `.tf` file, save it as `iam-user-policy.json`, and set `policy = file("./iam-user-policy.json")` (same folder).
5. `terraform plan` -> **No changes**, because the old large code and the new small code produce the identical policy.
6. To prove it, `terraform destroy -auto-approve` and then `terraform apply -auto-approve` again. The user has the same policy.

> **Extra context:** `file()` paths are relative to the **working directory** you run Terraform from. Inside a module you normally write `file("${path.module}/policy.json")` so the path follows the module folder. `path.module`, `path.root` and `path.cwd` are built-in references, not functions.

### 5.5 Function categories and documentation

HashiCorp groups the functions into categories in the docs (`https://developer.hashicorp.com/terraform/language/functions`):

| Category | Examples |
|---|---|
| Numeric | `max`, `min`, `ceil`, `floor`, `abs` |
| String | `format`, `lower`, `upper`, `join`, `split`, `replace` |
| Collection | `length`, `element`, `lookup`, `concat`, `merge`, `zipmap` |
| Encoding | `jsonencode`, `jsondecode`, `base64encode` |
| Filesystem | `file`, `fileexists`, `templatefile` |
| Date and Time | `timestamp`, `formatdate` |
| Hash and Crypto | `md5`, `sha256`, `uuid` |
| IP Network | `cidrsubnet`, `cidrhost` |
| Type Conversion | `tostring`, `tonumber`, `toset`, `tolist`, `tomap`, `try`, `can` |

Each function page has a description, the exact syntax, and examples. Use the docs to learn what a function does and which argument types it expects.

### 5.6 Important limitation

**Terraform does not support user-defined functions.** Only the built-in functions of the language are available.

> 🎯 **Exam focus:** You are **not** expected to memorise every function. Know the concept, how to test with `terraform console`, and the common ones (`file`, `lookup`, `length`, `element`). `file()` returns file contents as a string. There are no user-defined functions. Functions are grouped by category in the docs.

---

## 6. Reading code that contains functions

Functions are best learned by **analysing real code**. This section follows the course's two-lecture challenge: you get code with five functions and must work out what it will create **without** running `terraform apply` (after an apply the functions have already done their job and you learn nothing).

### 6.1 The challenge

Steps given in the lecture:

1. Analyse what the code will do **without** running `terraform apply`. Use the documentation.
2. Analyse the outcome of each function with `terraform console`.
3. Write down what each function does so you can predict what the code creates.
4. Finally run `terraform apply` and verify it matches your notes from step 3.

The code:

```hcl
provider "aws" {
  region = var.region
}

variable "region" {
  default = "us-east-1"
}

variable "tags" {
  type    = list
  default = ["firstec2", "secondec2"]
}

variable "ami" {
  type = map
  default = {
    "us-east-1"  = "ami-08a0d1e16fc3f61ea"
    "us-west-2"  = "ami-0b20a6f09484773af"
    "ap-south-1" = "ami-0e1d06225679bc1c5"
  }
}

resource "aws_instance" "app-dev" {
  ami           = lookup(var.ami, var.region)
  instance_type = "t2.micro"
  count         = length(var.tags)

  tags = {
    Name         = element(var.tags, count.index)
    CreationDate = formatdate("DD MMM YYYY hh:mm ZZZ", timestamp())
  }
}
```

**How to spot functions.** A function call looks like `name(arguments...)`. Walk through the code:

| Location | Function | Arguments |
|---|---|---|
| provider / variables | none | - |
| `ami` argument | `lookup` | `var.ami`, `var.region` |
| `count` argument | `length` | `var.tags` |
| `Name` tag | `element` | `var.tags`, `count.index` |
| `CreationDate` tag | `formatdate` (wrapping `timestamp`) | `"DD MMM YYYY hh:mm ZZZ"`, `timestamp()` |

That is **five functions**: `lookup`, `length`, `element`, `formatdate`, `timestamp`. The inputs are `var.region = us-east-1`, `var.tags` = a list of 2 strings, `var.ami` = a map from region to AMI ID.

Before reading on, think: what does each function return, how many instances come out, what are they named, and which AMI do they use?

### 6.2 The method

For each function: (1) read the docs, (2) understand the arguments, (3) run an example in `terraform console` (or a scratch `test.tf`), (4) substitute the result back into the resource in your head.

### 6.3 Function 1 — `lookup`

Docs: *`lookup` retrieves the value of a single element from a map, given its key.*

```text
lookup(map, key, default)
```

Docs example, tested in `terraform console`:

```hcl
lookup({a="ay", b="bee"}, "a", "what?")
```

Result: `"ay"`. The map has keys `a` and `b`. Asking for key `a` returns `ay`, key `b` would return `bee`. If the key is **not** in the map (say `"c"`), the third argument, the **default**, is returned (`"what?"`).

Applied to the challenge:

```hcl
ami = lookup(var.ami, var.region)
```

- First argument must be a **map**: `var.ami` (a map, correct).
- Second argument is the **key**: `var.region` = `us-east-1`.

Test the expanded form in the console (variables replaced by their values):

```hcl
lookup({"us-east-1" = "ami-08a0d1e16fc3f61ea","us-west-2" = "ami-0b20a6f09484773af","ap-south-1" = "ami-0e1d06225679bc1c5"},"us-east-1")
```

Result: `"ami-08a0d1e16fc3f61ea"` (ending in `...1ea`). So `ami = "ami-08a0d1e16fc3f61ea"`.

Gotcha shown in the demo: forgetting the comma between the map and the key gives *"a comma is required to separate function argument from the next"*. Read the syntax carefully.

> **Up to date (TF 1.12):** the lesson's challenge calls `lookup(var.ami, var.region)` with **two** arguments and it works. In current Terraform the default is optional (the docs show `lookup(map, key, default)`), but if the key is missing and you gave **no default**, `lookup` fails with an error. Giving a default is safer: `lookup(var.ami, var.region, "ami-fallback")`. For a plain map you can also write `var.ami[var.region]`, which errors for a missing key as well.

### 6.4 Function 2 — `length`

Docs: *`length` determines the length of a given list, map, or string.*

| Call | Result |
|---|---|
| `length([])` | `0` |
| `length(["a","b"])` | `2` |
| `length({"a" = "b"})` | `1` |
| `length("hello")` | `5` |

Applied:

```hcl
count = length(var.tags)
```

Console test:

```hcl
length(["firstec2","secondec2"])
```

Result: `2`. The block behaves like `count = 2`, giving **two EC2 instances**. This is the dynamic pattern: the instance count follows the size of the list.

### 6.5 Function 3 — `element`

Docs: *`element` retrieves a single element from a list.*

```text
element(list, index)
```

Index starts at 0. Docs example: `element(["a","b","c"], 1)` -> `"b"`.

Applied:

```hcl
Name = element(var.tags, count.index)
```

- First argument must be a **list**: `var.tags` is a list.
- Second argument is the index: `count.index`.

Console test:

```hcl
element(["firstec2","secondec2"],1)
```

Result: `"secondec2"` (with index `0` you get `"firstec2"`). Link with `count`: count is 2, so the first instance has `count.index = 0` and `Name = firstec2`. The second has `count.index = 1` and `Name = secondec2`.

> **Extra context:** `element` **wraps around** if the index is larger than the list: `element(["a","b","c"], 3)` returns `"a"`. Plain indexing `var.tags[3]` would fail with an error. Use `element` when you want round-robin spreading (for example, placing instances across a list of subnets).

### 6.6 Functions 4 and 5 — `timestamp` and `formatdate`

`timestamp()` returns the **current UTC time** as an RFC 3339 string, for example `2024-06-17T17:51:34Z`. That format is hard for humans to read.

`formatdate(spec, timestamp)` converts a timestamp into a readable format described by `spec`. The spec used here is `"DD MMM YYYY hh:mm ZZZ"`:

| Token | Meaning | Example |
|---|---|---|
| `DD` | day of month | `17` |
| `MMM` | abbreviated month | `Jun` |
| `YYYY` | year | `2024` |
| `hh:mm` | hour:minute | `17:51` |
| `ZZZ` | timezone name | `UTC` |

Console test with the sample timestamp:

```hcl
formatdate("DD MMM YYYY hh:mm ZZZ", "2024-06-17T17:51:34Z")
```

Result: `"17 Jun 2024 17:51 UTC"`.

So `CreationDate = formatdate("DD MMM YYYY hh:mm ZZZ", timestamp())` first runs `timestamp()` (the inner function runs first), then formats it. Functions can be **nested**, and evaluation goes from the innermost outward.

> **Extra context — more `formatdate` tokens** (check the docs page if in doubt, and test in the console): `YY` two-digit year, `MM` two-digit month, `MMMM` full month name, `D` day without padding, `EEEE` / `EEE` weekday name, `hh` / `h` hour in the 24-hour clock, `HH` / `H` hour in the 12-hour clock, `mm` minutes, `ss` seconds, `AA` / `aa` AM/PM. For example `formatdate("EEEE, DD-MMM-YY hh:mm:ss ZZZ", "2018-01-02T23:12:01Z")` gives `"Tuesday, 02-Jan-18 23:12:01 UTC"`.

### 6.7 Putting it together: the predicted result

Replace each function by its result (this is what the instructor documented in a scratch `test.tf`):

```hcl
resource "aws_instance" "app-dev" {
  ami           = "ami-08a0d1e16fc3f61ea"
  instance_type = "t2.micro"
  count         = 2

  tags = {
    Name         = element(var.tags, count.index)
    CreationDate = "17 Jun 2024 17:51 UTC"
  }
}
```

| Instance | `count.index` | `Name` | AMI | `CreationDate` |
|---|---|---|---|---|
| `app-dev[0]` | 0 | `firstec2` | `ami-08a0d1e16fc3f61ea` | current UTC date/time |
| `app-dev[1]` | 1 | `secondec2` | `ami-08a0d1e16fc3f61ea` | current UTC date/time |

### 6.8 Verification

1. Rename the scratch file `test.tf` to `test.tf.bak` so Terraform ignores it (only `.tf` and `.tf.json` files are loaded).
2. `Ctrl+D` to leave `terraform console`.
3. `terraform validate` -> OK.
4. `terraform apply -auto-approve` -> two EC2 instances created (about 36 seconds in the demo).
5. In the EC2 console: two instances named `firstec2` and `secondec2`. Each has two tags, `Name` and `CreationDate`. The AMI ends with `...1ea`, matching the console prediction.
6. `terraform destroy` to avoid costs (about 43 seconds in the demo).

Everything predicted matched the real result.

⚠️ **Gotcha — `timestamp()` changes on every run.** A tag built from `timestamp()` shows as changed in **every** `plan`. If you need a stable date, avoid `timestamp()` in resource arguments, or add `lifecycle { ignore_changes = [tags] }` (see [08 — Lifecycle](08-lifecycle-conditions-sensitive.md)). Locals can hold the same expression (see [chapter 06](06-variables-outputs-locals.md)); remember that a **variable default cannot call a function** (`Function calls not allowed`), while a local can.

> **Up to date (TF 1.12):** `plantimestamp()` (Terraform 1.5 and later) returns the timestamp of the *plan* and stays the same through apply, which avoids the "known after apply" noise that `timestamp()` can cause. It is not in the lesson. Treat as extra context.

> 🎯 **Exam focus:** Learning approach: **documentation + `terraform console`** let you test functions without `terraform apply`. `lookup(map, key, default)`, `length(x)`, `element(list, index)` (0-based), `timestamp()` (UTC, RFC 3339), `formatdate(spec, ts)`. You do not need to memorise all functions, but you must be able to **read code with functions and work out what it does**. Do not guess a function's behaviour from its name. Check the arguments it expects (a list? a map? a key?).

### 6.9 The `zipmap` function

`zipmap(keyslist, valueslist)` **constructs a map from a list of keys and a corresponding list of values**. The first key pairs with the first value, the second with the second, and so on.

Docs example: `zipmap(["a", "b"], [1, 2])` gives `{ "a" = 1, "b" = 2 }`.

Try it in `terraform console`:

```text
> zipmap(["pineapple","oranges","strawberry"], ["yellow","orange","red"])
{
  "oranges" = "orange"
  "pineapple" = "yellow"
  "strawberry" = "red"
}
```

(Keys appear in sorted order in the printed map.)

```text
 keys:    ["pineapple", "oranges", "strawberry"]
 values:  ["yellow",    "orange",  "red"       ]
            |             |           |
            v             v           v
 map:     { pineapple = yellow, oranges = orange, strawberry = red }
```

#### Practical use case: name-to-ARN output

When you create several IAM users with `count`, separate outputs for names and ARNs are hard to read, especially if the project also has SQS queues and other resources. A `zipmap` pairs each user's name with its ARN in **one** output.

```hcl
provider "aws" {
  region = "us-west-2"
}

resource "aws_iam_user" "lb" {
  name  = "demo-user.${count.index}"
  count = 3
  path  = "/system/"
}

output "arns" {
  value = aws_iam_user.lb[*].arn
}

output "zipmap" {
  value = zipmap(aws_iam_user.lb[*].name, aws_iam_user.lb[*].arn)
}
```

- `count = 3` and `"demo-user.${count.index}"` produce users `demo-user.0`, `demo-user.1`, `demo-user.2`.
- `aws_iam_user.lb[*].arn` and `...[*].name` are **splat expressions** (section 9) returning lists of ARNs and names.
- `zipmap(names, arns)` turns the two lists into a map `{ "demo-user.0" = "<arn0>", ... }`.

Demo walkthrough: exit the console and run `terraform apply -auto-approve`. The output shows the separate lists and the combined map:

```text
zipmap = {
  "demo-user.0" = "arn:aws:iam::<ACCOUNT_ID>:user/system/demo-user.0"
  "demo-user.1" = "arn:aws:iam::<ACCOUNT_ID>:user/system/demo-user.1"
  "demo-user.2" = "arn:aws:iam::<ACCOUNT_ID>:user/system/demo-user.2"
}
```

(`<ACCOUNT_ID>` is a placeholder. Your output shows your real account.)

> **Extra context:** the two lists must have the same length, otherwise `zipmap` errors. If a key appears twice, the later value wins.

> 🎯 **Exam focus:** `zipmap` returns a **map**. Typical pairing: `zipmap(resource[*].name, resource[*].arn)`. Test functions interactively with `terraform console`.

### 6.10 Functions seen elsewhere in the course

| Function | Where it appeared | What it did |
|---|---|---|
| `jsonencode(value)` | IAM policy demo (5.4) | HCL object to a JSON string |
| `file(path)` | IAM policy, provisioner scripts, many labs | read a file as a string |
| `join(",", list)` | provisioner demo in lesson 5: `join(",", aws_eip.lb[*].public_ip)` | glue the items of a list into one string with a separator |
| `concat(list1, list2)` | locals demo: `concat(aws_instance.blue.*.id, aws_instance.green.*.id)` | join two lists into one |
| `lookup(map, key, default)` | workspaces demo: pick an instance type per workspace, with a default for unknown names | map lookup with a safe fallback |
| `tolist()`, `toset()`, `sort()` | sets (2.9) and `for_each` | type conversion and ordering |
| `length()` | validation conditions, `count`, the challenge-4 user count | size of list/map/string |
| `formatdate()` + `timestamp()` | locals demo: `"date-${formatdate("DDMMYYYY", timestamp())}"` | readable date tags |

### 6.11 More built-in functions worth knowing (extra context)

None of these is demoed in the lesson, but they are all in the docs, they are all testable in `terraform console`, and exam questions of the form "what does this expression return?" use them. Try each one.

**Numeric**

| Call | Result |
|---|---|
| `max(10, 30, 50)` | `50` |
| `min(3, 1, 2)` | `1` |
| `ceil(4.2)` / `floor(4.8)` | `5` / `4` |
| `abs(-5)` | `5` |
| `max([1, 5, 3]...)` | `5` (the `...` "expands" a list into separate arguments) |

**String**

| Call | Result |
|---|---|
| `upper("hello")` / `lower("HELLO")` | `"HELLO"` / `"hello"` |
| `title("hello world")` | `"Hello World"` |
| `trimspace("  hi  ")` | `"hi"` |
| `replace("hello world", "world", "tf")` | `"hello tf"` |
| `substr("terraform", 0, 4)` | `"terr"` |
| `split(",", "a,b,c")` | `["a","b","c"]` |
| `join("-", ["a","b","c"])` | `"a-b-c"` |
| `format("Hello, %s! You are %d.", "Ann", 30)` | `"Hello, Ann! You are 30."` |

**Collection**

| Call | Result |
|---|---|
| `length(["a","b"])` | `2` |
| `concat([1,2], [3])` | `[1,2,3]` |
| `merge({a=1}, {b=2})` | `{a=1, b=2}` (later maps win on duplicate keys) |
| `keys({a=1, b=2})` / `values({a=1, b=2})` | `["a","b"]` / `[1,2]` |
| `contains(["a","b"], "a")` | `true` |
| `distinct(["a","b","a"])` | `["a","b"]` |
| `flatten([[1,2],[3]])` | `[1,2,3]` |
| `slice(["a","b","c"], 0, 2)` | `["a","b"]` |
| `sort(["b","a"])` | `["a","b"]` |
| `compact(["a","","b"])` | `["a","b"]` (drops empty strings) |
| `coalesce("", "x")` | `"x"` (first non-empty value) |
| `index(["a","b","c"], "b")` | `1` |
| `range(3)` | `[0,1,2]` |
| `lookup({a="x"}, "z", "none")` | `"none"` |
| `element(["a","b","c"], 4)` | `"b"` (wraps around) |

**Encoding and filesystem**

| Call | What it does |
|---|---|
| `jsonencode({a=1})` | `"{\"a\":1}"` (HCL value to JSON text) |
| `jsondecode("{\"a\":1}")` | the object `{ a = 1 }` |
| `base64encode("hi")` | `"aGk="` |
| `file("x.txt")` | the file's contents as a string |
| `fileexists("x.txt")` | `true` / `false` |
| `templatefile("user_data.tftpl", { name = "web" })` | read a template file and substitute variables (commonly used for EC2 `user_data`) |

**Network, hash and type helpers**

| Call | Result / purpose |
|---|---|
| `cidrsubnet("10.0.0.0/16", 8, 1)` | `"10.0.1.0/24"` (carve a subnet out of a bigger block) |
| `md5("hello")`, `sha256("hello")` | hashes, useful for change detection |
| `uuid()` | a random UUID (different on every run) |
| `try(local.x.y, "default")` | the first expression that does not error |
| `can(expr)` | `true` if the expression evaluates without an error (used a lot in validation conditions) |
| `one(list)` | the single element of a 0-or-1 element list, or `null` |

> The functions `sensitive()` and `nonsensitive()` are covered in [08 — Lifecycle, conditions and sensitive values](08-lifecycle-conditions-sensitive.md).

---

## 7. `for_each`

### 7.1 The problem

A resource block normally maps to **one** real infrastructure object. Often you need many similar objects: 5 (or 50) IAM users. Copy-pasting 50 resource blocks makes configuration long and hard to maintain.

Two meta-arguments solve this:

| Meta-argument | Use when |
|---|---|
| `count` | You need N copies of essentially the **same** object |
| `for_each` | Same resource type but each instance has a **slightly different configuration** (for example a different `name`) |

`count` does not fit the IAM-users case well because the `name` differs for every user. `for_each` is the right fit.

### 7.2 What `for_each` does

If `for_each` is given a **map** or a **set of strings**, Terraform creates **one instance for each member**.

```text
variable user_names = ["alice","bob"]

           resource "aws_iam_user" "this" { for_each = var.user_names ... }
                                     |
          +--------------------------+--------------------------+
          v                                                     v
 aws_iam_user.this["alice"]                           aws_iam_user.this["bob"]
   name = "alice"                                       name = "bob"
```

One block in code, many instances behind the scenes.

### 7.3 Example 1 — `for_each` with a set

```hcl
variable "user_names" {
  type    = set(string)
  default = ["alice", "bob", "john", "james"]
}

resource "aws_iam_user" "this" {
  for_each = var.user_names
  name     = each.value
}
```

Line by line:

- `variable "user_names"`: a `set(string)` holding the user names. (Live in the video it started as `alice, bob, john`. `james` was added later.)
- `for_each = var.user_names`: loop over the set and create one `aws_iam_user` per element.
- `name = each.value`: `each.value` is the current element being processed. Alice creates a user named alice, and so on.

**Demo walkthrough**

1. Create `foreach.tf` with the variable and resource above.
2. Typing `type = set(strings)` gives `Invalid type specification - the keyword "strings" is not a valid type`. Use `set(string)`.
3. `terraform init`
4. `terraform plan` shows `aws_iam_user.this["alice"]`, `["bob"]`, `["john"]` to be added.
5. Add a fourth name (`james`) to the default and `terraform plan` again. Only **1 to add** (the new one). The existing users are untouched. This is a major advantage of `for_each` over `count` (where adding or removing in the middle of the list shifts indexes, section 3.6).
6. `terraform apply -auto-approve` and verify in the AWS console that all users exist.

### 7.4 The `each` object

Inside a resource that uses `for_each`, Terraform provides an `each` object with two attributes:

| Attribute | Meaning |
|---|---|
| `each.key` | The map key (for a set: the element itself) |
| `each.value` | The map value (for a set: the element itself) |

### 7.5 Example 2 — `for_each` with a map

```hcl
variable "my-map" {
  default = {
    key  = "value"
    key1 = "value1"
  }
}

resource "aws_instance" "web" {
  for_each      = var.my-map
  ami           = each.value
  instance_type = "t3.micro"

  tags = {
    Name = each.key
  }
}
```

- `for_each = var.my-map` makes two instances, one per key.
- `ami = each.value` uses the map value as the AMI ID. (In the repo example the values are placeholders `value` / `value1`. In the video the idea was something like `dev = ami-123`, `prod = ami-456`.)
- `Name = each.key` makes the tag take the map key.

`terraform plan` shows **2 to add**: one with `ami = "value"` and `Name = "key"`, the other with `ami = "value1"` and `Name = "key1"`.

| Map entry | `each.key` | `each.value` |
|---|---|---|
| `key = "value"` | `key` | `value` |
| `key1 = "value1"` | `key1` | `value1` |

### 7.6 `each.key` with a set

With a set there are no key/value pairs, so **key and value are the same item**. Using `name = each.key` in the IAM-user example produces the identical plan ("No changes"). It works, but the recommendation is to use **`each.value`** for sets because it is more accurate and easier to understand. Use `each.key` and `each.value` distinctly only when you have real key-value pairs (maps).

### 7.7 Example 3 — a map of objects (Challenge 3 from the course)

**Problem statement.** The challenge folder gives a variable `instance_config`, a map with two entries (the AMI IDs differ, two different operating systems):

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}
```

Conditions:

1. **EC2 instances must be created from the values in the map**, one per key, using that key's `instance_type` and `ami`. (If the map had 20 entries you should get 20 instances, each configured from its own entry.)
2. **If a key/value pair is removed from the map, the corresponding instance must be destroyed** on the next `terraform apply`. Likewise, adding a new key (say `instance3`) creates a new instance.

Also in the folder, `providers.tf` (do not touch):

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

**Concepts tested:** loops/meta-arguments (`for_each` vs `count`), maps and `each.key` / `each.value`, resource addressing with keys (`aws_instance.web["instance1"]`) and the state file, and how Terraform plans add/remove/modify by comparing the desired set of keys with state.

**Instructor's hints**

1. Use **some kind of loop**. The map may have 20 or 30 entries and change over time. Writing 20-30 resource blocks would create "an unnecessarily large code base".
2. Specifically **`for_each`**: "if a resource block includes a `for_each` argument whose value is a map or a set, Terraform creates one instance for each member of that map or set."

**Solution, step by step**

1. The variable is already a map, so `for_each` fits directly.
2. Start from the **`aws_instance` example in the AWS provider docs**. Keep only `ami` and `instance_type`. Remove the tags.
3. Add `for_each = var.instance_config`.
4. Replace the hard-coded arguments with `each.value.ami` and `each.value.instance_type`. `each.value` is the object for the current key. `each.key` would be `instance1`, `instance2`.
5. Cross-check the docs: search "for_each terraform" for the HashiCorp developer docs. Their map example (a `vpcs` variable looped with `each.value.cidr_block`) is the same pattern.
6. `terraform init`, `terraform plan` (two instances), `terraform apply -auto-approve`.
7. Look at the addresses: `aws_instance.web["instance1"]` and `aws_instance.web["instance2"]`. In `terraform.tfstate` the same appears as `aws_instance.web` with `index_key` `instance1` / `instance2`. **The key *is* the identity of the instance.**
8. **Test requirement 2.** Delete the `instance2` entry and add `instance3`. `terraform plan` shows **1 to destroy (instance2) and 1 to add (instance3)**. Apply (about 43 seconds). The console shows two running instances and one terminated.
9. **Bonus test.** Change `instance3` from `t2.micro` to `t2.small`. `terraform plan` shows an **in-place modification** of only the `["instance3"]` entry.
10. `terraform destroy` to avoid charges.

**Final working code**

```hcl
variable "instance_config" {
  type = map
  default = {
    instance1 = { instance_type = "t2.micro", ami = "ami-03a6eaae9938c858c" }
    instance2 = { instance_type = "t2.small", ami = "ami-053b0d53c279acc90" }
  }
}

resource "aws_instance" "web" {
  for_each      = var.instance_config
  ami           = each.value.ami
  instance_type = each.value.instance_type
}
```

Explanation:

- `for_each = var.instance_config`: one `aws_instance.web` instance per key.
- `each.value.ami` / `each.value.instance_type`: pick attributes from the per-key object.
- The loop key (`instance1`, ...) becomes part of the address, which makes removal precise: removing `instance2` destroys exactly `aws_instance.web["instance2"]`.

**Common mistakes in this challenge**

- Writing one `aws_instance` block per entry instead of looping.
- Using `count` with a list index: removing an item from the middle shifts indexes and can cause unwanted replacements. `for_each` with stable keys avoids that.
- Writing `each.value` where you need `each.value.ami`, or `each.key` where you need a value.
- Expecting that renaming a map key will update the instance in place. It is a **destroy and create** (the `instance2` to `instance3` test shows exactly this).
- Using AMI IDs that do not exist in your region or account. AMIs are region-specific, and old public AMIs can be deprecated. Replace with valid IDs for `us-east-1` if apply fails.
- Forgetting `terraform destroy` afterwards.

**What to take away:** `for_each` is the right tool when you iterate a **map or set** and want **stable identities** (keys). Adding or removing keys translates into create or destroy, and editing values translates into an in-place update (or a replacement, depending on the attribute).

### 7.8 Addresses: `count` versus `for_each`

| | `count` | `for_each` |
|---|---|---|
| Input | a whole number | a map or a set of strings |
| Identity of an instance | numeric index | key |
| Address | `aws_iam_user.this[0]` | `aws_iam_user.this["alice"]` |
| Current item | `count.index` | `each.key`, `each.value` |
| Remove an item from the middle | later indexes shift, many changes | only that one instance is destroyed |
| Best for | N near-identical copies, on/off switch (`0`/`1`) | instances that differ, stable identities |
| Value of the whole resource | a **list** of objects | a **map** of objects |

> 🎯 **Exam focus:** `for_each` = one resource block, many instances, each can differ via `each.key` / `each.value`. It works with a **map** or a **set of strings**. `each.key` and `each.value` are identical for a set. Use `count` for identical copies, `for_each` when each copy differs. Adding or removing an element only affects that element's instance, which is safer than `count`.

⚠️ **Gotchas about `for_each`**

- A plain **list is rejected**. You get an error like *"The given "for_each" argument value is unsuitable: the "for_each" argument must be a map, or set of strings, and you have provided a value of type list of string."* Fix: wrap it with `toset(var.my_list)`.
- A `set(number)` is also rejected. A set must be a **set of strings** for `for_each`. Convert with `toset([for n in var.nums : tostring(n)])`.
- The keys must be **known at plan time**. If the keys come from an attribute that is only known after apply (such as another resource's generated ID), you get an error *"The "for_each" set includes values derived from resource attributes that cannot be determined until apply"*. Build the keys from static values (like names), not IDs.
- Instances are addressed by key: `aws_iam_user.this["alice"]`, not by number.
- Typo: `set(strings)` is invalid. The keyword is `string`.
- Do not use `count` and `for_each` on the same resource. `count.index` does not exist inside a `for_each` block.
- If your source is a **list of objects**, turn it into a map with a `for` expression first (section 8): `{ for u in var.users : u.name => u }`.

---

## 8. `for` expressions (extra context, exam-relevant)

> The course notes mention `for_each` in depth but never demo the `for` *expression*. HashiCorp's exam objectives do list "for expressions" under expressions, so this section is added as extra context. Everything here can be tried in `terraform console`.

A **`for` expression** builds a new collection by transforming another one, much like a list comprehension in Python. Do not confuse the three similar-looking things:

| Name | Where it appears | Purpose |
|---|---|---|
| `for_each` | an **argument** of a resource/module/data block | create many instances |
| `for` expression | `[for ...]` or `{for ...}` inside any argument | transform a collection into another |
| `dynamic` block | inside a resource | generate repeated nested blocks |

### 8.1 Output a list: `[for ...]`

```text
[for <item> in <collection> : <result>]
```

```hcl
variable "names" {
  default = ["alice", "bob", "carol"]
}

output "upper_names" {
  value = [for n in var.names : upper(n)]
}
```

```text
upper_names = [
  "ALICE",
  "BOB",
  "CAROL",
]
```

### 8.2 Output a map: `{for ...}`

Curly braces build a map or object. Use `=>` between key and value:

```hcl
output "name_lengths" {
  value = { for n in var.names : n => length(n) }
}
```

```text
name_lengths = {
  "alice" = 5
  "bob"   = 3
  "carol" = 5
}
```

### 8.3 Iterating a map: key and value

With **two** loop variables on a map you get the key and the value (on a list you get the index and the value):

```hcl
variable "tags" {
  default = { env = "dev", team = "payments" }
}

output "tag_strings" {
  value = [for k, v in var.tags : "${k}=${v}"]
}
# ["env=dev", "team=payments"]
```

```hcl
output "indexed" {
  value = [for i, n in var.names : "${i}:${n}"]
}
# ["0:alice", "1:bob", "2:carol"]
```

### 8.4 Filtering with `if`

```hcl
output "short_names" {
  value = [for n in var.names : n if length(n) <= 3]
}
# ["bob"]
```

### 8.5 A very common combination: `for` + `for_each`

Turn a list of objects into a map keyed by something stable, then loop over it:

```hcl
variable "users" {
  default = [
    { name = "alice", role = "admin" },
    { name = "bob",   role = "dev" },
  ]
}

resource "aws_iam_user" "this" {
  for_each = { for u in var.users : u.name => u }
  name     = each.value.name
  tags     = { Role = each.value.role }
}
```

Instances are `aws_iam_user.this["alice"]` and `aws_iam_user.this["bob"]`.

Also common: `for_each = toset([for u in var.users : u.name])`.

### 8.6 `for` versus splat

`aws_iam_user.lb[*].arn` (splat) is a shorthand for `[for u in aws_iam_user.lb : u.arn]`. Splat is only for the simple "one attribute from every instance" case. Use `for` as soon as you need filtering, a map result, or a transformation. Resources created with **`for_each`** are a *map*, so splat does not apply directly. Use `values(aws_iam_user.this)[*].arn` or `[for u in aws_iam_user.this : u.arn]`.

---

## 9. Splat expressions

A **splat expression** gets a **list of an attribute from all instances** of a resource that was created with `count`.

### 9.1 The problem

`aws_iam_user.lb` created with `count = 3` makes three IAM users. To output the `arn` of **one** of them you use an index (`[0]`, `[1]`, `[2]`). To output the ARNs of **all** of them, even if there were 100, use the splat `[*]`.

### 9.2 Code

```hcl
provider "aws" {
  region = "us-west-2"
}

resource "aws_iam_user" "lb" {
  name  = "iamuser.${count.index}"
  count = 3
  path  = "/system/"
}

output "arns" {
  value = aws_iam_user.lb[*].arn
}
```

- `count = 3` creates three `aws_iam_user.lb` instances with indexes 0, 1, 2. (The transcript misspeaks that the index "starts with one". It starts at **0**, so 3 means 0, 1, 2.)
- `name = "iamuser.${count.index}"` gives users `iamuser.0`, `iamuser.1`, `iamuser.2`.
- `output "arns"` uses `aws_iam_user.lb[*].arn`: the splat collects `arn` from each instance into a list.

The `aws_iam_user` documentation lists three attributes: `arn`, `name`, `unique_id`. The demo uses `arn`.

### 9.3 Walkthrough

**Step 1.** Specific instance first:

```hcl
output "arns" {
  value = aws_iam_user.lb[0].arn
}
```

`terraform plan` shows three users to be created (count index 0, 1, 2). `terraform apply` then `yes`. The output has only the ARN of the first user (`iamuser.0`).

**Step 2.** Splat:

```hcl
output "arns" {
  value = aws_iam_user.lb[*].arn
}
```

`terraform apply` again. The output now lists the ARNs of **all** the created users:

```text
arns = [
  "arn:aws:iam::<account-id>:user/system/iamuser.0",
  "arn:aws:iam::<account-id>:user/system/iamuser.1",
  "arn:aws:iam::<account-id>:user/system/iamuser.2",
]
```

| Expression | Result |
|---|---|
| `aws_iam_user.lb[0].arn` | a single string, the ARN of instance 0 |
| `aws_iam_user.lb[*].arn` | a list of strings, one ARN per instance |

You can use a splat anywhere a list is expected, for example inside `zipmap(...)` (section 6.9), `join(",", ...)`, or another resource's list argument.

> **Extra context:** an older spelling, the "legacy" splat `aws_iam_user.lb.*.arn`, still works and appears in older code (such as `concat(aws_instance.blue.*.id, aws_instance.green.*.id)`). Prefer `[*]`. Also, a splat applied to a resource **without** `count` yields a one-element list (and to a `null` value, an empty list), which is why `one(aws_x.y[*].id)` is a handy way to read an optional (`count = 0 or 1`) resource.

> 🎯 **Exam focus:** Splat = `[*]`, giving a list of an attribute for every instance of a resource that uses `count`. `count.index` starts at 0. Without a splat you must pick an instance with `[index]`.

---

## 10. Dynamic blocks

### 10.1 Why dynamic blocks?

They keep code **DRY (Don't Repeat Yourself)**. Often you copy-paste the same *nested block* many times inside one resource. Example: a security group with `ingress` (inbound rule) blocks. With 40 inbound rules you would have 40 almost-identical `ingress` blocks where only the port changes.

A **dynamic block** generates repeated **nested blocks** inside a resource from a collection, instead of you writing them manually. Your code stays short and Terraform expands it into the full set of blocks.

### 10.2 Base code (without a dynamic block)

```hcl
resource "aws_security_group" "demo_sg" {
  name = "sample-sg"

  ingress {
    from_port   = 8200
    to_port     = 8200
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8201
    to_port     = 8201
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8300
    to_port     = 8300
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9200
    to_port     = 9200
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9500
    to_port     = 9500
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Only `from_port` and `to_port` (the port number) differ between blocks. `protocol` and `cidr_blocks` are identical. That repetition is the target.

First the instructor confirmed it works: `terraform plan` (a security group with five inbound rules), `terraform apply -auto-approve`, then the AWS console -> EC2 -> Security Groups -> `sample-sg` -> Inbound rules: 8200, 8201, 8300, 9200, 9500.

### 10.3 Dynamic block syntax (from the docs)

```hcl
  dynamic "setting" {
    for_each = var.settings
    content {
      namespace = setting.value["namespace"]
      name      = setting.value["name"]
      value     = setting.value["value"]
    }
  }
```

Documentation: `https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks`. The instructor stresses you do not have to memorise the format. Look it up in the docs.

| Part | Meaning |
|---|---|
| `dynamic "<NAME>"` | The label is the **name of the nested block to generate** (here `ingress`, in the docs example `setting`) |
| `for_each = <collection>` | The collection to iterate over. One nested block per element |
| `content { ... }` | The body of each generated block. The same arguments you would have written inside a static block |
| `<NAME>.value` | Inside `content`, an iterator object named after the block label. `.value` is the current element (`ingress.value`) |
| `<NAME>.key` | The key (for a map) or the index (for a list) of the current element |

### 10.4 Final solution

```hcl
variable "sg_ports" {
  type    = list(number)
  default = [8200, 8201, 8300, 9200, 9500]
}

resource "aws_security_group" "demo_sg" {
  name = "sample-sg"

  dynamic "ingress" {
    for_each = var.sg_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

What each piece does:

- `variable "sg_ports"` is a **list of numbers** holding every port to open. The dynamic block iterates over this list.
- `dynamic "ingress"` says: "generate `ingress` blocks".
- `for_each = var.sg_ports` is the variable name you change to match your own.
- Inside `content`, the hard-coded port numbers are replaced with `ingress.value`. Anything identical for every rule (`protocol`, `cidr_blocks`) stays fixed.

### 10.5 How Terraform expands it

```text
var.sg_ports = [8200, 8201, 8300, 9200, 9500]

iteration 1: ingress.value = 8200 -> ingress { from_port=8200 to_port=8200 protocol="tcp" cidr_blocks=["0.0.0.0/0"] }
iteration 2: ingress.value = 8201 -> ingress { from_port=8201 to_port=8201 ... }
iteration 3: ingress.value = 8300 -> ...
iteration 4: ingress.value = 9200 -> ...
iteration 5: ingress.value = 9500 -> ...
```

The result is equivalent to the original five static blocks, but your source is short and easy to extend: add a number to the list to add a rule.

### 10.6 Demo walkthrough

```bash
terraform destroy -auto-approve   # remove the earlier (static) security group
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve   # clean up when done
```

Steps: create the variable, remove the five static `ingress` blocks, add the `dynamic "ingress"` block, run apply, refresh the AWS console, and confirm the same five inbound rules exist.

### 10.7 A richer example: different ports and descriptions (extra context)

When the rules differ in more than one value, iterate over a **map of objects** and rename the iterator with `iterator`:

```hcl
variable "ingress_rules" {
  type = map(object({
    port        = number
    description = string
  }))
  default = {
    http  = { port = 80,  description = "HTTP" }
    https = { port = 443, description = "HTTPS" }
    ssh   = { port = 22,  description = "SSH" }
  }
}

resource "aws_security_group" "web" {
  name = "web-sg"

  dynamic "ingress" {
    for_each = var.ingress_rules
    iterator = rule                       # optional: rename ingress.value to rule.value
    content {
      description = rule.value.description
      from_port   = rule.value.port
      to_port     = rule.value.port
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

Here `rule.key` is `http`, `https` or `ssh`, and `rule.value.port` is the port number. (Opening SSH to `0.0.0.0/0` is fine for a short lab but never for a real server.)

### 10.8 When to use, and limits

Use dynamic blocks when, inside a **single** resource, you repeat **the same nested block type** (ingress rules, tags blocks, settings...). Do not overuse them: with only one or two blocks, static blocks are easier to read (extra context).

| Feature | Repeats | Result |
|---|---|---|
| `count` / `for_each` meta-argument | whole **resources** | many resource instances |
| `dynamic` block | **nested blocks inside one resource** | one resource, many nested blocks |

Limits (extra context):

- A dynamic block generates **nested blocks** only. You cannot use it to generate a top-level `resource`, `variable` or `output`.
- You cannot generate meta-argument blocks such as `lifecycle` or `provisioner` with `dynamic`.
- Unlike resource-level `for_each`, the `for_each` inside a `dynamic` block accepts **any collection**, including a plain **list** (`.key` is then the index). That is why the lesson can loop a `list(number)` directly.
- Dynamic blocks can be nested inside each other, but deep nesting becomes hard to read.

> 🎯 **Exam focus:** `dynamic` generates **nested blocks** inside a resource. It does not create multiple resources. The block label is the nested block's name. It uses `for_each` and `content`. Inside `content`, refer to the iterator as `<label>.value` (for example `ingress.value`). Purpose: DRY code, less copy-paste.

---
## 🧪 Labs

All labs assume you have working AWS credentials and the AWS provider configured as in [02 — Providers](02-providers.md), and that you are comfortable with `init`, `plan`, `apply` and `destroy` from [03 — Core workflow](03-core-workflow.md). Use a fresh empty folder for each lab.

Cost summary: Lab 1 needs no AWS at all. Labs 2, 3, 4 and 5 create only **IAM users and security groups, which are free**. Lab 6 creates EC2 instances (small cost, destroy straight away).

### Lab 1 — `terraform console` workout (no AWS needed)

Goal: get comfortable testing expressions and functions.

1. Create an empty folder and run `terraform console`.
2. Type each line and check the result against what you expect:

```text
> max(10, 30, 50)
50
> length("hello")
5
> length(["a", "b"])
2
> element(["a", "b", "c"], 1)
"b"
> element(["a", "b", "c"], 3)
"a"
> lookup({ a = "ay", b = "bee" }, "a", "what?")
"ay"
> lookup({ a = "ay", b = "bee" }, "c", "what?")
"what?"
> formatdate("DD MMM YYYY hh:mm ZZZ", "2024-06-17T17:51:34Z")
"17 Jun 2024 17:51 UTC"
> zipmap(["pineapple", "oranges", "strawberry"], ["yellow", "orange", "red"])
{
  "oranges" = "orange"
  "pineapple" = "yellow"
  "strawberry" = "red"
}
> toset(["a", "b", "a"])
toset([
  "a",
  "b",
])
> [for n in ["alice", "bob"] : upper(n)]
[
  "ALICE",
  "BOB",
]
> true ? "big" : "small"
"big"
> exit
```

3. Predict first, then run: `length({ a = 1, b = 2, c = 3 })`, `concat([1, 2], [3])`, `join("-", ["a", "b", "c"])`, `ceil(4.2)`, `merge({ a = 1 }, { b = 2 })`.
4. Make a file `random-file.txt` containing a sentence, open the console in the same folder, and run `file("random-file.txt")`.
5. Deliberately break something: `lookup({ a = 1 } "a")` (missing comma). Read the error message.

Cleanup: none. Nothing was created.

### Lab 2 — `count` and `count.index` with IAM users

Goal: see the "identical copies" problem and its fix, then the index-shift trap.

1. `main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_user" "this" {
  name  = "payments-user"
  count = 3
}
```

2. `terraform init`, then `terraform plan`. Plan says `3 to add`. Run `terraform apply -auto-approve`. Observe the result:

```text
aws_iam_user.this[0]: Creation complete after 1s [id=payments-user]
aws_iam_user.this[1]: Creating...
╷
│ Error: creating IAM User (payments-user): EntityAlreadyExists: User with name payments-user already exists.
```

Only one user exists. Plan could not predict this.

3. Fix it with `count.index`:

```hcl
resource "aws_iam_user" "this" {
  name  = "payments-user-${count.index}"
  count = 3
}
```

Apply. Three users `payments-user-0`, `-1`, `-2` appear (the old `payments-user` is renamed or replaced, so expect a mix of changes).

4. Switch to names from a list, sized to the list:

```hcl
variable "iam_names" {
  type    = list(string)
  default = ["user-01", "user-02", "user-03"]
}

resource "aws_iam_user" "this" {
  count = length(var.iam_names)
  name  = var.iam_names[count.index]
  path  = "/system/"
}
```

Apply. `terraform state list` shows `aws_iam_user.this[0]`, `[1]`, `[2]`.

5. **The trap.** Insert `"user-00"` at the **start** of `default`. Run `terraform plan` (do not apply). Notice that count goes from 3 to 4 and that the three existing addresses want new names. Count the changes and compare with the lecture (insert at the start: 1 to add, the rest changed).
6. Now **append** `"user-04"` to the end instead and plan. Only 1 to add. Position decides identity.

Cleanup: `terraform destroy -auto-approve`.

### Lab 3 — `for_each` with a set and with a map

Goal: see stable identity and the effect of adding/removing an element.

1. `main.tf`:

```hcl
provider "aws" {
  region = "us-east-1"
}

variable "user_names" {
  type    = set(string)
  default = ["alice", "bob", "john"]
}

resource "aws_iam_user" "this" {
  for_each = var.user_names
  name     = each.value
}

output "user_arns" {
  value = { for k, u in aws_iam_user.this : k => u.arn }
}
```

2. `terraform init`, `terraform plan`. Expect `Plan: 3 to add` and addresses `aws_iam_user.this["alice"]`, `["bob"]`, `["john"]`. Apply.
3. Add `"james"` to the default. `terraform plan` shows `1 to add`. Apply.
4. Remove `"bob"` from the default. `terraform plan` shows `1 to destroy`, `0 to add`. Only `aws_iam_user.this["bob"]` is affected. Apply.
5. Reorder the set (move `john` first). `terraform plan` -> `No changes`.
6. Break it on purpose: change the variable to `type = list(string)`. Plan fails with "the `for_each` argument must be a map, or set of strings". Fix by writing `for_each = toset(var.user_names)`.
7. **Map version.** Replace the code with:

```hcl
variable "users" {
  type = map(object({ path = string }))
  default = {
    alice = { path = "/team-a/" }
    bob   = { path = "/team-b/" }
  }
}

resource "aws_iam_user" "this" {
  for_each = var.users
  name     = each.key
  path     = each.value.path
}
```

Apply, then change Bob's path and plan. You should see an in-place or replace change for **only** `aws_iam_user.this["bob"]`.

Cleanup: `terraform destroy -auto-approve`.

### Lab 4 — dynamic block: a security group from a list of ports

Goal: replace repeated `ingress` blocks.

1. First write the **static** version with five `ingress` blocks (section 10.2). Apply it and confirm five inbound rules in EC2 -> Security Groups -> `sample-sg`.
2. `terraform destroy -auto-approve`.
3. Rewrite with the variable and the `dynamic "ingress"` block (section 10.4). `terraform plan` should show the same five rules.
4. Apply. Refresh the console and confirm the same inbound rules.
5. Add `9600` to `sg_ports` and plan. One rule is added to the *existing* security group. The group itself is not replaced.
6. Extension: rewrite using the map-of-objects version from 10.7 so each rule has a description.

Cleanup: `terraform destroy -auto-approve`.

### Lab 5 — Challenge 4: data sources, `length()` and interpolation

This is the course's fourth challenge. A client wants Terraform code that does three things:

1. **Create an AWS IAM user named `admin-user-<account number>`** where the account number is your AWS account ID. In account `12345` it creates `admin-user-12345`, in account `67890` it creates `admin-user-67890`. No hard-coding of the account ID.
2. **Show the names of all IAM users** in the account as an output.
3. **Show the total number of users** as a numeric output (with 200 users a list is not enough, the client wants "200").

Concepts tested: data sources (`data` blocks, see [chapter 05](05-resources-data-dependencies.md)), outputs, built-in functions (`length`), string interpolation, reading provider docs.

**Hints.** Data sources fetch information dynamically (account ID, user names) so the code needs no hard-coded values. Counting the users is not something a data source does. Turning a list into a number is the job of a function.

**Solution walkthrough** (requirements 2 and 3 first because they are "show" tasks, so they use `output`; requirement 1 *creates* something, so it uses a `resource`):

*Requirement 2, list all usernames*

1. In the console check IAM -> Users to see which users exist (create one if you have none).
2. In the AWS provider docs, each service has a *Resources* and a *Data Sources* section. Under IAM -> **Data Sources** there are `aws_iam_user` (one specific user) and **`aws_iam_users`** (plural, many users, optional `name_regex` filter). You need the plural.
3. Create `main.tf`, copy the example `data "aws_iam_users" "users" {}`.
4. Check the Attribute Reference. The exported attributes are `arns` and **`names`**. (The instructor first typed a wrong attribute name.)
5. Add an output and a provider block with region `us-east-1`. The first run failed because the reference forgot the `data.` prefix. **Data source references must start with `data.`.**
6. `terraform init`, then `terraform plan` shows the list.
7. `terraform apply -auto-approve`. Outputs are stored in the state file, which means other code could read them with the remote state data source (see [10](10-backends-locking-drift.md)). Values are committed to state only after **apply**, not after plan.

*Requirement 3, total number of users*

8. You need a function. Search "terraform functions". They are grouped by category (numeric, string, collection...). In **collection** functions use `length`, which "determines the length of a given list, map or string".
9. Add `total_users = length(data.aws_iam_users.users.names)`. `terraform plan` shows the number (6 in the video). Apply so it is saved to state.

*Requirement 1, IAM user with the account ID in its name*

10. Find a data source for the account ID: search "terraform data source account ID". It is **`aws_caller_identity`**: "get access to the effective Account ID, User ID, and ARN in which Terraform is authorized".
11. Add `data "aws_caller_identity" "current" {}`.
12. Copy the example from the **resource** page of `aws_iam_user` (this time the *resource* docs, not the data source docs). Keep only the name.
13. First try: `name = "admin-user-data.aws_caller_identity.current"`. The plan shows a literal string. Text is not evaluated. You need **interpolation**: `"admin-user-${...}"`.
14. Second try: `${data.aws_caller_identity.current}` gives an error. The value is an *object with four attributes*. Pick the attribute **`account_id`**.
15. `terraform plan` shows `admin-user-<12-digit account id>`. `terraform apply -auto-approve` creates it. Verify the last digits against your account ID in the console and check IAM -> Users.

**Final working code**

```hcl
provider "aws" {
  region = "us-east-1"
}

# Requirement 2 - list the names of all IAM users
data "aws_iam_users" "users" {}

output "user_names" {
  value = data.aws_iam_users.users.names
}

# Requirement 3 - numeric count of users
output "total_users" {
  value = length(data.aws_iam_users.users.names)
}

# Requirement 1 - IAM user named admin-user-<account id>
data "aws_caller_identity" "current" {}

resource "aws_iam_user" "admin" {
  name = "admin-user-${data.aws_caller_identity.current.account_id}"
}
```

(The local name of the IAM user resource is not stated in the transcript. It was copied from the docs example, so `admin` is used here.)

Explanation:

- `data "aws_iam_users" "users"` reads all IAM users. It exposes `names` and `arns`.
- `output "user_names"` prints the list of names.
- `length(...)` returns the number of elements, giving a numeric output.
- `data "aws_caller_identity" "current"` exposes `account_id`, `user_id` and `arn` of the credentials Terraform runs with.
- `"admin-user-${...account_id}"` is string interpolation, producing a different user name in each AWS account with no hard-coded account number.

> **Extra context:** the user-list data source is read when Terraform refreshes/plans, so after the `admin-user-...` user is created the *next* plan's `user_names` and `total_users` include it. The six users in the video were counted *before* the new admin user was created.

**Common mistakes**

- Forgetting the `data.` prefix when referencing a data source.
- Using the wrong attribute (`users` or `name` instead of `names`). Always check the "Attribute Reference" in the docs.
- Using the singular `aws_iam_user` data source (one user) when the plural `aws_iam_users` is needed.
- Not wrapping the expression in `${ }` inside a string, so the name comes out as literal text.
- Passing the whole `aws_caller_identity` object where a string (`account_id`) is needed.
- Reading docs for the wrong thing: the *data source* page is for fetching, the *resource* page is for creating.
- Expecting `plan` to save outputs to state. Only `apply` does.

**Take-aways:** data sources let your code adapt to its environment, outputs are how to "show" something, functions (`length`) transform what data sources return, and interpolation (`"text-${expr}"`) builds dynamic strings. Search technique: Google "terraform <thing you want>" to find the right data source quickly.

Cleanup: `terraform destroy -auto-approve` (removes the admin user only).

### Lab 6 — the functions challenge (EC2, small cost)

Goal: predict, then verify. This is the code from section 6.1.

1. In an empty folder create `main.tf` with the code from section 6.1. Make sure the AMI map has a **valid AMI for your region** (the lesson's IDs are old).
2. **Do not apply yet.** Run `terraform init` and `terraform console`. Evaluate each function: `lookup(var.ami, var.region)`, `length(var.tags)`, `element(var.tags, 1)`, `timestamp()`, and `formatdate("DD MMM YYYY hh:mm ZZZ", timestamp())`.
3. Write down on paper: how many instances, which AMI, which names, which `CreationDate` format. Use the table from 6.7.
4. `exit`, then `terraform validate`, then `terraform plan`. Is the plan consistent with your notes? Look at how `CreationDate` is shown.
5. `terraform apply -auto-approve`. In the EC2 console check the two instances (`firstec2`, `secondec2`) and their tags.
6. Run `terraform plan` again immediately. Notice that `CreationDate` wants to change every time (because of `timestamp()`).
7. **Experiment:** add `"thirdec2"` to `var.tags` and plan. How many instances now? Which address is new?

Cleanup: `terraform destroy -auto-approve`.

---

## 🎯 Exam focus (summary)

What the exam asks in this chapter, and the usual traps.

**Types**

- Know all of: `string`, `number`, `bool`, `list`, `set`, `map`, `object`, `tuple`, `null`, `any`.
- `type = number` rejects non-numeric text. `list(number)` rejects non-number elements. `map(number)` restricts the *values*.
- **List** = ordered, duplicates allowed, zero-indexed. **Set** = unordered, unique, no index, must declare element type (`set(string)`), duplicates removed silently.
- **Map** = same value type, free keys. **Object** = declared attributes, each its own type, extra attributes discarded.
- `[ ]` is a list, `{ }` is a map/object. Read the docs to see what an argument wants. "Incorrect attribute value type" means the wrong shape. A one-item list still needs `[ ]`.
- Access: `var.list[0]`, `var.map["key"]`. Index 0 is the first element.

**`count` and `for_each`**

- `count` takes a number, `count.index` starts at **0**, addresses are `type.name[0]`.
- `count` identifies instances by position, so changing list order or removing from the middle shifts everything. `for_each` identifies instances by key.
- `for_each` accepts a **map or a set of strings** (not a list). Use `each.key` / `each.value`. For a set both are the same.
- `count = cond ? N : 0` switches a resource on or off.
- You cannot combine `count` and `for_each` on one resource.

**Conditionals and functions**

- `condition ? true_val : false_val`, operators `==`, `!=`, `&&`, `||`, `!`.
- No user-defined functions. Test with `terraform console`. Know `lookup`, `length`, `element`, `file`, `max`, `timestamp`, `formatdate`, `zipmap`, `jsonencode`, `toset`, `concat`, `join`.
- Variable defaults cannot call functions, locals can ([chapter 06](06-variables-outputs-locals.md)).
- Be able to read a nested expression such as `formatdate("DD MMM YYYY", timestamp())` from the inside out.

**Splat, `for`, dynamic**

- Splat `[*]` returns a list of one attribute from all instances created with `count`.
- `for` expression: `[for x in list : expr]` for a list, `{for k, v in map : k => expr}` for a map, optional `if` filter.
- Dynamic block: `dynamic "name" { for_each = ...; content { ... name.value ... } }`. It generates nested blocks, not resources.

---

## Key takeaways

- A data type decides the syntax: string `"..."`, number `123`, list `[ ... ]`, map `{ k = v }`. Terraform converts safely between types where it can.
- Collection types hold one element type (`list(T)`, `set(T)`, `map(T)`). Structural types mix types (`object`, `tuple`).
- A set is unique and unordered, a list is ordered and may repeat. Reordering a list shows a plan diff, reordering a set does not.
- A map allows any keys with the same value type. An object fixes the keys and gives each its own type, and silently drops extras.
- `count = N` makes N copies of one block. `count.index` (from 0) makes each copy unique. Addresses are `res.name[0]`.
- `count` identifies by position. Inserting at the start shifts every index and causes widespread changes (the lecture's "1 to add, 4 to change", which then fails for IAM users).
- `for_each` identifies by key, takes a map or a set of strings, and exposes `each.key` / `each.value`. Adding or removing an element only touches that element.
- Conditional expression: `condition ? true_val : false_val`. With `count = cond ? n : 0` it can enable or disable a resource.
- Functions are built in only. Learn them from the docs and test them in `terraform console`. Evaluate nested calls from the inside out.
- `file()` keeps big content (like an IAM policy JSON) out of `.tf` files. `zipmap(names, arns)` pairs two lists into a map.
- `timestamp()` changes every run, so values derived from it show a diff on every plan.
- Splat `resource.name[*].attr` gives a list from every `count` instance. `for` expressions transform collections.
- Dynamic blocks generate repeated nested blocks (such as `ingress`) from a collection and keep code DRY.

---

## Quick commands / syntax cheat-sheet

```hcl
# --- types ---
variable "a" { type = string }
variable "b" { type = number }
variable "c" { type = bool }
variable "d" { type = list(string) }
variable "e" { type = set(string) }
variable "f" { type = map(string) }
variable "g" { type = object({ name = string, id = number }) }
variable "h" { type = tuple([string, number]) }

# --- accessing ---
var.d[0]                      # list element
var.f["key"]                  # map element
var.g.name                    # object attribute
tolist(var.e)[0]              # set must be converted to index it

# --- count ---
resource "aws_instance" "x" {
  count = 3
  tags  = { Name = "web-${count.index}" }          # 0,1,2
}
aws_instance.x[0].id                               # one
aws_instance.x[*].id                               # all (splat)

# --- for_each ---
resource "aws_iam_user" "u" {
  for_each = toset(var.names)                      # or a map
  name     = each.value
}
aws_iam_user.u["alice"].arn

# --- conditional ---
instance_type = var.env == "prod" ? "m5.large" : "t2.micro"
count         = var.create ? 1 : 0

# --- for expressions ---
[for n in var.names : upper(n)]
{ for n in var.names : n => length(n) }
[for n in var.names : n if length(n) > 3]

# --- dynamic block ---
dynamic "ingress" {
  for_each = var.ports
  content {
    from_port = ingress.value
    to_port   = ingress.value
    protocol  = "tcp"
  }
}
```

```bash
terraform console                   # test expressions and functions
terraform state list                # see aws_instance.x[0], aws_iam_user.u["alice"] ...
terraform apply -target='aws_iam_user.u["alice"]'   # quote the address
```

| Function | Purpose |
|---|---|
| `max(a,b,c)` / `min` | greatest / smallest number |
| `length(x)` | size of list, map or string |
| `element(list, i)` | item at index (wraps around) |
| `lookup(map, key, default)` | value for a key, default if missing |
| `zipmap(keys, values)` | build a map from two lists |
| `concat(l1, l2)` | join lists |
| `join(sep, list)` / `split(sep, str)` | list to string / string to list |
| `toset(list)` / `tolist(set)` | convert between list and set |
| `file(path)` | file contents as a string |
| `jsonencode(obj)` | HCL value to JSON string |
| `timestamp()` / `formatdate(spec, ts)` | current UTC time / format it |

---

## ❓ Quiz

**1.** A variable is declared with `type = number`. What happens when you run `terraform plan` and type `zeal` at the prompt?

**2.** What is wrong with this code, and how do you fix it?

```hcl
resource "aws_instance" "web" {
  ami                    = "ami-0c101f26f147fa7fd"
  instance_type          = "t3.micro"
  vpc_security_group_ids = "sg-06dc77ed59c310f03"
}
```

**3.** Given `variable "list" { default = ["m5.large", "m5.xlarge", "t2.medium"] }` and `variable "types" { default = { us-east-1 = "t2.micro", us-west-2 = "t2.nano" } }`, what are the values of `var.list[1]` and `var.types["us-west-2"]`?

**4.** You set `default = ["hello", "world", "hello"]` on a variable of type `set(string)`. What does Terraform do, and does it show an error?

**5.** You apply `aws_iam_user` with `name = "payments-user"` and `count = 3`. How many users are created and why?

**6.** What addresses do the three instances have when `count = 3` on `aws_instance.myec2`, and what is `count.index` for the last one?

**7.** `var.users = ["alice", "bob", "johncorner", "james", "mrA"]`, and the resource has `count = 3` and `name = var.users[count.index]`. Which names are used? What happens if you set `count = 7`?

**8.** What does this evaluate to when `var.environment = "production"` and `var.region = "ap-south-1"`?

```hcl
var.environment == "production" && var.region == "us-east-1" ? "m5.large" : "t2.micro"
```

**9.** What does `lookup({a="ay", b="bee"}, "c", "what?")` return? What does `element(["a","b","c"], 1)` return? What does `length("hello")` return?

**10.** What does `formatdate("DD MMM YYYY hh:mm ZZZ", "2024-06-17T17:51:34Z")` return, and why does a tag built with `timestamp()` show a diff on every `plan`?

**11.** You put `CreationDate = formatdate("DD-MM-YY", timestamp())` in the `default` of a variable. What happens? (Hint: see chapter 06.) And can you write your own function to replace it?

**12.** You have `variable "user_names" { type = list(string) }` and use `for_each = var.user_names`. What error do you get and what is the one-word-function fix?

**13.** With `for_each = var.user_names` over the set `["alice","bob","john"]`, what are `each.key` and `each.value` for `bob`, and what is the address of that instance?

**14.** A `count`-based list of IAM names gets a new first element. A `for_each` map gets a new key. Compare what `terraform plan` shows in each case.

**15.** What does `aws_iam_user.lb[*].arn` return when `aws_iam_user.lb` has `count = 3`? How does it differ from `aws_iam_user.lb[0].arn`?

**16.** In a `dynamic "ingress"` block with `for_each = var.sg_ports`, how do you refer to the current port in `content`? Does a dynamic block create more security groups?

**17.** What is the difference between a map and an object variable? What happens to an extra key given to an object?

**18.** How can you test the output of `zipmap(["a","b"], [1,2])` without creating any infrastructure?

### Answers

1. Terraform fails with `Invalid value for input variable ... a number is required`. A numeric value like `1234` would pass. (A numeric-looking string such as `"1234"` is automatically converted.)
2. `vpc_security_group_ids` needs a **list** but a string was given: `Incorrect attribute value type`. Fix: `vpc_security_group_ids = ["sg-06dc77ed59c310f03"]`. A single value still needs `[ ]`.
3. `var.list[1]` is `"m5.xlarge"` (index starts at 0). `var.types["us-west-2"]` is `"t2.nano"`.
4. Terraform silently removes the duplicate and keeps `hello` and `world`. **No error** is shown. A set is unique and unordered.
5. **One.** The first create succeeds. The other two fail because IAM user names must be unique ("already exists"). `plan` could not predict this because the uniqueness check happens in the AWS API during `apply`. The fix is `name = "payments-user-${count.index}"`.
6. `aws_instance.myec2[0]`, `[1]` and `[2]`. For the last one `count.index` is **2** (it starts at 0, never reaches 3).
7. `alice`, `bob`, `johncorner`. The remaining items are ignored. With `count = 7` the index goes beyond the list (it only has 5 items) and Terraform errors with an invalid index. Use `count = length(var.users)` to stay in step.
8. `"t2.micro"`. The `&&` needs both parts true, and the region part is false.
9. `"what?"` (the key `c` is missing, so the default is returned). `"b"`. `5`.
10. `"17 Jun 2024 17:51 UTC"`. `timestamp()` returns the current time, which is different on every run, so the argument changes each time and shows as a change (use `ignore_changes` or avoid `timestamp()` in resource arguments).
11. The plan fails with **`Function calls not allowed`**. Variable defaults must be constant. Put the expression in a **local** instead. You cannot write your own functions: Terraform only supports built-in functions.
12. `for_each` rejects a list: *the for_each argument must be a map, or set of strings*. Fix: `for_each = toset(var.user_names)`.
13. Both `each.key` and `each.value` are `"bob"` (a set has no separate keys). The address is `aws_iam_user.this["bob"]`.
14. `count`: inserting at the start shifts every index, so the plan shows 1 to add and many changes (and may fail for unique-name resources). `for_each`: only the new key gets an instance, everything else is untouched ("1 to add"). `for_each` keys are stable identities.
15. A **list** of the three ARNs, one per instance (the splat). `lb[0].arn` returns a single string, the ARN of instance 0.
16. `ingress.value` (the iterator is named after the block label). No: a dynamic block generates **repeated nested blocks inside one resource**, not extra resources.
17. In a **map** all values have the same type and keys are free. In an **object** the keys are declared in the schema and each attribute has its own type. An extra key given to an object is **discarded** silently (no error).
18. Run `terraform console` and type the expression. It prints `{ "a" = 1, "b" = 2 }` and changes nothing.

---

## Glossary

| Term | Meaning |
|---|---|
| **Data type** | The kind of value an argument or variable holds (string, number, bool, list, ...). |
| **Primitive type** | A single value: `string`, `number`, `bool`. |
| **Collection type** | Many values of the same type: `list`, `set`, `map`. |
| **Structural type** | Many values, mixed types: `object`, `tuple`. |
| **List** | Ordered, zero-indexed collection that allows duplicates. |
| **Set** | Unordered collection of unique values, no index. |
| **Map** | Key-value pairs, all values of one type. |
| **Object** | Key-value pairs with a declared schema, each attribute with its own type. |
| **Meta-argument** | An argument understood by Terraform itself and available on any resource (`count`, `for_each`, `depends_on`, `lifecycle`, `provider`). |
| **`count.index`** | The zero-based number of the current copy inside a `count` block. |
| **`each.key` / `each.value`** | The key and value of the current element inside a `for_each` block. |
| **Interpolation** | Embedding an expression in a string with `${ ... }`. |
| **Conditional expression** | `condition ? true_val : false_val`. |
| **Function** | A built-in routine that takes arguments and returns a value. Terraform has no user-defined functions. |
| **`terraform console`** | An interactive prompt for evaluating expressions without changing infrastructure. |
| **`for` expression** | `[for x in c : expr]` or `{for k, v in c : k => expr}`: build a new collection from another. |
| **Splat expression** | `resource.name[*].attr`: a list of an attribute from every instance of a `count` resource. |
| **Dynamic block** | A `dynamic "name"` construct that generates repeated nested blocks from a collection. |
| **DRY** | Don't Repeat Yourself. |
