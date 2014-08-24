exports = exports ? window ? @
common = exports.CHEX.common

LOGGER = new common.Logger

# === popup ===
popup = exports.namespace 'CHEX.popup'


popup.TabManager = class TabManager extends common.EventDispatcher
  @LOADING_VIEW: """
  <div class="nowloading active">
    <p><img src="/icons/ajax-loader.gif" alt="読込中..." /></p>
  </div>
  """

  # === Constructor.
  constructor: (@barElem, @contentElem) ->
    super()
    # === Properties.
    @tabs = {}
    @callbacks = {}
    # Elements.
    @$tabbars = null
    @$tabsContents = null

  # === Event listeners.
  initEventListeners: ->
    @$tabbars.on 'click', @onClickTab

  onClickTab: (event) =>
    event.preventDefault()
    tabId = $(event.target).attr 'data-id'
    @showTab tabId
    return @

  # === Private methods for @tabs.
  getTab: (tabId) ->
    unless tabId and @tabs[tabId]
      LOGGER.log "#{tabId} is not registered."
      return null
    return @tabs[tabId]

  getFirstTab: ->
    min = null
    minTab = null
    for own tabId, tab of @tabs
      if not min? or tab.tabNum < min
        min = tab.tabNum
        minTab = tab
    return minTab

  activateTab: (targetTabId) ->
    for own tabId, tab of @tabs
      tab.isActive = tabId is targetTabId
      if tabId is targetTabId
        # Activate tab bar.
        tab.$tab.addClass('active').siblings().removeClass 'active'
    # Show loading view.
    @$loading.show().siblings().hide()
    return @

  # === Public methods.
  register: (tab) ->
    tabId = tab.tabId
    if @tabs[tabId]
      throw Error "#{tabId} is already registered."
    @tabs[tabId] = tab
    return @

  onChangeTab: (callback, callbackObj) ->
    @addEventListener 'changeTab', callback, callbackObj
    return @

  initTabs: ->
    @$tabbars = $(@barElem)
    @$tabsContents = $(@contentElem)
    console.assert @$tabbars.size() is @$tabsContents.size()
    for i in [0..@$tabbars.size()-1]
      $tab = @$tabbars.eq i
      $tabContent = @$tabsContents.eq i
      tabId = $tabContent.attr 'id'
      tab = @getTab tabId
      unless tab
        $tab.css 'display', 'none'
        continue
      tab.tabNum = i
      tab.$tab = $tab
      tab.$tabContent = $tabContent
      tab.onComplete @showTabContent, @
      # Initialize tab.
      tab.initOnce()
      tab.init()
    # Append loading view.
    parent = $(@contentElem).parent()
    parent.append popup.TabManager.LOADING_VIEW
    @$loading = parent.find('.nowloading')
    @initEventListeners()
    return @

  showTab: (tabId) ->
    tab = @getTab tabId
    unless tab
      tab = @getFirstTab()
    tabId = tab.tabId
    # Activate tab.
    @activateTab tabId
    tab.showTab()
    @dispatchEvent 'changeTab', [tabId]
    return @

  showTabContent: (tab) ->
    tab.$tabContent.fadeIn(100).siblings().hide()
    # show().siblings().hide()
    # slideDown(400).siblings().hide()
    return @

  updateAllTabs: ->
    for own tabId, tab of @tabs
      tab.init()
      if tab.isActive
        @showTab tab.tabId
    return @


popup.Popup = class Popup
  # === Constructor.
  constructor: (@config, @nicoInfo) ->
    # === Properties.
    @tabManager = new popup.TabManager '#tabbar li', '#tabs-content > div'
    # Elements.
    @$updateButton = null

  # === Public methods.
  registerTab: (tab) ->
    @tabManager.register tab
    return @

  showPopup: ->
    @init()
    return @

  # === Initialize.
  init: ->
    @$updateButton = $('#update-button')
    @tabManager.initTabs()
    @initEventListeners()
    # Show tab.
    @tabManager.showTab @config.getSaveTabId()
    return @

  setLastUpdateTime: (tabId) ->
    date = @nicoInfo.getLastUpdateTime(tabId)
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

  # === Event Listeners.
  initEventListeners: ->
    @$updateButton.on 'click', @onClickUpdateButton
    @tabManager.onChangeTab @onChangeTab, @
    return @

  onChangeTab: (tabId) ->
    @config.setSaveTabId tabId
    @setLastUpdateTime tabId
    return

  onClickUpdateButton: (event) =>
    $target = $(event.target)
    unless $target.hasClass 'active-button'
      return
    $target.attr 'class', 'inactive-button'
    chrome.browserAction.setBadgeText text: ''
    @nicoInfo.updateAll true, false
    @tabManager.updateAllTabs()
    setTimeout(=>
      @$updateButton.attr 'class', 'active-button'
      return
    , 60 * 1000)
    return


