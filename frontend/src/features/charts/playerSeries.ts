/**
 * Turns a player's career stats into chartable season-by-season values.
 */

import type {
    HittingStats,
    PitchingStats,
    PlayerCareerStatsResponse,
    TeamSplit,
    YearlyStats,
} from '../../models/mlb.models'

export type StatGroup = 'hitting' | 'pitching'

/**
 * count   – whole numbers (HR, SO)
 * rate3   – three-decimal rates written without a leading zero (.312)
 * rate2   – two-decimal rates (3.45 ERA)
 * innings – innings pitched, where "180.1" means 180⅓
 */
export type StatFormat = 'count' | 'rate3' | 'rate2' | 'innings'

interface StatDefBase {
    label: string
    abbr: string
    format: StatFormat
    /** Rates where the smallest value is the best season (ERA, WHIP). */
    lowerIsBetter?: boolean
}

export type StatDef =
    | (StatDefBase & { group: 'hitting'; key: keyof HittingStats })
    | (StatDefBase & { group: 'pitching'; key: keyof PitchingStats })

export const GROUPS: StatGroup[] = ['hitting', 'pitching']

export const GROUP_LABELS: Record<StatGroup, string> = {
    hitting: 'Hitting',
    pitching: 'Pitching',
}

export const STATS: Record<StatGroup, StatDef[]> = {
    hitting: [
        { group: 'hitting', key: 'games_played',      label: 'Games',                 abbr: 'G',   format: 'count' },
        { group: 'hitting', key: 'plate_appearances', label: 'Plate Appearances',     abbr: 'PA',  format: 'count' },
        { group: 'hitting', key: 'at_bats',           label: 'At Bats',               abbr: 'AB',  format: 'count' },
        { group: 'hitting', key: 'runs',              label: 'Runs',                  abbr: 'R',   format: 'count' },
        { group: 'hitting', key: 'hits',              label: 'Hits',                  abbr: 'H',   format: 'count' },
        { group: 'hitting', key: 'doubles',           label: 'Doubles',               abbr: '2B',  format: 'count' },
        { group: 'hitting', key: 'triples',           label: 'Triples',               abbr: '3B',  format: 'count' },
        { group: 'hitting', key: 'home_runs',         label: 'Home Runs',             abbr: 'HR',  format: 'count' },
        { group: 'hitting', key: 'rbi',               label: 'Runs Batted In',        abbr: 'RBI', format: 'count' },
        { group: 'hitting', key: 'stolen_bases',      label: 'Stolen Bases',          abbr: 'SB',  format: 'count' },
        { group: 'hitting', key: 'base_on_balls',     label: 'Walks',                 abbr: 'BB',  format: 'count' },
        { group: 'hitting', key: 'avg',               label: 'Batting Average',       abbr: 'AVG', format: 'rate3' },
        { group: 'hitting', key: 'obp',               label: 'On-Base Percentage',    abbr: 'OBP', format: 'rate3' },
        { group: 'hitting', key: 'slg',               label: 'Slugging Percentage',   abbr: 'SLG', format: 'rate3' },
        { group: 'hitting', key: 'ops',               label: 'On-Base Plus Slugging', abbr: 'OPS', format: 'rate3' },
    ],
    pitching: [
        { group: 'pitching', key: 'games_played',    label: 'Games',                   abbr: 'G',    format: 'count' },
        { group: 'pitching', key: 'games_started',   label: 'Games Started',           abbr: 'GS',   format: 'count' },
        { group: 'pitching', key: 'wins',            label: 'Wins',                    abbr: 'W',    format: 'count' },
        { group: 'pitching', key: 'losses',          label: 'Losses',                  abbr: 'L',    format: 'count' },
        { group: 'pitching', key: 'saves',           label: 'Saves',                   abbr: 'SV',   format: 'count' },
        { group: 'pitching', key: 'innings_pitched', label: 'Innings Pitched',         abbr: 'IP',   format: 'innings' },
        { group: 'pitching', key: 'hits',            label: 'Hits Allowed',            abbr: 'H',    format: 'count' },
        { group: 'pitching', key: 'earned_runs',     label: 'Earned Runs',             abbr: 'ER',   format: 'count' },
        { group: 'pitching', key: 'base_on_balls',   label: 'Walks',                   abbr: 'BB',   format: 'count' },
        { group: 'pitching', key: 'strike_outs',     label: 'Strikeouts',              abbr: 'SO',   format: 'count' },
        { group: 'pitching', key: 'era',             label: 'Earned Run Average',      abbr: 'ERA',  format: 'rate2', lowerIsBetter: true },
        { group: 'pitching', key: 'whip',            label: 'Walks + Hits per Inning', abbr: 'WHIP', format: 'rate2', lowerIsBetter: true },
    ],
}

