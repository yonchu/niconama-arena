fs = require 'fs'
_  = require 'underscore'
tmpl = require '../src/templates/popup-tmpl'

data = 'var TMPL = {};\n'

for name of tmpl
  data += "TMPL['#{name}'] = #{_.template(tmpl[name]).source};\n"

fs.writeFileSync 'contents/js/popup-tmpl.js', data
