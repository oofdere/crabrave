// Helix and Zed both give later patterns precedence and neither can reuse its
// own TypeScript queries for this grammar, so the Helix queries are generated
// from the Zed ones with Helix's capture names. Run after editing
// zed/languages/crabrave/*.scm; CI checks that the output is up to date.
import { readFileSync, writeFileSync } from "node:fs";

const zed = new URL("zed/languages/crabrave/", import.meta.url);
const helix = new URL("helix/runtime/queries/crabrave/", import.meta.url);

const captures = {
	boolean: "constant.builtin.boolean",
	comment: "comment",
	constant: "constant",
	"constant.builtin": "constant.builtin",
	constructor: "constructor",
	embedded: "embedded",
	function: "function",
	"function.method": "function.method",
	keyword: "keyword",
	number: "constant.numeric",
	operator: "operator",
	property: "variable.other.member",
	"punctuation.bracket": "punctuation.bracket",
	"punctuation.delimiter": "punctuation.delimiter",
	"punctuation.special": "punctuation.special",
	string: "string",
	"string.escape": "constant.character.escape",
	"string.regex": "string.regexp",
	type: "type",
	"type.builtin": "type.builtin",
	variable: "variable",
	"variable.parameter": "variable.parameter",
	"variable.special": "variable.builtin",
	variant: "type.enum.variant",
};

const header = (file) =>
	`; Generated from ../../../../zed/languages/crabrave/${file} by editors/sync-queries.mjs.\n\n`;

let highlights = readFileSync(new URL("highlights.scm", zed), "utf8");
highlights = highlights.replace(/@([\w.]+)/g, (match, name) => {
	if (!(name in captures)) throw new Error(`no Helix capture for @${name}`);
	return `@${captures[name]}`;
});
// Keywords Helix themes color differently.
highlights = highlights.replace(
	'"match" @keyword',
	'"match" @keyword.control.conditional',
);
writeFileSync(
	new URL("highlights.scm", helix),
	header("highlights.scm") + highlights,
);

writeFileSync(
	new URL("textobjects.scm", helix),
	`; Written for Helix by editors/sync-queries.mjs.\n\n[
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
`,
);

// Zed's \`(_ "{" "}" @end) @indent\` becomes Helix's @indent/@outdent.
writeFileSync(
	new URL("indents.scm", helix),
	`${header("indents.scm")}[
  (statement_block)
  (class_body)
  (object)
  (object_type)
  (object_pattern)
  (array)
  (array_pattern)
  (arguments)
  (formal_parameters)
  (switch_body)
  (enum_body)
  (variant_fields)
  (match_body)
] @indent

[
  "}"
  "]"
  ")"
] @outdent
`,
);
