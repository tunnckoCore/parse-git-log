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

test(() => {
  // parseGitLog('test-not-existing')
  parseGitLog()
    .on('commit', (commit) => console.log('commit event:', commit.id, commit.data.hash))
    .on('data', (commit) => console.log('  data event:', commit.id, commit.data.hash))
    .once('error', (err) => console.log('error:', err))
    .once('finish', () => console.log('finish done'))
    .once('close', (code, b) => console.log('close done:', code, b))
})
