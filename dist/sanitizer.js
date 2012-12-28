(function() {
  var Sanitizer, traverse;

  traverse = require('traverse');

  Sanitizer = (function() {

    function Sanitizer(context) {
      var _ref;
      if ((_ref = this.context) == null) {
        this.context = {};
      }
      this.context.buffered_methods = {};
      this.context.buffered_method_idx = 1000;
      Object.defineProperty(this, 'methods', {
        get: function() {
          return this.context.buffered_methods;
        }
      });
    }

    Sanitizer.prototype.sanitize = function(obj) {
      var circular, context, methods, new_obj;
      methods = [];
      circular = [];
      context = this.context;
      new_obj = traverse(obj).map(function() {
        var idx;
        if (this.circular) {
          circular.push([this.path, this.circular]);
          this.update(0);
        }
        if (typeof this.node === 'function') {
          idx = ++context.buffered_method_idx;
          context.buffered_methods[idx] = this.node;
          methods.push([this.path, idx]);
          return this.update(1);
        }
      });
      return {
        $d: new_obj,
        $m: methods,
        $c: circular
      };
    };

    Sanitizer.prototype.desanitize = function(obj, call_method) {
      var context, t;
      context = this.context;
      t = traverse(obj.$d);
      obj.$c.forEach(function(c) {
        return t.set(c[0], t.get(c[1]));
      });
      obj.$m.forEach(function(m) {
        var callback;
        callback = function() {
          return call_method(m[1], Array.prototype.slice.call(arguments));
        };
        return t.set(m[0], callback);
      });
      return obj.$d;
    };

    return Sanitizer;

  })();

  module.exports = Sanitizer;

}).call(this);
