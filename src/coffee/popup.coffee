LOGGER = new Logger

date2String = (date) ->
  mm = date.getMonth() + 1
  dd = date.getDate()
  hh = date.getHours()
  min = date.getMinutes()
  mm = '0' + mm if mm < 10
  dd = '0' + dd if dd < 10
  hh = '0' + hh if hh < 10
  min = '0' + min if min < 10
  "#{mm}/#{dd} #{hh}:#{min}"


generateBeforeMessage = (now, targetTime) ->
  delta = targetTime - now
  d = Math.floor delta / (24 * 60 * 60 * 1000)
  remainder = delta % (24 * 60 * 60 * 1000)
  h = Math.floor remainder / (60 * 60 * 1000)
  remainder = delta % (60 * 60 * 1000)
  m = Math.floor remainder / (60 * 1000)
  ret = ''
  if d > 0
    ret += "#{d} 日 "
  if h > 0
    ret += "#{h} 時間 "
  if m > 0
    ret += "#{m} 分"
  return ret


class Popup
  @LOADING_VIEW: """
  <div class="nowloading active">
    <p><img src="/icons/ajax-loader.gif" alt="読込中..." /></p>
  </div>
  """

  $updateButton: null
  tabs: []

  constructor: ->
    @bg = chrome.extension.getBackgroundPage().bg
    @config = chrome.extension.getBackgroundPage().config
    @nicoInfo = chrome.extension.getBackgroundPage().nicoInfo
    @history = chrome.extension.getBackgroundPage().history
    $ =>
      @init()
      return
    return

  init: ->
    @$updateButton = $('#update-button')
    @initTabs()
    @showTab @config.getSaveTabNum()
    @addEventListeners()
    return

  initTabs: ->
    @$tabbars = $('#tabbar li')
    @$tabsContents = $('#tabs-content > div')
    console.assert @$tabbars.size() is @$tabsContents.size()
    for i in [0..@$tabbars.size()-1]
      $tab = @$tabbars.eq i
      $tabContent = @$tabsContents.eq i
      $tab.attr 'title', i
      tabId = $tabContent.attr 'id'
      unless @config.isNiconamaEnabled tabId
        $tab.css 'display', 'none'
        continue
      tab = @createTab tabId
      tab.tabNum = i
      tab.$tab = $tab
      tab.$tabContent = $tabContent
      tab.init()
      @tabs[i] = tab
    # Append loading view.
    $("#tabs-content").append Popup.LOADING_VIEW
    return

  createTab: (tabId) ->
    if tabId is 'settings'
      tab = new SettingsTab tabId, @config
    else if tabId is 'official'
      tab = new OfficialTab tabId, @config, @nicoInfo
    else if tabId is 'favorite'
      tab = new FavoriteTab tabId, @config, @nicoInfo
    else if tabId is 'timeshift'
      tab = new TimeshiftTab tabId, @config, @nicoInfo
    else if tabId is 'history'
      tab = new HistoryTab tabId, @config, @history
    else
      tab = new BaseTab tabId, @config
    return tab

  showTab: (num) ->
    tab = @tabs[num]
    unless tab
      throw new Error "Error: Can not show tab #{num}"
    unless tab
      @showTab parseInt(num) + 1
      return
    for tmpTab in @tabs
      continue unless tmpTab
      tmpTab.isActive = false
    tab.isActive = true
    tab.showTab()
    @setLastUpdateTime(tab.tabId)
    return

  setLastUpdateTime: (tabId) ->
    date = @nicoInfo.getLasetUpdateTime(tabId)
    hh = '??'
    min = '??'
    sec = '??'
    if date
      hh = date.getHours()
      min = date.getMinutes()
      sec = date.getSeconds()
      hh = '0' + hh if hh < 10
      min = '0' + min if min < 10
      sec = '0' + sec if sec < 10
    @$updateButton.attr 'title', "更新時間 #{hh}:#{min}:#{sec}"
    return

  addEventListeners: ->
    @$tabbars.on 'click', @onClickTab
    @$updateButton.on 'click', @onClickUpdateButton
    return

  onClickTab: (event) =>
    event.preventDefault()
    tabNum = $(event.target).attr 'title'
    @showTab tabNum
    @config.setSaveTabNum tabNum
    return

  onClickUpdateButton: (event) =>
    $target = $(event.target)
    unless $target.hasClass 'active-button'
      return
    $target.attr 'class', 'inactive-button'
    chrome.browserAction.setBadgeText text: ''
    @nicoInfo.updateAll true, false
    for tab in @tabs
      tab.init()
      if tab.isActive
        @showTab tab.tabNum
    setTimeout(=>
      @$updateButton.attr 'class', 'active-button'
      return
    , 60 * 1000)
    return