popup.BaseTab = class BaseTab extends common.EventDispatcher
  # === Constructor.
  constructor: (@tabId, @config) ->
    super()
    # === Properties.
    @tabNum = -1
    @$tab = null
    @$tabContent = null
    @isActive = false

  # === Event listeners.
  initEventListeners: ->
    return @

  # === Initialize.
  initOnce: ->
    @initEventListeners()
    return @

  init: ->
    return @

  # === Public methods.
  showTab: ->
    @showTabContent()
    return @

  showTabContent: ->
    @dispatchEvent 'complete', @
    return @

  showTabBadge: (text) ->
    disp = if text then 'block' else 'none'
    @$tab.find('.tab-badge').css('display', disp).text text
    return @

  onComplete: (callback, callbackObj) ->
    @addEventListener 'complete', callback, callbackObj
    return @


popup.LiveInfoHtml = class LiveInfoHtml
  @NOT_WATCH_THUMNAIL: 'http://res.nimg.jp/img/common/video_deleted_ja-jp.jpg'
  @NO_IMAGE_THUMNAIL: 'http://icon.nimg.jp/404.jpg'
  @BEFORE_TIME_SEC: 300

  # === Constructor.
  constructor: (@item, @now) ->
    # === Properties.
    @html = {}
    @make()

  # === Public methods.
  getHtml: ->
    return TMPL['liveInfo'] @html

  # === Helper methods.
  make: ->
    @html.title = @item.title or ''
    @html.link = @item.link or ''
    @html.description = @item.description or ''
    @setThumnail()
    @setTime()
    @setStatus()
    return @

  setThumnail: ->
    if @item.thumnail
      @html.thumnail = @item.thumnail
    else if @item.flag and @item.flag is 'disable'
      @html.thumnail = popup.LiveInfoHtml.NOT_WATCH_THUMNAIL
    else
      @html.thumnail = ''
    return @

  setTime: ->
    time = ''
    openTimeStr = common.date2String @item.openTime if @item.openTime
    startTimeStr = common.date2String @item.startTime if @item.startTime
    if openTimeStr
      time = "開場: #{openTimeStr} | 開演: #{startTimeStr}"
    else if startTimeStr
      time = "開始: #{startTimeStr}"
    @html.time = time
    return @

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
        else if @now > openTime - popup.LiveInfoHtml.BEFORE_TIME_SEC * 1000
          # before open gate
          status = 'まもなく開場'
        else if @now < openTime
          status = "開場まであと #{common.remainingTime @now, openTime}"
          flags.push 'long-before'
      else if @now < startTime
        status = "開始まであと #{common.remainingTime @now, startTime}"
        flags.push 'long-before'
    # Set status.
    @html.status = status
    # Set flag.
    flags.push @item.flag if @item.flag
    @html.flag = flags.join ' '
    return @


popup.LiveTab = class LiveTab extends popup.BaseTab
  @CHECK_UPDATE_TIMER_INTERVAL_SEC: 3

  # === Constructor.
  constructor: (tabId, config, @nicoInfo) ->
    super tabId, config
    # === Properties.
    @$content = $("##{@tabId} > ul")
    @checkUpdateTimer = null

  # === Event listeners.
  initEventListeners: ->
    @checkUpdateTimer = setInterval @checkUpdate,
      popup.LiveTab.CHECK_UPDATE_TIMER_INTERVAL_SEC * 1000
    return @

  checkUpdate: =>
    # Set tab badge.
    @showTabBadge @countBadge()
    if @updateView()
      @showTabContent()
    return

  # === Initialize.
  # Override.
  init: ->
    # Set tab badge.
    @showTabBadge @countBadge()
    return

  # Override.
  showTab: ->
    if @updateView true
      super()
    return @

  # === Helper methods.
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
    now = Date.now()
    for item in viewData
      liveInfoHtml = new popup.LiveInfoHtml item, now
      html = liveInfoHtml.getHtml()
      @$content.append html
    @isUpdated false
    cache = null
    currentData = null
    viewData = null
    return true

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


