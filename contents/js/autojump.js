(function() {
  var AUTO_ACTION, AutoAction, AutoEnter, AutoJump, HISTORY, History, LOGGER, LivePage, OpentabStatus, aujmp, common, exports, init, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty;

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  common = exports.CHEX.common;

  LOGGER = new common.Logger;

  aujmp = exports.namespace('CHEX.aujmp');

  aujmp.LivePage = LivePage = (function() {
    function LivePage() {
      this.pageType = null;
      this.commuUrl = this.getCommuUrl();
      this.commuId = this.getCommuIdFromUrl(this.commuUrl);
      this.isChannel = this.commuId ? this.commuId.match(/^ch/) != null : false;
      this.liveId = this.getLiveId();
      this.isCrowed = !!location.href.match(/\?.*crowded/);
    }

    LivePage.prototype.getCommuUrl = function() {
      var commuUrl, _ref1;

      commuUrl = (_ref1 = $('.com,.chan')) != null ? _ref1.find('.smn a').prop('href') : void 0;
      if (commuUrl) {
        if ($('#gates').length) {
          this.pageType = 'gate-valid';
        } else {
          this.pageType = 'gate-closed';
        }
      } else {
        commuUrl = $('#watch_title_box a.commu_name,a.ch_name').prop('href');
        if (commuUrl) {
          this.pageType = 'live';
        } else if ($('#gates').length) {
          this.pageType = 'gate-valid';
        }
      }
      return commuUrl;
    };

    LivePage.prototype.getCommuIdFromUrl = function(url) {
      var _ref1;

      if (url) {
        return (_ref1 = url.match(/\/((ch|co)\d+)/)) != null ? _ref1[1] : void 0;
      }
      return null;
    };

    LivePage.prototype.getLiveId = function() {
      var id, url;

      id = this.getLiveIdFromUrl(location.href);
      if (!id) {
        url = $('meta[property="og:url"]').attr('content');
        id = this.getLiveIdFromUrl(url);
      }
      return id;
    };

    LivePage.prototype.getLiveIdFromUrl = function(url) {
      var _ref1;

      return (_ref1 = url.match(/(watch|gate)\/(lv\d+)/)) != null ? _ref1[2] : void 0;
    };

    LivePage.prototype.validate = function() {
      var msg;

      msg = [];
      if (!this.commuUrl) {
        msg.push('Community URL is not exists.');
      }
      if (!this.commuId) {
        msg.push('Community ID is not exists.');
      }
      if (!this.liveId) {
        msg.push('Live ID is not exists.');
      }
      if (!this.pageType) {
        msg.push('Page type is not exists.');
      }
      if (msg.length > 0) {
        return msg;
      }
    };

    LivePage.prototype.isPageTypeGate = function() {
      return this.pageType === 'gate-valid' || this.pageType === 'gate-closed';
    };

    LivePage.prototype.isPageTypeGateValid = function() {
      return this.pageType === 'gate-valid';
    };

    LivePage.prototype.isPageTypeGateClosed = function() {
      return this.pageType === 'gate-closed';
    };

    LivePage.prototype.isPageTypeLive = function() {
      return this.pageType === 'live';
    };

    LivePage.prototype.isJoinCommunity = function() {
      if (this.isPageTypeLive()) {
        return $('span.favorite,span.favorite_ch_link').length === 0;
      } else if (this.isPageTypeGate()) {
        return $('.join a').length === 0;
      }
      return false;
    };

    return LivePage;

  })();

  aujmp.AutoAction = AutoAction = (function() {
    AutoAction.TPL = '<div id="auto-action"><div></div></div>';

    function AutoAction(livePage, config) {
      this.livePage = livePage;
      this.config = config;
      this.$el = null;
      LOGGER.info('[niconama-arena][AutoAction] Start auto action');
      this.init();
    }

    AutoAction.prototype.init = function() {
      this.render();
      this.$el = $('#auto-action');
      this.autoEnter = new aujmp.AutoEnter(this.$el, this.livePage, this.config);
      this.autoJump = new aujmp.AutoJump(this.$el, this.livePage, this.config);
      this.opentabStatus = new aujmp.OpentabStatus(this.$el, this.livePage, this.config);
      return this;
    };

    AutoAction.prototype.render = function() {
      var tpl;

      tpl = aujmp.AutoAction.TPL;
      if (this.livePage.isPageTypeLive()) {
        $('#watch_player_top_box').after(tpl);
      } else if (this.livePage.isPageTypeGate()) {
        $('#bn_gbox').after(tpl);
      } else {
        throw Error("Unknow page type " + this.livePage.pageType, location.href);
      }
      return this;
    };

    return AutoAction;

  })();

  aujmp.AutoJump = AutoJump = (function() {
    AutoJump.LIVE_CHECK_URL = 'http://watch.live.nicovideo.jp/api/getplayerstatus?v=';

    AutoJump.TPL = '<input type="checkbox" name="auto-jump" /> 自動枠移動';

    function AutoJump($el, livePage, config) {
      var error;

      this.$el = $el;
      this.livePage = livePage;
      this.config = config;
      this.checkNextOnair = __bind(this.checkNextOnair, this);
      this.onChangeCheckBox = __bind(this.onChangeCheckBox, this);
      this.$checkbox = null;
      this.isCurrentLiveClosed = false;
      this.checkTimer = null;
      LOGGER.info('[niconama-arena][AutoJump] Start auto jump');
      error = this.validate();
      if (error) {
        LOGGER.info("[niconama-arena][AutoJump] Cancel auto jump: ", error);
      } else {
        this.init();
        this.initEventListeners();
      }
    }

    AutoJump.prototype.validate = function() {
      if (this.livePage.isPageTypeGateValid()) {
        return "Invalid page type: " + this.livePage.pageType;
      }
      if (this.livePage.isChannel) {
        return "Skip channel page: " + this.livePage.commuId;
      }
      return this.livePage.validate();
    };

    AutoJump.prototype.init = function() {
      this.render();
      this.$checkbox = this.$el.find('input:checkbox[name="auto-jump"]');
      if (this.config.enableAutoJump) {
        this.$checkbox.prop('checked', true);
        this.checkNextOnair();
        this.setUpCheckTimer();
      }
      return this;
    };

    AutoJump.prototype.initEventListeners = function() {
      this.$checkbox.on('change', this.onChangeCheckBox);
      return this;
    };

    AutoJump.prototype.onChangeCheckBox = function() {
      this.clearCheckTimer();
      if (this.$checkbox.prop('checked')) {
        LOGGER.info('[niconama-arena][AutoJump] Enable auto jump');
        this.setUpCheckTimer();
      } else {
        LOGGER.info('[niconama-arena][AutoJump] Disable auto jump');
      }
    };

    AutoJump.prototype.setUpCheckTimer = function() {
      var time;

      time = this.config.autoJumpIntervalSec * 1000;
      this.checkTimer = setInterval(this.checkNextOnair, time);
      return this;
    };

    AutoJump.prototype.clearCheckTimer = function() {
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = null;
      }
      return this;
    };

    AutoJump.prototype.render = function() {
      if (this.livePage.isPageTypeLive()) {
        this.$el.addClass('auto-jump-live');
      } else if (this.livePage.isPageTypeGate()) {
        this.$el.addClass('auto-jump-gate');
      } else {
        LOGGER.error("[niconama-arena][AutoJump] Unknown page type " + this.livePage.pageType);
        return this;
      }
      this.$el.find('div').append(aujmp.AutoJump.TPL);
      return this;
    };

    AutoJump.prototype.checkNextOnair = function() {
      var url,
        _this = this;

      if (this.isCurrentLiveClosed) {
        this.jumpNextOnair();
        return;
      }
      url = aujmp.AutoJump.LIVE_CHECK_URL + this.livePage.liveId;
      LOGGER.info("[niconama-arena][AutoJump] HTTP Request(checkNextOnair): " + url);
      common.httpRequest(url, function(response) {
        var $res, errorcode;

        $res = $($.parseHTML(common.transIMG(response)));
        errorcode = $res.find('error code').text();
        LOGGER.info("[niconama-arena][AutoJump] errorcode = " + errorcode);
        if (errorcode === 'closed') {
          _this.isCurrentLiveClosed = true;
          _this.jumpNextOnair();
        } else if (errorcode === 'notfound' || errorcode === 'timeshift_ticket_exhaust') {
          _this.clearCheckTimer();
          _this.$checkbox.prop('checked', false);
        }
      });
    };

    AutoJump.prototype.jumpNextOnair = function() {
      var url,
        _this = this;

      url = this.livePage.commuUrl;
      LOGGER.info("[niconama-arena][AutoJump] HTTP Request(jumpNextOnair): " + url);
      common.httpRequest(url, function(response) {
        var $res, nowLiveId, nowLiveUrl;

        $res = $($.parseHTML(common.transIMG(response)));
        nowLiveUrl = $res.find('#now_live a').first().attr('href');
        if (!nowLiveUrl) {
          LOGGER.info('[niconama-arena][AutoJump] Off-air');
          return _this;
        }
        LOGGER.info("[niconama-arena][AutoJump] On-air: nowLiveUrl = " + nowLiveUrl);
        nowLiveId = nowLiveUrl.match(/watch\/(lv\d+)/)[1];
        LOGGER.info("[niconama-arena][AutoJump] nowLiveId = " + nowLiveId);
        if (nowLiveId !== _this.livePage.liveId) {
          location.replace(nowLiveUrl);
        }
        return _this;
      });
      return this;
    };

    return AutoJump;

  })();

  aujmp.OpentabStatus = OpentabStatus = (function() {
    OpentabStatus.TPL = '<a href="javascript:void(0)">自動タブOPEN' + ' (%commuId%): &nbsp;<span>???</span></a>';

    OpentabStatus.OPENTAB_STATUS_BLACK_LIST = {
      'enable': {
        className: 'oepntab-enable',
        msg: '有効',
        next: 'tempDisable'
      },
      'tempDisable': {
        className: 'oepntab-tempDisable',
        msg: '一時無効',
        next: 'disable'
      },
      'disable': {
        className: 'oepntab-disable',
        msg: '無効',
        next: 'tempEnable'
      },
      'tempEnable': {
        className: 'oepntab-tempEnable',
        msg: '一時有効',
        next: 'enable'
      }
    };

    OpentabStatus.OPENTAB_STATUS_WHITE_LIST = {
      'enable': {
        className: 'oepntab-enable',
        msg: '有効',
        next: 'tempDisable'
      },
      'tempDisable': {
        className: 'oepntab-tempDisable',
        msg: '一時無効',
        next: 'disable'
      },
      'disable': {
        className: 'oepntab-disable',
        msg: '無効',
        next: 'tempEnable'
      },
      'tempEnable': {
        className: 'oepntab-tempEnable',
        msg: '一時有効',
        next: 'enable'
      }
    };

    function OpentabStatus($el, livePage, config) {
      var error;

      this.$el = $el;
      this.livePage = livePage;
      this.config = config;
      this.onToggleButton = __bind(this.onToggleButton, this);
      this.$toggleButton = null;
      LOGGER.info('[niconama-arena][OpentabStatus] Start opentab status');
      error = this.validate();
      if (error) {
        LOGGER.info("[niconama-arena][OpentabStatus] Cancel opentab status: ", error);
      } else {
        this.init();
      }
    }

    OpentabStatus.prototype.validate = function() {
      var error;

      error = this.livePage.validate();
      if (error) {
        return error;
      }
      if (!this.livePage.isJoinCommunity()) {
        return 'Not joining this community.';
      }
      LOGGER.info("[niconama-arena][OpentabStatus] Joining this community " + this.livePage.liveId);
    };

    OpentabStatus.prototype.init = function() {
      this.render();
      return this;
    };

    OpentabStatus.prototype.render = function() {
      var html;

      if (this.livePage.isPageTypeLive()) {
        this.$el.addClass('auto-jump-live');
      } else if (this.livePage.isPageTypeGate()) {
        this.$el.addClass('auto-jump-gate');
      } else {
        LOGGER.error("[niconama-arena][OpentabStatus] Unknown page type " + this.livePage.pageType);
        return this;
      }
      html = aujmp.OpentabStatus.TPL.replace('%commuId%', this.livePage.commuId);
      this.$el.find('div').append(html);
      this.$toggleButton = this.$el.find('a');
      this.getOpentabStatus();
      return this;
    };

    OpentabStatus.prototype.getOpentabStatus = function() {
      var _this = this;

      chrome.runtime.sendMessage({
        'target': 'config',
        'action': 'getOpentabStatus',
        'args': [this.livePage.commuId]
      }, function(response) {
        var status;

        status = response.res;
        _this.showOpentabStatus(status);
        _this.$toggleButton.on('click', _this.onToggleButton);
      });
    };

    OpentabStatus.prototype.showOpentabStatus = function(status) {
      var className, map, msg;

      LOGGER.log("[niconama-arena][OpentabStatus] Show opentab status: " + status);
      if (this.config.isRuleBlackList) {
        map = aujmp.OpentabStatus.OPENTAB_STATUS_BLACK_LIST;
      } else {
        map = aujmp.OpentabStatus.OPENTAB_STATUS_WHITE_LIST;
      }
      msg = map[status].msg;
      className = map[status].className;
      this.$toggleButton.find('span').html(msg);
      this.$toggleButton.attr('class', className);
      return this;
    };

    OpentabStatus.prototype.onToggleButton = function(event) {
      var className, key, map, value;

      event.preventDefault();
      className = this.$toggleButton.attr('class');
      if (this.config.isRuleBlackList) {
        map = aujmp.OpentabStatus.OPENTAB_STATUS_BLACK_LIST;
      } else {
        map = aujmp.OpentabStatus.OPENTAB_STATUS_WHITE_LIST;
      }
      for (key in map) {
        if (!__hasProp.call(map, key)) continue;
        value = map[key];
        if (value.className === className) {
          this.saveOpentabStatus(value.next);
          this.showOpentabStatus(value.next);
          break;
        }
      }
    };

    OpentabStatus.prototype.saveOpentabStatus = function(status) {
      var _this = this;

      chrome.runtime.sendMessage({
        'target': 'config',
        'action': 'setOpentabStatus',
        'args': [this.livePage.commuId, status]
      }, function(response) {
        LOGGER.log('[niconama-arena][OpentabStatus] Saved opentab status', response);
      });
      return this;
    };

    return OpentabStatus;

  })();

  aujmp.AutoEnter = AutoEnter = (function() {
    AutoEnter.TPL = '<input type="checkbox" name="auto-enter" /> 自動入場';

    function AutoEnter($el, livePage, config) {
      var error;

      this.$el = $el;
      this.livePage = livePage;
      this.config = config;
      this.onDOMSubtreeModifiedGates = __bind(this.onDOMSubtreeModifiedGates, this);
      this.$checkbox = null;
      LOGGER.info('[niconama-arena][AutoEnter] Start auto enter');
      error = this.validate();
      if (error) {
        LOGGER.info("[niconama-arena][AutoEnter] Cancel auto enter: ", error);
      } else {
        this.init();
        this.initEventListeners();
      }
    }

    AutoEnter.prototype.validate = function() {
      if (!this.livePage.isPageTypeGateValid()) {
        return "Invalid page type. " + this.livePage.pageType;
      }
      if (!this.livePage.liveId) {
        return 'Live ID is not found.';
      }
    };

    AutoEnter.prototype.init = function() {
      this.render();
      return this;
    };

    AutoEnter.prototype.render = function() {
      this.$el.addClass('auto-enter');
      this.$el.find('div').append(aujmp.AutoEnter.TPL);
      this.$checkbox = this.$el.find('input:checkbox[name=auto-enter]');
      if (this.config.enableAutoEnter) {
        this.$checkbox.prop('checked', true);
      }
      return this;
    };

    AutoEnter.prototype.initEventListeners = function() {
      $('#gates').on('DOMSubtreeModified', this.onDOMSubtreeModifiedGates);
      return this;
    };

    AutoEnter.prototype.onDOMSubtreeModifiedGates = function() {
      LOGGER.info("[niconama-arena][AutoEnter] Run auto enter: " + (new Date()));
      if (this.$checkbox.prop('checked')) {
        if (this.livePage.isCrowed) {
          LOGGER.warn('[niconama-arena][AutoEnter] Cancel auto enter because this live is crowed.');
        } else {
          location.reload(true);
        }
      }
    };

    return AutoEnter;

  })();

  aujmp.History = History = (function() {
    History.LIVE_URL = 'http://live.nicovideo.jp/watch/';

    function History(livePage, config) {
      var error, id;

      this.livePage = livePage;
      this.config = config;
      id = this.livePage.liveId;
      this.liveData = {
        id: id,
        title: null,
        link: aujmp.History.LIVE_URL + id,
        thumnail: null,
        openTime: null,
        startTime: null,
        endTimd: null,
        accessTime: Date.now()
      };
      LOGGER.info('[niconama-arena][History] Start history');
      error = this.validate();
      if (error) {
        LOGGER.info("[niconama-arena][History] Cancel history: ", error);
      } else {
        this.init();
      }
    }

    History.prototype.validate = function() {
      if (!this.livePage.liveId) {
        return 'Live ID is not found.';
      }
    };

    History.prototype.init = function() {
      var error;

      if (this.livePage.isPageTypeGate()) {
        this.setLiveDataForGate();
      } else if (this.livePage.isPageTypeLive()) {
        this.setLiveDataForLive();
      } else {
        LOGGER.error("Unknown page type: " + this.livePage.pageType);
        return this;
      }
      error = this.validateData();
      if (error) {
        LOGGER.error("[niconama-arena][History] Data validation error", error, this.liveData);
        return this;
      }
      this.saveHistory(this.liveData);
      return this;
    };

    History.prototype.setLiveDataForGate = function() {
      var dateStr, endDateStr, endTimeMatch, endTimeStr, endYearStr, openTimeStr, startTimeStr, time, timeMatch, yearStr;

      LOGGER.info("[niconama-arena][History] Saving history in gate page: " + this.liveData.id);
      this.liveData.title = $('.infobox h2 > span:first').text().trim();
      this.liveData.thumnail = $('#bn_gbox > .bn > meta').attr('content');
      time = $('#bn_gbox .kaijo').text().trim();
      timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/);
      if (timeMatch) {
        yearStr = timeMatch[1];
        dateStr = timeMatch[2];
        openTimeStr = timeMatch[3];
        startTimeStr = timeMatch[4];
        this.liveData.openTime = common.str2date(yearStr, dateStr, openTimeStr).getTime();
        this.liveData.startTime = common.str2date(yearStr, dateStr, startTimeStr).getTime();
      }
      endTimeMatch = $('#bn_gbox .kaijo').next().text().match(/この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/);
      if (endTimeMatch) {
        endYearStr = endTimeMatch[1];
        endDateStr = endTimeMatch[2];
        endTimeStr = endTimeMatch[3];
        this.liveData.endTime = common.str2date(endYearStr, endDateStr, endTimeStr).getTime();
      }
      return this;
    };

    History.prototype.setLiveDataForLive = function() {
      var dateStr, openTimeStr, startTimeStr, time, timeMatch, yearStr;

      LOGGER.info("[niconama-arena][History] Saving history in live page: " + this.liveData.id);
      this.liveData.title = $('#watch_title_box .box_inner .title_text').text().trim();
      this.liveData.thumnail = $('#watch_title_box .box_inner .thumb_area img:first').attr('src');
      time = $('#watch_tab_box .information').first().text().trim().replace(/：/g, ':');
      timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d).*開場.*(\d\d:\d\d)開演/);
      if (timeMatch) {
        yearStr = timeMatch[1];
        dateStr = timeMatch[2];
        openTimeStr = timeMatch[3];
        startTimeStr = timeMatch[4];
        this.liveData.openTime = common.str2date(yearStr, dateStr, openTimeStr).getTime();
        this.liveData.startTime = common.str2date(yearStr, dateStr, startTimeStr).getTime();
      }
      return this;
    };

    History.prototype.validateData = function() {
      var msg;

      msg = [];
      if (!this.liveData.title) {
        msg.push("Title does not exist.");
      }
      if (!this.liveData.link) {
        msg.push("Link does not exist.");
      }
      if (!this.liveData.thumnail) {
        msg.push("Thumnail does not exist.");
      }
      if (msg.length > 0) {
        return msg;
      }
    };

    History.prototype.saveHistory = function() {
      var _this = this;

      LOGGER.info("[niconama-arena][History] Save history", this.liveData);
      chrome.runtime.sendMessage({
        'target': 'history',
        'action': 'saveHistory',
        'args': [this.liveData]
      }, function(response) {
        var res;

        res = response.res;
        LOGGER.info("[niconama-arena][History] Saved history", res);
      });
      return this;
    };

    return History;

  })();

  init = function() {
    var run, watchUrl;

    if ($('#zero_lead').length) {
      LOGGER.info('[niconama-arena] No avairable nico_arena on Harajuku.');
      return;
    }
    if (location.href.match(/http[s]?:\/\/live\.nicovideo\.jp\/gate\/.*/)) {
      LOGGER.info('[niconama-arena] This page is for the gate.');
      if (location.href.match(/\?.*crowded/)) {
        LOGGER.info('[niconama-arena] This page is now crowed.');
      } else {
        watchUrl = location.href.replace(/\/gate\//, '/watch/');
        return;
      }
    }
    run = function(config) {
      var AUTO_ACTION, HISTORY, livePage;

      livePage = new aujmp.LivePage;
      LOGGER.info('[niconama-arena] Live page info = ', livePage);
      if (config.enableHistory) {
        HISTORY = new aujmp.History(livePage, config);
      }
      AUTO_ACTION = new aujmp.AutoAction(livePage, config);
    };
    chrome.runtime.sendMessage({
      'target': 'config',
      'action': 'getConfigForAutoJump',
      'args': []
    }, function(response) {
      var config;

      config = response.res;
      LOGGER.info('[niconama-arena] Config = ', config);
      run(config);
    });
  };

  AUTO_ACTION = null;

  HISTORY = null;

  init();

}).call(this);
