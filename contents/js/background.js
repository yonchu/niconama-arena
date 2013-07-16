//@ sourceMappingURL=background.map
(function() {
  var Background, Badge, BaseLiveData, Config, ConfigCommands, DetailFetcher, Favorite, History, HistoryCommands, LOGGER, LiveChecker, MyPage, NicoInfo, Notification, Official, OpenTab, Timeshift, bg, common, exports, _ref,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  common = exports.CHEX.common;

  LOGGER = new common.Logger(common.Logger.LEVEL.WARN);

  bg = exports.namespace('CHEX.bg');

  bg.Background = Background = (function() {
    function Background(commands) {
      this.commands = commands;
      LOGGER.log("[Background] Initializing...", this.commands);
      this.initEventListeners();
    }

    Background.prototype.initEventListeners = function() {
      var _this = this;

      chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        var args, logmsg, res, target;

        target = _this.commands[request.target];
        if (sender.tab) {
          logmsg = "[Background] Received message from a content script: " + sender.tab.url;
        } else {
          logmsg = "[Background] Received message  from the extension";
        }
        LOGGER.log(logmsg, request, target);
        if (!target) {
          throw Error("Invalid target " + request.target, _this.commands);
        }
        args = request.args;
        args.push(sendResponse);
        res = target[request.action].apply(target, args);
        if (res != null) {
          sendResponse({
            res: res
          });
        }
        return true;
      });
    };

    return Background;

  })();

  bg.ConfigCommands = ConfigCommands = (function() {
    function ConfigCommands(config) {
      this.config = config;
    }

    ConfigCommands.prototype.getOpentabStatus = function(commuId) {
      return this.config.getOpentabStatus(commuId);
    };

    ConfigCommands.prototype.setOpentabStatus = function(commuId, status) {
      this.config.setOpentabStatus(commuId, status);
      return true;
    };

    ConfigCommands.prototype.getConfigForAutoJump = function() {
      return this.config.getConfigForAutoJump();
    };

    return ConfigCommands;

  })();

  bg.HistoryCommands = HistoryCommands = (function() {
    function HistoryCommands(history) {
      this.history = history;
    }

    HistoryCommands.prototype.saveHistory = function(data) {
      return this.history.saveHistory(data);
    };

    return HistoryCommands;

  })();

  bg.Config = Config = (function() {
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
        blacklist: [],
        whitelist: []
      }
    };

    function Config() {
      this.opentabStatus = {};
      this._initSettings();
    }

    Config.prototype._getValue = function(key, def) {
      var value;

      if (def == null) {
        def = void 0;
      }
      value = localStorage[key];
      console.assert(value !== 'undefined', "[Config] Error: Unexpected value in localStorage (key=" + key + "})");
      if (value != null) {
        return value;
      } else {
        return def;
      }
    };

    Config.prototype._setValue = function(key, value) {
      console.assert(value !== 'undefined', "[Config] Error: Unexpected value in localStorage (key=" + key + "})");
      if (value) {
        localStorage[key] = value;
      } else {
        localStorage.removeItem(key);
      }
    };

    Config.prototype._initSettings = function() {
      var settings;

      settings = localStorage.settings;
      if (settings) {
        this.settings = JSON.parse(settings);
      } else {
        this.settings = bg.Config.DEFAULT_SETTINGS;
        this.save();
        LOGGER.info('[Config] Save default settings.');
      }
    };

    Config.prototype.save = function() {
      var settings;

      settings = JSON.stringify(this.settings);
      localStorage.settings = settings;
      LOGGER.log("[Config] Saved settings: ", settings);
    };

    Config.prototype._getSettingsValue = function(key, def) {
      var value;

      if (def == null) {
        def = void 0;
      }
      if (!this.settings.hasOwnProperty(key)) {
        throw Error("Invalid key " + key);
      }
      value = this.settings[key];
      console.assert(value !== 'undefined', "[Config] Error: Unexpected value in settings (key=" + key + "})");
      if (value != null) {
        return value;
      } else {
        return def;
      }
    };

    Config.prototype._setSettingsValue = function(key, value) {
      console.assert(value !== 'undefined', "[Config] Error: Unexpected value in localStorage (key=" + key + "})");
      if (value == null) {
        throw Error("invalid value " + value);
      }
      if (this.settings[key] == null) {
        throw Error("invalid key " + key);
      }
      this.settings[key] = value;
    };

    Config.prototype._getSettingsFlag = function(key) {
      var value;

      value = this._getSettingsValue(key);
      return !!value;
    };

    Config.prototype._setSettingsFlag = function(key, value) {
      this._setSettingsValue(key, !!value);
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

    Config.prototype.getSaveTabId = function() {
      return this._getValue('saveTabId');
    };

    Config.prototype.setSaveTabId = function(value) {
      this._setValue('saveTabId', value);
    };

    Config.prototype.getEnabledNiconamaSettings = function() {
      return this._getSettingsValue('enabledNiconama');
    };

    Config.prototype.isNiconamaEnabled = function(key) {
      return this.getEnabledNiconamaSettings()[key];
    };

    Config.prototype.setEnabledNiconamaSettings = function(key, value) {
      this.getEnabledNiconamaSettings()[key] = !!value;
    };

    Config.prototype.getNiconamaUpdateIntervalSec = function() {
      return this._getSettingsValue('niconamaUpdateIntervalSec');
    };

    Config.prototype.setNiconamaUpdateIntervalSec = function(value) {
      if (!this._isInt(value)) {
        throw Error("Invalid value " + value);
      }
      this._setSettingsValue('niconamaUpdateIntervalSec', value);
    };

    Config.prototype.getBadgeSettings = function() {
      return this._getSettingsValue('badge');
    };

    Config.prototype.getBadgeEnable = function(key) {
      return this.getBadgeSettings()[key].enable;
    };

    Config.prototype.setBadgeEnable = function(key, value) {
      var _ref1;

      if (!value || (_ref1 = !value, __indexOf.call(bg.Config.BADGE_ENABLE_VALUES, _ref1) >= 0)) {
        throw Error("Invalid value " + value);
      }
      this.getBadgeSettings()[key].enable = value;
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
      return this.getBadgeSettings()[key].beforeTimeSec;
    };

    Config.prototype.setBadgeBeforeTimeSec = function(key, value) {
      if (!this._isInt(value)) {
        throw Error("Invalid value " + value);
      }
      this.getBadgeSettings()[key].beforeTimeSec = value;
    };

    Config.prototype.getNotificationSettings = function() {
      return this._getSettingsValue('notification');
    };

    Config.prototype.getNotificationEnable = function(key) {
      return this.getNotificationSettings()[key].enable;
    };

    Config.prototype.setNotificationEnable = function(key, value) {
      var _ref1;

      if (!value || (_ref1 = !value, __indexOf.call(bg.Config.BADGE_ENABLE_VALUES, _ref1) >= 0)) {
        throw Error("Invalid value " + value);
      }
      this.getNotificationSettings()[key].enable = value;
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
      return this.getNotificationSettings()[key].beforeTimeSec;
    };

    Config.prototype.getOpentabSettings = function() {
      return this._getSettingsValue('opentab');
    };

    Config.prototype.getOpentabEnable = function(key) {
      return this.getOpentabSettings()[key].enable;
    };

    Config.prototype.setOpentabEnable = function(key, value) {
      var _ref1;

      if (!value || (_ref1 = !value, __indexOf.call(bg.Config.BADGE_ENABLE_VALUES, _ref1) >= 0)) {
        throw Error("Invalid value " + value);
      }
      this.getOpentabSettings()[key].enable = value;
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
      return this.getOpentabSettings()[key].beforeTimeSec;
    };

    Config.prototype.isRuleBlackList = function() {
      var rule;

      rule = this.getOpentabSettings()['rule'];
      return !rule || rule === 'blacklist';
    };

    Config.prototype.getBlackList = function() {
      return this.getOpentabSettings()['blacklist'] || [];
    };

    Config.prototype.setBlackList = function(list) {
      if (($.type(list)) !== 'array') {
        throw Error("Invalid list " + list);
      }
      this.getOpentabSettings()['blacklist'] = list;
    };

    Config.prototype.isOpentabEnable = function(commuId) {
      return (this.getOpentabStatus(commuId)) === 'enable';
    };

    Config.prototype.getOpentabStatus = function(commuId) {
      var st;

      if (__indexOf.call(this.getBlackList(), commuId) >= 0) {
        return 'disable';
      }
      st = this.opentabStatus[commuId] || 'enable';
      if (st === 'disable') {
        delete this.opentabStatus[commuId];
        st = 'enable';
      }
      return st;
    };

    Config.prototype.setOpentabStatus = function(commuId, status) {
      var save;

      this.opentabStatus[commuId] = status;
      save = false;
      if (status === 'disable') {
        save = this.addOpentabBlackList(commuId);
      } else {
        save = this.removeOpentabBlackList(commuId);
      }
      if (save) {
        this.save();
      }
    };

    Config.prototype.addOpentabBlackList = function(commuId) {
      var list;

      list = this.getBlackList();
      if (__indexOf.call(list, commuId) >= 0) {
        return false;
      }
      list.push(commuId);
      return true;
    };

    Config.prototype.removeOpentabBlackList = function(commuId) {
      var idx, list;

      list = this.getBlackList();
      idx = list.indexOf(commuId);
      if (idx < 0) {
        return false;
      }
      list.splice(idx, 1);
      return true;
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
        throw Error("Invalid value " + value);
      }
      value = parseInt(value, 10);
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

      conf = {
        enableAutoJump: this.getEnableAutoJump(),
        autoJumpIntervalSec: this.getAutoJumpIntervalSec(),
        enableAutoEnter: this.getEnableAutoEnter(),
        enableHistory: this.isNiconamaEnabled('history')
      };
      LOGGER.log("[Config] Get config for autojump", conf);
      return conf;
    };

    return Config;

  })();

  bg.NicoInfo = NicoInfo = (function() {
    function NicoInfo(config) {
      this.config = config;
      this.updateAll = __bind(this.updateAll, this);
      this.liveDataList = [new bg.Favorite(this.config), new bg.Timeshift(this.config), new bg.Official(this.config)];
      this._init();
    }

    NicoInfo.prototype._init = function() {
      this.updateAll(true, false);
    };

    NicoInfo.prototype.getLiveData = function(key) {
      var liveData, _i, _len, _ref1;

      _ref1 = this.liveDataList;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        liveData = _ref1[_i];
        if (liveData.id === key) {
          return liveData;
        }
      }
      throw Error("Invalid key " + key);
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
        liveData.isUpdated = !!value;
      }
      return liveData.isUpdated;
    };

    NicoInfo.prototype.getLastUpdateTime = function(key) {
      try {
        return this.getLiveData(key).lastUpdateTime;
      } catch (_error) {}
    };

    NicoInfo.prototype.countBadge = function(key) {
      return this.getLiveData(key).countBadge();
    };

    NicoInfo.prototype.updateAll = function(force, useCache) {
      var liveData, _i, _len, _ref1;

      if (force == null) {
        force = false;
      }
      if (useCache == null) {
        useCache = true;
      }
      _ref1 = this.liveDataList;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        liveData = _ref1[_i];
        liveData.update(force, useCache);
      }
    };

    return NicoInfo;

  })();

  bg.LiveChecker = LiveChecker = (function() {
    LiveChecker.CHECK_TIMER_INTERVAL_SEC = 30;

    function LiveChecker(config, nicoInfo) {
      this.config = config;
      this.nicoInfo = nicoInfo;
      this._onTimeoutCheck = __bind(this._onTimeoutCheck, this);
      this.badge = new bg.Badge(this.config, this.nicoInfo);
      this.openTab = new bg.OpenTab(this.config, this.nicoInfo);
      this.notification = new bg.Notification(this.config, this.nicoInfo);
      this._initEventListeners();
    }

    LiveChecker.prototype._initEventListeners = function() {
      var time;

      time = bg.LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000;
      LOGGER.log("[LiveChecker] Setup check timer", time);
      setTimeout(this._onTimeoutCheck, time);
    };

    LiveChecker.prototype._onTimeoutCheck = function() {
      var _this = this;

      LOGGER.log('[LiveChecker] Start live checker process.');
      $.when(this.badge.run(), this.notification.run(), this.openTab.run()).always(function() {
        var time;

        LOGGER.log('[LiveChecker] End live check process.');
        time = bg.LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000;
        LOGGER.log("[LiveChecker] Setup check timer", time);
        setTimeout(_this._onTimeoutCheck, time);
      });
    };

    LiveChecker.prototype.getNotificationTarget = function(index) {
      return this.notification.getTargets(index);
    };

    return LiveChecker;

  })();

  bg.Badge = Badge = (function() {
    Badge.BG_COLOR = [0, 80, 255, 255];

    Badge.BG_COLOR_ERROR = [255, 0, 0, 255];

    function Badge(config, nicoInfo) {
      this.config = config;
      this.nicoInfo = nicoInfo;
      chrome.browserAction.setBadgeText({
        text: ''
      });
    }

    Badge.prototype.run = function() {
      var count, liveData, liveDataList, _i, _j, _len, _len1;

      LOGGER.log('[Badge] Start set badge process.');
      liveDataList = this.nicoInfo.liveDataList;
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        if (liveData.isError) {
          LOGGER.warn("[Badge] Set error badge " + liveData.id);
          this._setErrorBadge();
          return;
        }
      }
      count = 0;
      for (_j = 0, _len1 = liveDataList.length; _j < _len1; _j++) {
        liveData = liveDataList[_j];
        count += liveData.countBadge();
      }
      LOGGER.log("[Badge] Set badge: " + count);
      this._setBadge(count);
      LOGGER.log('[Badge] End set badge process.');
    };

    Badge.prototype._setBadge = function(text) {
      if (text == null) {
        text = '';
      }
      text += '';
      chrome.browserAction.setBadgeBackgroundColor({
        color: bg.Badge.BG_COLOR
      });
      chrome.browserAction.setBadgeText({
        text: text
      });
    };

    Badge.prototype._setErrorBadge = function() {
      chrome.browserAction.setBadgeBackgroundColor({
        color: bg.Badge.BG_COLOR_ERROR
      });
      chrome.browserAction.setBadgeText({
        text: '' + 'x'
      });
    };

    return Badge;

  })();

  bg.OpenTab = OpenTab = (function() {
    function OpenTab(config, nicoInfo) {
      this.config = config;
      this.nicoInfo = nicoInfo;
      this.history = {};
      this.defer = null;
    }

    OpenTab.prototype.run = function() {
      LOGGER.log('[OpenTab] Start open tabs process.');
      this.defer = $.Deferred();
      this._openTabs(this._getTargets());
      return this.defer.promise();
    };

    OpenTab.prototype._getTargets = function() {
      var isBeforeEnabled, isGateEnabled, isOnairEnabled, item, liveData, liveDataList, n, openTabTargets, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref2, _ref3;

      liveDataList = this.nicoInfo.liveDataList;
      openTabTargets = [];
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        n = liveData.getNofications();
        isBeforeEnabled = this.config.isBeforeOpentabEnabled(liveData.id);
        isGateEnabled = this.config.isGateOpentabEnabled(liveData.id);
        isOnairEnabled = this.config.isOnairOpentabEnabled(liveData.id);
        if (isBeforeEnabled) {
          _ref1 = n.before;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            item = _ref1[_j];
            if (item.commuId && !this.config.isOpentabEnable(item.commuId)) {
              continue;
            }
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'before') < 0) {
                this.history[item.id].push('before');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('before');
            openTabTargets.push(item.link);
          }
        }
        if (isBeforeEnabled || isGateEnabled) {
          _ref2 = n.gate;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            item = _ref2[_k];
            if (item.commuId && !this.config.isOpentabEnable(item.commuId)) {
              continue;
            }
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'gate') < 0) {
                this.history[item.id].push('gate');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('gate');
            openTabTargets.push(item.link);
          }
        }
        if (isBeforeEnabled || isGateEnabled || isOnairEnabled) {
          _ref3 = n.onair;
          for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
            item = _ref3[_l];
            if (item.commuId && !this.config.isOpentabEnable(item.commuId)) {
              continue;
            }
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'onair') < 0) {
                this.history[item.id].push('onair');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('onair');
            openTabTargets.push(item.link);
          }
        }
      }
      if (openTabTargets.length > 0) {
        LOGGER.info("[OpenTab] Total open tab: " + openTabTargets.length);
        LOGGER.log(openTabTargets);
      }
      return openTabTargets;
    };

    OpenTab.prototype._openTabs = function(targets) {
      var n, tryNext,
        _this = this;

      n = targets.length;
      tryNext = function(index) {
        if (index >= n) {
          LOGGER.log('[OpenTab] End open tabs process.');
          _this.defer.resolve();
          targets = null;
          index = null;
          n = null;
          tryNext = null;
          return;
        }
        chrome.tabs.query({}, function(tabs) {
          var error, target;

          try {
            target = targets[index];
            if (_this._openTab(target, tabs)) {
              LOGGER.log("[OpenTab] Open tab: " + index + " - " + target);
            } else {
              LOGGER.info("[OpenTab] Cancel open tab (already opened): " + index + " - " + target);
            }
            tryNext(index + 1);
          } catch (_error) {
            error = _error;
            LOGGER.error("[OpenTab] Catch error in _openTabs.", error);
            if (error.stack) {
              LOGGER.error(error.stack);
            }
            _this.defer.reject();
          }
          index = null;
        });
      };
      tryNext(0);
    };

    OpenTab.prototype._openTab = function(url, tabs) {
      var matchUrl, re, tab, _i, _len, _ref1;

      matchUrl = url.replace(/http[s]?:\/\//, '').replace(/\?.*/, '');
      re = new RegExp(matchUrl);
      for (_i = 0, _len = tabs.length; _i < _len; _i++) {
        tab = tabs[_i];
        if ((_ref1 = tab.url) != null ? _ref1.match(re) : void 0) {
          return false;
        }
      }
      chrome.tabs.create({
        url: url,
        active: false
      });
      return true;
    };

    return OpenTab;

  })();

  bg.Notification = Notification = (function() {
    Notification.NOTIFICATION_TIMEOUT_SEC = 3.5;

    Notification.NOTIFICATION_NEW_VER_TIMEOUT_SEC = 4;

    Notification.NOTIFICATION_URL = (chrome.extension.getURL('html/notification.html')) + '#';

    function Notification(config, nicoInfo) {
      var _ref1;

      this.config = config;
      this.nicoInfo = nicoInfo;
      this._onerrorNotification = __bind(this._onerrorNotification, this);
      this._oncloseNotification = __bind(this._oncloseNotification, this);
      this._ondisplayNotification = __bind(this._ondisplayNotification, this);
      this._onClickedNotificationNewVer = __bind(this._onClickedNotificationNewVer, this);
      this._onClosedNotificationNewVer = __bind(this._onClosedNotificationNewVer, this);
      this._onCreateNotificationNewVer = __bind(this._onCreateNotificationNewVer, this);
      this.history = {};
      this.targets = null;
      this.index = 0;
      this.ntf = null;
      this.ntfId = null;
      this.cancelTimer = null;
      this.isSupportedWebkitNotifications = null;
      if ((_ref1 = exports.webkitNotifications) != null ? _ref1.createHTMLNotification : void 0) {
        LOGGER.info('[Notification] Notifications (webkitNotifications) are supported!');
        this.isSupportedWebkitNotifications = true;
      } else if (chrome.notifications) {
        LOGGER.info('[Notification] Notifications (chrome.notifications) are supported!');
        this.isSupportedWebkitNotifications = false;
        chrome.notifications.onClosed.addListener(this._onClosedNotificationNewVer);
        chrome.notifications.onClicked.addListener(this._onClickedNotificationNewVer);
      } else {
        LOGGER.error('[Notification] Notifications are not supported for this Browser/OS version.');
      }
    }

    Notification.prototype.run = function() {
      var error;

      LOGGER.log('[Notification] Start notification process.');
      try {
        this.defer = $.Deferred();
        if (this.isSupportedWebkitNotifications == null) {
          throw Error("Notifications are not supported.");
        }
        this._makeTargets();
        this._notify();
      } catch (_error) {
        error = _error;
        this.targets = null;
        this.defer.reject();
        LOGGER.error('[Notification] error in run.', error);
      }
      return this.defer.promise();
    };

    Notification.prototype.getTargets = function(index) {
      if (!this.targets || this.targets.length <= index) {
        throw Error("invalid index " + index);
      }
      return this.targets[index];
    };

    Notification.prototype._makeTargets = function() {
      var isBeforeEnabled, isGateEnabled, isOnairEnabled, item, liveData, liveDataList, n, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref2, _ref3;

      if (this.targets) {
        LOGGER.info('[Notification] Cancel notification (now notifying)');
        return;
      }
      this.targets = [];
      liveDataList = this.nicoInfo.liveDataList;
      for (_i = 0, _len = liveDataList.length; _i < _len; _i++) {
        liveData = liveDataList[_i];
        n = liveData.getNofications();
        isBeforeEnabled = this.config.isBeforeNotificationEnabled(liveData.id);
        isGateEnabled = this.config.isGateNotificationEnabled(liveData.id);
        isOnairEnabled = this.config.isOnairNotificationEnabled(liveData.id);
        if (isBeforeEnabled) {
          _ref1 = n.before;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            item = _ref1[_j];
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'before') < 0) {
                this.history[item.id].push('before');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('before');
            this.targets.push(item);
          }
        }
        if (isBeforeEnabled || isGateEnabled) {
          _ref2 = n.gate;
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            item = _ref2[_k];
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'gate') < 0) {
                this.history[item.id].push('gate');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('gate');
            this.targets.push(item);
          }
        }
        if (isBeforeEnabled || isGateEnabled || isOnairEnabled) {
          _ref3 = n.onair;
          for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
            item = _ref3[_l];
            if (this.history[item.id]) {
              if (__indexOf.call(this.history[item.id], 'onair') < 0) {
                this.history[item.id].push('onair');
              }
              continue;
            }
            this.history[item.id] = [];
            this.history[item.id].push('onair');
            this.targets.push(item);
          }
        }
      }
      if (this.targets.length > 0) {
        LOGGER.info("[Notification] Total notifications: " + this.targets.length);
        LOGGER.log(this.targets);
      }
    };

    Notification.prototype._notify = function() {
      var t;

      if (!this.targets || this.index >= this.targets.length) {
        LOGGER.log('[Notification] End notification process.');
        t = this.targets;
        this._clean();
        this.defer.resolve(t);
        return;
      }
      if (this.isSupportedWebkitNotifications) {
        this._notifyWithHtml();
      } else {
        this._notifyNewVersion();
      }
    };

    Notification.prototype._notifyNewVersion = function() {
      var message, opt, target;

      target = this.targets[this.index];
      message = this._createMessageForNewVer(target);
      opt = {
        type: 'basic',
        title: target.title,
        message: message,
        iconUrl: target.thumnail
      };
      chrome.notifications.create('', opt, this._onCreateNotificationNewVer);
    };

    Notification.prototype._onCreateNotificationNewVer = function(notificationId) {
      var _this = this;

      if (!notificationId) {
        LOGGER.error("[Notification] Notification create error (notificationId is null)", this.targets[this.index]);
        this._onClosedNotificationNewVer();
        return;
      }
      this.ntfId = notificationId;
      this.cancelTimer = setTimeout(function() {
        _this.cancelTimer = null;
        chrome.notifications.clear(notificationId, function(wasCleared) {
          if (!wasCleared) {
            LOGGER.error("[Notification] Notification clear failed (wasCleared is false)", _this.targets[_this.index]);
          }
        });
        notificationId = null;
      }, bg.Notification.NOTIFICATION_NEW_VER_TIMEOUT_SEC * 1000);
    };

    Notification.prototype._onClosedNotificationNewVer = function(notificationId, byUser) {
      if (this.cancelTimer) {
        clearTimeout(this.cancelTimer);
        this.cancelTimer = null;
      }
      this.index += 1;
      this._notify();
    };

    Notification.prototype._onClickedNotificationNewVer = function(notificationId) {
      chrome.tabs.create({
        url: this.targets[this.index].link,
        active: true
      });
    };

    Notification.prototype._createMessageForNewVer = function(target) {
      var msg, now, statusMsg, timeMsg;

      msg = '';
      now = Date.now();
      this.setStatus;
      timeMsg = common.notification.timeMsg(target.openTime, target.startTime);
      if (timeMsg.openTime) {
        msg += timeMsg.openTime;
        if (timeMsg.startTime) {
          msg += '  ';
        }
      }
      if (timeMsg.startTime) {
        msg += timeMsg.startTime;
      }
      msg += '\n';
      statusMsg = common.notification.statusMsg(target.openTime, target.startTime, target.endTime, now);
      if (statusMsg.text) {
        msg += statusMsg.text;
      }
      return msg;
    };

    Notification.prototype._notifyWithHtml = function() {
      var url;

      url = bg.Notification.NOTIFICATION_URL + this.index;
      LOGGER.log("[Notification] Notify(html) " + url + "\n", this.targets[this.index]);
      this.ntf = webkitNotifications.createHTMLNotification(url);
      this.ntf.ondisplay = this._ondisplayNotification;
      this.ntf.onclose = this._oncloseNotification;
      this.ntf.onerror = this._onerrorNotification;
      this.ntf.show();
    };

    Notification.prototype._ondisplayNotification = function(event) {
      var _this = this;

      this.cancelTimer = setTimeout(function() {
        _this.cancelTimer = null;
        if (_this.ntf) {
          _this.ntf.cancel();
        }
        event = null;
      }, bg.Notification.NOTIFICATION_TIMEOUT_SEC * 1000);
    };

    Notification.prototype._oncloseNotification = function(event) {
      if (this.cancelTimer) {
        clearTimeout(this.cancelTimer);
        this.cancelTimer = null;
      }
      this.index += 1;
      this._notify();
    };

    Notification.prototype._onerrorNotification = function(event) {
      var t;

      LOGGER.error("[Notification] Notification error index=" + this.index, this.targets);
      t = this.targets[this.index];
      this._clean();
      this.defer.reject(t);
    };

    Notification.prototype._notifySimply = function(id, iconUrl, title, msg) {
      LOGGER.log("[Notification] Notify " + id + "\n[" + title + "] " + msg + "\n" + iconUrl);
      webkitNotifications.createNotification(iconUrl, title, msg).show();
    };

    Notification.prototype._clean = function() {
      this.targets = null;
      this.index = 0;
      this.ntf = null;
      this.ntfId = null;
      this.cancelTimer = null;
    };

    return Notification;

  })();

  bg.BaseLiveData = BaseLiveData = (function() {
    BaseLiveData.OFFICIAL_LIVE_RSS = 'http://live.nicovideo.jp/rss';

    BaseLiveData.OFFICIAL_LIVE_COMINGSOON = 'http://live.nicovideo.jp/api/getindexzerostreamlist?status=comingsoon&zpage=';

    BaseLiveData.OFFICIAL_LIVE_RANK = 'http://live.nicovideo.jp/ranking?type=onair&main_provider_type=official';

    BaseLiveData.LIVE_URL = 'http://live.nicovideo.jp/watch/';

    function BaseLiveData(id, config) {
      this.id = id;
      this.config = config;
      this.updateComplete = __bind(this.updateComplete, this);
      this.update = __bind(this.update, this);
      this._onTimeoutUpdate = __bind(this._onTimeoutUpdate, this);
      this.data = null;
      this.cache = null;
      this.isUpdated = false;
      this.lastUpdateTime = null;
      this.isError = false;
      this.isUpdateRunning = false;
      this.updateTimer = null;
      this._initEventListeners();
    }

    BaseLiveData.prototype._initEventListeners = function() {
      LOGGER.log("[BaseLiveData] Setup update timer " + this.id, this.getUpdateInterval());
      this.updateTimer = setTimeout(this._onTimeoutUpdate, this.getUpdateInterval());
    };

    BaseLiveData.prototype._onTimeoutUpdate = function() {
      this.update();
      LOGGER.log("[BaseLiveData] Setup update timer " + this.id, this.getUpdateInterval());
      this.updateTimer = setTimeout(this._onTimeoutUpdate, this.getUpdateInterval());
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
        LOGGER.warn("[BaseLiveData] Cancel update so it's' already running " + this.id);
        return false;
      }
      if (!useCache) {
        LOGGER.log("[BaseLiveData] Clear cache " + this.id);
        this.cache = null;
        this.data = null;
      }
      try {
        this.isUpdateRunning = true;
        this.updateData();
      } catch (_error) {
        error = _error;
        this.updateError('[BaseLiveData] Catch error in update', error);
        return false;
      }
      return true;
    };

    BaseLiveData.prototype.updateData = function() {};

    BaseLiveData.prototype.getValidData = function() {
      if (this.cache) {
        return this.cache;
      } else if (this.data) {
        return this.data;
      } else {
        return [];
      }
    };

    BaseLiveData.prototype.fetchError = function(msg) {
      var _this = this;

      return function(response) {
        _this.updateError("Fetch error: " + msg, response);
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
      errmsg = "[BaseLiveData][" + this.id + "] Update error: " + msg + " (" + (new Date) + ")";
      if (obj) {
        LOGGER.error(errmsg, obj);
      } else {
        LOGGER.error(errmsg);
      }
      if (msg.stack) {
        LOGGER.error(msg.stack);
      }
      if (obj.stack) {
        LOGGER.error(obj.stack);
      }
    };

    BaseLiveData.prototype.updateComplete = function(results) {
      this.data = null;
      this.cache = results;
      this.isUpdateRunning = false;
      this.isUpdated = true;
      this.isError = false;
      this.lastUpdateTime = new Date;
      LOGGER.info("===== Update " + this.id + " complete: " + this.lastUpdateTime + " =====");
      LOGGER.log(results);
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
        LOGGER.log("[BaseLiveData] Count badge before open gate: " + this.id + " = " + count);
      } else if (this.config.isGateBadgeEnabled(this.id)) {
        count = gateCount + onairCount;
        LOGGER.log("[BaseLiveData] Count badge open gate: " + this.id + " = " + count);
      } else if (this.config.isOnairBadgeEnabled(this.id)) {
        count = onairCount;
        LOGGER.log("[BaseLiveData] Count badge onair: " + this.id + " = " + count);
      }
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
        LOGGER.log("[BaseLiveData] No data " + this.id + " for notification");
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
      return results;
    };

    BaseLiveData.prototype.isLiveOnair = function(item, now) {
      var startTime, _ref1;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      startTime = (_ref1 = item.startTime) != null ? _ref1.getTime() : void 0;
      if (startTime) {
        if (now > startTime) {
          return true;
        }
      }
      return false;
    };

    BaseLiveData.prototype.isLiveOpenGate = function(item, now) {
      var openTime, _ref1;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      if (this.isLiveOnair(item, now)) {
        return true;
      }
      openTime = (_ref1 = item.openTime) != null ? _ref1.getTime() : void 0;
      if (openTime && now > openTime) {
        return true;
      }
      return false;
    };

    BaseLiveData.prototype.isLiveBeforeOpenGate = function(item, now, beforeTimeSec) {
      var openTime, _ref1;

      if (this.isLiveClosed(item, now)) {
        return false;
      }
      if (this.isLiveOpenGate(item, now)) {
        return true;
      }
      openTime = (_ref1 = item.openTime) != null ? _ref1.getTime() : void 0;
      if (openTime && now > openTime - beforeTimeSec * 1000) {
        return true;
      }
      return false;
    };

    BaseLiveData.prototype.isLiveClosed = function(item, now) {
      var endTime, _ref1;

      endTime = (_ref1 = item.endTime) != null ? _ref1.getTime() : void 0;
      if (endTime && now > endTime) {
        return true;
      }
      return false;
    };

    return BaseLiveData;

  })();

  bg.DetailFetcher = DetailFetcher = (function() {
    DetailFetcher.GATE_URL = 'http://live.nicovideo.jp/gate/';

    function DetailFetcher(id, data, cache, opt) {
      this.id = id;
      this.data = data;
      this.cache = cache;
      this._onFail = __bind(this._onFail, this);
      this._onDone = __bind(this._onDone, this);
      this._onTimeout = __bind(this._onTimeout, this);
      this.defer = null;
      this.index = 0;
      this.fetchIntervalSec = 3;
      this.isCancelFunc = null;
      if (opt) {
        this.fetchIntervalSec = opt.fetchIntervalSec || this.fetchIntervalSec;
        this.isCancelFunc = opt.isCancelFunc;
      }
    }

    DetailFetcher.prototype._clean = function() {
      this.id = null;
      this.data = null;
      this.cache = null;
      return this.isCancelFunc = null;
    };

    DetailFetcher.fetch = function(id, data, cache, opt) {
      return (new bg.DetailFetcher(id, data, cache, opt)).fetch();
    };

    DetailFetcher.prototype.fetch = function() {
      var error;

      LOGGER.log("[DetailFetcher][" + this.id + "] Start fetch detail process.");
      try {
        this.defer = $.Deferred();
        this._fetchDetail();
      } catch (_error) {
        error = _error;
        this.defer.reject();
        LOGGER.error("[DetailFetcher][" + this.id + "] error in fetch.", error);
      }
      return this.defer.promise();
    };

    DetailFetcher.prototype._fetchDetail = function() {
      var item, nextIndex, now, useCache, _i, _ref1, _ref2;

      if (!this.data || this.index >= this.data.length) {
        this.defer.resolve(this.data);
        this._clean();
        return;
      }
      now = Date.now();
      for (nextIndex = _i = _ref1 = this.index, _ref2 = this.data.length - 1; _ref1 <= _ref2 ? _i <= _ref2 : _i >= _ref2; nextIndex = _ref1 <= _ref2 ? ++_i : --_i) {
        this.index = nextIndex;
        item = this.data[this.index];
        useCache = this._setFromCache(item, this.cache);
        if (this._isCancel(item, now)) {
          continue;
        }
        if (useCache) {
          LOGGER.warn(("[DetailFetcher][" + this.id + "] Fetch detail") + (" (with cache) " + this.index), item.link);
        } else {
          LOGGER.info(("[DetailFetcher][" + this.id + "] Fetch detail") + (" (no cache) " + this.index + "\n"), item.link, item.startTime, item.openTime, item.endTime);
        }
        setTimeout(this._onTimeout, this.fetchIntervalSec * 1000);
        return;
      }
      this.defer.resolve(this.data);
      this._clean();
    };

    DetailFetcher.prototype._isCancel = function(item, now) {
      var ret;

      ret = this._isCancelForCommon(item, now);
      if (this.isCancelFunc) {
        ret = this.isCancelFunc(item, now, ret);
        if (ret) {
          LOGGER.log("[DetailFetcher][" + this.id + "] Cancel fetch detail " + this.index + " (isCancelFunc)", item);
        }
      }
      return ret;
    };

    DetailFetcher.prototype._isCancelForCommon = function(item, now) {
      if (item.flag && item.flag === 'disable') {
        LOGGER.log("[DetailFetcher][" + this.id + "]  Cancel fetch detail " + this.index + " (disable)", item);
        return true;
      } else if (item.openTime && item.startTime) {
        if (item.endTime) {
          LOGGER.log("[DetailFetcher][" + this.id + "]  Cancel fetch detail " + this.index + " (all times exists)", item);
          return true;
        } else {
          if (now < item.startTime.getTime()) {
            LOGGER.log(("[DetailFetcher][" + this.id + "]  Cancel fetch detail " + this.index) + "(endTime not exists but not starts yet)", item);
            return true;
          }
        }
      }
      return false;
    };

    DetailFetcher.prototype._onTimeout = function() {
      common.AjaxEx.ajax({
        url: bg.DetailFetcher.GATE_URL + this.data[this.index].id
      }).done(this._onDone).fail(this._onFail);
    };

    DetailFetcher.prototype._onDone = function(response) {
      var error, item;

      try {
        item = this.data[this.index];
        this._setFromResponse(item, response);
        LOGGER.log("[DetailFetcher][" + this.id + "] Fetch detail " + this.index + " done: " + (new Date), item);
        if (!(item && item.thumnail && item.description)) {
          LOGGER.error("[DetailFetcher][" + this.id + "] Data is incomplete!!", item);
        }
        this.defer.notify(this.index, item);
        this.index += 1;
        this._fetchDetail();
      } catch (_error) {
        error = _error;
        LOGGER.error("[DetailFetcher][" + this.id + "] Catch error in _onDone", error);
        this.defer.reject(error);
        this._clean();
      }
    };

    DetailFetcher.prototype._onFail = function(response) {
      LOGGER.error("[DetailFetcher][" + this.id + "] Fail in AjaxEx id=" + this.data[this.index].id, response);
      this.defer.reject(response);
      this._clean();
    };

    DetailFetcher.prototype._setFromCache = function(data, cache) {
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
          LOGGER.log("[DetailFetcher][" + this.id + "] Use cache", data);
          return true;
        }
      }
      return false;
    };

    DetailFetcher.prototype._setFromResponse = function(data, response) {
      var $page, commuUrl, dateStr, endDateStr, endTimeMatch, endTimeStr, endYearStr, openTimeStr, startTimeStr, time, timeMatch, yearStr, _ref1;

      $page = $($.parseHTML(common.transIMG(response)));
      commuUrl = $page.find('.com,.chan .smn a').prop('href');
      if (commuUrl) {
        data.commuId = (_ref1 = commuUrl.match(/\/((ch|co)\d+)/)) != null ? _ref1[1] : void 0;
      } else {
        LOGGER.log("[DetailFetcher][" + this.id + "] Could not get commuUrl", data);
      }
      if (!data.openTime || !data.startTime) {
        time = $page.find('#bn_gbox .kaijo').text().trim();
        timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/);
        if (timeMatch) {
          yearStr = timeMatch[1];
          dateStr = timeMatch[2];
          openTimeStr = timeMatch[3];
          startTimeStr = timeMatch[4];
          data.openTime || (data.openTime = common.str2date(yearStr, dateStr, openTimeStr));
          data.startTime || (data.startTime = common.str2date(yearStr, dateStr, startTimeStr));
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
          data.endTime = common.str2date(endYearStr, endDateStr, endTimeStr);
        }
      }
    };

    return DetailFetcher;

  })();

  bg.MyPage = MyPage = (function() {
    MyPage.URL = 'http://live.nicovideo.jp/my';

    MyPage.TIMER_INTERVAL_SEC = 90;

    MyPage.RETRY_INTERVAL_SEC = 10;

    MyPage.prototype.cache = null;

    MyPage.prototype.updatedAt = null;

    MyPage.prototype.timer = null;

    function MyPage() {
      this._onFail = __bind(this._onFail, this);
      this._onDone = __bind(this._onDone, this);      this.defer = null;
    }

    MyPage.fetch = function(nocache) {
      if (nocache == null) {
        nocache = false;
      }
      return (new bg.MyPage).fetch(nocache);
    };

    MyPage.prototype.fetch = function(nocache) {
      if (nocache == null) {
        nocache = false;
      }
      LOGGER.log("[MyPage] Start fetch process.");
      this.defer = $.Deferred();
      this._fetchFromMypage(nocache);
      return this.defer.promise();
    };

    MyPage.prototype._setCache = function(cache) {
      bg.MyPage.prototype.cache = cache;
    };

    MyPage.prototype._setUpdatedAt = function(updatedAt) {
      bg.MyPage.prototype.updatedAt = updatedAt;
    };

    MyPage.prototype._setTimer = function(timer) {
      bg.MyPage.prototype.timer = timer;
    };

    MyPage.prototype._fetchFromMypage = function(nocache) {
      var _this = this;

      if (nocache || !this.cache) {
        LOGGER.log("[MyPage] Fetch from mypage: now = " + (new Date));
        common.AjaxEx.ajax({
          url: bg.MyPage.URL
        }).done(this._onDone).fail(this._onFail);
      } else {
        LOGGER.log("[MyPage] Fetch from cache: now = " + (new Date));
        setTimeout(function() {
          _this._resolve();
          _this._clean();
        }, 0);
      }
    };

    MyPage.prototype._onDone = function(response) {
      var $page, error, updatedAt;

      try {
        $page = $($.parseHTML(common.transIMG(response)));
        error = this._checkErrorPage($page);
        if (error) {
          this._reject(error);
        } else {
          this._setCache($page);
          this._setUpdatedAt(new Date);
          LOGGER.info("[MyPage] Update cache: " + (updatedAt = this.updatedAt));
          this._resolve();
        }
      } catch (_error) {
        error = _error;
        this._reject(error);
      }
      this._clean();
    };

    MyPage.prototype._onFail = function(response) {
      var e;

      e = Error('[MyPage] Error in AjaxEx');
      e.response = response;
      this.defer.reject(this.cache, this.updatedAt, e);
      this._clean();
    };

    MyPage.prototype._resolve = function() {
      this.defer.resolve(this.cache, this.updatedAt);
    };

    MyPage.prototype._reject = function(error) {
      this.defer.reject(this.cache, this.updatedAt, error);
    };

    MyPage.prototype._clean = function() {
      this.defer = null;
      this._setupUpdateTimer(bg.MyPage.TIMER_INTERVAL_SEC * 1000);
      LOGGER.log("[MyPage] End fetch process.");
    };

    MyPage.prototype._setupUpdateTimer = function(time) {
      var timer,
        _this = this;

      if (this.timer) {
        return;
      }
      LOGGER.log('[MyPage] Setup update timer:', time);
      timer = setTimeout(function() {
        LOGGER.log("[MyPage] Updating cache...");
        bg.MyPage.fetch(true).done(function() {
          LOGGER.log("[MyPage] Updating cache... done");
          _this._setTimer(null);
          _this._setupUpdateTimer(bg.MyPage.TIMER_INTERVAL_SEC * 1000);
        }).fail(function() {
          LOGGER.warn("[MyPage] Updating cache... fail");
          _this._setTimer(null);
          _this._setupUpdateTimer(bg.MyPage.RETRY_INTERVAL_SEC * 1000);
        });
      }, time);
      this._setTimer(timer);
      time = null;
    };

    MyPage.prototype._checkErrorPage = function($page) {
      var $error_type, cause, _ref1;

      $error_type = $page.find('.error_type');
      if (!$error_type.length) {
        return;
      }
      cause = $error_type.text();
      if (!cause) {
        LOGGER.error('[MyPage] Unknown cause:', (_ref1 = $page.find('html')) != null ? _ref1.html() : void 0);
      }
      return Error(cause);
    };

    return MyPage;

  })();

  bg.Favorite = Favorite = (function(_super) {
    __extends(Favorite, _super);

    function Favorite(config) {
      this._onFailFetchMyPage = __bind(this._onFailFetchMyPage, this);
      this._onDoneFetchMypage = __bind(this._onDoneFetchMypage, this);      Favorite.__super__.constructor.call(this, 'favorite', config);
    }

    Favorite.prototype.updateData = function() {
      this._fetchFromMypage();
    };

    Favorite.prototype.getUpdateInterval = function() {
      return 30 * 1000;
    };

    Favorite.prototype._fetchFromMypage = function() {
      LOGGER.log('[Favorite] Start fetch from mypage process.');
      bg.MyPage.fetch().done(this._onDoneFetchMypage).fail(this._onFailFetchMyPage);
    };

    Favorite.prototype._onDoneFetchMypage = function($page, updatedAt) {
      var error, results;

      try {
        LOGGER.log("[Favorite] Fetch mypage done", updatedAt);
        results = this._getResultsFromMypage($page);
        if (!results) {
          LOGGER.log('[Favorite] No results');
        }
        LOGGER.log('[Favorite] End fetch from mypage process.');
        this.updateComplete(results);
      } catch (_error) {
        error = _error;
        this.updateError('[Favorite] Catch error in _fetchFromMypageSuccess', error);
      }
    };

    Favorite.prototype._onFailFetchMyPage = function($page, updatedAt, error) {
      if ($page) {
        LOGGER.log("[Favorite] Fetch mypage fail", updatedAt, error);
        this._onDoneFetchMypage($page, updatedAt);
      } else {
        this.updateError("[Favorite] Fetch mypage fail (updated at " + updatedAt + ")", error);
      }
    };

    Favorite.prototype._getResultsFromMypage = function($page) {
      var $item, $items, a, dateStr, item, now, nowYear, openTimeStr, results, ret, startTimeStr, time, timeMatch, _i, _len, _ref1;

      $items = $page.find('#Favorite_list .liveItems .liveItem,.liveItem_reserve,.liveItem_ch');
      now = new Date();
      nowYear = now.getFullYear();
      results = [];
      for (_i = 0, _len = $items.length; _i < _len; _i++) {
        item = $items[_i];
        $item = $(item);
        ret = {};
        a = $item.children('a').first();
        ret.link = common.changeGate2Watch(a.attr('href'));
        ret.id = common.getLiveIdFromUrl(ret.link);
        ret.title = a.attr('title');
        ret.thumnail = a.children('imgx').first().attr('src').replace(/\/s\//, '/');
        ret.commuId = (_ref1 = ret.thumnail.match(/\/((ch|co)\d+)/)) != null ? _ref1[1] : void 0;
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
          ret.openTime = common.str2date(nowYear, dateStr, openTimeStr);
        }
        ret.startTime = common.str2date(nowYear, dateStr, startTimeStr);
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

  })(bg.BaseLiveData);

  bg.Timeshift = Timeshift = (function(_super) {
    __extends(Timeshift, _super);

    function Timeshift(config) {
      this._onFailFetchMyPage = __bind(this._onFailFetchMyPage, this);
      this._onDoneFetchMypage = __bind(this._onDoneFetchMypage, this);      Timeshift.__super__.constructor.call(this, 'timeshift', config);
    }

    Timeshift.prototype.updateData = function() {
      this._fetchFromMypage();
    };

    Timeshift.prototype._fetchFromMypage = function() {
      LOGGER.log('[Timeshift] Start fetch from mypage process.');
      bg.MyPage.fetch().done(this._onDoneFetchMypage).fail(this._onFailFetchMyPage);
    };

    Timeshift.prototype._onDoneFetchMypage = function($page, updatedAt) {
      var error, results;

      try {
        LOGGER.log("[Timeshift] Fetch mypage done", updatedAt);
        results = this._getResultsFromMypage($page);
        if (!results) {
          LOGGER.log('[Timeshift] No results');
        }
        LOGGER.log('[Timeshift] End fetch from mypage process.');
        bg.DetailFetcher.fetch(this.id, results, this.cache, {
          fetchIntervalSec: 3.5
        }).done(this.updateComplete).fail(this.fetchError("from fetch detail"));
        this.data = results;
      } catch (_error) {
        error = _error;
        this.updateError('[Timeshift] Catch error in _fetchFromMypageSuccess', error);
      }
    };

    Timeshift.prototype._onFailFetchMyPage = function($page, updatedAt, error) {
      if ($page) {
        LOGGER.log("[Timeshift] Fetch mypage fail", updatedAt, error);
        this._onDoneFetchMypage($page, updatedAt);
      } else {
        this.updateError("[Timeshift] Fetch mypage fail (" + updatedAt + ")", error);
      }
    };

    Timeshift.prototype._getResultsFromMypage = function($page) {
      var $item, $items, $status, a, i, item, results, ret, status, _i, _len;

      $items = $page.find('#liveItemsWrap .liveItems .column');
      results = [];
      for (i = _i = 0, _len = $items.length; _i < _len; i = ++_i) {
        item = $items[i];
        $item = $(item);
        ret = {};
        a = $item.find('.name > a');
        ret.link = common.changeGate2Watch(a.attr('href'));
        ret.title = a.attr('title');
        ret.id = common.getLiveIdFromUrl(ret.link);
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

  })(bg.BaseLiveData);

  bg.Official = Official = (function(_super) {
    __extends(Official, _super);

    function Official(config) {
      this._fetchFromRankSuccess = __bind(this._fetchFromRankSuccess, this);      Official.__super__.constructor.call(this, 'official', config);
    }

    Official.prototype.updateData = function() {
      this._fetchFromRank();
    };

    Official.prototype._fetchFromRank = function() {
      LOGGER.log('[Official] Start fetch from Rank.');
      common.AjaxEx.ajax({
        url: bg.BaseLiveData.OFFICIAL_LIVE_RANK
      }).done(this._fetchFromRankSuccess).fail(this.fetchError("from rank url=" + bg.BaseLiveData.OFFICIAL_LIVE_RANK));
    };

    Official.prototype._fetchFromRankSuccess = function(response) {
      var $page, error, results;

      try {
        $page = $($.parseHTML(common.transIMG(response)));
        results = this._getResultsFromRank($page);
        LOGGER.log('[Official] End fetch from Rank.');
        LOGGER.log('[Official] Start fetch from Commingsoon.');
        this._fetchFromComingsoon(1, results);
        this.data = results;
      } catch (_error) {
        error = _error;
        this.updateError('[Official] Error in fetchFromRankSuccess', error);
      }
    };

    Official.prototype._getResultsFromRank = function($page) {
      var $item, item, results, ret, _i, _len, _ref1;

      results = [];
      _ref1 = $page.find('#official_ranking_main .ranking_video');
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        item = _ref1[_i];
        ret = {};
        $item = $(item);
        ret.id = 'lv' + $item.find('.video_id')[0].innerHTML;
        ret.title = $item.find('.video_title')[0].innerHTML;
        ret.link = bg.BaseLiveData.LIVE_URL + ret.id;
        results.push(ret);
      }
      return results;
    };

    Official.prototype._fetchFromComingsoon = function(index, results) {
      common.AjaxEx.ajax({
        url: bg.BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index,
        type: 'GET',
        dataType: 'json'
      }).done(this._fetchFromComingsoonSuccess(index, results)).fail(this.fetchError("from comingsoon url=" + (bg.BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index)));
    };

    Official.prototype._fetchFromComingsoonSuccess = function(index, results) {
      var _this = this;

      return function(response) {
        var error, streamList, total;

        try {
          streamList = response.reserved_stream_list;
          total = response.total;
          if (!(streamList && streamList.length > 0 && index < total)) {
            LOGGER.log('[Official] End fetch from Commingsoon.');
            bg.DetailFetcher.fetch(_this.id, results, _this.cache, {
              isCancelFunc: _this._isCancelFethDetail
            }).done(_this.updateComplete).fail(_this.fetchError("from fetch detail"));
            _this.data = results;
            results = null;
            index = null;
            return;
          }
          _this._getResultsFromComingsoon(streamList, results);
          LOGGER.log("[Official] Fetch official from comingsoon finish " + index);
          if (index >= 10) {
            LOGGER.error("[Official] Error in fetch comingsoon: index over " + index, response);
            throw Error("Index is too large");
          }
          _this._fetchFromComingsoon(index + 1, results);
        } catch (_error) {
          error = _error;
          _this.updateError('[Official] Error in fetchFromComingsoonSuccess', error);
        }
        results = null;
        index = null;
      };
    };

    Official.prototype._getResultsFromComingsoon = function(list, results) {
      var item, ret, _i, _len;

      for (_i = 0, _len = list.length; _i < _len; _i++) {
        item = list[_i];
        ret = {};
        ret.id = 'lv' + item.id;
        ret.title = item.title;
        ret.link = bg.BaseLiveData.LIVE_URL + ret.id;
        ret.thumnail = item.picture_url;
        ret.description = item.description;
        ret.startTime = new Date(item.start_date_timestamp_sec * 1000);
        ret.endTime = new Date(item.end_date_timestamp_sec * 1000);
        ret.playStatus = item.currentstatus;
        results.push(ret);
      }
      results = null;
    };

    Official.prototype._isCancelFethDetail = function(item, now, ret) {
      if (ret) {
        return true;
      }
      if (item.startTime) {
        return true;
      }
      return false;
    };

    return Official;

  })(bg.BaseLiveData);

  bg.History = History = (function() {
    History.ID = 'history';

    History.SAVE_TIMER_SEC = 300;

    History.MAX_SIZE = 100;

    function History(config) {
      this.config = config;
      this.saveTimer = null;
      if (!this.config.isNiconamaEnabled(bg.History.ID)) {
        this._clearHistory();
      }
    }

    History.prototype.saveHistory = function(data) {
      var hist;

      if (!this.config.isNiconamaEnabled('history')) {
        LOGGER.log('[History] Cancel save history (disable)');
        return false;
      }
      LOGGER.log("[History] Save history", data);
      console.assert(data.id, "[History] id does not exist");
      hist = this._getHistory();
      hist[data.id] = data;
      this._removeOldHistory(hist);
      this._setHistory(hist);
      return true;
    };

    History.prototype.getHistories = function() {
      return this._sortHistory(this._getHistory());
    };

    History.prototype._getHistory = function() {
      var hist;

      hist = localStorage.getItem(bg.History.ID);
      if (!hist) {
        LOGGER.info('[History] First getting history.');
      }
      LOGGER.log("[History] Get history", hist);
      hist = hist ? JSON.parse(hist) : {};
      return hist;
    };

    History.prototype._setHistory = function(hist) {
      localStorage.setItem(bg.History.ID, JSON.stringify(hist));
      LOGGER.log("[History] Saved history");
    };

    History.prototype._clearHistory = function() {
      LOGGER.info('[History] Clear history');
      localStorage.removeItem(bg.History.ID);
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
      var histories, i, id, over, _i, _ref1, _ref2;

      histories = this._sortHistory(hist);
      over = histories.length - bg.History.MAX_SIZE;
      if (over <= 0) {
        LOGGER.log('[History] Need not to remove old history');
        return;
      }
      for (i = _i = _ref1 = bg.History.MAX_SIZE, _ref2 = bg.History.MAX_SIZE + over - 1; _ref1 <= _ref2 ? _i <= _ref2 : _i >= _ref2; i = _ref1 <= _ref2 ? ++_i : --_i) {
        id = histories[i].id;
        LOGGER.log("[History] Remove history " + id);
        delete hist[id];
      }
    };

    return History;

  })();

  exports.config = new bg.Config;

  exports.history = new bg.History(exports.config);

  exports.nicoInfo = new bg.NicoInfo(exports.config);

  exports.liveChecker = new bg.LiveChecker(exports.config, exports.nicoInfo);

  exports.background = new bg.Background({
    config: new bg.ConfigCommands(exports.config),
    history: new bg.HistoryCommands(exports.history)
  });

}).call(this);
