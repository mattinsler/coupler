(function() {
  var ConnectionEmitter, RpcClientProtocol, RpcServerProtocol, Sanitizer, events, get_instance_methods, _,
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
      this.client = new ConnectionEmitter({
        connected: 'coupler:connected',
        disconnected: 'coupler:disconnected'
      });
      this.client.__rpc_queue = [];
      this.client.on('coupler:connected', function() {
        return _this.flush_rpc_queue();
      });
    }

    RpcClientProtocol.prototype.initialize = function() {
      var _this = this;
      this.remote.on('connected', function() {
        return _this.remote.send({
          $m: 0
        });
      });
      return ['connecting', 'disconnected', 'reconnected', 'reconnecting', 'error'].forEach(function(evt) {
        return _this.remote.on(evt, function() {
          var args, next, _ref;
          next = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          (_ref = _this.client).emit.apply(_ref, ['coupler:' + evt].concat(__slice.call(args)));
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
      this.client.__methods__ = _(methods).values().sort();
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
        return this.client.emit('coupler:connected');
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

  get_instance_methods = function(instance) {
    var get_methods, methods;
    get_methods = function(v) {
      return _(Object.getOwnPropertyNames(v).filter(function(m) {
        return typeof v[m] === 'function';
      })).without('constructor');
    };
    methods = get_methods(instance);
    if (methods.length === 0) {
      methods = get_methods(instance.__proto__);
    }
    methods = methods.sort().map(function(m, idx) {
      return [idx + 1, m];
    });
    return _(methods).inject(function(o, arr) {
      o[arr[0]] = arr[1];
      return o;
    }, {});
  };

  RpcServerProtocol = (function() {
    var InstanceService, MethodService;

    MethodService = (function() {

      function MethodService(service_initializer) {
        this.emitter = new ConnectionEmitter({
          connected: 'coupler:connected',
          disconnected: 'coupler:disconnected'
        });
        this.service = service_initializer(this.emitter);
        this.methods = get_instance_methods(this.service);
      }

      MethodService.prototype.emit = function(event) {
        return this.emitter.emit(event);
      };

      MethodService.prototype.call_method = function(method, args) {
        var _ref;
        return (_ref = this.service)[method].apply(_ref, args);
      };

      return MethodService;

    })();

    InstanceService = (function() {

      function InstanceService(instance) {
        var _ref;
        this.context = {};
        this.service = instance;
        this.methods = get_instance_methods(this.service);
        if (((_ref = this.service.__options__) != null ? _ref.events : void 0) != null) {
          this.service.__options__.events.connected = 'coupler:connected';
          this.service.__options__.events.disconnected = 'coupler:disconnected';
        }
      }

      InstanceService.prototype.emit = function(event) {
        var _base;
        return typeof (_base = this.service).emit === "function" ? _base.emit(event, this.context) : void 0;
      };

      InstanceService.prototype.call_method = function(method, args) {
        return this.service[method].apply(this.context, args);
      };

      return InstanceService;

    })();

    function RpcServerProtocol(name, service) {
      this.name = name;
      this.service = service;
      this.sanitizer = new Sanitizer();
    }

    RpcServerProtocol.prototype.initialize = function() {
      var _this = this;
      return ['connected', 'disconnected'].forEach(function(evt) {
        return _this.remote.on(evt, function(next) {
          var conn, rpc_instance, _ref;
          conn = next.protocol_stack.connection;
          if ((_ref = conn.__rpc__) == null) {
            conn.__rpc__ = {};
          }
          rpc_instance = conn.__rpc__[_this.name];
          if (rpc_instance == null) {
            if (typeof _this.service === 'function') {
              rpc_instance = conn.__rpc__[_this.name] = new MethodService(_this.service);
            } else {
              rpc_instance = conn.__rpc__[_this.name] = new InstanceService(_this.service);
            }
          }
          return rpc_instance.emit('coupler:' + evt);
        });
      });
    };

    RpcServerProtocol.prototype.recv = function(data, next) {
      var args, method, rpc_instance,
        _this = this;
      rpc_instance = next.protocol_stack.connection.__rpc__[this.name];
      if (data.$m === 0) {
        return next.send({
          $r: 0,
          $a: rpc_instance.methods
        });
      }
      if (data.$m >= 1000) {
        method = this.sanitizer.methods[data.$m];
      } else {
        method = rpc_instance.methods[data.$m];
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
        rpc_instance.call_method(method, args);
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
