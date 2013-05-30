LOGGER = new Logger

# === Common functions ===

httpRequest = (url, callback) ->
  xhr = new XMLHttpRequest
  xhr.onreadystatechange = ->
    if xhr.readyState is 4
      callback xhr.responseText
    return
  xhr.open 'GET', url, true
  xhr.send()
  return

transIMG = (html) ->
  return html.replace /<img([^>]+)>/g, '<imgx$1>'

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


# === Class ===

class Base
  # === Class variables.
  # http://live.nicovideo.jp/api/getplayerstatus?v=lv
  @LIVE_CHECK_URL: 'http://watch.live.nicovideo.jp/api/getplayerstatus?v='
  @LIVE_URL: 'http://live.nicovideo.jp/watch/'

  # === Properties.
  currentLiveId: null
  commuId: null
  commuUrl: null
  # live or gate
  pageType: null

  # === Constructor.
  constructor: (@config) ->
    LOGGER.info 'config: ', @config
    return unless @init()
    @addEventListeners()

  init: ->
    @commuUrl = @getCommuUrl()
    @commuId = @getCommuIdFromUrl @commuUrl
    @currentLiveId = @getLiveId()
    unless @currentLiveId
      throw Error "Not found currentLiveId"
    LOGGER.info "commuUrl = #{@commuUrl}"
    LOGGER.info "commuId = #{@commuId}"
    LOGGER.info "currentLiveId = #{@currentLiveId}"
    LOGGER.info "pageType = #{@pageType}"
    return true

  # === Event listeners.
  addEventListeners: ->

  # === Helper method.
  getCommuUrl: ->
    # Get community URL.
    commuUrl = $('.com,.chan')?.find('.smn a').prop 'href'
    if commuUrl
      # Gate page.
      @pageType = 'gate'
    else
      commuUrl = $('#watch_title_box > div > a').prop 'href'
      if commuUrl
        # Live page.
        @pageType = 'live'
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


