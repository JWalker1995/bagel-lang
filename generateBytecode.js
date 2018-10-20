const generateBytecode = async rootNode => {
  const ops = [];
  const existing = {};
  const writeCmd = (...args) => {
    args = args.map(a => a === undefined ? null : a);
    const key = args.join(',');
    if (!existing.hasOwnProperty(key)) {
      existing[key] = ops.length;
      ops.push(args);
    }
    return existing[key];
  };

  const nodeGenerators = {
    number: node => writeCmd('float_lit', node.sign, node.const_value !== undefined ? node.const_value.toString() : node.int, node.frac, node.expSign, node.expInt),
    number_add: node => writeCmd('float_add', generateNode(node.lhs), generateNode(node.rhs)),
    number_sub: node => writeCmd('float_sub', generateNode(node.lhs), generateNode(node.rhs)),
    number_mul: node => writeCmd('float_mul', generateNode(node.lhs), generateNode(node.rhs)),
    number_div: node => writeCmd('float_div', generateNode(node.lhs), generateNode(node.rhs)),
    number_rem: node => writeCmd('float_rem', generateNode(node.lhs), generateNode(node.rhs)),
    number_pow: node => writeCmd('float_pow', generateNode(node.lhs), generateNode(node.rhs)),
  };

  const generateNode = async node => {
    node = await node;
    return nodeGenerators[node.tag](node);
  };

  const resultIndex = await generateNode(rootNode);

  return {
    ops,
    resultIndex,
  };
};

module.exports = generateBytecode;


/*
Code needs to end up as an acyclic graph that can be mutated
Some subgraphs will only need to be executed under certain conditions

Haxe - Complicated and big
Neko - Slow float operations
LLVM - Complicated and big
Terra - Complicated, not sure how its meta-compilation feature would be useful
Parrot - A viable option, but somewhat complicated
WebAssembly - Young
Impala - Compiles to parallel, but complicated
Lua - Simple, fast, mature

Lua performance:
  Local variables
  Use decision tables
  Memoize
  Dedup code
*/
