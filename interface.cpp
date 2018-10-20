
/*
// component.bgl
func a b = a + b
main in = {
  result = func in.A in.B
}

// runner.bgl
component = #include "component.bgl"


main {a} = (
  in = {A = a, B = -1234.5678e-12}
  out = component in
  {
    result = out.result
  }
)
*/

'->' {
  in: {
    "a": 'float',
    "b.x": 'float', // ?
  },
  out: {
    "result": 'float',
    "result.x": 'float', // ?
  },
  code: '#include "wrapper.bgl" (#include "component.bgl")',
}

'<-' [
  {type: 'float_in', key: 'a'},
  {type: 'float_lit', sign: '-', int: '1234', frac: '5678', expSign: '-', expInt: '12'},
  {type: 'float_add', args: [0, 1]},
  {type: 'float_out', args: [2]},
]


class Runner {
public:
  void makeGraph(Graph *graph, Ast &ast) {
  }

private:
  Vm vm;

  float *someChangableProperty;
};
