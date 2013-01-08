(function() {
  var Acceptor, Connection, Connector, Coupler, TransportProtocolStack, coupler, events, file, fs, protocols, utils, _, _i, _len, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ = require('underscore');

  events = require('events');

  utils = require('./utils');

  protocols = require('./protocols');

  Acceptor = require('./acceptor');

  Connector = require('./connector');

  Connection = require('./connection');

  TransportProtocolStack = require('./transport_protocol_stack');

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
      var acceptor, k, v,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      for (k in opts) {
        v = opts[k];
        acceptor = Acceptor.accept(k, v);
        acceptor.on('connection', function(transport) {
          var conn, stack;
          conn = new Connection(_this, stack);
          conn.service_protocol = protocols.service(_this.services);
          stack = new TransportProtocolStack(transport);
          stack.initiator = acceptor;
          stack.connection = conn;
          _this.configure_protocol_stack(stack);
          stack.emit('connected');
          return _this.connections.push(conn);
        });
        acceptor.open();
      }
      return this;
    };

    Coupler.prototype.connect = function(opts) {
      var conn, connector, keys, reconnect, type,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      keys = _(opts).keys();
      if (keys.length !== 1) {
        throw new Error('Can only connect to one endpoint at a time');
      }
      type = keys[0];
      connector = Connector.connector(type, opts[type]);
      conn = new Connection(this);
      conn.service_protocol = protocols.service(this.services);
      reconnect = function() {
        if (connector.supports_reconnect) {
          return setTimeout(function() {
            return connector.open();
          }, _this.options.reconnection_interval);
        } else {
          return conn.emit('disconnected');
        }
      };
      connector.on('connection', function(transport) {
        var stack;
        stack = new TransportProtocolStack(transport);
        stack.initiator = connector;
        stack.connection = conn;
        _this.configure_protocol_stack(stack);
        stack.on('disconnected', function() {
          return reconnect();
        });
        conn.stack = stack;
        stack.emit('connected', conn.has_been_connected);
        if (conn.has_been_connected) {
          stack.emit('reconnected');
        }
        return conn.has_been_connected = true;
      });
      connector.on('error', function(err) {
        if (err.code === 'ECONNREFUSED') {
          return reconnect();
        }
        return console.log(err.code);
      });
      connector.open();
      this.connections.push(conn);
      return conn;
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
      return stack.use(stack.connection.service_protocol);
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

  coupler.Acceptor = Acceptor;

  coupler.Connector = Connector;

  coupler.Coupler = Coupler;

  coupler.Connection = Connection;

  coupler.ConnectionEmitter = require('./connection_emitter');

  coupler.ProtocolStack = require('./protocol_stack');

  coupler.Sanitizer = require('./sanitizer');

  coupler.Transport = require('./transport');

  coupler.TransportProtocolStack = require('./transport_protocol_stack');

  fs = require('fs');

  _ref = fs.readdirSync(__dirname + '/transports');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    file = _ref[_i];
    if (/\.(js|coffee)$/.test(file)) {
      require(__dirname + '/transports/' + file);
    }
  }

}).call(this);
