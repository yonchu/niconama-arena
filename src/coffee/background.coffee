exports = exports ? window ? @
common = exports.CHEX.common

LOGGER = new common.Logger common.Logger.LEVEL.WARN

# === bg ===
bg = exports.namespace 'CHEX.bg'


bg.Background = class Background
  # === Constructor.
  constructor: (@commands) ->
    LOGGER.log "[Background] Initializing...", @commands
    @initEventListeners()

  # === Event Listeners.
  initEventListeners: ->
    chrome.runtime.onMessage.addListener (request, sender, sendResponse) =>
      target = @commands[request.target]
      if sender.tab
        logmsg = "[Background] Received message from a content script: #{sender.tab.url}"
      else
        logmsg = "[Background] Received message from the extension"
      LOGGER.log logmsg, request, target
      unless target
        throw Error "Invalid target #{request.target}", @commands
      args = request.args
      args.push sendResponse
      res = target[request.action].apply target, args
      if res?
        sendResponse res: res
      return true
    return


bg.ConfigCommands = class ConfigCommands
  # === Constructor.
  constructor: (@config) ->

  # === Public methods.
  getOpentabStatus: (commuId) ->
    return @config.getOpentabStatus commuId

  setOpentabStatus: (commuId, status) ->
    @config.setOpentabStatus commuId, status
    return true

  getConfigForAutoJump: ->
    return @config.getConfigForAutoJump()


bg.HistoryCommands = class HistoryCommands
  # === Constructor.
  constructor: (@history) ->

  # === Public methods.
  saveHistory: (data) ->
    return @history.saveHistory data


