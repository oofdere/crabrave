# crabrave for Zed

Zed support for `.crab` files: the crabrave tree-sitter grammar with
highlighting, brackets, indentation and outline queries, and the project's
TypeScript 7.1 language server, which understands `.crab` files through the
crabrave content mapper.

## Install

In Zed, run **zed: install dev extension** and pick this folder
(`lang/editors/zed`). Zed builds the extension with Rust (installed through
`rustup`) and the grammar from the commit pinned in `extension.toml`.

## Language server

The extension starts `node_modules/.bin/tsc --lsp --stdio` from the worktree
root, if that `node_modules` has TypeScript 7.1 or later, with
`runExternalCode` enabled so the content mapper can run. Set up the project as
in the [crabrave-lang README](../../README.md#setup).

If TypeScript 7.1 is somewhere else, for example in a package of a monorepo,
point the extension at it in Zed's settings:

```jsonc
{
	"lsp": {
		"crabrave": {
			"binary": {
				"path": "/path/to/project/node_modules/.bin/tsc",
				"arguments": ["--lsp", "--stdio"]
			}
		}
	}
}
```

`lsp.crabrave.initialization_options` is merged into the options sent to the
server.

## Queries

The queries are written for this grammar rather than borrowed from Zed's
TypeScript support, and go from general to specific because Zed gives later
patterns precedence. The Helix queries are generated from them by
[`../sync-queries.mjs`](../sync-queries.mjs); run it after editing
`languages/crabrave/highlights.scm`.

## Checks

```sh
cargo build --release --target wasm32-wasip2   # what Zed builds
```

The queries are compiled against the grammar by the crabrave-lang tests (see
[`../README.md`](../README.md)).
