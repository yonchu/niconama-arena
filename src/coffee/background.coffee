LOGGER = new Logger

getLiveIdFromUrl = (url) ->
  url.match(/(watch|gate)\/(lv\d+)/)?[2]


changeGate2Watch = (url) ->
  return url.replace(/\?.*/, '').replace /\/gate\//, '/watch/'


str2date = (year, date, time) ->
  # TODO 年をまたぐ場合に対応していない
  sp = date.split '/'
  mm = parseInt sp[0], 10
  dd = parseInt sp[1], 10

  sp = time.split ':'
  hh = parseInt sp[0], 10
  min = parseInt sp[1], 10

  delta = hh - 24
  if delta < 0
    return new Date "#{year}/#{mm}/#{dd} #{hh}:#{min}"

  hh = delta
  d = new Date "#{year}/#{mm}/#{dd} #{hh}:#{min}"
  d.setDate d.getDate() + (Math.floor hh / 24 + 1)
  return d


class Background
  commands:
    'config': null

  constructor: (@config, @history)->
    @commands.config = @config
    @commands.history = @history
    @addEventListeners()

  addEventListeners: ->
    chrome.extension.onRequest.addListener (message, sender, sendResponse) =>
      target = @commands[message.target]
      unless target
        throw new Error "Invalid target #{message.target}"
      res = target[message.action].apply target, message.args
      sendResponse {res: res}
      target = null
    return