class BaseTab
  tabNum: -1
  $tab: null
  $tabContent: null
  isActive: false

  constructor: (@tabId, @config) ->
    @addEventListeners()

  addEventListeners: ->
    return

  init: ->
    return

  showTab: ->
    @$tab.addClass('active').siblings().removeClass 'active'
    @beforeShowTab()
    if @_showTab()
      @afterShowTab()
    return

  _showTab: ->
    return true

  beforeShowTab: ->
    $("#tabs-content > .nowloading").show().siblings().hide()
    return

  afterShowTab: ->
    # tab.content.show().siblings().hide()
    @$tabContent.fadeIn(100).siblings().hide()
    # tab.content.slideDown(400).siblings().hide()
    return

  showTabBadge: (text)->
    disp = if text then 'block' else 'none'
    @$tab.find('.tab-badge').css('display', disp).text text
    return


class LiveInfoHtml
  @NOT_WATCH_THUMNAIL: 'http://res.nimg.jp/img/common/video_deleted_ja-jp.jpg'
  @NO_IMAGE_THUMNAIL: 'http://icon.nimg.jp/404.jpg'
  @BEFORE_TIME_SEC: 300

  html: null

  constructor: (@item, @now) ->
    @html = {}
    @make()

  getHtml: ->
    return TMPL['liveInfo'] @html

  make: ->
    @html.title = @item.title or ''
    @html.link = @item.link or ''
    @html.description = @item.description or ''
    @setThumnail()
    @setTime()
    @setStatus()
    return

  setThumnail: ->
    if @item.thumnail
      @html.thumnail = @item.thumnail
    else if @item.flag and @item.flag is 'disable'
      @html.thumnail = LiveInfoHtml.NOT_WATCH_THUMNAIL
    else
      @html.thumnail = ''
    return

  setTime: ->
    time = ''
    openTimeStr = date2String @item.openTime if @item.openTime
    startTimeStr = date2String @item.startTime if @item.startTime
    if openTimeStr
      time = "開場: #{openTimeStr} | 開演: #{startTimeStr}"
    else if startTimeStr
      time = "開始: #{startTimeStr}"
    @html.time = time

  setStatus: ->
    status = ''
    flags = []
    openTime = @item.openTime?.getTime()
    startTime = @item.startTime?.getTime()
    endTime = @item.endTime?.getTime()
    if endTime and @now > endTime
      # closed
      status = '放送は終了しました'
      flags.push 'closed'
    else if startTime
      if @now > startTime
        # on-air
        status = 'ただいま放送中'
      else if openTime
        if @now > openTime
          # open gate
          status = 'まもなく放送開始'
        else if @now > openTime - LiveInfoHtml.BEFORE_TIME_SEC * 1000
          # before open gate
          status = 'まもなく開場'
        else if @now < openTime
          status = "開場まであと #{generateBeforeMessage @now, openTime}"
          flags.push 'long-before'
      else if @now < startTime
          status = "開演まであと #{generateBeforeMessage @now, startTime}"
          flags.push 'long-before'
    # Set status.
    @html.status = status
    # Set flag.
    flags.push @item.flag if @item.flag
    @html.flag = flags.join ' '
    return


