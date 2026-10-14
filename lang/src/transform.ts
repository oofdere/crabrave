/**
 * Lowers a crabrave syntax tree to plain TypeScript.
 *
 * The output is a list of segments rather than a string so the same lowering
 * can feed both the content mapper (which needs to know where every piece of
 * generated code came from) and the runtime plugins (which only need text).
 *
 * Everything that is ordinary TypeScript is copied verbatim. Only three
 * constructs are rewritten:
 *
 * - `enum` declarations become a union of readonly tuples plus an object of
 *   constructor functions: `["Circle", 1]` is a `Shape`.
 * - `match` becomes an if-chain when it is used as a statement or returned,
 *   and a conditional expression when its value is used. Exhaustiveness is
 *   checked by passing whatever is left to a function that accepts `never`.
 * - `expr?` is hoisted in front of its statement as an early return.
 */
import type { Node, Tree } from "web-tree-sitter";

export type Segment =
	| { kind: "verbatim"; start: number; end: number }
	| { kind: "text"; text: string }
	| { kind: "atom"; text: string; start: number; end: number }
	/** Diagnostics between an `ignore-start` and `ignore-end` are dropped. */
	| { kind: "ignore-start"; at: number }
	| { kind: "ignore-end" };

export interface CrabDiagnostic {
	message: string;
	start: number;
	length: number;
	code: number;
}

export interface TransformResult {
	code: string;
	segments: Segment[];
	diagnostics: CrabDiagnostic[];
}

export const DiagnosticCode = {
	Syntax: 1,
	TryOutsideFunction: 2,
	TryNotHoistable: 3,
	TryInMatchValue: 4,
	ReturnInMatchValue: 5,
	OrPatternBindings: 6,
	UnreachableArm: 7,
} as const;

class Out {
	readonly segments: Segment[] = [];

	verbatim(start: number, end: number): this {
		if (end > start) this.segments.push({ kind: "verbatim", start, end });
		return this;
	}

	text(text: string): this {
		if (text) this.segments.push({ kind: "text", text });
		return this;
	}

	/** Generated text that stands for the source range as a whole. */
	atom(text: string, start: number, end: number): this {
		this.segments.push({ kind: "atom", text, start, end });
		return this;
	}

	append(other: Out): this {
		this.segments.push(...other.segments);
		return this;
	}

	ignore(at: number, fill: (out: this) => void): this {
		this.segments.push({ kind: "ignore-start", at });
		fill(this);
		this.segments.push({ kind: "ignore-end" });
		return this;
	}
}

const CRAB_NODES = new Set([
	"enum_declaration",
	"match_expression",
	"try_expression",
]);

const STATEMENTS = new Set([
	"expression_statement",
	"lexical_declaration",
	"variable_declaration",
	"return_statement",
	"throw_statement",
	"if_statement",
	"switch_statement",
	"for_statement",
	"for_in_statement",
	"while_statement",
	"do_statement",
	"try_statement",
	"labeled_statement",
	"export_statement",
	"statement_block",
	"empty_statement",
	"break_statement",
	"continue_statement",
	"debugger_statement",
	"import_statement",
	"function_declaration",
	"generator_function_declaration",
	"class_declaration",
	"abstract_class_declaration",
	"enum_declaration",
	"type_alias_declaration",
	"interface_declaration",
	"module",
	"internal_module",
	"ambient_declaration",
	"with_statement",
]);

/** Parents whose statements can have code inserted between them. */
const STATEMENT_LISTS = new Set([
	"program",
	"statement_block",
	"switch_case",
	"switch_default",
]);

/** Statements wrapped by these parents hoist in front of the parent. */
const TRANSPARENT_PARENTS = new Set([
	"labeled_statement",
	"export_statement",
	"ambient_declaration",
]);

/** Function bodies, where `?` can `return`. */
const FUNCTIONS = new Set([
	"function_declaration",
	"function_expression",
	"arrow_function",
	"method_definition",
	"generator_function",
	"generator_function_declaration",
]);

/** Everything that starts a new evaluation context. */
const SCOPES = new Set([
	...FUNCTIONS,
	"program",
	"class_static_block",
	"public_field_definition",
]);

/** Expressions that can be evaluated early without anyone noticing. */
const PURE_LEAVES = new Set([
	"identifier",
	"this",
	"super",
	"number",
	"string",
	"regex",
	"true",
	"false",
	"null",
	"undefined",
	"property_identifier",
	"private_property_identifier",
	"shorthand_property_identifier",
	"string_fragment",
	"escape_sequence",
	"arrow_function",
	"function_expression",
	"comment",
]);

const PURE_IF_CHILDREN_ARE = new Set([
	"parenthesized_expression",
	"member_expression",
	"subscript_expression",
	"non_null_expression",
	"array",
	"object",
	"pair",
	"computed_property_name",
	"binary_expression",
	"ternary_expression",
	"template_string",
	"template_substitution",
	"sequence_expression",
]);

