(function() {
  var ProtocolStack, TransportProtocolStack,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ProtocolStack = require('./protocol_stack');

  TransportProtocolStack = (function(_super) {

    __extends(TransportProtocolStack, _super);

    function TransportProtocolStack(transport) {
      var _this = this;
      TransportProtocolStack.__super__.constructor.apply(this, arguments);
      Object.defineProperty(this, 'transport', {
        set: function(value) {
          return this.set_transport(value);
        },
        get: function() {
          return this._transport;
        }
      });
      this.use({
        recv: function(data, next) {
          return next(null, data.packet);
        },
        send: function(data, next) {
          return _this.transport.write_packet(data);
        }
      });
      this.transport = transport;
    }

    TransportProtocolStack.prototype.set_transport = function(transport) {
      var _this = this;
      if (this._transport != null) {
        this._transport.close();
      }
      this._transport = transport;
      if (transport == null) {
        return;
      }
      ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach(function(evt) {
        return transport.on(evt, _this.emit.bind(_this, evt));
      });
      return transport.on('packet', function(buffer) {
        return _this.recv(buffer);
      });
    };

    return TransportProtocolStack;

  })(ProtocolStack);

  module.exports = TransportProtocolStack;

}).call(this);
