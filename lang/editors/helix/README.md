# crabrave for Helix

1. Add [`languages.toml`](languages.toml) to `~/.config/helix/languages.toml`
   (or a project's `.helix/languages.toml`).
2. Copy [`runtime/queries/crabrave`](runtime/queries/crabrave) to
   `~/.config/helix/runtime/queries/crabrave`.
3. Build the grammar: `hx --grammar fetch && hx --grammar build`.
4. Check with `hx --health crabrave`.

The language server is the project's own TypeScript 7.1, started with
`npx --no -- tsc --lsp --stdio` from the language server root and with
`runExternalCode` enabled so the crabrave content mapper can run. Set up the
project as in the [crabrave-lang README](../../README.md#setup).

Helix picks the outermost folder with a `tsconfig.json` or `package.json` as
the root. In a monorepo where TypeScript 7.1 is installed in a package rather
than at the top, tell Helix where the roots are in `.helix/config.toml`:

```toml
[editor]
workspace-lsp-roots = ["packages/app"]
```

The queries are generated from the Zed ones by
[`../sync-queries.mjs`](../sync-queries.mjs): Helix's own TypeScript queries
follow its bundled TypeScript grammar, which is older than the one crabrave
extends, so they cannot be inherited.

## Tests

```sh
HX=/path/to/hx HELIX_RUNTIME=/path/to/helix/runtime LOCAL_GRAMMAR=1 ./test.sh
```

[`test.sh`](test.sh) builds the grammar, checks `hx --health crabrave`, then
runs Helix in tmux on `examples/colors.crab` and waits for a hover from the
language server.
