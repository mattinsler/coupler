msgpack = require 'msgpack3'

module.exports = ->
  {
    recv: (data, next) -> next(null, msgpack.unpack(data))
    send: (data, next) -> next(null, msgpack.pack(data))
  }
