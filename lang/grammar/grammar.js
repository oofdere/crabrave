/**
 * @file crabrave: TypeScript with Rust-style enums, `match`, and `?`
 * @license MIT
 *
 * This grammar extends tree-sitter-typescript. Everything that parses as
 * TypeScript keeps its upstream node types; crabrave only adds:
 *
 *   enum Shape<T> { Circle(number), Rect(w: number, h: number), Empty }
 *   match value { Circle(r) if r > 1 => ..., Rect(w, h) | Square(w, h) => ..., _ => ... }
 *   result?
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const TypeScript = require('tree-sitter-typescript/typescript/grammar');

module.exports = grammar(TypeScript, {
  name: 'crabrave',

  precedences: ($, previous) => previous.concat([
    // `?` binds looser than prefix operators (so `await f()?` tries the
    // awaited value) but tighter than every binary operator.
    [
      'member',
      'template_call',
      'call',
      $.update_expression,
      'unary_void',
      'try',
      'binary_exp',
      'binary_times',
      'binary_plus',
      'binary_shift',
      'binary_compare',
      'binary_relation',
      'binary_equality',
      'bitwise_and',
      'bitwise_xor',
      'bitwise_or',
      'logical_and',
      'logical_or',
      'ternary',
      $.sequence_expression,
      $.arrow_function,
    ],
    ['unary', 'try', 'binary', $.await_expression, $.arrow_function],
  ]),

  conflicts: ($, previous) => previous.concat([
    // AUTO-CONFLICTS
    [$.primary_expression, $.optional_tuple_parameter, $.primary_type],
    [$.primary_expression, $.match_expression],
    [$.primary_expression, $._property_name, $.match_expression],
    [$.primary_expression, $.method_definition, $.match_expression],
    [$.primary_expression, $._property_name, $.arrow_function, $.match_expression],
  ]),

  rules: {
    // `enum` declares a Rust-style tagged union instead of a TypeScript enum.
    enum_declaration: $ => seq(
      'enum',
      field('name', $.identifier),
      field('type_parameters', optional($.type_parameters)),
      field('body', $.enum_body),
    ),

    enum_body: $ => seq(
      '{',
      commaSep(field('variant', $.enum_variant)),
      optional(','),
      '}',
    ),

    enum_variant: $ => seq(
      field('name', $.identifier),
      field('fields', optional($.variant_fields)),
    ),

    variant_fields: $ => seq(
      '(',
      commaSep1(field('field', choice(
        alias($.tuple_parameter, $.named_field),
        $.type,
      ))),
      optional(','),
      ')',
    ),

    expression: ($, previous) => choice(
      previous,
      $.match_expression,
      $.try_expression,
    ),

    match_expression: $ => seq(
      'match',
      field('value', $.expression),
      field('body', $.match_body),
    ),

    match_body: $ => seq(
      '{',
      repeat(choice(
        seq($.match_arm, ','),
        seq(alias($._match_block_arm, $.match_arm), optional(',')),
      )),
      optional($.match_arm),
      '}',
    ),

    match_arm: $ => seq(
      field('pattern', $._match_pattern),
      optional($.match_guard),
      '=>',
      field('body', $.expression),
    ),

    _match_block_arm: $ => seq(
      field('pattern', $._match_pattern),
      optional($.match_guard),
      '=>',
      field('body', $.statement_block),
    ),

    match_guard: $ => seq('if', field('condition', $.expression)),

    _match_pattern: $ => choice(
      $._single_pattern,
      $.or_pattern,
    ),

    or_pattern: $ => seq(
      $._single_pattern,
      repeat1(seq('|', $._single_pattern)),
    ),

    _single_pattern: $ => choice(
      $.wildcard_pattern,
      $.variant_pattern,
      $.literal_pattern,
    ),

    wildcard_pattern: _ => '_',

    variant_pattern: $ => seq(
      field('name', $.identifier),
      field('fields', optional($.variant_pattern_fields)),
    ),

    variant_pattern_fields: $ => seq(
      '(',
      commaSep(field('field', choice(
        $.wildcard_pattern,
        $.identifier,
        $._destructuring_pattern,
      ))),
      optional(','),
      ')',
    ),

    literal_pattern: $ => choice(
      $.number,
      seq('-', $.number),
      $.string,
      $.true,
      $.false,
      $.null,
      $.undefined,
    ),

    try_expression: $ => prec.left('try', seq(
      field('argument', $.expression),
      '?',
    )),

    _reserved_identifier: (_, previous) => choice(previous, 'match'),
  },
});

/**
 * @param {RuleOrLiteral} rule
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * @param {RuleOrLiteral} rule
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
