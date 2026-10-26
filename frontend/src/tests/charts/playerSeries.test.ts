import { describe, it, expect } from 'vitest'

import type {
    HittingStats,
    PitchingStats,
    PlayerCareerStatsResponse,
    TeamSplit,
    YearlyStats,
} from '../../models/mlb.models'
import {
    alignValues,
    availableGroups,
    bestSeason,
    defaultGroup,
    findStat,
    formatInnings,
    isCountingStat,
    parseAlign,
    parseGroup,
    parseInnings,
    resolveRange,
    runningTotals,
    seasonValues,
    tickFormatter,
    toNumber,
} from '../../features/charts/playerSeries'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function hitting(overrides: Partial<HittingStats> = {}): HittingStats {
    return {
        games_played: 150,
        plate_appearances: 640,
        at_bats: 560,
        runs: 95,
        hits: 160,
        doubles: 32,
        triples: 3,
        home_runs: 30,
        rbi: 98,
        stolen_bases: 12,
        base_on_balls: 70,
        avg: '.286',
        obp: '.370',
        slg: '.520',
        ops: '.890',
        ...overrides,
    }
}

function pitching(overrides: Partial<PitchingStats> = {}): PitchingStats {
    return {
        games_played: 32,
        games_started: 32,
        wins: 14,
        losses: 8,
        saves: 0,
        innings_pitched: '200.1',
        hits: 170,
        earned_runs: 70,
        base_on_balls: 50,
        strike_outs: 220,
        era: '3.15',
        whip: '1.10',
        ...overrides,
    }
}

function split(
    team: string,
    teamId: number,
    stats: { hitting?: HittingStats; pitching?: PitchingStats },
): TeamSplit {
    return {
        team_id: teamId,
        team_abbreviation: team,
        hitting: stats.hitting ?? null,
        pitching: stats.pitching ?? null,
    }
}

function career(positionType: string, seasons: YearlyStats[]): PlayerCareerStatsResponse {
    return { player_id: 1, full_name: 'Test Player', position_type: positionType, seasons }
}

// Newest first, as the API returns them. 2020 and 2022 are missing, and
// 2023 was split between two teams.
const HITTER = career('Outfielder', [
    {
        season: 2023,
        splits: [
            split('NYY', 147, { hitting: hitting({ home_runs: 10 }) }),
            split('SD', 135, { hitting: hitting({ home_runs: 15 }) }),
        ],
        totals: { team_id: null, team_abbreviation: 'TOT', hitting: hitting({ home_runs: 25, avg: '.275' }), pitching: null },
    },
    { season: 2021, splits: [split('SD', 135, { hitting: hitting({ home_runs: 41, avg: '-.--' }) })], totals: null },
    { season: 2019, splits: [split('SD', 135, { hitting: hitting() })], totals: null },
])

// A pitcher who also batted in 2019, when his ERA was undefined.
const PITCHER = career('Pitcher', [
    { season: 2022, splits: [split('NYY', 147, { pitching: pitching({ era: '3.50', innings_pitched: '200.2' }) })], totals: null },
    { season: 2021, splits: [split('NYY', 147, { pitching: pitching({ era: '2.10' }) })], totals: null },
    {
        season: 2019,
        splits: [split('HOU', 117, { hitting: hitting({ home_runs: 0 }), pitching: pitching({ era: '-.--' }) })],
        totals: null,
    },
])

const HR = findStat('hitting', 'home_runs')!
const AVG = findStat('hitting', 'avg')!
const ERA = findStat('pitching', 'era')!
const IP = findStat('pitching', 'innings_pitched')!

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseInnings', () => {
    it('reads the digit after the point as thirds of an inning', () => {
        expect(parseInnings('180.1')).toBeCloseTo(180 + 1 / 3)
        expect(parseInnings('6.2')).toBeCloseTo(6 + 2 / 3)
        expect(parseInnings('7')).toBe(7)
        expect(parseInnings('0.0')).toBe(0)
    })

    it('rejects values that are not innings', () => {
        expect(parseInnings('5.3')).toBeNull()
        expect(parseInnings('abc')).toBeNull()
    })
})

