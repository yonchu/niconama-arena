exports = exports ? window ? @
common = exports.CHEX.common

LOGGER = new common.Logger

# === ntf ===
ntf = exports.namespace 'CHEX.ntf'


ntf.Notification = class Notification
  constructor: ->
    @liveChecker = chrome.extension.getBackgroundPage().my_liveChecker
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
    msg = common.notification.timeMsg openTime, startTime
    if msg.openTime
      $('#open-time').html msg.openTime
    if msg.startTime
      $('#start-time').html msg.startTime
    return

  setStatus: (openTime, startTime, endTime, now) ->
    msg = common.notification.statusMsg openTime, startTime, endTime, now
    # Set status.
    if msg.text
      $('#status').text msg.text
    if msg.flag
      $('#status').addClass msg.flag
    return


NOTIFICATION = new ntf.Notification
