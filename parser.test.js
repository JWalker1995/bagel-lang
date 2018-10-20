import test from 'ava';
import parser from './parser';


const parse = code => parser(code).toArr();


test('number expressions', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['number', null, '123', null, null, null]]
 , ], parse(`
    123
  `));

  t.deepEqual([
    'call_body',
    ['expression', ['number', '-', '123', '456', '-', '78']],
  ], parse(`
    -123.456e-78
  `));
});

test('ident expressions', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['ident_rhs', 'abcDEF_123']],
  ], parse(`
    abcDEF_123
  `));

  t.deepEqual([
    'call_body',
    ['expression', ['ident_rhs', '_123']],
  ], parse(`
    _123
  `));
});

test('dotted expressions', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['dot', ['dot', ['ident_rhs', 'abc'], ['ident_rhs', 'def']], ['ident_rhs', 'ghi']]],
  ], parse(`
    abc.def.ghi
  `));
});

test('call expressions', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['call', ['call', ['ident_rhs', 'abc'], ['ident_rhs', 'def']], ['ident_rhs', 'ghi']]],
  ], parse(`
    abc def ghi
  `));
});

test('arrow expressions', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['arrow', ['ident_lhs', 'abc'], ['expression', ['ident_rhs', 'def']]]],
  ], parse(`
    abc => def
  `));
});

test('comments', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['call', ['ident_rhs', 'abc'], ['ident_rhs', 'def']]],
  ], parse(`
    abc/*
    block comment
    */def
  `));

  t.deepEqual([
    'call_body',
    ['statement', ['ident_lhs', 'abc'], ['expression', ['ident_rhs', 'def']]],
    ['expression', ['ident_rhs', 'ghi']],
  ], parse(`
    /* block comment 1 */
    abc = def// line comment 1
    /* block comment 2 */
    ghi// line comment 2
    /* block comment 3 */
  `));
});

test('precedence', t => {
  t.deepEqual([
    'call_body',
    ['expression',
      ['subtraction',
        ['addition', ['ident_rhs', 'a'], ['ident_rhs', 'b']],
        ['division',
          ['multiplication', ['ident_rhs', 'c'], ['ident_rhs', 'd']],
          ['exponentation',
            ['ident_rhs', 'e'],
            ['exponentation',
              ['ident_rhs', 'f'],
              ['extension',
                ['ident_rhs', 'g'],
                ['call',
                  ['ident_rhs', 'h'],
                  ['dot',
                    ['dot',
                      ['ident_rhs', 'i'],
                      ['ident_rhs', 'j'],
                    ],
                    ['ident_rhs', 'k'],
                  ],
                ],
              ],
            ],
          ],
        ],
      ],
    ],
  ], parse(`
    a + b - c * d / e ^ f ^ g : h i.j.k
  `));
});

test('statements', t => {
  t.deepEqual([
    'call_body',
    ['statement', ['ident_lhs', 'abc'], ['expression', ['ident_rhs', 'def']]],
    ['expression', ['ident_rhs', 'ghi']],
  ], parse(`
    abc = def
    ghi
  `));

  t.deepEqual([
    'call_body',
    ['statement', ['ident_lhs', 'abc'], ['ident_lhs', 'def'], ['expression', ['ident_rhs', 'ghi']]],
    ['expression', ['ident_rhs', 'jkl']],
  ], parse(`
    abc def = ghi, jkl
  `));
});

test('call block', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['call_body',
      ['statement', ['ident_lhs', 'abc'], ['expression', ['ident_rhs', 'def']]],
      ['expression', ['ident_rhs', 'ghi']],
    ]],
  ], parse(`
    (abc = def, ghi)
  `));

  t.throws(() => parse(`
    ()
  `));

  t.throws(() => parse(`
    (abc = def)
  `));
});

test('list block', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['list_body']],
  ], parse(`
    []
  `));

  t.deepEqual([
    'call_body',
    ['expression', ['list_body',
      ['expression', ['ident_rhs', 'abc']],
      ['expression', ['ident_rhs', 'def']],
    ]],
  ], parse(`
    [abc, def]
  `));

  t.throws(() => parse(`
    [abc = def]
  `));
});

test('map block', t => {
  t.deepEqual([
    'call_body',
    ['expression', ['map_body']],
  ], parse(`
    {}
  `));

  t.deepEqual([
    'call_body',
    ['expression', ['map_body',
      ['statement', ['ident_lhs', 'abc'], ['expression', ['ident_rhs', 'def']]],
      ['statement', ['ident_lhs', 'ghi'], ['expression', ['ident_rhs', 'jkl']]],
    ]],
  ], parse(`
    {abc = def, ghi = jkl}
  `));

  t.deepEqual([
    'call_body',
    ['expression', ['map_body',
      ['getter', 'abc'],
    ]],
  ], parse(`
    {abc}
  `));
});

test('unit expressions', t => {
  t.deepEqual(parse(`
    123km
  `), parse(`
    123 * km
  `));
});

/*
try {
  const res = JSONParser.grammar(text);
  prettyPrint(res);
} catch (e) {
  if (e.result) {
    console.error(text.substr(e.result.furthest, 100));
    console.error(P.formatError(text, e.result));
  } else {
    console.log(e);
  }
}
*/