bg.Config = class Config
  @BADGE_ENABLE_VALUES: ['disable', 'before', 'gate', 'onair']

  @DEFAULT_SETTINGS:
    enableAutoJump: true
    autoJumpIntervalSec: 20
    enableAutoEnter: true
    enabledNiconama:
      official: true
      favorite: true
      timeshift: true
      history: true
      settings: true
    niconamaUpdateIntervalSec: 600
    badge:
      official:
        beforeTimeSec: 300,
        enable: 'onair'
      favorite:
        beforeTimeSec: 300,
        enable: 'before'
      timeshift:
        beforeTimeSec: 300,
        enable: 'before'
    notification:
      official:
        beforeTimeSec: 300,
        enable: 'onair'
      favorite:
        beforeTimeSec: 300,
        enable: 'before'
      timeshift:
        beforeTimeSec: 300,
        enable: 'before'
    opentab:
      official:
        beforeTimeSec: 300,
        enable: 'disable'
      favorite:
        beforeTimeSec: 300,
        enable: 'before'
      timeshift:
        beforeTimeSec: 300,
        enable: 'before'
      rule: 'blacklist'
      blacklist: []
      whitelist: []


  # === Constructor.
  constructor: ->
    @opentabStatus = {}
    @_initSettings()

  # ===== localStorage methods =====
  _getValue: (key, def=undefined) ->
    value = localStorage[key]
    console.assert value isnt 'undefined',
      "[Config] Error: Unexpected value in localStorage (key=#{key}})"
    return if value? then value else def

  _setValue: (key, value) ->
    console.assert value isnt 'undefined',
      "[Config] Error: Unexpected value in localStorage (key=#{key}})"
    if value
      localStorage[key] = value
    else
      localStorage.removeItem(key)
    return

  # ===== Settings methods =====
  _initSettings: ->
    settings = localStorage.settings
    if settings
      @settings = JSON.parse settings
    else
      @settings = bg.Config.DEFAULT_SETTINGS
      @save()
      LOGGER.info '[Config] Save default settings.'
    return

  save: ->
    settings = JSON.stringify @settings
    localStorage.settings = settings
    LOGGER.log "[Config] Saved settings: ", settings
    return

  _getSettingsValue: (key, def=undefined) ->
    unless @settings.hasOwnProperty key
      throw Error "Invalid key #{key}"
    value = @settings[key]
    console.assert value isnt 'undefined',
      "[Config] Error: Unexpected value in settings (key=#{key}})"
    return if value? then value else def

  _setSettingsValue: (key, value) ->
    console.assert value isnt 'undefined',
      "[Config] Error: Unexpected value in localStorage (key=#{key}})"
    unless value?
      throw Error "invalid value #{value}"
    unless @settings[key]?
      throw Error "invalid key #{key}"
    @settings[key] = value
    return

  _getSettingsFlag: (key) ->
    value = @_getSettingsValue key
    return !!value

  _setSettingsFlag: (key, value) ->
    @_setSettingsValue key, !!value
    return

  # ===== Common methods =====
  # TODO
  _isInt: (value) ->
    return false unless value?
    value += ''
    if (value.match /[^0-9]/g) or (parseInt value, 10) + '' isnt value
      return false
    return true

  # ===== saveTabId =====
  getSaveTabId: ->
    return @_getValue 'saveTabId'

  setSaveTabId: (value) ->
    @_setValue 'saveTabId', value
    return

  # ===== enabledNiconama =====
  getEnabledNiconamaSettings: ->
    return @_getSettingsValue 'enabledNiconama'

  isNiconamaEnabled: (key) ->
    return @getEnabledNiconamaSettings()[key]

  setEnabledNiconamaSettings: (key, value) ->
    @getEnabledNiconamaSettings()[key] = !!value
    return

  # ===== niconamaUpdateIntervalSec =====
  getNiconamaUpdateIntervalSec: ->
    return @_getSettingsValue 'niconamaUpdateIntervalSec'

  setNiconamaUpdateIntervalSec: (value) ->
    unless @_isInt value
      throw Error "Invalid value #{value}"
    @_setSettingsValue 'niconamaUpdateIntervalSec', value
    return

  # ===== badge =====
  getBadgeSettings: ->
    return @_getSettingsValue 'badge'

  getBadgeEnable: (key) ->
    return @getBadgeSettings()[key].enable

  setBadgeEnable: (key, value) ->
    if not value or not value in bg.Config.BADGE_ENABLE_VALUES
      throw Error "Invalid value #{value}"
    @getBadgeSettings()[key].enable = value
    return

  isBeforeBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'before'

  isGateBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'gate'

  isOnairBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'onair'

  getBadgeBeforeTimeSec: (key) ->
    return @getBadgeSettings()[key].beforeTimeSec

  setBadgeBeforeTimeSec: (key, value) ->
    unless @_isInt value
      throw Error "Invalid value #{value}"
    @getBadgeSettings()[key].beforeTimeSec = value
    return

  # ===== notification =====
  getNotificationSettings: ->
    return @_getSettingsValue 'notification'

  getNotificationEnable: (key) ->
    return @getNotificationSettings()[key].enable

  setNotificationEnable: (key, value) ->
    if not value or not value in bg.Config.BADGE_ENABLE_VALUES
      throw Error "Invalid value #{value}"
    @getNotificationSettings()[key].enable = value
    return

  isBeforeNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'before'

  isGateNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'gate'

  isOnairNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'onair'

  getNotificationBeforeTimeSec: (key) ->
    return @getNotificationSettings()[key].beforeTimeSec

  # ===== opentab =====
  getOpentabSettings: ->
    return @_getSettingsValue 'opentab'

  getOpentabEnable: (key) ->
    return @getOpentabSettings()[key].enable

  setOpentabEnable: (key, value) ->
    if not value or not value in bg.Config.BADGE_ENABLE_VALUES
      throw Error "Invalid value #{value}"
    @getOpentabSettings()[key].enable = value
    return

  isBeforeOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'before'

  isGateOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'gate'

  isOnairOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'onair'

  getOpentabBeforeTimeSec: (key) ->
    return @getOpentabSettings()[key].beforeTimeSec

  isRuleBlackList: ->
    rule = @getOpentabSettings()['rule']
    return not rule or rule is 'blacklist'

  isRuleWhiteList: ->
    rule = @getOpentabSettings()['rule']
    return not rule or rule is 'whitelist'

  setRule: (rule) ->
    LOGGER.info "[Config] Reset opentabStatus: rule=#{rule}"
    unless rule in  ['blacklist', 'whitelist']
      throw Error "Invalid rule: #{rule}"
    if @getOpentabSettings()['rule'] isnt rule
      @opentabStatus = {}
    @getOpentabSettings()['rule'] = rule
    return

  getBlackList: ->
    return @getOpentabSettings()['blacklist'] or []

  getWhiteList: ->
    return @getOpentabSettings()['whitelist'] or []

  setBlackList: (list) ->
    if ($.type list) isnt 'array'
      throw Error "Invalid list #{list}"
    @getOpentabSettings()['blacklist'] = list
    return

  setWhiteList: (list) ->
    if ($.type list) isnt 'array'
      throw Error "Invalid list #{list}"
    @getOpentabSettings()['whitelist'] = list
    return

  isOpentabEnable: (commuId) ->
    return (@getOpentabStatus commuId) in ['enable', 'tempEnable']

  getOpentabStatus: (commuId) ->
    if @isRuleBlackList()
      st = @opentabStatus[commuId]
      unless st
        if commuId in @getBlackList()
          st = 'disable'
        else
          st = 'enable'
    else
      st = @opentabStatus[commuId]
      unless st
        if commuId in @getWhiteList()
          st = 'enable'
        else
          st = 'disable'
    if status in ['enable', 'disable']
      delete @opentabStatus[commuId]
    return st

  setOpentabStatus: (commuId, status) ->
    if status in ['enable', 'disable']
      delete @opentabStatus[commuId]
    else
      @opentabStatus[commuId] = status
    save = false
    if @isRuleBlackList()
      if status in ['disable', 'tempEnable']
        save = @addOpentabBlackList commuId
      else
        save = @removeOpentabBlackList commuId
    else
      if status in ['enable', 'tempDisable']
        save = @addOpentabWhiteList commuId
      else
        save = @removeOpentabWhiteList commuId
    @save() if save
    return

  addOpentabBlackList: (commuId) ->
    list = @getBlackList()
    return false if commuId in list
    list.push commuId
    return true

  addOpentabWhiteList: (commuId) ->
    list = @getWhiteList()
    return false if commuId in list
    list.push commuId
    return true

  removeOpentabBlackList: (commuId) ->
    list = @getBlackList()
    idx = list.indexOf commuId
    return false if idx < 0
    list.splice idx, 1
    return true

  removeOpentabWhiteList: (commuId) ->
    list = @getWhiteList()
    idx = list.indexOf commuId
    return false if idx < 0
    list.splice idx, 1
    return true

  # ===== Auto jump =====
  getEnableAutoJump: ->
    return @_getSettingsFlag 'enableAutoJump'

  setEnableAutoJump: (value) ->
    @_setSettingsFlag 'enableAutoJump', value
    return

  getAutoJumpIntervalSec: ->
    return @_getSettingsValue 'autoJumpIntervalSec', 20

  setAutoJumpIntervalSec: (value) ->
    unless @_isInt value
      throw Error "Invalid value #{value}"
    value = parseInt value, 10
    @_setSettingsValue 'autoJumpIntervalSec', value
    return

  # ===== Auto enter =====
  getEnableAutoEnter: ->
    return @_getSettingsFlag 'enableAutoEnter'

  setEnableAutoEnter: (value) ->
    @_setSettingsFlag 'enableAutoEnter', value
    return

  # ===== Auto jump config =====
  getConfigForAutoJump: ->
    conf =
      enableAutoJump: @getEnableAutoJump()
      autoJumpIntervalSec: @getAutoJumpIntervalSec()
      enableAutoEnter: @getEnableAutoEnter()
      enableHistory: @isNiconamaEnabled 'history'
      isRuleBlackList: @isRuleBlackList()
    LOGGER.log "[Config] Get config for autojump", conf
    return conf


bg.NicoInfo = class NicoInfo
  # === Constructor.
  constructor: (@config) ->
    @liveDataList = [
      new bg.Favorite(@config),
      new bg.Timeshift(@config),
      new bg.Official(@config)
    ]
    @_init()

  _init: ->
    @updateAll true, false
    return

  getLiveData: (key) ->
    for liveData in @liveDataList
      if liveData.id is key
        return liveData
    throw Error "Invalid key #{key}"

  getData: (key) ->
    return @getLiveData(key).data

  getCache: (key) ->
    return @getLiveData(key).cache

  isUpdated: (key, value) ->
    liveData = @getLiveData key
    if value?
      liveData.isUpdated = !!value
    return liveData.isUpdated

  getLastUpdateTime: (key) ->
    try
      return @getLiveData(key).lastUpdateTime

  countBadge: (key) ->
    return @getLiveData(key).countBadge()

  updateAll: (force=false, useCache=true) =>
    for liveData in @liveDataList
      liveData.update force, useCache
    return