class Config
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
      blacklist: ['ch12345,co67890']
      whitelist: []

  constructor: ->
    @initSettings()
    @setSaveTabNum 0 unless @_getValue('saveTabNum')?
    @enableFetchDetail = false


  # ===== localStorage functions =====
  _getValue: (key, def=undefined) ->
    value = localStorage[key]
    console.assert value isnt 'undefined',
      "Error: Unexpected value in localStorage (key=#{key}})"
    return if value? then value else def

  _setValue: (key, value) ->
    console.assert value isnt 'undefined',
      "Error: Unexpected value in localStorage (key=#{key}})"
    if value
      localStorage[key] = value
    else
      localStorage.removeItem(key)
    return


  # ===== Settings functions =====
  initSettings: ->
    settings = localStorage.settings
    if settings
      @settings = JSON.parse settings
    else
      @settings = Config.DEFAULT_SETTINGS
      @saveSettings()
      LOGGER.info 'Save default confing'
    return settings

  saveSettings: ->
    settings = JSON.stringify @settings
    localStorage.settings = settings
    return

  _getSettingsValue: (key, def=undefined) ->
    value = @settings[key]
    console.assert value isnt 'undefined',
      "Error: Unexpected value in settings (key=#{key}})"
    return if value? then value else def

  _setSettingsValue: (key, value) ->
    console.assert value isnt 'undefined',
      "Error: Unexpected value in localStorage (key=#{key}})"
    unless value?
      throw new Error "Error: invalid value #{value}"
    unless @settings[key]?
      throw new Error "Error: invalid key #{key}"
    @settings[key] = value
    return

  _getSettingsFlag: (key) ->
    value = @_getSettingsValue key
    return if value then true else false

  _setSettingsFlag: (key, value) ->
    value = if value then true else false
    @_setSettingsValue key, value
    return


  # ===== Common functions =====
  _isInt: (value) ->
    unless value?
      return false
    value += ''
    if (value.match /[^0-9]/g) or (parseInt value, 10) + '' isnt value
      return false
    return true


  # ===== tabNum =====
  getSaveTabNum: ->
    return @_getValue 'saveTabNum', 0

  setSaveTabNum: (value) ->
    unless @_isInt value
      throw new Error "Error: invalid value #{value}"
    @_setValue 'saveTabNum', value
    return

  # ===== enabledNiconama =====
  getEnabledNiconamaSettings: ->
    return @_getSettingsValue 'enabledNiconama'

  isNiconamaEnabled: (key) ->
    settings = @getEnabledNiconamaSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key]

  setEnabledNiconamaSettings: (key, value) ->
    settings = @getEnabledNiconamaSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    value = if value then true else false
    settings[key] = value
    return

  # ===== niconamaUpdateIntervalSec =====
  getNiconamaUpdateIntervalSec: ->
    return @_getSettingsValue 'niconamaUpdateIntervalSec'

  setNiconamaUpdateIntervalSec: (value) ->
    unless @_isInt value
      throw new Error "Error: invalid value #{value}"
    @_setSettingsValue 'niconamaUpdateIntervalSec', value
    return

  # ===== badge =====
  getBadgeSettings: ->
    return @_getSettingsValue 'badge'

  getBadgeEnable: (key) ->
    settings = @getBadgeSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].enable

  setBadgeEnable: (key, value) ->
    if not value or not value in Config.BADGE_ENABLE_VALUES
      throw new Error "Error: invalid value #{value}"
    settings = @getBadgeSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    settings[key].enable = value
    return

  isBeforeBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'before'

  isGateBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'gate'

  isOnairBadgeEnabled: (key) ->
    return (@getBadgeEnable key) is 'onair'

  getBadgeBeforeTimeSec: (key) ->
    settings = @getBadgeSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].beforeTimeSec

  setBadgeBeforeTimeSec: (key, value) ->
    unless @_isInt value
      throw new Error "Error: invalid value #{value}"
    settings = @getBadgeSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    settings[key].beforeTimeSec = value
    return

  # ===== notification =====
  getNotificationSettings: ->
    return @_getSettingsValue 'notification'

  getNotificationEnable: (key) ->
    settings = @getNotificationSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].enable

  setNotificationEnable: (key, value) ->
    if not value or not value in Config.BADGE_ENABLE_VALUES
      throw new Error "Error: invalid value #{value}"
    settings = @getNotificationSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    settings[key].enable = value
    return

  isBeforeNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'before'

  isGateNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'gate'

  isOnairNotificationEnabled: (key) ->
    return (@getNotificationEnable key) is 'onair'

  getNotificationBeforeTimeSec: (key) ->
    settings = @getNotificationSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].beforeTimeSec

  # ===== opentab =====
  getOpentabSettings: ->
    return @_getSettingsValue 'opentab'

  getOpentabEnable: (key) ->
    settings = @getOpentabSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].enable

  setOpentabEnable: (key, value) ->
    if not value or not value in Config.BADGE_ENABLE_VALUES
      throw new Error "Error: invalid value #{value}"
    settings = @getOpentabSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    settings[key].enable = value
    return

  isBeforeOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'before'

  isGateOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'gate'

  isOnairOpentabEnabled: (key) ->
    return (@getOpentabEnable key) is 'onair'

  getOpentabBeforeTimeSec: (key) ->
    settings = @getOpentabSettings()
    unless settings[key]?
      throw new Error "Error: invalid key #{key}"
    return settings[key].beforeTimeSec

  isRuleBlackList: ->
    settings = @getOpentabSettings()
    rule = settings['rule']
    return true if not rule or rule is 'blacklist'
    return false

  getBlackList: ->
    settings = @getOpentabSettings()
    list = settings['blacklist']
    return [] unless list
    return list

  setBlackList: (list) ->
    if ($.type list) isnt 'array'
      throw new Error "Invalid list #{list}"
    settings = @getOpentabSettings()
    settings['blacklist'] = list
    return


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
      throw new Error "Error: invalid value #{value}"
    value = parseInt value
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
    conf = {}
    conf.enableAutoJump = @getEnableAutoJump()
    conf.autoJumpIntervalSec = @getAutoJumpIntervalSec()
    conf.enableAutoEnter = @getEnableAutoEnter()
    conf.enableHistory = @isNiconamaEnabled 'history'
    LOGGER.info "getConfigForAutoJump", conf
    return conf


class NicoInfo
  liveDataList: []

  constructor: (@config) ->
    @liveDataList.push (new Favorite @config)
    @liveDataList.push (new Timeshift @config)
    @liveDataList.push (new Official @config)
    @addEventListeners()
    @init()

  addEventListeners: ->
    return

  init: ->
    chrome.browserAction.setBadgeText text: ''
    @updateAll true, false
    return

  getLiveData: (key) ->
    for liveData in @liveDataList
      if liveData.id is key
        return liveData
    throw new Error "Error: invalid key #{key}"

  getData: (key) ->
    return @getLiveData(key).data

  getCache: (key) ->
    return @getLiveData(key).cache

  isUpdated: (key, value) ->
    liveData = @getLiveData key
    if value?
      liveData.isUpdated = value
    return liveData.isUpdated

  getLasetUpdateTime: (key) ->
    try
      return @getLiveData(key).lastUpdateTime

  countBadge: (key) ->
    return @getLiveData(key).countBadge()

  # ===== Update =====
  updateAll: (force=false, useCache=true) =>
    for liveData in @liveDataList
      liveData.update force, useCache
    return