const CHAINS = new Set([
	"call_expression",
	"member_expression",
	"subscript_expression",
]);

interface Frame {
	/** Hoisted code runs right before this node is evaluated. */
	root: Node;
	scope: Node;
	hoisted: Out;
	/** Inside a block arm of a `match` whose value is used. */
	inMatchValue: boolean;
}

interface Binding {
	node: Node;
	index: number;
}

type MatchMode = "statement" | "return";

const is = (a: Node | null | undefined, b: Node | null | undefined) =>
	!!a && !!b && a.id === b.id;

function scopeOf(node: Node): Node {
	let current = node.parent;
	while (current && !SCOPES.has(current.type)) current = current.parent;
	// biome-ignore lint/style/noNonNullAssertion: the program node is a scope
	return current ?? node.tree.rootNode!;
}

function hasSemicolon(statement: Node): boolean {
	return statement.lastChild?.type === ";";
}

function meaningful(nodes: Node[]): Node[] {
	return nodes.filter((node) => node.type !== "comment");
}

export function transform(source: string, tree: Tree): TransformResult {
	return new Transformer(source, tree).run();
}

class Transformer {
	private readonly diagnostics: CrabDiagnostic[] = [];
	private readonly crab = new Set<number>();
	private readonly frames: Frame[] = [];
	private readonly matchValues: Node[] = [];
	private readonly hoisted = new Set<number>();
	private readonly returns = new Set<number>();
	private readonly uses = { unreachable: false, residual: false };
	private counter = 0;
	private readonly source: string;
	private readonly tree: Tree;

	constructor(source: string, tree: Tree) {
		this.source = source;
		this.tree = tree;
	}

	run(): TransformResult {
		const root = this.tree.rootNode;
		this.mark(root);
		this.syntaxErrors(root);

		const out = new Out();
		this.emit(root, out);
		out.text(this.epilogue(root));

		const code = out.segments
			.map((segment) =>
				segment.kind === "verbatim"
					? this.source.slice(segment.start, segment.end)
					: segment.kind === "text" || segment.kind === "atom"
						? segment.text
						: "",
			)
			.join("");
		return { code, segments: out.segments, diagnostics: this.diagnostics };
	}

	// --- bookkeeping -------------------------------------------------------

	private mark(node: Node): boolean {
		let found = CRAB_NODES.has(node.type);
		for (const child of node.children) if (this.mark(child)) found = true;
		if (found) this.crab.add(node.id);
		return found;
	}

	private text(node: Node): string {
		return this.source.slice(node.startIndex, node.endIndex);
	}

	private fresh(prefix: string): string {
		return `${prefix}${this.counter++}`;
	}

	private report(node: Node, message: string, code: number): void {
		this.diagnostics.push({
			message,
			start: node.startIndex,
			length: node.endIndex - node.startIndex,
			code,
		});
	}

	private syntaxErrors(node: Node): void {
		if (!node.hasError && !node.isMissing) return;
		if (node.isMissing) {
			if (this.nearCrab(node)) {
				this.report(node, `missing \`${node.type}\``, DiagnosticCode.Syntax);
			}
			return;
		}
		if (node.isError) {
			if (this.nearCrab(node)) {
				const snippet = this.text(node).split("\n")[0].slice(0, 40);
				this.report(node, `unexpected \`${snippet}\``, DiagnosticCode.Syntax);
			}
			return;
		}
		for (const child of node.children) this.syntaxErrors(child);
	}

	/**
	 * TypeScript reports better syntax errors than tree-sitter does, so we only
	 * speak up when the error involves syntax TypeScript has never heard of.
	 */
	private nearCrab(node: Node): boolean {
		for (let n: Node | null = node; n; n = n.parent) {
			if (CRAB_NODES.has(n.type) || n.type.startsWith("match_")) return true;
			if (n.type === "enum_body" || n.type === "variant_fields") return true;
		}
		const visit = (n: Node): boolean =>
			CRAB_NODES.has(n.type) ||
			n.type === "match" ||
			n.type === "enum" ||
			n.children.some(visit);
		return visit(node);
	}

	private epilogue(root: Node): string {
		let code = "\n";
		if (this.uses.unreachable) {
			code +=
				"type __CrabUnmatched<T> = [T] extends [never] ? never : `non-exhaustive match: missing ${T extends readonly [infer Tag extends string, ...unknown[]] ? Tag : T & (string | number | bigint | boolean | null | undefined)}`;\n" +
				"function __crab_unreachable<T>(value: __CrabUnmatched<T>): never {\n" +
				"\tconst unmatched: unknown = value;\n" +
				"\tthrow new TypeError(`crabrave: no match arm for ${Array.isArray(unmatched) ? String(unmatched[0]) : String(unmatched)}`);\n" +
				"}\n";
		}
		if (this.uses.residual) {
			code +=
				"function __crab_residual<T extends readonly unknown[]>(value: T): " +
				'value is Extract<T, readonly ["Err", ...unknown[]] | readonly ["None", ...unknown[]]> {\n' +
				'\treturn value[0] === "Err" || value[0] === "None";\n' +
				"}\n";
		}
		const isModule = root.children.some(
			(child) =>
				child.type === "import_statement" || child.type === "export_statement",
		);
		// .crab files are always ES modules, like .mts files.
		if (!isModule) code += "export {};\n";
		return code;
	}