class LiveTab extends BaseTab
  @CHECK_UPDATE_TIMER_INTERVAL_SEC: 3
  checkUpdateTimer: null

  constructor: (tabId, config, @nicoInfo) ->
    super tabId, config
    @$content = $("##{@tabId} > ul")

  addEventListeners: ->
    @checkUpdateTimer = setInterval @checkUpdate,
      LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC * 1000
    return

  getData: ->
    return @nicoInfo.getData @tabId

  getCache: ->
    return @nicoInfo.getCache @tabId

  isUpdated: (value) ->
    if value?
      @nicoInfo.isUpdated @tabId, value
    return @nicoInfo.isUpdated @tabId

  countBadge: ->
    return @nicoInfo.countBadge @tabId

  checkUpdate: =>
    # Set tab badge.
    @showTabBadge @countBadge()
    if @updateView()
      @afterShowTab()
    return

  # override
  init: ->
    # Set tab badge.
    @showTabBadge @countBadge()
    return

  # override
  _showTab: ->
    return @updateView true

  updateView: (force=false) ->
    # LOGGER.log "updateView #{@tabId}"

    unless @isActive
      LOGGER.log "Cancel updateView: not active #{@tabId}"
      return false

    # TODO 更新の検出はイベント駆動にしたい
    cache = @getCache()
    currentData = @getData()
    if cache
      if force or @isUpdated()
        LOGGER.log "Show cache data #{@tabId}"
        viewData = cache
      else
        # LOGGER.log "Cancel updateView: not force #{@tabId}"
        cache = null
        currentData = null
        return false
    else if currentData
      LOGGER.log "Show current data #{@tabId}"
      viewData = currentData
    else
      LOGGER.log "Cancel updateView: no cache and currentData #{@tabId}"
      cache = null
      currentData = null
      return false

    @$content.html ''
    now = (new Date).getTime()
    for item in viewData
      liveInfoHtml = new LiveInfoHtml item, now
      html = liveInfoHtml.getHtml()
      @$content.append html
    @isUpdated false
    cache = null
    currentData = null
    viewData = null
    return true


class FavoriteTab extends LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

class TimeshiftTab extends LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

class OfficialTab extends LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

class HistoryTab extends BaseTab
  constructor: (tabId, config, @history) ->
    super tabId, config
    @$content = $('#history-content')

  addEventListeners: ->
    return

  # override
  _showTab: ->
    @showHistory()
    return true

  showHistory: ->
    @$content.html ''
    histories = @history.getHistories()
    LOGGER.log "Show history", histories
    for hist in histories
      obj = {}
      unless hist.title and hist.link
        continue
      obj.title = hist.title
      obj.link = hist.link
      obj.thumnail = hist.thumnail or ''
      if hist.accessTime
        obj.accessTime = date2String (new Date hist.accessTime)
      else
        obj.accessTime = ''
      if hist.startTime
        obj.startTime = date2String (new Date hist.startTime)
      else
        obj.startTime = ''
      html = TMPL.history obj
      @$content.append html
    histories = null
    return


