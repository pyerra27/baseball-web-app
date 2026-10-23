/**
 * Direct labels at the end of each line on a comparison chart.
 *
 * The legend always names the lines; these labels add each player's name
 * where their line ends. A label that would overlap another or run off the
 * chart is left out instead of being nudged away from its line. The legend
 * and tooltip still identify that line.
 */

const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv'])
const PARTICLES = new Set(['da', 'das', 'de', 'del', 'della', 'der', 'di', 'do', 'dos', 'du', 'la', 'le', 'st', 'st.', 'van', 'von'])

/** Rough width of one 12px label character. */
const CHAR_WIDTH = 7
/** Space between a line's last point and its label. */
export const LABEL_GAP = 8
const LABEL_HEIGHT = 14
/** Narrower charts skip end labels and leave the names to the legend and tooltip. */
const MIN_CHART_WIDTH = 480
/** The most room the plot gives up on its right for labels. */
const MAX_GUTTER = 120

/** A player's last name: "Ken Griffey Jr." is "Griffey", "Elly De La Cruz" is "De La Cruz". */
export function shortName(fullName: string): string {
    const words = fullName.trim().split(/\s+/)
    while (words.length > 1 && SUFFIXES.has(words[words.length - 1].toLowerCase())) words.pop()
    let start = words.length - 1
    while (start > 1 && PARTICLES.has(words[start - 1].toLowerCase())) start--
    return words.slice(start).join(' ')
}

/** Short names for each line, falling back to the full name when two short names match. */
export function labelNames(fullNames: string[]): string[] {
    const short = fullNames.map(shortName)
    return short.map((name, index) => (short.indexOf(name) === short.lastIndexOf(name) ? name : fullNames[index]))
}

export interface EndLabel {
    text: string
    /** Position of the line's last point among the chart's x positions, from 0. */
    index: number
    value: number
}

/** Where the chart draws things, in pixels. */
export interface LabelFrame {
    /** Width of the whole chart. */
    width: number
    /** Number of x positions. */
    count: number
    /** x of the first position. */
    left: number
    /** x of the last position, before any room is made for labels. */
    right: number
    /** y of the value axis's top and bottom. */
    top: number
    bottom: number
    domain: [number, number]
}

export interface LabelPlacement {
    /** Room to take from the plot's right side so labels at the last position fit. */
    gutter: number
    /** Whether to draw each label, in the order given. */
    visible: boolean[]
}

interface Box {
    x0: number
    x1: number
    y0: number
    y1: number
}

function overlaps(a: Box, b: Box): boolean {
    return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/**
 * Decide which end labels to draw and how much room to make for them.
 * Earlier labels win: a label that overlaps one already placed is hidden.
 */
export function placeEndLabels(labels: EndLabel[], frame: LabelFrame): LabelPlacement {
    if (frame.width < MIN_CHART_WIDTH || labels.length === 0) {
        return { gutter: 0, visible: labels.map(() => false) }
    }

    const widths = labels.map(label => label.text.length * CHAR_WIDTH)
    const room = frame.width - frame.right
    // Labels at the last position need room past it. One too wide even for
    // the largest gutter is hidden below, so it doesn't claim any room.
    const needs = labels.map((label, i) => (label.index === frame.count - 1 ? LABEL_GAP + widths[i] - room : 0))
    const gutter = Math.max(0, ...needs.filter(need => need <= MAX_GUTTER))

    const last = frame.right - gutter
    const step = frame.count > 1 ? (last - frame.left) / (frame.count - 1) : 0
    const [low, high] = frame.domain
    const span = high - low || 1
    const placed: Box[] = []

    const visible = labels.map((label, i) => {
        const x0 = frame.left + label.index * step + LABEL_GAP
        const y = frame.top + ((high - label.value) / span) * (frame.bottom - frame.top)
        const box = { x0, x1: x0 + widths[i], y0: y - LABEL_HEIGHT / 2, y1: y + LABEL_HEIGHT / 2 }
        if (box.x1 > frame.width || placed.some(other => overlaps(box, other))) return false
        placed.push(box)
        return true
    })

    return { gutter, visible }
}
