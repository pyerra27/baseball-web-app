import { describe, it, expect } from 'vitest'
import { labelNames, placeEndLabels, shortName } from '../../features/charts/endLabels'
import type { LabelFrame } from '../../features/charts/endLabels'

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
