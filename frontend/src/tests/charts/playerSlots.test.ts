import { describe, it, expect } from 'vitest'

import {
    MAX_PLAYERS,
    addPlayer,
    formatPlayerSlots,
    parsePlayerSlots,
    removePlayer,
    seriesColor,
} from '../../features/charts/playerSlots'

describe('parsePlayerSlots', () => {
    it('reads ids by slot, keeping empty slots', () => {
        expect(parsePlayerSlots('545361,,592450')).toEqual([545361, null, 592450])
    })

    it('reads a missing or empty param as no players', () => {
        expect(parsePlayerSlots(null)).toEqual([])
        expect(parsePlayerSlots('')).toEqual([])
    })

    it('empties invalid and repeated ids and drops trailing empty slots', () => {
        expect(parsePlayerSlots('abc,545361,545361')).toEqual([null, 545361])
        expect(parsePlayerSlots('-4,0,1.5')).toEqual([])
    })

    it('reads at most three slots', () => {
        expect(MAX_PLAYERS).toBe(3)
        expect(parsePlayerSlots('1,2,3,4')).toEqual([1, 2, 3])
    })
})

describe('formatPlayerSlots', () => {
    it('writes ids by slot', () => {
        expect(formatPlayerSlots([545361, null, 592450])).toBe('545361,,592450')
    })

    it('returns null when no one is left', () => {
        expect(formatPlayerSlots([])).toBeNull()
        expect(formatPlayerSlots([null, null])).toBeNull()
    })
})

describe('addPlayer', () => {
    it('fills the first empty slot', () => {
        expect(addPlayer([null, 592450], 545361)).toEqual([545361, 592450])
    })

    it('appends when every slot is taken', () => {
        expect(addPlayer([545361], 592450)).toEqual([545361, 592450])
    })

    it('ignores a player who is already on the chart', () => {
        expect(addPlayer([545361], 545361)).toEqual([545361])
    })

    it('ignores a fourth player', () => {
        expect(addPlayer([1, 2, 3], 4)).toEqual([1, 2, 3])
    })
})

describe('removePlayer', () => {
    it('leaves the other players in their slots, so they keep their colors', () => {
        expect(removePlayer([545361, 592450], 545361)).toEqual([null, 592450])
    })

    it('drops empty slots at the end', () => {
        expect(removePlayer([545361, null, 592450], 592450)).toEqual([545361])
    })
})

describe('seriesColor', () => {
    it('maps a 0-based slot to its color token', () => {
        expect(seriesColor(0)).toBe('var(--chart-series-1)')
        expect(seriesColor(2)).toBe('var(--chart-series-3)')
    })
})
