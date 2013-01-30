(function() {
  var ConnectionEmitter, ProtocolStack, RootService, ServiceContainer, ServiceProtocol, ServiceProtocolStack, crypto, root_service, rpc, _,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  _ = require('underscore');

  rpc = require('./rpc');

  crypto = require('crypto');

  ProtocolStack = require('../protocol_stack');

  ConnectionEmitter = require('../connection_emitter');

  ServiceProtocolStack = (function(_super) {

    __extends(ServiceProtocolStack, _super);

    function ServiceProtocolStack(name) {
      var _this = this;
      this.name = name;
      ServiceProtocolStack.__super__.constructor.call(this);
      ConnectionEmitter.inject_into(this);
      this.use({
        recv: function(data, next) {
          next.data.service = data.$s;
          delete data.$s;
          return next(null, data);
        },
        send: function(data, next) {
          var _ref;
          if ((_ref = data.$s) == null) {
            data.$s = next.data.service || _this.name;
          }
          return next(null, data);
        }
      });
    }

    ServiceProtocolStack.prototype.build_remote = function(module, node) {
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

    return ServiceProtocolStack;

  })(ProtocolStack);

  RootService = (function() {

    function RootService(service_container) {
      this.service_container = service_container;
    }

    RootService.prototype.list = function(callback) {
      return typeof callback === "function" ? callback(this.service_container.provided_services()) : void 0;
    };

    return RootService;

  })();

  root_service = function(service_container) {
    return function() {
      return new RootService(service_container);
    };
  };

  ServiceContainer = (function() {

    function ServiceContainer() {
      this.services = {};
      this.provide({
        0: root_service(this)
      });
    }

    ServiceContainer.prototype.provide = function(opts) {
      var k, v, _results;
      _results = [];
      for (k in opts) {
        v = opts[k];
        if (this.services[k] != null) {
          throw new Error("There is already a Service being provided at " + k);
        }
        _results.push(this.services[k] = v);
      }
      return _results;
    };

    ServiceContainer.prototype.provided_services = function() {
      return _.chain(this.services).keys().without('0').value();
    };

    return ServiceContainer;

  })();

  ServiceProtocol = (function() {

    function ServiceProtocol(service_container) {
      this.service_container = service_container;
      this.services = {};
      this.consumed_services = {};
      this.consumed_services_idx = 0;
    }

    ServiceProtocol.prototype.initialize = function() {
      var _this = this;
      return ['connecting', 'connected', 'disconnected', 'reconnected', 'reconnecting'].forEach(function(evt) {
        return _this.remote.on(evt, function() {
          var args, next, s, _base, _i, _len, _ref;
          next = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
          _ref = _(_this.services).values().concat(_(_this.consumed_services).values());
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            s = _ref[_i];
            if (typeof (_base = s.stack).emit === "function") {
              _base.emit.apply(_base, [evt].concat(__slice.call(args)));
            }
          }
          return next();
        });
      });
    };

    ServiceProtocol.prototype.get_service = function(service_name, hash) {
      var key, service, svc,
        _this = this;
      key = service_name + ':' + hash;
      service = this.services[key];
      if (service == null) {
        svc = this.service_container.services[service_name];
        if (svc == null) {
          return null;
        }
        service = {
          stack: new ServiceProtocolStack("s:" + key),
          rpc: rpc(service_name, svc)
        };
        Object.defineProperty(service.stack, 'connection', {
          get: function() {
            return _this.remote.protocol_stack.connection;
          }
        });
        service.stack.use(service.rpc);
        service.stack.on('send', function(data) {
          return _this.remote.send(data);
        });
        if (ConnectionEmitter.is_connected(this.remote.__emitter__)) {
          service.stack.emit('connected');
        }
        if (ConnectionEmitter.is_disconnected(this.remote.__emitter__)) {
          service.stack.emit('disconnected');
        }
        this.services[key] = service;
      }
      return service;
    };

    ServiceProtocol.prototype.consume = function(name) {
      var key, service, _ref, _ref1,
        _this = this;
      key = "" + name + ":" + (crypto.randomBytes(16).toString('hex'));
      service = {
        stack: new ServiceProtocolStack("c:" + key),
        rpc: rpc(name)
      };
      Object.defineProperty(service.stack, 'connection', {
        get: function() {
          return _this.remote.protocol_stack.connection;
        }
      });
      service.stack.use(service.rpc);
      service.stack.on('send', function(data) {
        return _this.remote.send(data);
      });
      if ((((_ref = this.remote) != null ? _ref.__emitter__ : void 0) != null) && ConnectionEmitter.is_connected(this.remote.__emitter__)) {
        service.stack.emit('connected');
      }
      if ((((_ref1 = this.remote) != null ? _ref1.__emitter__ : void 0) != null) && ConnectionEmitter.is_disconnected(this.remote.__emitter__)) {
        service.stack.emit('disconnected');
      }
      this.consumed_services[key] = service;
      return service.rpc.client;
    };

    ServiceProtocol.prototype.recv = function(data, next) {
      var hash, key, service, service_name, type, _ref;
      if (data.$s == null) {
        return;
      }
      _ref = data.$s.split(':'), type = _ref[0], service_name = _ref[1], hash = _ref[2];
      key = "" + service_name + ":" + hash;
      if (data.$m != null) {
        service = (function() {
          switch (type) {
            case 'c':
              return this.get_service(service_name, hash);
            case 's':
              return this.consumed_services[key];
          }
        }).call(this);
      } else if (data.$r != null) {
        service = (function() {
          switch (type) {
            case 'c':
              return this.consumed_services[key];
            case 's':
              return this.get_service(service_name, hash);
          }
        }).call(this);
      }
      if (service == null) {
        return next();
      }
      return next.pipe(service.stack);
    };

    ServiceProtocol.prototype.send = function(data, next) {
      return next();
    };

    return ServiceProtocol;

  })();

  module.exports = function(service_container) {
    if (service_container == null) {
      return new ServiceContainer();
    }
    return new ServiceProtocol(service_container);
  };

}).call(this);
