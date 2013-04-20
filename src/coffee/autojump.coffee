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

  # === Constructor.
  constructor: (@config) ->
    LOGGER.info 'config: ', @config
    @init()
    @addEventListeners()

  init: ->
    @currentLiveId = @getLiveIdFromUrl location.href
    unless @currentLiveId
      commuId = @getCommuIdFromUrl location.href
      if commuId
        LOGGER.info "commuId = #{commuId}"
        url = $('meta[property="og:url"]').attr 'content'
        @currentLiveId = @getLiveIdFromUrl url
    unless @currentLiveId
      throw new Error "Not found currentLiveId"
    LOGGER.info "currentLiveId = #{@currentLiveId}"
    return

  # === Event listeners.
  addEventListeners: ->

  getLiveIdFromUrl: (url) ->
    url.match(/(watch|gate)\/(lv\d+)/)?[2]

  getCommuIdFromUrl: (url) ->
    url.match(/(watch|gate)\/(co\d+)/)?[2]


class AutoJump extends Base
  # === Class variables.
  @CHECKBOX: """
  <div id="auto-jump">
    <div>
      <input type="checkbox" name="auto-jump" /> 自動枠移動
    </div>
  </div>
  """

  # === Properties.
  $checkbox: null
  commuUrl: null
  isCurrentLiveClosed: false
  checkTimer: null


  init: ->
    LOGGER.info 'Start auto jump.'
    super()
    @commuUrl = $('#commu_info a').first().attr 'href'
    # Insert checkbox element.
    if @commuUrl
      # On-air or time-shift.
      $('#watch_player_top_box').after AutoJump.CHECKBOX
    else
      # Off-air.
      @commuUrl = $('.smn a').first().attr 'href'
      unless @commuUrl
        LOGGER.info 'No avairable on official live.'
        return
      # Change css.
      $('#bn_gbox').after AutoJump.CHECKBOX
      $autoJumpDiv = $('#auto-jump').addClass 'auto-jump-gate'

    @$checkbox = $('#auto-jump input:checkbox')

    LOGGER.info "commuUrl = #{@commuUrl}"

    # Check next on-air.
    if @config.enableAutoJump
      @$checkbox.attr 'checked', true
      @checkNextOnair()
      @checkTimer = setInterval @checkNextOnair, @config.autoJumpIntervalSec * 1000
    return


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


  # === Action functions.
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
    return

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
      return
    @saveHistory data
    return

  getLiveDataForGate: ->
    LOGGER.info "getLiveDataForGate() #{@currentLiveId}"
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
    LOGGER.info "getLiveDataForWatch() #{@currentLiveId}"
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
    chrome.extension.sendRequest({
        'target' : 'history',
        'action' : 'saveHistory',
        'args'   : [data]
      }, (response) ->
        res = response.res
        LOGGER.info "Saved history", res
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

  chrome.extension.sendRequest({
      'target' : 'config',
      'action' : 'getConfigForAutoJump',
      'args'   : []
    }, (response) ->
      config = response.res
      # Initialize
      init config
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
