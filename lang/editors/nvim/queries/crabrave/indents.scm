; inherits: typescript

[
  (match_body)
  (enum_body)
  (variant_fields)
] @indent.begin

(match_body
  "}" @indent.branch @indent.end)

(enum_body
  "}" @indent.branch @indent.end)