class LiveChecker
  # TODO 要調整
  @CHECK_TIMER_INTERVAL_SEC: 120
  @NOTIFICATION_TIMEOUT_SEC: 3.5
  # @NOTIFICATION_URL: "chrome-extension://#{location.host}/html/notification.html#"
  @NOTIFICATION_URL: (chrome.extension.getURL 'html/notification.html') + '#'

  notificationTargets: null
  # lv1234567890: [ 'before', 'gate', 'onair' ]
  notificationHistory: {}
  openTabHistory: {}

  deferNotification: null
  deferOpenTab: null

  constructor: (@config, @nicoInfo) ->
    @addEventListeners()

  addEventListeners: ->
    setTimeout @onTimeoutCheck,
      LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000
    return

  getNotificationTarget: (index) ->
    if not @notificationTargets or @notificationTargets.length <= index
      throw new Error "Error: invalid index #{index}"
    return @notificationTargets[index]

  # ===== Check =====
  onTimeoutCheck: =>
    $.when(
      @setBadge()
      ,( =>
        # Notify.
        LOGGER.log 'Start notification process.'
        try
          @deferNotification = $.Deferred()
          @setNotificationTargets()
          @showHtmlNotifications()
        catch error
          @notificationTargets = null
          throw error
        return @deferNotification.promise()
      )()
      ,( =>
        # Open tabs.
        LOGGER.log 'Start open tabs process.'
        @deferOpenTab = $.Deferred()
        @openTabs @getOpenTabTargets()
        return @deferOpenTab.promise()
      )()
    ).always =>
      LOGGER.log 'Check process finish all.'
      setTimeout @onTimeoutCheck,
        LiveChecker.CHECK_TIMER_INTERVAL_SEC * 1000
    return

  # ===== Badge =====
  setErrorBadge: ->
    chrome.browserAction.setBadgeBackgroundColor color: [255, 0, 0, 255]
    chrome.browserAction.setBadgeText text: '' + 'x'
    return

  setBadge: =>
    LOGGER.log 'Start setBadge process.'
    liveDataList = @nicoInfo.liveDataList
    for liveData in liveDataList
      if liveData.isError
        LOGGER.warn "Set error badge #{liveData.id}"
        @setErrorBadge()
        return
    count = 0
    for liveData in liveDataList
      count += liveData.countBadge()
    LOGGER.log "Set badge: #{count}"
    count or= ''
    chrome.browserAction.setBadgeBackgroundColor color: [0, 80, 255, 255]
    chrome.browserAction.setBadgeText text: '' + count
    liveDataList = null
    return

  # ===== Open tab =====
  getOpenTabTargets: ->
    liveDataList = @nicoInfo.liveDataList
    openTabTargets = []
    blacklist = @config.getBlackList()
    for liveData in liveDataList
      n = liveData.getNofications()
      # LOGGER.log "Open tab #{liveData.id}", n
      isBeforeEnabled = @config.isBeforeOpentabEnabled liveData.id
      isGateEnabled = @config.isGateOpentabEnabled liveData.id
      isOnairEnabled = @config.isOnairOpentabEnabled liveData.id
      if isBeforeEnabled
        for item in n.before
          continue if item.commuId and item.commuId in blacklist
          if @openTabHistory[item.id]
            if 'before' in @openTabHistory[item.id]
              @openTabHistory[item.id].push 'before'
            continue
          @openTabHistory[item.id] = []
          @openTabHistory[item.id].push 'before'
          openTabTargets.push item.link
      if isBeforeEnabled or isGateEnabled
        for item in n.gate
          continue if item.commuId and item.commuId in blacklist
          if @openTabHistory[item.id]
            if 'gate' in @openTabHistory[item.id]
              @openTabHistory[item.id].push 'gate'
            continue
          @openTabHistory[item.id] = []
          @openTabHistory[item.id].push 'gate'
          openTabTargets.push item.link
      if isBeforeEnabled or isGateEnabled or isOnairEnabled
        for item in n.onair
          continue if item.commuId and item.commuId in blacklist
          if @openTabHistory[item.id]
            if 'onair' in @openTabHistory[item.id]
              @openTabHistory[item.id].push 'onair'
            continue
          @openTabHistory[item.id] = []
          @openTabHistory[item.id].push 'onair'
          openTabTargets.push item.link
    # TODO Remove unnecessary history.
    LOGGER.log "Open tab: total #{openTabTargets.length}", openTabTargets
    liveDataList = null
    return openTabTargets

  openTabs: (targets, index=0) ->
    if index >= targets.length
      LOGGER.log "Open tab complete"
      @deferOpenTab.resolve()
      return
    chrome.tabs.query {}, (@onQueryCallback targets, index)
    targets = null
    return

  onQueryCallback: (targets, index=0) ->
    return (result) =>
      try
        target = targets[index]
        matchUrl = targets[index].replace /http[s]?:\/\//, ''
        # re = new RegExp matchUrl
        isOpened = false
        for tab in result
          if tab.url?.match matchUrl
            # Already opened.
            LOGGER.log "Cancel open tab (already opened): #{index} - #{target}"
            isOpened = true
            break
        unless isOpened
          LOGGER.log "Open tab: #{index} - #{target}"
          chrome.tabs.create(
            url: target
            active: false
          )
        @openTabs targets, index + 1
        targets = null
      catch error
        LOGGER.error "Error: Failure in open tab", error
        LOGGER.error error.stack if error.stack
        @deferOpenTab.reject()
      return

  # ===== Notification =====
  setNotificationTargets: ->
    if @notificationTargets
      LOGGER.log 'Cancel notification (now notifying)'
      return
    @notificationTargets = []
    liveDataList = @nicoInfo.liveDataList
    for liveData in liveDataList
      n = liveData.getNofications()
      # LOGGER.log "Create notify data #{liveData.id}", n
      isBeforeEnabled = @config.isBeforeNotificationEnabled liveData.id
      isGateEnabled = @config.isGateNotificationEnabled liveData.id
      isOnairEnabled = @config.isOnairNotificationEnabled liveData.id
      if isBeforeEnabled
        for item in n.before
          @notificationHistory[item.id] or= []
          if 'before' in @notificationHistory[item.id]
            continue
          @notificationTargets.push item
          @notificationHistory[item.id].push 'before'
      if isBeforeEnabled or isGateEnabled
        for item in n.gate
          @notificationHistory[item.id] or= []
          if 'gate' in @notificationHistory[item.id]
            continue
          @notificationTargets.push item
          @notificationHistory[item.id].push 'gate'
      if isBeforeEnabled or isGateEnabled or isOnairEnabled
        for item in n.onair
          @notificationHistory[item.id] or= []
          if 'onair' in @notificationHistory[item.id]
            continue
          @notificationTargets.push item
          @notificationHistory[item.id].push 'onair'
    # TODO Remove unnecessary history.
    LOGGER.log "Notify: total #{@notificationTargets.length}", @notificationTargets
    liveDataList = null
    return

  showHtmlNotifications: (index=0) ->
    if not @notificationTargets or index >= @notificationTargets.length
      LOGGER.log "Notification complete"
      @notificationTargets = null
      @deferNotification.resolve()
      return
    url = LiveChecker.NOTIFICATION_URL + index
    LOGGER.log "Notify(html) #{url}"
    notification = webkitNotifications.createHTMLNotification url
    notification.ondisplay = @ondisplayNotification notification
    notification.onclose = @oncloseNotification notification, index
    notification.onerror = @onerrorNotification notification, index
    notification.show()
    return

  ondisplayNotification: (notification) ->
    return (event) =>
      # event.curentTarget
      setTimeout(
        (@onTimeoutNotification notification),
        LiveChecker.NOTIFICATION_TIMEOUT_SEC * 1000
      )
      notification = null
      return

  onTimeoutNotification: (notification) ->
    return =>
      notification.cancel()
      notification = null
      return

  oncloseNotification: (notification, index) ->
    return (event) =>
      @showHtmlNotifications index + 1
      notification = null
      return

  onerrorNotification: (notification, index) ->
    return (event) =>
      LOGGER.error "Error: notification error index=#{index}"
      @notificationTargets = null
      @deferNotification.reject()
      notification = null
      return

  showNotification: (id, iconUrl, title, msg)->
    LOGGER.log "Notify #{id}"
    LOGGER.log "[#{title}] #{msg}"
    LOGGER.log "#{iconUrl}"
    webkitNotifications.createNotification(iconUrl, title, msg).show()
    return


