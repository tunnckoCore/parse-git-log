/*!
 * parse-git-log <https://github.com/tunnckoCore/parse-git-log>
 *
 * Copyright (c) Charlike Mike Reagent <@tunnckoCore> (http://i.am.charlike.online)
 * Released under the MIT license.
 */

'use strict'

const path = require('path')
const vfile = require('vfile')
const spawn = require('cross-spawn')
const split2 = require('split2')
const through2 = require('through2')

/**
 * Helpers
 */

const delimParts = '~&>8~#@~8<&~'
const delimiter = '~!---------------------- >8~ ----------------------!~'
const formats = [
  '%P', '%H', '%at', '%b', '%T',
  '%an', '%ae', '%ar', '%aI',
  '%s', '%D'
].join(delimParts)

/**
 * > Parses an advanced `git log` output using
 * streams. Allows custom `plugin` function to be passed
 * to update/modify the commit object (which is [vfile][]).
 * It also emits `data` and `commit` events, so you may not
 * need such `plugin` function. But in case you want to do some
 * more parsing and interesting stuff, this `plugin` function
 * allows you to do cool things. That `plugin` function is called
 * with "transform stream" context and this is also passed as
 * first argument. When you return a function from that plugin,
 * it is called with [vfile][] object (commit object) as first argument.
 *
 * **Example**
 *
 * ```js
 * const parseGitLog = require('parse-git-log')
 *
 * // optionally pass `cwd` as first argument
 * parseGitLog()
 *   .once('error', (err) => console.error('err:', err))
 *   .on('commit', (commit) => console.log('commit:', commit))
 *   .once('finish', () => console.log('done'))
 * ```
 *
 * @emits `commit` passed with [vfile][] object for each commit
 * @emits `data` same as `commit` event; passed with [vfile][] object for each commit
 * @param  {String} `[cwd]` path to where is the `.git` folder; defaults to `process.cwd()`
 * @param  {Function} `[plugin]` smart plugin function, passed with `stream, file` signature,
 *                               if returns another function, that function is passed
 *                               with `file` object which represent each commit object.
 * @return {Stream} transform stream, using [through2][] behind
 * @api public
 */

const parseGitLog = module.exports = function parseGitLog (cwd, plugin) {
  cwd = typeof cwd === 'string' ? cwd : process.cwd()
  plugin = typeof plugin === 'function' ? plugin : () => () => {}

  const format = '--format=' + formats + delimiter

  let id = 0
  let stream = through2.obj()

  const gitDir = path.resolve(cwd, '.git')
  const proc = spawn('git', ['--git-dir=' + gitDir, 'log', format])

  // transform command output chunks to virtual "files"
  // with useful data on it
  const transform = through2.obj(function (chunk, enc, callback) {
    chunk = chunk.toString().trim()

    // we don't want to process empty chunks
    if (!chunk.length) {
      return callback()
    }

    // create virtual "file" from each chunk (for each commit)
    const file = createFile(delimParts, chunk)
    file.id = id++

    // allow `file.push(file)`, `this.push(file)`
    // and `stream.push(file)`, so from everywhere you want
    file.push = stream.push.bind(stream)

    // call plugin
    const fn = plugin.call(stream, stream, file)
    if (typeof fn === 'function') {
      // call the smart plugin
      fn.call(file, file)
    }

    // emit `data` and `commit` events
    stream.emit('commit', file)
    stream.push(file)
    callback()
  })

  // get errors (in most cases)
  let stderr = ''
  proc.stderr.on('data', function (buf) {
    stderr += buf.toString().trim()
  })

  // done callback on child_proc close/error events
  function done (err, c) {
    // save originals
    let a = err
    let b = c

    // cleanup
    proc.removeListener('close', done)
    proc.removeListener('error', done)

    // close can give us error code
    let code = typeof err === 'number' ? err : err && err.code

    // if first arg is zero we are fine
    if (code === 0) {
      stream.emit('finish')

      // close event is always last,
      // and always fired
      stream.emit('close', a, b)
      return
    }

    // if first arg is error passthrough
    if (typeof err === 'object') {
      stream.emit('error', err)

      // close event is always last,
      // and always fired
      stream.emit('close', a, b)
      return
    }

    // otherwise create error from child_proc's stderr
    err = new Error(stderr)
    // set err code if we have it from close
    err.code = code
    stream.emit('error', err)

    // close event is always last,
    // and always fired
    stream.emit('close', a, b)
  }

  // error from main `proc` is rarely fired
  // I even not sure enough (we have proc.stderr for this?),
  // but we should try to handle it
  proc.once('error', done)

  // useful to get the code and create
  // new error object combined with the string/buffer
  // that comes from `proc.stderr`
  proc.once('close', done)

  // split and transform
  // the command output
  proc.stdout
    .pipe(split2(delimiter))
    .pipe(transform)

  return stream
}

/**
 * > Creates a virtual file ([vfile][]) chunk metadata,
 * which represents the commit object,
 * full with useful metadata for it.
 *
 * @param  {String} `delimParts`
 * @param  {String} `chunk`
 * @return {Object} virtual file, [vfile][]
 */

const createFile = (delimParts, chunk) => {
  let str = chunk
  str = str.charAt(1) === ')' ? str.slice(2) : str
  str = str.charAt(str.length - 2) === '<'
    ? str.slice(0, str.length - 2)
    : str

  const m = str.split(delimParts)
  const parents = m[0].length ? m[0].split(' ') : []
  const body = m[3] && m[3].trim()
  const contents = body && body.length ? m[9] + '\n\n' + body : m[9]

  return vfile({
    path: m[1] + '-' + m[2],
    contents: contents,
    data: {
      // chuck which is coming directly
      // from `git log` command
      chunk: chunk,

      // parsed parts by special delimiter
      chunks: m,

      // from header can get `type`, scope, etc
      // from body can get references, mentions, footer
      header: m[9],
      body: body,

      // general commit info
      ref: m[10],
      tree: m[4],
      hash: m[1],
      abbrev: m[1].slice(0, 7),
      parent: parents,

      // author info
      author: {
        name: m[5],
        email: m[6],
        timestamp: +m[2]
      },

      // dates of commit
      date: {
        relative: m[7],
        unix: +m[2],
        iso: m[8]
      },
      timestamp: +m[2]
    }
  })
}

parseGitLog.promise = (cwd, plugin) => new Promise((resolve, reject) => {
  const commits = []
  parseGitLog(cwd, plugin)
    .once('error', reject)
    .on('commit', (commit) => commits.push(commit))
    .once('finish', () => {
      resolve(commits)
    })
})
