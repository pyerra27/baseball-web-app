import '@testing-library/jest-dom'

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeasonLineChart from '../../features/charts/SeasonLineChart'
import { findStat } from '../../features/charts/playerSeries'
import type { SeasonValue, StatDef } from '../../features/charts/playerSeries'

const HR = findStat('hitting', 'home_runs')!
const AVG = findStat('hitting', 'avg')!
const ERA = findStat('pitching', 'era')!

function row(season: number, value: number | null, display = value === null ? '—' : String(value)): SeasonValue {
    return { season, value, display, teams: value === null ? '' : 'LAA', hasStats: value !== null }
}

// 2020 is a season the player missed.
const HOME_RUNS = [row(2019, 30), row(2020, null), row(2021, 40), row(2022, 35)]

function renderChart(rows: SeasonValue[], stat: StatDef = HR, best: SeasonValue | null = null) {
    return render(<SeasonLineChart rows={rows} stat={stat} best={best} title="Test chart" />)
}

// Recharts renders tick labels in a separate label layer, outside the axis
// group, so look them up by the label group's own class.
function tickLabels(container: HTMLElement, axis: 'xAxis' | 'yAxis'): string[] {
    return [...container.querySelectorAll(`.recharts-${axis}-tick-labels .recharts-cartesian-axis-tick-value`)]
        .map(tick => tick.textContent ?? '')
}

describe('SeasonLineChart', () => {
    it('draws a dot for each season with a value', () => {
        const { container } = renderChart(HOME_RUNS)
        expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(3)
    })

    it('breaks the line at a missed season', () => {
        const { container } = renderChart(HOME_RUNS)
        const path = container.querySelector('.recharts-line-curve')?.getAttribute('d') ?? ''
        expect(path.match(/M/g)).toHaveLength(2)
    })

    it('starts counting stats at zero with whole-number ticks', () => {
        const { container } = renderChart(HOME_RUNS)
        expect(tickLabels(container, 'yAxis')).toEqual(['0', '10', '20', '30', '40'])
    })

    it('labels each season on the x-axis when they fit', () => {
        const { container } = renderChart(HOME_RUNS)
        expect(tickLabels(container, 'xAxis')).toEqual(['2019', '2020', '2021', '2022'])
    })

    it('writes rate ticks in baseball notation', () => {
        const { container } = renderChart([row(2021, 0.262, '.262'), row(2022, 0.32, '.320')], AVG)
        const labels = tickLabels(container, 'yAxis')
        expect(labels.length).toBeGreaterThan(2)
        labels.forEach(label => expect(label).toMatch(/^\.\d{3}$/))
    })

    it('labels only the best season', () => {
        const { container } = renderChart(HOME_RUNS, HR, HOME_RUNS[2])
        const labels = [...container.querySelectorAll('.recharts-label')].map(label => label.textContent)
        expect(labels).toEqual(['40'])
    })

    it('puts the ERA callout below its dot', () => {
        const rows = [row(2020, 3.5, '3.50'), row(2021, 2.1, '2.10'), row(2022, 4, '4.00')]
        const { container } = renderChart(rows, ERA, rows[1])
        const dot = container.querySelector('.recharts-reference-dot-dot')
        const label = container.querySelector('.recharts-label')
        expect(label).toHaveTextContent('2.10')
        expect(Number(label?.getAttribute('y'))).toBeGreaterThan(Number(dot?.getAttribute('cy')))
    })

    it('shows a message when no season in the range has a value', () => {
        renderChart([row(2020, null)])
        expect(screen.getByText(/no home runs recorded in this range/i)).toBeInTheDocument()
    })

    it('gives the chart an accessible title', () => {
        const { container } = renderChart(HOME_RUNS)
        expect(container.querySelector('svg title')).toHaveTextContent('Test chart')
    })
})