class AjaxEx
  @RETRY_STATUS: ['0', '500']

  retryCount: 0
  request: null
  defer: null

  constructor: (@retryIntervalSec=5, @maxRetryCount=2) ->

  ajax: (@request) ->
    @defer = $.Deferred()
    $.ajax(@request).then(@_onDone, @_onFail)
    return @defer.promise()

  _onDone: (response) =>
    LOGGER.log "[AjaxEx] Success: #{@request.url}"
    @defer.resolve response
    @_clean()
    return

  _onFail: (response) =>
    try
      @_retry response
    catch error
      LOGGER.error '[AjaxEx] Abort... could not retry', error
      LOGGER.error error.stack if error.stack
      @defer.reject response
      @_clean()
    return

  _retry: (response) ->
    status = response.status + ''
    LOGGER.error "[AjaxEx] Error: retryCount=#{@retryCount}," +
      " status=#{status}, url=#{@request.url}", @request, response
    if @retryCount >= 2
      throw new Error "Max retry count over: retryCount=#{@retryCount}"
    unless status in AjaxEx.RETRY_STATUS
      throw new Error "Unknown status: status=#{status}"
    @retryCount += 1
    LOGGER.info "[AjaxEx] Retry #{@retryCount}"
    @defer.notify @retryCount
    @_sleep(
      @retryIntervalSec
    ).then(=>
      $.ajax(@request).then(@_onDone, @_onFail)
      return
    )
    return

  _sleep: (sec) ->
    d = $.Deferred()
    setTimeout(->
      d.resolve()
      d = null
    , sec * 1000)
    return d.promise()

  _clean: ->
    @request = null
    @defer = null
    return


