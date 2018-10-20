const makeNumber = require('./number');
const makeString = require('./string');


const scopeParentKey = '%_base';

/*
let nextIndex = 0;
const objCache = {}
const dedup = obj => {
  // Disable for now
  return obj;

  if (obj._id) {
    return obj;
  }

  const key = JSON.stringify(obj, (key, value) => (value && value._id) || value);
  // console.log(objCache.hasOwnProperty(key), key);
  if (objCache.hasOwnProperty(key)) {
    return objCache[key];
  } else {
    Object.defineProperty(obj, '_id', {
      value: ++nextIndex,
      enumerable: false,
    });
    objCache[key] = obj;
    return obj;
  }
};
*/

const extendScope = (baseScope, newScope) => {
  if (!baseScope) {
    throw new Error('Cannot extend an undefined scope');
  }

  // A variable cannot be keyed "%_base"
  Object.defineProperty(newScope, scopeParentKey, {
    value: baseScope,
    enumerable: false,
  });
  return newScope;
};

const makeDotCall = (lhs, keyStr, rhs) => ({
  tag: 'call',
  lhs: {
    tag: 'dot',
    lhs,
    rhs: keyStr,
  },
  rhs,
});



const nodeResolvers = {
  native: node => node,
  ident_rhs: (node, scope) => {
    if (!scope) {
      throw new Error(`Cannot resolve ${node.keyStr} without a scope`);
    }

    do {
      if (Object.prototype.hasOwnProperty.call(scope, node.keyStr)) {
        const target = scope[node.keyStr];
        return resolveNode(target);
        // const res = scope[node.keyStr];
        // return res ? resolveNode(res, scope) : node;
      }
      scope = scope[scopeParentKey];
    } while (scope);

    throw new Error(`Cannot resolve property ${JSON.stringify(node.keyStr)}`);
  },
  number: (node, scope) => makeNumber(node),
  string: (node, scope) => makeString(node),
  arrow: (node, scope) => ({
    ...node,
    eval: arg => resolveNode(node.rhsExpr, {
      [node.lhsArgStr]: arg,
      [scopeParentKey]: scope,
    }),
  }),

  dot: async (node, scope) => {
    const obj = await resolveNode(node.lhs, scope);

    const res = (obj.props || {})[node.rhs];
    if (res === undefined) {
      throw new Error(`Property ${JSON.stringify(node.rhs)} does not exist`);
    }

    return resolveNode(res); // getProp?
  },
  call: async (node, scope) => {
    const func = await resolveNode(node.lhs, scope);

    if (typeof func.eval !== 'function') {
      throw new Error(`Cannot execute a ${JSON.stringify(func.tag)} as a function`);
    }

    return func.eval({
      ...node.rhs,
      boundScope: scope,
    }, resolveNode);
  },

  extension: (node, scope) => ({
    ...node,
    lhs: resolveNode(node.lhs, scope),
    rhs: resolveNode(node.rhs, scope),
  }),
  addition: (node, scope) => resolveNode(makeDotCall(node.lhs, 'plus', node.rhs), scope),
  subtraction: (node, scope) => resolveNode(makeDotCall(node.lhs, 'minus', node.rhs), scope),
  multiplication: (node, scope) => resolveNode(makeDotCall(node.lhs, 'times', node.rhs), scope),
  division: (node, scope) => resolveNode(makeDotCall(node.lhs, 'div', node.rhs), scope),
  remainder: (node, scope) => resolveNode(makeDotCall(node.lhs, 'rem', node.rhs), scope),
  exponentation: (node, scope) => resolveNode(makeDotCall(node.lhs, 'pow', node.rhs), scope),

  paren: (node, scope) => {
    const selfScope = extendScope(scope, {});
    node.statements.forEach(stmt => {
      if (Object.prototype.hasOwnProperty.call(selfScope, stmt.lhsPropStr)) {
        throw new Error(`Cannot re-declare property ${JSON.stringify(stmt.lhsPropStr)}`);
      }

      selfScope[stmt.lhsPropStr] = {
        ...stmt.rhsExpr,
        boundScope: stmt.tag === 'getter' ? scope : selfScope,
      };
    });

    return resolveNode(node.returnExpr, selfScope);
  },
  list: (node, scope) => node.items.forEach(item => resolveNode(item, scope)),
  map: (node, scope) => {
    const selfScope = extendScope(scope, {});
    node.statements.forEach(stmt => {
      if (Object.prototype.hasOwnProperty.call(selfScope, stmt.lhsPropStr)) {
        throw new Error(`Cannot re-declare property ${JSON.stringify(stmt.lhsPropStr)}`);
      }

      selfScope[stmt.lhsPropStr] = {
        ...stmt.rhsExpr,
        boundScope: stmt.tag === 'getter' ? scope : selfScope,
      };
    });

    return {
      ...node,
      props: selfScope,
    };
  },
};

const resolveNode = (node, scope) => nodeResolvers[node.tag](node, node.boundScope || scope);

// module.exports = (...args) => {const res = resolveNode(...args); console.log(objCache); return res;}
module.exports = resolveNode;
