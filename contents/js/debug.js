//@ sourceMappingURL=debug.map
var Logger;

Logger = (function() {
  Logger.LEVEL = {
    ALL: -99,
    DEBUG: -1,
    LOG: -1,
    INFO: 0,
    WARN: 1,
    ERROR: 2,
    OFF: 99
  };

  Logger.DEFAULT_LEVEL = Logger.LEVEL.INFO;

  function Logger(level) {
    var methods;

    this.level = isNaN(level) ? Logger.DEFAULT_LEVEL : level;
    console.log("Create Logger: level = " + (this.getLevelName(this.level)));
    methods = this.make();
    console.log("Available(bind): " + (methods.bind.join(', ')));
    console.log("Available(apply): " + (methods.apply.join(', ')));
  }

  Logger.prototype.getLevelName = function(level) {
    var name, val, _ref;

    _ref = Logger.LEVEL;
    for (name in _ref) {
      val = _ref[name];
      if (level === val) {
        return name;
      }
    }
    throw new Error("Invalid level " + level);
  };

  Logger.prototype.make = function() {
    var key, l, methods;

    methods = {
      bind: [],
      apply: []
    };
    for (key in console) {
      l = Logger.LEVEL[key.toUpperCase()];
      if (l == null) {
        l = Logger.LEVEL.OFF;
      }
      if (l >= this.level) {
        if (console[key].bind) {
          methods.bind.push(key);
          Logger.prototype[key] = (function(k) {
            return console[k].bind(console);
          })(key);
        } else if (console[key].apply) {
          methods.apply.push(key);
          Logger.prototype[key] = (function(k) {
            return console[k].apply(console, arguments);
          })(key);
        } else {
          continue;
        }
      } else {
        Logger.prototype[key] = function() {};
      }
    }
    return methods;
  };

  return Logger;

})();