class AutoJump extends Base
  # === Class variables.
  @TPL: """
  <div id="auto-jump">
    <div>
      <input type="checkbox" name="auto-jump" /> 自動枠移動
    </div>
  </div>
  """

  @OPENTAB_STATUS:
    'disable':
      className: 'oepntab-disable'
      msg: '無効'
      next: 'tempDisable'
    'tempDisable':
      className: 'oepntab-tempDisable'
      msg: '一時無効'
      next: 'enable'
    'enable':
      className: 'oepntab-enable'
      msg: '有効'
      next: 'disable'

  # === Properties.
  $el: null
  $checkbox: null
  $toggleButton: null
  isCurrentLiveClosed: false
  checkTimer: null

  # === Initialize.
  init: ->
    LOGGER.info 'Start auto jump.'
    super()
    unless @commuUrl and @commuId and @currentLiveId and @pageType
      LOGGER.info "Not run in this page."
      return false
    @render()
    @$el = $('#auto-jump')
    @$checkbox = @$el.find('input:checkbox')

    # Set opentab status.
    if @isJoinCommunity()
      LOGGER.info 'Joining this community.'
      @renderOpentabStatus()

    # Check next on-air.
    if @config.enableAutoJump
      @$checkbox.attr 'checked', true
      @checkNextOnair()
      @checkTimer = setInterval @checkNextOnair, @config.autoJumpIntervalSec * 1000
    return true

  render: ->
    tpl = AutoJump.TPL.replace '%commuId%', @commuId
    # Insert checkbox element.
    if @pageType is 'live'
      $('#watch_player_top_box').after tpl
    else if @pageType is 'gate'
      # Change css.
      $('#bn_gbox').after tpl
      $autoJumpDiv = $('#auto-jump').addClass 'auto-jump-gate'
    else
      throw Error "Unknow page type #{@pageType}", location.href

  # === Event listeners.
  addEventListeners: ->
    @$checkbox.on 'change', @onChangeCheckBox
    return

  onChangeCheckBox: =>
    if @checkTimer
      clearInterval @checkTimer
      @checkTimer = null
    if @$checkbox.attr 'checked'
      @checkTimer = setInterval @checkNextOnair, @config.autoJumpIntervalSec * 1000
    return

  onToggleButton: (event) =>
    className = @$toggleButton.attr 'class'
    map = AutoJump.OPENTAB_STATUS
    for own key, value of map
      if value.className is className
        @saveOpentabStatus value.next
        @showOpentabStatus value.next
        break

  # === Auto jump functions.
  checkNextOnair: =>
    if @isCurrentLiveClosed
      @jumpNextOnair()
      return

    LOGGER.info "HTTP Request(checkNextOnair): #{AutoJump.LIVE_CHECK_URL + @currentLiveId}"

    httpRequest AutoJump.LIVE_CHECK_URL + @currentLiveId, (response) =>
      $res = $($.parseHTML (transIMG response))
      errorcode = $res.find('error code').text()
      LOGGER.info "errorcode = #{errorcode}"
      # full/commingsoon/closed/notfound/timeshift_ticket_exhaust
      if errorcode is 'closed'
        # Off-air
        @isCurrentLiveClosed = true
        @jumpNextOnair()
      else if errorcode in ['notfound', 'timeshift_ticket_exhaust']
        if @checkTimer
          clearInterval @checkTimer
          @checkTimer = null
        @$checkbox.attr 'checked', false
      return
    return

  jumpNextOnair: ->
    LOGGER.info "HTTP Request(jumpNextOnair): #{@commuUrl}"
    httpRequest @commuUrl, (response) =>
      $res = $($.parseHTML (transIMG response))

      nowLiveUrl = $res.find('#now_live a').first().attr 'href'
      unless nowLiveUrl
        # Off-air
        LOGGER.info 'Off-air'
        return

      # On-air
      LOGGER.info "On-air: nowLiveUrl = #{nowLiveUrl}"
      nowLiveId = nowLiveUrl.match(/watch\/(lv\d+)/)[1]
      LOGGER.info "nowLiveId = #{nowLiveId}"
      if nowLiveId isnt @currentLiveId
          # Move to new live page.
          location.replace nowLiveUrl
      return
    return

  # === Opentab functions.
  isJoinCommunity: ->
    if @pageType is 'live'
      return $('span.favorite,span.favorite_ch_link').length is 0
    else if @pageType is 'gate'
      return $('.join a').length is 0
    return false

  renderOpentabStatus: ->
    html = '<a href="javascript:void(0)">自動タブOPEN ('
    html += @commuId
    html += '): &nbsp;<span>???</span></a>'
    @$el.find('div').append html
    @$toggleButton = @$el.find 'a'
    @$toggleButton.on 'click', @onToggleButton
    chrome.runtime.sendMessage({
        'target' : 'config',
        'action' : 'getOpentabStatus',
        'args'   : [@commuId]
      }, (response) =>
        status = response.res
        @showOpentabStatus status
        return
    )
    return

  saveOpentabStatus: (status) ->
    chrome.runtime.sendMessage({
        'target' : 'config',
        'action' : 'setOpentabStatus',
        'args'   : [@commuId, status]
      }, (response) =>
        return
    )
    return

  showOpentabStatus: (status) ->
    LOGGER.log "Show openttab status: #{status}"
    map = AutoJump.OPENTAB_STATUS
    msg = map[status].msg
    className = map[status].className
    @$toggleButton.attr 'class', className
    @$toggleButton.find('span').html msg
    return


class AutoEnter extends Base
  # === Class variables.
  @CHECKBOX: """
  <div id="auto-enter">
    <div>
      <input type="checkbox" name="auto-enter" /> 自動入場
    </div>
  </div>
  """

  # === Properties.
  $checkbox: null

  init: ->
    LOGGER.info 'Start auto enter.'
    super()
    $('#bn_gbox').after AutoEnter.CHECKBOX
    @$checkbox = $('#auto-enter input:checkbox')
    if @config.enableAutoEnter
      @$checkbox.attr 'checked', true
    return true

  addEventListeners: ->
    $('#gates').on 'DOMSubtreeModified', @onDOMSubtreeModifiedGates
    return

  onDOMSubtreeModifiedGates: =>
    LOGGER.info "Run auto enter: #{new Date()}"
    if @$checkbox.attr 'checked'
      # httpRequest @liveCheckUrl + @currentLiveId, (response) =>
      #   # location.reload true
      #   LOGGER.info 'Request for live check is succescc'
      location.reload true
    return


