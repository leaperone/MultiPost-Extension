import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  assertCompleteProxyCredentials,
  getProxyRules,
  normalizeProxyConfig
} from '../src/main/proxy/proxyConfig'

test('proxy credentials must be complete', () => {
  assert.equal(assertCompleteProxyCredentials(undefined, undefined), false)
  assert.equal(assertCompleteProxyCredentials('user', 'pass'), true)
  assert.throws(
    () => assertCompleteProxyCredentials('user', undefined),
    /credentials are incomplete/
  )
})

test('proxy rules preserve IPv6 brackets', () => {
  const config = normalizeProxyConfig({ protocol: 'http', host: '2001:db8::1', port: 8080 })
  assert.ok(config)
  assert.equal(getProxyRules(config), 'http://[2001:db8::1]:8080')
})

test('proxy config rejects invalid hosts', () => {
  assert.throws(
    () => normalizeProxyConfig({ protocol: 'http', host: 'proxy host', port: 8080 }),
    /whitespace|valid hostname/i
  )
})
