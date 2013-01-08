(function() {
  var ConnectionEmitter, ProtocolStack, TransportProtocolStack,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  ProtocolStack = require('./protocol_stack');

  ConnectionEmitter = require('./connection_emitter');

  TransportProtocolStack = (function(_super) {

    __extends(TransportProtocolStack, _super);

    function TransportProtocolStack(transport) {
      var _this = this;
      TransportProtocolStack.__super__.constructor.call(this);
      ConnectionEmitter.inject_into(this);
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
      if (transport != null) {
        this._transport = transport;
        this.attach_to_transport(this._transport);
      }
    }

    TransportProtocolStack.prototype.attach_to_transport = function(transport) {
      var _this = this;
      if (transport.protocol_stack != null) {
        return;
      }
      transport.protocol_stack = this;
      ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach(function(evt) {
        return transport.on(evt, function() {
          return _this.emit.apply(_this, [evt].concat(__slice.call(arguments)));
        });
      });
      return transport.on('packet', function(buffer) {
        return _this.recv(buffer);
      });
    };

    TransportProtocolStack.prototype.set_transport = function(transport) {
      if (this._transport != null) {
        this._transport.close();
      }
      this._transport = transport;
      if (transport == null) {
        return;
      }
      return this.attach_to_transport(transport);
    };

    TransportProtocolStack.prototype.build_remote = function(module, node) {
      var _this = this;
      module.remote = {
        protocol_stack: this,
        __emitter__: new ConnectionEmitter(),
        send: function(data) {
          return _this.send_step(node, data);
        }
      };
      module.remote.on = module.remote.__emitter__.on.bind(module.remote.__emitter__);
      module.remote.once = module.remote.__emitter__.once.bind(module.remote.__emitter__);
      module.remote.addListener = module.remote.__emitter__.addListener.bind(module.remote.__emitter__);
      module.remote.removeListener = module.remote.__emitter__.removeListener.bind(module.remote.__emitter__);
      module.remote.removeAllListeners = module.remote.__emitter__.removeAllListeners.bind(module.remote.__emitter__);
      module.remote.listeners = module.remote.__emitter__.listeners.bind(module.remote.__emitter__);
      return module.remote.emit = module.remote.__emitter__.emit.bind(module.remote.__emitter__);
    };

    TransportProtocolStack.prototype.emit = function(event) {
      return ProtocolStack.prototype.emit.apply(this, arguments);
    };

    return TransportProtocolStack;

  })(ProtocolStack);

  module.exports = TransportProtocolStack;

}).call(this);
