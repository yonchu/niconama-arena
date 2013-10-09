exports = exports ? window ? @
common = exports.CHEX.common

LOGGER = new common.Logger

# === aujmp ===
aujmp = exports.namespace 'CHEX.aujmp'


aujmp.LivePage = class LivePage
  # === Constructor.
  constructor: ->
    # === Properties.
    # live, gate
    @pageType = null
    @commuUrl = @getCommuUrl()
    @commuId = @getCommuIdFromUrl @commuUrl
    @isChannel = if @commuId then @commuId.match(/^ch/)? else false
    @liveId = @getLiveId()
    @isCrowed = !!location.href.match /\?.*crowded/

  # === Method.
  getCommuUrl: ->
    # Get community URL.
    commuUrl = $('.com,.chan')?.find('.smn a').prop 'href'
    if commuUrl
      # Gate page.
      if $('#gates').length
        @pageType = 'gate-valid'
      else
        @pageType = 'gate-closed'
    else
      commuUrl = $('#watch_title_box a.commu_name,a.ch_name').prop 'href'
      if commuUrl
        # Live page.
        @pageType = 'live'
      else if $('#gates').length
        @pageType = 'gate-valid'
    return commuUrl

  getCommuIdFromUrl: (url) ->
    if url
      return url.match(/\/((ch|co)\d+)/)?[1]
    return null

  getLiveId: ->
    id = @getLiveIdFromUrl location.href
    unless id
      url = $('meta[property="og:url"]').attr 'content'
      id = @getLiveIdFromUrl url
    return id

  getLiveIdFromUrl: (url) ->
    return url.match(/(watch|gate)\/(lv\d+)/)?[2]

  validate: ->
    msg = []
    unless @commuUrl
      msg.push 'Community URL is not exists.'
    unless @commuId
      msg.push 'Community ID is not exists.'
    unless @liveId
      msg.push 'Live ID is not exists.'
    unless @pageType
      msg.push 'Page type is not exists.'
    if msg.length > 0
      return msg
    return

  isPageTypeGate: ->
    return @pageType is 'gate-valid' or @pageType is 'gate-closed'

  isPageTypeGateValid: ->
    return @pageType is 'gate-valid'

  isPageTypeGateClosed: ->
    return @pageType is 'gate-closed'

  isPageTypeLive: ->
    return @pageType is 'live'

  isJoinCommunity: ->
    if @isPageTypeLive()
      return $('span.favorite,span.favorite_ch_link').length is 0
    else if @isPageTypeGate()
      return $('.join a').length is 0
    return false


aujmp.AutoAction = class AutoAction
  @TPL: '<div id="auto-action"><div></div></div>'

  # === Constructor.
  constructor: (@livePage, @config) ->
    # === Properties.
    @$el = null
    # Initialize.
    LOGGER.info '[niconama-arena][AutoAction] Start auto action'
    @init()

  # === Initialize.
  init: ->
    @render()
    @$el = $('#auto-action')
    @autoEnter = new aujmp.AutoEnter @$el, @livePage, @config
    @autoJump = new aujmp.AutoJump @$el, @livePage, @config
    @opentabStatus = new aujmp.OpentabStatus @$el, @livePage, @config
    return @

  render: ->
    tpl = aujmp.AutoAction.TPL
    if @livePage.isPageTypeLive()
      $('#watch_player_top_box').after tpl
    else if @livePage.isPageTypeGate()
      $('#bn_gbox').after tpl
    else
      throw Error "Unknow page type #{@livePage.pageType}", location.href
    return @


