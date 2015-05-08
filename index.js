/**
 * parse-git-log <https://github.com/tunnckoCore/parse-git-log>
 *
 * Copyright (c) 2015 Charlike Mike Reagent, contributors.
 * Released under the MIT license.
 */

'use strict'

var fs = require('fs')
var path = require('path')
var runCommand = require('exec-cmd')
var handleCallback = require('handle-callback')

var hybridify = runCommand.hybridify
var stat = hybridify(fs.stat)
var cwd = process.cwd()

module.exports = function parseGitLog (options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = null
  }
  callback = callback || function noop () {}
  options = typeof options === 'object' ? options : {}

  var fp = resolve(options)
  var promise = stat(fp)
  .then(function () {
    return fp
  })
  .then(process.chdir)
  .then(gitLog)
  .then(parseLog)
  .then(restoreCwd)

  // preserve `hybrid`-ing
  promise.hybridify = hybridify

  return handleCallback(promise, callback)
}

function resolve (options) {
  var cwd = options.cwd ? path.resolve(options.cwd) : process.cwd()
  return path.resolve(cwd, options.path || '.git')
}

function gitLog () {
  return runCommand('git log')
}

function restoreCwd (json) {
  process.chdir(cwd)
  return json
}

function parseLog (results) {
  var arr = results[0].split('\n\n').filter(Boolean)
  var len = arr.length
  var i = 0

  var data = []
  var log = {}

  while (i < len) {
    var value = arr[i++]

    if (value.charAt(0) !== ' ') {
      log = metadata(log, value)
      data.push(log)
      log = {}
    } else {
      log.message = value.trim()
    }
  }

  return data
}

function metadata (log, value) {
  var lines = value.split('\n')
  log.commit = lines[0].split(' ')[1]
  log.author = lines[1].split(':')[1].trim()
  log.date = lines[2].slice(8)
  return log
}