/** The stat shown when a player is first charted. */
export const DEFAULT_STAT_KEY: Record<StatGroup, string> = {
    hitting: 'home_runs',
    pitching: 'strike_outs',
}

export function findStat(group: StatGroup, key: string | null): StatDef | undefined {
    return STATS[group].find(stat => stat.key === key)
}

export function parseGroup(value: string | null): StatGroup | null {
    return GROUPS.find(group => group === value) ?? null
}

// ---------------------------------------------------------------------------
// Reading a season's stat line
// ---------------------------------------------------------------------------

/**
 * The line a season contributes: the combined (TOT) line when the player
 * changed teams mid-season, otherwise the one team's line.
 */
function pickLine<T>(yearly: YearlyStats, get: (split: TeamSplit) => T | null): T | null {
    const total = yearly.totals ? get(yearly.totals) : null
    if (total) return total
    const lines = yearly.splits.map(get).filter((line): line is T => line != null)
    return lines.length === 1 ? lines[0] : null
}

function hasGroup(yearly: YearlyStats, group: StatGroup): boolean {
    return pickLine(yearly, split => split[group]) !== null
}

function rawStat(yearly: YearlyStats, stat: StatDef): number | string | null {
    if (stat.group === 'hitting') {
        return pickLine(yearly, split => split.hitting)?.[stat.key] ?? null
    }
    return pickLine(yearly, split => split.pitching)?.[stat.key] ?? null
}

/** Innings are written in thirds: "180.1" is 180⅓ and "6.2" is 6⅔. */
export function parseInnings(raw: string): number | null {
    const match = /^(\d+)(?:\.([012]))?$/.exec(raw.trim())
    if (!match) return null
    return Number(match[1]) + Number(match[2] ?? 0) / 3
}

/**
 * Numeric value of a raw stat. The API sends rates as strings and uses
 * placeholders such as "-.--" or ".---" when a rate is undefined; those
 * become null.
 */
export function toNumber(raw: number | string | null | undefined, format: StatFormat): number | null {
    if (raw == null) return null
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
    if (format === 'innings') return parseInnings(raw)
    const value = Number.parseFloat(raw)
    return Number.isFinite(value) ? value : null
}

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export interface SeasonValue {
    season: number
    value: number | null
    /** The value as baseball writes it (".312", "180.1", "1,021"), or "—". */
    display: string
    /** Team(s) for the season, e.g. "LAA" or "NYY / SD". */
    teams: string
    /** False for a season the player missed. A running total still carries a value through it. */
    hasStats: boolean
}

/** A season's value placed on the chart's x-axis. */
export interface SeriesPoint extends SeasonValue {
    /** The season, or the career year (1 = first season) when aligned by career. */
    x: number
}

/** Line players up by calendar season, or by career year. */
export type Align = 'season' | 'career'

export function parseAlign(value: string | null): Align {
    return value === 'career' ? 'career' : 'season'
}

/** Groups (hitting, pitching) the player has at least one season of. */
export function availableGroups(career: PlayerCareerStatsResponse): StatGroup[] {
    return GROUPS.filter(group => career.seasons.some(yearly => hasGroup(yearly, group)))
}

/** Pitchers open on pitching; everyone else on hitting when they have it. */
export function defaultGroup(career: PlayerCareerStatsResponse, groups: StatGroup[]): StatGroup {
    if (career.position_type === 'Pitcher' && groups.includes('pitching')) return 'pitching'
    return groups[0] ?? 'hitting'
}