aujmp.AutoJump = class AutoJump
  # === Class variables.
  # http://live.nicovideo.jp/api/getplayerstatus?v=lv
  @LIVE_CHECK_URL: 'http://watch.live.nicovideo.jp/api/getplayerstatus?v='

  @TPL: '<input type="checkbox" name="auto-jump" /> 自動枠移動'

  # === Constructor.
  constructor: (@$el, @livePage, @config) ->
    # === Properties.
    @$checkbox = null
    @isCurrentLiveClosed = false
    @checkTimer = null

    # Initialize.
    LOGGER.info '[niconama-arena][AutoJump] Start auto jump'
    error = @validate()
    if error
      LOGGER.info "[niconama-arena][AutoJump] Cancel auto jump: ", error
    else
      @init()
      @initEventListeners()

  # === Initialize.
  validate: ->
    if @livePage.isPageTypeGateValid()
      return "Invalid page type: #{@livePage.pageType}"
    if @livePage.isChannel
      return "Skip channel page: #{@livePage.commuId}"
    return @livePage.validate()

  init: ->
    @render()
    @$checkbox = @$el.find('input:checkbox[name="auto-jump"]')

    # Check next on-air.
    if @config.enableAutoJump
      @$checkbox.prop 'checked', true
      @checkNextOnair()
      @setUpCheckTimer()
    return @

  # === Event listeners.
  initEventListeners: ->
    @$checkbox.on 'change', @onChangeCheckBox
    return @

  onChangeCheckBox: =>
    @clearCheckTimer()
    if @$checkbox.prop 'checked'
      LOGGER.info '[niconama-arena][AutoJump] Enable auto jump'
      @setUpCheckTimer()
    else
      LOGGER.info '[niconama-arena][AutoJump] Disable auto jump'
    return

  # === Methods.
  setUpCheckTimer: ->
    time = @config.autoJumpIntervalSec * 1000
    @checkTimer = setInterval @checkNextOnair, time
    return @

  clearCheckTimer: ->
    if @checkTimer
      clearInterval @checkTimer
      @checkTimer = null
    return @

  render: ->
    # Add css class.
    if @livePage.isPageTypeLive()
      @$el.addClass 'auto-jump-live'
    else if @livePage.isPageTypeGate()
      @$el.addClass 'auto-jump-gate'
    else
      LOGGER.error "[niconama-arena][AutoJump] Unknown page type #{@livePage.pageType}"
      return @
    @$el.find('div').append aujmp.AutoJump.TPL
    return @

  checkNextOnair: =>
    if @isCurrentLiveClosed
      @jumpNextOnair()
      return

    url = aujmp.AutoJump.LIVE_CHECK_URL + @livePage.liveId
    LOGGER.info "[niconama-arena][AutoJump] HTTP Request(checkNextOnair): #{url}"

    common.httpRequest url, (response) =>
      $res = $($.parseHTML (common.transIMG response))
      errorcode = $res.find('error code').text()
      LOGGER.info "[niconama-arena][AutoJump] errorcode = #{errorcode}"
      # full/commingsoon/closed/notfound/timeshift_ticket_exhaust
      if errorcode is 'closed'
        # Off-air
        @isCurrentLiveClosed = true
        @jumpNextOnair()
      else if errorcode in ['notfound', 'timeshift_ticket_exhaust']
        @clearCheckTimer()
        @$checkbox.prop 'checked', false
      return
    return

  jumpNextOnair: ->
    url = @livePage.commuUrl
    LOGGER.info "[niconama-arena][AutoJump] HTTP Request(jumpNextOnair): #{url}"
    common.httpRequest url, (response) =>
      $res = $($.parseHTML (common.transIMG response))

      nowLiveUrl = $res.find('#now_live a').first().attr 'href'
      unless nowLiveUrl
        # Off-air
        LOGGER.info '[niconama-arena][AutoJump] Off-air'
        return @

      # On-air
      LOGGER.info "[niconama-arena][AutoJump] On-air: nowLiveUrl = #{nowLiveUrl}"
      nowLiveId = nowLiveUrl.match(/watch\/(lv\d+)/)[1]
      LOGGER.info "[niconama-arena][AutoJump] nowLiveId = #{nowLiveId}"
      if nowLiveId isnt @livePage.liveId
          # Move to new live page.
          location.replace nowLiveUrl
      return @
    return @