class SettingsTab extends BaseTab
  constructor: (tabId, config) ->
    super tabId, config
    @$autoJumpCheckbox = $('#setting-auto-jump')
    @$autoJumpIntervalInput = $('#setting-auto-jump-interval')
    @$autoEnterCheckbox = $('#setting-auto-enter')
    @$settingNiconamaEnabled = $('#setting-niconama-enabled')
    @$settingNiconamaUpdate = $('#setting-niconama-update > select')
    @$settingBadge = $('#setting-badge select')
    @$settingNotification = $('#setting-notification select')
    @$settingOpentabSelect = $('#setting-opentab select')
    @$settingOpentabBlacklist = $('#setting-opentab input:text')

  addEventListeners: ->
    $('#settings button[value="ok"]').on 'click', @onClickOkButton
    $('#settings button[value="cancel"]').on 'click', @onClickCancelButton
    return

  # override
  _showTab: ->
    @restoreSettings()
    return true

  showMessage: (msg, addClass) ->
    LOGGER.log 'showMessage'
    $('#settings-status')
      .css('display', 'inline').addClass(addClass).text msg
    setTimeout (@hideMessage addClass), 2000
    addClass = null
    return

  hideMessage: (removeClass) ->
    LOGGER.log 'hideMessage'
    return (removeClass) =>
      $('#settings-status')
        .css('display', 'none').removeClass(removeClass).text ''
      removeClass = null
      return

  onClickOkButton: (event) =>
    # TODO バリデーションは適当で
    try
      @validate()
      # Save.
      @saveSettings()
      @config.saveSettings()
      @showMessage '保存しました', 'success'
    catch error
      LOGGER.error 'Could not save settings.', error
      LOGGER.error error.stack if error.stack
      @restoreSettings()
      @showMessage '不正な値があります', 'failure'
    return

  onClickCancelButton: (event) =>
    @restoreSettings()
    return

  saveSettings: ->
    # ===== autoJump/autoEnter =====
    @config.setEnableAutoJump @$autoJumpCheckbox.prop 'checked'
    @config.setAutoJumpIntervalSec @$autoJumpIntervalInput.val()
    @config.setEnableAutoEnter @$autoEnterCheckbox.prop 'checked'
    # ===== enabledNiconama =====
    checkboxes = @$settingNiconamaEnabled.find 'input[type=checkbox]'
    for checkbox in checkboxes
      name = checkbox.getAttribute 'name'
      value = checkbox.checked
      @config.setEnabledNiconamaSettings name, value
    # ===== settingNiconamaUpdate =====
    @config.setNiconamaUpdateIntervalSec @$settingNiconamaUpdate.val()
    # ===== badge =====
    for select in @$settingBadge
      name = select.getAttribute 'name'
      value = select.value
      @config.setBadgeEnable name, value
    # ===== notification =====
    for select in @$settingNotification
      name = select.getAttribute 'name'
      value = select.value
      @config.setNotificationEnable name, value
    # ===== opentab =====
    for select in @$settingOpentabSelect
      name = select.getAttribute 'name'
      value = select.value
      @config.setOpentabEnable name, value
    blacklist = @$settingOpentabBlacklist.val()
    if blacklist
      blacklist = blacklist.replace(/\ /g, '').split ','
    else
      blacklist = []
    @config.setBlackList blacklist
    checkboxes = null
    blacklist = null
    return

  restoreSettings: ->
    # ===== autoJump/autoEnter =====
    @$autoJumpCheckbox.prop 'checked', @config.getEnableAutoJump()
    @$autoJumpIntervalInput.val @config.getAutoJumpIntervalSec()
    @$autoEnterCheckbox.prop 'checked', @config.getEnableAutoEnter()
    # ===== enabledNiconama =====
    checkboxes = @$settingNiconamaEnabled.find 'input[type=checkbox]'
    for checkbox in checkboxes
      name = checkbox.getAttribute 'name'
      value = @config.isNiconamaEnabled name
      checkbox.checked = value
    # ===== settingNiconamaUpdate =====
    @$settingNiconamaUpdate.val @config.getNiconamaUpdateIntervalSec()
    # ===== badge =====
    for select in @$settingBadge
      name = select.getAttribute 'name'
      value = @config.getBadgeEnable name
      select.value = value
    # ===== notification =====
    for select in @$settingNotification
      name = select.getAttribute 'name'
      value = @config.getNotificationEnable name
      select.value = value
    # ===== opentab =====
    for select in @$settingOpentabSelect
      name = select.getAttribute 'name'
      value = @config.getOpentabEnable name
      select.value = value
    blacklist = @config.getBlackList()
    @$settingOpentabBlacklist.val (blacklist.join ',')
    checkboxes = null
    blacklist = null
    return

  validate: ->
    value = @$autoJumpIntervalInput.val()
    if not value or value < 5
      throw new Error 'Validate error.'
    return


POPUP = new Popup
