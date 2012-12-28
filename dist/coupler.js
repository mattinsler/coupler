(function() {
  var Acceptor, Connection, Connector, Coupler, TransportProtocolStack, coupler, events, file, fs, protocols, _, _i, _len, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  fs = require('fs');

  _ = require('underscore');

  events = require('events');

  protocols = require('./protocols');

  Acceptor = require('./acceptor');

  Connector = require('./connector');

  TransportProtocolStack = require('./transport_protocol_stack');

  Connection = (function(_super) {

    __extends(Connection, _super);

    function Connection(coupler, initiator) {
      var _this = this;
      this.coupler = coupler;
      this.initiator = initiator;
      this.has_been_connected = false;
      this.stack = new TransportProtocolStack();
      this.stack.use(protocols.json());
      this.stack.use(this.coupler.services);
      this.stack.on('disconnected', function() {
        return _this.reconnect();
      });
      this.initiator.on('connection', function(transport) {
        _this.transport = transport;
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

  Coupler = (function() {

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
        connection.on('disconnected', function() {
          return _this.connections = _this.connections.filter(function(c) {
            return c !== connection;
          });
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
      return this.services.provide(opts);
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

    return Coupler;

  })();

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

  coupler.version = require('../package').version;

  coupler.Acceptor = require('./acceptor');

  coupler.Connector = require('./connector');

  coupler.Coupler = Coupler;

  coupler.Connection = Connection;

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
