# crabrave for Neovim

Neovim 0.11+ support for `.crab` files:

- the `crabrave` filetype,
- the TypeScript 7.1 language server (`lsp/crabrave.lua`, enabled with
  `vim.lsp.enable`), which understands `.crab` files through the crabrave
  content mapper,
- tree-sitter highlighting, indentation and folding, using the grammar in
  [`lang/grammar`](../../grammar).

## Install

The plugin lives in `lang/editors/nvim` of the crabrave repository. With
[lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "oofdere/crabrave",
  lazy = false,
  build = function(plugin)
    vim.opt.runtimepath:append(plugin.dir .. "/lang/editors/nvim")
    require("crabrave").build_parser()
  end,
  config = function(plugin)
    vim.opt.runtimepath:append(plugin.dir .. "/lang/editors/nvim")
    vim.cmd.runtime({ "ftdetect/crabrave.lua", "plugin/crabrave.lua", bang = true })
  end,
}
```

Or clone the repository and add `lang/editors/nvim` to `'runtimepath'`
before plugins load, then run `:CrabraveBuildParser` once.

`:CrabraveBuildParser` compiles `lang/grammar/src/parser.c` with `cc` (or
`$CC`) into this plugin's `parser/` folder, where Neovim finds it.

The highlight, indent and fold queries extend the TypeScript ones from
[nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter)
(`; inherits: typescript`). Without nvim-treesitter you get highlighting for
the crabrave syntax only.

## Language server

The server is the project's own `node_modules/.bin/tsc --lsp --stdio`,
started in the nearest folder whose `node_modules` has TypeScript 7.1 or
later, with `runExternalCode` enabled so the content mapper can run. Set up
the project as in the [crabrave-lang README](../../README.md#setup).

To configure it, use `vim.lsp.config("crabrave", { ... })`. To keep the plugin
from enabling it, set `vim.g.crabrave_lsp = false` before it loads.

## Tests

```sh
NVIM_TREESITTER=/path/to/nvim-treesitter nvim --clean --headless -l test/run.lua
```

The test opens files from `lang/` and checks the filetype, the parser, the
highlight captures, and hover, completion and diagnostics from the language
server. `NVIM_TREESITTER` is optional and also checks the inherited
TypeScript highlights.
