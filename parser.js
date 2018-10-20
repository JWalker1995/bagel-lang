"use strict";

const util = require("util");
const P = require("parsimmon");

///////////////////////////////////////////////////////////////////////

// Turn escaped characters into real ones (e.g. "\\n" becomes "\n").
const interpretEscapes = str => {
  const escapes = {
    b: "\b",
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t"
  };
  return str.replace(/\\(u[0-9a-fA-F]{4}|[^u])/, (_, escape) => {
    const type = escape.charAt(0);
    const hex = escape.slice(1);
    if (type === 'u') {
      return String.fromCharCode(parseInt(hex, 16));
    }
    if (escapes.hasOwnProperty(type)) {
      return escapes[type];
    }
    return type;
  });
};



/*
function must(parser) {
  if (arguments.length !== 1) {
    throw new Error('Unexpected number of arguments');
  }

  return P.Parser((input, i) => {
    const res = parser._(input, i);
    if (res.status) {
      return res;
    } else {
      throw new Error({
        result: res,
      });
    }
  });

  // return P.alt(parser, P.Parser((input, i) => {
  //   console.log(parser, input, i);
  //   throw {
  //     result: P.makeFailure(i, 'bla'),
  //   };
  // }));
}
*/


function opt(parser) {
  if (arguments.length !== 1) {
    throw new Error('Unexpected number of arguments');
  }
  return parser.or(P.of(null));
}

function many(parser) {
  if (arguments.length !== 1) {
    throw new Error('Unexpected number of arguments');
  }
  return parser.many();
}

function many1(parser) {
  if (arguments.length !== 1) {
    throw new Error('Unexpected number of arguments');
  }
  return parser.atLeast(1);
}

function assocLeft(parser, padding, ops) {
  const opParser = P.oneOf(Object.keys(ops).join('')).trim(padding);
  return P.seq(parser, many(P.seq(opParser, parser))).map(mapAssocLeft(ops));
}

function assocRight(parser, padding, ops) {
  const opParser = P.oneOf(Object.keys(ops).join('')).trim(padding);
  return P.seq(many(P.seq(parser, opParser)), parser).map(mapAssocRight(ops));
}

function mapAssocLeft(ops) {
  return arr => arr[1].reduce((prev, cur) => ({
    tag: ops[cur[0]],
    lhs: prev,
    rhs: cur[1],
  }), arr[0]);
}

function mapAssocRight(ops) {
  return arr => arr[0].reduceRight((prev, cur) => ({
    tag: ops[cur[1]],
    lhs: cur[0],
    rhs: prev,
  }), arr[1]);
}


