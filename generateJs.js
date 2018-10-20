const opHandlers = {
  float_lit: op => `${op[1] || ''}${op[2]}${op[3] ? '.' + op[3] : ''}${op[5] ? 'e' + (op[4] || '') + op[5] : ''}`,
  float_add: op => `_${op[1]} + _${op[2]}`,
  float_sub: op => `_${op[1]} - _${op[2]}`,
  float_mul: op => `_${op[1]} * _${op[2]}`,
  float_div: op => `_${op[1]} / _${op[2]}`,
  float_rem: op => `_${op[1]} % _${op[2]}`,
  float_pow: op => `Math.pow(_${op[1]}, _${op[2]})`,
};

const generateJs = bytecode => bytecode.ops.map((op, index) => `const _${index} = ${opHandlers[op[0]](op)};`).join('\n');

module.exports = generateJs;
