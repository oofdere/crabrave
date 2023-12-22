# crabrave

near-zero-cost abstractions ported from Rust to TypeScript

features:

- very simple API that closely follows Rust's
- rust style enums with packed data
- `Option<T>` and `Result<T>` types
- `match()`, `matchPartial()`, and `unwrap()`
- about as performant as doing the comparisons by hand
- [very lightweight](https://pkg-size.dev/@oofdere%2Fcrabrave), you won't notice it's even there in prod
- works in all environments (browser, node, bun, deno)
- (soon) helpers to wrap existing functions
- (soon) wrappers over built-in web APIs and external libraries (a very simple and incomplete fetch wrapper is already included)

Check `/test` for code examples.

To install development dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To test:

```bash
bun test
```

This project was created using `bun init` in bun v1.0.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