bg.LiveChecker = class LiveChecker
  @CHECK_TIMER_INTERVAL_SEC: 30

  # === Constructor.
  constructor: (@config, @nicoInfo) ->
    @badge = new bg.Badge @config, @nicoInfo
    @openTab = new bg.OpenTab @config, @nicoInfo
    @notification = new bg.Notification @config, @nicoInfo
    @_initEventListeners()

  _initEventListeners: ->
    time_msec = bg.LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000
    LOGGER.log "[LiveChecker] Setup check timer", time_msec
    setTimeout @_onTimeoutCheck, time_msec
    return

  _onTimeoutCheck: =>
    LOGGER.log '[LiveChecker] Start live checker process.'
    $.when(
      @badge.run(), @notification.run(), @openTab.run()
    ).always =>
      LOGGER.log '[LiveChecker] End live checker process.'
      time_msec = bg.LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000
      LOGGER.log "[LiveChecker] Setup check timer", time_msec
      setTimeout @_onTimeoutCheck, time_msec
      return
    return

  # === Public methods.
  getNotificationTarget: (index) ->
    return @notification.getTargets index


bg.Badge = class Badge
  @BG_COLOR: [0, 80, 255, 255]
  @BG_COLOR_ERROR: [255, 0, 0, 255]

  # === Constructor.
  constructor: (@config, @nicoInfo) ->
    chrome.browserAction.setBadgeText text: ''

  # === Public methods.
  run: ->
    LOGGER.log '[Badge] Start set badge process.'
    liveDataList = @nicoInfo.liveDataList
    # Check error in live data.
    for liveData in liveDataList
      if liveData.isError
        LOGGER.warn "[Badge] Set error badge #{liveData.id}"
        @_setErrorBadge()
        return
    # Count for badge.
    count = 0
    for liveData in liveDataList
      count += liveData.countBadge()
    # Set badge.
    LOGGER.log "[Badge] Set badge: #{count}"
    @_setBadge count
    LOGGER.log '[Badge] End set badge process.'
    return

  # === Helper methods.
  _setBadge: (text='') ->
    text += ''
    chrome.browserAction.setBadgeBackgroundColor color: bg.Badge.BG_COLOR
    chrome.browserAction.setBadgeText text: text
    return

  _setErrorBadge: ->
    chrome.browserAction.setBadgeBackgroundColor color: bg.Badge.BG_COLOR_ERROR
    chrome.browserAction.setBadgeText text: '' + 'x'
    return


