EventEmitter = require('events').EventEmitter

class ConnectionEmitter extends EventEmitter
  @is_connected: (emitter) ->
    emitter._emitter_state?.connected is true
  
  @is_disconnected: (emitter) ->
    emitter._emitter_state?.connected is false
  
  @follow: (dest, src) ->
    Object.defineProperty src, '_emitter_state', {
      get: ->
        dest._emitter_state
      enumerable: true
    }
  
  @inject_into: (emitter) ->
    return emitter if emitter instanceof ConnectionEmitter
    
    c = emitter
    c = c.__proto__ while c.__proto__ isnt EventEmitter.prototype
    c.__proto__ = new ConnectionEmitter()
    
    emitter._emitter_state = {
      emitted: {}
    }
    
    emitter
  
  constructor: (follow_emitter) ->
    super
    
    if follow_emitter?
      Object.defineProperty @, '_emitter_state', {
        get: ->
          follow_emitter._emitter_state
        enumerable: true
      }
    else
      @_emitter_state = {
        emitted: {}
      }
  
  _handle_add_listener: (event, handler) ->    
    if event is 'connected' and ConnectionEmitter.is_connected(@)
      return process.nextTick => handler(@_emitter_state.emitted['connected']...)
    if event is 'disconnected' and ConnectionEmitter.is_disconnected(@)
      return process.nextTick => handler(@_emitter_state.emitted['disconnected']...)
    false
  
  on: (event, handler) ->
    # console.log 'on ' + event
    @_handle_add_listener(event, handler)
    EventEmitter::on.apply(@, arguments)
  
  addListener: (event, handler) ->
    @_handle_add_listener(event, handler)
    EventEmitter::addListener.apply(@, arguments)
  
  once: (event, handler) ->
    return if @_handle_add_listener(event, handler)
    EventEmitter::once.apply(@, arguments)
  
  emit: (event, args...) ->
    # console.log 'emit ' + event
    
    unless Object.getOwnPropertyDescriptor(@, '_emitter_state').get?
      switch event
        when 'connected' then @_emitter_state.connected = true
        when 'disconnected' then @_emitter_state.connected = false
    
      @_emitter_state.emitted[event] = args
    
    EventEmitter::emit.apply(@, arguments)

module.exports = ConnectionEmitter