describe('toNumber', () => {
    it('parses rate strings', () => {
        expect(toNumber('.312', 'rate3')).toBeCloseTo(0.312)
        expect(toNumber('1.034', 'rate3')).toBeCloseTo(1.034)
        expect(toNumber('3.45', 'rate2')).toBeCloseTo(3.45)
    })

    it('treats the API placeholders as missing', () => {
        expect(toNumber('-.--', 'rate2')).toBeNull()
        expect(toNumber('.---', 'rate3')).toBeNull()
        expect(toNumber('*.**', 'rate2')).toBeNull()
        expect(toNumber(null, 'count')).toBeNull()
    })

    it('passes counts through and parses innings', () => {
        expect(toNumber(41, 'count')).toBe(41)
        expect(toNumber('200.2', 'innings')).toBeCloseTo(200 + 2 / 3)
    })
})

describe('seasonValues', () => {
    it('lists seasons oldest first', () => {
        expect(seasonValues(HITTER, HR).map(entry => entry.season)).toEqual([2019, 2021, 2023])
    })

    it('uses the combined line and lists every team for a split season', () => {
        const traded = seasonValues(HITTER, HR).find(entry => entry.season === 2023)!
        expect(traded.value).toBe(25)
        expect(traded.teams).toBe('NYY / SD')
    })

    it('keeps the API notation for display', () => {
        const traded = seasonValues(HITTER, AVG).find(entry => entry.season === 2023)!
        expect(traded.value).toBeCloseTo(0.275)
        expect(traded.display).toBe('.275')
    })

    it('marks placeholder rates as missing values', () => {
        const entry = seasonValues(HITTER, AVG).find(e => e.season === 2021)!
        expect(entry.value).toBeNull()
        expect(entry.display).toBe('—')
        expect(entry.hasStats).toBe(true)
    })

    it("only includes seasons with stats in the stat's group", () => {
        expect(seasonValues(PITCHER, HR).map(entry => entry.season)).toEqual([2019])
        expect(seasonValues(PITCHER, ERA).map(entry => entry.season)).toEqual([2019, 2021, 2022])
    })

    it('reads innings pitched in thirds but displays them as written', () => {
        const entry = seasonValues(PITCHER, IP).find(e => e.season === 2022)!
        expect(entry.value).toBeCloseTo(200 + 2 / 3)
        expect(entry.display).toBe('200.2')
    })
})

describe('alignValues and parseAlign', () => {
    it('places seasons by year', () => {
        expect(alignValues(seasonValues(HITTER, HR), 'season').map(point => point.x)).toEqual([2019, 2021, 2023])
    })

    it('counts career years from the first season and keeps missed seasons as gaps', () => {
        const points = alignValues(seasonValues(HITTER, HR), 'career')
        expect(points.map(point => point.x)).toEqual([1, 3, 5])
        expect(points[1].season).toBe(2021)
    })

    it('reads the align param, defaulting to seasons', () => {
        expect(parseAlign('career')).toBe('career')
        expect(parseAlign(null)).toBe('season')
        expect(parseAlign('age')).toBe('season')
    })
})

describe('isCountingStat', () => {
    it('accepts counts and innings but not rates', () => {
        expect(isCountingStat(HR)).toBe(true)
        expect(isCountingStat(IP)).toBe(true)
        expect(isCountingStat(AVG)).toBe(false)
        expect(isCountingStat(ERA)).toBe(false)
    })
})

describe('formatInnings', () => {
    it('writes whole innings and outs', () => {
        expect(formatInnings(180 + 1 / 3)).toBe('180.1')
        expect(formatInnings(2345 + 2 / 3)).toBe('2,345.2')
        expect(formatInnings(7)).toBe('7.0')
    })
})

