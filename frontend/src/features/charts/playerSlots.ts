/**
 * Which players are on the chart, and which color each one wears.
 *
 * The `players` URL param lists player ids by color slot: "545361,,592450"
 * puts one player in slot 1 and another in slot 3. Removing a player leaves
 * an empty slot, so the players who stay keep their colors.
 */

/** Player ids by slot. An empty slot is null. */
export type PlayerSlots = (number | null)[]

/**
 * The most players one chart compares. Any two of the three series colors
 * can share a chart and still be told apart; a fourth color can't.
 */
export const MAX_PLAYERS = 3

function trimTrailing(slots: PlayerSlots): PlayerSlots {
    const next = [...slots]
    while (next.length > 0 && next[next.length - 1] === null) next.pop()
    return next
}

function parseId(value: string): number | null {
    if (!/^\d+$/.test(value.trim())) return null
    const id = Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : null
}

/** Read the `players` param. Invalid and repeated ids become empty slots. */
export function parsePlayerSlots(value: string | null): PlayerSlots {
    if (value === null) return []
    const seen = new Set<number>()
    const slots = value.split(',').slice(0, MAX_PLAYERS).map(entry => {
        const id = parseId(entry)
        if (id === null || seen.has(id)) return null
        seen.add(id)
        return id
    })
    return trimTrailing(slots)
}

/** Write the `players` param, or null to remove it when no one is left. */
export function formatPlayerSlots(slots: PlayerSlots): string | null {
    const trimmed = trimTrailing(slots)
    return trimmed.length === 0 ? null : trimmed.map(id => id ?? '').join(',')
}

/** Put a player in the first empty slot. No change if they're already there or the chart is full. */
export function addPlayer(slots: PlayerSlots, id: number): PlayerSlots {
    if (slots.includes(id)) return slots
    const free = slots.indexOf(null)
    if (free !== -1) return slots.map((slot, index) => (index === free ? id : slot))
    if (slots.length >= MAX_PLAYERS) return slots
    return [...slots, id]
}

/** Empty a player's slot, leaving everyone else where they are. */
export function removePlayer(slots: PlayerSlots, id: number): PlayerSlots {
    return trimTrailing(slots.map(slot => (slot === id ? null : slot)))
}

/** The series color for a slot (0-based). */
export function seriesColor(slot: number): string {
    return `var(--chart-series-${slot + 1})`
}
