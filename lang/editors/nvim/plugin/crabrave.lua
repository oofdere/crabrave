if vim.g.loaded_crabrave then
  return
end
vim.g.loaded_crabrave = true

vim.api.nvim_create_user_command("CrabraveBuildParser", function()
  vim.notify("crabrave: built " .. require("crabrave").build_parser())
end, { desc = "Compile the crabrave tree-sitter parser" })

vim.api.nvim_create_autocmd("FileType", {
  pattern = "crabrave",
  group = vim.api.nvim_create_augroup("crabrave", {}),
  callback = function(args)
    -- Highlight with tree-sitter when the parser has been built.
    pcall(vim.treesitter.start, args.buf, "crabrave")
  end,
})

if vim.g.crabrave_lsp ~= false and vim.lsp.enable then
  vim.lsp.enable("crabrave")
end
