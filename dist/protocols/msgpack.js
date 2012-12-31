(function() {
  var msgpack;

  msgpack = require('msgpack3');

  module.exports = function() {
    return {
      recv: function(data, next) {
        return next(null, msgpack.unpack(data));
      },
      send: function(data, next) {
        return next(null, msgpack.pack(data));
      }
    };
  };

}).call(this);
