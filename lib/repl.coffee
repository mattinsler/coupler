repl = require 'repl'
coupler = require './coupler'

class REPL
  constructor: ->
    @connection = null
    @consumed_service = null
    @methods = {
      exit: (callback) -> process.exit()

      connect: (callback, address) ->
        consumed_service = null
        connection = coupler.connect(tcp: address)
        connection.on 'error', (err) ->
          callback(err.stack)
        connection.on 'connected', ->
          callback(null, 'Connected!')

      list: (callback, type) ->
        return callback('Must be connected first') unless connection?

        unless type?
          type = if consumed_service? then 'commands' else 'services'

        switch type
          when 'services'
            s = connection.consume(0)
            s.on 'coupler:connected', ->
              s.list (list) ->
                callback(null, list.join('\n'))
          when 'commands'
            callback(null, consumed_service.__methods__.join(', '))
          else
            help(callback, list)

      consume: (callback, service_name) ->
        return callback('Must be connected first') unless connection?

        consumed_service = connection.consume(service_name)
        consumed_service.on 'coupler:connected', ->
          callback(null, 'Consuming ' + service_name)

      call: (callback, method, args...) ->
        return callback('Must be connected first') unless connection?
        return callback('Must consume a service first') unless consumed_service?

        has_callback = false
        args = args.map (a) ->
          if a is '$_'
            has_callback = true
            return callback
          a

        result = consumed_service[method](args...)
        callback(null, result) unless has_callback

      help: (callback, command) ->
        COMMANDS = {
          call: 'call service-method arguments...'
          connect: 'connect address'
          consume: 'consume service'
          exit: 'exit'
          list: 'list [services|commands]'
        }

        return callback(null, _(COMMANDS).keys().join(', ')) unless command?
        return callback(null, COMMANDS[command]) if COMMANDS[command]?
        callback('Unknown command: ' + command)
    }
  
  start: ->
    return if @repl?
    
    @repl = repl.start(
      prompt: '$ '
      terminal: true
      eval: (command, context, filename, callback) ->
        command = command[1...command.length - 2].trim()
        args = command.split(new RegExp(' +'))
        cmd = args[0]
        args.shift()
    
        return callback() if cmd is '' and args.length is 0
        return callback(null, 'Unknown Command ' + cmd) unless @methods[cmd]?
    
        @methods[cmd](callback, args...)
    )

    @repl.on 'exit', ->
      @methods.exit()

module.exports = REPL
