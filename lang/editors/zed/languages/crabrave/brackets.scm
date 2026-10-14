("(" @open
  ")" @close)

("[" @open
  "]" @close)

("{" @open
  "}" @close)

(type_arguments
  "<" @open
  ">" @close)

(type_parameters
  "<" @open
  ">" @close)

(string
  "\"" @open
  "\"" @close)

(string
  "'" @open
  "'" @close)

(template_string
  "`" @open
  "`" @close)
