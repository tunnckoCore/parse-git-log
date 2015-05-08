/**
 * parse-git-log <https://github.com/tunnckoCore/parse-git-log>
 *
 * Copyright (c) 2015 Charlike Mike Reagent, contributors.
 * Released under the MIT license.
 */

'use strict'

// var test = require('assertit')
var parseGitLog = require('./index')

// test('parse-git-log:', function () {
//   // body
// })

var p = parseGitLog({cwd: '../gulp-micromatch'})

p.then(function (json) {
  console.log(JSON.stringify(json, 0, 2))
})
.catch(function _catch (err) {
  console.log('PROMISE ERR:', err)
})
