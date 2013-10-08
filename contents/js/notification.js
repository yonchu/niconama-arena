(function() {
  var LOGGER, NOTIFICATION, Notification, common, exports, ntf, _ref;

  exports = (_ref = exports != null ? exports : window) != null ? _ref : this;

  common = exports.CHEX.common;

  LOGGER = new common.Logger;

  ntf = exports.namespace('CHEX.ntf');

  ntf.Notification = Notification = (function() {
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
      var msg;

      msg = common.notification.timeMsg(openTime, startTime);
      if (msg.openTime) {
        $('#open-time').html(msg.openTime);
      }
      if (msg.startTime) {
        $('#start-time').html(msg.startTime);
      }
    };

    Notification.prototype.setStatus = function(openTime, startTime, endTime, now) {
      var msg;

      msg = common.notification.statusMsg(openTime, startTime, endTime, now);
      if (msg.text) {
        $('#status').text(msg.text);
      }
      if (msg.flag) {
        $('#status').addClass(msg.flag);
      }
    };

    return Notification;

  })();

  NOTIFICATION = new ntf.Notification;

}).call(this);
