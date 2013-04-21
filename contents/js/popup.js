//@ sourceMappingURL=popup.map
(function() {
  var BaseTab, FavoriteTab, HistoryTab, LOGGER, LiveInfoHtml, LiveTab, OfficialTab, POPUP, Popup, SettingsTab, TimeshiftTab, date2String,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  LOGGER = new Logger;

  date2String = function(date) {
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

  Popup = (function() {
    Popup.LOADING_VIEW = "<div class=\"nowloading active\">\n  <p><img src=\"/icons/ajax-loader.gif\" alt=\"読込中...\" /></p>\n</div>";

    Popup.prototype.$updateButton = null;

    Popup.prototype.tabs = [];

    function Popup() {
      this.onClickUpdateButton = __bind(this.onClickUpdateButton, this);
      this.onClickTab = __bind(this.onClickTab, this);
      var _this = this;

      this.bg = chrome.extension.getBackgroundPage().bg;
      this.config = chrome.extension.getBackgroundPage().config;
      this.nicoInfo = chrome.extension.getBackgroundPage().nicoInfo;
      this.history = chrome.extension.getBackgroundPage().history;
      $(function() {
        _this.init();
      });
      return;
    }

    Popup.prototype.init = function() {
      this.$updateButton = $('#update-button');
      this.initTabs();
      this.showTab(this.config.getSaveTabNum());
      this.addEventListeners();
    };

    Popup.prototype.initTabs = function() {
      var $tab, $tabContent, i, tab, tabId, _i, _ref;

      this.$tabbars = $('#tabbar li');
      this.$tabsContents = $('#tabs-content > div');
      console.assert(this.$tabbars.size() === this.$tabsContents.size());
      for (i = _i = 0, _ref = this.$tabbars.size() - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        $tab = this.$tabbars.eq(i);
        $tabContent = this.$tabsContents.eq(i);
        $tab.attr('title', i);
        tabId = $tabContent.attr('id');
        if (!this.config.isNiconamaEnabled(tabId)) {
          $tab.css('display', 'none');
          continue;
        }
        tab = this.createTab(tabId);
        tab.tabNum = i;
        tab.$tab = $tab;
        tab.$tabContent = $tabContent;
        this.tabs[i] = tab;
      }
      $("#tabs-content").append(Popup.LOADING_VIEW);
    };

    Popup.prototype.createTab = function(tabId) {
      var tab;

      if (tabId === 'settings') {
        tab = new SettingsTab(tabId, this.config);
      } else if (tabId === 'official') {
        tab = new OfficialTab(tabId, this.config, this.nicoInfo);
      } else if (tabId === 'favorite') {
        tab = new FavoriteTab(tabId, this.config, this.nicoInfo);
      } else if (tabId === 'timeshift') {
        tab = new TimeshiftTab(tabId, this.config, this.nicoInfo);
      } else if (tabId === 'history') {
        tab = new HistoryTab(tabId, this.config, this.history);
      } else {
        tab = new BaseTab(tabId, this.config);
      }
      return tab;
    };

    Popup.prototype.showTab = function(num) {
      var tab, tmpTab, _i, _len, _ref;

      tab = this.tabs[num];
      if (!tab) {
        throw new Error("Error: Can not show tab " + num);
      }
      if (!tab) {
        this.showTab(parseInt(num) + 1);
        return;
      }
      _ref = this.tabs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        tmpTab = _ref[_i];
        if (!tmpTab) {
          continue;
        }
        tmpTab.isActive = false;
      }
      tab.isActive = true;
      tab.init();
      this.setLastUpdateTime(tab.tabId);
    };

    Popup.prototype.setLastUpdateTime = function(tabId) {
      var date, hh, min, sec;

      date = this.nicoInfo.getLasetUpdateTime(tabId);
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

    Popup.prototype.addEventListeners = function() {
      this.$tabbars.on('click', this.onClickTab);
      this.$updateButton.on('click', this.onClickUpdateButton);
    };

    Popup.prototype.onClickTab = function(event) {
      var tabNum;

      event.preventDefault();
      tabNum = $(event.target).attr('title');
      this.showTab(tabNum);
      this.config.setSaveTabNum(tabNum);
    };

    Popup.prototype.onClickUpdateButton = function(event) {
      var $target, tab, _i, _len, _ref,
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
      _ref = this.tabs;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        tab = _ref[_i];
        if (tab.isActive) {
          tab.init();
        }
      }
      setTimeout(function() {
        _this.$updateButton.attr('class', 'active-button');
      }, 60 * 1000);
    };

    return Popup;

  })();

  BaseTab = (function() {
    BaseTab.prototype.tabNum = -1;

    BaseTab.prototype.$tab = null;

    BaseTab.prototype.$tabContent = null;

    BaseTab.prototype.isActive = false;

    function BaseTab(tabId, config) {
      this.tabId = tabId;
      this.config = config;
      this.init = __bind(this.init, this);
      this.addEventListeners();
    }

    BaseTab.prototype.addEventListeners = function() {};

    BaseTab.prototype.init = function() {
      this.$tab.addClass('active').siblings().removeClass('active');
      this.beforeShowTab();
      if (this.showTab()) {
        this.afterShowTab();
      }
    };

    BaseTab.prototype.showTab = function() {
      return true;
    };

    BaseTab.prototype.beforeShowTab = function() {
      $("#tabs-content > .nowloading").show().siblings().hide();
    };

    BaseTab.prototype.afterShowTab = function() {
      this.$tabContent.fadeIn(100).siblings().hide();
    };

    BaseTab.prototype.showTabBadge = function(text) {
      var disp;

      disp = text ? 'block' : 'none';
      this.$tab.find('.tab-badge').css('display', disp).text(text);
    };

    return BaseTab;

  })();

  LiveInfoHtml = (function() {
    LiveInfoHtml.NOT_WATCH_THUMNAIL = 'http://res.nimg.jp/img/common/video_deleted_ja-jp.jpg';

    LiveInfoHtml.NO_IMAGE_THUMNAIL = 'http://icon.nimg.jp/404.jpg';

    LiveInfoHtml.BEFORE_TIME_SEC = 300;

    LiveInfoHtml.prototype.html = null;

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
    };

    LiveInfoHtml.prototype.setThumnail = function() {
      if (this.item.thumnail) {
        this.html.thumnail = this.item.thumnail;
      } else if (this.item.flag && this.item.flag === 'disable') {
        this.html.thumnail = LiveInfoHtml.NOT_WATCH_THUMNAIL;
      } else {
        this.html.thumnail = '';
      }
    };

    LiveInfoHtml.prototype.setTime = function() {
      var openTimeStr, startTimeStr, time;

      time = '';
      if (this.item.openTime) {
        openTimeStr = date2String(this.item.openTime);
      }
      if (this.item.startTime) {
        startTimeStr = date2String(this.item.startTime);
      }
      if (openTimeStr) {
        time = "開場: " + openTimeStr + " | 開演: " + startTimeStr;
      } else if (startTimeStr) {
        time = "開始: " + startTimeStr;
      }
      return this.html.time = time;
    };

    LiveInfoHtml.prototype.setStatus = function() {
      var endTime, flags, openTime, startTime, status, _ref, _ref1, _ref2;

      status = '';
      flags = [];
      openTime = (_ref = this.item.openTime) != null ? _ref.getTime() : void 0;
      startTime = (_ref1 = this.item.startTime) != null ? _ref1.getTime() : void 0;
      endTime = (_ref2 = this.item.endTime) != null ? _ref2.getTime() : void 0;
      if (endTime && this.now > endTime) {
        status = '放送は終了しました';
        flags.push('closed');
      } else if (startTime) {
        if (this.now > startTime) {
          status = 'ただいま放送中';
        } else if (openTime && this.now > openTime) {
          status = 'まもなく放送開始';
        } else if (openTime && this.now > openTime - LiveInfoHtml.BEFORE_TIME_SEC * 1000) {
          status = 'まもなく開場';
        }
      }
      this.html.status = status;
      if (this.item.flag) {
        flags.push(this.item.flag);
      }
      this.html.flag = flags.join(' ');
    };

    return LiveInfoHtml;

  })();

  LiveTab = (function(_super) {
    __extends(LiveTab, _super);

    LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC = 3;

    LiveTab.prototype.checkUpdateTimer = null;

    function LiveTab(tabId, config, nicoInfo) {
      this.nicoInfo = nicoInfo;
      this.checkUpdate = __bind(this.checkUpdate, this);
      LiveTab.__super__.constructor.call(this, tabId, config);
      this.$content = $("#" + this.tabId + " > ul");
    }

    LiveTab.prototype.addEventListeners = function() {
      this.checkUpdateTimer = setInterval(this.checkUpdate, LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC * 1000);
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

    LiveTab.prototype.checkUpdate = function() {
      if (this.updateView()) {
        this.afterShowTab();
      }
    };

    LiveTab.prototype.countBadge = function() {
      return this.nicoInfo.countBadge(this.tabId);
    };

    LiveTab.prototype.showTab = function() {
      return this.updateView(true);
    };

    LiveTab.prototype.updateView = function(force) {
      var cache, currentData, html, item, liveInfoHtml, now, viewData, _i, _len;

      if (force == null) {
        force = false;
      }
      this.showTabBadge(this.countBadge());
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
      now = (new Date).getTime();
      for (_i = 0, _len = viewData.length; _i < _len; _i++) {
        item = viewData[_i];
        liveInfoHtml = new LiveInfoHtml(item, now);
        html = liveInfoHtml.getHtml();
        this.$content.append(html);
      }
      this.isUpdated(false);
      cache = null;
      currentData = null;
      viewData = null;
      return true;
    };

    return LiveTab;

  })(BaseTab);

  FavoriteTab = (function(_super) {
    __extends(FavoriteTab, _super);

    function FavoriteTab(tabId, config, nicoInfo) {
      FavoriteTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return FavoriteTab;

  })(LiveTab);

  TimeshiftTab = (function(_super) {
    __extends(TimeshiftTab, _super);

    function TimeshiftTab(tabId, config, nicoInfo) {
      TimeshiftTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return TimeshiftTab;

  })(LiveTab);

  OfficialTab = (function(_super) {
    __extends(OfficialTab, _super);

    function OfficialTab(tabId, config, nicoInfo) {
      OfficialTab.__super__.constructor.call(this, tabId, config, nicoInfo);
    }

    return OfficialTab;

  })(LiveTab);

  HistoryTab = (function(_super) {
    __extends(HistoryTab, _super);

    function HistoryTab(tabId, config, history) {
      this.history = history;
      HistoryTab.__super__.constructor.call(this, tabId, config);
      this.$content = $('#history-content');
    }

    HistoryTab.prototype.addEventListeners = function() {};

    HistoryTab.prototype.showTab = function() {
      this.showHistory();
      return true;
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
          obj.accessTime = date2String(new Date(hist.accessTime));
        } else {
          obj.accessTime = '';
        }
        if (hist.startTime) {
          obj.startTime = date2String(new Date(hist.startTime));
        } else {
          obj.startTime = '';
        }
        html = TMPL.history(obj);
        this.$content.append(html);
      }
      histories = null;
    };

    return HistoryTab;

  })(BaseTab);

  SettingsTab = (function(_super) {
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
      this.$settingOpentabBlacklist = $('#setting-opentab input:text');
    }

    SettingsTab.prototype.addEventListeners = function() {
      $('#settings button[value="ok"]').on('click', this.onClickOkButton);
      $('#settings button[value="cancel"]').on('click', this.onClickCancelButton);
    };

    SettingsTab.prototype.showTab = function() {
      this.restoreSettings();
      return true;
    };

    SettingsTab.prototype.showMessage = function(msg, addClass) {
      LOGGER.log('showMessage');
      $('#settings-status').css('display', 'inline').addClass(addClass).text(msg);
      setTimeout(this.hideMessage(addClass), 2000);
      addClass = null;
    };

    SettingsTab.prototype.hideMessage = function(removeClass) {
      var _this = this;

      LOGGER.log('hideMessage');
      return function(removeClass) {
        $('#settings-status').css('display', 'none').removeClass(removeClass).text('');
        removeClass = null;
      };
    };

    SettingsTab.prototype.onClickOkButton = function(event) {
      var error;

      try {
        this.validate();
        this.saveSettings();
        this.config.saveSettings();
        this.showMessage('保存しました', 'success');
      } catch (_error) {
        error = _error;
        LOGGER.error('Could not save settings.', error);
        if (error.stack) {
          LOGGER.error(error.stack);
        }
        this.restoreSettings();
        this.showMessage('不正な値があります', 'failure');
      }
    };

    SettingsTab.prototype.onClickCancelButton = function(event) {
      this.restoreSettings();
    };

    SettingsTab.prototype.saveSettings = function() {
      var blacklist, checkbox, checkboxes, name, select, value, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2;

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
      _ref = this.$settingBadge;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        select = _ref[_j];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setBadgeEnable(name, value);
      }
      _ref1 = this.$settingNotification;
      for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
        select = _ref1[_k];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setNotificationEnable(name, value);
      }
      _ref2 = this.$settingOpentabSelect;
      for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
        select = _ref2[_l];
        name = select.getAttribute('name');
        value = select.value;
        this.config.setOpentabEnable(name, value);
      }
      blacklist = this.$settingOpentabBlacklist.val();
      if (blacklist) {
        blacklist = blacklist.replace(/\ /g, '').split(',');
      } else {
        blacklist = [];
      }
      this.config.setBlackList(blacklist);
      checkboxes = null;
      blacklist = null;
    };

    SettingsTab.prototype.restoreSettings = function() {
      var blacklist, checkbox, checkboxes, name, select, value, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2;

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
      _ref = this.$settingBadge;
      for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
        select = _ref[_j];
        name = select.getAttribute('name');
        value = this.config.getBadgeEnable(name);
        select.value = value;
      }
      _ref1 = this.$settingNotification;
      for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
        select = _ref1[_k];
        name = select.getAttribute('name');
        value = this.config.getNotificationEnable(name);
        select.value = value;
      }
      _ref2 = this.$settingOpentabSelect;
      for (_l = 0, _len3 = _ref2.length; _l < _len3; _l++) {
        select = _ref2[_l];
        name = select.getAttribute('name');
        value = this.config.getOpentabEnable(name);
        select.value = value;
      }
      blacklist = this.config.getBlackList();
      this.$settingOpentabBlacklist.val(blacklist.join(','));
      checkboxes = null;
      blacklist = null;
    };

    SettingsTab.prototype.validate = function() {
      var value;

      value = this.$autoJumpIntervalInput.val();
      if (!value || value < 5) {
        throw new Error('Validate error.');
      }
    };

    return SettingsTab;

  })(BaseTab);

  POPUP = new Popup;

}).call(this);
