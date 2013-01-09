# coupler = require 'coupler'
coupler = require '../lib/coupler'

c = coupler.connect(tcp: 7070)
d = coupler.connect(tcp: 7070)

s = c.consume(0)
s.on 'coupler:connected', ->
  s.list (list) ->
    console.log list

setTimeout ->
  s2 = d.consume(0)
  s2.on 'coupler:connected', ->
    s2.list (list) ->
      console.log list
, 2000

echo_service = d.consume('echo')

# conn = coupler.connect(tcp: 7070)
# 
# setTimeout ->
#   services = conn.consume(0)
#   console.log 'consumed'
#   
#   setTimeout  ->
#     services.on 'connected', ->
#       services.list (list) ->
#         console.log 'GOT SERVICE LIST BACK'
#         console.log list
#   , 2000
# , 2000

# echo_service = coupler.connect(tcp: 7070).consume('echo')
# 
echo_service.on 'coupler:connected', ->
  console.log 'CONNECTED'
  
  echo_service.echo 'Hello World!', (err, message, cb) ->
    console.log message
    cb?(null, 'PONG: ' + message)
#     # c.disconnect()
# 
# echo_service.on 'disconnected', ->
#   console.log 'DISCONNECTED'
# 
# echo_service.on 'reconnected', ->
#   console.log 'RECONNECTED'
# 
# echo_service.on 'connecting', ->
#   console.log 'CONNECTING'
# 
# echo_service.on 'reconnecting', ->
#   console.log 'RECONNECTING'
