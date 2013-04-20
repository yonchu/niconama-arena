fs    = require 'fs'
print = require 'sys'
util  = require 'util'
{spawn, exec} = require 'child_process'

option '-o', '--output [DIR]', 'Output directory.'
option '-t', '--target [DIR]', 'Compile target directory.'

BARE_LIST = [
  'autojump.coffee',
  'background.coffee'
  'debug.coffee'
]

DEF_TARGET_DIR = 'src/coffee'
DEF_OUTPUT_DIR = 'contents/js'


fileCopy = (targetDir, outputDir) ->
  fs.readdir targetDir, (err, filelist) ->
    for filename in filelist
      if /.*\.coffee$/.test filename
        console.log "Copy: #{targetDir}/#{filename} to #{outputDir}/#{filename}"
        rio = fs.createReadStream "#{targetDir}/#{filename}"
        wio = fs.createWriteStream "#{outputDir}/#{filename}"
        util.pump rio, wio
  return


spawnCoffee = (options, callback=null) ->
  coffee = spawn 'coffee', options
  coffeeCallback coffee, callback


coffeeCallback = (coffee, callback=null) ->
  coffee.stderr.on 'data', (data) ->
    process.stderr.write data.toString()
  coffee.stdout.on 'data', (data) ->
    print data.toString()
  coffee.on 'exit', (code) ->
    callback?() if code is 0


buildFiles = (targetDir, filelist, outputDir) ->
  for filename in filelist
    if /.*\.coffee$/.test filename
      targetFile = "#{targetDir}/#{filename}"
      console.log "Build: #{targetFile} to #{outputDir}/"
      if filename in BARE_LIST
        spawnCoffee ['-clb', '-o', outputDir, targetFile]
      else
        spawnCoffee ['-cl', '-o', outputDir, targetFile]


# Build task.
task 'build', "Build coffeescript", (options) ->
  targetDir = options.target or DEF_TARGET_DIR
  outputDir = options.output or DEF_OUTPUT_DIR
  fs.readdir targetDir, (err, filelist) ->
    buildFiles(targetDir, filelist, outputDir)


# Watch task.
task 'watch', "Watch coffeescript", (options) ->
  targetDir = options.target or DEF_TARGET_DIR
  outputDir = options.output or DEF_OUTPUT_DIR
  console.log "Watching coffeescript: #{targetDir} to #{outputDir}"
  spawnCoffee ['-cw', '-o', targetDir, outputDir]


# Copy task.
task 'copy', "Copy coffeescript", (options) ->
  targetDir = options.target or DEF_TARGET_DIR
  outputDir = options.output or DEF_OUTPUT_DIR
  fileCopy(targetDir, outputDir)
