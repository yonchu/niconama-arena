exports = exports ? window ? @
common = exports.CHEX.common

LOGGER = new common.Logger

# === ntf ===
ntf = exports.namespace 'CHEX.ntf'


ntf.Notification = class Notification
  @BEFORE_TIME_SEC: 300

  constructor: ->
    @liveChecker = chrome.extension.getBackgroundPage().liveChecker
    $ =>
      @init()
      return
    return

  init: ->
    @render()
    return

  render: ->
    index = location.hash.slice 1
    item = @liveChecker.getNotificationTarget index
    LOGGER.info "index = #{index}:", item
    now = Date.now()
    @setTitle item.title, item.link
    @setThumnail item.thumnail, item.link
    @setTime item.openTime, item.startTime
    @setStatus item.openTime, item.startTime, item.endTime, now
    return

  setTitle: (title, link) ->
    $('#title > a').text(title).attr 'href', link
    return

  setThumnail: (imgSrc, link) ->
    # Set thumnail.
    $('#thumnail > a').attr 'href', link
    if imgSrc
      $('#thumnail > a img').attr 'src', imgSrc
    return

  setTime: (openTime, startTime) ->
    text = null
    openTimeStr = common.date2String openTime if openTime
    startTimeStr = common.date2String startTime if startTime
    if openTimeStr
      text = "開場: #{openTimeStr}"
      $('#open-time').html text
      text = "開演: #{startTimeStr}"
      $('#start-time').html text
    else if startTimeStr
      text = "開始: #{startTimeStr}"
      $('#start-time').html text
    return

  setStatus: (openTime, startTime, endTime, now) ->
    text = null
    flag = null
    openTime = openTime?.getTime()
    startTime = startTime?.getTime()
    endTime = endTime?.getTime()
    if endTime and now > endTime
      # closed
      text = '放送は終了しました'
      flag = 'closed'
    else if startTime
      if now > startTime
        # on-air
        text = 'ただいま放送中'
      else if openTime and now > openTime
        # open gate
        text = 'まもなく放送開始'
      else if openTime and now > openTime - ntf.Notification.BEFORE_TIME_SEC * 1000
        # before open gate
        text = 'まもなく開場'
    # Set status.
    if text
      $('#status').text text
    if flag
      $('#status').addClass flag
    return


NOTIFICATION = new ntf.Notification
