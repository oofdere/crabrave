(enum_declaration
  "enum" @context
  name: (_) @name) @item

(enum_variant
  name: (_) @name) @item

(function_declaration
  "async"? @context
  "function" @context
  name: (_) @name) @item

(class_declaration
  "class" @context
  name: (_) @name) @item

(method_definition
  name: (_) @name) @item

(interface_declaration
  "interface" @context
  name: (_) @name) @item

(type_alias_declaration
  "type" @context
  name: (_) @name) @item

(program
  (lexical_declaration
    [
      "let"
      "const"
    ] @context
    (variable_declarator
      name: (identifier) @name) @item))

(program
  (export_statement
    (lexical_declaration
      [
        "let"
        "const"
      ] @context
      (variable_declarator
        name: (identifier) @name) @item)))