bg.OpenTab = class OpenTab
  # === Constructor.
  constructor: (@config, @nicoInfo) ->
    # === Properties.
    # lv1234567890: [ 'before', 'gate', 'onair' ]
    @history = {}
    @defer = null

  # === Public methods.
  run: ->
    LOGGER.log '[OpenTab] Start open tabs process.'
    @defer = $.Deferred()
    @_openTabs @_getTargets()
    return @defer.promise()

  # === Helper methods.
  _getTargets: ->
    liveDataList = @nicoInfo.liveDataList
    openTabTargets = []
    for liveData in liveDataList
      n = liveData.getNofications()
      # LOGGER.log "Open tab #{liveData.id}", n
      isBeforeEnabled = @config.isBeforeOpentabEnabled liveData.id
      isGateEnabled = @config.isGateOpentabEnabled liveData.id
      isOnairEnabled = @config.isOnairOpentabEnabled liveData.id
      if isBeforeEnabled
        for item in n.before
          continue if item.commuId and not @config.isOpentabEnable item.commuId
          if @history[item.id]
            unless 'before' in @history[item.id]
              @history[item.id].push 'before'
            continue
          @history[item.id] = []
          @history[item.id].push 'before'
          openTabTargets.push item.link
      if isBeforeEnabled or isGateEnabled
        for item in n.gate
          continue if item.commuId and not @config.isOpentabEnable item.commuId
          if @history[item.id]
            unless 'gate' in @history[item.id]
              @history[item.id].push 'gate'
            continue
          @history[item.id] = []
          @history[item.id].push 'gate'
          openTabTargets.push item.link
      if isBeforeEnabled or isGateEnabled or isOnairEnabled
        for item in n.onair
          continue if item.commuId and not @config.isOpentabEnable item.commuId
          if @history[item.id]
            unless 'onair' in @history[item.id]
              @history[item.id].push 'onair'
            continue
          @history[item.id] = []
          @history[item.id].push 'onair'
          openTabTargets.push item.link
    # TODO Remove unnecessary history.
    if openTabTargets.length > 0
      LOGGER.info "[OpenTab] Total open tab: #{openTabTargets.length}"
      LOGGER.log openTabTargets
    return openTabTargets

  _openTabs: (targets) ->
    n = targets.length
    tryNext = (index) =>
      if index >= n
        LOGGER.log '[OpenTab] End open tabs process.'
        @defer.resolve()
        targets = null
        index = null
        n = null
        tryNext = null
        return
      chrome.tabs.query {}, (tabs) =>
        try
          target = targets[index]
          if @_openTab target, tabs
            LOGGER.log "[OpenTab] Open tab: #{index} - #{target}"
          else
            LOGGER.info "[OpenTab] Cancel open tab (already opened): #{index} - #{target}"
          tryNext index + 1
        catch error
          LOGGER.error "[OpenTab] Catch error in _openTabs.", error
          LOGGER.error error.stack if error.stack
          @defer.reject()
        index = null
        return
      return
    tryNext 0
    return

  _openTab: (url, tabs) ->
    matchUrl = url.replace(/http[s]?:\/\//, '').replace(/\?.*/, '')
    re = new RegExp matchUrl
    for tab in tabs
      if tab.url?.match re
        # Already opened.
        return false
    chrome.tabs.create(
      url: url
      active: false
    )
    return true


bg.Notification = class Notification
  @NOTIFICATION_TIMEOUT_SEC: 3.5
  @NOTIFICATION_NEW_VER_TIMEOUT_SEC: 4
  # @NOTIFICATION_URL: "chrome-extension://#{location.host}/html/notification.html#"
  @NOTIFICATION_URL: (chrome.extension.getURL 'html/notification.html') + '#'

  # === Constructor.
  constructor: (@config, @nicoInfo) ->
    # === Properties.
    # lv1234567890: [ 'before', 'gate', 'onair' ]
    @history = {}
    @targets = null
    @index = 0
    @ntf = null
    @ntfId = null
    @cancelTimer = null
    @isSupportedWebkitNotifications = null
    if exports.webkitNotifications?.createHTMLNotification
      # Old webkitnotifications.
      LOGGER.info '[Notification] Notifications (webkitNotifications) are supported!'
      @isSupportedWebkitNotifications = true
    else if chrome.notifications
      # New chrome.notifications
      LOGGER.info '[Notification] Notifications (chrome.notifications) are supported!'
      @isSupportedWebkitNotifications = false
      # onClosed
      chrome.notifications.onClosed.addListener @_onClosedNotificationNewVer
      # onClicked
      chrome.notifications.onClicked.addListener @_onClickedNotificationNewVer
    else
      LOGGER.error '[Notification] Notifications are not supported for this Browser/OS version.'

  # === Public methods.
  run: ->
    LOGGER.log '[Notification] Start notification process.'
    try
      @defer = $.Deferred()
      unless @isSupportedWebkitNotifications?
        throw Error "Notifications are not supported."
      @_makeTargets()
      @_notify()
    catch error
      @targets = null
      @defer.reject()
      LOGGER.error '[Notification] error in run.', error
    return @defer.promise()

  getTargets: (index) ->
    if not @targets or @targets.length <= index
      throw Error "invalid index #{index}"
    return @targets[index]

  # === Helper methods.
  _makeTargets: ->
    if @targets
      LOGGER.info '[Notification] Cancel notification (now notifying)'
      return
    @targets = []
    liveDataList = @nicoInfo.liveDataList
    for liveData in liveDataList
      n = liveData.getNofications()
      # LOGGER.log "[Notification] Create notify data #{liveData.id}", n
      isBeforeEnabled = @config.isBeforeNotificationEnabled liveData.id
      isGateEnabled = @config.isGateNotificationEnabled liveData.id
      isOnairEnabled = @config.isOnairNotificationEnabled liveData.id
      if isBeforeEnabled
        for item in n.before
          if @history[item.id]
            unless 'before' in @history[item.id]
              @history[item.id].push 'before'
            continue
          @history[item.id] = []
          @history[item.id].push 'before'
          @targets.push item
      if isBeforeEnabled or isGateEnabled
        for item in n.gate
          if @history[item.id]
            unless 'gate' in @history[item.id]
              @history[item.id].push 'gate'
            continue
          @history[item.id] = []
          @history[item.id].push 'gate'
          @targets.push item
      if isBeforeEnabled or isGateEnabled or isOnairEnabled
        for item in n.onair
          if @history[item.id]
            unless 'onair' in @history[item.id]
              @history[item.id].push 'onair'
            continue
          @history[item.id] = []
          @history[item.id].push 'onair'
          @targets.push item
    # TODO Remove unnecessary history.
    if @targets.length > 0
      LOGGER.info "[Notification] Total notifications: #{@targets.length}"
      LOGGER.log @targets
    return

  _notify: ->
    if not @targets or @index >= @targets.length
      LOGGER.log '[Notification] End notification process.'
      t = @targets
      @_clean()
      @defer.resolve t
      return
    if @isSupportedWebkitNotifications
      @_notifyWithHtml()
    else
      @_notifyNewVersion()
    return

  ## Notification for new version.
  _notifyNewVersion: ->
    target = @targets[@index]
    # Creaate message.
    message = @_createMessageForNewVer target
    opt =
      type: 'basic'
      title: target.title
      message: message
      iconUrl: target.thumnail
    chrome.notifications.create '', opt, @_onCreateNotificationNewVer
    return

  _onCreateNotificationNewVer: (notificationId) =>
    unless notificationId
      LOGGER.error "[Notification] Notification create error (notificationId is null)", @targets[@index]
      @_onClosedNotificationNewVer()
      return
    @ntfId = notificationId
    @cancelTimer = setTimeout(=>
      @cancelTimer = null
      chrome.notifications.clear notificationId, (wasCleared) =>
        unless wasCleared
          LOGGER.error "[Notification] Notification clear failed (wasCleared is false)", @targets[@index]
        return
      notificationId = null
      return
    , bg.Notification.NOTIFICATION_NEW_VER_TIMEOUT_SEC * 1000)
    return

  _onClosedNotificationNewVer: (notificationId, byUser) =>
    if @cancelTimer
      clearTimeout @cancelTimer
      @cancelTimer = null
    @index += 1
    @_notify()
    return

  _onClickedNotificationNewVer: (notificationId) =>
    chrome.tabs.create(
      url: @targets[@index].link
      active: true
    )
    return

  _createMessageForNewVer: (target) ->
    msg = ''
    now = Date.now()
    timeMsg = common.notification.timeMsg target.openTime, target.startTime
    if timeMsg.openTime
      msg += timeMsg.openTime
    if timeMsg.startTime
      if timeMsg.openTime
        msg += '\n'
      msg += timeMsg.startTime
    statusMsg = common.notification.statusMsg(
      target.openTime, target.startTime, target.endTime, now
    )
    if statusMsg.text
      msg += "\n<<#{statusMsg.text}>>"
    return msg

  ## Notification for webkit HTML notification.
  _notifyWithHtml: ->
    url = bg.Notification.NOTIFICATION_URL + @index
    LOGGER.log "[Notification] Notify(html) #{url}\n", @targets[@index]
    @ntf = webkitNotifications.createHTMLNotification url
    @ntf.ondisplay = @_ondisplayNotification
    @ntf.onclose = @_oncloseNotification
    @ntf.onerror = @_onerrorNotification
    @ntf.show()
    return

  _ondisplayNotification: (event) =>
    # event.curentTarget
    @cancelTimer = setTimeout =>
      @cancelTimer = null
      @ntf.cancel() if @ntf
      event = null
      return
    , bg.Notification.NOTIFICATION_TIMEOUT_SEC * 1000
    return

  _oncloseNotification: (event) =>
    if @cancelTimer
      clearTimeout @cancelTimer
      @cancelTimer = null
    @index += 1
    @_notify()
    return

  _onerrorNotification: (event) =>
    LOGGER.error "[Notification] Notification error index=#{@index}", @targets
    t = @targets[@index]
    @_clean()
    @defer.reject t
    return

  _notifySimply: (id, iconUrl, title, msg)->
    LOGGER.log "[Notification] Notify #{id}\n[#{title}] #{msg}\n#{iconUrl}"
    webkitNotifications.createNotification(iconUrl, title, msg).show()
    return

  _clean: ->
    @targets = null
    @index = 0
    @ntf = null
    @ntfId = null
    @cancelTimer = null
    return


bg.BaseLiveData = class BaseLiveData
  @OFFICIAL_LIVE_RSS: 'http://live.nicovideo.jp/rss'
  @OFFICIAL_LIVE_COMINGSOON: 'http://live.nicovideo.jp/api/getindexzerostreamlist?status=comingsoon&zpage='
  @OFFICIAL_LIVE_RANK: 'http://live.nicovideo.jp/ranking?type=onair&main_provider_type=official'
  @LIVE_URL: 'http://live.nicovideo.jp/watch/'

  # === Constructor.
  constructor: (@id, @config) ->
    # === Properties.
    @data = null
    @cache = null
    @isUpdated = false
    @lastUpdateTime = null
    @isError = false
    @isUpdateRunning = false
    @updateTimer = null
    # === Event.
    @_initEventListeners()

  # === Event Listeners.
  _initEventListeners: ->
    LOGGER.log "[BaseLiveData] Setup update timer #{@id}", @getUpdateInterval()
    @updateTimer = setTimeout @_onTimeoutUpdate, @getUpdateInterval()
    return

  _onTimeoutUpdate: =>
    @update()
    LOGGER.log "[BaseLiveData] Setup update timer #{@id}", @getUpdateInterval()
    @updateTimer = setTimeout @_onTimeoutUpdate, @getUpdateInterval()
    return


  # === Public methods.
  getUpdateInterval: ->
    return @config.getNiconamaUpdateIntervalSec() * 1000

  ## Common update method.
  update: (force=false, useCache=true) =>
    if not force and @isUpdateRunning
      LOGGER.warn "[BaseLiveData] Cancel update so it's already running #{@id}"
      return false
    unless useCache
      LOGGER.log "[BaseLiveData] Clear cache #{@id}"
      @cache = null
      @data = null
    try
      @isUpdateRunning = true
      @updateData()
    catch error
      @updateError '[BaseLiveData] Catch error in update', error
      return false
    return true

  ## Update method for override.
  updateData: ->
    return

  getValidData: ->
    if @cache
      return @cache
    else if @data
      return @data
    else
      return []

  fetchError: (msg) ->
    return (response) =>
      @updateError "Fetch error: #{msg}", response
      msg = null
      return

  updateError: (msg, obj=null) ->
    @isUpdateRunning = false
    @isError = true
    errmsg = "[BaseLiveData][#{@id}] Update error: #{msg} (#{new Date})"
    if obj
      LOGGER.error errmsg, obj
    else
      LOGGER.error errmsg
    LOGGER.error msg.stack if msg.stack
    LOGGER.error obj.stack if obj.stack
    return

  updateComplete: (results) =>
    @data = null
    @cache = results
    @isUpdateRunning = false
    @isUpdated = true
    @isError = false
    @lastUpdateTime = new Date
    LOGGER.info "===== Update #{@id} complete: #{@lastUpdateTime} ====="
    LOGGER.log results
    return

  countBadge: ->
    time = @config.getBadgeBeforeTimeSec @id
    notifications = @getNofications time
    beforeCount = notifications.before.length
    gateCount = notifications.gate.length
    onairCount = notifications.onair.length
    count = 0
    if @config.isBeforeBadgeEnabled @id
      count = beforeCount + gateCount + onairCount
      LOGGER.log "[BaseLiveData] Count badge before open gate: #{@id} = #{count}"
    else if @config.isGateBadgeEnabled @id
      count = gateCount + onairCount
      LOGGER.log "[BaseLiveData] Count badge open gate: #{@id} = #{count}"
    else if @config.isOnairBadgeEnabled @id
      count = onairCount
      LOGGER.log "[BaseLiveData] Count badge onair: #{@id} = #{count}"
    return count

  # return
  # {
  #   before: []
  #   gate: []
  #   onair: []
  # }
  getNofications: (beforeTimeSec=null) ->
    unless beforeTimeSec?
      beforeTimeSec = @config.getNotificationBeforeTimeSec @id
    items = @getValidData()
    results = {before:[], gate: [], onair: []}
    if items.length is 0
      LOGGER.log "[BaseLiveData] No data #{@id} for notification"
      return results
    now = (new Date).getTime()
    for item in items
      if @isLiveOnair item, now
        results.onair.push item
      else if @isLiveOpenGate item, now
        results.gate.push item
      else if @isLiveBeforeOpenGate item, now, beforeTimeSec
        results.before.push item
    return results

  isLiveOnair: (item, now) ->
    return false if @isLiveClosed item, now
    startTime = item.startTime?.getTime()
    if startTime
      # on-air
      return true if now > startTime
    return false

  isLiveOpenGate: (item, now) ->
    return false if @isLiveClosed item, now
    return true if @isLiveOnair item, now
    openTime = item.openTime?.getTime()
    # open gate
    return true if openTime and now > openTime
    return false

  isLiveBeforeOpenGate: (item, now, beforeTimeSec) ->
    return false if @isLiveClosed item, now
    return true if @isLiveOpenGate item, now
    openTime = item.openTime?.getTime()
    # before open gate
    return true if openTime and now > openTime - beforeTimeSec * 1000
    return false

  isLiveClosed: (item, now) ->
    endTime = item.endTime?.getTime()
    if endTime and now > endTime
      # closed
      return true
    return false


bg.DetailFetcher = class DetailFetcher
  @GATE_URL: 'http://live.nicovideo.jp/gate/'

  # === Constructor.
  constructor: (@id, @data, @cache, opt) ->
    @defer = null
    @index = 0
    @fetchIntervalSec = 3
    @isCancelFunc = null
    if opt
      @fetchIntervalSec = opt.fetchIntervalSec or @fetchIntervalSec
      @isCancelFunc = opt.isCancelFunc

  _clean: ->
    @id = null
    @data = null
    @cache = null
    @isCancelFunc = null

  @fetch: (id, data, cache, opt) ->
    return (new bg.DetailFetcher id, data, cache, opt).fetch()

  fetch: ->
    LOGGER.log "[DetailFetcher][#{@id}] Start fetch detail process."
    try
      @defer = $.Deferred()
      @_fetchDetail()
    catch error
      @defer.reject()
      LOGGER.error "[DetailFetcher][#{@id}] error in fetch.", error
    return @defer.promise()

  _fetchDetail: ->
    if not @data or @index >= @data.length
      @defer.resolve @data
      @_clean()
      return
    now = Date.now()
    for nextIndex in [@index..@data.length-1]
      @index = nextIndex
      item = @data[@index]
      useCache = @_setFromCache item, @cache
      if @_isCancel item, now
        continue
      if useCache
        LOGGER.warn "[DetailFetcher][#{@id}] Fetch detail" +
          " (with cache) #{@index}", item.link
      else
        LOGGER.info "[DetailFetcher][#{@id}] Fetch detail" +
          " (no cache) #{@index}\n", item.link, item.startTime, item.openTime, item.endTime
      setTimeout @_onTimeout, @fetchIntervalSec * 1000
      return
    @defer.resolve @data
    @_clean()
    return

  ## Check if cancel fetching detail data.
  _isCancel: (item, now) ->
    ret = @_isCancelForCommon item, now
    if @isCancelFunc
      ret = @isCancelFunc item, now, ret
      if ret
        LOGGER.log "[DetailFetcher][#{@id}] Cancel fetch detail #{@index} (isCancelFunc)", item
    return ret

  _isCancelForCommon: (item, now)->
    if item.flag and item.flag is 'disable'
      LOGGER.log "[DetailFetcher][#{@id}]  Cancel fetch detail #{@index} (disable)", item
      return true
    else if item.openTime and item.startTime
      if item.endTime
        LOGGER.log "[DetailFetcher][#{@id}]  Cancel fetch detail #{@index} (all times exists)", item
        return true
      else
        if now < item.startTime.getTime()
          LOGGER.log "[DetailFetcher][#{@id}]  Cancel fetch detail #{@index}" +
            "(endTime not exists but not starts yet)", item
          return true
    return false

  _onTimeout: =>
    common.AjaxEx.ajax(
      url: bg.DetailFetcher.GATE_URL + @data[@index].id
    ).done(@_onDone).fail(@_onFail)
    return

  _onDone: (response) =>
    try
      item = @data[@index]
      @_setFromResponse item, response
      LOGGER.log "[DetailFetcher][#{@id}] Fetch detail #{@index} done: #{new Date}", item
      unless item and item.thumnail and item.description
        LOGGER.error "[DetailFetcher][#{@id}] Data is incomplete!!", item
      @defer.notify @index, item
      @index += 1
      @_fetchDetail()
    catch error
      LOGGER.error "[DetailFetcher][#{@id}] Catch error in _onDone", error
      @defer.reject error
      @_clean()
    return

  _onFail: (response) =>
    LOGGER.error "[DetailFetcher][#{@id}] Fail in AjaxEx id=#{@data[@index].id}", response
    @defer.reject response
    @_clean()
    return

  _setFromCache: (data, cache) ->
    return false unless cache
    for c in cache
      if c.id is data.id
        data.openTime or= c.openTime if c.openTime
        data.startTime or= c.startTime if c.startTime
        data.endTime or= c.endTime if c.endTime
        data.thumnail or= c.thumnail if c.thumnail
        data.description or= c.description if c.description
        LOGGER.log "[DetailFetcher][#{@id}] Use cache", data
        return true
    return false

  _setFromResponse: (data, response) ->
    $page = $($.parseHTML (common.transIMG response))
    commuUrl = $page.find('.com,.chan .smn a').prop('href')
    if commuUrl
      data.commuId = commuUrl.match(/\/((ch|co)\d+)/)?[1]
    else
      LOGGER.log "[DetailFetcher][#{@id}] Could not get commuUrl", data
    if not data.openTime or not data.startTime
      time = $page.find('#bn_gbox .kaijo').text().trim()
      timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/
      if timeMatch
        yearStr = timeMatch[1]
        dateStr = timeMatch[2]
        openTimeStr = timeMatch[3]
        startTimeStr = timeMatch[4]
        data.openTime or= common.str2date yearStr, dateStr, openTimeStr
        data.startTime or= common.str2date yearStr, dateStr, startTimeStr

    data.thumnail or= $page.find('#bn_gbox > .bn > meta').attr 'content'

    unless data.description
      data.description = $page.find('.stream_description')
        .text().trim().replace(/\r\n?/g, '\n').replace /\n/g,' '

    unless data.endTime
      endTimeMatch = $page.find('#bn_gbox .kaijo').next().text()
        .match /この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/
      if endTimeMatch
        endYearStr = endTimeMatch[1]
        endDateStr = endTimeMatch[2]
        endTimeStr = endTimeMatch[3]
        data.endTime = common.str2date endYearStr, endDateStr, endTimeStr
    return


# TODO クラス化したほうがいいかも
# class LiveItem


bg.MyPage = class MyPage
  @URL: 'http://live.nicovideo.jp/my'
  @TIMER_INTERVAL_SEC: 90
  @RETRY_INTERVAL_SEC: 10

  cache: null
  updatedAt: null
  timer: null

  constructor: ->
    @defer = null

  @fetch: (nocache=false) ->
    return (new bg.MyPage).fetch(nocache)

  fetch: (nocache=false)->
    LOGGER.log "[MyPage] Start fetch process."
    @defer = $.Deferred()
    @_fetchFromMypage nocache
    return @defer.promise()

  _setCache: (cache) ->
    bg.MyPage::cache = cache
    return

  _setUpdatedAt: (updatedAt) ->
    bg.MyPage::updatedAt = updatedAt
    return

  _setTimer: (timer) ->
    bg.MyPage::timer = timer
    return

  _fetchFromMypage: (nocache)->
    if nocache or not @cache
      LOGGER.log "[MyPage] Fetch from mypage: now = #{new Date}"
      common.AjaxEx.ajax(url: bg.MyPage.URL).done(@_onDone).fail(@_onFail)
    else
      LOGGER.log "[MyPage] Fetch from cache: now = #{new Date}"
      setTimeout =>
        @_resolve()
        @_clean()
        return
      , 0
    return

  _onDone: (response) =>
    try
      $page = $($.parseHTML (common.transIMG response))
      error = @_checkErrorPage $page
      if error
        @_reject error
      else
        @_setCache $page
        @_setUpdatedAt new Date
        LOGGER.info "[MyPage] Update cache: #{updatedAt = @updatedAt}"
        @_resolve()
    catch error
      @_reject error
    @_clean()
    return

  _onFail: (response) =>
    e = Error '[MyPage] Error in AjaxEx'
    e.response = response
    @defer.reject @cache, @updatedAt, e
    @_clean()
    return

  _resolve: ->
    @defer.resolve @cache, @updatedAt
    return

  _reject: (error) ->
    @defer.reject @cache, @updatedAt, error
    return

  _clean: ->
    @defer = null
    @_setupUpdateTimer bg.MyPage.TIMER_INTERVAL_SEC * 1000
    LOGGER.log "[MyPage] End fetch process."
    return

  _setupUpdateTimer: (time) ->
    if @timer
      return
    LOGGER.log '[MyPage] Setup update timer:', time
    timer = setTimeout =>
      LOGGER.log "[MyPage] Updating cache..."
      bg.MyPage.fetch(true).done(=>
        LOGGER.log "[MyPage] Updating cache... done"
        @_setTimer null
        @_setupUpdateTimer bg.MyPage.TIMER_INTERVAL_SEC * 1000
        return
      ).fail( =>
        LOGGER.warn "[MyPage] Updating cache... fail"
        @_setTimer null
        @_setupUpdateTimer bg.MyPage.RETRY_INTERVAL_SEC * 1000
        return
      )
      return
    , time
    @_setTimer timer
    time = null
    return

  _checkErrorPage: ($page) ->
    $error_type = $page.find '.error_type'
    return unless $error_type.length
    # $errorBox = $page.find('#Error_Box')
    # msg = $errorBox.text()
    #   .trim()
    #   .replace(/\r\n?/g, '\n').replace(/\n/g,' ')
    #   .replace(/[ \t]+/g,  '')
    # cause = $page.find('#Error_Box .error_type').text()
    cause = $error_type.text()
    unless cause
      LOGGER.error '[MyPage] Unknown cause:', $page.find('html')?.html()
    return Error cause


bg.Favorite = class Favorite extends bg.BaseLiveData
  # === Constructor.
  constructor: (config) ->
    super 'favorite', config

  # === Public methods.
  updateData: ->
    @_fetchFromMypage()
    return

  getUpdateInterval: ->
    return 30 * 1000

  # === Helper methods.
  _fetchFromMypage: ->
    LOGGER.log '[Favorite] Start fetch from mypage process.'
    bg.MyPage.fetch().done(@_onDoneFetchMypage).fail(@_onFailFetchMyPage)
    return

  _onDoneFetchMypage: ($page, updatedAt) =>
    try
      LOGGER.log "[Favorite] Fetch mypage done", updatedAt
      results = @_getResultsFromMypage $page
      if not results
        LOGGER.log '[Favorite] No results'
      LOGGER.log '[Favorite] End fetch from mypage process.'
      @updateComplete results
    catch error
      @updateError '[Favorite] Catch error in _fetchFromMypageSuccess', error
    return

  _onFailFetchMyPage: ($page, updatedAt, error) =>
    if $page
      LOGGER.log "[Favorite] Fetch mypage fail", updatedAt, error
      @_onDoneFetchMypage $page, updatedAt
    else
      @updateError "[Favorite] Fetch mypage fail (updated at #{updatedAt})", error
    return

  _getResultsFromMypage: ($page) ->
    $items = $page.find '#Favorite_list .liveItems .liveItem,.liveItem_reserve,.liveItem_ch'
    now = new Date()
    nowYear = now.getFullYear()

    results = []
    for item in $items
      $item = $(item)
      ret = {}
      a = $item.children('a').first()
      ret.link = common.changeGate2Watch (a.attr 'href')
      ret.id = common.getLiveIdFromUrl ret.link
      ret.title = a.attr 'title'
      ret.thumnail = a.children('imgx').first().attr('src').replace /\/s\//, '/'
      ret.commuId = ret.thumnail.match(/\/((ch|co)\d+)/)?[1]
      time = $item.find('.start_time strong')[0].innerHTML.trim()

      timeMatch = time.match /(\d\d\/\d\d).*開場 (\d\d:\d\d) 開演 (\d\d:\d\d)/
      if timeMatch
        openTimeStr = timeMatch[2]
        startTimeStr = timeMatch[3]
      else
        timeMatch = time.match /(\d\d\/\d\d).*(\d\d:\d\d) 開始/
        openTimeStr = null
        startTimeStr = timeMatch[2]

      dateStr = timeMatch[1]

      ret.openTime = common.str2date nowYear, dateStr, openTimeStr if openTimeStr
      ret.startTime = common.str2date nowYear, dateStr, startTimeStr
      ret.description = $item.find('.liveItemTxt > p:nth-of-type(2)')[0].innerHTML
      results.push ret

    results.sort (a, b) ->
      if a.startTime
        at = a.startTime.getTime()
        bt = b.startTime.getTime()
        return -1 if  at < bt
        return 1 if at > bt
      return 0
    return results


bg.Timeshift = class Timeshift extends bg.BaseLiveData
  # === Constructor.
  constructor: (config) ->
    super 'timeshift', config

  # === Public methods.
  updateData: ->
    @_fetchFromMypage()
    return

  # === Helper methods.
  _fetchFromMypage: ->
    LOGGER.log '[Timeshift] Start fetch from mypage process.'
    bg.MyPage.fetch().done(@_onDoneFetchMypage).fail(@_onFailFetchMyPage)
    return

  _onDoneFetchMypage: ($page, updatedAt) =>
    try
      LOGGER.log "[Timeshift] Fetch mypage done", updatedAt
      results = @_getResultsFromMypage $page
      if not results
        LOGGER.log '[Timeshift] No results'
      LOGGER.log '[Timeshift] End fetch from mypage process.'
      bg.DetailFetcher.fetch(
        @id, results, @cache, fetchIntervalSec: 3.5
      ).done(
        @updateComplete
      ).fail(
        @fetchError "from fetch detail"
      )
      @data = results
    catch error
      @updateError '[Timeshift] Catch error in _fetchFromMypageSuccess', error
    return

  _onFailFetchMyPage: ($page, updatedAt, error) =>
    if $page
      LOGGER.log "[Timeshift] Fetch mypage fail", updatedAt, error
      @_onDoneFetchMypage $page, updatedAt
    else
      @updateError "[Timeshift] Fetch mypage fail (#{updatedAt})", error
    return

  _getResultsFromMypage: ($page) ->
    $items = $page.find '#liveItemsWrap .liveItems .column'
    results = []
    for item, i in $items
      $item = $(item)
      ret = {}
      a = $item.find '.name > a'
      ret.link = common.changeGate2Watch (a.attr 'href')
      ret.title = a.attr 'title'
      ret.id = common.getLiveIdFromUrl ret.link

      $status = $item.find '.status .timeshift_watch'
      if $status.length > 0
        status = $status.text().replace(/視聴する/g, '').replace /\s+/g, ' '
        ret.description = "視聴可#{status}"
        ret.flag = 'watch'
      else
        $status = $item.find '.status .timeshift_reservation'
        if $status.length > 0
          ret.description = $status[0].innerHTML.replace /\s+/g, ' '
          ret.flag = 'reservation'
        else
          $status = $item.find '.status .timeshift_disable'
          if $status.length > 0
            ret.description = $status[0].innerHTML.replace /\s+/g, ' '
            ret.flag = 'disable'
          else
            ret.description = '不明'
            ret.flag = 'unknown'
      results.push ret
    return results


bg.Official = class Official extends bg.BaseLiveData
  constructor: (config) ->
    super 'official', config

  updateData: ->
    @_fetchFromRank()
    return

  _fetchFromRank: ->
    LOGGER.log '[Official] Start fetch from Rank.'
    common.AjaxEx.ajax(
      url: bg.BaseLiveData.OFFICIAL_LIVE_RANK
    ).done(
      @_fetchFromRankSuccess
    ).fail(
      @fetchError "from rank url=#{bg.BaseLiveData.OFFICIAL_LIVE_RANK}"
    )
    return

  _fetchFromRankSuccess: (response) =>
    try
      $page = $($.parseHTML (common.transIMG response))
      results = @_getResultsFromRank $page
      LOGGER.log '[Official] End fetch from Rank.'
      LOGGER.log '[Official] Start fetch from Commingsoon.'
      @_fetchFromComingsoon 1, results
      @data = results
    catch error
      @updateError '[Official] Error in fetchFromRankSuccess', error
    return

  _getResultsFromRank: ($page) ->
    results = []
    for item in $page.find '#official_ranking_main .ranking_video'
      ret = {}
      $item = $(item)
      ret.id = 'lv' + $item.find('.video_id')[0].innerHTML
      ret.title = $item.find('.video_title')[0].innerHTML
      ret.link = bg.BaseLiveData.LIVE_URL + ret.id
      results.push ret
    return results

  _fetchFromComingsoon: (index, results) ->
    common.AjaxEx.ajax(
      url: bg.BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index,
      type: 'GET',
      dataType: 'json'
    ).done(
      @_fetchFromComingsoonSuccess(index, results)
    ).fail(
      @fetchError "from comingsoon url=#{bg.BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index}"
    )
    return

  _fetchFromComingsoonSuccess: (index, results) ->
    return (response) =>
      try
        streamList = response.reserved_stream_list
        total = response.total
        unless streamList and streamList.length > 0 and index <= total
          @_finishFetchFromComingsoon results
          results = null
          index = null
          return
        @_getResultsFromComingsoon streamList, results
        LOGGER.log "[Official] Fetch official from comingsoon finish #{index}"
        if index >= 30
          LOGGER.warn "[Official] Error in fetch comingsoon: index over #{index}", response
          @_finishFetchFromComingsoon results
          results = null
          index = null
          return
        @_fetchFromComingsoon index + 1, results
      catch error
        @updateError '[Official] Error in fetchFromComingsoonSuccess', error
      results = null
      index = null
      return

  _finishFetchFromComingsoon: (results) ->
    LOGGER.log '[Official] End fetch from Commingsoon.'
    bg.DetailFetcher.fetch(
      @id, results, @cache, isCancelFunc: @_isCancelFethDetail
    ).done(
      @updateComplete
    ).fail(
      @fetchError "from fetch detail"
    )
    # TODO キャッシュがない場合にのみ設定するほうが良いかも
    @data = results
    return

  _getResultsFromComingsoon: (list, results) ->
    for item in list
      ret = {}
      ret.id = 'lv' + item.id
      ret.title = item.title
      ret.link = bg.BaseLiveData.LIVE_URL + ret.id
      ret.thumnail = item.picture_url
      ret.description = item.description
      ret.startTime = new Date item.start_date_timestamp_sec * 1000
      ret.endTime = new Date item.end_date_timestamp_sec * 1000
      ret.playStatus = item.currentstatus
      results.push ret
    results = null
    return

  ## official
  # 1. open/start/end : no
  #    open : no
  # 2. open/start/end : yes (already end or comming soon)
  #    end : no (on-air)
  #    open : no
  _isCancelFethDetail: (item, now, ret) ->
    return true if ret
    if item.startTime
      return true
    return false


bg.History = class History
  @ID: 'history'
  @SAVE_TIMER_SEC: 300
  @MAX_SIZE: 100

  # === Constructor.
  constructor: (@config) ->
    @saveTimer = null
    unless @config.isNiconamaEnabled bg.History.ID
      @_clearHistory()

  # === Public methods.
  saveHistory: (data) ->
    unless @config.isNiconamaEnabled 'history'
      LOGGER.log '[History] Cancel save history (disable)'
      return false
    LOGGER.log "[History] Save history", data
    console.assert data.id, "[History] id does not exist"
    hist = @_getHistory()
    hist[data.id] = data
    @_removeOldHistory hist
    @_setHistory hist
    return true

  getHistories: ->
    return @_sortHistory @_getHistory()

  # === Helper methods.
  _getHistory: ->
    # TODO 履歴が大きくなるようなら、キャッシュを持つようにする
    # キャッシュは一定時間後に解放するようにする
    hist = localStorage.getItem bg.History.ID
    LOGGER.info '[History] First getting history.' unless hist
    LOGGER.log "[History] Get history", hist
    hist = if hist then JSON.parse hist else {}
    return hist

  _setHistory: (hist) ->
    localStorage.setItem bg.History.ID, (JSON.stringify hist)
    LOGGER.log "[History] Saved history"
    return

  _clearHistory: ->
    LOGGER.info '[History] Clear history'
    localStorage.removeItem bg.History.ID
    return

  _sortHistory: (hist) ->
    histories = (item for key, item of hist)
    histories.sort (a, b) ->
      at = a.accessTime
      bt = b.accessTime
      if at and bt
        return -1 if  at > bt
        return 1 if at < bt
      return 0
    return histories

  _removeOldHistory: (hist) ->
    histories = @_sortHistory hist
    over = histories.length - bg.History.MAX_SIZE
    if over <= 0
      LOGGER.log '[History] Need not to remove old history'
      return
    for i in [bg.History.MAX_SIZE..(bg.History.MAX_SIZE + over - 1)]
      id = histories[i].id
      LOGGER.log "[History] Remove history #{id}"
      delete hist[id]
    return


## Main
exports.my_config = new bg.Config
exports.my_history = new bg.History exports.my_config
exports.my_nicoInfo = new bg.NicoInfo exports.my_config
exports.my_liveChecker = new bg.LiveChecker exports.my_config, exports.my_nicoInfo

exports.background = new bg.Background(
  config: new bg.ConfigCommands exports.my_config
  history: new bg.HistoryCommands exports.my_history
)
