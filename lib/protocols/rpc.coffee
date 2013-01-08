_ = require 'underscore'
events = require 'events'
Sanitizer = require '../sanitizer'
ConnectionEmitter = require '../connection_emitter'

class RpcClientProtocol
  constructor: (@name) ->
    @sanitizer = new Sanitizer()
    @client = new ConnectionEmitter(
      connected: 'coupler:connected'
      disconnected: 'coupler:disconnected'
    )
    @client.__rpc_queue = []
    @client.on 'coupler:connected', => @flush_rpc_queue()
  
  initialize: ->
    @remote.on 'connected', =>
      @remote.send($m: 0)
    
    ['connecting', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach (evt) =>
      @remote.on evt, (next, args...) =>
        @client.emit('coupler:' + evt, args...)
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
      return @client.emit('coupler:connected')
    
    method = @sanitizer.methods[data.$r]
    return next() unless method?
    
    args = @sanitizer.desanitize data.$a, (method_id, args) =>
      next.send($m: method_id, $a: @sanitizer.sanitize(args))
    
    method(args...)
  
  send: (data, next) ->
    # console.log 'RpcClientProtocol:send] ' + require('util').inspect(data)
    next()



get_instance_methods = (instance) ->
  get_methods = (v) ->
    _(Object.getOwnPropertyNames(v).filter (m) -> typeof v[m] is 'function').without('constructor')

  methods = get_methods(instance)
  methods = get_methods(instance.__proto__) if methods.length is 0

  methods = methods.sort().map (m, idx) -> [idx + 1, m]
  _(methods).inject (o, arr) ->
    o[arr[0]] = arr[1]
    o
  , {}

class RpcServerProtocol
  class MethodService
    constructor: (service_initializer) ->
      @emitter = new ConnectionEmitter(
        connected: 'coupler:connected'
        disconnected: 'coupler:disconnected'
      )
      @service = service_initializer(@emitter)
      @methods = get_instance_methods(@service)
    emit: (event) ->
      @emitter.emit(event)
    call_method: (method, args) ->
      @service[method](args...)
  
  class InstanceService
    constructor: (instance) ->
      @context = {}
      @service = instance
      @methods = get_instance_methods(@service)
      if @service.__options__.events?
        @service.__options__.events.connected = 'coupler:connected'
        @service.__options__.events.disconnected = 'coupler:disconnected'
    emit: (event) ->
      @service.emit?(event, @context)
    call_method: (method, args) ->
      @service[method].apply(@context, args)
  
  
  constructor: (@name, @service) ->
    @sanitizer = new Sanitizer()
  
  initialize: ->
    ['connected', 'disconnected'].forEach (evt) =>
      @remote.on evt, (next) =>
        # console.log 'RpcServerProtocol] emit ' + evt
        conn = next.protocol_stack.connection
        conn.__rpc__ ?= {}
        rpc_instance = conn.__rpc__[@name]
        
        unless rpc_instance?
          if typeof @service is 'function'
            rpc_instance = conn.__rpc__[@name] = new MethodService(@service)
          else
            rpc_instance = conn.__rpc__[@name] = new InstanceService(@service)
        
        rpc_instance.emit('coupler:' + evt)
  
  recv: (data, next) ->
    # console.log 'RpcServerProtocol:recv] ' + require('util').inspect(data)
    
    rpc_instance = next.protocol_stack.connection.__rpc__[@name]
    
    if data.$m is 0
      return next.send($r: 0, $a: rpc_instance.methods)
    
    if data.$m >= 1000
      method = @sanitizer.methods[data.$m]
    else
      method = rpc_instance.methods[data.$m]
    return next() unless method?
    
    args = @sanitizer.desanitize data.$a, (method_id, args) =>
      next.send($r: method_id, $a: @sanitizer.sanitize(args))
    
    if typeof method is 'function'
      return method(args...)
    else if typeof method is 'string'
      rpc_instance.call_method(method, args)
    
    next()
  
  send: (data, next) ->
    # console.log 'RpcServerProtocol:send] ' + require('util').inspect(data)
    next()

module.exports = (name, service) ->
  return new RpcServerProtocol(name, service) if service?
  new RpcClientProtocol(service)