class BaseLiveData
  @OFFICIAL_LIVE_RSS: 'http://live.nicovideo.jp/rss'
  @OFFICIAL_LIVE_COMINGSOON: 'http://live.nicovideo.jp/api/getindexzerostreamlist?status=comingsoon&zpage='
  @OFFICIAL_LIVE_RANK: 'http://live.nicovideo.jp/ranking?type=onair&main_provider_type=official'
  @LIVE_URL: 'http://live.nicovideo.jp/watch/'
  @GATE_URL: 'http://live.nicovideo.jp/gate/'
  @MY_PAGE_URL: 'http://live.nicovideo.jp/my'

  fetchIntervalSec: 3

  data: null
  cache: null
  isUpdated: false
  lastUpdateTime: null
  isError: false
  isUpdateRunning: false

  updateTimer: null

  constructor: (@id, @config) ->
    @addEventListeners()

  addEventListeners: ->
    @updateTimer = setTimeout @onTimeoutUpdate, @getUpdateInterval()
    return

  onTimeoutUpdate: =>
    @update()
    @updateTimer = setTimeout @onTimeoutUpdate, @getUpdateInterval()
    return

  getUpdateInterval: ->
    return @config.getNiconamaUpdateIntervalSec() * 1000

  update: (force=false, useCache=true) =>
    if not force and @isUpdateRunning
        LOGGER.warn "Cancel update is running #{@id}"
        return false
    unless useCache
      LOGGER.log "Clear cache #{@id}"
      @cache = null
      @data = null
    try
      @isUpdateRunning = true
      @updateData()
    catch error
      @updateError 'Error in update', error
      return false
    return true

  updateData: ->
    return

  fetchDetail: (index, results) ->
    LOGGER.log "Fetch detail #{@id} #{index} "
    if index < results.length
      for nextIndex in [index..results.length-1]
        item = results[nextIndex]
        useCache = @setDataFromCache item, @cache
        if item.flag and item.flag is 'disable'
          LOGGER.log "Cancel fetch detail #{@id} (disable)"
          continue
        if item.startTime and item.endTime
          if item.openTime
            LOGGER.log "Cancel fetch detail #{@id} (openTime exists)"
            continue
          else unless @config.enableFetchDetail
            LOGGER.log "Cancel fetch detail #{@id} (config enableFetchDetail is true)"
            continue
        setTimeout(
          @onTimeoutFetch(
            url: BaseLiveData.GATE_URL + item.id,
            (@fetchDetailSuccess nextIndex, results),
            (@fetchError "from detail id=#{item.id}")
          )
        , @fetchIntervalSec * 1000)
        results = null
        return
    @updateComplete results
    results = null
    return

  onTimeoutFetch: (request, doneFunc, failFunc) ->
    return =>
      ajax = new AjaxEx
      ajax.ajax(request).done(doneFunc).fail(failFunc)
      request = null
      doneFunc = null
      failFunc = null
      ajax = null
      return

  setDataFromCache: (data, cache) ->
    return false unless cache
    for c in cache
      if c.id is data.id
        data.openTime or= c.openTime if c.openTime
        data.startTime or= c.startTime if c.startTime
        data.endTime or= c.endTime if c.endTime
        data.thumnail or= c.thumnail if c.thumnail
        data.description or= c.description if c.description
        LOGGER.log "Use cache #{@id}", data
        return true
    data = null
    cache = null
    return false

  fetchDetailSuccess: (index, results) ->
    return (response) =>
      try
        @setDetailFromResponse results[index], response
        LOGGER.log "Fetch detail #{@id} finish: #{new Date}"
        LOGGER.log results[index]
        @fetchDetail index + 1, results
      catch error
        @updateError 'Error in fetchDetailSuccess', error
      results = null
      return

  setDetailFromResponse: (data, response) ->
    $page = $($.parseHTML (@transIMG response))
    commuUrl = $page.find('.com .smn a').prop('href')
    if commuUrl
      data.commuId = commuUrl.match(/\/((ch|co)\d+)/)?[1]
    if not data.openTime or not data.startTime
      time = $page.find('#bn_gbox .kaijo').text().trim()
      timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/
      if timeMatch
        yearStr = timeMatch[1]
        dateStr = timeMatch[2]
        openTimeStr = timeMatch[3]
        startTimeStr = timeMatch[4]
        data.openTime or= str2date yearStr, dateStr, openTimeStr
        data.startTime or= str2date yearStr, dateStr, startTimeStr

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
        data.endTime = str2date endYearStr, endDateStr, endTimeStr
    data = null
    response = null
    return

  fetchError: (msg) ->
    return (response) =>
        @updateError msg, response
        msg = null
      return

  updateError: (msg, obj=null) ->
    @isUpdateRunning = false
    @isError = true
    errmsg = "Error: update #{@id} #{msg} (#{new Date})"
    if obj
      LOGGER.error errmsg, obj
    else
      LOGGER.error errmsg
    LOGGER.error msg.stack if msg.stack
    LOGGER.error obj.stack if obj.stack

  updateComplete: (results) ->
    @data = null
    @cache = results
    @isUpdateRunning = false
    @isUpdated = true
    @isError = false
    @lastUpdateTime = new Date
    LOGGER.log "===== Update #{@id} complete ====="
    LOGGER.log @lastUpdateTime
    LOGGER.log results
    results = null
    return

  checkErrorPage: ($page) ->
    $error_type = $page.find '.error_type'
    return unless $error_type.length
    # $errorBox = $page.find('#Error_Box')
    # msg = $errorBox.text()
    #   .trim()
    #   .replace(/\r\n?/g, '\n').replace(/\n/g,' ')
    #   .replace(/[ \t]+/g,  '')
    # cause = $page.find('#Error_Box .error_type').text()
    LOGGER.error $page
    cause = $error_type.text()
    throw new Error "Cause: #{cause}"

  getValidData: ->
    if @cache
      return @cache
    else if @data
      return @data
    else
      return []

  countBadge: ->
    time = @config.getBadgeBeforeTimeSec @id
    notifications = @getNofications time
    beforeCount = notifications.before.length
    gateCount = notifications.gate.length
    onairCount = notifications.onair.length
    count = 0
    if @config.isBeforeBadgeEnabled @id
      count = beforeCount + gateCount + onairCount
      LOGGER.log "Count badge before open gate: #{@id} = #{count}"
    else if @config.isGateBadgeEnabled @id
      count = gateCount + onairCount
      LOGGER.log "Count badge open gate: #{@id} = #{count}"
    else if @config.isOnairBadgeEnabled @id
      count = onairCount
      LOGGER.log "Count badge onair: #{@id} = #{count}"
    notifications = null
    return count

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
      LOGGER.log "No notification data #{@id}"
      return results
    now = (new Date).getTime()
    for item in items
      if @isLiveOnair item, now
        results.onair.push item
      else if @isLiveOpenGate item, now
        results.gate.push item
      else if @isLiveBeforeOpenGate item, now, beforeTimeSec
        results.before.push item
    items = null
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
    return true if @isLiveOnair item, now
    openTime = item.openTime?.getTime()
    # before open gate
    return true if openTime and now > openTime - beforeTimeSec
    return false

  isLiveClosed: (item, now) ->
    endTime = item.endTime?.getTime()
    if endTime and now > endTime
      # closed
      return true
    return false

  transIMG: (html) ->
    return html.replace /<img([^>]+)>/g, '<imgx$1>'


