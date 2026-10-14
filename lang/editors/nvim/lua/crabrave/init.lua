local M = {}

local source = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":p")
--- This plugin's folder (lang/editors/nvim in the crabrave repository).
M.plugin = vim.fs.dirname(vim.fs.dirname(vim.fs.dirname(source)))
--- The tree-sitter grammar (lang/grammar).
M.grammar = vim.fs.normalize(M.plugin .. "/../../grammar")

local function typescript_version(dir)
  local manifest = dir .. "/node_modules/typescript/package.json"
  if not vim.uv.fs_stat(manifest) then
    return nil
  end
  local ok, package = pcall(vim.json.decode, table.concat(vim.fn.readfile(manifest), "\n"))
  if not ok then
    return nil
  end
  local major, minor = tostring(package.version):match("^(%d+)%.(%d+)")
  return tonumber(major), tonumber(minor)
end

--- The nearest folder at or above `path` with TypeScript 7.1+ in its node_modules.
---@param path string
---@return string?
function M.project(path)
  for dir in vim.fs.parents(vim.fs.normalize(path)) do
    local major, minor = typescript_version(dir)
    if major and (major > 7 or (major == 7 and minor >= 1)) then
      return dir
    end
  end
end

--- The project's `tsc` launcher.
---@param project string
---@return string
function M.tsc(project)
  local tsc = project .. "/node_modules/.bin/tsc"
  return vim.fn.has("win32") == 1 and tsc .. ".cmd" or tsc
end

--- Compile the grammar into parser/crabrave.so, which Neovim finds on 'runtimepath'.
---@return string path
function M.build_parser()
  local src = M.grammar .. "/src"
  local dir = M.plugin .. "/parser"
  local out = dir .. "/crabrave.so"
  vim.fn.mkdir(dir, "p")
  local cc = vim.env.CC or "cc"
  local result = vim
    .system({ cc, "-o", out, "-shared", "-fPIC", "-O2", "-I", src, src .. "/parser.c", src .. "/scanner.c" })
    :wait()
  if result.code ~= 0 then
    error("crabrave: building the parser failed:\n" .. result.stderr)
  end
  vim.treesitter.language.add("crabrave", { path = out })
  return out
end

return M
