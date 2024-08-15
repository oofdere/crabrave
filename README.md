# crabrave

near-zero-cost abstractions ported from Rust to TypeScript

features:

- very simple API that closely follows Rust's
- rust style enums with packed data
- `Option<T>` and `Result<T>` types
- `match()`, and `unwrap()`
- about as performant as doing the comparisons by hand
- [very lightweight](https://pkg-size.dev/@oofdere%2Fcrabrave), you won't notice it's even there in prod
- works in all environments (browser, node, bun, deno)
- (soon) helpers to wrap existing functions
- (soon) wrappers over built-in web APIs and external libraries (a very simple and incomplete fetch wrapper is already included)

Check `/examples` and `/test` for code examples.

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

## questions you might have

1. why is everything arrow functions?
   - smaller bundle size.
2. more fluent api? :pleading_face:
   - sorry, fluent APIs are not tree-shakable, and I can't add them until they are otherwise the bundle size will explode :( (ideally there would just be a macro system and then this whole thing becomes a zero-cost abstraction instead of an almost-zero-cost one)
3. but the bundle size is already so small! your competiton is an order of magnitude bigger!
   - I guess.
4. why are there errors all over the code?
   - because we're lying to typescript and it's not a very big fan of our dishonesty.
5. what is the performance impact?
   - not too bad probably since it's just one extra function call. if macros were a thing you could make it zero-cost, I'll try to experiment with that in the future probably with bun or vite.
6. ok but like, benchmark it.
   - there are too many factors to even consider doing this. (did you know that v8 uses four compilers? or that other engines exist?)
7. this is disgusting
   - that's not a question but yes it is

This project was created using `bun init` in bun v1.0.7. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
