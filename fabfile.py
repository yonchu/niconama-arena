#!/usr/bin/env python
# -*- coding: utf-8 -*-

from __future__ import print_function

from fabric.api import local, task, lcd, abort
from fabric.colors import green, yellow

import json


VER_UP_SRC = 'contents/manifest.json'
VER_UP_DEST = ['package.json', 'bower.json']


def get_version(fpath, is_abort=True):
    version = None
    with open(fpath) as f:
        j = json.load(f)
        version = j['version']
    if not version:
        if is_abort:
            abort('Version is not found in {}'.format(fpath))
    return version


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
def build_tmpl():
    print(green('Compile coffeescript files for template...'))
    local('coffee -cb scripts/compile-tmpl.coffee')
    local('coffee -cb src/templates/popup-tmpl.coffee')

    print(green('Compile templates...'))
    local('node scripts/compile-tmpl.js')


@task
def sync_version():
    print(green('Sync version (using {}) ...'.format(VER_UP_SRC)))
    new_ver = get_version(VER_UP_SRC)
    for fpath in VER_UP_DEST:
        old_ver = get_version(fpath)
        if old_ver == new_ver:
            continue
        print(yellow('Change version from {} to {} in {}.'
                     .format(old_ver, new_ver, fpath)))
        local('sed -i "" -e \'s/"version": *"\([0-9.]*\)"/'
              + '"version": "{}"/\' {}'.format(new_ver, fpath))


@task
def release():
    sync_version()
    build_tmpl()
    print(green('Compile main coffeescript/less files with grunt...'))
    local('grunt build')
    print(green('Remove *.map'))
    local('grunt clean:jsmap')
    print(green('Create release archive...'))
    with lcd('contents'):
        local('zip -r ../release.zip ./')


@task
def git_release():
    print(green('git commit & tag ...'))
    version = get_version(VER_UP_SRC)
    local('git commit -a -v -m "Release ver.{}"'.format(version))
    git_tag = 'git tag -a "{0}" -m "Release ver.{0}"'.format(version)
    local(git_tag)
    # local('git push origin --tags')


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
    local('rm -f release.zip')
