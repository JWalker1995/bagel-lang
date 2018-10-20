const makeNumber = node => {
  const const_value = node.const_value !== undefined
    ? node.const_value
    : node.tag === 'number' && !node.frac && !node.expSign && !node.expInt
      ? BigInt((node.sign || '') + node.int)
      : undefined;

  const makeBinaryProp = (constEvaluator, runtimeOpcode) => ({
    tag: 'native',
    eval: (arg, resolveNode) => {
      arg = resolveNode(arg);
      if (constEvaluator && const_value !== undefined && arg.const_value !== undefined) {
        return makeNumber({
          tag: 'number',
          const_value: constEvaluator(const_value, arg.const_value),
        });
      } else {
        return makeNumber({
          tag: runtimeOpcode,
          lhs: node,
          rhs: arg,
        });
      }
    },
  });

  return {
    ...node,
    const_value,
    props: {
      plus: makeBinaryProp((a, b) => a + b, 'number_add'),
      minus: makeBinaryProp((a, b) => a - b, 'number_sub'),
      times: makeBinaryProp((a, b) => a * b, 'number_mul'),
      div: makeBinaryProp(undefined, 'number_div'),
      rem: makeBinaryProp(undefined, 'number_rem'),
      pow: makeBinaryProp(undefined, 'number_pow'),
    },
  };
};

module.exports = makeNumber;
