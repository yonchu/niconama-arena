//@ sourceMappingURL=popup.map
(function() {
  var BaseTab, FavoriteTab, HistoryTab, LOGGER, LiveInfoHtml, LiveTab, OfficialTab, POPUP, Popup, SettingsTab, TabManager, TimeshiftTab, Validator, common, exports, popup, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    _this = this;

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  common = exports.CHEX.common;

  LOGGER = new common.Logger;

  popup = exports.namespace('CHEX.popup');

  popup.TabManager = TabManager = (function(_super) {
    __extends(TabManager, _super);

    TabManager.LOADING_VIEW = "<div class=\"nowloading active\">\n  <p><img src=\"/icons/ajax-loader.gif\" alt=\"読込中...\" /></p>\n</div>";

    function TabManager(barElem, contentElem) {
      this.barElem = barElem;
      this.contentElem = contentElem;
      this.onClickTab = __bind(this.onClickTab, this);
      TabManager.__super__.constructor.call(this);
      this.tabs = {};
      this.callbacks = {};
      this.$tabbars = null;
      this.$tabsContents = null;
    }

    TabManager.prototype.initEventListeners = function() {
      return this.$tabbars.on('click', this.onClickTab);
    };

    TabManager.prototype.onClickTab = function(event) {
      var tabId;

      event.preventDefault();
      tabId = $(event.target).attr('data-id');
      this.showTab(tabId);
      return this;
    };

    TabManager.prototype.getTab = function(tabId) {
      if (!(tabId && this.tabs[tabId])) {
        LOGGER.log("" + tabId + " is not registered.");
        return null;
      }
      return this.tabs[tabId];
    };

    TabManager.prototype.getFirstTab = function() {
      var min, minTab, tab, tabId, _ref1;

      min = null;
      minTab = null;
      _ref1 = this.tabs;
      for (tabId in _ref1) {
        if (!__hasProp.call(_ref1, tabId)) continue;
        tab = _ref1[tabId];
        if ((min == null) || tab.tabNum < min) {
          min = tab.tabNum;
          minTab = tab;
        }
      }
      return minTab;
    };

    TabManager.prototype.activateTab = function(targetTabId) {
      var tab, tabId, _ref1;

      _ref1 = this.tabs;
      for (tabId in _ref1) {
        if (!__hasProp.call(_ref1, tabId)) continue;
        tab = _ref1[tabId];
        tab.isActive = tabId === targetTabId;
        if (tabId === targetTabId) {
          tab.$tab.addClass('active').siblings().removeClass('active');
        }
      }
      this.$loading.show().siblings().hide();
      return this;
    };

    TabManager.prototype.register = function(tab) {
      var tabId;

      tabId = tab.tabId;
      if (this.tabs[tabId]) {
        throw Error("" + tabId + " is already registered.");
      }
      this.tabs[tabId] = tab;
      return this;
    };

    TabManager.prototype.onChangeTab = function(callback, callbackObj) {
      this.addEventListener('changeTab', callback, callbackObj);
      return this;
    };

    TabManager.prototype.initTabs = function() {
      var $tab, $tabContent, i, parent, tab, tabId, _i, _ref1;

      this.$tabbars = $(this.barElem);
      this.$tabsContents = $(this.contentElem);
      console.assert(this.$tabbars.size() === this.$tabsContents.size());
      for (i = _i = 0, _ref1 = this.$tabbars.size() - 1; 0 <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = 0 <= _ref1 ? ++_i : --_i) {
        $tab = this.$tabbars.eq(i);
        $tabContent = this.$tabsContents.eq(i);
        tabId = $tabContent.attr('id');
        tab = this.getTab(tabId);
        if (!tab) {
          $tab.css('display', 'none');
          continue;
        }
        tab.tabNum = i;
        tab.$tab = $tab;
        tab.$tabContent = $tabContent;
        tab.onComplete(this.showTabContent, this);
        tab.initOnce();
        tab.init();
      }
      parent = $(this.contentElem).parent();
      parent.append(popup.TabManager.LOADING_VIEW);
      this.$loading = parent.find('.nowloading');
      this.initEventListeners();
      return this;
    };

    TabManager.prototype.showTab = function(tabId) {
      var tab;

      tab = this.getTab(tabId);
      if (!tab) {
        tab = this.getFirstTab();
      }
      tabId = tab.tabId;
      this.activateTab(tabId);
      tab.showTab();
      this.dispatchEvent('changeTab', [tabId]);
      return this;
    };

    TabManager.prototype.showTabContent = function(tab) {
      tab.$tabContent.fadeIn(100).siblings().hide();
      return this;
    };

    TabManager.prototype.updateAllTabs = function() {
      var tab, tabId, _ref1;

      _ref1 = this.tabs;
      for (tabId in _ref1) {
        if (!__hasProp.call(_ref1, tabId)) continue;
        tab = _ref1[tabId];
        tab.init();
        if (tab.isActive) {
          this.showTab(tab.tabId);
        }
      }
      return this;
    };

    return TabManager;

  })(common.EventDispatcher);

  popup.Popup = Popup = (function() {
    function Popup(config, nicoInfo) {
      this.config = config;
      this.nicoInfo = nicoInfo;
      this.onClickUpdateButton = __bind(this.onClickUpdateButton, this);
      this.tabManager = new popup.TabManager('#tabbar li', '#tabs-content > div');
      this.$updateButton = null;
    }

    Popup.prototype.registerTab = function(tab) {
      this.tabManager.register(tab);
      return this;
    };

    Popup.prototype.showPopup = function() {
      this.init();
      return this;
    };

    Popup.prototype.init = function() {
      this.$updateButton = $('#update-button');
      this.tabManager.initTabs();
      this.initEventListeners();
      this.tabManager.showTab(this.config.getSaveTabId());
      return this;
    };

    Popup.prototype.setLastUpdateTime = function(tabId) {
      var date, hh, min, sec;

      date = this.nicoInfo.getLastUpdateTime(tabId);
      hh = '??';
      min = '??';
      sec = '??';
      if (date) {
        hh = date.getHours();
        min = date.getMinutes();
        sec = date.getSeconds();
        if (hh < 10) {
          hh = '0' + hh;
        }
        if (min < 10) {
          min = '0' + min;
        }
        if (sec < 10) {
          sec = '0' + sec;
        }
      }
      this.$updateButton.attr('title', "更新時間 " + hh + ":" + min + ":" + sec);
    };

    Popup.prototype.initEventListeners = function() {
      this.$updateButton.on('click', this.onClickUpdateButton);
      this.tabManager.onChangeTab(this.onChangeTab, this);
      return this;
    };

    Popup.prototype.onChangeTab = function(tabId) {
      this.config.setSaveTabId(tabId);
      this.setLastUpdateTime(tabId);
    };

    Popup.prototype.onClickUpdateButton = function(event) {
      var $target,
        _this = this;

      $target = $(event.target);
      if (!$target.hasClass('active-button')) {
        return;
      }
      $target.attr('class', 'inactive-button');
      chrome.browserAction.setBadgeText({
        text: ''
      });
      this.nicoInfo.updateAll(true, false);
      this.tabManager.updateAllTabs();
      setTimeout(function() {
        _this.$updateButton.attr('class', 'active-button');
      }, 60 * 1000);
    };

    return Popup;

  })();

  popup.BaseTab = BaseTab = (function(_super) {
    __extends(BaseTab, _super);

    function BaseTab(tabId, config) {
      this.tabId = tabId;
      this.config = config;
      BaseTab.__super__.constructor.call(this);
      this.tabNum = -1;
      this.$tab = null;
      this.$tabContent = null;
      this.isActive = false;
    }

    BaseTab.prototype.initEventListeners = function() {
      return this;
    };

    BaseTab.prototype.initOnce = function() {
      this.initEventListeners();
      return this;
    };

    BaseTab.prototype.init = function() {
      return this;
    };

    BaseTab.prototype.showTab = function() {
      this.showTabContent();
      return this;
    };

    BaseTab.prototype.showTabContent = function() {
      this.dispatchEvent('complete', this);
      return this;
    };

    BaseTab.prototype.showTabBadge = function(text) {
      var disp;

      disp = text ? 'block' : 'none';
      this.$tab.find('.tab-badge').css('display', disp).text(text);
      return this;
    };

    BaseTab.prototype.onComplete = function(callback, callbackObj) {
      this.addEventListener('complete', callback, callbackObj);
      return this;
    };

    return BaseTab;

  })(common.EventDispatcher);

  popup.LiveInfoHtml = LiveInfoHtml = (function() {
    LiveInfoHtml.NOT_WATCH_THUMNAIL = 'http://res.nimg.jp/img/common/video_deleted_ja-jp.jpg';

    LiveInfoHtml.NO_IMAGE_THUMNAIL = 'http://icon.nimg.jp/404.jpg';

    LiveInfoHtml.BEFORE_TIME_SEC = 300;

    function LiveInfoHtml(item, now) {
      this.item = item;
      this.now = now;
      this.html = {};
      this.make();
    }

    LiveInfoHtml.prototype.getHtml = function() {
      return TMPL['liveInfo'](this.html);
    };

    LiveInfoHtml.prototype.make = function() {
      this.html.title = this.item.title || '';
      this.html.link = this.item.link || '';
      this.html.description = this.item.description || '';
      this.setThumnail();
      this.setTime();
      this.setStatus();
      return this;
    };

    LiveInfoHtml.prototype.setThumnail = function() {
      if (this.item.thumnail) {
        this.html.thumnail = this.item.thumnail;
      } else if (this.item.flag && this.item.flag === 'disable') {
        this.html.thumnail = popup.LiveInfoHtml.NOT_WATCH_THUMNAIL;
      } else {
        this.html.thumnail = '';
      }
      return this;
    };

    LiveInfoHtml.prototype.setTime = function() {
      var openTimeStr, startTimeStr, time;

      time = '';
      if (this.item.openTime) {
        openTimeStr = common.date2String(this.item.openTime);
      }
      if (this.item.startTime) {
        startTimeStr = common.date2String(this.item.startTime);
      }
      if (openTimeStr) {
        time = "開場: " + openTimeStr + " | 開演: " + startTimeStr;
      } else if (startTimeStr) {
        time = "開始: " + startTimeStr;
      }
      this.html.time = time;
      return this;
    };

    LiveInfoHtml.prototype.setStatus = function() {
      var endTime, flags, openTime, startTime, status, _ref1, _ref2, _ref3;

      status = '';
      flags = [];
      openTime = (_ref1 = this.item.openTime) != null ? _ref1.getTime() : void 0;
      startTime = (_ref2 = this.item.startTime) != null ? _ref2.getTime() : void 0;
      endTime = (_ref3 = this.item.endTime) != null ? _ref3.getTime() : void 0;
      if (endTime && this.now > endTime) {
        status = '放送は終了しました';
        flags.push('closed');
      } else if (startTime) {
        if (this.now > startTime) {
          status = 'ただいま放送中';
        } else if (openTime) {
          if (this.now > openTime) {
            status = 'まもなく放送開始';
          } else if (this.now > openTime - popup.LiveInfoHtml.BEFORE_TIME_SEC * 1000) {
            status = 'まもなく開場';
          } else if (this.now < openTime) {
            status = "開場まであと " + (common.remainingTime(this.now, openTime));
            flags.push('long-before');
          }
        } else if (this.now < startTime) {
          status = "開始まであと " + (common.remainingTime(this.now, startTime));
          flags.push('long-before');
        }
      }
      this.html.status = status;
      if (this.item.flag) {
        flags.push(this.item.flag);
      }
      this.html.flag = flags.join(' ');
      return this;
    };

    return LiveInfoHtml;

  })();

  popup.LiveTab = LiveTab = (function(_super) {
    __extends(LiveTab, _super);

    LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC = 3;

    function LiveTab(tabId, config, nicoInfo) {
      this.nicoInfo = nicoInfo;
      this.checkUpdate = __bind(this.checkUpdate, this);
      LiveTab.__super__.constructor.call(this, tabId, config);
      this.$content = $("#" + this.tabId + " > ul");
      this.checkUpdateTimer = null;
    }

    LiveTab.prototype.initEventListeners = function() {
      this.checkUpdateTimer = setInterval(this.checkUpdate, popup.LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC * 1000);
      return this;
    };

    LiveTab.prototype.checkUpdate = function() {
      this.showTabBadge(this.countBadge());
      if (this.updateView()) {
        this.showTabContent();
      }
    };

    LiveTab.prototype.init = function() {
      this.showTabBadge(this.countBadge());
    };

    LiveTab.prototype.showTab = function() {
      if (this.updateView(true)) {
        LiveTab.__super__.showTab.call(this);
      }
      return this;
    };

    LiveTab.prototype.updateView = function(force) {
      var cache, currentData, html, item, liveInfoHtml, now, viewData, _i, _len;

      if (force == null) {
        force = false;
      }
      if (!this.isActive) {
        LOGGER.log("Cancel updateView: not active " + this.tabId);
        return false;
      }
      cache = this.getCache();
      currentData = this.getData();
      if (cache) {
        if (force || this.isUpdated()) {
          LOGGER.log("Show cache data " + this.tabId);
          viewData = cache;
        } else {
          cache = null;
          currentData = null;
          return false;
        }
      } else if (currentData) {
        LOGGER.log("Show current data " + this.tabId);
        viewData = currentData;
      } else {
        LOGGER.log("Cancel updateView: no cache and currentData " + this.tabId);
        cache = null;
        currentData = null;
        return false;
      }
      this.$content.html('');
      now = Date.now();
      for (_i = 0, _len = viewData.length; _i < _len; _i++) {
        item = viewData[_i];
        liveInfoHtml = new popup.LiveInfoHtml(item, now);
        html = liveInfoHtml.getHtml();
        this.$content.append(html);
      }
      this.isUpdated(false);
      cache = null;
      currentData = null;
      viewData = null;
      return true;
    };

    LiveTab.prototype.getData = function() {
      return this.nicoInfo.getData(this.tabId);
    };

    LiveTab.prototype.getCache = function() {
      return this.nicoInfo.getCache(this.tabId);
    };

    LiveTab.prototype.isUpdated = function(value) {
      if (value != null) {
        this.nicoInfo.isUpdated(this.tabId, value);
      }
      return this.nicoInfo.isUpdated(this.tabId);
    };

    LiveTab.prototype.countBadge = function() {
      return this.nicoInfo.countBadge(this.tabId);
    };

    return LiveTab;

  })(popup.BaseTab);

  popup.FavoriteTab = FavoriteTab = (function(_super) {
    __extends(FavoriteTab, _super);

    function FavoriteTab(tabId, config, nicoInfo) {
      FavoriteTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return FavoriteTab;

  })(popup.LiveTab);

  popup.TimeshiftTab = TimeshiftTab = (function(_super) {
    __extends(TimeshiftTab, _super);

    function TimeshiftTab(tabId, config, nicoInfo) {
      TimeshiftTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return TimeshiftTab;

  })(popup.LiveTab);

  popup.OfficialTab = OfficialTab = (function(_super) {
    __extends(OfficialTab, _super);

    function OfficialTab(tabId, config, nicoInfo) {
      OfficialTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return OfficialTab;

  })(popup.LiveTab);

  popup.HistoryTab = HistoryTab = (function(_super) {
    __extends(HistoryTab, _super);

    function HistoryTab(tabId, config, history) {
      this.history = history;
      HistoryTab.__super__.constructor.call(this, tabId, config);
      this.$content = $('#history-content');
    }

    HistoryTab.prototype.initEventListeners = function() {
      return this;
    };

    HistoryTab.prototype.showTab = function() {
      this.showHistory();
      return HistoryTab.__super__.showTab.call(this);
    };

    HistoryTab.prototype.showHistory = function() {
      var hist, histories, html, obj, _i, _len;

      this.$content.html('');
      histories = this.history.getHistories();
      LOGGER.log("Show history", histories);
      for (_i = 0, _len = histories.length; _i < _len; _i++) {
        hist = histories[_i];
        obj = {};
        if (!(hist.title && hist.link)) {
          continue;
        }
        obj.title = hist.title;
        obj.link = hist.link;
        obj.thumnail = hist.thumnail || '';
        if (hist.accessTime) {
          obj.accessTime = common.date2String(new Date(hist.accessTime));
        } else {
          obj.accessTime = '';
        }
        if (hist.startTime) {
          obj.startTime = common.date2String(new Date(hist.startTime));
        } else {
          obj.startTime = '';
        }
        html = TMPL.history(obj);
        this.$content.append(html);
      }
      histories = null;
      return this;
    };

    return HistoryTab;

  })(popup.BaseTab);

  popup.Validator = Validator = (function() {
    Validator.prototype.checkers = {
      isNonEmpty: {
        validate: function(value) {
          return value !== "";
        },
        instructions: "the value cannot be empty"
      },
      required: {
        validate: function(value) {
          return value != null;
        },
        instructions: "the value is required"
      },
      isNumber: {
        validate: function(value) {
          return !isNaN(value);
        },
        instructions: "the value can only be a valid number, e.g. 1, 3.14 or 2010"
      },
      isInteger: {
        validate: function(value) {
          if (value == null) {
            return false;
          }
          value += '';
          return !(value.match(/[^0-9]/g)) || (parseInt(value, 10)) + '' !== value;
        },
        instructions: "the value can only be a integer number, e.g. 0, 1"
      },
      isRangeNumber: {
        validate: function(value, args) {
          var max, min;

          min = args.min;
          max = args.max;
          if (isNaN(value)) {
            return false;
          }
          if (value < min) {
            return false;
          }
          if (value > max) {
            return false;
          }
          return true;
        },
        instructions: "the value can be more than %min% and less than %max%"
      },
      isRangeMinNumber: {
        validate: function(value, args) {
          var min;

          min = args.min;
          if (isNaN(value)) {
            return false;
          }
          if (value < min) {
            return false;
          }
          return true;
        },
        instructions: "the value can be more than %min%"
      },
      isAlphaNum: {
        validate: function(value) {
          return !/[^a-z0-9]/i.test(value);
        },
        instructions: "the value can only contain characters and numbers, no special symbols"
      }
    };

    function Validator() {
      this.messages = [];
      this.config = {};
    }

    Validator.prototype.hasErrors = function() {
      return this.messages.length !== 0;
    };

    Validator.prototype.getMessages = function() {
      return this.messages.slice();
    };

    Validator.prototype.validate = function(data) {
      var args, checker, msg, name, required, type, value;

      name = data.name;
      type = data.type;
      checker = this.checkers[type];
      value = data.value;
      args = data.args || {};
      required = data.required != null ? !!data.required : false;
      if (!checker) {
        throw Error("No handler to validate type " + type);
      }
      if (required) {
        if (!this.checkers.required.validate.call(this, value)) {
          msg = this.makeMessage(name, this.checkers.required.instructions);
          this.messages.push = msg;
        }
      }
      if (!checker.validate.call(this, value, args)) {
        msg = this.makeMessage(name, checker.instructions, args);
        this.messages.push(msg);
      }
      return this.hasErrors();
    };

    Validator.prototype.makeMessage = function(name, inst, args) {
      var key, value;

      for (key in args) {
        if (!__hasProp.call(args, key)) continue;
        value = args[key];
        inst = inst.replace(RegExp("%" + key + "%", 'g'), value);
      }
      return "Invalid value for *" + name + "*, " + inst;
    };

    return Validator;

  })();

  popup.SettingsTab = SettingsTab = (function(_super) {
    __extends(SettingsTab, _super);

    function SettingsTab(tabId, config) {
      this.onClickCancelButton = __bind(this.onClickCancelButton, this);
      this.onClickOkButton = __bind(this.onClickOkButton, this);      SettingsTab.__super__.constructor.call(this, tabId, config);
      this.$autoJumpCheckbox = $('#setting-auto-jump');
      this.$autoJumpIntervalInput = $('#setting-auto-jump-interval');
      this.$autoEnterCheckbox = $('#setting-auto-enter');
      this.$settingNiconamaEnabled = $('#setting-niconama-enabled');
      this.$settingNiconamaUpdate = $('#setting-niconama-update > select');
      this.$settingBadge = $('#setting-badge select');
      this.$settingNotification = $('#setting-notification select');
      this.$settingOpentabSelect = $('#setting-opentab select');
      this.$settingOpentabRule = $('#setting-opentab-rule input:radio[name="rule"]');
      this.$settingOpentabBlacklist = $('#setting-opentab-rule input:text:eq(0)');
      this.$settingOpentabWhitelist = $('#setting-opentab-rule input:text:eq(1)');
    }

    SettingsTab.prototype.initEventListeners = function() {
      $('#settings button[value="ok"]').on('click', this.onClickOkButton);
      $('#settings button[value="cancel"]').on('click', this.onClickCancelButton);
      return this;
    };

    SettingsTab.prototype.onClickOkButton = function(event) {
      var error;

      error = this.validate();
      if (error && error.length > 0) {
        LOGGER.error('Could not save settings.', error);
        this.showMessage('不正な値があります', 'failure');
        return;
      }
      this.saveSettings();
      this.config.save();
      this.showMessage('保存しました', 'success');
    };

    SettingsTab.prototype.onClickCancelButton = function(event) {
      this.restoreSettings();
    };

    SettingsTab.prototype.showTab = function() {
      this.restoreSettings();
      return SettingsTab.__super__.showTab.call(this);
    };

    SettingsTab.prototype.validate = function() {
      var data, validator;

      validator = new popup.Validator;
      data = {
        name: '次枠チェック間隔',
        type: 'isRangeMinNumber',
        value: this.$autoJumpIntervalInput.val(),
        args: {
          min: 5
        }
      };
      if (validator.validate(data)) {
        return validator.getMessages();
      }
      return null;
    };

    SettingsTab.prototype.showMessage = function(msg, addClass) {
      var $status;

      LOGGER.log('showMessage');
      $status = $('#settings-status');
      $status.css('display', 'inline').addClass(addClass).text(msg);
      setTimeout(function() {
        $status.css('display', 'none').removeClass(addClass).text('');
        return $status = null;
      }, 2000);
      return this;
    };

    SettingsTab.prototype.saveSettings = function() {
      var blacklist, checkbox, checkboxes, name, rule, select, value, whitelist, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref2, _ref3;

      this.config.setEnableAutoJump(this.$autoJumpCheckbox.prop('checked'));
      this.config.setAutoJumpIntervalSec(this.$autoJumpIntervalInput.val());
      this.config.setEnableAutoEnter(this.$autoEnterCheckbox.prop('checked'));
      checkboxes = this.$settingNiconamaEnabled.find('input[type=checkbox]');
      for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
        checkbox = checkboxes[_i];
        name = checkbox.getAttribute('name');
        value = checkbox.checked;
        this.config.setEnabledNiconamaSettings(name, value);
      }
      this.config.setNiconamaUpdateIntervalSec(this.$settingNiconamaUpdate.val());
      _ref1 = this.$settingBadge;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        select = _ref1[_j];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setBadgeEnable(name, value);
      }
      _ref2 = this.$settingNotification;
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        select = _ref2[_k];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setNotificationEnable(name, value);
      }
      _ref3 = this.$settingOpentabSelect;
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        select = _ref3[_l];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setOpentabEnable(name, value);
      }
      rule = this.$settingOpentabRule.filter(':checked').val();
      blacklist = this.getRuleList(this.$settingOpentabBlacklist.val());
      whitelist = this.getRuleList(this.$settingOpentabWhitelist.val());
      this.config.setRule(rule);
      this.config.setBlackList(blacklist);
      this.config.setWhiteList(whitelist);
    };

    SettingsTab.prototype.getRuleList = function(ruleList) {
      var ret;

      ret = [];
      if (ruleList) {
        ret = ruleList.replace(/\ /g, '').split(',');
      }
      return ret;
    };

    SettingsTab.prototype.restoreSettings = function() {
      var blacklist, checkbox, checkboxes, name, select, value, whitelist, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref1, _ref2, _ref3;

      this.$autoJumpCheckbox.prop('checked', this.config.getEnableAutoJump());
      this.$autoJumpIntervalInput.val(this.config.getAutoJumpIntervalSec());
      this.$autoEnterCheckbox.prop('checked', this.config.getEnableAutoEnter());
      checkboxes = this.$settingNiconamaEnabled.find('input[type=checkbox]');
      for (_i = 0, _len = checkboxes.length; _i < _len; _i++) {
        checkbox = checkboxes[_i];
        name = checkbox.getAttribute('name');
        value = this.config.isNiconamaEnabled(name);
        checkbox.checked = value;
      }
      this.$settingNiconamaUpdate.val(this.config.getNiconamaUpdateIntervalSec());
      _ref1 = this.$settingBadge;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        select = _ref1[_j];
        name = select.getAttribute('name');
        value = this.config.getBadgeEnable(name);
        select.value = value;
      }
      _ref2 = this.$settingNotification;
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        select = _ref2[_k];
        name = select.getAttribute('name');
        value = this.config.getNotificationEnable(name);
        select.value = value;
      }
      _ref3 = this.$settingOpentabSelect;
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        select = _ref3[_l];
        name = select.getAttribute('name');
        value = this.config.getOpentabEnable(name);
        select.value = value;
      }
      if (this.config.isRuleBlackList()) {
        this.$settingOpentabRule.eq(0).prop('checked', true);
      } else {
        this.$settingOpentabRule.eq(1).prop('checked', true);
      }
      blacklist = this.config.getBlackList();
      whitelist = this.config.getWhiteList();
      this.$settingOpentabBlacklist.val(blacklist.join(','));
      this.$settingOpentabWhitelist.val(whitelist.join(','));
    };

    return SettingsTab;

  })(popup.BaseTab);

  POPUP = null;

  $(function() {
    var config, history, nicoInfo, regTab;

    config = chrome.extension.getBackgroundPage().config;
    nicoInfo = chrome.extension.getBackgroundPage().nicoInfo;
    history = chrome.extension.getBackgroundPage().history;
    POPUP = new popup.Popup(config, nicoInfo);
    regTab = function(tab) {
      if (!config.isNiconamaEnabled(tab.tabId)) {
        LOGGER.log("Tab " + tab.tabId + " is disable.");
        return;
      }
      POPUP.registerTab(tab);
    };
    regTab(new popup.OfficialTab('official', config, nicoInfo));
    regTab(new popup.OfficialTab('favorite', config, nicoInfo));
    regTab(new popup.FavoriteTab('timeshift', config, nicoInfo));
    regTab(new popup.HistoryTab('history', config, history));
    regTab(new popup.SettingsTab('settings', config));
    POPUP.showPopup();
  });

}).call(this);
