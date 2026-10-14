; crabrave-specific highlights. These sit on top of the TypeScript and
; JavaScript queries (see tree-sitter.json), so only new syntax lives here.

"match" @keyword

(match_guard
  "if" @keyword)

(enum_declaration
  name: (identifier) @type)

(enum_variant
  name: (identifier) @constructor)

(named_field
  name: (identifier) @property)

(variant_pattern
  name: (identifier) @constructor)

(variant_pattern_fields
  (identifier) @variable.parameter)

(wildcard_pattern) @variable.builtin

(or_pattern
  "|" @operator)

(match_arm
  "=>" @punctuation.delimiter)

(try_expression
  "?" @operator)
