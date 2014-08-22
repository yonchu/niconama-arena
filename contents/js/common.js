var _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

this.exports = (_ref = typeof exports !== "undefined" && exports !== null ? exports : window) != null ? _ref : this;

(function(exports) {
  var AjaxEx, EventDispatcher, LOGGER, Logger, common;
  exports.namespace = function(namespace, noConflict, fn) {
    var here, klass, parent, prev, token, tokens, _i, _len;
    if (noConflict == null) {
      noConflict = true;
    }
    if (fn == null) {
      fn = null;
    }
    tokens = namespace.split('.');
    parent = null;
    here = exports;
    for (_i = 0, _len = tokens.length; _i < _len; _i++) {
      token = tokens[_i];
      parent = here;
      if (parent.hasOwnProperty(token)) {
        prev = parent[token];
        if (noConflict) {
          here = prev;
        } else {
          here = parent[token] = {};
        }
      } else {
        here = prev = parent[token] = {};
      }
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
  common = exports.namespace('CHEX.common');
  common.Logger = Logger = (function() {
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
      this.level = isNaN(level) ? common.Logger.DEFAULT_LEVEL : level;
      console.log("Create Logger: level = " + (this.getLevelName(this.level)));
      methods = this.make();
      console.log("Available(bind): " + (methods.bind.join(', ')));
      console.log("Available(apply): " + (methods.apply.join(', ')));
    }

    Logger.prototype.getLevelName = function(level) {
      var name, val, _ref1;
      _ref1 = common.Logger.LEVEL;
      for (name in _ref1) {
        val = _ref1[name];
        if (level === val) {
          return name;
        }
      }
      throw Error("Invalid level " + level);
    };

    Logger.prototype.make = function() {
      var key, l, methods;
      methods = {
        bind: [],
        apply: []
      };
      for (key in console) {
        l = common.Logger.LEVEL[key.toUpperCase()];
        if (l == null) {
          l = common.Logger.LEVEL.OFF;
        }
        if (l >= this.level) {
          if (console[key].bind) {
            methods.bind.push(key);
            common.Logger.prototype[key] = (function(k) {
              return console[k].bind(console);
            })(key);
          } else if (console[key].apply) {
            methods.apply.push(key);
            common.Logger.prototype[key] = (function(k) {
              return console[k].apply(console, arguments);
            })(key);
          } else {
            continue;
          }
        } else {
          common.Logger.prototype[key] = function() {};
        }
      }
      return methods;
    };

    return Logger;

  })();
  LOGGER = new common.Logger;
  common.str2date = function(year, date, time) {
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
  common.date2String = function(date) {
    var dd, hh, min, mm;
    mm = date.getMonth() + 1;
    dd = date.getDate();
    hh = date.getHours();
    min = date.getMinutes();
    if (mm < 10) {
      mm = '0' + mm;
    }
    if (dd < 10) {
      dd = '0' + dd;
    }
    if (hh < 10) {
      hh = '0' + hh;
    }
    if (min < 10) {
      min = '0' + min;
    }
    return "" + mm + "/" + dd + " " + hh + ":" + min;
  };
  common.remainingTime = function(now, targetTime) {
    var d, delta, h, m, remainder, ret;
    delta = targetTime - now;
    d = Math.floor(delta / (24 * 60 * 60 * 1000));
    remainder = delta % (24 * 60 * 60 * 1000);
    h = Math.floor(remainder / (60 * 60 * 1000));
    remainder = delta % (60 * 60 * 1000);
    m = Math.floor(remainder / (60 * 1000));
    ret = '';
    if (d > 0) {
      ret += "" + d + " 日 ";
    }
    if (h > 0) {
      ret += "" + h + " 時間 ";
    }
    if (m > 0) {
      ret += "" + m + " 分";
    }
    return ret;
  };
  common.transIMG = function(html) {
    return html.replace(/<img([^>]+)>/g, '<imgx$1>');
  };
  common.httpRequest = function(url, callback) {
    var xhr;
    xhr = new XMLHttpRequest;
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        callback(xhr.responseText);
      }
    };
    xhr.open('GET', url, true);
    xhr.send();
  };
  common.AjaxEx = AjaxEx = (function() {
    AjaxEx.RETRY_STATUS = ['0', '500'];

    function AjaxEx(retryIntervalSec, maxRetryCount) {
      this.retryIntervalSec = retryIntervalSec != null ? retryIntervalSec : 5;
      this.maxRetryCount = maxRetryCount != null ? maxRetryCount : 2;
      this._onFail = __bind(this._onFail, this);
      this._onDone = __bind(this._onDone, this);
      this.retryCount = 0;
      this.request = null;
      this.defer = null;
    }

    AjaxEx.ajax = function(request) {
      return (new common.AjaxEx(request)).ajax(request);
    };

    AjaxEx.prototype.ajax = function(request) {
      this.request = request;
      this.defer = $.Deferred();
      $.ajax(this.request).then(this._onDone, this._onFail);
      return this.defer.promise();
    };

    AjaxEx.prototype._onDone = function(response) {
      LOGGER.log("[AjaxEx] Success: " + this.request.url);
      this.defer.resolve(response);
      this._clean();
    };

    AjaxEx.prototype._onFail = function(response) {
      var error;
      try {
        this._retry(response);
      } catch (_error) {
        error = _error;
        LOGGER.error('[AjaxEx] Abort... could not retry', error);
        if (error.stack) {
          LOGGER.error(error.stack);
        }
        this.defer.reject(response);
        this._clean();
      }
    };

    AjaxEx.prototype._retry = function(response) {
      var status,
        _this = this;
      status = response.status + '';
      LOGGER.error(("[AjaxEx] Error: retryCount=" + this.retryCount + ",") + (" status=" + status + ", url=" + this.request.url), this.request, response);
      if (this.retryCount >= 2) {
        throw Error("Max retry count over: retryCount=" + this.retryCount);
      }
      if (__indexOf.call(common.AjaxEx.RETRY_STATUS, status) < 0) {
        throw Error("Unknown status: status=" + status);
      }
      this.retryCount += 1;
      LOGGER.info("[AjaxEx] Retry " + this.retryCount);
      this.defer.notify(this.retryCount);
      this._sleep(this.retryIntervalSec).then(function() {
        $.ajax(_this.request).then(_this._onDone, _this._onFail);
      });
    };

    AjaxEx.prototype._sleep = function(sec) {
      var d;
      d = $.Deferred();
      setTimeout(function() {
        d.resolve();
        return d = null;
      }, sec * 1000);
      return d.promise();
    };

    AjaxEx.prototype._clean = function() {
      this.request = null;
      this.defer = null;
    };

    return AjaxEx;

  })();
  common.EventDispatcher = EventDispatcher = (function() {
    function EventDispatcher() {
      this.events = {};
    }

    EventDispatcher.prototype.addEventListener = function(event, callback, callbackObj) {
      var _base;
      if (!this.events.hasOwnProperty(event)) {
        this.events[event] = [];
      }
      (_base = this.events)[event] || (_base[event] = []);
      this.events[event].push({
        callback: callback,
        callbackObj: callbackObj
      });
      return this;
    };

    EventDispatcher.prototype.removeEventListener = function(event, callback, callbackObj) {
      var l, _i, _len, _ref1;
      if (this.events.hasOwnProperty(event)) {
        _ref1 = this.events[event];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          l = _ref1[_i];
          if (l.callback === callback && l.callbackObj === callbackObj) {
            this.events[event].splice(i, 1);
          }
        }
      }
      return this;
    };

    EventDispatcher.prototype.dispatchEvent = function(event, data) {
      var l, _i, _len, _ref1;
      if (this.events.hasOwnProperty(event)) {
        data = data || [];
        if (!Array.isArray(data)) {
          data = [data];
        }
        data.currentTarget = this;
        _ref1 = this.events[event];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          l = _ref1[_i];
          l.callback.apply(l.callbackObj, data);
          setTimeout(this._call.bind(this, l.callback, l.callbackObj, data), 0);
        }
      }
      return this;
    };

    EventDispatcher.prototype._call = function(callback, callbackObj, data) {
      callback.apply(callbackObj, data);
    };

    return EventDispatcher;

  })();
  common.getLiveIdFromUrl = function(url) {
    var _ref1;
    return (_ref1 = url.match(/(watch|gate)\/(lv\d+)/)) != null ? _ref1[2] : void 0;
  };
  common.changeGate2Watch = function(url) {
    return url.replace(/\?.*/, '').replace(/\/gate\//, '/watch/');
  };
  common.notification = {};
  common.notification.timeMsg = function(openTime, startTime) {
    var openTimeStr, ret, startTimeStr;
    ret = {};
    if (openTime) {
      openTimeStr = common.date2String(openTime);
    }
    if (startTime) {
      startTimeStr = common.date2String(startTime);
    }
    if (openTimeStr) {
      ret.openTime = "開場: " + openTimeStr;
      ret.startTime = "開演: " + startTimeStr;
    } else if (startTimeStr) {
      ret.startTime = "開始: " + startTimeStr;
    }
    return ret;
  };
  return common.notification.statusMsg = function(openTime, startTime, endTime, now, beforeTimeSec) {
    var ret;
    if (beforeTimeSec == null) {
      beforeTimeSec = 300;
    }
    ret = {};
    openTime = openTime != null ? openTime.getTime() : void 0;
    startTime = startTime != null ? startTime.getTime() : void 0;
    endTime = endTime != null ? endTime.getTime() : void 0;
    if (endTime && now > endTime) {
      ret.text = '放送は終了しました';
      ret.flag = 'closed';
    } else if (startTime) {
      if (now > startTime) {
        ret.text = 'ただいま放送中';
      } else if (openTime && now > openTime) {
        ret.text = 'まもなく放送開始';
      } else if (openTime && now > openTime - beforeTimeSec * 1000) {
        ret.text = 'まもなく開場';
      }
    }
    return ret;
  };
})(this);
