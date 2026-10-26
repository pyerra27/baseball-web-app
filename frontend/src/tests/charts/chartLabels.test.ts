import { describe, it, expect } from 'vitest'
import { barValuesFit, labelNames, placeEndLabels, shortName } from '../../features/charts/chartLabels'
import type { LabelFrame } from '../../features/charts/chartLabels'

// A 720px chart with six x positions and a 0–50 value axis. The last
// position sits 32px from the right edge before any gutter.
const FRAME: LabelFrame = {
    width: 720,
    count: 6,
    left: 60,
    right: 688,
    top: 24,
    bottom: 286,
    domain: [0, 50],
}

describe('shortName', () => {
    it('uses the last name', () => {
        expect(shortName('Mike Trout')).toBe('Trout')
        expect(shortName('Ichiro')).toBe('Ichiro')
    })

    it('drops suffixes', () => {
        expect(shortName('Ken Griffey Jr.')).toBe('Griffey')
        expect(shortName('Cal Ripken Jr')).toBe('Ripken')
    })

    it('keeps surname particles', () => {
        expect(shortName('Elly De La Cruz')).toBe('De La Cruz')
    })
})

describe('labelNames', () => {
    it('falls back to full names when short names match', () => {
        expect(labelNames(['Vladimir Guerrero Jr.', 'Vladimir Guerrero', 'Mike Trout'])).toEqual([
            'Vladimir Guerrero Jr.',
            'Vladimir Guerrero',
            'Trout',
        ])
    })
})

describe('placeEndLabels', () => {
    it('hides every label on a narrow chart', () => {
        const labels = [{ text: 'Trout', index: 5, value: 40 }]
        expect(placeEndLabels(labels, { ...FRAME, width: 400 })).toEqual({ gutter: 0, visible: [false] })
    })

    it('makes room for labels at the last position', () => {
        const placement = placeEndLabels([{ text: 'Trout', index: 5, value: 40 }], FRAME)
        expect(placement).toEqual({ gutter: 11, visible: [true] })
    })

    it('makes no room when every line ends earlier', () => {
        expect(placeEndLabels([{ text: 'Trout', index: 2, value: 40 }], FRAME).gutter).toBe(0)
    })

    it('hides the second of two overlapping labels', () => {
        const labels = [
            { text: 'Trout', index: 5, value: 40 },
            { text: 'Judge', index: 5, value: 41 },
        ]
        expect(placeEndLabels(labels, FRAME).visible).toEqual([true, false])
    })

    it('keeps labels that sit apart', () => {
        const apart = [
            { text: 'Trout', index: 5, value: 40 },
            { text: 'Judge', index: 5, value: 10 },
        ]
        const sideBySide = [
            { text: 'Trout', index: 2, value: 40 },
            { text: 'Judge', index: 5, value: 40 },
        ]
        expect(placeEndLabels(apart, FRAME).visible).toEqual([true, true])
        expect(placeEndLabels(sideBySide, FRAME).visible).toEqual([true, true])
    })

    it('hides a label too long to fit without making room for it', () => {
        const placement = placeEndLabels([{ text: 'x'.repeat(30), index: 5, value: 40 }], FRAME)
        expect(placement).toEqual({ gutter: 0, visible: [false] })
    })
})

describe('barValuesFit', () => {
    // About the plot width of a 720px chart.
    const PLOT_WIDTH = 670

    it('fits values for one player, who has the whole season to spread into', () => {
        expect(barValuesFit(['45', '8', '1,021'], { plotWidth: PLOT_WIDTH, count: 4, seriesCount: 1 })).toBe(true)
        expect(barValuesFit(['62'], { plotWidth: PLOT_WIDTH, count: 30, seriesCount: 1 })).toBe(true)
    })

    it('fits short values for three players on a short range', () => {
        expect(barValuesFit(['52', '62', '8'], { plotWidth: PLOT_WIDTH, count: 4, seriesCount: 3 })).toBe(true)
    })

    it("doesn't fit values wider than a bar when players' bars sit side by side", () => {
        expect(barValuesFit(['.312'], { plotWidth: PLOT_WIDTH, count: 4, seriesCount: 3 })).toBe(false)
    })

    it("doesn't fit anything for three players over thirty seasons", () => {
        expect(barValuesFit(['62'], { plotWidth: PLOT_WIDTH, count: 30, seriesCount: 3 })).toBe(false)
    })
})
