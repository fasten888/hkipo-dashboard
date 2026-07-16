import assert from 'node:assert/strict'
import test from 'node:test'
import { getTotalFee } from '../src/utils/feeConsistency.ts'

test('现金申购只计算 commission', () => {
  assert.equal(
    getTotalFee({ id: 'cash', commission: 100, financingFee: 0 }),
    100,
  )
})

test('10x 融资申购未产生融资利息时只计算 commission', () => {
  assert.equal(
    getTotalFee({ id: 'margin', commission: 100, financingFee: 0 }),
    100,
  )
})

test('未来真实融资利息与 commission 分开计算', () => {
  assert.equal(
    getTotalFee({ id: 'margin-interest', commission: 100, financingFee: 38.5 }),
    138.5,
  )
})