# TODO クラス化したほうがいいかも
# class LiveItem


class Favorite extends BaseLiveData
  constructor: (config) ->
    super 'favorite', config

  updateData: ->
    @fetchFromMypage()
    return

  getUpdateInterval: ->
    # TODO 要調整
    return 180 * 1000

  fetchFromMypage: ->
    ajax = new AjaxEx
    ajax.ajax(
      url: BaseLiveData.MY_PAGE_URL
    ).done(
      @fetchFromMypageSuccess
    ).fail(
      @fetchError("from mypage url=#{BaseLiveData.MY_PAGE_URL}")
    )
    ajax = null
    return

  fetchFromMypageSuccess: (response) =>
    try
      $page = $($.parseHTML (@transIMG response))
      results = @getResultsFromMypage $page
      if not results or results.length is 0
        @checkErrorPage $page
        LOGGER.info 'No results', response
      @updateComplete results
    catch error
      @updateError 'Error in fetchFromMypageSuccess', error
    results = null
    return

  getResultsFromMypage: ($page) ->
    $items = $page.find '#Favorite_list .liveItems .liveItem,.liveItem_reserve,.liveItem_ch'
    now = new Date()
    nowYear = now.getFullYear()

    results = []
    for item in $items
      $item = $(item)
      ret = {}
      a = $item.children('a').first()
      ret.link = changeGate2Watch (a.attr 'href')
      ret.id = getLiveIdFromUrl ret.link
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

      ret.openTime = str2date nowYear, dateStr, openTimeStr if openTimeStr
      ret.startTime = str2date nowYear, dateStr, startTimeStr
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