	// --- generic emission --------------------------------------------------

	private emit(node: Node, out: Out): void {
		if (!this.crab.has(node.id)) {
			out.verbatim(node.startIndex, node.endIndex);
		} else if (STATEMENTS.has(node.type)) {
			this.emitStatement(node, out);
		} else {
			this.emitInner(node, out);
		}
	}

	private emitChildren(node: Node, out: Out): void {
		let position = node.startIndex;
		for (const child of node.children) {
			out.verbatim(position, child.startIndex);
			this.emit(child, out);
			position = child.endIndex;
		}
		out.verbatim(position, node.endIndex);
	}

	private emitStatement(node: Node, out: Out): void {
		const parent = node.parent?.type ?? "program";
		if (TRANSPARENT_PARENTS.has(parent)) {
			this.emitInner(node, out);
			return;
		}
		const body = new Out();
		const hoisted = this.withFrame(node, () => this.emitInner(node, body));
		if (hoisted.segments.length === 0) {
			out.append(body);
		} else if (STATEMENT_LISTS.has(parent)) {
			out.append(hoisted).append(body);
		} else {
			out.text("{ ").append(hoisted).append(body).text(" }");
		}
	}

	/** Emit code whose `?`s and match subjects hoist in front of it. */
	private emitFramed(root: Node, out: Out, fill: (out: Out) => void): void {
		const body = new Out();
		const hoisted = this.withFrame(root, () => fill(body));
		out.append(hoisted).append(body);
	}

	private withFrame(root: Node, fill: () => void): Out {
		const scope = scopeOf(root);
		const match = this.matchValues.at(-1);
		const frame: Frame = {
			root,
			scope,
			hoisted: new Out(),
			inMatchValue: !!match && is(scopeOf(match), scope),
		};
		this.frames.push(frame);
		fill();
		this.frames.pop();
		return frame.hoisted;
	}

	private emitInner(node: Node, out: Out): void {
		if (!this.emitCrab(node, out)) this.emitChildren(node, out);
	}

	/** Emits `node` if it is (or directly wraps) crabrave syntax. */
	private emitCrab(node: Node, out: Out): boolean {
		switch (node.type) {
			case "enum_declaration":
				this.emitEnum(node, out, "");
				return true;
			case "export_statement": {
				const declaration = node.childForFieldName("declaration");
				if (declaration?.type !== "enum_declaration") return false;
				out.verbatim(node.startIndex, declaration.startIndex);
				this.emitEnum(declaration, out, "export ");
				return true;
			}
			case "expression_statement":
			case "return_statement": {
				const [expression] = meaningful(node.namedChildren);
				if (expression?.type !== "match_expression") return false;
				const mode = node.type === "return_statement" ? "return" : "statement";
				this.emitMatchStatement(expression, mode, out);
				return true;
			}
			case "match_expression":
				this.emitMatchValue(node, out);
				return true;
			case "try_expression":
				this.emitTry(node, out);
				return true;
			case "arrow_function":
				this.emitArrow(node, out);
				return true;
		}
		return false;
	}

	/** A value arm is a function in the output, so `return` would only leave the arm. */
	private checkReturns(block: Node): void {
		const visit = (node: Node) => {
			if (FUNCTIONS.has(node.type)) return;
			if (node.type === "return_statement" && !this.returns.has(node.id)) {
				this.returns.add(node.id);
				this.report(
					node.firstChild ?? node,
					"`return` inside a match arm whose value is used would only leave the arm; end the block with an expression instead",
					DiagnosticCode.ReturnInMatchValue,
				);
			}
			for (const child of node.namedChildren) visit(child);
		};
		visit(block);
	}

	/** `x => expr` grows a block body when `expr` needs statements. */
	private emitArrow(node: Node, out: Out): void {
		const body = node.childForFieldName("body");
		if (!body || body.type === "statement_block" || !this.crab.has(body.id)) {
			this.emitChildren(node, out);
			return;
		}
		let position = node.startIndex;
		for (const child of node.children) {
			out.verbatim(position, child.startIndex);
			if (is(child, body)) {
				out.text("{ ");
				if (body.type === "match_expression") {
					this.emitMatchStatement(body, "return", out);
				} else {
					this.emitFramed(body, out, (inner) => {
						inner.atom("return ", body.startIndex, body.endIndex);
						this.emit(body, inner);
						inner.text(";");
					});
				}
				out.text(" }");
			} else {
				this.emit(child, out);
			}
			position = child.endIndex;
		}
		out.verbatim(position, node.endIndex);
	}

