//@ sourceMappingURL=background.map
(function() {
  var AjaxEx, Background, BaseLiveData, Config, Favorite, History, LOGGER, LiveChecker, NicoInfo, Official, Timeshift, changeGate2Watch, exports, getLiveIdFromUrl, str2date, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  LOGGER = new Logger;

  getLiveIdFromUrl = function(url) {
    var _ref;

    return (_ref = url.match(/(watch|gate)\/(lv\d+)/)) != null ? _ref[2] : void 0;
  };

  changeGate2Watch = function(url) {
    return url.replace(/\?.*/, '').replace(/\/gate\//, '/watch/');
  };

  str2date = function(year, date, time) {
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

  Background = (function() {
    Background.prototype.commands = {
      'config': null
    };

    function Background(config, history) {
      this.config = config;
      this.history = history;
      this.commands.config = this.config;
      this.commands.history = this.history;
      this.addEventListeners();
    }

    Background.prototype.addEventListeners = function() {
      var _this = this;

      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        var res, target;

        if (sender.tab) {
          console.log("from a content script: " + sender.tab.url);
        } else {
          console.log("from the extension");
        }
        target = _this.commands[request.target];
        if (!target) {
          throw new Error("Invalid target " + request.target);
        }
        res = target[request.action].apply(target, request.args);
        sendResponse({
          res: res
        });
        target = null;
        return true;
      });
    };

    return Background;

  })();

  Config = (function() {
    Config.BADGE_ENABLE_VALUES = ['disable', 'before', 'gate', 'onair'];

    Config.DEFAULT_SETTINGS = {
      enableAutoJump: true,
      autoJumpIntervalSec: 20,
      enableAutoEnter: true,
      enabledNiconama: {
        official: true,
        favorite: true,
        timeshift: true,
        history: true,
        settings: true
      },
      niconamaUpdateIntervalSec: 600,
      badge: {
        official: {
          beforeTimeSec: 300,
          enable: 'onair'
        },
        favorite: {
          beforeTimeSec: 300,
          enable: 'before'
        },
        timeshift: {
          beforeTimeSec: 300,
          enable: 'before'
        }
      },
      notification: {
        official: {
          beforeTimeSec: 300,
          enable: 'onair'
        },
        favorite: {
          beforeTimeSec: 300,
          enable: 'before'
        },
        timeshift: {
          beforeTimeSec: 300,
          enable: 'before'
        }
      },
      opentab: {
        official: {
          beforeTimeSec: 300,
          enable: 'disable'
        },
        favorite: {
          beforeTimeSec: 300,
          enable: 'before'
        },
        timeshift: {
          beforeTimeSec: 300,
          enable: 'before'
        },
        rule: 'blacklist',
        blacklist: ['ch12345,co67890'],
        whitelist: []
      }
    };

    function Config() {
      this.initSettings();
      if (this._getValue('saveTabNum') == null) {
        this.setSaveTabNum(0);
      }
      this.enableFetchDetail = false;
    }

    Config.prototype._getValue = function(key, def) {
      var value;

      if (def == null) {
        def = void 0;
      }
      value = localStorage[key];
      console.assert(value !== 'undefined', "Error: Unexpected value in localStorage (key=" + key + "})");
      if (value != null) {
        return value;
      } else {
        return def;
      }
    };

    Config.prototype._setValue = function(key, value) {
      console.assert(value !== 'undefined', "Error: Unexpected value in localStorage (key=" + key + "})");
      if (value) {
        localStorage[key] = value;
      } else {
        localStorage.removeItem(key);
      }
    };

    Config.prototype.initSettings = function() {
      var settings;

      settings = localStorage.settings;
      if (settings) {
        this.settings = JSON.parse(settings);
      } else {
        this.settings = Config.DEFAULT_SETTINGS;
        this.saveSettings();
        LOGGER.info('Save default confing');
      }
      return settings;
    };

    Config.prototype.saveSettings = function() {
      var settings;

      settings = JSON.stringify(this.settings);
      localStorage.settings = settings;
    };

    Config.prototype._getSettingsValue = function(key, def) {
      var value;

      if (def == null) {
        def = void 0;
      }
      value = this.settings[key];
      console.assert(value !== 'undefined', "Error: Unexpected value in settings (key=" + key + "})");
      if (value != null) {
        return value;
      } else {
        return def;
      }
    };

    Config.prototype._setSettingsValue = function(key, value) {
      console.assert(value !== 'undefined', "Error: Unexpected value in localStorage (key=" + key + "})");
      if (value == null) {
        throw new Error("Error: invalid value " + value);
      }
      if (this.settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      this.settings[key] = value;
    };

    Config.prototype._getSettingsFlag = function(key) {
      var value;

      value = this._getSettingsValue(key);
      if (value) {
        return true;
      } else {
        return false;
      }
    };

    Config.prototype._setSettingsFlag = function(key, value) {
      value = value ? true : false;
      this._setSettingsValue(key, value);
    };

    Config.prototype._isInt = function(value) {
      if (value == null) {
        return false;
      }
      value += '';
      if ((value.match(/[^0-9]/g)) || (parseInt(value, 10)) + '' !== value) {
        return false;
      }
      return true;
    };

    Config.prototype.getSaveTabNum = function() {
      return this._getValue('saveTabNum', 0);
    };

    Config.prototype.setSaveTabNum = function(value) {
      if (!this._isInt(value)) {
        throw new Error("Error: invalid value " + value);
      }
      this._setValue('saveTabNum', value);
    };

    Config.prototype.getEnabledNiconamaSettings = function() {
      return this._getSettingsValue('enabledNiconama');
    };

    Config.prototype.isNiconamaEnabled = function(key) {
      var settings;

      settings = this.getEnabledNiconamaSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key];
    };

    Config.prototype.setEnabledNiconamaSettings = function(key, value) {
      var settings;

      settings = this.getEnabledNiconamaSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      value = value ? true : false;
      settings[key] = value;
    };

    Config.prototype.getNiconamaUpdateIntervalSec = function() {
      return this._getSettingsValue('niconamaUpdateIntervalSec');
    };

    Config.prototype.setNiconamaUpdateIntervalSec = function(value) {
      if (!this._isInt(value)) {
        throw new Error("Error: invalid value " + value);
      }
      this._setSettingsValue('niconamaUpdateIntervalSec', value);
    };

    Config.prototype.getBadgeSettings = function() {
      return this._getSettingsValue('badge');
    };

    Config.prototype.getBadgeEnable = function(key) {
      var settings;

      settings = this.getBadgeSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].enable;
    };

    Config.prototype.setBadgeEnable = function(key, value) {
      var settings, _ref;

      if (!value || (_ref = !value, __indexOf.call(Config.BADGE_ENABLE_VALUES, _ref) >= 0)) {
        throw new Error("Error: invalid value " + value);
      }
      settings = this.getBadgeSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      settings[key].enable = value;
    };

    Config.prototype.isBeforeBadgeEnabled = function(key) {
      return (this.getBadgeEnable(key)) === 'before';
    };

    Config.prototype.isGateBadgeEnabled = function(key) {
      return (this.getBadgeEnable(key)) === 'gate';
    };

    Config.prototype.isOnairBadgeEnabled = function(key) {
      return (this.getBadgeEnable(key)) === 'onair';
    };

    Config.prototype.getBadgeBeforeTimeSec = function(key) {
      var settings;

      settings = this.getBadgeSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].beforeTimeSec;
    };

    Config.prototype.setBadgeBeforeTimeSec = function(key, value) {
      var settings;

      if (!this._isInt(value)) {
        throw new Error("Error: invalid value " + value);
      }
      settings = this.getBadgeSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      settings[key].beforeTimeSec = value;
    };

    Config.prototype.getNotificationSettings = function() {
      return this._getSettingsValue('notification');
    };

    Config.prototype.getNotificationEnable = function(key) {
      var settings;

      settings = this.getNotificationSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].enable;
    };

    Config.prototype.setNotificationEnable = function(key, value) {
      var settings, _ref;

      if (!value || (_ref = !value, __indexOf.call(Config.BADGE_ENABLE_VALUES, _ref) >= 0)) {
        throw new Error("Error: invalid value " + value);
      }
      settings = this.getNotificationSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      settings[key].enable = value;
    };

    Config.prototype.isBeforeNotificationEnabled = function(key) {
      return (this.getNotificationEnable(key)) === 'before';
    };

    Config.prototype.isGateNotificationEnabled = function(key) {
      return (this.getNotificationEnable(key)) === 'gate';
    };

    Config.prototype.isOnairNotificationEnabled = function(key) {
      return (this.getNotificationEnable(key)) === 'onair';
    };

    Config.prototype.getNotificationBeforeTimeSec = function(key) {
      var settings;

      settings = this.getNotificationSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].beforeTimeSec;
    };

    Config.prototype.getOpentabSettings = function() {
      return this._getSettingsValue('opentab');
    };

    Config.prototype.getOpentabEnable = function(key) {
      var settings;

      settings = this.getOpentabSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].enable;
    };

    Config.prototype.setOpentabEnable = function(key, value) {
      var settings, _ref;

      if (!value || (_ref = !value, __indexOf.call(Config.BADGE_ENABLE_VALUES, _ref) >= 0)) {
        throw new Error("Error: invalid value " + value);
      }
      settings = this.getOpentabSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      settings[key].enable = value;
    };

    Config.prototype.isBeforeOpentabEnabled = function(key) {
      return (this.getOpentabEnable(key)) === 'before';
    };

    Config.prototype.isGateOpentabEnabled = function(key) {
      return (this.getOpentabEnable(key)) === 'gate';
    };

    Config.prototype.isOnairOpentabEnabled = function(key) {
      return (this.getOpentabEnable(key)) === 'onair';
    };

    Config.prototype.getOpentabBeforeTimeSec = function(key) {
      var settings;

      settings = this.getOpentabSettings();
      if (settings[key] == null) {
        throw new Error("Error: invalid key " + key);
      }
      return settings[key].beforeTimeSec;
    };

    Config.prototype.isRuleBlackList = function() {
      var rule, settings;

      settings = this.getOpentabSettings();
      rule = settings['rule'];
      if (!rule || rule === 'blacklist') {
        return true;
      }
      return false;
    };

    Config.prototype.getBlackList = function() {
      var list, settings;

      settings = this.getOpentabSettings();
      list = settings['blacklist'];
      if (!list) {
        return [];
      }
      return list;
    };

    Config.prototype.setBlackList = function(list) {
      var settings;

      if (($.type(list)) !== 'array') {
        throw new Error("Invalid list " + list);
      }
      settings = this.getOpentabSettings();
      settings['blacklist'] = list;
    };

    Config.prototype.getEnableAutoJump = function() {
      return this._getSettingsFlag('enableAutoJump');
    };

    Config.prototype.setEnableAutoJump = function(value) {
      this._setSettingsFlag('enableAutoJump', value);
    };

    Config.prototype.getAutoJumpIntervalSec = function() {
      return this._getSettingsValue('autoJumpIntervalSec', 20);
    };

    Config.prototype.setAutoJumpIntervalSec = function(value) {
      if (!this._isInt(value)) {
        throw new Error("Error: invalid value " + value);
      }
      value = parseInt(value);
      this._setSettingsValue('autoJumpIntervalSec', value);
    };

    Config.prototype.getEnableAutoEnter = function() {
      return this._getSettingsFlag('enableAutoEnter');
    };

    Config.prototype.setEnableAutoEnter = function(value) {
      this._setSettingsFlag('enableAutoEnter', value);
    };

    Config.prototype.getConfigForAutoJump = function() {
      var conf;

      conf = {};
      conf.enableAutoJump = this.getEnableAutoJump();
      conf.autoJumpIntervalSec = this.getAutoJumpIntervalSec();
      conf.enableAutoEnter = this.getEnableAutoEnter();
      conf.enableHistory = this.isNiconamaEnabled('history');
      LOGGER.info("getConfigForAutoJump", conf);
      return conf;
    };

    return Config;

  })();

  NicoInfo = (function() {
    NicoInfo.prototype.liveDataList = [];

    function NicoInfo(config) {
      this.config = config;
      this.updateAll = __bind(this.updateAll, this);
      this.liveDataList.push(new Favorite(this.config));
      this.liveDataList.push(new Timeshift(this.config));
      this.liveDataList.push(new Official(this.config));
      this.addEventListeners();
      this.init();
    }

    NicoInfo.prototype.addEventListeners = function() {};

    NicoInfo.prototype.init = function() {
      chrome.browserAction.setBadgeText({
        text: ''
      });
      this.updateAll(true, false);
    };

    NicoInfo.prototype.getLiveData = function(key) {
      var liveData, _i, _len, _ref;

      _ref = this.liveDataList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        liveData = _ref[_i];
        if (liveData.id === key) {
          return liveData;
        }
      }
      throw new Error("Error: invalid key " + key);
    };

    NicoInfo.prototype.getData = function(key) {
      return this.getLiveData(key).data;
    };

    NicoInfo.prototype.getCache = function(key) {
      return this.getLiveData(key).cache;
    };

    NicoInfo.prototype.isUpdated = function(key, value) {
      var liveData;

      liveData = this.getLiveData(key);
      if (value != null) {
        liveData.isUpdated = value;
      }
      return liveData.isUpdated;
    };

    NicoInfo.prototype.getLasetUpdateTime = function(key) {
      try {
        return this.getLiveData(key).lastUpdateTime;
      } catch (_error) {}
    };

    NicoInfo.prototype.countBadge = function(key) {
      return this.getLiveData(key).countBadge();
    };

    NicoInfo.prototype.updateAll = function(force, useCache) {
      var liveData, _i, _len, _ref;

      if (force == null) {
        force = false;
      }
      if (useCache == null) {
        useCache = true;
      }
      _ref = this.liveDataList;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        liveData = _ref[_i];
        liveData.update(force, useCache);
      }
    };

    return NicoInfo;

  })();

  LiveChecker = (function() {
    LiveChecker.CHECK_TIMER_INTERVAL_SEC = 120;

    LiveChecker.NOTIFICATION_TIMEOUT_SEC = 3.5;

    LiveChecker.NOTIFICATION_URL = (chrome.extension.getURL('html/notification.html')) + '#';

    LiveChecker.prototype.notificationTargets = null;

    LiveChecker.prototype.notificationHistory = {};

    LiveChecker.prototype.openTabHistory = {};

    LiveChecker.prototype.deferNotification = null;

    LiveChecker.prototype.deferOpenTab = null;

    function LiveChecker(config, nicoInfo) {
      this.config = config;
      this.nicoInfo = nicoInfo;
      this.setBadge = __bind(this.setBadge, this);
      this.onTimeoutCheck = __bind(this.onTimeoutCheck, this);
      this.addEventListeners();
    }

    LiveChecker.prototype.addEventListeners = function() {
      setTimeout(this.onTimeoutCheck, LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000);
    };

    LiveChecker.prototype.getNotificationTarget = function(index) {
      if (!this.notificationTargets || this.notificationTargets.length <= index) {
        throw new Error("Error: invalid index " + index);
      }
      return this.notificationTargets[index];
    };

    LiveChecker.prototype.onTimeoutCheck = function() {
      var _this = this;

      $.when(this.setBadge(), (function() {
        var error;

        LOGGER.log('Start notification process.');
        try {
          _this.deferNotification = $.Deferred();
          _this.setNotificationTargets();
          _this.showHtmlNotifications();
        } catch (_error) {
          error = _error;
          _this.notificationTargets = null;
          throw error;
        }
        return _this.deferNotification.promise();
      })(), (function() {
        LOGGER.log('Start open tabs process.');
        _this.deferOpenTab = $.Deferred();
        _this.openTabs(_this.getOpenTabTargets());
        return _this.deferOpenTab.promise();
      })()).always(function() {
        LOGGER.log('Check process finish all.');
        return setTimeout(_this.onTimeoutCheck, LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000);
      });
    };

    LiveChecker.prototype.setErrorBadge = function() {
      chrome.browserAction.setBadgeBackgroundColor({
        color: [255, 0, 0, 255]
      });
      chrome.browserAction.setBadgeText({
        text: '' + 'x'
      });
    };

    LiveChecker.prototype.setBadge = function() {
      var count, liveData, liveDataList, _i, _j, _len, _len1;

      LOGGER.log('Start setBadge process.');
      liveDataList = this.nicoInfo.liveDataList;
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        if (liveData.isError) {
          LOGGER.warn("Set error badge " + liveData.id);
          this.setErrorBadge();
          return;
        }
      }
      count = 0;
      for (_j = 0, _len1 = liveDataList.length; _j < _len1; _j++) {
        liveData = liveDataList[_j];
        count += liveData.countBadge();
      }
      LOGGER.log("Set badge: " + count);
      count || (count = '');
      chrome.browserAction.setBadgeBackgroundColor({
        color: [0, 80, 255, 255]
      });
      chrome.browserAction.setBadgeText({
        text: '' + count
      });
      liveDataList = null;
    };

    LiveChecker.prototype.getOpenTabTargets = function() {
      var blacklist, isBeforeEnabled, isGateEnabled, isOnairEnabled, item, liveData, liveDataList, n, openTabTargets, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;

      liveDataList = this.nicoInfo.liveDataList;
      openTabTargets = [];
      blacklist = this.config.getBlackList();
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        n = liveData.getNofications();
        isBeforeEnabled = this.config.isBeforeOpentabEnabled(liveData.id);
        isGateEnabled = this.config.isGateOpentabEnabled(liveData.id);
        isOnairEnabled = this.config.isOnairOpentabEnabled(liveData.id);
        if (isBeforeEnabled) {
          _ref = n.before;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            item = _ref[_j];
            if (item.commuId && (_ref1 = item.commuId, __indexOf.call(blacklist, _ref1) >= 0)) {
              continue;
            }
            if (this.openTabHistory[item.id]) {
              if (__indexOf.call(this.openTabHistory[item.id], 'before') < 0) {
                this.openTabHistory[item.id].push('before');
              }
              continue;
            }
            this.openTabHistory[item.id] = [];
            this.openTabHistory[item.id].push('before');
            openTabTargets.push(item.link);
          }
        }
        if (isBeforeEnabled || isGateEnabled) {
          _ref2 = n.gate;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            item = _ref2[_k];
            if (item.commuId && (_ref3 = item.commuId, __indexOf.call(blacklist, _ref3) >= 0)) {
              continue;
            }
            if (this.openTabHistory[item.id]) {
              if (__indexOf.call(this.openTabHistory[item.id], 'gate') < 0) {
                this.openTabHistory[item.id].push('gate');
              }
              continue;
            }
            this.openTabHistory[item.id] = [];
            this.openTabHistory[item.id].push('gate');
            openTabTargets.push(item.link);
          }
        }
        if (isBeforeEnabled || isGateEnabled || isOnairEnabled) {
          _ref4 = n.onair;
          for (_l = 0, _len3 = _ref4.length; _l < _len3; _l++) {
            item = _ref4[_l];
            if (item.commuId && (_ref5 = item.commuId, __indexOf.call(blacklist, _ref5) >= 0)) {
              continue;
            }
            if (this.openTabHistory[item.id]) {
              if (__indexOf.call(this.openTabHistory[item.id], 'onair') < 0) {
                this.openTabHistory[item.id].push('onair');
              }
              continue;
            }
            this.openTabHistory[item.id] = [];
            this.openTabHistory[item.id].push('onair');
            openTabTargets.push(item.link);
          }
        }
      }
      LOGGER.log("Open tab: total " + openTabTargets.length, openTabTargets);
      liveDataList = null;
      return openTabTargets;
    };

    LiveChecker.prototype.openTabs = function(targets, index) {
      if (index == null) {
        index = 0;
      }
      if (index >= targets.length) {
        LOGGER.log("Open tab complete");
        this.deferOpenTab.resolve();
        return;
      }
      chrome.tabs.query({}, this.onQueryCallback(targets, index));
      targets = null;
    };

    LiveChecker.prototype.onQueryCallback = function(targets, index) {
      var _this = this;

      if (index == null) {
        index = 0;
      }
      return function(result) {
        var error, isOpened, matchUrl, tab, target, _i, _len, _ref;

        try {
          target = targets[index];
          matchUrl = targets[index].replace(/http[s]?:\/\//, '');
          isOpened = false;
          for (_i = 0, _len = result.length; _i < _len; _i++) {
            tab = result[_i];
            if ((_ref = tab.url) != null ? _ref.match(matchUrl) : void 0) {
              LOGGER.log("Cancel open tab (already opened): " + index + " - " + target);
              isOpened = true;
              break;
            }
          }
          if (!isOpened) {
            LOGGER.log("Open tab: " + index + " - " + target);
            chrome.tabs.create({
              url: target,
              active: false
            });
          }
          _this.openTabs(targets, index + 1);
          targets = null;
        } catch (_error) {
          error = _error;
          LOGGER.error("Error: Failure in open tab", error);
          if (error.stack) {
            LOGGER.error(error.stack);
          }
          _this.deferOpenTab.reject();
        }
      };
    };

    LiveChecker.prototype.setNotificationTargets = function() {
      var isBeforeEnabled, isGateEnabled, isOnairEnabled, item, liveData, liveDataList, n, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2;

      if (this.notificationTargets) {
        LOGGER.log('Cancel notification (now notifying)');
        return;
      }
      this.notificationTargets = [];
      liveDataList = this.nicoInfo.liveDataList;
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        n = liveData.getNofications();
        isBeforeEnabled = this.config.isBeforeNotificationEnabled(liveData.id);
        isGateEnabled = this.config.isGateNotificationEnabled(liveData.id);
        isOnairEnabled = this.config.isOnairNotificationEnabled(liveData.id);
        if (isBeforeEnabled) {
          _ref = n.before;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            item = _ref[_j];
            if (this.notificationHistory[item.id]) {
              if (__indexOf.call(this.notificationHistory[item.id], 'before') < 0) {
                this.notificationHistory[item.id].push('before');
              }
              continue;
            }
            this.notificationHistory[item.id] = [];
            this.notificationHistory[item.id].push('before');
            this.notificationTargets.push(item);
          }
        }
        if (isBeforeEnabled || isGateEnabled) {
          _ref1 = n.gate;
          for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
            item = _ref1[_k];
            if (this.notificationHistory[item.id]) {
              if (__indexOf.call(this.notificationHistory[item.id], 'gate') < 0) {
                this.notificationHistory[item.id].push('gate');
              }
              continue;
            }
            this.notificationHistory[item.id] = [];
            this.notificationHistory[item.id].push('gate');
            this.notificationTargets.push(item);
          }
        }
        if (isBeforeEnabled || isGateEnabled || isOnairEnabled) {
          _ref2 = n.onair;
          for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
            item = _ref2[_l];
            if (this.notificationHistory[item.id]) {
              if (__indexOf.call(this.notificationHistory[item.id], 'onair') < 0) {
                this.notificationHistory[item.id].push('onair');
              }
              continue;
            }
            this.notificationHistory[item.id] = [];
            this.notificationHistory[item.id].push('onair');
            this.notificationTargets.push(item);
          }
        }
      }
      LOGGER.log("Notify: total " + this.notificationTargets.length, this.notificationTargets);
      liveDataList = null;
    };

    LiveChecker.prototype.showHtmlNotifications = function(index) {
      var notification, url;

      if (index == null) {
        index = 0;
      }
      if (!this.notificationTargets || index >= this.notificationTargets.length) {
        LOGGER.log("Notification complete");
        this.notificationTargets = null;
        this.deferNotification.resolve();
        return;
      }
      url = LiveChecker.NOTIFICATION_URL + index;
      LOGGER.log("Notify(html) " + url);
      notification = webkitNotifications.createHTMLNotification(url);
      notification.ondisplay = this.ondisplayNotification(notification);
      notification.onclose = this.oncloseNotification(notification, index);
      notification.onerror = this.onerrorNotification(notification, index);
      notification.show();
    };

    LiveChecker.prototype.ondisplayNotification = function(notification) {
      var _this = this;

      return function(event) {
        setTimeout(_this.onTimeoutNotification(notification), LiveChecker.NOTIFICATION_TIMEOUT_SEC * 1000);
        notification = null;
      };
    };

    LiveChecker.prototype.onTimeoutNotification = function(notification) {
      var _this = this;

      return function() {
        notification.cancel();
        notification = null;
      };
    };

    LiveChecker.prototype.oncloseNotification = function(notification, index) {
      var _this = this;

      return function(event) {
        _this.showHtmlNotifications(index + 1);
        notification = null;
      };
    };

    LiveChecker.prototype.onerrorNotification = function(notification, index) {
      var _this = this;

      return function(event) {
        LOGGER.error("Error: notification error index=" + index);
        _this.notificationTargets = null;
        _this.deferNotification.reject();
        notification = null;
      };
    };

    LiveChecker.prototype.showNotification = function(id, iconUrl, title, msg) {
      LOGGER.log("Notify " + id);
      LOGGER.log("[" + title + "] " + msg);
      LOGGER.log("" + iconUrl);
      webkitNotifications.createNotification(iconUrl, title, msg).show();
    };

    return LiveChecker;

  })();

  AjaxEx = (function() {
    AjaxEx.RETRY_STATUS = ['0', '500'];

    AjaxEx.prototype.retryCount = 0;

    AjaxEx.prototype.request = null;

    AjaxEx.prototype.defer = null;

    function AjaxEx(retryIntervalSec, maxRetryCount) {
      this.retryIntervalSec = retryIntervalSec != null ? retryIntervalSec : 5;
      this.maxRetryCount = maxRetryCount != null ? maxRetryCount : 2;
      this._onFail = __bind(this._onFail, this);
      this._onDone = __bind(this._onDone, this);
    }

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
        throw new Error("Max retry count over: retryCount=" + this.retryCount);
      }
      if (__indexOf.call(AjaxEx.RETRY_STATUS, status) < 0) {
        throw new Error("Unknown status: status=" + status);
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

  BaseLiveData = (function() {
    BaseLiveData.OFFICIAL_LIVE_RSS = 'http://live.nicovideo.jp/rss';

    BaseLiveData.OFFICIAL_LIVE_COMINGSOON = 'http://live.nicovideo.jp/api/getindexzerostreamlist?status=comingsoon&zpage=';

    BaseLiveData.OFFICIAL_LIVE_RANK = 'http://live.nicovideo.jp/ranking?type=onair&main_provider_type=official';

    BaseLiveData.LIVE_URL = 'http://live.nicovideo.jp/watch/';

    BaseLiveData.GATE_URL = 'http://live.nicovideo.jp/gate/';

    BaseLiveData.MY_PAGE_URL = 'http://live.nicovideo.jp/my';

    BaseLiveData.prototype.fetchIntervalSec = 3;

    BaseLiveData.prototype.data = null;

    BaseLiveData.prototype.cache = null;

    BaseLiveData.prototype.isUpdated = false;

    BaseLiveData.prototype.lastUpdateTime = null;

    BaseLiveData.prototype.isError = false;

    BaseLiveData.prototype.isUpdateRunning = false;

    BaseLiveData.prototype.updateTimer = null;

    function BaseLiveData(id, config) {
      this.id = id;
      this.config = config;
      this.update = __bind(this.update, this);
      this.onTimeoutUpdate = __bind(this.onTimeoutUpdate, this);
      this.addEventListeners();
    }

    BaseLiveData.prototype.addEventListeners = function() {
      this.updateTimer = setTimeout(this.onTimeoutUpdate, this.getUpdateInterval());
    };

    BaseLiveData.prototype.onTimeoutUpdate = function() {
      this.update();
      this.updateTimer = setTimeout(this.onTimeoutUpdate, this.getUpdateInterval());
    };

    BaseLiveData.prototype.getUpdateInterval = function() {
      return this.config.getNiconamaUpdateIntervalSec() * 1000;
    };

    BaseLiveData.prototype.update = function(force, useCache) {
      var error;

      if (force == null) {
        force = false;
      }
      if (useCache == null) {
        useCache = true;
      }
      if (!force && this.isUpdateRunning) {
        LOGGER.warn("Cancel update is running " + this.id);
        return false;
      }
      if (!useCache) {
        LOGGER.log("Clear cache " + this.id);
        this.cache = null;
        this.data = null;
      }
      try {
        this.isUpdateRunning = true;
        this.updateData();
      } catch (_error) {
        error = _error;
        this.updateError('Error in update', error);
        return false;
      }
      return true;
    };

    BaseLiveData.prototype.updateData = function() {};

    BaseLiveData.prototype.isCancelFethDetail = function(item, now) {
      if (item.flag && item.flag === 'disable') {
        LOGGER.log("Cancel fetch detail " + this.id + " (disable)");
        return true;
      } else if (item.openTime && item.startTime) {
        if (item.endTime) {
          LOGGER.log("Cancel fetch detail " + this.id + " (all times exists)");
          return true;
        } else {
          if (now < item.startTime.getTime()) {
            LOGGER.log("Cancel fetch detail " + this.id + "            (endTime not exists but not starts yet)");
            return true;
          }
        }
      }
      return false;
    };

    BaseLiveData.prototype.fetchDetail = function(index, results) {
      var item, nextIndex, now, useCache, _i, _ref;

      LOGGER.log("Fetch detail " + this.id + " " + index + " ");
      if (index < results.length) {
        now = (new Date).getTime();
        for (nextIndex = _i = index, _ref = results.length - 1; index <= _ref ? _i <= _ref : _i >= _ref; nextIndex = index <= _ref ? ++_i : --_i) {
          item = results[nextIndex];
          useCache = this.setDataFromCache(item, this.cache);
          if (this.isCancelFethDetail(item, now)) {
            continue;
          }
          if (useCache) {
            LOGGER.warn("Fetch detail with cache " + index + " " + this.id, item);
          } else {
            LOGGER.info("Fetch detail (no cache) " + index + " " + this.id, item);
          }
          setTimeout(this.onTimeoutFetch({
            url: BaseLiveData.GATE_URL + item.id
          }, this.fetchDetailSuccess(nextIndex, results), this.fetchError("from detail id=" + item.id)), this.fetchIntervalSec * 1000);
          results = null;
          return;
        }
      }
      this.updateComplete(results);
      results = null;
    };

    BaseLiveData.prototype.onTimeoutFetch = function(request, doneFunc, failFunc) {
      var _this = this;

      return function() {
        var ajax;

        ajax = new AjaxEx;
        ajax.ajax(request).done(doneFunc).fail(failFunc);
        request = null;
        doneFunc = null;
        failFunc = null;
        ajax = null;
      };
    };

    BaseLiveData.prototype.setDataFromCache = function(data, cache) {
      var c, _i, _len;

      if (!cache) {
        return false;
      }
      for (_i = 0, _len = cache.length; _i < _len; _i++) {
        c = cache[_i];
        if (c.id === data.id) {
          if (c.openTime) {
            data.openTime || (data.openTime = c.openTime);
          }
          if (c.startTime) {
            data.startTime || (data.startTime = c.startTime);
          }
          if (c.endTime) {
            data.endTime || (data.endTime = c.endTime);
          }
          if (c.thumnail) {
            data.thumnail || (data.thumnail = c.thumnail);
          }
          if (c.description) {
            data.description || (data.description = c.description);
          }
          LOGGER.log("Use cache " + this.id, data);
          return true;
        }
      }
      return false;
    };

    BaseLiveData.prototype.fetchDetailSuccess = function(index, results) {
      var _this = this;

      return function(response) {
        var error;

        try {
          _this.setDetailFromResponse(results[index], response);
          LOGGER.log("Fetch detail " + _this.id + " finish: " + (new Date));
          LOGGER.log(results[index]);
          _this.fetchDetail(index + 1, results);
        } catch (_error) {
          error = _error;
          _this.updateError('Error in fetchDetailSuccess', error);
        }
        results = null;
      };
    };

    BaseLiveData.prototype.setDetailFromResponse = function(data, response) {
      var $page, commuUrl, dateStr, endDateStr, endTimeMatch, endTimeStr, endYearStr, openTimeStr, startTimeStr, time, timeMatch, yearStr, _ref;

      $page = $($.parseHTML(this.transIMG(response)));
      commuUrl = $page.find('.com,.chan .smn a').prop('href');
      if (commuUrl) {
        data.commuId = (_ref = commuUrl.match(/\/((ch|co)\d+)/)) != null ? _ref[1] : void 0;
      } else {
        LOGGER.log("Could not get commuUrl " + this.id, data);
      }
      if (!data.openTime || !data.startTime) {
        time = $page.find('#bn_gbox .kaijo').text().trim();
        timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/);
        if (timeMatch) {
          yearStr = timeMatch[1];
          dateStr = timeMatch[2];
          openTimeStr = timeMatch[3];
          startTimeStr = timeMatch[4];
          data.openTime || (data.openTime = str2date(yearStr, dateStr, openTimeStr));
          data.startTime || (data.startTime = str2date(yearStr, dateStr, startTimeStr));
        }
      }
      data.thumnail || (data.thumnail = $page.find('#bn_gbox > .bn > meta').attr('content'));
      if (!data.description) {
        data.description = $page.find('.stream_description').text().trim().replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
      }
      if (!data.endTime) {
        endTimeMatch = $page.find('#bn_gbox .kaijo').next().text().match(/この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/);
        if (endTimeMatch) {
          endYearStr = endTimeMatch[1];
          endDateStr = endTimeMatch[2];
          endTimeStr = endTimeMatch[3];
          data.endTime = str2date(endYearStr, endDateStr, endTimeStr);
        }
      }
      data = null;
      response = null;
    };

    BaseLiveData.prototype.fetchError = function(msg) {
      var _this = this;

      return function(response) {
        _this.updateError(msg, response);
        return msg = null;
      };
    };

    BaseLiveData.prototype.updateError = function(msg, obj) {
      var errmsg;

      if (obj == null) {
        obj = null;
      }
      this.isUpdateRunning = false;
      this.isError = true;
      errmsg = "Error: update " + this.id + " " + msg + " (" + (new Date) + ")";
      if (obj) {
        LOGGER.error(errmsg, obj);
      } else {
        LOGGER.error(errmsg);
      }
      if (msg.stack) {
        LOGGER.error(msg.stack);
      }
      if (obj.stack) {
        return LOGGER.error(obj.stack);
      }
    };

    BaseLiveData.prototype.updateComplete = function(results) {
      this.data = null;
      this.cache = results;
      this.isUpdateRunning = false;
      this.isUpdated = true;
      this.isError = false;
      this.lastUpdateTime = new Date;
      LOGGER.info("===== Update " + this.id + " complete =====");
      LOGGER.log(this.lastUpdateTime);
      LOGGER.log(results);
      results = null;
    };

    BaseLiveData.prototype.checkErrorPage = function($page) {
      var $error_type, cause;

      $error_type = $page.find('.error_type');
      if (!$error_type.length) {
        return;
      }
      LOGGER.error($page);
      cause = $error_type.text();
      throw new Error("Cause: " + cause);
    };

    BaseLiveData.prototype.getValidData = function() {
      if (this.cache) {
        return this.cache;
      } else if (this.data) {
        return this.data;
      } else {
        return [];
      }
    };

    BaseLiveData.prototype.countBadge = function() {
      var beforeCount, count, gateCount, notifications, onairCount, time;

      time = this.config.getBadgeBeforeTimeSec(this.id);
      notifications = this.getNofications(time);
      beforeCount = notifications.before.length;
      gateCount = notifications.gate.length;
      onairCount = notifications.onair.length;
      count = 0;
      if (this.config.isBeforeBadgeEnabled(this.id)) {
        count = beforeCount + gateCount + onairCount;
        LOGGER.log("Count badge before open gate: " + this.id + " = " + count);
      } else if (this.config.isGateBadgeEnabled(this.id)) {
        count = gateCount + onairCount;
        LOGGER.log("Count badge open gate: " + this.id + " = " + count);
      } else if (this.config.isOnairBadgeEnabled(this.id)) {
        count = onairCount;
        LOGGER.log("Count badge onair: " + this.id + " = " + count);
      }
      notifications = null;
      return count;
    };

    BaseLiveData.prototype.getNofications = function(beforeTimeSec) {
      var item, items, now, results, _i, _len;

      if (beforeTimeSec == null) {
        beforeTimeSec = null;
      }
      if (beforeTimeSec == null) {
        beforeTimeSec = this.config.getNotificationBeforeTimeSec(this.id);
      }
      items = this.getValidData();
      results = {
        before: [],
        gate: [],
        onair: []
      };
      if (items.length === 0) {
        LOGGER.log("No data " + this.id + " for notification");
        return results;
      }
      now = (new Date).getTime();
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        if (this.isLiveOnair(item, now)) {
          results.onair.push(item);
        } else if (this.isLiveOpenGate(item, now)) {
          results.gate.push(item);
        } else if (this.isLiveBeforeOpenGate(item, now, beforeTimeSec)) {
          results.before.push(item);
        }
      }
      items = null;
      return results;
    };

    BaseLiveData.prototype.isLiveOnair = function(item, now) {
      var startTime, _ref;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      startTime = (_ref = item.startTime) != null ? _ref.getTime() : void 0;
      if (startTime) {
        if (now > startTime) {
          return true;
        }
      }
      return false;
    };

    BaseLiveData.prototype.isLiveOpenGate = function(item, now) {
      var openTime, _ref;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      if (this.isLiveOnair(item, now)) {
        return true;
      }
      openTime = (_ref = item.openTime) != null ? _ref.getTime() : void 0;
      if (openTime && now > openTime) {
        return true;
      }
      return false;
    };

    BaseLiveData.prototype.isLiveBeforeOpenGate = function(item, now, beforeTimeSec) {
      var openTime, _ref;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      if (this.isLiveOpenGate(item, now)) {
        return true;
      }
      openTime = (_ref = item.openTime) != null ? _ref.getTime() : void 0;
      if (openTime && now > openTime - beforeTimeSec * 1000) {
        return true;
      }
      return false;
    };

    BaseLiveData.prototype.isLiveClosed = function(item, now) {
      var endTime, _ref;

      endTime = (_ref = item.endTime) != null ? _ref.getTime() : void 0;
      if (endTime && now > endTime) {
        return true;
      }
      return false;
    };

    BaseLiveData.prototype.transIMG = function(html) {
      return html.replace(/<img([^>]+)>/g, '<imgx$1>');
    };

    return BaseLiveData;

  })();

  Favorite = (function(_super) {
    __extends(Favorite, _super);

    function Favorite(config) {
      this.fetchFromMypageSuccess = __bind(this.fetchFromMypageSuccess, this);      Favorite.__super__.constructor.call(this, 'favorite', config);
    }

    Favorite.prototype.updateData = function() {
      this.fetchFromMypage();
    };

    Favorite.prototype.getUpdateInterval = function() {
      return 180 * 1000;
    };

    Favorite.prototype.fetchFromMypage = function() {
      var ajax;

      ajax = new AjaxEx;
      ajax.ajax({
        url: BaseLiveData.MY_PAGE_URL
      }).done(this.fetchFromMypageSuccess).fail(this.fetchError("from mypage url=" + BaseLiveData.MY_PAGE_URL));
      ajax = null;
    };

    Favorite.prototype.fetchFromMypageSuccess = function(response) {
      var $page, error, results;

      try {
        $page = $($.parseHTML(this.transIMG(response)));
        results = this.getResultsFromMypage($page);
        if (!results || results.length === 0) {
          this.checkErrorPage($page);
          LOGGER.log('No results', response);
        }
        this.updateComplete(results);
      } catch (_error) {
        error = _error;
        this.updateError('Error in fetchFromMypageSuccess', error);
      }
      results = null;
    };

    Favorite.prototype.getResultsFromMypage = function($page) {
      var $item, $items, a, dateStr, item, now, nowYear, openTimeStr, results, ret, startTimeStr, time, timeMatch, _i, _len, _ref;

      $items = $page.find('#Favorite_list .liveItems .liveItem,.liveItem_reserve,.liveItem_ch');
      now = new Date();
      nowYear = now.getFullYear();
      results = [];
      for (_i = 0, _len = $items.length; _i < _len; _i++) {
        item = $items[_i];
        $item = $(item);
        ret = {};
        a = $item.children('a').first();
        ret.link = changeGate2Watch(a.attr('href'));
        ret.id = getLiveIdFromUrl(ret.link);
        ret.title = a.attr('title');
        ret.thumnail = a.children('imgx').first().attr('src').replace(/\/s\//, '/');
        ret.commuId = (_ref = ret.thumnail.match(/\/((ch|co)\d+)/)) != null ? _ref[1] : void 0;
        time = $item.find('.start_time strong')[0].innerHTML.trim();
        timeMatch = time.match(/(\d\d\/\d\d).*開場 (\d\d:\d\d) 開演 (\d\d:\d\d)/);
        if (timeMatch) {
          openTimeStr = timeMatch[2];
          startTimeStr = timeMatch[3];
        } else {
          timeMatch = time.match(/(\d\d\/\d\d).*(\d\d:\d\d) 開始/);
          openTimeStr = null;
          startTimeStr = timeMatch[2];
        }
        dateStr = timeMatch[1];
        if (openTimeStr) {
          ret.openTime = str2date(nowYear, dateStr, openTimeStr);
        }
        ret.startTime = str2date(nowYear, dateStr, startTimeStr);
        ret.description = $item.find('.liveItemTxt > p:nth-of-type(2)')[0].innerHTML;
        results.push(ret);
      }
      results.sort(function(a, b) {
        var at, bt;

        if (a.startTime) {
          at = a.startTime.getTime();
          bt = b.startTime.getTime();
          if (at < bt) {
            return -1;
          }
          if (at > bt) {
            return 1;
          }
        }
        return 0;
      });
      return results;
    };

    return Favorite;

  })(BaseLiveData);

  Timeshift = (function(_super) {
    __extends(Timeshift, _super);

    function Timeshift(config) {
      this.fetchFromMypageSuccess = __bind(this.fetchFromMypageSuccess, this);      Timeshift.__super__.constructor.call(this, 'timeshift', config);
      this.fetchIntervalSec = 3.5;
    }

    Timeshift.prototype.updateData = function() {
      this.fetchFromMypage();
    };

    Timeshift.prototype.fetchFromMypage = function() {
      var ajax;

      ajax = new AjaxEx;
      ajax.ajax({
        url: BaseLiveData.MY_PAGE_URL
      }).done(this.fetchFromMypageSuccess).fail(this.fetchError("from mypage url=" + BaseLiveData.MY_PAGE_URL));
      ajax = null;
    };

    Timeshift.prototype.fetchFromMypageSuccess = function(response) {
      var $page, error, results;

      try {
        $page = $($.parseHTML(this.transIMG(response)));
        results = this.getResultsFromMypage($page);
        LOGGER.log("Fetch timeshift from mypage finish");
        if (!results || results.length === 0) {
          this.checkErrorPage($page);
          LOGGER.log('No results', response);
        }
        this.fetchDetail(0, results);
        this.data = results;
        results = null;
      } catch (_error) {
        error = _error;
        this.updateError('Error in fetchFromMypageSuccess', error);
      }
    };

    Timeshift.prototype.getResultsFromMypage = function($page) {
      var $item, $items, $status, a, i, item, results, ret, status, _i, _len;

      $items = $page.find('#liveItemsWrap .liveItems .column');
      results = [];
      for (i = _i = 0, _len = $items.length; _i < _len; i = ++_i) {
        item = $items[i];
        $item = $(item);
        ret = {};
        a = $item.find('.name > a');
        ret.link = changeGate2Watch(a.attr('href'));
        ret.title = a.attr('title');
        ret.id = getLiveIdFromUrl(ret.link);
        $status = $item.find('.status .timeshift_watch');
        if ($status.length > 0) {
          status = $status.text().replace(/視聴する/g, '').replace(/\s+/g, ' ');
          ret.description = "視聴可" + status;
          ret.flag = 'watch';
        } else {
          $status = $item.find('.status .timeshift_reservation');
          if ($status.length > 0) {
            ret.description = $status[0].innerHTML.replace(/\s+/g, ' ');
            ret.flag = 'reservation';
          } else {
            $status = $item.find('.status .timeshift_disable');
            if ($status.length > 0) {
              ret.description = $status[0].innerHTML.replace(/\s+/g, ' ');
              ret.flag = 'disable';
            } else {
              ret.description = '不明';
              ret.flag = 'unknown';
            }
          }
        }
        results.push(ret);
      }
      return results;
    };

    return Timeshift;

  })(BaseLiveData);

  Official = (function(_super) {
    __extends(Official, _super);

    function Official(config) {
      this.fetchFromRankSuccess = __bind(this.fetchFromRankSuccess, this);      Official.__super__.constructor.call(this, 'official', config);
    }

    Official.prototype.updateData = function() {
      this.fetchFromRank();
    };

    Official.prototype.fetchFromRank = function() {
      var ajax;

      ajax = new AjaxEx;
      ajax.ajax({
        url: BaseLiveData.OFFICIAL_LIVE_RANK
      }).done(this.fetchFromRankSuccess).fail(this.fetchError("from rank url=" + BaseLiveData.OFFICIAL_LIVE_RANK));
      ajax = null;
    };

    Official.prototype.fetchFromRankSuccess = function(response) {
      var $page, error, results;

      try {
        $page = $($.parseHTML(this.transIMG(response)));
        results = this.getResultsFromRank($page);
        LOGGER.log("Fetch official from rank finish");
        this.fetchFromComingsoon(1, results);
        this.data = results;
        results = null;
      } catch (_error) {
        error = _error;
        this.updateError('Error in fetchFromRankSuccess', error);
      }
    };

    Official.prototype.getResultsFromRank = function($page) {
      var $item, item, results, ret, _i, _len, _ref;

      results = [];
      _ref = $page.find('#official_ranking_main .ranking_video');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        item = _ref[_i];
        ret = {};
        $item = $(item);
        ret.id = 'lv' + $item.find('.video_id')[0].innerHTML;
        ret.title = $item.find('.video_title')[0].innerHTML;
        ret.link = BaseLiveData.LIVE_URL + ret.id;
        results.push(ret);
      }
      return results;
    };

    Official.prototype.fetchFromComingsoon = function(index, results) {
      var ajax;

      ajax = new AjaxEx;
      ajax.ajax({
        url: BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index,
        type: 'GET',
        dataType: 'json'
      }).done(this.fetchFromComingsoonSuccess(index, results)).fail(this.fetchError("from comingsoon url=" + (BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index)));
      ajax = null;
      results = null;
    };

    Official.prototype.fetchFromComingsoonSuccess = function(index, results) {
      var _this = this;

      return function(response) {
        var error, json;

        try {
          json = response.reserved_stream_list;
          if (!json) {
            LOGGER.log('Fetch official from comingsoon finish all');
            _this.fetchDetail(0, results);
            _this.official = results;
            results = null;
            return;
          }
          _this.getResultsFromComingsoon(json, results);
          LOGGER.log("Fetch official from comingsoon finish " + index);
          _this.fetchFromComingsoon(index + 1, results);
        } catch (_error) {
          error = _error;
          _this.updateError('Error in fetchFromComingsoonSuccess', error);
        }
        results = null;
      };
    };

    Official.prototype.getResultsFromComingsoon = function(json, results) {
      var item, ret, _i, _len;

      for (_i = 0, _len = json.length; _i < _len; _i++) {
        item = json[_i];
        ret = {};
        ret.id = 'lv' + item.id;
        ret.title = item.title;
        ret.link = BaseLiveData.LIVE_URL + ret.id;
        ret.thumnail = item.picture_url;
        ret.description = item.description;
        ret.startTime = new Date(item.start_date_timestamp_sec * 1000);
        ret.endTime = new Date(item.end_date_timestamp_sec * 1000);
        ret.playStatus = item.currentstatus;
        results.push(ret);
      }
      results = null;
    };

    Official.prototype.isCancelFethDetail = function(item, now) {
      if (Official.__super__.isCancelFethDetail.call(this, item, now)) {
        return true;
      }
      if (item.openTime && item.startTime) {
        return true;
      }
      return false;
    };

    return Official;

  })(BaseLiveData);

  History = (function() {
    History.ID = 'history';

    History.SAVE_TIMER_SEC = 300;

    History.MAX_SIZE = 100;

    History.prototype.saveTimer = null;

    function History(config) {
      this.config = config;
      if (!this.config.isNiconamaEnabled(History.ID)) {
        this._clearHistory();
      }
    }

    History.prototype._getHistory = function() {
      var hist;

      hist = localStorage.getItem(History.ID);
      LOGGER.log("_getHistory", hist);
      if (hist) {
        return JSON.parse(hist);
      } else {
        LOGGER.info('First getting history.');
        return {};
      }
      hist = null;
    };

    History.prototype._setHistory = function(hist) {
      localStorage.setItem(History.ID, JSON.stringify(hist));
      LOGGER.log("Saved history");
    };

    History.prototype._clearHistory = function() {
      LOGGER.info('Clear history');
      localStorage.removeItem(History.ID);
    };

    History.prototype._sortHistory = function(hist) {
      var histories, item, key;

      histories = (function() {
        var _results;

        _results = [];
        for (key in hist) {
          item = hist[key];
          _results.push(item);
        }
        return _results;
      })();
      histories.sort(function(a, b) {
        var at, bt;

        at = a.accessTime;
        bt = b.accessTime;
        if (at && bt) {
          if (at > bt) {
            return -1;
          }
          if (at < bt) {
            return 1;
          }
        }
        return 0;
      });
      return histories;
    };

    History.prototype._removeOldHistory = function(hist) {
      var histories, i, id, over, _i, _ref;

      histories = this._sortHistory(hist);
      over = histories.length - History.MAX_SIZE;
      if (over <= 0) {
        LOGGER.log('Need not to remove old history');
        return;
      }
      for (i = _i = 0, _ref = over - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        id = histories[i].id;
        LOGGER.log("Remove history " + id);
        delete hist[id];
      }
      histories = null;
    };

    History.prototype.saveHistory = function(data) {
      var hist;

      if (!this.config.isNiconamaEnabled('history')) {
        LOGGER.log('Cancel save history (disable)');
        return false;
      }
      LOGGER.log("Save history", data);
      console.assert(data.id, "id does not exist");
      hist = this._getHistory();
      hist[data.id] = data;
      this._removeOldHistory(hist);
      this._setHistory(hist);
      hist = null;
      return true;
    };

    History.prototype.getHistories = function() {
      return this._sortHistory(this._getHistory());
    };

    return History;

  })();

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  exports.config = new Config;

  exports.history = new History(config);

  exports.bg = new Background(config, history);

  exports.nicoInfo = new NicoInfo(config);

  exports.liveChecker = new LiveChecker(config, nicoInfo);

}).call(this);
