//@ sourceMappingURL=notification.map
(function() {
  var LOGGER, Notification, notification;

  LOGGER = new Logger;

  Notification = (function() {
    function Notification() {
      var _this = this;

      this.liveChecker = chrome.extension.getBackgroundPage().liveChecker;
      $(function() {
        _this.init();
      });
      return;
    }

    Notification.prototype.init = function() {
      this.makeContent();
    };

    Notification.prototype.makeContent = function() {
      var index, item, now;

      index = location.hash.slice(1);
      item = this.liveChecker.getNotificationTarget(index);
      LOGGER.info("index = " + index + ":", item);
      now = (new Date).getTime();
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
        openTimeStr = this.date2String(openTime);
      }
      if (startTime) {
        startTimeStr = this.date2String(startTime);
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

    Notification.prototype.date2String = function(date) {
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
        } else if (openTime && now > openTime - LiveInfoHtml.BEFORE_TIME_SEC) {
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

  notification = new Notification;

}).call(this);
