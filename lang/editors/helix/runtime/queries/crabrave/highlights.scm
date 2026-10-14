; Generated from ../../../../zed/languages/crabrave/highlights.scm by editors/sync-queries.mjs.

; Zed gives later patterns precedence, so this file goes from general to
; specific: TypeScript first, crabrave's additions last.

; Names
; -----

(identifier) @variable

[
  (property_identifier)
  (shorthand_property_identifier)
  (shorthand_property_identifier_pattern)
  (private_property_identifier)
] @variable.other.member

((identifier) @type
  (#match? @type "^[A-Z]"))

((identifier) @constant
  (#match? @constant "^_*[A-Z][A-Z0-9_]+$"))

(type_identifier) @type

(predefined_type) @type.builtin

[
  (this)
  (super)
] @variable.builtin

; Functions
; ---------

(function_declaration
  name: (identifier) @function)

(function_expression
  name: (identifier) @function)

(generator_function_declaration
  name: (identifier) @function)

(method_definition
  name: (property_identifier) @function.method)

(method_signature
  name: (property_identifier) @function.method)

(variable_declarator
  name: (identifier) @function
  value: [
    (function_expression)
    (arrow_function)
  ])

(call_expression
  function: (identifier) @function)

(call_expression
  function: (member_expression
    property: (property_identifier) @function.method))

(new_expression
  constructor: (identifier) @constructor)

(required_parameter
  pattern: (identifier) @variable.parameter)

(optional_parameter
  pattern: (identifier) @variable.parameter)

(arrow_function
  parameter: (identifier) @variable.parameter)

; Literals
; --------

[
  (true)
  (false)
] @constant.builtin.boolean

[
  (null)
  (undefined)
] @constant.builtin

(number) @constant.numeric

[
  (string)
  (template_string)
] @string

(escape_sequence) @constant.character.escape

(regex) @string.regexp

(comment) @comment

(template_substitution
  [
    "${"
    "}"
  ] @punctuation.special) @embedded

; Keywords and punctuation
; ------------------------

[
  "abstract"
  "as"
  "async"
  "await"
  "break"
  "case"
  "catch"
  "class"
  "const"
  "continue"
  "debugger"
  "declare"
  "default"
  "delete"
  "do"
  "else"
  "enum"
  "export"
  "extends"
  "finally"
  "for"
  "from"
  "function"
  "get"
  "if"
  "implements"
  "import"
  "in"
  "instanceof"
  "interface"
  "keyof"
  "let"
  "namespace"
  "new"
  "of"
  "override"
  "private"
  "protected"
  "public"
  "readonly"
  "return"
  "satisfies"
  "set"
  "static"
  "switch"
  "throw"
  "try"
  "type"
  "typeof"
  "var"
  "void"
  "while"
  "with"
  "yield"
] @keyword

[
  "-"
  "--"
  "-="
  "+"
  "++"
  "+="
  "*"
  "*="
  "**"
  "**="
  "/"
  "/="
  "%"
  "%="
  "<"
  "<="
  "<<"
  "<<="
  "="
  "=="
  "==="
  "!"
  "!="
  "!=="
  "=>"
  ">"
  ">="
  ">>"
  ">>="
  ">>>"
  ">>>="
  "~"
  "^"
  "&"
  "|"
  "^="
  "&="
  "|="
  "&&"
  "||"
  "??"
  "&&="
  "||="
  "??="
  "..."
  "?"
  "?."
] @operator

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ";"
  ","
  "."
  ":"
] @punctuation.delimiter

; crabrave
; --------

"match" @keyword.control.conditional

(match_guard
  "if" @keyword)

(enum_declaration
  name: (identifier) @type)

(enum_variant
  name: (identifier) @type.enum.variant)

(named_field
  name: (identifier) @variable.other.member)

; Shape.Circle(1)
(member_expression
  object: (identifier) @type
  property: (property_identifier) @type.enum.variant
  (#match? @type "^[A-Z]")
  (#match? @type.enum.variant "^[A-Z]"))

(variant_pattern
  name: (identifier) @type.enum.variant)

(variant_pattern_fields
  (identifier) @variable.parameter)

(wildcard_pattern) @variable.builtin

(match_arm
  "=>" @punctuation.delimiter)

(try_expression
  "?" @operator)
