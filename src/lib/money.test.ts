import {test,expect} from 'vitest'
import {cycleOf,dueOf,cashHeld,normPhone,checkAmount,checkLoan} from './money'
test('cycles',()=>{
  expect(cycleOf('monthly','2026-01-15',new Date('2026-01-31T10:00:00'))).toBe(0)
  expect(cycleOf('monthly','2026-01-15',new Date('2026-04-01T10:00:00'))).toBe(3)
  expect(cycleOf('weekly','2026-01-05',new Date('2026-01-19T10:00:00'))).toBe(2)
  expect(cycleOf('weekly','2026-01-05',new Date('2025-12-01'))).toBe(0)})
test('interest rounds to whole francs',()=>{expect(dueOf(10000,5,3)).toBe(11500);expect(dueOf(3333,5,1)).toBe(3500);expect(dueOf(1000,0,6)).toBe(1000)})
test('cash',()=>expect(cashHeld(150000,40000,11500)).toBe(121500))
test('phones',()=>{
  expect(normPhone('0788 123 456')).toBe('250788123456');expect(normPhone('+250 788 123 456')).toBe('250788123456')
  expect(normPhone('788123456')).toBe('250788123456');expect(normPhone('')).toBe('');expect(normPhone('12345')).toBeNull()})
test('amount checks',()=>{expect(checkAmount(0)).toBeTruthy();expect(checkAmount(1.5)).toBeTruthy();expect(checkAmount(5000)).toBeNull();expect(checkAmount(1e9)).toBeTruthy()})
test('loan cannot exceed cash',()=>{expect(checkLoan(50000,5,3,40000)).toMatch(/only holds/);expect(checkLoan(30000,5,3,40000)).toBeNull();expect(checkLoan(100,101,3,1000)).toBeTruthy();expect(checkLoan(100,5,0,1000)).toBeTruthy()})
