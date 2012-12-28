_ = require 'underscore'
events = require 'events'
Sanitizer = require '../sanitizer'

class RpcClientProtocol
  constructor: (@name) ->
    @sanitizer = new Sanitizer()
    @client = new events.EventEmitter()
    
  initialize: ->
    @remote.on 'connected', (next) => @remote.send($m: 0)
    ['connecting', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach (evt) =>
      @remote.on evt, (next, args...) =>
        @client.emit(evt, args...)
        next()
        # @client.emit.bind(@client, evt))
  
  recv: (data, next) ->
    # console.log 'RpcClientProtocol:recv] ' + require('util').inspect(data)
    
    if data.$r is 0
      @remote_methods = data.$a
      
      _(@remote_methods).each (method, id) =>
        @client[method] = =>
          args = @sanitizer.sanitize(Array::slice.call(arguments))
          @remote.send($m: id, $a: args)
      
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
    @methods = _(@service).methods().sort().map (m, idx) -> [idx + 1, m]
    @methods = _(@methods).inject (o, arr) ->
      o[arr[0]] = arr[1]
      o
    , {}
  
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
      return @service[method](args...)
    
    next()
  
  send: (data, next) ->
    # console.log 'RpcServerProtocol:send] ' + require('util').inspect(data)
    next()

module.exports = (name, service) ->
  return new RpcServerProtocol(name, service) if service?
  new RpcClientProtocol(service)
