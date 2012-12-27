(function() {
  var Acceptor, Connection, Connector, Coupler, TransportProtocolStack, coupler, file, fs, protocols, _, _i, _len, _ref;

  fs = require('fs');

  _ = require('underscore');

  protocols = require('./protocols');

  Acceptor = require('./acceptor');

  Connector = require('./connector');

  TransportProtocolStack = require('./transport_protocol_stack');

  Connection = (function() {

    function Connection(coupler) {
      this.coupler = coupler;
    }

    Connection.prototype.set_transport = function(transport) {
      this.transport = transport;
      this.stack = new TransportProtocolStack(this.transport);
      this.stack.use(protocols.json());
      return this.stack.use(this.coupler.services);
    };

    Connection.prototype.consume = function(service_name) {
      return this.coupler.services.consume(service_name);
    };

    return Connection;

  })();

  Coupler = (function() {

    function Coupler() {
      this.acceptors = [];
      this.services = {};
      this.connections = [];
      this.services = protocols.service();
    }

    Coupler.prototype.accept = function(opts) {
      var acc, k, v,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      for (k in opts) {
        v = opts[k];
        acc = Acceptor.accept(k, v);
        acc.container = this;
        acc.on('connection', function(transport) {
          var connection;
          connection = new Connection(_this);
          connection.set_transport(transport);
          return _this.connections.push(connection);
        });
        acc.open();
        this.acceptors.push(acc);
      }
      return this;
    };

    Coupler.prototype.connect = function(opts) {
      var con, connection, keys, type,
        _this = this;
      if (opts == null) {
        opts = {};
      }
      keys = _(opts).keys();
      if (keys.length !== 1) {
        throw new Error('Can only connect to one endpoint at a time');
      }
      type = keys[0];
      connection = new Connection(this);
      con = Connector.connector(type, opts[type]);
      con.container = this;
      con.once('connection', function(transport) {
        connection.set_transport(transport);
        return _this.connections.push(connection);
      });
      con.open();
      return connection;
    };

    Coupler.prototype.provide = function(opts) {
      return this.services.provide(opts);
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

  _ref = fs.readdirSync(__dirname + '/transports');
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    file = _ref[_i];
    if (/\.js$/.test(file)) {
      require(__dirname + '/transports/' + file);
    }
  }

}).call(this);
