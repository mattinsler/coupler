fs = require 'fs'

_ = require 'underscore'
protocols = require './protocols'
Acceptor = require './acceptor'
Connector = require './connector'
TransportProtocolStack = require './transport_protocol_stack'

class Connection
  constructor: (@coupler) ->
  
  set_transport: (@transport) ->
    @stack = new TransportProtocolStack(@transport)
    
    @stack.use(protocols.json())
    @stack.use(@coupler.services)
  
  consume: (service_name) ->
    @coupler.services.consume(service_name)

class Coupler
  constructor: ->
    @acceptors = []
    # @connectors = []
    @services = {}
    @connections = []
    @services = protocols.service()
  
  accept: (opts = {}) ->
    for k, v of opts
      acc = Acceptor.accept(k, v)
      acc.container = @
      acc.on 'connection', (transport) =>
        connection = new Connection(@)
        connection.set_transport(transport)
        @connections.push(connection)
      acc.open()
      @acceptors.push(acc)
    @
  
  connect: (opts = {}) ->
    keys = _(opts).keys()
    throw new Error('Can only connect to one endpoint at a time') unless keys.length is 1
    
    type = keys[0]
    connection = new Connection(@)
    
    con = Connector.connector(type, opts[type])
    con.container = @
    con.once 'connection', (transport) =>
      connection.set_transport(transport)
      @connections.push(connection)
    con.open()
    
    connection
  
  provide: (opts) ->
    @services.provide(opts)



coupler = module.exports = -> new Coupler()
coupler.connect = -> new Coupler().connect(arguments...)
coupler.accept = -> new Coupler().accept(arguments...)

for file in fs.readdirSync(__dirname + '/transports')
  require(__dirname + '/transports/' + file) if /\.js$/.test(file)
