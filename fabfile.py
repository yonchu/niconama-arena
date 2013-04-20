#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

from fabric.api import local, task, lcd
from fabric.colors import green


@task
def build():
    build_tmpl()
    print(green('Compile main coffeescript/less files with grunt...'))
    local('grunt build')


@task
def build_tmpl():
    print(green('Compile coffeescript files for template...'))
    local('coffee -clb scripts/compile-tmpl.coffee')
    local('coffee -clb src/templates/popup-tmpl.coffee')

    print(green('Compile templates...'))
    local('node scripts/compile-tmpl.js')


@task
def release():
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