	// --- enums -------------------------------------------------------------

	/**
	 * ```
	 * enum Shape<T> { Circle(T), Rect(w: number, h: number), Empty }
	 * ```
	 * becomes
	 * ```
	 * type Shape<T> = | readonly ["Circle", T] | readonly [tag: "Rect", w: number, h: number] | readonly ["Empty"];
	 * const Shape: { readonly Circle: <T>(_0: T) => Shape<T>; readonly Empty: Shape<never>; ... }
	 *   = { Circle: (_0) => ["Circle", _0], Empty: ["Empty"], ... };
	 * ```
	 * The field types are mapped from the tuple union. The constructor
	 * signatures repeat them inside an ignored region, so each mistake in a
	 * field type is reported once.
	 */
	private emitEnum(node: Node, out: Out, exportPrefix: string): void {
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const name = node.childForFieldName("name")!;
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const body = node.childForFieldName("body")!;
		const typeParameters = node.childForFieldName("type_parameters");
		const parameters = typeParameters
			? typeParameters.namedChildren.filter((c) => c.type === "type_parameter")
			: [];
		const parameterNames = parameters.map((p) =>
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			this.text(p.childForFieldName("name")!),
		);
		const enumName = this.text(name);
		const bottom = parameterNames.length
			? `${enumName}<${parameterNames.map(() => "never").join(", ")}>`
			: enumName;

		const variants = body.namedChildren.filter(
			(c) => c.type === "enum_variant",
		);

		// type Shape<T> = | readonly [...] | ...;
		out.text("type ").verbatim(name.startIndex, name.endIndex);
		if (typeParameters) {
			out.verbatim(name.endIndex, typeParameters.endIndex);
		}
		out.text(" =");
		let position = body.startIndex + 1;
		for (const child of body.children) {
			if (child.type === "{") continue;
			out.verbatim(position, child.startIndex);
			position = child.endIndex;
			if (child.type === "enum_variant") {
				out.text("| ");
				this.emitVariantType(child, out);
			} else if (child.type === "comment") {
				out.verbatim(child.startIndex, child.endIndex);
			}
		}
		if (variants.length === 0) out.text(" never");
		out.text(";");

		// const Shape: { ...constructor types } = { ...constructors };
		out.text(` ${exportPrefix}const `).verbatim(name.startIndex, name.endIndex);
		out.text(": {");
		for (const variant of variants) {
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const variantName = variant.childForFieldName("name")!;
			const fields = this.fields(variant);
			out
				.text(" readonly ")
				.verbatim(variantName.startIndex, variantName.endIndex);
			out.ignore(variant.startIndex, (o) => {
				if (!fields) {
					o.text(`: ${bottom};`);
				} else {
					const signature = fields.map((field, i) =>
						field.type === "named_field"
							? this.text(field)
							: `_${i}: ${this.text(field)}`,
					);
					const used = this.usedTypeParameters(parameters, fields);
					const generic = used.size
						? `<${parameters
								.filter((p) => used.has(p))
								.map((p) => this.text(p))
								.join(", ")}>`
						: "";
					const result = parameterNames.length
						? `${enumName}<${parameters.map((p, i) => (used.has(p) ? parameterNames[i] : "never")).join(", ")}>`
						: enumName;
					o.text(`: ${generic}(${signature.join(", ")}) => ${result};`);
				}
			});
		}
		out.text(" } = {");
		for (const variant of variants) {
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const tag = this.text(variant.childForFieldName("name")!);
			const fields = this.fields(variant);
			if (!fields) {
				out.text(` ${tag}: ["${tag}"],`);
				continue;
			}
			const names = fields.map((field, i) => this.fieldName(field, i));
			out.text(
				` ${tag}: (${names.join(", ")}) => ["${tag}", ${names.join(", ")}],`,
			);
		}
		out.text(" };");
	}

	/** `null` for unit variants, which are values rather than functions. */
	private fields(variant: Node): Node[] | null {
		const fields = variant.childForFieldName("fields");
		return fields
			? fields.namedChildren.filter((c) => c.type !== "comment")
			: null;
	}

	private fieldName(field: Node, index: number): string {
		if (field.type !== "named_field") return `_${index}`;
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		return this.text(field.childForFieldName("name")!);
	}

	private emitVariantType(variant: Node, out: Out): void {
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const tag = this.text(variant.childForFieldName("name")!);
		const fields = this.fields(variant) ?? [];
		const labeled = fields.some((field) => field.type === "named_field");
		out.text(`readonly [${labeled ? "tag: " : ""}"${tag}"`);
		fields.forEach((field, i) => {
			out.text(", ");
			if (labeled && field.type !== "named_field") out.text(`_${i}: `);
			out.verbatim(field.startIndex, field.endIndex);
		});
		out.text("]");
	}

