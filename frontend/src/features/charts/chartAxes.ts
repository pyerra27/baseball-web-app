/**
 * Axis tick helpers for charts.
 *
 * Recharts can pick ticks itself, but it won't pad a rate stat's range or
 * guarantee whole-number ticks for counting stats. Computing them here keeps
 * the axes predictable and unit-testable.
 */

/** Rounds away floating-point noise such as 0.30000000000000004. */
function clean(value: number): number {
    return Number(value.toPrecision(12))
}

/**
 * Pick a "nice" step (1, 2 or 5 × a power of ten) that splits `span`
 * into roughly `count` intervals.
 */
export function niceStep(span: number, count: number): number {
    const raw = span / Math.max(1, count)
    const magnitude = 10 ** Math.floor(Math.log10(raw))
    const normalized = raw / magnitude
    const factor =
        normalized >= Math.sqrt(50) ? 10 :
        normalized >= Math.sqrt(10) ? 5 :
        normalized >= Math.SQRT2 ? 2 :
        1
    return factor * magnitude
}

/**
 * Evenly spaced, round tick values that cover [min, max]. The first and
 * last ticks become the axis domain.
 */
export function niceTicks(min: number, max: number, count = 4, integer = false): number[] {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return []
    let step = niceStep(max - min, count)
    if (integer) step = Math.max(1, step)
    const first = Math.floor(clean(min / step))
    const last = Math.ceil(clean(max / step))
    const ticks: number[] = []
    for (let i = first; i <= last; i++) ticks.push(clean(i * step))
    return ticks
}

interface ValueTickOptions {
    /** Anchor the axis at zero, for counting stats. */
    includeZero?: boolean
    /** Only whole-number ticks, for counting stats. */
    integer?: boolean
    count?: number
}

/**
 * Y-axis ticks for a set of plotted values.
 *
 * Counting stats start at zero. Rate stats get a padded range around the
 * data instead, so a .260 to .310 career isn't flattened against a zero
 * baseline. The range never dips below zero for non-negative data.
 */
export function valueTicks(values: number[], options: ValueTickOptions = {}): number[] {
    const { includeZero = false, integer = false, count = 4 } = options
    if (values.length === 0) return []

    let lo = Math.min(...values)
    let hi = Math.max(...values)

    if (includeZero) {
        lo = Math.min(lo, 0)
        hi = Math.max(hi, 0)
    } else {
        const pad = Math.max((hi - lo) * 0.1, Math.abs(hi) * 0.05) || 1
        lo = lo >= 0 ? Math.max(0, lo - pad) : lo - pad
        hi += pad
    }
    if (hi === lo) hi = lo + 1

    return niceTicks(lo, hi, count, integer)
}

const YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100]

/**
 * Year labels for the x-axis: the smallest round step whose labels fit in
 * `maxTicks`, placed on multiples of that step (2012, 2014, ...).
 */
export function yearTicks(from: number, to: number, maxTicks: number): number[] {
    const limit = Math.max(1, maxTicks)
    const step =
        YEAR_STEPS.find(s => Math.floor(to / s) - Math.ceil(from / s) + 1 <= limit) ??
        YEAR_STEPS[YEAR_STEPS.length - 1]
    const ticks: number[] = []
    for (let year = Math.ceil(from / step) * step; year <= to; year += step) ticks.push(year)
    return ticks
}
