coupler = require '../lib/coupler'

echo_service = coupler.connect(tcp: 7070).consume('echo')

echo_service.on 'connected', ->
  console.log 'Calling echo'
  echo_service.echo 'Hello World!', (err, message) ->
    console.log message
