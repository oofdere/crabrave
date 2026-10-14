; Written for Helix by editors/sync-queries.mjs.

[
  (function_declaration
    body: (_) @function.inside)
  (function_expression
    body: (_) @function.inside)
  (generator_function_declaration
    body: (_) @function.inside)
  (arrow_function
    body: (_) @function.inside)
  (method_definition
    body: (_) @function.inside)
] @function.around

[
  (class_declaration
    body: (_) @class.inside)
  (enum_declaration
    body: (_) @class.inside)
  (interface_declaration
    body: (_) @class.inside)
] @class.around

(formal_parameters
  (_) @parameter.inside @parameter.around)

(arguments
  (_) @parameter.inside @parameter.around)

(variant_fields
  (_) @parameter.inside @parameter.around)

(match_arm
  body: (_) @entry.inside) @entry.around

(comment) @comment.inside

(comment)+ @comment.around