popup.FavoriteTab = class FavoriteTab extends popup.LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

popup.TimeshiftTab = class TimeshiftTab extends popup.LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

popup.OfficialTab = class OfficialTab extends popup.LiveTab
  constructor: (tabId, config, nicoInfo) ->
    super tabId, config, nicoInfo

popup.HistoryTab = class HistoryTab extends popup.BaseTab
  # === Constructor.
  constructor: (tabId, config, @history) ->
    super tabId, config
    # === Properties.
    @$content = $('#history-content')

  # === Event listeners.
  initEventListeners: ->
    return @

  # === Public methods.
  # Override.
  showTab: ->
    @showHistory()
    return super()

  # === Helper methods.
  showHistory: ->
    # Clear content.
    @$content.html ''
    histories = @history.getHistories()
    LOGGER.log "Show history", histories
    for hist in histories
      # Make object for html template.
      obj = {}
      unless hist.title and hist.link
        continue
      obj.title = hist.title
      obj.link = hist.link
      obj.thumnail = hist.thumnail or ''
      if hist.accessTime
        obj.accessTime = common.date2String (new Date hist.accessTime)
      else
        obj.accessTime = ''
      if hist.startTime
        obj.startTime = common.date2String (new Date hist.startTime)
      else
        obj.startTime = ''
      # Make html from template.
      html = TMPL.history obj
      @$content.append html
    histories = null
    return @


## Validator
popup.Validator = class Validator
  checkers:
    isNonEmpty:
      validate: (value) ->
        return value isnt ""
      instructions: "the value cannot be empty"

    required:
      validate: (value) ->
        return value?
      instructions: "the value is required"

    isNumber:
      validate: (value) ->
        # TODO 厳密なチェックではない
        return not isNaN value
      instructions: "the value can only be a valid number, e.g. 1, 3.14 or 2010"

    isInteger:
      validate: (value) ->
        return false unless value?
        value += ''
        return not (value.match /[^0-9]/g) or (parseInt value, 10) + '' isnt value
      instructions: "the value can only be a integer number, e.g. 0, 1"

    isRangeNumber:
      validate: (value, args) ->
        min = args.min
        max = args.max
        return false if isNaN value
        if value < min
          return false
        if value > max
          return false
        return true
      instructions: "the value can be more than %min% and less than %max%"

    isRangeMinNumber:
      validate: (value, args) ->
        min = args.min
        return false if isNaN value
        if value < min
          return false
        return true
      instructions: "the value can be more than %min%"

    isAlphaNum:
      validate: (value) ->
        # TODO
        return not /[^a-z0-9]/i.test value
      instructions: "the value can only contain characters and numbers, no special symbols"

  constructor: ->
    @messages = []
    @config = {}

  hasErrors: ->
    return @messages.length isnt 0

  getMessages: ->
    return @messages.slice()

  # data =
  #   name: '次枠チェック間隔'
  #   type: isRangeMinNumber
  #   value: 5
  #   args: {min: 0, max: 10}
  #   required: true
  validate: (data) ->
    name = data.name
    type = data.type
    checker = @checkers[type]
    value = data.value
    args = data.args or {}
    required = if data.required? then !!data.required else false
    unless checker
      throw Error "No handler to validate type #{type}"
    if required
      unless @checkers.required.validate.call @, value
        msg = @makeMessage name, @checkers.required.instructions
        @messages.push = msg
    unless checker.validate.call @, value, args
      msg = @makeMessage name, checker.instructions, args
      @messages.push msg
    return @hasErrors()

  makeMessage: (name, inst, args) ->
    for own key, value of args
      inst = inst.replace (RegExp "%#{key}%", 'g'), value
    return "Invalid value for *#{name}*, #{inst}"


