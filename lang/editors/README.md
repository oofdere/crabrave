# Editor support

Every editor gets the same two pieces:

- **The language server** is the project's own TypeScript 7.1 (`tsc --lsp
  --stdio`), started with `runExternalCode` so it loads the crabrave content
  mapper from `tsconfig.json`. That gives `.crab` files TypeScript's
  diagnostics, hover, completion, signature help, go to definition,
  references, rename, semantic tokens and so on.
- **Syntax highlighting** from the crabrave tree-sitter grammar in
  [`../grammar`](../grammar), except in VS Code, which uses TextMate grammars.

| Editor | | Highlighting | Tested by |
|---|---|---|---|
| VS Code | [`vscode/`](vscode) | TypeScript TextMate grammar + crabrave injection, plus semantic tokens | `vscode/test/run.mjs` in a real VS Code (xvfb) |
| Neovim 0.11+ | [`nvim/`](nvim) | tree-sitter, extending nvim-treesitter's TypeScript queries | `nvim/test/run.lua` in headless Neovim |
| Helix | [`helix/`](helix) | tree-sitter, generated queries | `helix/test.sh` driving Helix in tmux |
| Zed | [`zed/`](zed) | tree-sitter, own queries | `cargo build` for `wasm32-wasip2`; queries compiled against the grammar |

The tests open files from this package and check, among other things, that a
hover on a match binding shows its type. The project needs TypeScript 7.1 and
the content mapper set up as in the [crabrave-lang README](../README.md#setup).

## Notes for other clients

TypeScript 7.1 registers its features for `*.crab` files dynamically once it
has loaded a project that maps them. A client that also selects `.crab` files
itself (as the VS Code extension does, to get the first file synced) has to
ignore those registrations or it shows every result twice.

`npx` reads flags after the command name as its own, so run the server as
`npx --no -- tsc --lsp --stdio`.
