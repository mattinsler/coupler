(function() {
  var ConnectionEmitter, RpcClientProtocol, RpcServerProtocol, Sanitizer, events, _,
    __slice = [].slice;

  _ = require('underscore');

  events = require('events');

  Sanitizer = require('../sanitizer');

  ConnectionEmitter = require('../connection_emitter');

  RpcClientProtocol = (function() {

    function RpcClientProtocol(name) {
      var _this = this;
      this.name = name;
      this.sanitizer = new Sanitizer();
      this.client = new ConnectionEmitter();
      this.client.__rpc_queue = [];
      this.client.on('connected', function() {
        return _this.flush_rpc_queue();
      });
    }

    RpcClientProtocol.prototype.initialize = function() {
      var _this = this;
      this.remote.on('connected', function(next) {
        return _this.remote.send({
          $m: 0
        });
      });
      return ['connecting', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach(function(evt) {
        return _this.remote.on(evt, function() {
          var args, next, _ref;
          next = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          (_ref = _this.client).emit.apply(_ref, [evt].concat(__slice.call(args)));
          return next();
        });
      });
    };

    RpcClientProtocol.prototype.execute_remote_method = function(method, id, args) {
      if (ConnectionEmitter.is_connected(this.client)) {
        return this.remote.send({
          $m: id,
          $a: args
        });
      } else {
        return this.client.__rpc_queue.push({
          method: method,
          id: id,
          args: args
        });
      }
    };

    RpcClientProtocol.prototype.flush_rpc_queue = function() {
      var _this = this;
      this.client.__rpc_queue.forEach(function(m) {
        return _this.remote.send({
          $m: m.id,
          $a: m.args
        });
      });
      return this.client.__rpc_queue = [];
    };

    RpcClientProtocol.prototype.set_remote_methods = function(methods) {
      var _this = this;
      this.remote_methods = methods;
      return _(this.remote_methods).each(function(method, id) {
        return _this.client[method] = function() {
          var args;
          args = _this.sanitizer.sanitize(Array.prototype.slice.call(arguments));
          return _this.execute_remote_method(method, id, args);
        };
      });
    };

    RpcClientProtocol.prototype.recv = function(data, next) {
      var args, method,
        _this = this;
      if (data.$r === 0) {
        this.set_remote_methods(data.$a);
        return this.client.emit('connected');
      }
      method = this.sanitizer.methods[data.$r];
      if (method == null) {
        return next();
      }
      args = this.sanitizer.desanitize(data.$a, function(method_id, args) {
        return next.send({
          $m: method_id,
          $a: _this.sanitizer.sanitize(args)
        });
      });
      return method.apply(null, args);
    };

    RpcClientProtocol.prototype.send = function(data, next) {
      return next();
    };

    return RpcClientProtocol;

  })();

  RpcServerProtocol = (function() {

    function RpcServerProtocol(name, service) {
      var get_methods, methods;
      this.name = name;
      this.service = service;
      this.sanitizer = new Sanitizer();
      get_methods = function(v) {
        return _(Object.getOwnPropertyNames(v).filter(function(m) {
          return typeof v[m] === 'function';
        })).without('constructor');
      };
      methods = get_methods(this.service);
      if (methods.length === 0) {
        methods = get_methods(this.service.__proto__);
      }
      methods = methods.sort().map(function(m, idx) {
        return [idx + 1, m];
      });
      this.methods = _(methods).inject(function(o, arr) {
        o[arr[0]] = arr[1];
        return o;
      }, {});
    }

    RpcServerProtocol.prototype.initialize = function() {
      var _this = this;
      return ['connected', 'disconnected'].forEach(function(evt) {
        return _this.remote.on(evt, function(next) {
          var conn, _base, _name, _ref, _ref1;
          conn = next.protocol_stack.transport.connection;
          if ((_ref = conn.__rpc__) == null) {
            conn.__rpc__ = {};
          }
          if ((_ref1 = (_base = conn.__rpc__)[_name = _this.name]) == null) {
            _base[_name] = {};
          }
          return _this.service.emit(evt, conn.__rpc__[_this.name]);
        });
      });
    };

    RpcServerProtocol.prototype.recv = function(data, next) {
      var args, method,
        _this = this;
      if (data.$m === 0) {
        return next.send({
          $r: 0,
          $a: this.methods
        });
      }
      if (data.$m >= 1000) {
        method = this.sanitizer.methods[data.$m];
      } else {
        method = this.methods[data.$m];
      }
      if (method == null) {
        return next();
      }
      args = this.sanitizer.desanitize(data.$a, function(method_id, args) {
        return next.send({
          $r: method_id,
          $a: _this.sanitizer.sanitize(args)
        });
      });
      if (typeof method === 'function') {
        return method.apply(null, args);
      } else if (typeof method === 'string') {
        return this.service[method].apply(next.protocol_stack.transport.connection.__rpc__[this.name], args);
      }
      return next();
    };

    RpcServerProtocol.prototype.send = function(data, next) {
      return next();
    };

    return RpcServerProtocol;

  })();

  module.exports = function(name, service) {
    if (service != null) {
      return new RpcServerProtocol(name, service);
    }
    return new RpcClientProtocol(service);
  };

}).call(this);
