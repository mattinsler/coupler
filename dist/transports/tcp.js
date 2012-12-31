(function() {
  var Acceptor, Connector, TcpAcceptor, TcpConnector, TcpTransport, Transport, net, parse_connection_string,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  net = require('net');

  Acceptor = require('../acceptor');

  Connector = require('../connector');

  Transport = require('../transport');

  TcpTransport = (function(_super) {

    __extends(TcpTransport, _super);

    TcpTransport.Events = ['data', 'end', 'error', 'close', 'drain', 'pipe'];

    function TcpTransport(socket) {
      this.socket = socket;
      TcpTransport.__super__.constructor.apply(this, arguments);
      this.buffer = new Buffer(0);
      this._connect_events(this.socket);
    }

    TcpTransport.prototype.close = function() {
      this.removeAllListeners();
      return this.socket.destroy();
    };

    TcpTransport.prototype._connect_events = function(socket) {
      var _this = this;
      return TcpTransport.Events.forEach(function(evt) {
        if (_this['handle_' + evt] != null) {
          return socket.on(evt, _this['handle_' + evt].bind(_this, socket));
        }
      });
    };

    TcpTransport.prototype.handle_data = function(socket, buffer) {
      var read_packet_from_buffer, _results,
        _this = this;
      this.buffer = Buffer.concat([this.buffer, buffer]);
      read_packet_from_buffer = function() {
        var length, packet, packet_buffer;
        if (_this.buffer.length < 4) {
          return false;
        }
        length = _this.buffer.readUInt32BE(0);
        if (_this.buffer.length < (4 + length)) {
          return false;
        }
        packet_buffer = _this.buffer.slice(0, 4 + length);
        packet = packet_buffer.slice(4);
        _this.buffer = _this.buffer.slice(4 + length);
        _this.emit('packet', {
          buffer: packet_buffer,
          packet: packet
        });
        return true;
      };
      _results = [];
      while (read_packet_from_buffer()) {
        _results.push(true);
      }
      return _results;
    };

    TcpTransport.prototype.handle_error = function(socket, err) {
      return this.emit('error', err);
    };

    TcpTransport.prototype.handle_end = function() {
      return this.emit('end');
    };

    TcpTransport.prototype.handle_close = function() {
      return this.emit('disconnected');
    };

    TcpTransport.prototype.write_packet = function(data) {
      var buffer, is_buffer;
      is_buffer = Buffer.isBuffer(data);
      if (!is_buffer) {
        data = data.toString();
      }
      buffer = new Buffer(4 + data.length);
      buffer.writeUInt32BE(data.length, 0);
      if (is_buffer) {
        data.copy(buffer, 4);
      } else {
        buffer.write(data, 4);
      }
      return this.socket.write(buffer);
    };

    return TcpTransport;

  })(Transport);

  TcpAcceptor = (function(_super) {

    __extends(TcpAcceptor, _super);

    function TcpAcceptor(port) {
      var _this = this;
      if (port == null) {
        throw new Error('TcpAcceptor must be passed a port');
      }
      this.server_opts = {
        port: port
      };
      this.server = net.createServer();
      ['listening', 'connection', 'close', 'error'].forEach(function(evt) {
        return _this.server.on(evt, function() {
          var _name;
          return typeof _this[_name = 'handle_' + evt] === "function" ? _this[_name].apply(_this, arguments) : void 0;
        });
      });
    }

    TcpAcceptor.prototype.open = function() {
      return this.server.listen(this.server_opts.port);
    };

    TcpAcceptor.prototype.close = function() {
      return this.server.destroy();
    };

    TcpAcceptor.prototype.handle_error = function(err) {
      return this.emit('error', err);
    };

    TcpAcceptor.prototype.handle_connection = function(socket) {
      var transport;
      transport = new TcpTransport(socket);
      return this.accept_transport(transport);
    };

    return TcpAcceptor;

  })(Acceptor);

  Acceptor.register('tcp', TcpAcceptor);

  parse_connection_string = function(connection_string) {
    var host, port, _ref;
    if (typeof connection_string === 'number') {
      return {
        port: connection_string
      };
    } else if (typeof connection_string === 'string') {
      _ref = connection_string.split(':'), host = _ref[0], port = _ref[1];
      if (port != null) {
        return {
          host: host,
          port: parseInt(port)
        };
      }
      if (parseInt(host).toString() === host.toString()) {
        return {
          port: parseInt(host)
        };
      }
      return {
        path: connection_string
      };
    }
  };

  TcpConnector = (function(_super) {

    __extends(TcpConnector, _super);

    TcpConnector.Events = ['connect', 'data', 'end', 'timeout', 'drain', 'error', 'close'];

    TcpConnector.prototype.supports_reconnect = true;

    function TcpConnector(connection_string) {
      if (connection_string == null) {
        throw new Error('TcpConnector must be passed a connection string');
      }
      this.sockets = [];
      this.connection_opts = parse_connection_string(connection_string);
    }

    TcpConnector.prototype._connect_events = function(socket) {
      var _this = this;
      return TcpConnector.Events.forEach(function(evt) {
        if (_this['handle_' + evt] != null) {
          return socket.on(evt, _this['handle_' + evt].bind(_this, socket));
        }
      });
    };

    TcpConnector.prototype.open = function() {
      var socket;
      socket = net.connect(this.connection_opts);
      this._connect_events(socket);
      return this.sockets.push(socket);
    };

    TcpConnector.prototype.close = function() {
      var s, _i, _len, _ref, _results;
      _ref = this.sockets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        s = _ref[_i];
        _results.push(s.destroy());
      }
      return _results;
    };

    TcpConnector.prototype.handle_error = function(socket, err) {
      return this.emit('error', err);
    };

    TcpConnector.prototype.handle_close = function(socket) {
      return this.sockets = this.sockets.filter(function(s) {
        return s !== socket;
      });
    };

    TcpConnector.prototype.handle_connect = function(socket) {
      var transport;
      transport = new TcpTransport(socket);
      return this.connect_transport(transport);
    };

    return TcpConnector;

  })(Connector);

  Connector.register('tcp', TcpConnector);

}).call(this);
