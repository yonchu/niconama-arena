#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

from fabric.api import local, task, lcd, abort
from fabric.colors import green, yellow

import json


MANIFEST = 'contents/manifest.json'
CONFIG_FILES = ['package.json', 'component.json']


@task
def install():
    print(green('Install node_modules with npm ...'))
    local('npm install')
    print(green('Install components with bower ...'))
    local('bower install')


@task
def build():
    build_tmpl()
    print(green('Compile main coffeescript/less files with grunt...'))
    local('grunt build')


@task
def bump_up_version():
    print(green('Bump up version number ...'))
    version = None
    with open(MANIFEST) as f:
        j = json.load(f)
        version = j['version']
    if not version:
        abort('Version is not found in {}'.format(MANIFEST))
    print(yellow('Change version to "{}".'.format(version)))
    for fname in CONFIG_FILES:
        local('sed -i "" -e \'s/"version": *"\([0-9.]*\)"/'
              + '"version": "{}"/\' {}'.format(version, fname))


@task
def build_tmpl():
    print(green('Compile coffeescript files for template...'))
    local('coffee -clb scripts/compile-tmpl.coffee')
    local('coffee -clb src/templates/popup-tmpl.coffee')

    print(green('Compile templates...'))
    local('node scripts/compile-tmpl.js')


@task
def release():
    bump_up_version()
    build_tmpl()
    print(green('Compile main coffeescript/less files with grunt...'))
    local('grunt build')
    print(green('Remove *.map'))
    local('grunt clean:jsmap')
    print(green('Create release archive...'))
    with lcd('contents'):
        local('zip -r ../niconama-arena.zip ./')


@task
def clean():
    print(green('Clean with grunt...'))
    local('grunt clean:compress clean:jsmap')


def clean_all():
    print(green('Clean with grunt...'))
    local('grunt clean')
    print(green('Clean *.pyc, node_modules...'))
    local('rm -r *.pyc node_modules')
    print(green('Remove release archive...'))
    local('rm -f niconama-arena.zip')
