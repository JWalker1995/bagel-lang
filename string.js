const makeNumber = require('./number');


const makeString = node => {
  if (node.const_value === undefined) {
    throw new Error('Cannot make a runtime string');
  }

  return {
    ...node,
    props: {
      len: {
        tag: 'number',
        const_value: node.const_value.length,
      },
    },
  };
};

module.exports = makeString;
