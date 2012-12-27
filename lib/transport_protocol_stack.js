(function() {
  var ProtocolStack, TransportProtocolStack,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ProtocolStack = require('./protocol_stack');

  TransportProtocolStack = (function(_super) {

    __extends(TransportProtocolStack, _super);

    function TransportProtocolStack(transport) {
      var _this = this;
      this.transport = transport;
      TransportProtocolStack.__super__.constructor.apply(this, arguments);
      this.use({
        recv: function(data, next) {
          return next(null, data.packet);
        },
        send: function(data, next) {
          return _this.transport.write_packet(data);
        }
      });
      this.transport.on('packet', function(buffer) {
        return _this.recv(buffer);
      });
      this.transport.on('connected', function() {
        return _this.emit('connected', _this);
      });
      this.transport.on('close', function() {
        return _this.emit('disconnected', _this);
      });
      this.transport.on('error', function(err) {
        console.log(err.stack);
        return _this.emit('error', err);
      });
    }

    return TransportProtocolStack;

  })(ProtocolStack);

  module.exports = TransportProtocolStack;

}).call(this);