let productions = {
  short_comment: r => P.seq(P.string('//'), many(P.notFollowedBy(P.end).then(P.any)), P.lookahead(P.end)),
  long_comment: r => P.seq(P.string('/*'), P.alt(P.notFollowedBy(P.string('/*')).notFollowedBy(P.string('*/')).then(P.any), r.long_comment).many(), P.string('*/')),
  comment: r => P.alt(r.short_comment, r.long_comment),

  ws: r => P.regexp(/[\s]/),
  hs: r => P.regexp(/[^\S\r\n]/), // [\s] without newlines
  nl: r => P.regexp(/[\r\n]/),

  word_pad: r => many(P.alt(r.hs, r.comment)),
  line_pad: r => many(P.alt(r.ws, r.comment)),

  word_sep: r => many1(P.alt(r.hs, r.comment)),
  line_sep: r => P.seq(r.word_pad, P.alt(r.nl, P.string(',')), r.line_pad),

  ident: r => P.regexp(/[a-zA-Z_#][a-zA-Z0-9_]*/),
  ident_lhs: r => r.ident,
  ident_rhs: r => r.ident.map(ident => ({
    tag: 'ident_rhs',
    keyStr: ident,
  })),

  // symbol: r => P.seq(P.string('$'), must(r.ident)),

  digits: r => many1(P.digit).tie(),
  sign: r => P.oneOf('-+'),
  frac: r => P.seq(P.string('.'), r.digits),
  exp: r => P.seq(P.oneOf('eE'), opt(P.oneOf('-+')), r.digits),
  number: r => P.seq(opt(r.sign), r.digits, opt(r.frac), opt(r.exp)).map(arr => ({
    tag: 'number',
    sign: arr[0],
    int: arr[1],
    frac: arr[2] ? arr[2][1] : null,
    expSign: arr[3] ? arr[3][1] : null,
    expInt: arr[3] ? arr[3][2] : null,
  })),
  string: r => P.regexp(/"((?:\\.|.)*?)"/, 1).map(value => ({
    tag: 'string',
    const_value: interpretEscapes(value),
  })),


  arrow_function: r => P.seq(r.ident_lhs, P.string('=>').trim(r.line_pad), r.expression).map(arr => ({
    tag: 'arrow',
    lhsArgStr: arr[0],
    rhsExpr: arr[2],
  })),

  postfixable: r => P.alt(
    r.number,
    r.string,
    P.seq(P.string('('), r.line_pad, r.paren_body, r.line_pad, P.string(')')).map(arr => arr[2]),
    P.seq(P.string('['), r.line_pad, r.list_body, r.line_pad, P.string(']')).map(arr => arr[2]),
    P.seq(P.string('{'), r.line_pad, r.map_body, r.line_pad, P.string('}')).map(arr => arr[2]),
  ),

  /*
  ::  Scope resolution  Left-to-right
2 a++   a-- Suffix/postfix increment and decrement
type()   type{} Functional cast
a() Function call
a[] Subscript
.   ->  Member access
3 ++a   --a Prefix increment and decrement  Right-to-left
+a   -a Unary plus and minus
!   ~ Logical NOT and bitwise NOT
(type)  C-style cast
*a  Indirection (dereference)
&a  Address-of
sizeof  Size-of[note 1]
new   new[] Dynamic memory allocation
delete   delete[] Dynamic memory deallocation
4 .*   ->*  Pointer-to-member Left-to-right
5 a*b   a/b   a%b Multiplication, division, and remainder
6 a+b   a-b Addition and subtraction
7 <<   >> Bitwise left shift and right shift
8 <=> Three-way comparison operator (since C++20)
9 <   <=  For relational operators < and ≤ respectively
>   >=  For relational operators > and ≥ respectively
10  ==   != For relational operators = and ≠ respectively
11  & Bitwise AND
12  ^ Bitwise XOR (exclusive or)
13  | Bitwise OR (inclusive or)
14  &&  Logical AND
15  ||  Logical OR
16  a?b:c Ternary conditional[note 2] Right-to-left
throw throw operator
= Direct assignment (provided by default for C++ classes)
+=   -= Compound assignment by sum and difference
*=   /=   %=  Compound assignment by product, quotient, and remainder
<<=   >>= Compound assignment by bitwise left shift and right shift
&=   ^=   |=  Compound assignment by bitwise AND, XOR, and OR
17  , Comma
*/

  atomic: r => P.alt(
    /*
    P.seq(r.postfixable, r.word_pad, r.multiplicationUnit).map(arr => ({
      tag: 'wrap',
      lhs: arr[0],
      rhs: arr[2],
    })),
    */
    r.postfixable,
    r.arrow_function,
    r.ident_rhs,
  ),

  // exponentationUnit: r => assocRight(r.atomic, r.line_pad, {'^': 'exponentation'}),
  // multiplicationUnit: r => assocLeft(r.exponentationUnit, r.line_pad, {'*': 'multiplication', '/': 'division'}),

  atomic_dotted: r => P.seq(r.atomic, many(P.seq(r.line_pad.then(P.string('.')), r.ident))).map(mapAssocLeft({'.': 'dot'})),
  evaluation: r => P.seq(r.atomic_dotted, many(P.seq(r.word_pad.map(arr => ''), r.atomic_dotted))).map(mapAssocLeft({'': 'call'})),

  extension: r => assocRight(r.evaluation, r.line_pad, {':': 'extension'}),
  exponentation: r => assocRight(r.extension, r.line_pad, {'^': 'exponentation'}),
  multiplication: r => assocLeft(r.exponentation, r.line_pad, {'*': 'multiplication', '/': 'division', '%': 'remainder'}),
  addition: r => assocLeft(r.multiplication, r.line_pad, {'+': 'addition', '-': 'subtraction'}),


/*
  const opParser = P.oneOf(Object.keys(ops).join('')).trim(r.line_pad);
  return P.seq(many(P.seq(r.addition, P.string('?').trim(r.line_pad), r.ternary, P.string(':').trim(r.line_pad), r.ternary)), r.addition).map(mapAssocRight(ops));
  ternary: r => r.addition, r.line_pad,
  */
  ternary: r => r.addition,

  expression: r => P.alt(r.ternary),

  lhs: r => P.seq(r.ident_lhs, many(P.seq(r.word_sep, r.ident_lhs))),

  statement: r => P.seq(r.lhs, P.string('=').trim(r.line_pad), r.expression).map(arr => ({
    tag: 'statement',
    lhsPropStr: arr[0][0],
    rhsExpr: arr[0][1].reduceRight((acc, arr) => ({
      tag: 'arrow',
      lhsArgStr: arr[1],
      rhsExpr: acc,
    }), arr[2]),
  })),

  getter: r => r.ident_rhs.map(ident => ({
    tag: 'getter',
    lhsPropStr: ident.keyStr,
    rhsExpr: ident,
  })),

  paren_body: r => P.seq(many(P.seq(r.statement, r.line_sep)), r.expression).map(arr => ({
    tag: 'paren',
    statements: arr[0].map(arr => arr[0]),
    returnExpr: arr[1],
  })),
  list_body: r => P.sepBy(r.expression, r.line_sep).or(P.of([])).map(arr => ({
    tag: 'list',
    items: arr,
  })),
  map_body: r => P.sepBy(P.alt(r.statement, r.getter), r.line_sep).or(P.of([])).map(arr => ({
    tag: 'map',
    statements: arr,
  })),

  grammar: r => P.seq(r.line_pad, r.paren_body, r.line_pad, P.eof).map(arr => arr[1]),
};

Object.keys(productions).forEach(key => {
  const prevProd = productions[key];
  productions[key] = r => P.seqMap(P.index, prevProd(r), P.index, (begin, obj, end) => obj.tag ? {
    ...obj,
    begin,
    end,
  } : obj);
});

const prodRuns = {};
const prodAccepts = {};
Object.keys(productions).forEach(key => {
  prodRuns[key] = 0;
  prodAccepts[key] = 0;

  const prevProd = productions[key];
  productions[key] = r => P.Parser((input, i) => {
    prodRuns[key]++;
    return prevProd(r).map(out => {
      prodAccepts[key]++;
      return out;
    })._(input, i);
  });
});

const language = P.createLanguage(productions);

module.exports = code => {
  const res = language.grammar.tryParse(code);
  Object.keys(productions)
    .sort((a, b) => prodRuns[b] - prodRuns[a])
    .forEach(key => console.log(`${key}: ${prodAccepts[key]} / ${prodRuns[key]}`));
  return res;
};

/*
TODO:
[a, b] = [1, 2]
{a = b} = {a = 123}
*/
