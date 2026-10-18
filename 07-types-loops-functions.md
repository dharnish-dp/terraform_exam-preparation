# Lesson 07 — Complex Types, Loops (count/for_each/for/dynamic) and Functions

**Exam domain 4** · **Time:** 2.5 hours. This is the heaviest lesson. Take it slowly.

## Part A: Data types

### Primitive types

```hcl
"hello"   # string
42        # number
true      # bool
null      # absence of value
```

### Collection types (all elements the **same** type)

| Type | Ordered? | Duplicates? | Example |
|---|---|---|---|
| `list(string)` | Yes, indexed from 0 | Yes | `["a", "b", "a"]` |
| `set(string)` | **No** order | **No** | `toset(["a","b"])` |
| `map(string)` | Key/value | Keys unique | `{ env = "dev", team = "qa" }` |

Access:

```hcl
var.names[0]            # list element
var.tags["env"]         # map element
var.tags.env            # also works for maps/objects
```

⚠️ **Sets can't be indexed** with `[0]`. Convert with `tolist()` if you need to.

### Structural types (mixed element types)

```hcl
variable "server" {
  type = object({
    name  = string
    port  = number
    tags  = list(string)
  })
}

variable "pair" {
  type = tuple([string, number])   # ["x", 1]
}
```

- **object** = fixed named attributes, each with its own type
- **tuple** = fixed-length list with a type per position

### Type conversion

Terraform converts automatically where it's safe (the string `"5"` → number `5`). Explicit functions: `tostring()`, `tonumber()`, `tobool()`, `tolist()`, `toset()`, `tomap()`.

## Part B: `count`

Creates **N copies** of a resource.

```hcl
resource "local_file" "f" {
  count    = 3
  filename = "${path.module}/file-${count.index}.txt"
  content  = "I am file ${count.index}"
}
```

- `count.index` = 0, 1, 2...
- Addresses: `local_file.f[0]`, `local_file.f[1]`...
- Reference all: `local_file.f[*].filename` (the **splat** expression) or one `local_file.f[1].filename`
- Conditional resource: `count = var.create ? 1 : 0` (creates 0 or 1)

### ⚠️ Problem with `count`

Resources are tracked by **index**. If you have `["a","b","c"]` and remove `"a"`, then `b` becomes index 0 and `c` index 1, so Terraform thinks resources changed and may **destroy and recreate** them. Not good for lists whose items change.

## Part C: `for_each`

Creates **one instance per item** of a **map or set of strings**. Tracked by **key**, so it's stable.

```hcl
variable "users" {
  type    = set(string)
  default = ["alice", "bob"]
}

resource "local_file" "u" {
  for_each = var.users
  filename = "${path.module}/${each.key}.txt"
  content  = "hello ${each.value}"
}
```

- `each.key` and `each.value` (for a **set**, both are the same string)
- With a **map**: `each.key` = map key, `each.value` = its value

```hcl
for_each = {
  web = "t3.micro"
  db  = "t3.large"
}
# each.key = "web", each.value = "t3.micro"
```

