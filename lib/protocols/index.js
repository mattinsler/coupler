(function() {
  var fs, _;

  fs = require('fs');

  _ = require('underscore');

  module.exports = _(fs.readdirSync(__dirname)).inject(function(o, filename) {
    var name;
    if (!/\.js$/.test(filename)) {
      return o;
    }
    name = filename.replace(/\.(js)$/, '');
    if (name !== 'index') {
      o[name] = require(__dirname + '/' + filename);
    }
    return o;
  }, {});

}).call(this);
