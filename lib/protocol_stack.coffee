events = require 'events'
ConnectionEmitter = require './connection_emitter'

class List
  @copy: (other) ->
    list = new List()
    node = other.head
    while node?
      list.append(node.data)
      node = node.next
    list
  
  class Node
    constructor: (@data) ->
      @length = 0
    
    insert_after: (node) ->
      if node instanceof List
        node = node.each_r (data) => @insert_after(data)
      else
        node = new Node(node) unless node instanceof Node
        node.list = @list
        node.next = @next
        node.prev = @
      
        @next?.prev = node
        @next = node
        
        ++@list.length
      
      node
    
    insert_before: (node) ->
      if node instanceof List
        node = node.each (data) => @insert_before(data)
      else
        node = new Node(node) unless node instanceof Node
        node.list = @list
        node.prev = @prev
        node.next = @
      
        @prev?.next = node
        @prev = node
        
        ++@list.length
        
      node
    
  constructor: ->
    @head = null
    @tail = null
  
  copy: ->
    List.copy(@)
  
  append: (data) ->
    node = new Node(data)
    node.list = @
    unless @tail?
      @head = @tail = node
      @length = 1
    else
      @tail.insert_after(node)
      @tail = node
    node
  
  prepend: (data) ->
    node = new Node(data)
    node.list = @
    unless @head?
      @head = @tail = node
      @length = 1
    else
      @head.insert_before(node)
      @head = node
    node
  
  each: (func) ->
    current = @head
    while current?
      func(current.data, current)
      current = current.next
  
  each_r: (func) ->
    current = @tail
    while current?
      func(current.data, current)
      current = current.prev


class ProtocolStack extends events.EventEmitter
  constructor: ->
    @stack = new List()
  
  use: (module) ->
    node = @stack.append(module)
    
    emitter = new ConnectionEmitter()
    module.remote = {
      protocol_stack: @
      
      __emitter__: emitter
      on: emitter.on.bind(emitter)
      once: emitter.once.bind(emitter)
      addListener: emitter.addListener.bind(emitter)
      removeListener: emitter.removeListener.bind(emitter)
      removeAllListeners: emitter.removeAllListeners.bind(emitter)
      listeners: emitter.listeners.bind(emitter)
      emit: emitter.emit.bind(emitter)
      
      send: (data) =>
        @send_step(node, data)
    }
    
    module.initialize?()
  
  _add_next_methods: (node, next, pipe_direction) ->
    next.send = (data) =>
      @send_step(node, data)
    
    next.recv = (data) =>
      @recv_step(node, data)
    
    next.emit = (event, args...) =>
      @emit_step(node, event, args...)
    
    next.pipe = (modules) =>
      modules = [modules] unless Array.isArray(modules)
      current = node
      for m in modules
        m = m.stack if m instanceof ProtocolStack
        current = current['insert_' + pipe_direction](m)
      next()
    
    next.protocol_stack = @
    next.data = node.list.data ?= {}
  
  recv_step: (node, buffer, callback) ->
    unless node?
      @emit('recv', buffer)
      return callback?(null, buffer)
    
    next = (err, new_buffer) =>
      if err?
        @emit('error', err)
        return callback?(err)
      buffer = new_buffer if new_buffer?
      @recv_step(node.next, buffer, callback)
    
    @_add_next_methods(node, next, 'after')
    
    if node.data.recv?
      node.data.recv(buffer, next)
    else
      next()
  
  recv: (buffer, callback) ->
    list = @stack.copy()
    @recv_step(list.head, buffer, callback)
  
  send_step: (node, buffer, callback) ->
    unless node?
      @emit('send', buffer)
      return callback?(null, buffer)
    
    next = (err, new_buffer) =>
      if err?
        @emit('error', err)
        return callback?(err)
      buffer = new_buffer if new_buffer?
      @send_step(node.prev, buffer, callback)
      
    @_add_next_methods(node, next, 'before')
    
    if node.data.send?
      node.data.send(buffer, next)
    else
      next()

  send: (buffer, callback) ->
    list = @stack.copy()
    @send_step(list.tail, buffer, callback)
  
  emit_step: (node, event, args...) ->
    return events.EventEmitter::emit.apply(@, [event].concat(args)) unless node?
    
    next = (err, new_event, new_args...) =>
      return console.error(err.stack) if err?
      if new_event?
        @emit_step(node.next, new_event, new_args...)
      else
        @emit_step(node.next, event, args...)
    
    @_add_next_methods(node, next, 'before')
    
    if node.data.remote.listeners(event).length > 0
      node.data.remote.emit(event, next, args...)
    else
      next()
    
  emit: (event, args...) ->
    list = @stack.copy()
    @emit_step(list.head, event, args...)

module.exports = ProtocolStack
