-- Headless test: nvim --clean --headless -l test/run.lua
--
-- Set NVIM_TREESITTER to an nvim-treesitter checkout to test highlighting
-- with the inherited TypeScript queries.
local plugin =
  vim.fs.normalize(vim.fs.dirname(vim.fs.dirname(vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":p"))))
local lang = vim.fs.normalize(plugin .. "/../..")

vim.opt.runtimepath:prepend(plugin)
local nvim_treesitter = vim.env.NVIM_TREESITTER
if nvim_treesitter then
  vim.opt.runtimepath:append(nvim_treesitter)
  vim.opt.runtimepath:append(nvim_treesitter .. "/runtime")
end
vim.cmd.runtime({ "ftdetect/crabrave.lua", bang = true })
vim.cmd.runtime({ "plugin/crabrave.lua", bang = true })
vim.cmd("filetype plugin on")

local failures = 0
local function test(name, body)
  local ok, err = pcall(body)
  if ok then
    print("  ✓ " .. name)
  else
    failures = failures + 1
    print("  ✗ " .. name .. "\n    " .. tostring(err):gsub("\n", "\n    "))
  end
end

local function open(file)
  vim.cmd.edit(lang .. "/" .. file)
  return vim.api.nvim_get_current_buf()
end

local function find(buf, needle, offset)
  for row, line in ipairs(vim.api.nvim_buf_get_lines(buf, 0, -1, false)) do
    local col = line:find(needle, 1, true)
    if col then
      return row - 1, col - 1 + (offset or 0)
    end
  end
  error(needle .. " not found")
end

local function client_for(buf)
  local client
  assert(
    vim.wait(60000, function()
      client = vim.lsp.get_clients({ bufnr = buf, name = "crabrave" })[1]
      return client ~= nil and client.initialized
    end, 100),
    "language server did not attach"
  )
  return client
end

local function request(buf, method, params)
  local client = client_for(buf)
  local result
  assert(
    vim.wait(60000, function()
      local response = client:request_sync(method, params, 30000, buf)
      result = response and response.result
      return result ~= nil and (type(result) ~= "table" or next(result) ~= nil)
    end, 250),
    method .. " returned nothing"
  )
  return result
end

local function position(buf, needle, offset)
  local row, col = find(buf, needle, offset)
  return { textDocument = vim.lsp.util.make_text_document_params(buf), position = { line = row, character = col } }
end

require("crabrave").build_parser()

test(".crab files get the crabrave filetype", function()
  local buf = open("examples/colors.crab")
  assert(vim.bo[buf].filetype == "crabrave", vim.bo[buf].filetype)
  assert(vim.bo[buf].commentstring == "// %s")
end)

test("tree-sitter parses crabrave", function()
  local buf = open("examples/colors.crab")
  local tree = vim.treesitter.get_parser(buf, "crabrave"):parse()[1]
  assert(not tree:root():has_error(), "parse errors")
  local row, col = find(buf, "match color")
  local node = vim.treesitter.get_node({ bufnr = buf, pos = { row, col + 7 } })
  while node and node:type() ~= "match_expression" do
    node = node:parent()
  end
  assert(node, "no match_expression around `match color`")
end)

test("highlight queries compile and capture crabrave syntax", function()
  local buf = open("examples/colors.crab")
  assert(vim.treesitter.query.get("crabrave", "highlights"), "no highlights query")
  assert(vim.treesitter.highlighter.active[buf], "tree-sitter highlighting is on")
  -- Headless Neovim never redraws, so parse explicitly.
  vim.treesitter.get_parser(buf):parse(true)
  local function captures(needle, offset)
    local row, col = find(buf, needle, offset)
    return vim.tbl_map(function(capture)
      return capture.capture
    end, vim.treesitter.get_captures_at_pos(buf, row, col))
  end
  assert(vim.tbl_contains(captures("match color"), "keyword.conditional"), "match is a keyword")
  assert(vim.tbl_contains(captures("Rgb(r, g, b)"), "constant"), "variants are constants")
  if nvim_treesitter then
    -- Inherited from nvim-treesitter's TypeScript queries.
    assert(vim.tbl_contains(captures("function toRGB"), "keyword.function"), "TypeScript keywords")
  end
  for _, kind in ipairs({ "locals", "injections", "indents", "folds" }) do
    vim.treesitter.query.get("crabrave", kind)
  end
end)

test("the language server attaches with the project's TypeScript", function()
  local buf = open("examples/colors.crab")
  local client = client_for(buf)
  assert(client.root_dir == lang, client.root_dir)
  assert(client.config.init_options.runExternalCode == true)
end)

test("hover shows the type of a match binding", function()
  local buf = open("examples/colors.crab")
  local hover = request(buf, "textDocument/hover", position(buf, "Red(x) =>", 4))
  local text = type(hover.contents) == "table" and (hover.contents.value or vim.inspect(hover.contents))
    or hover.contents
  assert(text:find("const x: number", 1, true), text)
end)

test("completion lists the variants", function()
  local buf = open("examples/colors.crab")
  local result = request(buf, "textDocument/completion", position(buf, "Color.Blue(128)", #"Color."))
  local labels = vim.tbl_map(function(item)
    return item.label
  end, result.items or result)
  for _, variant in ipairs({ "Red", "Green", "Blue", "Rgb" }) do
    assert(vim.tbl_contains(labels, variant), "missing " .. variant)
  end
end)

test("type errors are reported where they were made", function()
  local buf = open("test/fixtures/errors/types.crab")
  client_for(buf)
  local diagnostics
  assert(
    vim.wait(60000, function()
      diagnostics = vim.diagnostic.get(buf)
      return #diagnostics >= 7
    end, 250),
    "got " .. #(diagnostics or {}) .. " diagnostics"
  )
  vim.wait(2000)
  diagnostics = vim.diagnostic.get(buf)
  assert(#diagnostics == 7, "expected 7 diagnostics, got " .. #diagnostics)
  local row = find(buf, "return match s")
  local missing = vim.tbl_filter(function(d)
    return d.message:find("non-exhaustive match: missing Empty", 1, true)
  end, diagnostics)[1]
  assert(missing and missing.lnum == row, "missing arm reported on `match`")
end)

print(("\n%s"):format(failures == 0 and "all passed" or failures .. " failed"))
for _, client in ipairs(vim.lsp.get_clients()) do
  client:stop(true)
end
os.exit(failures == 0 and 0 or 1)
