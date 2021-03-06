const fetch = require('node-fetch')

const { name, version } = require('../../package.json')
const debug = require('./debug')

const days = [
  '월', '화', '수', '목', '금', '토', '일', 'SP',
  '月', '火', '水', '木', '金', '土', '日', 'SP',
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'UNK' // NOTE: unknown
]
const dividers = [
  '/', '[', ']'
]
const aggravateDividers = [
  '[', ']'
]
const comments = [
  '//', '/{', '/ [', ' / '
]

const removeUselessDividers = text => {
  for (let i = 0, l = aggravateDividers.length; i < l; i++) {
    const divider = aggravateDividers[i]

    if (text.startsWith(divider)) text = text.slice(1)
    if (text.endsWith(divider)) text = text.slice(0, text.length - 1)
  }

  return text
}

module.exports = async opts => {
  'use strict'

  opts = opts || {}
  opts.url = opts.url || ''
  opts.repo = opts.repo || 'ohyongslck/annie'
  opts.branch = opts.branch || 'master'
  opts.year = opts.year || new Date().getFullYear()
  opts.quarter = opts.quarter || 1

  // NOTE: build url;
  const url = opts.url || `https://raw.githubusercontent.com/${opts.repo}/${opts.branch}/${opts.year}@${opts.quarter}`

  debug('requesting to:', url)

  // NOTE: request;
  const res = await fetch(url, {
    headers: {
      'User-Agent': `Seia-Soto/${name} v${version} (https://github.com/Seia-Soto)`
    }
  })
  const text = await res.text()
  const lines = text.split('\n')

  // NOTE: parse data;
  const schedules = []
  let day = -1

  for (let i = 0, l = lines.length; i < l; i++) {
    const line = lines[i]

    debug('parsing current line:', line)

    if (!line) continue

    // NOTE: if current line is representing day;
    for (let k = 0, s = days.length; k < s; k++) {
      if (line.toUpperCase().startsWith(days[k])) {
        day = k % 8

        debug('detected `day` format from current line and setting day to:', day)

        continue
      }
    }

    let pruned = (' ' + line).slice(1)
    let title
    let comment
    let date
    let time

    debug('replacing comments cases:', comments.join(', '))

    for (let k = 0, s = comments.length; k < s; k++) {
      [pruned, ...comment] = pruned.split(comments[k])

      // NOTE: resolve full string;
      comment = comment.join(comments[k])
    }

    debug('matching title index with dividers:', dividers.join(', '))

    for (let k = 0, s = dividers.length; k < s; k++) {
      const divider = dividers[k]
      const tokens = pruned
        .split(divider)
        .reverse()

      for (let n = 0, z = tokens.length; n < z; n++) {
        const token = removeUselessDividers(tokens[n]
          .slice(1) // NOTE: replace divider;
          .trim())

        debug(token)

        if (!time) {
          const possible = token.match(/\d{1,2}:\d{1,2}/i) || []

          time = possible[0]
        } else if (!date) {
          const possible = token.match(/\d{1,2}\/\d{1,2}/) || []

          date = possible[0]
        } else if (token && token.match(/[a-zA-Z가-힣一-龠ぁ-ゔァ-ヴーａ-ｚＡ-Ｚ０-９々〆〤]/u) && !title) {
          title = token
        }
      }
    }

    if (!title.promised) {
      debug('skipping current line because no case were found')

      continue
    }

    schedules.push({
      year: opts.year,
      quarter: opts.quarter,
      day,
      date,
      time,
      name: title,
      comment,
      original: line
    })
  }

  return schedules
}