class Timeshift extends BaseLiveData
  constructor: (config) ->
    super 'timeshift', config
    @fetchIntervalSec = 3.5

  updateData: ->
    @fetchFromMypage()
    return

  fetchFromMypage: ->
    ajax = new AjaxEx
    ajax.ajax(
      url: BaseLiveData.MY_PAGE_URL
    ).done(
      @fetchFromMypageSuccess
    ).fail(
      @fetchError("from mypage url=#{BaseLiveData.MY_PAGE_URL}")
    )
    ajax = null
    return

  fetchFromMypageSuccess: (response) =>
    try
      $page = $($.parseHTML (@transIMG response))
      results = @getResultsFromMypage $page
      LOGGER.log "Fetch timeshift from mypage finish"
      if not results or results.length is 0
        @checkErrorPage $page
        LOGGER.info 'No results', response
      @fetchDetail 0, results
      @data = results
      results = null
    catch error
      @updateError 'Error in fetchFromMypageSuccess', error
    return

  getResultsFromMypage: ($page) ->
    $items = $page.find '#liveItemsWrap .liveItems .column'
    results = []
    for item, i in $items
      $item = $(item)
      ret = {}
      a = $item.find '.name > a'
      ret.link = changeGate2Watch (a.attr 'href')
      ret.title = a.attr 'title'
      ret.id = getLiveIdFromUrl ret.link

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


