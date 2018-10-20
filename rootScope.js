const makeNative = obj => {
  if (obj instanceof Promise) {
    return obj;
  } else if (typeof obj === 'function') {
    return {
      tag: 'native',
      eval: (arg, resolveNode) => makeNative(obj(arg, resolveNode)),
    };
  } else if (typeof obj === 'number') {
    return {
      tag: 'number',
      const_value: BigInt(obj),
    };
  } else if (typeof obj === 'boolean') {
    return {
      tag: 'boolean',
      const_value: obj,
    };
  } else if (typeof obj.tag === 'string') {
    return obj;
  } else {
    throw new Error(`Don't know how to convert a ${JSON.stringify(obj)} to a native type}`);
  }
};


module.exports = {
  '#import': makeNative(async (str, resolveNode) => {
    str = await resolveNode(str);

    if (str.tag !== 'string') {
      throw new Error('Import path must be a string');
    }

    if (str.const_value === undefined) {
      throw new Error('Import path must be a compile-time constant');
    }

    const parts = str.const_value.split('.');

    return new Promise(resolve => setTimeout(() => resolve(str), 5000));
  }),
  mux: makeNative(cond => ifTrue => async (ifFalse, resolveNode) => {
    cond = await resolveNode(cond);

    if (cond.tag !== 'boolean') {
      throw new Error('Condition must be a boolean');
    }

    if (cond.const_value !== undefined) {
      return cond.const_value ? resolveNode(ifTrue) : resolveNode(ifFalse);
    }

    return {
      tag: 'mux',
      cond,
      ifTrue: resolveNode(ifTrue),
      ifFalse: resolveNode(ifFalse),
    };
  }),
  gt: makeNative(lhs => async (rhs, resolveNode) => {
    lhs = await resolveNode(lhs);
    rhs = await resolveNode(rhs);

    if (lhs.tag !== 'number') {
      throw new Error('Must be a number');
    }

    if (rhs.tag !== 'number') {
      throw new Error('Must be a number');
    }

    if (lhs.const_value !== undefined && rhs.const_value !== undefined) {
      return {
        tag: 'boolean',
        const_value: lhs.const_value > rhs.const_value,
      };
    }

    return {
      tag: 'number_gt',
      lhs,
      rhs,
    };
  }),
};
