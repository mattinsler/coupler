traverse = require 'traverse'

class Sanitizer
  constructor: (context) ->
    @context ?= {}
    @context.buffered_methods = {}
    @context.buffered_method_idx = 1000
    
    Object.defineProperty @, 'methods', {
      get: -> @context.buffered_methods
    }
  
  sanitize: (obj) ->
    methods = []
    circular = []
    context = @context
    
    new_obj = traverse(obj).map ->
      if @circular
        circular.push([@path, @circular])
        @update(0)

      if typeof @node is 'function'
        idx = ++context.buffered_method_idx
        context.buffered_methods[idx] = @node
        methods.push([@path, idx])
        @update(1)
    
    {
      $d: new_obj
      $m: methods
      $c: circular
    }
  
  desanitize: (obj, call_method) ->
    context = @context

    t = traverse(obj.$d)
    obj.$c.forEach (c) ->
      t.set(c[0], t.get(c[1]))

    obj.$m.forEach (m) ->
      callback = -> call_method(m[1], Array::slice.call(arguments))
      t.set(m[0], callback)

    obj.$d
    

module.exports = (context) -> new Sanitizer(context)
