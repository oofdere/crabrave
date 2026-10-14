# crabrave for VS Code

Language support for `.crab` files: TypeScript with Rust-style `enum`,
`match` and `?` (see [crabrave-lang](https://github.com/oofdere/crabrave/tree/main/lang)).

- **Language server.** Runs your project's own TypeScript 7.1 (`tsc --lsp`),
  which understands `.crab` files through the crabrave content mapper:
  diagnostics, hover, completion, signature help, go to definition,
  references, rename, semantic highlighting, and so on.
- **Syntax highlighting.** The TypeScript grammar, plus `match`, enum
  variants, `_` and the `?` operator.

## Requirements

The project needs TypeScript 7.1 or later and the content mapper set up as
described in the [crabrave-lang README](https://github.com/oofdere/crabrave/tree/main/lang#setup):

```sh
npm install -D typescript@next
```

```jsonc
// tsconfig.json
{
	"contentMappers": [
		{ "package": "@oofdere/crabrave-lang", "extensions": [".crab"] }
	]
}
```

The content mapper runs under Node 22.18 or later, which has to be on your
`PATH`.

The extension finds TypeScript by looking for `node_modules/typescript` next
to each `.crab` file and in its parent folders, and starts one language server
per project it finds. Set `crabrave.typescript.path` to use a different copy.

Because the content mapper runs code from `node_modules`, the extension only
starts in [trusted workspaces](https://code.visualstudio.com/docs/editor/workspace-trust).

## Settings

| Setting | Default | |
|---|---|---|
| `crabrave.typescript.path` | | A TypeScript 7.1+ package folder to use instead of the one in `node_modules`. |
| `crabrave.typescriptFiles` | `false` | Also serve `.ts`/`.js` files, so they can import `.crab` modules. Turn off VS Code's built-in TypeScript features for them if you do. |
| `crabrave.trace.server` | `off` | Log language server traffic to the crabrave output channel. |

Commands: **crabrave: Restart Language Server** and **crabrave: Show
Language Server Output**.

## Development

```sh
bun install
bun run build                # dist/extension.js
xvfb-run -a bun run test     # downloads VS Code and runs test/suite inside it
bun run package              # crabrave.vsix
```
