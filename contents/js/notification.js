//@ sourceMappingURL=notification.map
(function() {
  var LOGGER, NOTIFICATION, Notification, common, exports, ntf, _ref;

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  common = exports.CHEX.common;

  LOGGER = new common.Logger;

  ntf = exports.namespace('CHEX.ntf');

  ntf.Notification = Notification = (function() {
    Notification.BEFORE_TIME_SEC = 300;

    function Notification() {
      var _this = this;

      this.liveChecker = chrome.extension.getBackgroundPage().liveChecker;
      $(function() {
        _this.init();
      });
      return;
    }

    Notification.prototype.init = function() {
      this.render();
    };

    Notification.prototype.render = function() {
      var index, item, now;

      index = location.hash.slice(1);
      item = this.liveChecker.getNotificationTarget(index);
      LOGGER.info("index = " + index + ":", item);
      now = Date.now();
      this.setTitle(item.title, item.link);
      this.setThumnail(item.thumnail, item.link);
      this.setTime(item.openTime, item.startTime);
      this.setStatus(item.openTime, item.startTime, item.endTime, now);
    };

    Notification.prototype.setTitle = function(title, link) {
      $('#title > a').text(title).attr('href', link);
    };

    Notification.prototype.setThumnail = function(imgSrc, link) {
      $('#thumnail > a').attr('href', link);
      if (imgSrc) {
        $('#thumnail > a img').attr('src', imgSrc);
      }
    };

    Notification.prototype.setTime = function(openTime, startTime) {
      var openTimeStr, startTimeStr, text;

      text = null;
      if (openTime) {
        openTimeStr = common.date2String(openTime);
      }
      if (startTime) {
        startTimeStr = common.date2String(startTime);
      }
      if (openTimeStr) {
        text = "開場: " + openTimeStr;
        $('#open-time').html(text);
        text = "開演: " + startTimeStr;
        $('#start-time').html(text);
      } else if (startTimeStr) {
        text = "開始: " + startTimeStr;
        $('#start-time').html(text);
      }
    };

    Notification.prototype.setStatus = function(openTime, startTime, endTime, now) {
      var flag, text;

      text = null;
      flag = null;
      openTime = openTime != null ? openTime.getTime() : void 0;
      startTime = startTime != null ? startTime.getTime() : void 0;
      endTime = endTime != null ? endTime.getTime() : void 0;
      if (endTime && now > endTime) {
        text = '放送は終了しました';
        flag = 'closed';
      } else if (startTime) {
        if (now > startTime) {
          text = 'ただいま放送中';
        } else if (openTime && now > openTime) {
          text = 'まもなく放送開始';
        } else if (openTime && now > openTime - ntf.Notification.BEFORE_TIME_SEC * 1000) {
          text = 'まもなく開場';
        }
      }
      if (text) {
        $('#status').text(text);
      }
      if (flag) {
        $('#status').addClass(flag);
      }
    };

    return Notification;

  })();

  NOTIFICATION = new ntf.Notification;

}).call(this);
