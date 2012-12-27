(function() {
  var RpcClientProtocol, RpcServerProtocol, events, sanitizer, _;

  _ = require('underscore');

  events = require('events');

  sanitizer = require('../sanitizer');

  RpcClientProtocol = (function() {

    function RpcClientProtocol(name) {
      this.name = name;
      this.sanitizer = sanitizer();
      this.client = new events.EventEmitter();
    }

    RpcClientProtocol.prototype.initialize = function() {
      var _this = this;
      return this.remote.on('connected', function(next) {
        return _this.remote.send({
          $m: 0
        });
      });
    };

    RpcClientProtocol.prototype.recv = function(data, next) {
      var args, method,
        _this = this;
      if (data.$r === 0) {
        this.remote_methods = data.$a;
        _(this.remote_methods).each(function(method, id) {
          return _this.client[method] = function() {
            var args;
            args = _this.sanitizer.sanitize(Array.prototype.slice.call(arguments));
            return _this.remote.send({
              $m: id,
              $a: args
            });
          };
        });
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
      this.name = name;
      this.service = service;
      this.sanitizer = sanitizer();
      this.methods = _(this.service).methods().sort().map(function(m, idx) {
        return [idx + 1, m];
      });
      this.methods = _(this.methods).inject(function(o, arr) {
        o[arr[0]] = arr[1];
        return o;
      }, {});
    }

    RpcServerProtocol.prototype.recv = function(data, next) {
      var args, method, _ref,
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
        return (_ref = this.service)[method].apply(_ref, args);
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
