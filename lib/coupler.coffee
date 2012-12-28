fs = require 'fs'

_ = require 'underscore'
events = require 'events'
protocols = require './protocols'
Acceptor = require './acceptor'
Connector = require './connector'
TransportProtocolStack = require './transport_protocol_stack'

class Connection extends events.EventEmitter
  constructor: (@coupler, @initiator) ->
    @has_been_connected = false
    
    @stack = new TransportProtocolStack()
    @stack.use(protocols.json())
    @stack.use(@coupler.services)
    @stack.on 'disconnected', => @reconnect()
    
    @initiator.on 'connection', (transport) =>
      @transport = transport
      @stack.transport = @transport
      
      @stack.emit('reconnected') if @has_been_connected
      
      @has_been_connected = true
    
    @initiator.on 'error', (err) =>
      return @reconnect() if err.code is 'ECONNREFUSED'
      console.log err.code
  
  start: ->
    if @has_been_connected
      @stack.emit('reconnecting')
    else
      @stack.emit('connecting')
    @initiator.open()
  
  stop: ->
    @initiator.close()
    @transport.close()
  
  reconnect: ->
    if @initiator.supports_reconnect
      # console.log 'Reconnecting in ' + @coupler.options.reconnection_interval + 'ms...'
      setTimeout =>
        @start()
      , @coupler.options.reconnection_interval
    else
      # @stack.emit('disconnected')
      @emit('disconnected')
  
  consume: (service_name) ->
    @coupler.services.consume(service_name)

class Coupler
  constructor: ->
    @connections = []
    @services = protocols.service()
    @options = {
      reconnection_interval: 1000
    }
  
  accept: (opts = {}) ->
    for k, v of opts
      connection = new Connection(@, Acceptor.accept(k, v))
      connection.on 'disconnected', =>
        @connections = @connections.filter (c) -> c isnt connection
      @connections.push(connection)
      
      connection.start()
    @
  
  connect: (opts = {}) ->
    keys = _(opts).keys()
    throw new Error('Can only connect to one endpoint at a time') unless keys.length is 1
    
    type = keys[0]
    connection = new Connection(@, Connector.connector(type, opts[type]))
    connection.on 'disconnected', =>
      @connections = @connections.filter (c) -> c isnt connection
    @connections.push(connection)
    
    connection.start()
    connection
  
  provide: (opts) ->
    @services.provide(opts)
  
  disconnect: ->
    c.stop() for c in @connections



coupler = module.exports = -> new Coupler()
coupler.connect = -> new Coupler().connect(arguments...)
coupler.accept = -> new Coupler().accept(arguments...)

coupler.version = require('../package').version

coupler.Acceptor = require './acceptor'
coupler.Connector = require './connector'
coupler.Coupler = Coupler
coupler.Connection = Connection
coupler.ProtocolStack = require './protocol_stack'
coupler.Sanitizer = require './sanitizer'
coupler.Transport = require './transport'
coupler.TransportProtocolStack = require './transport_protocol_stack'

for file in fs.readdirSync(__dirname + '/transports')
  require(__dirname + '/transports/' + file) if /\.js$/.test(file)
