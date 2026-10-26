import { describe, it, expect } from 'vitest'
import { niceStep, niceTicks, valueTicks, yearTicks } from '../../features/charts/chartAxes'

describe('niceStep', () => {
    it('rounds to 1, 2 or 5 times a power of ten', () => {
        expect(niceStep(47, 4)).toBe(10)
        expect(niceStep(0.07, 4)).toBe(0.02)
        expect(niceStep(3, 4)).toBe(1)
    })
})

describe('niceTicks', () => {
    it('covers the range with round values', () => {
        expect(niceTicks(0, 47, 4, true)).toEqual([0, 10, 20, 30, 40, 50])
    })

    it('never uses fractional steps for whole-number axes', () => {
        expect(niceTicks(0, 2, 4, true)).toEqual([0, 1, 2])
    })

    it('rounds away floating-point noise', () => {
        expect(niceTicks(0.25, 0.33)).toEqual([0.24, 0.26, 0.28, 0.3, 0.32, 0.34])
    })

    it('returns nothing for an empty range', () => {
        expect(niceTicks(5, 5)).toEqual([])
    })
})

describe('valueTicks', () => {
    it('starts counting stats at zero', () => {
        expect(valueTicks([12, 47, 33], { includeZero: true, integer: true })).toEqual([0, 10, 20, 30, 40, 50])
    })

    it('pads rate stats around the data instead of starting at zero', () => {
        const ticks = valueTicks([0.262, 0.32])
        expect(ticks[0]).toBeGreaterThan(0)
        expect(ticks[0]).toBeLessThan(0.262)
        expect(ticks[ticks.length - 1]).toBeGreaterThan(0.32)
    })

    it('keeps a padded range from going below zero', () => {
        expect(valueTicks([0])[0]).toBe(0)
    })

    it('still draws an axis when every value is zero', () => {
        expect(valueTicks([0, 0], { includeZero: true, integer: true })).toEqual([0, 1])
    })

    it('returns nothing without values', () => {
        expect(valueTicks([])).toEqual([])
    })
})

describe('yearTicks', () => {
    it('labels every season when they fit', () => {
        expect(yearTicks(2011, 2024, 20)).toHaveLength(14)
    })

    it('steps by round years when space is tight', () => {
        expect(yearTicks(2011, 2024, 10)).toEqual([2012, 2014, 2016, 2018, 2020, 2022, 2024])
        expect(yearTicks(1990, 2024, 4)).toEqual([1990, 2000, 2010, 2020])
    })

    it('always labels a single season', () => {
        expect(yearTicks(2024, 2024, 0)).toEqual([2024])
    })
})
