//@ sourceMappingURL=autojump.map
(function() {
  var AutoEnter, AutoJump, Base, History, LOGGER, autoEnter, autoJump, history, httpRequest, init, preInit, str2date, transIMG, _ref, _ref1, _ref2,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  LOGGER = new Logger;

  httpRequest = function(url, callback) {
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

  transIMG = function(html) {
    return html.replace(/<img([^>]+)>/g, '<imgx$1>');
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

  Base = (function() {
    Base.LIVE_CHECK_URL = 'http://watch.live.nicovideo.jp/api/getplayerstatus?v=';

    Base.LIVE_URL = 'http://live.nicovideo.jp/watch/';

    Base.prototype.currentLiveId = null;

    Base.prototype.commuId = null;

    Base.prototype.commuUrl = null;

    Base.prototype.pageType = null;

    function Base(config) {
      this.config = config;
      LOGGER.info('config: ', this.config);
      if (!this.init()) {
        return;
      }
      this.addEventListeners();
    }

    Base.prototype.init = function() {
      this.commuUrl = this.getCommuUrl();
      this.commuId = this.getCommuIdFromUrl(this.commuUrl);
      this.currentLiveId = this.getLiveId();
      if (!this.currentLiveId) {
        throw Error("Not found currentLiveId");
      }
      LOGGER.info("commuUrl = " + this.commuUrl);
      LOGGER.info("commuId = " + this.commuId);
      LOGGER.info("currentLiveId = " + this.currentLiveId);
      LOGGER.info("pageType = " + this.pageType);
      return true;
    };

    Base.prototype.addEventListeners = function() {};

    Base.prototype.getCommuUrl = function() {
      var commuUrl, _ref;

      commuUrl = (_ref = $('.com,.chan')) != null ? _ref.find('.smn a').prop('href') : void 0;
      if (commuUrl) {
        this.pageType = 'gate';
      } else {
        commuUrl = $('#watch_title_box > div > a').prop('href');
        if (commuUrl) {
          this.pageType = 'live';
        }
      }
      return commuUrl;
    };

    Base.prototype.getCommuIdFromUrl = function(url) {
      var _ref;

      if (url) {
        return (_ref = url.match(/\/((ch|co)\d+)/)) != null ? _ref[1] : void 0;
      }
      return null;
    };

    Base.prototype.getLiveId = function() {
      var id, url;

      id = this.getLiveIdFromUrl(location.href);
      if (!id) {
        url = $('meta[property="og:url"]').attr('content');
        id = this.getLiveIdFromUrl(url);
      }
      return id;
    };

    Base.prototype.getLiveIdFromUrl = function(url) {
      var _ref;

      return (_ref = url.match(/(watch|gate)\/(lv\d+)/)) != null ? _ref[2] : void 0;
    };

    return Base;

  })();

  AutoJump = (function(_super) {
    __extends(AutoJump, _super);

    function AutoJump() {
      this.checkNextOnair = __bind(this.checkNextOnair, this);
      this.onToggleButton = __bind(this.onToggleButton, this);
      this.onChangeCheckBox = __bind(this.onChangeCheckBox, this);      _ref = AutoJump.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    AutoJump.TPL = "<div id=\"auto-jump\">\n  <div>\n    <input type=\"checkbox\" name=\"auto-jump\" /> 自動枠移動\n  </div>\n</div>";

    AutoJump.OPENTAB_STATUS = {
      'disable': {
        className: 'oepntab-disable',
        msg: '無効',
        next: 'tempDisable'
      },
      'tempDisable': {
        className: 'oepntab-tempDisable',
        msg: '一時無効',
        next: 'enable'
      },
      'enable': {
        className: 'oepntab-enable',
        msg: '有効',
        next: 'disable'
      }
    };

    AutoJump.prototype.$el = null;

    AutoJump.prototype.$checkbox = null;

    AutoJump.prototype.$toggleButton = null;

    AutoJump.prototype.isCurrentLiveClosed = false;

    AutoJump.prototype.checkTimer = null;

    AutoJump.prototype.init = function() {
      LOGGER.info('Start auto jump.');
      AutoJump.__super__.init.call(this);
      if (!(this.commuUrl && this.commuId && this.currentLiveId && this.pageType)) {
        LOGGER.info("Not run in this page.");
        return false;
      }
      this.render();
      this.$el = $('#auto-jump');
      this.$checkbox = this.$el.find('input:checkbox');
      if (this.isJoinCommunity()) {
        LOGGER.info('Joining this community.');
        this.renderOpentabStatus();
      }
      if (this.config.enableAutoJump) {
        this.$checkbox.attr('checked', true);
        this.checkNextOnair();
        this.checkTimer = setInterval(this.checkNextOnair, this.config.autoJumpIntervalSec * 1000);
      }
      return true;
    };

    AutoJump.prototype.render = function() {
      var $autoJumpDiv, tpl;

      tpl = AutoJump.TPL.replace('%commuId%', this.commuId);
      if (this.pageType === 'live') {
        return $('#watch_player_top_box').after(tpl);
      } else if (this.pageType === 'gate') {
        $('#bn_gbox').after(tpl);
        return $autoJumpDiv = $('#auto-jump').addClass('auto-jump-gate');
      } else {
        throw Error("Unknow page type " + this.pageType, location.href);
      }
    };

    AutoJump.prototype.addEventListeners = function() {
      this.$checkbox.on('change', this.onChangeCheckBox);
    };

    AutoJump.prototype.onChangeCheckBox = function() {
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = null;
      }
      if (this.$checkbox.attr('checked')) {
        this.checkTimer = setInterval(this.checkNextOnair, this.config.autoJumpIntervalSec * 1000);
      }
    };

    AutoJump.prototype.onToggleButton = function(event) {
      var className, key, map, value, _results;

      className = this.$toggleButton.attr('class');
      map = AutoJump.OPENTAB_STATUS;
      _results = [];
      for (key in map) {
        if (!__hasProp.call(map, key)) continue;
        value = map[key];
        if (value.className === className) {
          this.saveOpentabStatus(value.next);
          this.showOpentabStatus(value.next);
          break;
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    AutoJump.prototype.checkNextOnair = function() {
      var _this = this;

      if (this.isCurrentLiveClosed) {
        this.jumpNextOnair();
        return;
      }
      LOGGER.info("HTTP Request(checkNextOnair): " + (AutoJump.LIVE_CHECK_URL + this.currentLiveId));
      httpRequest(AutoJump.LIVE_CHECK_URL + this.currentLiveId, function(response) {
        var $res, errorcode;

        $res = $($.parseHTML(transIMG(response)));
        errorcode = $res.find('error code').text();
        LOGGER.info("errorcode = " + errorcode);
        if (errorcode === 'closed') {
          _this.isCurrentLiveClosed = true;
          _this.jumpNextOnair();
        } else if (errorcode === 'notfound' || errorcode === 'timeshift_ticket_exhaust') {
          if (_this.checkTimer) {
            clearInterval(_this.checkTimer);
            _this.checkTimer = null;
          }
          _this.$checkbox.attr('checked', false);
        }
      });
    };

    AutoJump.prototype.jumpNextOnair = function() {
      var _this = this;

      LOGGER.info("HTTP Request(jumpNextOnair): " + this.commuUrl);
      httpRequest(this.commuUrl, function(response) {
        var $res, nowLiveId, nowLiveUrl;

        $res = $($.parseHTML(transIMG(response)));
        nowLiveUrl = $res.find('#now_live a').first().attr('href');
        if (!nowLiveUrl) {
          LOGGER.info('Off-air');
          return;
        }
        LOGGER.info("On-air: nowLiveUrl = " + nowLiveUrl);
        nowLiveId = nowLiveUrl.match(/watch\/(lv\d+)/)[1];
        LOGGER.info("nowLiveId = " + nowLiveId);
        if (nowLiveId !== _this.currentLiveId) {
          location.replace(nowLiveUrl);
        }
      });
    };

    AutoJump.prototype.isJoinCommunity = function() {
      if (this.pageType === 'live') {
        return $('span.favorite,span.favorite_ch_link').length === 0;
      } else if (this.pageType === 'gate') {
        return $('.join a').length === 0;
      }
      return false;
    };

    AutoJump.prototype.renderOpentabStatus = function() {
      var html,
        _this = this;

      html = '<a href="javascript:void(0)">自動タブOPEN (';
      html += this.commuId;
      html += '): &nbsp;<span>???</span></a>';
      this.$el.find('div').append(html);
      this.$toggleButton = this.$el.find('a');
      this.$toggleButton.on('click', this.onToggleButton);
      chrome.runtime.sendMessage({
        'target': 'config',
        'action': 'getOpentabStatus',
        'args': [this.commuId]
      }, function(response) {
        var status;

        status = response.res;
        _this.showOpentabStatus(status);
      });
    };

    AutoJump.prototype.saveOpentabStatus = function(status) {
      var _this = this;

      chrome.runtime.sendMessage({
        'target': 'config',
        'action': 'setOpentabStatus',
        'args': [this.commuId, status]
      }, function(response) {});
    };

    AutoJump.prototype.showOpentabStatus = function(status) {
      var className, map, msg;

      LOGGER.log("Show openttab status: " + status);
      map = AutoJump.OPENTAB_STATUS;
      msg = map[status].msg;
      className = map[status].className;
      this.$toggleButton.attr('class', className);
      this.$toggleButton.find('span').html(msg);
    };

    return AutoJump;

  })(Base);

  AutoEnter = (function(_super) {
    __extends(AutoEnter, _super);

    function AutoEnter() {
      this.onDOMSubtreeModifiedGates = __bind(this.onDOMSubtreeModifiedGates, this);      _ref1 = AutoEnter.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    AutoEnter.CHECKBOX = "<div id=\"auto-enter\">\n  <div>\n    <input type=\"checkbox\" name=\"auto-enter\" /> 自動入場\n  </div>\n</div>";

    AutoEnter.prototype.$checkbox = null;

    AutoEnter.prototype.init = function() {
      LOGGER.info('Start auto enter.');
      AutoEnter.__super__.init.call(this);
      $('#bn_gbox').after(AutoEnter.CHECKBOX);
      this.$checkbox = $('#auto-enter input:checkbox');
      if (this.config.enableAutoEnter) {
        this.$checkbox.attr('checked', true);
      }
      return true;
    };

    AutoEnter.prototype.addEventListeners = function() {
      $('#gates').on('DOMSubtreeModified', this.onDOMSubtreeModifiedGates);
    };

    AutoEnter.prototype.onDOMSubtreeModifiedGates = function() {
      LOGGER.info("Run auto enter: " + (new Date()));
      if (this.$checkbox.attr('checked')) {
        location.reload(true);
      }
    };

    return AutoEnter;

  })(Base);

  History = (function(_super) {
    __extends(History, _super);

    function History() {
      _ref2 = History.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    History.prototype.init = function() {
      var data;

      LOGGER.info('Start history.');
      History.__super__.init.call(this);
      if ($('#gates').length || $('#bn_gbox .kaijo').length) {
        data = this.getLiveDataForGate();
      } else {
        data = this.getLiveDataForWatch();
      }
      data.accessTime = (new Date).getTime();
      if (!this.validate(data)) {
        LOGGER.error("Validate error", data);
        return false;
      }
      this.saveHistory(data);
      return true;
    };

    History.prototype.getLiveDataForGate = function() {
      var data, dateStr, endDateStr, endTimeMatch, endTimeStr, endYearStr, openTimeStr, startTimeStr, time, timeMatch, yearStr;

      LOGGER.info("Saving history in gate page: " + this.currentLiveId);
      data = {};
      data.id = this.currentLiveId;
      data.title = $('.infobox h2 > span:first').text().trim();
      data.link = Base.LIVE_URL + data.id;
      time = $('#bn_gbox .kaijo').text().trim();
      timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/);
      if (timeMatch) {
        yearStr = timeMatch[1];
        dateStr = timeMatch[2];
        openTimeStr = timeMatch[3];
        startTimeStr = timeMatch[4];
        data.openTime = str2date(yearStr, dateStr, openTimeStr);
        data.startTime = str2date(yearStr, dateStr, startTimeStr);
      }
      data.thumnail = $('#bn_gbox > .bn > meta').attr('content');
      endTimeMatch = $('#bn_gbox .kaijo').next().text().match(/この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/);
      if (endTimeMatch) {
        endYearStr = endTimeMatch[1];
        endDateStr = endTimeMatch[2];
        endTimeStr = endTimeMatch[3];
        data.endTime = str2date(endYearStr, endDateStr, endTimeStr);
      }
      return data;
    };

    History.prototype.getLiveDataForWatch = function() {
      var data, dateStr, openTimeStr, startTimeStr, time, timeMatch, yearStr;

      LOGGER.info("Saving history in live page: " + this.currentLiveId);
      data = {};
      data.id = this.currentLiveId;
      data.link = Base.LIVE_URL + data.id;
      data.title = $('#watch_title_box .box_inner .title').attr('title').trim();
      data.thumnail = $('#watch_title_box .box_inner img:first').attr('src');
      time = $('#watch_tab_box .information').first().text().trim().replace(/：/g, ':');
      timeMatch = time.match(/(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d).*開場.*(\d\d:\d\d)開演/);
      if (timeMatch) {
        yearStr = timeMatch[1];
        dateStr = timeMatch[2];
        openTimeStr = timeMatch[3];
        startTimeStr = timeMatch[4];
        data.openTime = str2date(yearStr, dateStr, openTimeStr).getTime();
        data.startTime = str2date(yearStr, dateStr, startTimeStr).getTime();
      }
      return data;
    };

    History.prototype.validate = function(data) {
      if (!data) {
        LOGGER.error("data is null " + this.currentLiveId);
        return false;
      }
      if (!data.title) {
        LOGGER.error("Title does not exist " + this.currentLiveId);
        return false;
      }
      if (!data.link) {
        LOGGER.error("Link does not exist " + this.currentLiveId);
        return false;
      }
      if (!data.thumnail) {
        LOGGER.error("Thumnail does not exist " + this.currentLiveId);
        return false;
      }
      return true;
    };

    History.prototype.saveHistory = function(data) {
      var _this = this;

      LOGGER.info("Save history", data);
      chrome.runtime.sendMessage({
        'target': 'history',
        'action': 'saveHistory',
        'args': [data]
      }, function(response) {
        var res;

        res = response.res;
        LOGGER.info("Saved history", res);
      });
    };

    return History;

  })(Base);

  preInit = function() {
    var watchUrl,
      _this = this;

    if ($('#zero_lead').length) {
      LOGGER.info('No avairable nico_arena on Harajuku.');
      return;
    }
    if (location.href.match(/http[s]?:\/\/live\.nicovideo\.jp\/gate\/.*/)) {
      LOGGER.info('This page is for the gate.');
      watchUrl = location.href.replace(/\/gate\//, '/watch/');
      location.replace(watchUrl);
      return;
    }
    chrome.runtime.sendMessage({
      'target': 'config',
      'action': 'getConfigForAutoJump',
      'args': []
    }, function(response) {
      var config;

      config = response.res;
      init(config);
    });
  };

  autoJump = null;

  autoEnter = null;

  history = null;

  init = function(config) {
    if (config.enableHistory) {
      history = new History(config);
    }
    if ($('#gates').length) {
      return autoEnter = new AutoEnter(config);
    } else {
      return autoJump = new AutoJump(config);
    }
  };

  preInit();

}).call(this);