	/**
	 * Constructors are only generic over the type parameters their fields
	 * mention, and fill the rest in with `never`: `Result.Ok(1)` is a
	 * `Result<number, never>`, which fits any `Result<number, E>`.
	 */
	private usedTypeParameters(parameters: Node[], fields: Node[]): Set<Node> {
		const byName = new Map(
			parameters.map((p) => [
				// biome-ignore lint/style/noNonNullAssertion: required by the grammar
				this.text(p.childForFieldName("name")!),
				p,
			]),
		);
		const used = new Set<Node>();
		const visit = (node: Node) => {
			if (node.type === "type_identifier") {
				const parameter = byName.get(this.text(node));
				if (parameter && !used.has(parameter)) {
					used.add(parameter);
					// Constraints and defaults can mention other parameters.
					for (const child of parameter.namedChildren.slice(1)) visit(child);
				}
			}
			for (const child of node.namedChildren) visit(child);
		};
		for (const field of fields) visit(field);
		return used;
	}

	// --- try ---------------------------------------------------------------

	/**
	 * `const x = load()?;` becomes
	 * `const __t0 = load(); if (__crab_residual(__t0)) return __t0; const x = __t0[1];`
	 */
	private emitTry(node: Node, out: Out): void {
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const operand = node.childForFieldName("argument")!;
		// biome-ignore lint/style/noNonNullAssertion: the `?` token
		const question = node.lastChild!;
		const frame = this.frames.at(-1);
		const error = this.tryError(node, frame);
		if (error || !frame) {
			if (error) this.report(question, error.message, error.code);
			out.text("(");
			this.emit(operand, out);
			out.text(")[1]");
			return;
		}
		const temp = this.fresh("__t");
		const value = new Out();
		this.emit(operand, value);
		frame.hoisted
			.text(`const ${temp} = `)
			.append(value)
			.text("; if (")
			.atom(`__crab_residual(${temp})`, question.startIndex, question.endIndex)
			.text(") ")
			.atom(`return ${temp};`, question.startIndex, question.endIndex)
			.text(" ");
		this.uses.residual = true;
		this.hoisted.add(node.id);
		out.atom(`${temp}[1]`, node.startIndex, node.endIndex);
	}

	private tryError(
		node: Node,
		frame: Frame | undefined,
	): { message: string; code: number } | null {
		if (!FUNCTIONS.has(scopeOf(node).type)) {
			return {
				message: "the `?` operator can only be used inside a function",
				code: DiagnosticCode.TryOutsideFunction,
			};
		}
		if (frame?.inMatchValue) {
			return {
				message:
					"`?` cannot be used inside a match arm whose value is used; match in a statement or `return` instead",
				code: DiagnosticCode.TryInMatchValue,
			};
		}
		const blocker = this.hoistBlocker(node, frame);
		return blocker
			? {
					message: `\`?\` cannot be used here because ${blocker}`,
					code: DiagnosticCode.TryNotHoistable,
				}
			: null;
	}

	/**
	 * Hoisting `node` in front of its statement is only invisible if nothing
	 * observable runs before it in the original order, and it would always
	 * have run.
	 */
	private hoistBlocker(node: Node, frame: Frame | undefined): string | null {
		if (!frame || !is(scopeOf(node), frame.scope)) {
			return "it is not part of a statement";
		}
		let child = node;
		while (!is(child, frame.root)) {
			const parent = child.parent;
			if (!parent) return "it is not part of a statement";
			const conditional = this.conditional(parent, child);
			if (conditional) return conditional;
			for (const sibling of parent.namedChildren) {
				if (sibling.endIndex > child.startIndex) break;
				if (!this.pure(sibling)) {
					const snippet = this.text(sibling).split("\n")[0].slice(0, 30);
					return `it would run before \`${snippet}\``;
				}
			}
			child = parent;
		}
		return null;
	}

	private conditional(parent: Node, child: Node): string | null {
		const field = (name: string) => is(parent.childForFieldName(name), child);
		switch (parent.type) {
			case "ternary_expression":
				return field("condition") ? null : "it is inside a branch of `? :`";
			case "binary_expression":
			case "augmented_assignment_expression": {
				const operator = parent.childForFieldName("operator")?.type ?? "";
				return ["&&", "||", "??", "&&=", "||=", "??="].includes(operator) &&
					field("right")
					? `it is on the right of \`${operator}\``
					: null;
			}
			case "match_arm":
			case "match_guard":
			case "match_body":
				return "it is inside a match arm";
			case "while_statement":
			case "do_statement":
				return field("condition") ? "it is part of a loop condition" : null;
			case "for_statement":
				return field("condition") || field("increment")
					? "it is part of a loop header"
					: null;
			case "for_in_statement":
				return field("right") ? null : "it is part of a loop header";
		}
		if (CHAINS.has(parent.type)) {
			const head =
				parent.childForFieldName("function") ??
				parent.childForFieldName("object");
			if (!is(head, child) && this.optionalChain(parent)) {
				return "it comes after an optional chain (`?.`)";
			}
		}
		return null;
	}