- Addresses: `local_file.u["alice"]`
- Reference all: `values(local_file.u)[*].filename` or `local_file.u["alice"].filename`
- Removing `"alice"` only destroys alice's. Others are untouched.
- **Keys must be known at plan time** (can't depend on values only known after apply).
- Pass a **list** with `toset(var.list)`.

### count vs for_each (exam!)

| | `count` | `for_each` |
|---|---|---|
| Input | number | map or set of strings |
| Identity | index (0,1,2) | key |
| Safe when items removed from the middle? | ❌ no | ✅ yes |
| Reference to the current item | `count.index` | `each.key`, `each.value` |
| **Use both on the same resource?** | **No. They're mutually exclusive.** | |

Rule of thumb: use `for_each` for distinct items, `count` for N identical copies or on/off toggles.

## Part D: `for` expressions

Transform a collection into another collection (like list comprehensions in Python, which you know).

```hcl
locals {
  names = ["alice", "bob"]

  upper     = [for n in local.names : upper(n)]                    # list → list
  name_map  = { for n in local.names : n => length(n) }            # list → map
  long_only = [for n in local.names : n if length(n) > 3]          # filter
}
```

- `[ ... ]` produces a **list/tuple**
- `{ ... }` produces a **map/object** with `key => value`

Splat shortcut: `aws_instance.web[*].id` ≈ `[for i in aws_instance.web : i.id]`

## Part E: `dynamic` blocks

Some resources have **nested blocks** that repeat (e.g. security group `ingress` rules). You can't use `count` on a nested block, so use `dynamic` to generate them.

```hcl
variable "ports" {
  default = [80, 443]
}

resource "aws_security_group" "web" {
  name = "web"

  dynamic "ingress" {
    for_each = var.ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```

- The label (`"ingress"`) is the **nested block type** to generate
- `for_each` = collection to iterate
- Inside `content { }`, use `<label>.value` and `<label>.key` (here `ingress.value`)
- Don't overuse. Hard-coded blocks are more readable if you only have 1 or 2.

## Part F: Conditional expression

```hcl
instance_type = var.env == "prod" ? "t3.large" : "t3.micro"
```

`condition ? value_if_true : value_if_false`

## Part G: Built-in functions

Terraform has **built-in functions only** (you can't define your own). Test them in `terraform console`.

### String

| Function | Example → Result |
|---|---|
| `upper("a")` / `lower("A")` | `"A"` / `"a"` |
| `join("-", ["a","b"])` | `"a-b"` |
| `split(",", "a,b")` | `["a","b"]` |
| `format("web-%02d", 3)` | `"web-03"` |
| `replace("a-b","-","_")` | `"a_b"` |
| `trimspace(" x ")` | `"x"` |
| `substr("hello",0,2)` | `"he"` |

### Collection

| Function | Purpose |
|---|---|
| `length(x)` | Count of elements |
| `element(list, i)` | Element (wraps around) |
| `concat(l1, l2)` | Join lists |
| `merge(m1, m2)` | Join maps (later keys win) |
| `lookup(map, key, default)` | Get with fallback |
| `keys(map)` / `values(map)` | Lists of keys / values |
| `contains(list, x)` | true/false |
| `distinct(list)` | Remove duplicates |
| `flatten(list)` | Flatten nested lists |
| `toset()`, `tolist()`, `tomap()` | Convert |
| `slice(list, start, end)` | Sub-list |
| `sort(list)`, `reverse(list)` | Order |
| `zipmap(keys, values)` | Build a map |

### Numeric

`min()`, `max()`, `ceil()`, `floor()`, `abs()`

### File / encoding

| Function | Purpose |
|---|---|
| `file("path")` | Read a file's content as a string |
| `templatefile("t.tpl", { x = 1 })` | Render a template with variables |
| `jsonencode(obj)` / `jsondecode(str)` | Convert to/from JSON |
| `yamlencode()` / `yamldecode()` | Same for YAML |
| `base64encode()` / `base64decode()` | Base64 |

### Network

`cidrsubnet("10.0.0.0/16", 8, 1)` → `"10.0.1.0/24"` (carve subnets from a range)

### Type/other

`try(expr, fallback)`, `can(expr)`, `coalesce(a, b)`, `timestamp()`, `uuid()`

⚠️ In the exam you don't need to memorize every function, but you **must** be able to read `lookup`, `merge`, `join`, `length`, `file`, `templatefile`, `cidrsubnet`, `toset`, `concat`, and say what they return.

### Using `terraform console`

```bash
terraform console
> upper("hello")
"HELLO"
> merge({a=1},{b=2})
{ "a" = 1, "b" = 2 }
> cidrsubnet("10.0.0.0/16", 8, 2)
"10.0.2.0/24"
```

Exit with `exit` or Ctrl+D.

## 🧪 Lab 7 (no cloud)

```hcl
terraform {
  required_providers {
    local = { source = "hashicorp/local" }
  }
}

variable "users" {
  type    = set(string)
  default = ["alice", "bob", "carol"]
}

variable "sizes" {
  type = map(string)
  default = {
    web = "small"
    db  = "large"
  }
}

# for_each over a set
resource "local_file" "user" {
  for_each = var.users
  filename = "${path.module}/user-${each.key}.txt"
  content  = "Hello ${upper(each.value)}"
}

# for_each over a map
resource "local_file" "size" {
  for_each = var.sizes
  filename = "${path.module}/${each.key}.txt"
  content  = "size=${each.value}"
}

# count
resource "local_file" "num" {
  count    = 2
  filename = "${path.module}/num-${count.index}.txt"
  content  = "number ${count.index}"
}

locals {
  upper_users = [for u in var.users : upper(u)]
  lengths     = { for u in var.users : u => length(u) }
}

output "upper_users" { value = local.upper_users }
output "lengths"     { value = local.lengths }
output "num_files"   { value = local_file.num[*].filename }
```

Do:

1. `terraform apply`. Look at addresses with `terraform state list` (`["alice"]` vs `[0]`).
2. Remove `"alice"` from the set and plan: only alice is destroyed.
3. Convert `local_file.num` to a list-based setup, remove the first item, plan, and observe how index-based tracking causes churn.
4. Open `terraform console` and try `lookup(var.sizes, "web", "none")`, `lookup(var.sizes, "x", "none")`, `merge(var.sizes, {cache="tiny"})`, `cidrsubnet("10.0.0.0/16", 8, 3)`, `file("main.tf")`.
5. `terraform destroy`.

## 🎯 Exam focus

- Types: list vs set vs map vs object vs tuple.
- `count` vs `for_each` differences and when each breaks.
- `each.key`/`each.value`, `count.index`, splat `[*]`.
- `for` expression syntax (`[]` list vs `{}` map).
- `dynamic` block structure.
- Conditional expression syntax.
- Reading common functions.
- Terraform has no user-defined functions.

## ❓ Quiz

1. Which can be indexed with `[0]`: list or set?
2. You remove the middle item of a `count` list. What risk exists?
3. What types may `for_each` iterate?
4. Write the splat form of "all ids of `aws_instance.web`" (a `count` resource).
5. What does `lookup({a=1}, "b", 9)` return?
6. Which block generates repeating nested blocks?
7. Can `count` and `for_each` be used on the same resource?

<details><summary>Answers</summary>

1. List.
2. Later items shift index and may be destroyed/recreated.
3. A map or a set of strings.
4. `aws_instance.web[*].id`
5. `9`
6. `dynamic`.
7. No.
</details>
