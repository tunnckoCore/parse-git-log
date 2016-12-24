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

test('parseGitLog() - streaming', (done) => {
  // parseGitLog('test-not-existing')
  parseGitLog()
    .on('commit', (commit) => console.log('commit event:', commit.id, commit.data.hash))
    .on('data', (commit) => console.log('  data event:', commit.id, commit.data.hash))
    .once('error', done)
    .once('finish', done)
})

test('parseGitLog.promise()', (done) => {
  parseGitLog.promise().then((commits) => {
    test.strictEqual(commits.length > 0, true)
    done()
  }, done)
})
