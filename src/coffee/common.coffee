@exports = exports ? window ? @

do (exports=@) ->
  exports.namespace = (namespace, noConflict=true, fn=null) ->
    tokens = namespace.split '.'
    parent = null
    here = exports
    for token in tokens
      parent = here
      if parent.hasOwnProperty token
        prev = parent[token]
        if noConflict
          here = prev
        else
          here = parent[token] = {}
      else
        here = prev = parent[token] = {}
      here.noConflict = do (parent=parent, token=token, prev=prev) ->
        return ->
          parent[token] = prev
          return @
    if fn?
      klass = fn()
      here[klass.name] = klass
    return here


  # === common ===
  common = exports.namespace 'CHEX.common'

  # log/info/warn/error
  # dir/time/timeEnd/trace/assert
  common.Logger = class Logger
    @LEVEL:
      ALL: -99,
      DEBUG: -1,
      LOG: -1,
      INFO: 0,
      WARN: 1,
      ERROR: 2,
      OFF: 99

    @DEFAULT_LEVEL: Logger.LEVEL.INFO

    constructor: (level) ->
      @level = if isNaN level then common.Logger.DEFAULT_LEVEL else level
      console.log "[Logger] Create Logger: level = #{@getLevelName @level}"
      methods = @make()
      console.log "[Logger] Available(bind): #{methods.bind.join ', '}"
      console.log "[Logger] Available(apply): #{methods.apply.join ', '}"

    getLevelName: (level) ->
      for name, val of common.Logger.LEVEL
        return name if level is val
      throw Error "Invalid level #{level}"

    make: ->
      methods = {bind: [], apply:[]}
      for key of console
        l = common.Logger.LEVEL[key.toUpperCase()]
        l = common.Logger.LEVEL.OFF unless l?
        if l >= @level
          if console[key].bind
            methods.bind.push key
            common.Logger::[key] = ((k) ->
              console[k].bind console
            )(key)
          else if console[key].apply
            methods.apply.push key
            common.Logger::[key] = ((k) ->
              console[k].apply console, arguments
            )(key)
          else
            continue
        else
          common.Logger::[key] = ->
      return methods

  LOGGER = new common.Logger

  common.str2date = (year, date, time) ->
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


  common.date2String = (date) ->
    mm = date.getMonth() + 1
    dd = date.getDate()
    hh = date.getHours()
    min = date.getMinutes()
    mm = '0' + mm if mm < 10
    dd = '0' + dd if dd < 10
    hh = '0' + hh if hh < 10
    min = '0' + min if min < 10
    "#{mm}/#{dd} #{hh}:#{min}"


  common.remainingTime = (now, targetTime) ->
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


  common.transIMG = (html) ->
    return html.replace /<img([^>]+)>/g, '<imgx$1>'


  common.httpRequest = (url, callback) ->
    xhr = new XMLHttpRequest
    xhr.onreadystatechange = ->
      if xhr.readyState is 4
        callback xhr.responseText
      return
    xhr.open 'GET', url, true
    xhr.send()
    return


  common.AjaxEx = class AjaxEx
    @RETRY_STATUS: ['0', '500']

    # === Constructor.
    constructor: (@retryIntervalSec=5, @maxRetryCount=2) ->
      @retryCount = 0
      @request = null
      @defer = null

    # === Public methods.
    @ajax: (request) ->
      return new common.AjaxEx().ajax request

    ajax: (@request) ->
      @defer = $.Deferred()
      $.ajax(@request).then @_onDone, @_onFail
      return @defer.promise()

    # === Helper methods.
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
        throw Error "Max retry count over: retryCount=#{@retryCount}"
      unless status in common.AjaxEx.RETRY_STATUS
        throw Error "Unknown status: status=#{status}"
      @retryCount += 1
      LOGGER.info "[AjaxEx] Retry #{@retryCount}"
      @defer.notify @retryCount
      @_sleep(
        @retryIntervalSec
      ).then(=>
        $.ajax(@request).then @_onDone, @_onFail
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


  common.EventDispatcher = class EventDispatcher
    constructor: ->
      @events = {}

    addEventListener: (event, callback, callbackObj) ->
      @events[event] = [] unless @events.hasOwnProperty event
      @events[event] or= []
      @events[event].push(
        callback: callback
        callbackObj: callbackObj
      )
      return @

    removeEventListener: (event, callback, callbackObj) ->
      if @events.hasOwnProperty event
        for l in @events[event]
          if l.callback is callback and l.callbackObj is callbackObj
            @events[event].splice i, 1
      return @

    dispatchEvent: (event, data) ->
      if @events.hasOwnProperty event
        data = data or []
        # Array.isArray is ES5 function.
        data = [data] unless Array.isArray data
        data.currentTarget = @
        for l in @events[event]
          l.callback.apply l.callbackObj, data
          setTimeout @_call.bind(@, l.callback, l.callbackObj, data), 0
      return @

    _call: (callback, callbackObj, data) ->
      callback.apply callbackObj, data
      return


  common.getLiveIdFromUrl = (url) ->
    url.match(/(watch|gate)\/(lv\d+)/)?[2]


  common.changeGate2Watch = (url) ->
    return url.replace(/\?.*/, '').replace /\/gate\//, '/watch/'


  common.notification = {}

  common.notification.timeMsg = (openTime, startTime) ->
    ret = {}
    openTimeStr = common.date2String openTime if openTime
    startTimeStr = common.date2String startTime if startTime
    if openTimeStr
      ret.openTime = "開場: #{openTimeStr}"
      ret.startTime = "開演: #{startTimeStr}"
    else if startTimeStr
      ret.startTime = "開始: #{startTimeStr}"
    return ret

  common.notification.statusMsg = (openTime, startTime, endTime, now, beforeTimeSec=300) ->
    ret = {}
    openTime = openTime?.getTime()
    startTime = startTime?.getTime()
    endTime = endTime?.getTime()
    if endTime and now > endTime
      # closed
      ret.text = '放送は終了しました'
      ret.flag = 'closed'
    else if startTime
      if now > startTime
        # on-air
        ret.text = 'ただいま放送中'
      else if openTime and now > openTime
        # open gate
        ret.text = 'まもなく放送開始'
      else if openTime and now > openTime - beforeTimeSec * 1000
        # before open gate
        ret.text = 'まもなく開場'
    return ret
