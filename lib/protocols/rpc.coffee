_ = require 'underscore'
events = require 'events'
Sanitizer = require '../sanitizer'
ConnectionEmitter = require '../connection_emitter'

class RpcClientProtocol
  constructor: (@name) ->
    @sanitizer = new Sanitizer()
    @client = new ConnectionEmitter()
    @client.__rpc_queue = []
    @client.on 'connected', => @flush_rpc_queue()
  
  initialize: ->
    @remote.on 'connected', (next) =>
      @remote.send($m: 0)
    ['connecting', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach (evt) =>
      @remote.on evt, (next, args...) =>
        @client.emit(evt, args...)
        next()
        # @client.emit.bind(@client, evt))
  
  execute_remote_method: (method, id, args) ->
    if ConnectionEmitter.is_connected(@client)
      @remote.send($m: id, $a: args)
    else
      @client.__rpc_queue.push(method: method, id: id, args: args)
  
  flush_rpc_queue: ->
    @client.__rpc_queue.forEach (m) =>
      @remote.send($m: m.id, $a: m.args)
    @client.__rpc_queue = []
  
  set_remote_methods: (methods) ->
    @remote_methods = methods
    
    _(@remote_methods).each (method, id) =>
      @client[method] = =>
        args = @sanitizer.sanitize(Array::slice.call(arguments))
        @execute_remote_method(method, id, args)
  
  recv: (data, next) ->
    # console.log 'RpcClientProtocol:recv] ' + require('util').inspect(data)
    
    if data.$r is 0
      @set_remote_methods(data.$a)
      return @client.emit('connected')
    
    method = @sanitizer.methods[data.$r]
    return next() unless method?
    
    args = @sanitizer.desanitize data.$a, (method_id, args) =>
      next.send($m: method_id, $a: @sanitizer.sanitize(args))
    
    method(args...)
  
  send: (data, next) ->
    # console.log 'RpcClientProtocol:send] ' + require('util').inspect(data)
    next()

class RpcServerProtocol
  constructor: (@name, @service) ->
    @sanitizer = new Sanitizer()
    
    get_methods = (v) ->
      _(Object.getOwnPropertyNames(v).filter (m) -> typeof v[m] is 'function').without('constructor')
    
    methods = get_methods(@service)
    methods = get_methods(@service.__proto__) if methods.length is 0
    
    methods = methods.sort().map (m, idx) -> [idx + 1, m]
    @methods = _(methods).inject (o, arr) ->
      o[arr[0]] = arr[1]
      o
    , {}
  
  initialize: ->
    ['connected', 'disconnected'].forEach (evt) =>
      @remote.on evt, (next) =>
        conn = next.protocol_stack.transport.connection
        conn.__rpc__ ?= {}
        conn.__rpc__[@name] ?= {}
          
        @service.emit(evt, conn.__rpc__[@name])
  
  recv: (data, next) ->
    # console.log 'RpcServerProtocol:recv] ' + require('util').inspect(data)
    
    if data.$m is 0
      return next.send($r: 0, $a: @methods)
    
    if data.$m >= 1000
      method = @sanitizer.methods[data.$m]
    else
      method = @methods[data.$m]
    return next() unless method?
    
    args = @sanitizer.desanitize data.$a, (method_id, args) =>
      next.send($r: method_id, $a: @sanitizer.sanitize(args))
    
    if typeof method is 'function'
      return method(args...)
    else if typeof method is 'string'
      return @service[method].apply(next.protocol_stack.transport.connection.__rpc__[@name], args)
      # return @service[method](args...)
    
    next()
  
  send: (data, next) ->
    # console.log 'RpcServerProtocol:send] ' + require('util').inspect(data)
    next()

module.exports = (name, service) ->
  return new RpcServerProtocol(name, service) if service?
  new RpcClientProtocol(service)