/** One entry per season the player has stats in the stat's group, oldest first. */
export function seasonValues(career: PlayerCareerStatsResponse, stat: StatDef): SeasonValue[] {
    return career.seasons
        .filter(yearly => hasGroup(yearly, stat.group))
        .map(yearly => {
            const raw = rawStat(yearly, stat)
            const value = toNumber(raw, stat.format)
            const teams = yearly.splits
                .filter(split => split[stat.group])
                .map(split => split.team_abbreviation)
                .filter((abbr): abbr is string => !!abbr)
                .join(' / ')
            let display = '—'
            if (value !== null) display = typeof raw === 'number' ? raw.toLocaleString('en-US') : String(raw)
            return { season: yearly.season, value, display, teams, hasStats: true }
        })
        .sort((a, b) => a.season - b.season)
}

/**
 * Place each season on the x-axis. By career, a player's first season in
 * the stat's group is year 1, and a missed season stays a gap.
 * `values` must be sorted oldest first.
 */
export function alignValues(values: SeasonValue[], align: Align): SeriesPoint[] {
    const first = values[0]?.season ?? 0
    return values.map(entry => ({
        ...entry,
        x: align === 'career' ? entry.season - first + 1 : entry.season,
    }))
}

/** Stats that add up across seasons, so a running total means something. */
export function isCountingStat(stat: StatDef): boolean {
    return stat.format === 'count' || stat.format === 'innings'
}

/** Innings in baseball notation, counted in outs: 180⅓ is "180.1". */
export function formatInnings(innings: number): string {
    const outs = Math.round(innings * 3)
    return `${Math.floor(outs / 3).toLocaleString('en-US')}.${outs % 3}`
}

function formatCount(total: number): string {
    return Math.round(total).toLocaleString('en-US')
}

/**
 * Career-to-date totals, one entry per season from the first to the last.
 * A missed season carries the previous total, so the line stays flat
 * instead of breaking. `values` must be sorted oldest first.
 */
export function runningTotals(values: SeasonValue[], stat: StatDef): SeasonValue[] {
    if (values.length === 0) return []
    const bySeason = new Map(values.map(entry => [entry.season, entry]))
    const format = stat.format === 'innings' ? formatInnings : formatCount
    const totals: SeasonValue[] = []
    let total = 0
    for (let season = values[0].season; season <= values[values.length - 1].season; season++) {
        const entry = bySeason.get(season)
        total += entry?.value ?? 0
        totals.push({
            season,
            value: total,
            display: format(total),
            teams: entry?.teams ?? '',
            hasStats: entry !== undefined,
        })
    }
    return totals
}

/**
 * Snap a requested [from, to] range onto seasons the player actually has.
 * Missing bounds default to the whole career. `seasons` must be ascending
 * and non-empty.
 */
export function resolveRange(seasons: number[], from: number | null, to: number | null): [number, number] {
    const first = seasons[0]
    const last = seasons[seasons.length - 1]
    const start = from === null ? first : seasons.find(s => s >= from) ?? last
    const end = to === null ? last : [...seasons].reverse().find(s => s <= to) ?? first
    return [start, Math.max(start, end)]
}

/** The season to call out: the highest value, or the lowest for ERA and WHIP. */
export function bestSeason<T extends SeasonValue>(values: T[], stat: StatDef): T | null {
    let best: T | null = null
    for (const entry of values) {
        if (entry.value === null) continue
        if (best === null || best.value === null) {
            best = entry
        } else if (stat.lowerIsBetter ? entry.value < best.value : entry.value > best.value) {
            best = entry
        }
    }
    return best
}

/** Axis tick labels in the stat's own notation. */
export function tickFormatter(format: StatFormat): (value: number) => string {
    switch (format) {
        case 'rate3':
            return value => {
                const text = value.toFixed(3)
                return Math.abs(value) < 1 ? text.replace(/^(-?)0\./, '$1.') : text
            }
        case 'rate2':
            return value => value.toFixed(2)
        default:
            return value => Math.round(value).toLocaleString('en-US')
    }
}