popup.SettingsTab = class SettingsTab extends popup.BaseTab
  # === Constructor.
  constructor: (tabId, config) ->
    super tabId, config
    # === Properties.
    @$autoJumpCheckbox = $('#setting-auto-jump')
    @$autoJumpIntervalInput = $('#setting-auto-jump-interval')
    @$autoEnterCheckbox = $('#setting-auto-enter')
    @$settingNiconamaEnabled = $('#setting-niconama-enabled')
    @$settingNiconamaUpdate = $('#setting-niconama-update > select')
    @$settingBadge = $('#setting-badge select')
    @$settingNotification = $('#setting-notification select')
    @$settingOpentabSelect = $('#setting-opentab select')
    @$settingOpentabRule = $('#setting-opentab-rule input:radio[name="rule"]')
    @$settingOpentabBlacklist = $('#setting-opentab-rule input:text:eq(0)')
    @$settingOpentabWhitelist = $('#setting-opentab-rule input:text:eq(1)')

  # === Event listeners.
  initEventListeners: ->
    $('#settings button[value="ok"]').on 'click', @onClickOkButton
    $('#settings button[value="cancel"]').on 'click', @onClickCancelButton
    return @

  onClickOkButton: (event) =>
    error = @validate()
    if error and error.length > 0
      LOGGER.error 'Could not save settings.', error
      @showMessage '不正な値があります', 'failure'
      return
    # Save.
    @saveSettings()
    @config.save()
    @showMessage '保存しました', 'success'
    return

  onClickCancelButton: (event) =>
    @restoreSettings()
    return

  # === Public methods.
  # Override.
  showTab: ->
    @restoreSettings()
    return super()

  # === Helper methods.
  validate: ->
    validator = new popup.Validator
    data =
      name: '次枠チェック間隔'
      type: 'isRangeMinNumber'
      value: @$autoJumpIntervalInput.val()
      args:
        min: 5
    if validator.validate data
      return validator.getMessages()
    return null

  showMessage: (msg, addClass) ->
    LOGGER.log 'showMessage'
    $status = $('#settings-status')
    $status.css('display', 'inline').addClass(addClass).text msg
    setTimeout(->
      $status.css('display', 'none').removeClass(addClass).text ''
      $status = null
    , 2000)
    return @

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
    rule = @$settingOpentabRule.filter(':checked').val()
    blacklist = @getRuleList @$settingOpentabBlacklist.val()
    whitelist = @getRuleList @$settingOpentabWhitelist.val()
    @config.setRule rule
    @config.setBlackList blacklist
    @config.setWhiteList whitelist
    return

  getRuleList: (ruleList) ->
    ret = []
    if ruleList
      ret = ruleList.replace(/\ /g, '').split ','
    return ret

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
    if @config.isRuleBlackList()
      @$settingOpentabRule.eq(0).prop('checked', true)
    else
      @$settingOpentabRule.eq(1).prop('checked', true)
    blacklist = @config.getBlackList()
    whitelist = @config.getWhiteList()
    @$settingOpentabBlacklist.val (blacklist.join ',')
    @$settingOpentabWhitelist.val (whitelist.join ',')
    return


POPUP = null
$ ->
  config = chrome.extension.getBackgroundPage().my_config
  nicoInfo = chrome.extension.getBackgroundPage().my_nicoInfo
  history = chrome.extension.getBackgroundPage().my_history
  POPUP = new popup.Popup config, nicoInfo
  regTab = (tab) ->
    unless config.isNiconamaEnabled tab.tabId
      LOGGER.log "Tab #{tab.tabId} is disable."
      return
    POPUP.registerTab tab
    return
  regTab new popup.OfficialTab 'official', config, nicoInfo
  regTab new popup.OfficialTab 'favorite', config, nicoInfo
  regTab new popup.FavoriteTab 'timeshift', config, nicoInfo
  regTab new popup.HistoryTab 'history', config, history
  regTab new popup.SettingsTab 'settings', config
  POPUP.showPopup()
  return
