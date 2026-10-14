-- The TypeScript 7.1 language server, which understands .crab files through
-- the crabrave content mapper in the project's tsconfig.json.

---@type vim.lsp.Config
return {
  cmd = function(dispatchers, config)
    return vim.lsp.rpc.start(
      { require("crabrave").tsc(config.root_dir), "--lsp", "--stdio" },
      dispatchers,
      { cwd = config.root_dir }
    )
  end,
  filetypes = { "crabrave" },
  root_dir = function(bufnr, on_dir)
    local project = require("crabrave").project(vim.api.nvim_buf_get_name(bufnr))
    if project then
      on_dir(project)
    else
      vim.notify_once(
        "crabrave: no TypeScript 7.1+ in node_modules; run `npm install -D typescript@next`",
        vim.log.levels.WARN
      )
    end
  end,
  -- Content mappers run code from node_modules, so TypeScript only loads them
  -- when asked to.
  init_options = { runExternalCode = true },
}