class Official extends BaseLiveData
  constructor: (config) ->
    super 'official', config

  updateData: ->
    @fetchFromRank()
    return

  fetchFromRank: ->
    ajax = new AjaxEx
    ajax.ajax(
      url: BaseLiveData.OFFICIAL_LIVE_RANK
    ).done(
      @fetchFromRankSuccess
    ).fail(
      @fetchError("from rank url=#{BaseLiveData.OFFICIAL_LIVE_RANK}")
    )
    ajax = null
    return

  fetchFromRankSuccess: (response) =>
    try
      $page = $($.parseHTML (@transIMG response))
      results = @getResultsFromRank $page
      LOGGER.log "Fetch official from rank finish"
      @fetchFromComingsoon 1, results
      @data = results
      results = null
    catch error
      @updateError 'Error in fetchFromRankSuccess', error
    return

  getResultsFromRank: ($page) ->
    results = []
    for item in $page.find '#official_ranking_main .ranking_video'
      ret = {}
      $item = $(item)
      ret.id = 'lv' + $item.find('.video_id')[0].innerHTML
      ret.title = $item.find('.video_title')[0].innerHTML
      ret.link = BaseLiveData.LIVE_URL + ret.id
      results.push ret
    return results

  fetchFromComingsoon: (index, results)->
    ajax = new AjaxEx
    ajax.ajax(
      url: BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index,
      type: 'GET',
      dataType: 'json'
    ).done(
      @fetchFromComingsoonSuccess(index, results)
    ).fail(
      @fetchError("from comingsoon url=#{BaseLiveData.OFFICIAL_LIVE_COMINGSOON + index}")
    )
    ajax = null
    results = null
    return

  fetchFromComingsoonSuccess: (index, results)->
    return (response) =>
      try
        json = response.reserved_stream_list
        unless json
          LOGGER.log 'Fetch official from comingsoon finish all'
          @fetchDetail 0, results
          # TODO キャッシュがない場合にのみ設定するほうが良いかも
          @official = results
          results = null
          return
        @getResultsFromComingsoon json, results
        LOGGER.log "Fetch official from comingsoon finish #{index}"
        @fetchFromComingsoon index + 1, results
      catch error
        @updateError 'Error in fetchFromComingsoonSuccess', error
      results = null
      return

  getResultsFromComingsoon: (json, results) ->
    for item in json
      ret = {}
      ret.id = 'lv' + item.id
      ret.title = item.title
      ret.link = BaseLiveData.LIVE_URL + ret.id
      ret.thumnail = item.picture_url
      ret.description = item.description
      ret.startTime = new Date item.start_date_timestamp_sec * 1000
      ret.endTime = new Date item.end_date_timestamp_sec * 1000
      ret.playStatus = item.currentstatus
      results.push ret
    results = null
    return


class History
  @ID: 'history'
  @SAVE_TIMER_SEC: 300
  @MAX_SIZE: 100
  saveTimer: null

  constructor: (@config) ->
    unless @config.isNiconamaEnabled History.ID
      @_clearHistory()

  # TODO 履歴が大きくなるようなら、キャッシュを持つようにする
  # キャッシュがメモリを圧迫する場合があるので、一定時間後に解放するようにする
  _getHistory: ->
    hist = localStorage.getItem History.ID
    LOGGER.log "_getHistory", hist
    if hist
      return (JSON.parse hist)
    else
      LOGGER.info 'First getting history.'
      return {}
    hist = null
    return

  _setHistory: (hist) ->
    localStorage.setItem History.ID, (JSON.stringify hist)
    LOGGER.log "Saved history"
    return

  _clearHistory: ->
    LOGGER.info 'Clear history'
    localStorage.removeItem History.ID
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
    over = histories.length - History.MAX_SIZE
    if over <= 0
      LOGGER.log 'Need not to remove old history'
      return
    for i in [0..over-1]
      id = histories[i].id
      LOGGER.log "Remove history #{id}"
      delete hist[id]
    histories = null
    return

  saveHistory: (data) ->
    unless @config.isNiconamaEnabled 'history'
      LOGGER.log 'Cancel save history (disable)'
      return false
    LOGGER.log "Save history", data
    console.assert data.id, "id does not exist"
    hist = @_getHistory()
    hist[data.id] = data
    @_removeOldHistory hist
    @_setHistory hist
    hist = null
    return true

  getHistories: ->
    return @_sortHistory @_getHistory()



config = new Config
history = new History config
bg = new Background config, history
nicoInfo = new NicoInfo config
liveChecker = new LiveChecker config, nicoInfo