describe('runningTotals', () => {
    it('adds up each season and carries the total through missed seasons', () => {
        const totals = runningTotals(seasonValues(HITTER, HR), HR)
        expect(totals.map(entry => entry.season)).toEqual([2019, 2020, 2021, 2022, 2023])
        expect(totals.map(entry => entry.value)).toEqual([30, 30, 71, 71, 96])
        expect(totals.map(entry => entry.hasStats)).toEqual([true, false, true, false, true])
        expect(totals[1].teams).toBe('')
        expect(totals[4]).toMatchObject({ display: '96', teams: 'NYY / SD' })
    })

    it('adds innings in thirds and writes them in baseball notation', () => {
        const totals = runningTotals(seasonValues(PITCHER, IP), IP)
        expect(totals.map(entry => entry.display)).toEqual(['200.1', '200.1', '400.2', '601.1'])
    })

    it('returns nothing without seasons', () => {
        expect(runningTotals([], HR)).toEqual([])
    })
})

describe('resolveRange', () => {
    const seasons = [2015, 2016, 2018, 2019]

    it('defaults to the whole career', () => {
        expect(resolveRange(seasons, null, null)).toEqual([2015, 2019])
    })

    it('snaps a missed season to the nearest season inside the range', () => {
        expect(resolveRange(seasons, 2017, null)).toEqual([2018, 2019])
        expect(resolveRange(seasons, null, 2017)).toEqual([2015, 2016])
    })

    it('clamps bounds outside the career', () => {
        expect(resolveRange(seasons, 2010, 2030)).toEqual([2015, 2019])
        expect(resolveRange(seasons, 2030, null)).toEqual([2019, 2019])
    })

    it('never ends before it starts', () => {
        expect(resolveRange(seasons, 2019, 2015)).toEqual([2019, 2019])
    })
})

describe('bestSeason', () => {
    it('picks the highest value for most stats', () => {
        expect(bestSeason(seasonValues(HITTER, HR), HR)?.season).toBe(2021)
    })

    it('picks the lowest value for ERA and skips missing values', () => {
        expect(bestSeason(seasonValues(PITCHER, ERA), ERA)?.season).toBe(2021)
    })

    it('returns null when no season has a value', () => {
        const empty = [{ season: 2020, value: null, display: '—', teams: '', hasStats: false }]
        expect(bestSeason(empty, HR)).toBeNull()
    })
})

describe('availableGroups and defaultGroup', () => {
    it('opens hitters on hitting', () => {
        expect(availableGroups(HITTER)).toEqual(['hitting'])
        expect(defaultGroup(HITTER, ['hitting'])).toBe('hitting')
    })

    it('opens pitchers on pitching even when they also batted', () => {
        const groups = availableGroups(PITCHER)
        expect(groups).toEqual(['hitting', 'pitching'])
        expect(defaultGroup(PITCHER, groups)).toBe('pitching')
    })

    it('opens two-way players on hitting', () => {
        const twoWay = { ...PITCHER, position_type: 'Two-Way Player' }
        expect(defaultGroup(twoWay, availableGroups(twoWay))).toBe('hitting')
    })
})

describe('tickFormatter', () => {
    it('writes three-decimal rates without a leading zero', () => {
        const format = tickFormatter('rate3')
        expect(format(0.25)).toBe('.250')
        expect(format(0)).toBe('.000')
        expect(format(1.05)).toBe('1.050')
    })

    it('writes two-decimal rates and whole counts', () => {
        expect(tickFormatter('rate2')(3)).toBe('3.00')
        expect(tickFormatter('count')(1500)).toBe('1,500')
    })
})

describe('findStat and parseGroup', () => {
    it('look up known values and reject unknown ones', () => {
        expect(findStat('pitching', 'era')?.abbr).toBe('ERA')
        expect(findStat('hitting', 'era')).toBeUndefined()
        expect(parseGroup('pitching')).toBe('pitching')
        expect(parseGroup('fielding')).toBeNull()
    })
})
