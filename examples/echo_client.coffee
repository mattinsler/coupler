coupler = require 'coupler'

echo_service = coupler.connect(tcp: 7070).consume('echo')

echo_service.on 'connected', ->
  console.log 'CONNECTED'
  
  echo_service.echo 'Hello World!', (err, message, cb) ->
    console.log message
    cb?(null, 'PONG: ' + message)
    # c.disconnect()

echo_service.on 'disconnected', ->
  console.log 'DISCONNECTED'

echo_service.on 'reconnected', ->
  console.log 'RECONNECTED'

echo_service.on 'connecting', ->
  console.log 'CONNECTING'

echo_service.on 'reconnecting', ->
  console.log 'RECONNECTING'
