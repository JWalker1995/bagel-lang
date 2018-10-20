const parser = require('../../parser');
const run = require('../../run');
const generateBytecode = require('../../generateBytecode');
const generateJs = require('../../generateJs');
const rootScope = require('../../rootScope');

const show = obj => console.log(obj);

const code = `

core = #import "core.ast"

vec3 x y z = {
    x, y, z
    dot other = x * other.x + y * other.y + z * other.z
}

factorial n = mux (gt n 1) (n * (factorial (n - 1))) 1


obj = {
    a = b
    b = c
    c = d
    d = e
    e = f
    f = 5
}


y = x obj.a

// ...

x bla = bla + 10000 * (vec3 1 2 3).dot(vec3 4 5 6) + 1000000000 * factorial 2

(#import core).len

`;

(async () => {
    const syntaxTree = parser(code);
    const execTree = run(syntaxTree, rootScope);
    const bytecode = await generateBytecode(execTree);
    const js = generateJs(bytecode);
    console.log(js);
})();