class History extends Base
  init: ->
    LOGGER.info 'Start history.'
    super()
    if $('#gates').length or $('#bn_gbox .kaijo').length
      data = @getLiveDataForGate()
    else
      data = @getLiveDataForWatch()
    data.accessTime = (new Date).getTime()
    unless @validate data
      LOGGER.error "Validate error", data
      return false
    @saveHistory data
    return true

  getLiveDataForGate: ->
    LOGGER.info "Saving history in gate page: #{@currentLiveId}"
    data = {}
    data.id = @currentLiveId
    data.title = $('.infobox h2 > span:first').text().trim()
    data.link = Base.LIVE_URL + data.id
    time = $('#bn_gbox .kaijo').text().trim()
    timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*開場:(\d\d:\d\d).*開演:(\d\d:\d\d)/
    if timeMatch
      yearStr = timeMatch[1]
      dateStr = timeMatch[2]
      openTimeStr = timeMatch[3]
      startTimeStr = timeMatch[4]
      data.openTime = str2date yearStr, dateStr, openTimeStr
      data.startTime = str2date yearStr, dateStr, startTimeStr
    data.thumnail = $('#bn_gbox > .bn > meta').attr 'content'
    endTimeMatch = $('#bn_gbox .kaijo').next().text()
      .match /この番組は(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d)/
    if endTimeMatch
      endYearStr = endTimeMatch[1]
      endDateStr = endTimeMatch[2]
      endTimeStr = endTimeMatch[3]
      data.endTime = str2date endYearStr, endDateStr, endTimeStr
    return data

  getLiveDataForWatch: ->
    LOGGER.info "Saving history in live page: #{@currentLiveId}"
    data = {}
    data.id = @currentLiveId
    data.link = Base.LIVE_URL + data.id
    data.title = $('#watch_title_box .box_inner .title').attr('title').trim()
    data.thumnail = $('#watch_title_box .box_inner img:first').attr 'src'
    time = $('#watch_tab_box .information').first().text().trim().replace(/：/g, ':')
    timeMatch = time.match /(\d\d\d\d)\/(\d\d\/\d\d).*(\d\d:\d\d).*開場.*(\d\d:\d\d)開演/
    if timeMatch
      yearStr = timeMatch[1]
      dateStr = timeMatch[2]
      openTimeStr = timeMatch[3]
      startTimeStr = timeMatch[4]
      data.openTime = str2date(yearStr, dateStr, openTimeStr).getTime()
      data.startTime = str2date(yearStr, dateStr, startTimeStr).getTime()
    return data

  validate: (data) ->
    unless data
      LOGGER.error "data is null #{@currentLiveId}"
      return false
    unless data.title
      LOGGER.error "Title does not exist #{@currentLiveId}"
      return false
    unless data.link
      LOGGER.error "Link does not exist #{@currentLiveId}"
      return false
    unless data.thumnail
      LOGGER.error "Thumnail does not exist #{@currentLiveId}"
      return false
    return true

  saveHistory: (data) ->
    LOGGER.info "Save history", data
    chrome.runtime.sendMessage({
        'target' : 'history',
        'action' : 'saveHistory',
        'args'   : [data]
      }, (response) =>
        res = response.res
        LOGGER.info "Saved history", res
        return
    )
    return


# === Initialize ===
preInit = ->
  if $('#zero_lead').length
    LOGGER.info 'No avairable nico_arena on Harajuku.'
    return

  # encodeURI(decodeURI(location.href))
  if location.href.match /http[s]?:\/\/live\.nicovideo\.jp\/gate\/.*/
    LOGGER.info 'This page is for the gate.'
    watchUrl = location.href.replace /\/gate\//, '/watch/'
    location.replace watchUrl
    return

  chrome.runtime.sendMessage({
      'target' : 'config',
      'action' : 'getConfigForAutoJump',
      'args'   : []
    }, (response) =>
      config = response.res
      # Initialize
      init config
      return
  )
  return


autoJump = null
autoEnter = null
history = null
init = (config) ->
  if config.enableHistory
    history = new History config
  if $('#gates').length
    autoEnter = new AutoEnter config
  else
    autoJump = new AutoJump config


# Main
preInit()