aujmp.OpentabStatus = class OpentabStatus
  @TPL: '<a href="javascript:void(0)">自動タブOPEN' \
    + ' (%commuId%): &nbsp;<span>???</span></a>'

  @OPENTAB_STATUS_BLACK_LIST:
    'enable':
      className: 'oepntab-enable'
      msg: '有効'
      next: 'tempDisable'
    'tempDisable':
      className: 'oepntab-tempDisable'
      msg: '一時無効'
      next: 'disable'
    'disable':
      className: 'oepntab-disable'
      msg: '無効'
      next: 'tempEnable'
    'tempEnable':
      className: 'oepntab-tempEnable'
      msg: '一時有効'
      next: 'enable'

  @OPENTAB_STATUS_WHITE_LIST:
    'enable':
      className: 'oepntab-enable'
      msg: '有効'
      next: 'tempDisable'
    'tempDisable':
      className: 'oepntab-tempDisable'
      msg: '一時無効'
      next: 'disable'
    'disable':
      className: 'oepntab-disable'
      msg: '無効'
      next: 'tempEnable'
    'tempEnable':
      className: 'oepntab-tempEnable'
      msg: '一時有効'
      next: 'enable'

  # === Constructor.
  constructor: (@$el, @livePage, @config) ->
    # === Properties.
    @$toggleButton = null

    # Initialize.
    LOGGER.info '[niconama-arena][OpentabStatus] Start opentab status'
    error = @validate()
    if error
      LOGGER.info "[niconama-arena][OpentabStatus] Cancel opentab status: ", error
    else
      @init()

  # === Initialize.
  validate: ->
    error = @livePage.validate()
    if error
      return error
    unless @livePage.isJoinCommunity()
      return 'Not joining this community.'
    LOGGER.info "[niconama-arena][OpentabStatus] Joining this community #{@livePage.liveId}"
    return

  init: ->
    @render()
    return @

  # === Methods.
  render: ->
    # TODO 別クラスを用意したいところ
    if @livePage.isPageTypeLive()
      @$el.addClass 'auto-jump-live'
    else if @livePage.isPageTypeGate()
      @$el.addClass 'auto-jump-gate'
    else
      LOGGER.error "[niconama-arena][OpentabStatus] Unknown page type #{@livePage.pageType}"
      return @
    html = aujmp.OpentabStatus.TPL.replace '%commuId%', @livePage.commuId
    @$el.find('div').append html
    @$toggleButton = @$el.find 'a'
    @getOpentabStatus()
    return @

  getOpentabStatus: ->
    chrome.runtime.sendMessage({
        'target' : 'config',
        'action' : 'getOpentabStatus',
        'args'   : [@livePage.commuId]
      }, (response) =>
        status = response.res
        @showOpentabStatus status
        @$toggleButton.on 'click', @onToggleButton
        return
    )
    return

  showOpentabStatus: (status) ->
    LOGGER.log "[niconama-arena][OpentabStatus] Show opentab status: #{status}"
    if @config.isRuleBlackList
      map = aujmp.OpentabStatus.OPENTAB_STATUS_BLACK_LIST
    else
      map = aujmp.OpentabStatus.OPENTAB_STATUS_WHITE_LIST
    msg = map[status].msg
    className = map[status].className
    @$toggleButton.find('span').html msg
    @$toggleButton.attr 'class', className
    return @

  onToggleButton: (event) =>
    event.preventDefault()
    className = @$toggleButton.attr 'class'
    if @config.isRuleBlackList
      map = aujmp.OpentabStatus.OPENTAB_STATUS_BLACK_LIST
    else
      map = aujmp.OpentabStatus.OPENTAB_STATUS_WHITE_LIST
    for own key, value of map
      if value.className is className
        @saveOpentabStatus value.next
        @showOpentabStatus value.next
        break
    return

  saveOpentabStatus: (status) ->
    chrome.runtime.sendMessage({
        'target' : 'config',
        'action' : 'setOpentabStatus',
        'args'   : [@livePage.commuId, status]
      }, (response) =>
        LOGGER.log '[niconama-arena][OpentabStatus] Saved opentab status', response
        return
    )
    return @


aujmp.AutoEnter = class AutoEnter
  # === Class variables.
  @TPL: '<input type="checkbox" name="auto-enter" /> 自動入場'

  # === Constructor.
  constructor: (@$el, @livePage, @config) ->
    # === Properties.
    @$checkbox = null

    # Initialize.
    LOGGER.info '[niconama-arena][AutoEnter] Start auto enter'
    error = @validate()
    if error
      LOGGER.info "[niconama-arena][AutoEnter] Cancel auto enter: ", error
    else
      @init()
      @initEventListeners()

  # === Initialize.
  validate: ->
    unless @livePage.isPageTypeGateValid()
      return "Invalid page type. #{@livePage.pageType}"
    unless @livePage.liveId
      return 'Live ID is not found.'
    return

  init: ->
    @render()
    return @

  render: ->
    @$el.addClass 'auto-enter'
    @$el.find('div').append aujmp.AutoEnter.TPL
    @$checkbox = @$el.find('input:checkbox[name=auto-enter]')
    if @config.enableAutoEnter
      @$checkbox.prop 'checked', true
    return @

  # === Event listeners.
  initEventListeners: ->
    $('#gates').on 'DOMSubtreeModified', @onDOMSubtreeModifiedGates
    return @

  onDOMSubtreeModifiedGates: =>
    LOGGER.info "[niconama-arena][AutoEnter] Run auto enter: #{new Date()}"
    if @$checkbox.prop 'checked'
      if @livePage.isCrowed
        LOGGER.warn '[niconama-arena][AutoEnter] Cancel auto enter because this live is crowed.'
      else
        # url = @liveCheckUrl + @livePage.liveId
        # common.httpRequest url, (response) =>
        #   # location.reload true
        #   LOGGER.info '[niconama-arena][AutoEnter] Request for live check is succescc'
        location.reload true
    return


