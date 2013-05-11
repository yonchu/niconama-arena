//@ sourceMappingURL=autojump.map
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

  function Base(config) {
    this.config = config;
    LOGGER.info('config: ', this.config);
    this.init();
    this.addEventListeners();
  }

  Base.prototype.init = function() {
    var commuId, url;

    this.currentLiveId = this.getLiveIdFromUrl(location.href);
    if (!this.currentLiveId) {
      commuId = this.getCommuIdFromUrl(location.href);
      if (commuId) {
        LOGGER.info("commuId = " + commuId);
        url = $('meta[property="og:url"]').attr('content');
        this.currentLiveId = this.getLiveIdFromUrl(url);
      }
    }
    if (!this.currentLiveId) {
      throw new Error("Not found currentLiveId");
    }
    LOGGER.info("currentLiveId = " + this.currentLiveId);
  };

  Base.prototype.addEventListeners = function() {};

  Base.prototype.getLiveIdFromUrl = function(url) {
    var _ref;

    return (_ref = url.match(/(watch|gate)\/(lv\d+)/)) != null ? _ref[2] : void 0;
  };

  Base.prototype.getCommuIdFromUrl = function(url) {
    var _ref;

    return (_ref = url.match(/(watch|gate)\/(co\d+)/)) != null ? _ref[2] : void 0;
  };

  return Base;

})();

AutoJump = (function(_super) {
  __extends(AutoJump, _super);

  function AutoJump() {
    this.checkNextOnair = __bind(this.checkNextOnair, this);
    this.onChangeCheckBox = __bind(this.onChangeCheckBox, this);    _ref = AutoJump.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  AutoJump.CHECKBOX = "<div id=\"auto-jump\">\n  <div>\n    <input type=\"checkbox\" name=\"auto-jump\" /> 自動枠移動\n  </div>\n</div>";

  AutoJump.prototype.$checkbox = null;

  AutoJump.prototype.commuUrl = null;

  AutoJump.prototype.isCurrentLiveClosed = false;

  AutoJump.prototype.checkTimer = null;

  AutoJump.prototype.init = function() {
    var $autoJumpDiv;

    LOGGER.info('Start auto jump.');
    AutoJump.__super__.init.call(this);
    this.commuUrl = $('#commu_info a').first().attr('href');
    if (this.commuUrl) {
      $('#watch_player_top_box').after(AutoJump.CHECKBOX);
    } else {
      this.commuUrl = $('.smn a').first().attr('href');
      if (!this.commuUrl) {
        LOGGER.info('No avairable on official live.');
        return;
      }
      $('#bn_gbox').after(AutoJump.CHECKBOX);
      $autoJumpDiv = $('#auto-jump').addClass('auto-jump-gate');
    }
    this.$checkbox = $('#auto-jump input:checkbox');
    LOGGER.info("commuUrl = " + this.commuUrl);
    if (this.config.enableAutoJump) {
      this.$checkbox.attr('checked', true);
      this.checkNextOnair();
      this.checkTimer = setInterval(this.checkNextOnair, this.config.autoJumpIntervalSec * 1000);
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

  return AutoJump;

})(Base);

AutoEnter = (function(_super) {
  __extends(AutoEnter, _super);

  function AutoEnter() {
    this.onDOMSubtreeModifiedGates = __bind(this.onDOMSubtreeModifiedGates, this);    _ref1 = AutoEnter.__super__.constructor.apply(this, arguments);
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
      return;
    }
    this.saveHistory(data);
  };

  History.prototype.getLiveDataForGate = function() {
    var data, dateStr, endDateStr, endTimeMatch, endTimeStr, endYearStr, openTimeStr, startTimeStr, time, timeMatch, yearStr;

    LOGGER.info("getLiveDataForGate() " + this.currentLiveId);
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

    LOGGER.info("getLiveDataForWatch() " + this.currentLiveId);
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