	private optionalChain(node: Node | null): boolean {
		for (let n = node; n && CHAINS.has(n.type); ) {
			if (
				n.children.some((c) => c.type === "optional_chain" || c.type === "?.")
			) {
				return true;
			}
			n = n.childForFieldName("function") ?? n.childForFieldName("object");
		}
		return false;
	}

	private pure(node: Node): boolean {
		if (PURE_LEAVES.has(node.type)) return true;
		switch (node.type) {
			case "try_expression":
				return this.hoisted.has(node.id);
			case "as_expression":
			case "satisfies_expression":
			case "instantiation_expression":
				return this.pure(node.namedChildren[0]);
			case "unary_expression":
				return (
					node.childForFieldName("operator")?.type !== "delete" &&
					node.namedChildren.every((c) => this.pure(c))
				);
		}
		return (
			PURE_IF_CHILDREN_ARE.has(node.type) &&
			node.namedChildren.every((c) => this.pure(c))
		);
	}

	// --- match -------------------------------------------------------------

	private arms(match: Node): Node[] {
		const body = match.childForFieldName("body");
		return body ? body.namedChildren.filter((c) => c.type === "match_arm") : [];
	}

	private condition(pattern: Node, subject: string): Out | null {
		switch (pattern.type) {
			case "variant_pattern": {
				// biome-ignore lint/style/noNonNullAssertion: required by the grammar
				const name = pattern.childForFieldName("name")!;
				return new Out().atom(
					`${subject}[0] === "${this.text(name)}"`,
					name.startIndex,
					name.endIndex,
				);
			}
			case "literal_pattern":
				return new Out().atom(
					`${subject} === ${this.text(pattern)}`,
					pattern.startIndex,
					pattern.endIndex,
				);
			case "or_pattern": {
				const alternatives = meaningful(pattern.namedChildren).map((p) =>
					this.condition(p, subject),
				);
				if (alternatives.some((c) => c === null)) return null;
				const out = new Out().text("(");
				alternatives.forEach((c, i) => {
					if (i > 0) out.text(" || ");
					out.append(c as Out);
				});
				return out.text(")");
			}
			default:
				return null;
		}
	}

	private bindings(pattern: Node): Binding[] {
		if (pattern.type === "or_pattern") {
			const alternatives = meaningful(pattern.namedChildren);
			const all = alternatives.map((p) => this.bindings(p));
			const shape = (bindings: Binding[]) =>
				bindings.map((b) => `${b.index}:${this.text(b.node)}`).join(",");
			if (all.some((b) => shape(b) !== shape(all[0]))) {
				this.report(
					pattern,
					"every alternative of an or-pattern must bind the same names in the same positions",
					DiagnosticCode.OrPatternBindings,
				);
			}
			return all[0] ?? [];
		}
		if (pattern.type !== "variant_pattern") return [];
		const fields = pattern.childForFieldName("fields");
		if (!fields) return [];
		return meaningful(fields.namedChildren).flatMap((node, i) =>
			node.type === "wildcard_pattern" ? [] : [{ node, index: i + 1 }],
		);
	}