aujmp.History = class History
  # === Class variables.
  @LIVE_URL: 'http://live.nicovideo.jp/watch/'

  # === Constructor.
  constructor: (@livePage, @config) ->
    # === Properties.
    id = @livePage.liveId
    @liveData =
      id: id
      title: null
      link: aujmp.History.LIVE_URL + id
      thumnail: null
      openTime: null
      startTime: null
      endTimd: null
      accessTime: Date.now()

    # Initialize.
    LOGGER.info '[niconama-arena][History] Start history'
    error = @validate()
    if error
      LOGGER.info "[niconama-arena][History] Cancel history: ", error
    else
      @init()

  # === Initialize.
  validate: ->
    unless @livePage.liveId
      return 'Live ID is not found.'
    return

  init: ->
    if @livePage.isPageTypeGate()
      @setLiveDataForGate()
    else if @livePage.isPageTypeLive()
      @setLiveDataForLive()
    else
      LOGGER.error "Unknown page type: #{@livePage.pageType}"
      return @
    error = @validateData()
    if error
      LOGGER.error "[niconama-arena][History] Data validation error", error, @liveData
      return @
    @saveHistory @liveData
    return @

  setLiveDataForGate: ->
    LOGGER.info "[niconama-arena][History] Saving history in gate page: #{@liveData.id}"
    @liveData.title = $('.infobox h2 > span:first').text().trim()
    @liveData.thumnail = $('#bn_gbox > .bn > meta').attr 'content'
    time = $('#bn_gbox .kaijo').text().trim()
    timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/
    if timeMatch
      yearStr = timeMatch[1]
      dateStr = timeMatch[2]
      openTimeStr = timeMatch[3]
      startTimeStr = timeMatch[4]
      @liveData.openTime = common.str2date(yearStr, dateStr, openTimeStr).getTime()
      @liveData.startTime = common.str2date(yearStr, dateStr, startTimeStr).getTime()
    endTimeMatch = $('#bn_gbox .kaijo').next().text()
      .match /この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/
    if endTimeMatch
      endYearStr = endTimeMatch[1]
      endDateStr = endTimeMatch[2]
      endTimeStr = endTimeMatch[3]
      @liveData.endTime = common.str2date(endYearStr, endDateStr, endTimeStr).getTime()
    return @

  setLiveDataForLive: ->
    LOGGER.info "[niconama-arena][History] Saving history in live page: #{@liveData.id}"
    @liveData.title = $('#watch_title_box .box_inner .title_text').text().trim()
    @liveData.thumnail = $('#watch_title_box .box_inner .thumb_area img:first').attr 'src'
    time = $('#watch_tab_box .information').first().text().trim().replace(/：/g, ':')
    timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d).*開場.*(\d\d:\d\d)開演/
    if timeMatch
      yearStr = timeMatch[1]
      dateStr = timeMatch[2]
      openTimeStr = timeMatch[3]
      startTimeStr = timeMatch[4]
      @liveData.openTime = common.str2date(yearStr, dateStr, openTimeStr).getTime()
      @liveData.startTime = common.str2date(yearStr, dateStr, startTimeStr).getTime()
    return @

  validateData: ->
    msg = []
    unless @liveData.title
      msg.push "Title does not exist."
    unless @liveData.link
      msg.push "Link does not exist."
    unless @liveData.thumnail
      msg.push "Thumnail does not exist."
    if msg.length > 0
      return msg
    return

  saveHistory: ->
    LOGGER.info "[niconama-arena][History] Save history", @liveData
    chrome.runtime.sendMessage({
        'target' : 'history',
        'action' : 'saveHistory',
        'args'   : [@liveData]
      }, (response) =>
        res = response.res
        LOGGER.info "[niconama-arena][History] Saved history", res
        return
    )
    return @


# === Initialize ===
init = ->
  if $('#zero_lead').length
    LOGGER.info '[niconama-arena] No avairable nico_arena on Harajuku.'
    return

  # encodeURI(decodeURI(location.href))
  if location.href.match /http[s]?:\/\/live\.nicovideo\.jp\/gate\/.*/
    LOGGER.info '[niconama-arena] This page is for the gate.'
    if location.href.match /\?.*crowded/
      LOGGER.info '[niconama-arena] This page is now crowed.'
    else
      watchUrl = location.href.replace /\/gate\//, '/watch/'
      # location.replace watchUrl
      return

  run = (config) ->
    # Analyize this page.
    livePage = new aujmp.LivePage
    LOGGER.info '[niconama-arena] Live page info = ', livePage
    # History.
    if config.enableHistory
      HISTORY = new aujmp.History livePage, config
    # Auto action.
    AUTO_ACTION = new aujmp.AutoAction livePage, config
    return

  chrome.runtime.sendMessage({
      'target' : 'config',
      'action' : 'getConfigForAutoJump',
      'args'   : []
    }, (response) ->
      config = response.res
      LOGGER.info '[niconama-arena] Config = ', config
      run config
      return
  )
  return


# Main
AUTO_ACTION = null
HISTORY = null
init()
