//@ sourceMappingURL=common.map
(function() {
  var ChEx, Common, previousChEx, _ref, _ref1;

  this.exports = (_ref = (_ref1 = typeof exports !== "undefined" && exports !== null ? exports : window) != null ? _ref1 : this) != null ? _ref : {};

  this.namespace = function(namespace, fn) {
    var here, klass, parent, prev, token, tokens, _i, _len;

    if (fn == null) {
      fn = null;
    }
    tokens = namespace.split('.');
    parent = exports;
    for (_i = 0, _len = tokens.length; _i < _len; _i++) {
      token = tokens[_i];
      prev = parent[token];
      here = parent[token] = {};
      here.noConflict = (function(parent, token, prev) {
        return function() {
          parent[token] = prev;
          return this;
        };
      })(parent, token, prev);
    }
    if (fn != null) {
      klass = fn();
      here[klass.name] = klass;
    }
    return here;
  };

  previousChEx = exports.ChEx;

  ChEx = exports.ChEx = {};

  ChEx.noConflict = function() {
    exports.ChEx = previousChEx;
    return this;
  };

  Common = ChEx.Common = {};

  Common.changeGate2Watch = function(url) {
    return url.replace(/\?.*/, '').replace(/\/gate\//, '/watch/');
  };

  Common.str2date = function(year, date, time) {
    var d, dd, delta, hh, min, mm, sp;

    sp = date.split('/');
    mm = parseInt(sp[0], 10);
    dd = parseInt(sp[1], 10);
    sp = time.split(':');
    hh = parseInt(sp[0], 10);
    min = parseInt(sp[1], 10);
    delta = hh - 24;
    if (delta < 0) {
      return new Date("" + year + "/" + mm + "/" + dd + " " + hh + ":" + min);
    }
    hh = delta;
    d = new Date("" + year + "/" + mm + "/" + dd + " " + hh + ":" + min);
    d.setDate(d.getDate() + (Math.floor(hh / 24 + 1)));
    return d;
  };

}).call(this);
