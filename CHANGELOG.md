# @oofdere/crabrave

## 1.0.0

### Major Changes

- 1f528cc: major internal rework

  #### whar?
  we are now lying to tsc to make the thing work well, unfortunately this is a breaking change. but ONLY in your types; logic will work the same as it already did.

  #### whyyyyyy?

  because typescript REALLY hated what we were doing before so now we hide that from it so it hates it less

  #### haEh to upd8 code????

  to update your code just replace all instances of `Enum<E>` with `E`. that's right, just the object is all you need. that's right, no more `Enum<Result<Enum<Success>, Enum<Error>>>`, now it's just `Result<Success, Error>`.

  > these release notes are highly unserious because no one should have had this deployed anywhere at the time of these changes. but they are accurate.

### Minor Changes

- 4af17da: `match()` can now handle partial matches via `_` as is convention
- 109e57d: add the Enum<E>() factory function as a better DX alternative to pack<E>()
- 4af17da: `partialMatch()` is now removed 🦀🦀🦀

## 0.2.2

### Patch Changes

- 30d3de4: fix generics in `unwrap()` and `or()` functions

## 0.2.1

### Patch Changes

- leaner, meaner packaging

## 0.2.0

### Minor Changes

- kinda redid everything

### Patch Changes

- 36850a7: completely reimplemented Option<T> based on Enum; API now uses top-level match
- 2f77d84: drastically simplify enum implementation while keeping mostly the same api

## 0.1.1

### Patch Changes

- 57161a5: refactor enums to cover many more edge cases and fix a ton of bugs

## 0.1.0

### Minor Changes

- added an initial implementation of enums
