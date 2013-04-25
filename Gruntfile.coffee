module.exports = (grunt) ->
  srcCoffeeDir = 'src/coffee/'
  destJsDir = 'contents/js/'
  compressJsDir = 'contents/compress/'

  srcLessDir = 'src/less/'
  destCssDir = 'contents/css/'

  # Specify relative path from "src/coffee/".
  bare_list = [
    'autojump.coffee',
    'background.coffee',
    'debug.coffee'
  ]
  reTrimCwd = new RegExp '^src/coffee/'

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'

    meta:
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> -' +
        ' <%= grunt.template.today("yyyy-mm-dd") %>\n' +
        ' * <%= pkg.repository.url %>\n' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %>' +
        ' Yonchu; Licensed MIT\n' +
        ' */'

    coffee:
      compile:
        options:
          sourceMap: true
        files: [
            expand: true,
            cwd: srcCoffeeDir,
            src: ['**/*.coffee'],
            dest: destJsDir,
            ext: '.js'
            filter: (path) ->
              noCwdPath = path.replace reTrimCwd, ''
              return not (noCwdPath in bare_list)
        ]
      compileBare:
        options:
          bare: true,
          sourceMap: true
        files: [
            expand: true,
            cwd: srcCoffeeDir,
            src: bare_list,
            dest: destJsDir,
            ext: '.js'
        ]

    less:
      development:
        files: [
            expand: true,
            cwd: srcLessDir,
            src: ['**/*.less'],
            dest: destCssDir,
            ext: '.css'
        ]
      production:
        options:
          yuicompress: true
        files: [
            expand: true,
            cwd: srcLessDir,
            src: ['**/*.less'],
            dest: destCssDir,
            ext: '.css'
        ]

    uglify:
      compress_target:
        options:
          sourceMap: (fileName) ->
            fileName.replace /\.js$/, '.js.map'
          banner: '<%= meta.banner %>'
        files: [
            expand: true,
            cwd: destJsDir,
            src: ['**/*.js'],
            dest: compressJsDir,
            filter: (path) ->
              return not (path.match 'js/lib/vendor/')
        ]

    watch:
      coffee:
        files: ["#{srcCoffeeDir}**/*.coffee"],
        tasks: ['coffee']
      less:
        files: ["#{srcLessDir}**/*.less"],
        tasks: ['less:development']

    jshint:
      options: {
        jshintrc: '.jshintrc'
      },
      all:
        src: [
          "#{destJsDir}**/*.js"
        ],
        filter: (path) ->
          return false if path.match '/lib/'
          return false if path is 'contents/js/popup-tmpl.js'
          return true

    clean:
      js:
        src: [
          "#{destJsDir}**/*.js",
        ],
        filter: (path) ->
          return not (path.match '/lib/')
      jsmap:
        src: [
          "#{destJsDir}**/*.map"
        ],
        filter: (path) ->
          return not (path.match '/lib/vendor/')
      compress:
        src: [
          "#{compressJsDir}**/*.js",
          "#{compressJsDir}**/*.map",
          "#{compressJsDir}lib"
        ]
      css:
        src: [
          "#{destCssDir}**/*.css"
        ]

  # Load tasks.
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-less'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-clean'

  # Register custom tasks.
  grunt.registerTask 'build', ['coffee', 'less:development']
  grunt.registerTask 'release', ['coffee', 'uglify', 'less:production']

  # Register default task.
  grunt.registerTask 'default', ['build']
