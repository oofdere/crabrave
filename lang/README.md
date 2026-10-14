# crabrave-lang

crabrave, rebuilt as a language extension instead of a library: TypeScript
plus Rust-style `enum`, `match` and `?`, in `.crab` files.

- [tree-sitter](https://tree-sitter.github.io/) parses it. The grammar in
  [`grammar/`](grammar) extends tree-sitter-typescript, so everything that is
  TypeScript parses exactly as before.
- [TypeScript 7.1 content mappers](https://github.com/microsoft/TypeScript/pull/63936)
  type check it. `tsc` and the TypeScript language server ask
  [`src/mapper.ts`](src/mapper.ts) to turn each `.crab` file into TypeScript
  plus a source mapping, so errors, hovers and go-to-definition point back
  into the `.crab` file.
- A Vite/Vitest plugin and a Bun plugin run it, compiling `.crab` modules to
  JavaScript with source maps.

> [!WARNING]
> This is an experiment. Content mappers only exist in TypeScript 7.1
> nightlies (`typescript@next`) and the API may still change. This package
> pins `7.1.0-dev.20261014.1`.

## Why

The crabrave 1.x README says it best: _"ideally there would just be a macro
system and then this whole thing becomes a zero-cost abstraction instead of an
almost-zero-cost one."_ Content mappers are that macro system. The library
version of the colors example:

```ts
type Colors = { Red: number; Green: number; Blue: number };
const Colors = Enum<Colors>();
const blue = Colors("Blue", 128);

match(blue, {
	Red: (x) => [x, 0, 0],
	Green: (x) => [0, x, 0],
	Blue: (x) => [0, 0, x],
});
```

The language version ([`examples/colors.crab`](examples/colors.crab)):

```ts
enum Color {
	Red(number),
	Green(number),
	Blue(number),
	Rgb(r: number, g: number, b: number),
}

const blue = Color.Blue(128);

const rgb = match blue {
	Red(x) => [x, 0, 0],
	Green(x) => [0, x, 0],
	Blue(x) => [0, 0, x],
	Rgb(r, g, b) => [r, g, b],
};
```

Values keep the 1.x layout (`["Blue", 128]`), but there is no `match()`
function call, no callback per arm, and no `Array.prototype` patching: the
compiler writes the `if`s for you.

## The language

A `.crab` file is a TypeScript module with three additions.

### `enum`

```ts
enum Shape {
	Circle(radius: number),     // fields can be named...
	Rect(number, number),       // ...or not
	Empty,                      // unit variant
}

enum Tree<T> {                  // generic and recursive
	Leaf(T),
	Node(Tree<T>, Tree<T>),
}

Shape.Circle(1)                 // ["Circle", 1]
Shape.Empty                     // ["Empty"]
const { Leaf, Node } = Tree;    // Rust's `use Tree::*`
```

An enum is a type (a union of readonly tuples) and a value (its constructors):

```ts
type Shape =
	| readonly [tag: "Circle", radius: number]
	| readonly ["Rect", number, number]
	| readonly ["Empty"];
const Shape: { readonly Circle: (radius: number) => Shape; ... } =
	{ Circle: (radius) => ["Circle", radius], ..., Empty: ["Empty"] };
```

Constructors are only generic over the type parameters their fields use, so
`Result.Ok(1)` is a `Result<number, never>` and fits any `Result<number, E>`.

`enum` always means this in a `.crab` file; TypeScript's own enums are not
available.

### `match`

```ts
const describe = (shape: Shape) => match shape {
	Circle(r) if r > 10 => "big circle",          // guard
	Circle(_) => "circle",                        // wildcard field
	Rect(w, h) if w === h => `${w}x${w} square`,
	Rect(_, _) | Empty => {                       // or-pattern, block arm: the
		log("not a circle");                      // value is the last expression,
		"something else"                          // if it has no `;`
	}
};

match status {
	200 | 201 => "ok",                            // literal patterns
	_ => "error",
}
```

Fields bind to names, `_`, or destructuring patterns (`Move({ x, y })`).
Matches must be exhaustive. A missing arm is a type error on `match`:

```
shapes.crab(10,9): error TS2345: Argument of type 'readonly ["Empty"]' is not
assignable to parameter of type '"non-exhaustive match: missing Empty"'.
```

How a `match` compiles depends on where it is:

- As a statement, after `return`, or as an arrow function's body, it becomes an
  `if` chain. Arm bindings are `const`s, and `await`, `return`, `break` and
  `continue` inside arms do what they say. A guard that fails falls through to
  the next arm, and TypeScript's narrowing follows along:

  ```ts
  function area(shape: Shape): number {
  	return match shape {
  		Circle(r) => Math.PI * r * r,
  		Rect(w, h) if w === h => w ** 2,
  		Rect(w, h) => w * h,
  		Empty => 0,
  	};
  }
  ```

  compiles to

  ```ts
  function area(shape: Shape): number {
  	{ const __m0 = shape;
  		if (__m0[0] === "Circle") { const r = __m0[1]; return Math.PI * r * r; }
  		if (__m0[0] === "Rect") { const w = __m0[1]; const h = __m0[2]; if (w === h) { return w ** 2; } }
  		if (__m0[0] === "Rect") { const w = __m0[1]; const h = __m0[2]; return w * h; }
  		if (__m0[0] === "Empty") { return 0; }
  	 return __crab_unreachable<typeof __m0>(__m0); }
  }
  ```

- Anywhere else its value is used, so it becomes a conditional expression,
  with the subject hoisted into a `const` in front of the statement:

  ```ts
  const label = match shape { Circle(_) => "round", _ => "not round" };
  // becomes
  const __m2 = shape; const label = (__m2[0] === "Circle" ? ("round") : ("not round"));
  ```

  Arms that bind fields, and block arms, become immediately invoked arrow
  functions there. JavaScript engines inline these, but it is the one place
  the output is not literally what you would have written by hand. Inside
  such a block arm, `return` and `?` would only leave the arm, so they are
  errors.

### `?`

```ts
function add(a: string, b: string): Result<number, string> {
	return Ok(parse(a)? + parse(b)?);
}
```

`expr?` unwraps `Ok`/`Some`, or returns the `Err`/`None` from the enclosing
function. It is hoisted in front of its statement:

```ts
const n = toNumber(text)?;
// becomes
const __t1 = toNumber(text); if (__crab_residual(__t1)) return __t1; const n = __t1[1];
```

It applies to the awaited value (`await load()?`) and binds tighter than
binary operators (`a? + b?`). Hoisting must not change what runs or when, so
`?` is an error wherever that would happen, with the reason: on the right of
`&&`, `||` or `??`, inside a ternary branch or a loop condition, after an
optional chain, after something with side effects earlier in the same
statement, or outside a function:

```
error crabrave3: `?` cannot be used here because it would run before `sideEffect()`
```

`x?.y` is still optional chaining. Write `(x?).y` to unwrap and then read `y`.

### The prelude

[`src/prelude.crab`](src/prelude.crab) is written in crabrave and exports
`Option` (`Some`, `None`), `Result` (`Ok`, `Err`), `unwrap`, `unwrapOr`,
`map`, `from` and `attempt`:

```ts
import { None, type Option, Some, unwrapOr } from "@oofdere/crabrave-lang/prelude";
```

## Setup

### Type checking

List the mapper in `tsconfig.json`, then run TypeScript 7.1 with
`--runExternalCode` (content mappers run code from `node_modules`, so they
are opt-in):

```jsonc
{
	"compilerOptions": { "strict": true, "module": "preserve", "moduleResolution": "bundler" },
	"contentMappers": [
		{ "package": "@oofdere/crabrave-lang", "extensions": [".crab"] }
	]
}
```

```sh
tsc --noEmit --runExternalCode
```

Imports of `.crab` modules need the extension: `import { Shape } from "./shapes.crab"`.

### Editors

[`editors/`](editors) has extensions for VS Code, Neovim, Helix and Zed. They
all run the project's own TypeScript 7.1 language server (`tsc --lsp
--stdio`) with `initializationOptions: { runExternalCode: true }`, which gives
`.crab` files diagnostics, hover, completion, signature help, go to
definition, references, rename and semantic tokens. Each one is tested in the
real editor (see [`editors/README.md`](editors/README.md)).

| Editor | Install |
|---|---|
| VS Code | build `editors/vscode` with `bun run package` and install `crabrave.vsix` |
| Neovim 0.11+ | add `editors/nvim` to `'runtimepath'`, run `:CrabraveBuildParser` |
| Helix | merge `editors/helix/languages.toml` and copy its queries, then `hx --grammar build` |
| Zed | **zed: install dev extension** on `editors/zed` |

Highlighting comes from the tree-sitter grammar (VS Code uses a TextMate
injection on top of its TypeScript grammar instead). The grammar's own queries
in [`grammar/queries/highlights.scm`](grammar/queries/highlights.scm) only
cover the new syntax, on top of the TypeScript and JavaScript queries listed
in [`grammar/tree-sitter.json`](grammar/tree-sitter.json).

### Running

Vite and Vitest:

```ts
// vite.config.ts
import crabrave from "@oofdere/crabrave-lang/vite";
export default { plugins: [crabrave()] };
```

Bun:

```toml
# bunfig.toml
preload = ["@oofdere/crabrave-lang/register"]
```

```sh
bun examples/percent.crab
```

To see what a file compiles to: `node src/cli.ts file.crab`.

The generated code keeps every line where it was, and the Vite plugin also
produces source maps, so stack traces point into the `.crab` file.

## How it works

```
.crab ──tree-sitter──▶ syntax tree ──src/transform.ts──▶ segments
                                                           │
            ┌──────────────────────────────────────────────┴───────────────┐
            ▼                                                              ▼
 src/mapping.ts: TypeScript + span mappings              src/vite.ts, src/bun.ts: TypeScript
 for tsc and the language server                          + source map ──▶ JavaScript
```

[`src/transform.ts`](src/transform.ts) copies TypeScript through untouched
and only rewrites `enum`, `match` and `?`. It produces segments: source ranges
copied verbatim, generated text, and "atoms" (generated text that stands for a
source range, so a type error in `__m0[0] === "Rectangle"` is reported on the
pattern `Rectangle`). The mapper hands these to TypeScript through
[`ts-content-mapper`](https://github.com/sxzz/ts-content-mapper).

Two details make the type errors land well:

- Enum field types are written once, in the tuple union, where they are
  mapped. The constructor signatures repeat them inside a region the mapper
  marks as ignored, so a typo in a field type is reported once.
- Exhaustiveness is checked by passing whatever the arms did not narrow away
  to `__crab_unreachable<typeof __m0>`, whose parameter type spells out the
  missing variants.

## Limitations

- Patterns are one level deep: no nested variants (`Some(Ok(x))`), no
  literals inside fields (`Some(0)`), and variant names are bare
  (`Circle(r)`, not `Shape.Circle(r)`).
- `x?` at the end of a line counts as the try operator when the next line
  starts with a statement keyword (`const`, `return`, ...); otherwise the `?`
  starts a ternary, as in TypeScript.
- `tsc` only emits declarations for mapped files, so JavaScript has to come
  from the Vite or Bun plugin.
- The package runs from its TypeScript sources (`node src/mapper.ts`, using
  Node's type stripping), which Node refuses to do under `node_modules`. It is
  `private` until there is a build step.

## Development

```sh
bun install
bun run build:grammar   # tree-sitter generate + build the wasm the compiler loads
bun run test:grammar    # tree-sitter corpus tests
bun run typecheck       # tsc over the toolchain, tests and examples
bun run test            # compiler, runtime, tsc and language server tests
```

```
grammar/        tree-sitter grammar (extends tree-sitter-typescript), queries, corpus
editors/        VS Code, Neovim, Helix and Zed support
src/            compiler, content mapper, Vite and Bun plugins, prelude
examples/       the crabrave 1.x examples, ported
test/           Vitest suites and fixtures
```
