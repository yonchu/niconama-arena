@exports = exports ? window ? this ? {}

@namespace = (namespace, fn=null) ->
  tokens = namespace.split('.')
  parent = exports
  for token in tokens
    prev = parent[token]
    here = parent[token] = {}
    here.noConflict = ((parent, token, prev) ->
      return ->
        parent[token] = prev
        return @
    )(parent, token, prev)
  if fn?
    klass = fn()
    here[klass.name] = klass
  return here

# Save the previous value.
previousChEx = exports.ChEx
# The top-level namespace.
ChEx = exports.ChEx = {}
ChEx.noConflict = ->
  exports.ChEx = previousChEx
  return @

# === Common ===
Common = ChEx.Common = {}

Common.changeGate2Watch = (url) ->
  return url.replace(/\?.*/, '').replace /\/gate\//, '/watch/'

Common.str2date = (year, date, time) ->
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
