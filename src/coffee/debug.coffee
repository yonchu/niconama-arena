# log/info/warn/error
# dir/time/timeEnd/trace/assert
class Logger
  @LEVEL:
    ALL: -99,
    DEBUG: -1,
    LOG: -1,
    INFO: 0,
    WARN: 1,
    ERROR: 2,
    OFF: 99

  @DEFAULT_LEVEL: Logger.LEVEL.ALL

  constructor: (level) ->
    @level = if isNaN level then Logger.DEFAULT_LEVEL else level
    console.log "Create Logger: level = #{@getLevelName @level}"
    methods = @make()
    console.log "Available(bind): #{methods.bind.join ', '}"
    console.log "Available(apply): #{methods.apply.join ', '}"

  getLevelName: (level) ->
    for name, val of Logger.LEVEL
      return name if level is val
    throw new Error "Invalid level #{level}"

  make: ->
    methods = {bind: [], apply:[]}
    for key of console
      l = Logger.LEVEL[key.toUpperCase()]
      l = Logger.LEVEL.OFF unless l?
      if l >= @level
        if console[key].bind
          methods.bind.push key
          Logger::[key] = ((k) ->
            console[k].bind console
          )(key)
        else if console[key].apply
          methods.apply.push key
          Logger::[key] = ((k) ->
            console[k].apply console, arguments
          )(key)
        else
          continue
      else
        Logger::[key] = ->
    return methods

# logger = new Logger
# logger = new Logger Logger.LEVEL.INFO