	/**
	 * Statement and `return` position:
	 * ```
	 * { const __m0 = shape;
	 *   if (__m0[0] === "Circle") { const r = __m0[1]; return r * r; }
	 *   return __crab_unreachable<typeof __m0>(__m0); }
	 * ```
	 * As a statement the block is labelled and each arm ends in `break`.
	 */
	private emitMatchStatement(match: Node, mode: MatchMode, out: Out): void {
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const value = match.childForFieldName("value")!;
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const keyword = match.firstChild!;
		const subject = this.fresh("__m");
		const label = mode === "statement" ? this.fresh("__crab") : "";
		out.text(label ? `${label}: { ` : "{ ");
		this.emitFramed(value, out, (o) => {
			o.text(`const ${subject} = `);
			this.emit(value, o);
			o.text(";");
		});

		let exhaustive = false;
		let position = value.endIndex;
		for (const arm of this.arms(match)) {
			const gap = this.between(match, position, arm.startIndex);
			out.append(gap.segments.length ? gap : new Out().text(" "));
			position = arm.endIndex;
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const pattern = arm.childForFieldName("pattern")!;
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const body = arm.childForFieldName("body")!;
			const guard = arm.namedChildren.find((c) => c.type === "match_guard");
			if (exhaustive) this.unreachableArm(pattern);

			const condition = this.condition(pattern, subject);
			if (condition) out.text("if (").append(condition).text(") ");
			out.text("{ ");
			out.text(
				this.armBreaks(pattern, guard?.childForFieldName("condition"), body),
			);
			for (const binding of this.bindings(pattern)) {
				out
					.text("const ")
					.verbatim(binding.node.startIndex, binding.node.endIndex)
					.text(" = ")
					.atom(
						`${subject}[${binding.index}]`,
						binding.node.startIndex,
						binding.node.endIndex,
					)
					.text("; ");
			}
			const test = guard?.childForFieldName("condition");
			if (test) {
				this.emitFramed(test, out, (o) => {
					o.text("if (");
					this.emit(test, o);
					o.text(") { ");
				});
			}
			this.emitArmBody(body, mode, label, out);
			if (test) out.text(" }");
			out.text(" }");
			if (!condition && !test) exhaustive = true;
		}
		const close = match.childForFieldName("body")?.lastChild;
		if (close) out.append(this.between(match, position, close.startIndex));
		if (!exhaustive) {
			this.uses.unreachable = true;
			out
				.text(mode === "return" ? " return " : " ")
				.atom(
					`__crab_unreachable<typeof ${subject}>(${subject})`,
					keyword.startIndex,
					keyword.endIndex,
				)
				.text(";");
		}
		out.text(" }");
	}

	private emitArmBody(
		body: Node,
		mode: MatchMode,
		label: string,
		out: Out,
	): void {
		const exit = mode === "statement" ? ` break ${label};` : "";
		if (body.type !== "statement_block") {
			if (body.type === "match_expression") {
				this.emitMatchStatement(body, mode, out);
			} else {
				this.emitFramed(body, out, (o) => {
					if (mode === "return")
						o.atom("return ", body.startIndex, body.endIndex);
					this.emit(body, o);
					o.text(";");
				});
			}
			out.text(exit);
			return;
		}

		const statements = meaningful(body.namedChildren);
		const last = statements.at(-1);
		const tail =
			last?.type === "expression_statement" && !hasSemicolon(last)
				? last
				: null;
		this.emitBlockContents(body, out, (statement, o) => {
			if (mode === "return" && is(statement, tail)) {
				this.emitTail(statement, o);
				return true;
			}
			return false;
		});
		if (mode === "return") {
			const exits =
				tail ||
				last?.type === "return_statement" ||
				last?.type === "throw_statement";
			if (!exits) out.text(" return undefined;");
		}
		out.text(exit);
	}

	/** Copies a block without its braces, letting `special` take over statements. */
	private emitBlockContents(
		block: Node,
		out: Out,
		special: (statement: Node, out: Out) => boolean,
	): void {
		const children = block.children.filter(
			(c) => c.type !== "{" && c.type !== "}",
		);
		let position = block.startIndex + 1;
		for (const child of children) {
			out.verbatim(position, child.startIndex);
			if (!special(child, out)) this.emit(child, out);
			position = child.endIndex;
		}
		const close = block.lastChild;
		if (close?.type === "}") out.verbatim(position, close.startIndex);
	}

	/** The final expression of a block arm, without a `;`, is its value. */
	private emitTail(statement: Node, out: Out): void {
		const [expression] = meaningful(statement.namedChildren);
		if (expression.type === "match_expression") {
			this.emitMatchStatement(expression, "return", out);
			return;
		}
		this.emitFramed(expression, out, (o) => {
			o.atom("return ", expression.startIndex, expression.endIndex);
			this.emit(expression, o);
			o.text(";");
		});
	}

