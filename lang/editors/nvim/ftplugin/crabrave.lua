vim.bo.commentstring = "// %s"
vim.bo.comments = "s1:/*,mb:*,ex:*/,://"
vim.b.undo_ftplugin = (vim.b.undo_ftplugin or "") .. "\n setlocal commentstring< comments<"
