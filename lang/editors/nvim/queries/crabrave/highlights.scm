; inherits: typescript

; Neovim applies later patterns over earlier ones, so these refine the
; TypeScript highlights inherited above.

"match" @keyword.conditional

(match_guard
  "if" @keyword.conditional)

(enum_declaration
  name: (identifier) @type)

(enum_variant
  name: (identifier) @constant)

(named_field
  name: (identifier) @variable.member)

(variant_pattern
  name: (identifier) @constant)

(variant_pattern_fields
  (identifier) @variable.parameter)

(wildcard_pattern) @character.special

(or_pattern
  "|" @operator)

(match_arm
  "=>" @punctuation.delimiter)

(try_expression
  "?" @operator)