	/**
	 * Anywhere else:
	 * ```
	 * (__m0[0] === "Circle" ? ((r) => r * r)(__m0[1]) : __crab_unreachable<typeof __m0>(__m0))
	 * ```
	 * with `const __m0 = shape;` hoisted in front of the statement when that
	 * is safe, and an immediately invoked arrow function otherwise.
	 */
	private emitMatchValue(match: Node, out: Out): void {
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const value = match.childForFieldName("value")!;
		// biome-ignore lint/style/noNonNullAssertion: required by the grammar
		const keyword = match.firstChild!;
		const frame = this.frames.at(-1);

		let subject: string;
		let wrapped = false;
		if (frame && !this.hoistBlocker(match, frame)) {
			subject = this.fresh("__m");
			const init = new Out();
			this.emit(value, init);
			frame.hoisted.text(`const ${subject} = `).append(init).text("; ");
		} else if (value.type === "identifier" || value.type === "this") {
			subject = this.text(value);
		} else {
			subject = this.fresh("__m");
			wrapped = true;
		}

		out.text(wrapped ? `((${subject}) => ` : "(");
		let closed = false;
		let position = value.endIndex;
		for (const arm of this.arms(match)) {
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const pattern = arm.childForFieldName("pattern")!;
			// biome-ignore lint/style/noNonNullAssertion: required by the grammar
			const body = arm.childForFieldName("body")!;
			const guard = arm.namedChildren
				.find((c) => c.type === "match_guard")
				?.childForFieldName("condition");
			if (closed) {
				this.unreachableArm(pattern);
				continue;
			}
			const bindings = this.bindings(pattern);
			const condition = this.condition(pattern, subject);
			const test = new Out();
			if (condition) test.append(condition);
			if (guard) {
				if (condition) test.text(" && ");
				this.emitArmValue(match, guard, bindings, subject, test);
			}
			const result = new Out();
			this.emitArmValue(match, body, bindings, subject, result);
			out.append(this.between(match, position, arm.startIndex));
			out.text(this.armBreaks(pattern, guard, body));
			position = arm.endIndex;
			if (test.segments.length) {
				out.append(test).text(" ? ").append(result).text(" : ");
			} else {
				out.append(result);
				closed = true;
			}
		}
		if (!closed) {
			this.uses.unreachable = true;
			out.atom(
				`__crab_unreachable<typeof ${subject}>(${subject})`,
				keyword.startIndex,
				keyword.endIndex,
			);
		}
		if (wrapped) {
			out.text(")(");
			this.emit(value, out);
		}
		const close = match.childForFieldName("body")?.lastChild;
		if (close) out.append(this.between(match, position, close.startIndex));
		out.text(")");
	}

	private emitArmValue(
		match: Node,
		body: Node,
		bindings: Binding[],
		subject: string,
		out: Out,
	): void {
		const block = body.type === "statement_block";
		if (!block && bindings.length === 0) {
			out.text("(");
			this.emit(body, out);
			out.text(")");
			return;
		}
		const isAsync = this.awaits(body);
		out.text(isAsync ? "(await (async (" : "((");
		bindings.forEach((binding, i) => {
			if (i > 0) out.text(", ");
			out.verbatim(binding.node.startIndex, binding.node.endIndex);
		});
		out.text(") => ");
		if (block) {
			this.checkReturns(body);
			this.matchValues.push(match);
			out.text("{");
			const statements = meaningful(body.namedChildren);
			const last = statements.at(-1);
			const tail =
				last?.type === "expression_statement" && !hasSemicolon(last)
					? last
					: null;
			this.emitBlockContents(body, out, (statement, o) => {
				if (!is(statement, tail)) return false;
				this.emitTail(statement, o);
				return true;
			});
			out.text("}");
			this.matchValues.pop();
		} else {
			out.text("(");
			this.emit(body, out);
			out.text(")");
		}
		out.text(")(");
		bindings.forEach((binding, i) => {
			if (i > 0) out.text(", ");
			out.atom(
				`${subject}[${binding.index}]`,
				binding.node.startIndex,
				binding.node.endIndex,
			);
		});
		out.text(isAsync ? "))" : ")");
	}

	/** Whether `node` awaits in its own function. */
	private awaits(node: Node): boolean {
		const visit = (n: Node): boolean =>
			n.type === "await_expression" ||
			(!FUNCTIONS.has(n.type) && n.children.some(visit));
		return visit(node);
	}

	private unreachableArm(pattern: Node): void {
		this.report(
			pattern,
			"unreachable match arm: an earlier arm matches every value",
			DiagnosticCode.UnreachableArm,
		);
	}

	/**
	 * What sits between two arms (or before the first or after the last):
	 * whitespace and comments are kept, so line numbers and `// @ts-...`
	 * directives survive, and the commas are dropped.
	 */
	private between(match: Node, start: number, end: number): Out {
		const out = new Out();
		const children = (match.childForFieldName("body")?.children ?? []).filter(
			(child) => child.startIndex >= start && child.endIndex <= end,
		);
		const keep =
			this.source.slice(start, end).includes("\n") ||
			children.some((child) => child.type === "comment");
		if (!keep) return out;
		let position = start;
		for (const child of children) {
			out.verbatim(
				position,
				child.type === "comment" ? child.endIndex : child.startIndex,
			);
			position = child.endIndex;
		}
		out.verbatim(position, end);
		return out;
	}

	/** Line breaks between an arm's pattern and its body, which are dropped. */
	private armBreaks(
		pattern: Node,
		guard: Node | null | undefined,
		body: Node,
	): string {
		return guard
			? this.lineBreaks(pattern.startIndex, guard.startIndex) +
					this.lineBreaks(guard.endIndex, body.startIndex)
			: this.lineBreaks(pattern.startIndex, body.startIndex);
	}

	/** The line breaks in `[start, end)`, so generated code keeps line numbers. */
	private lineBreaks(start: number, end: number): string {
		const count = this.source.slice(start, end).split("\n").length - 1;
		return "\n".repeat(count);
	}
}
