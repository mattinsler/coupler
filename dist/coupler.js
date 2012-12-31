(function() {
  var Acceptor, Connection, Connector, Coupler, TransportProtocolStack, coupler, events, file, fs, intercept_events, protocols, _, _i, _len, _ref,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  _ = require('underscore');

  events = require('events');

  protocols = require('./protocols');

  Acceptor = require('./acceptor');

  Connector = require('./connector');

  TransportProtocolStack = require('./transport_protocol_stack');

  intercept_events = function(emitter, callback) {
    var _emit;
    _emit = emitter.emit;
    return emitter.emit = function() {
      if (typeof callback === "function") {
        callback.apply(null, [emitter].concat(__slice.call(arguments)));
      }
      return _emit.apply(emitter, arguments);
    };
  };

  Connection = (function(_super) {

    __extends(Connection, _super);

    function Connection(coupler, initiator) {
      var _this = this;
      this.coupler = coupler;
      this.initiator = initiator;
      this.has_been_connected = false;
      this.stack = new TransportProtocolStack();
      this.coupler.configure_protocol_stack(this.stack);
      this.stack.on('disconnected', function() {
        return _this.reconnect();
      });
      intercept_events(this.stack, function() {
        var args, emitter;
        emitter = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        return _this.emit.apply(_this, args);
      });
      this.initiator.on('connection', function(transport) {
        _this.transport = transport;
        _this.transport.connection = _this;
        _this.stack.transport = _this.transport;
        if (_this.has_been_connected) {
          _this.stack.emit('reconnected');
        }
        return _this.has_been_connected = true;
      });
      this.initiator.on('error', function(err) {
        if (err.code === 'ECONNREFUSED') {
          return _this.reconnect();
        }
        return console.log(err.code);
      });
    }

    Connection.prototype.start = function() {
      if (this.has_been_connected) {
        this.stack.emit('reconnecting');
      } else {
        this.stack.emit('connecting');
      }
      return this.initiator.open();
    };

    Connection.prototype.stop = function() {
      this.initiator.close();
      return this.transport.close();
    };

    Connection.prototype.reconnect = function() {
      var _this = this;
      if (this.initiator.supports_reconnect) {
        return setTimeout(function() {
          return _this.start();
        }, this.coupler.options.reconnection_interval);
      } else {
        return this.emit('disconnected');
      }
    };

    Connection.prototype.consume = function(service_name) {
      return this.coupler.services.consume(service_name);
    };

    return Connection;

  })(events.EventEmitter);

  Coupler = (function(_super) {

    __extends(Coupler, _super);

    function Coupler() {
      this.connections = [];
      this.services = protocols.service();
      this.options = {
        reconnection_interval: 1000
      };
    }

    Coupler.prototype.accept = function(opts) {
      var connection, k, v,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      for (k in opts) {
        v = opts[k];
        connection = new Connection(this, Acceptor.accept(k, v));
        intercept_events(connection, function() {
          var args, emitter;
          emitter = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          return _this.emit.apply(_this, __slice.call(args).concat([emitter]));
        });
        this.connections.push(connection);
        connection.start();
      }
      return this;
    };

    Coupler.prototype.connect = function(opts) {
      var connection, keys, type,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      keys = _(opts).keys();
      if (keys.length !== 1) {
        throw new Error('Can only connect to one endpoint at a time');
      }
      type = keys[0];
      connection = new Connection(this, Connector.connector(type, opts[type]));
      connection.on('disconnected', function() {
        return _this.connections = _this.connections.filter(function(c) {
          return c !== connection;
        });
      });
      this.connections.push(connection);
      connection.start();
      return connection;
    };

    Coupler.prototype.provide = function(opts) {
      this.services.provide(opts);
      return this;
    };

    Coupler.prototype.disconnect = function() {
      var c, _i, _len, _ref, _results;
      _ref = this.connections;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        _results.push(c.stop());
      }
      return _results;
    };

    Coupler.prototype.configure_protocol_stack = function(stack) {
      stack.use(protocols.msgpack());
      return stack.use(this.services);
    };

    return Coupler;

  })(events.EventEmitter);

  coupler = module.exports = function() {
    return new Coupler();
  };

  coupler.connect = function() {
    var _ref;
    return (_ref = new Coupler()).connect.apply(_ref, arguments);
  };

  coupler.accept = function() {
    var _ref;
    return (_ref = new Coupler()).accept.apply(_ref, arguments);
  };

  coupler.service = function(v) {
    var c;
    if (!_(v).isObject()) {
      throw new Error('Services must be an instance');
    }
    if (v instanceof events.EventEmitter) {
      return v;
    }
    c = v;
    while (c.__proto__ !== Object.prototype) {
      c = c.__proto__;
    }
    c.__proto__ = new events.EventEmitter();
    return v;
  };

  coupler.version = require('../package').version;

  coupler.Acceptor = require('./acceptor');

  coupler.Connector = require('./connector');

  coupler.Coupler = Coupler;

  coupler.Connection = Connection;

  coupler.ConnectionEmitter = require('./connection_emitter');

  coupler.ProtocolStack = require('./protocol_stack');

  coupler.Sanitizer = require('./sanitizer');

  coupler.Transport = require('./transport');

  coupler.TransportProtocolStack = require('./transport_protocol_stack');

  _ref = fs.readdirSync(__dirname + '/transports');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    file = _ref[_i];
    if (/\.js$/.test(file)) {
      require(__dirname + '/transports/' + file);
    }
  }

}).call(this);
