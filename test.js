/*!
 * parse-git-log <https://github.com/tunnckoCore/parse-git-log>
 *
 * Copyright (c) Charlike Mike Reagent <@tunnckoCore> (http://i.am.charlike.online)
 * Released under the MIT license.
 */

/* jshint asi:true */

'use strict'

const test = require('mukla')
const parseGitLog = require('./index')

test('parse-git-log', function (done) {
  parseGitLog()
  done()
})
