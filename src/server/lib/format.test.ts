import assert from 'node:assert/strict'
import {test} from 'node:test'
import {decodeHtmlEntities} from './format.ts'

test('decodeHtmlEntities decodes double-escaped numeric entities', () => {
  assert.equal(
    decodeHtmlEntities('Xcel Energy&#8217;s claims aren&#8217;t impactful'),
    'Xcel Energy\u2019s claims aren\u2019t impactful',
  )
})

test('decodeHtmlEntities decodes hex numeric entities', () => {
  assert.equal(decodeHtmlEntities('&#x2014;'), '\u2014')
})

test('decodeHtmlEntities decodes common named entities', () => {
  assert.equal(
    decodeHtmlEntities('salt &amp; pepper &mdash; &ldquo;done&rdquo;'),
    'salt & pepper \u2014 \u201cdone\u201d',
  )
})

test('decodeHtmlEntities leaves unknown entities untouched', () => {
  assert.equal(decodeHtmlEntities('AT&T &unknown;'), 'AT&T &unknown;')
})

test('decodeHtmlEntities leaves plain text unchanged', () => {
  assert.equal(decodeHtmlEntities('no entities here'), 'no entities here')
})
