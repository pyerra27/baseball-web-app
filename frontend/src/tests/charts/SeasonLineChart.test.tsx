import '@testing-library/jest-dom'

import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import SeasonLineChart, { SeasonTooltipContent } from '../../features/charts/SeasonLineChart'
import type { ChartSeries } from '../../features/charts/SeasonLineChart'
import { findStat } from '../../features/charts/playerSeries'
import type { Align, SeriesPoint, StatDef } from '../../features/charts/playerSeries'

const HR = findStat('hitting', 'home_runs')!
const AVG = findStat('hitting', 'avg')!
const ERA = findStat('pitching', 'era')!

function point(season: number, value: number | null, display = value === null ? '—' : String(value)): SeriesPoint {
    return { x: season, season, value, display, teams: 'LAA', hasStats: true }
}

function line(id: number, name: string, points: SeriesPoint[], slot = 1): ChartSeries {
    return { id, name, color: `var(--chart-series-${slot})`, points }
}

// 2020 is a season the player missed.
const HOME_RUNS = [point(2019, 30), point(2021, 40), point(2022, 35)]

const TROUT = line(545361, 'Mike Trout', [point(2019, 45), point(2020, 17), point(2021, 8), point(2022, 40)], 1)
const JUDGE = line(592450, 'Aaron Judge', [point(2019, 27), point(2020, 9), point(2021, 39), point(2022, 62)], 2)

/** Render the chart over the full range of the series' points. */
function renderChart(series: ChartSeries[], stat: StatDef = HR, align: Align = 'season') {
    const xs = series.flatMap(entry => entry.points.map(p => p.x))
    return render(
        <SeasonLineChart
            series={series}
            from={Math.min(...xs)}
            to={Math.max(...xs)}
            align={align}
            stat={stat}
            title="Test chart"
        />,
    )
}

function renderOne(points: SeriesPoint[], stat: StatDef = HR) {
    return renderChart([line(1, 'Mike Trout', points)], stat)
}

/** Text drawn on the plot itself: the best-season callout or the end labels, but not the axis ticks. */
function chartLabels(container: HTMLElement): (string | null)[] {
    return [...container.querySelectorAll('svg text:not(.recharts-cartesian-axis-tick-value)')].map(label => label.textContent)
}

// Recharts renders tick labels in a separate label layer, outside the axis
// group, so look them up by the label group's own class.
function tickLabels(container: HTMLElement, axis: 'xAxis' | 'yAxis'): string[] {
    return [...container.querySelectorAll(`.recharts-${axis}-tick-labels .recharts-cartesian-axis-tick-value`)]
        .map(tick => tick.textContent ?? '')
}

describe('SeasonLineChart with one player', () => {
    it('draws a dot for each season with a value', () => {
        const { container } = renderOne(HOME_RUNS)
        expect(container.querySelectorAll('.recharts-line-dot')).toHaveLength(3)
    })

    it('breaks the line at a missed season', () => {
        const { container } = renderOne(HOME_RUNS)
        const path = container.querySelector('.recharts-line-curve')?.getAttribute('d') ?? ''
        expect(path.match(/M/g)).toHaveLength(2)
    })

    it('starts counting stats at zero with whole-number ticks', () => {
        const { container } = renderOne(HOME_RUNS)
        expect(tickLabels(container, 'yAxis')).toEqual(['0', '10', '20', '30', '40'])
    })

    it('labels each season on the x-axis when they fit', () => {
        const { container } = renderOne(HOME_RUNS)
        expect(tickLabels(container, 'xAxis')).toEqual(['2019', '2020', '2021', '2022'])
    })

    it('writes rate ticks in baseball notation', () => {
        const { container } = renderOne([point(2021, 0.262, '.262'), point(2022, 0.32, '.320')], AVG)
        const labels = tickLabels(container, 'yAxis')
        expect(labels.length).toBeGreaterThan(2)
        labels.forEach(label => expect(label).toMatch(/^\.\d{3}$/))
    })

    it('labels only the best season', () => {
        const { container } = renderOne(HOME_RUNS)
        expect(chartLabels(container)).toEqual(['40'])
    })

    it('puts the ERA callout below its dot', () => {
        const { container } = renderOne([point(2020, 3.5, '3.50'), point(2021, 2.1, '2.10'), point(2022, 4, '4.00')], ERA)
        const dot = container.querySelector('.recharts-reference-dot-dot')
        const label = container.querySelector('.recharts-label')
        expect(label).toHaveTextContent('2.10')
        expect(Number(label?.getAttribute('y'))).toBeGreaterThan(Number(dot?.getAttribute('cy')))
    })

    it('has no legend', () => {
        renderOne(HOME_RUNS)
        expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument()
    })

    it('shows a message when no season in the range has a value', () => {
        renderOne([point(2020, null)])
        expect(screen.getByText(/no home runs recorded in this range/i)).toBeInTheDocument()
    })

    it('gives the chart an accessible title', () => {
        const { container } = renderOne(HOME_RUNS)
        expect(container.querySelector('svg title')).toHaveTextContent('Test chart')
    })
})

describe('SeasonLineChart comparing players', () => {
    it('draws one line per player in its own color', () => {
        const { container } = renderChart([TROUT, JUDGE])
        const curves = [...container.querySelectorAll('.recharts-line-curve')]
        expect(curves.map(curve => curve.getAttribute('stroke'))).toEqual(['var(--chart-series-1)', 'var(--chart-series-2)'])
    })

    it('names every player in a legend', () => {
        renderChart([TROUT, JUDGE])
        const legend = screen.getByRole('list', { name: 'Legend' })
        expect(within(legend).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Mike Trout', 'Aaron Judge'])
    })

    it('labels each line where it ends instead of calling out a best season', () => {
        const { container } = renderChart([TROUT, JUDGE])
        expect(chartLabels(container)).toEqual(['Trout', 'Judge'])
    })

    it('leaves out an end label that would overlap another', () => {
        const close = line(592450, 'Aaron Judge', [point(2019, 27), point(2022, 41)], 2)
        const { container } = renderChart([TROUT, close])
        expect(chartLabels(container)).toEqual(['Trout'])
    })

    it('spans the y-axis across every player', () => {
        const { container } = renderChart([TROUT, JUDGE])
        expect(tickLabels(container, 'yAxis')).toEqual(['0', '20', '40', '60', '80'])
    })
})

describe('SeasonTooltipContent', () => {
    it('leads with the value for one player', () => {
        render(<SeasonTooltipContent row={{ x: 2019, points: [point(2019, 45)] }} series={[TROUT]} align="season" unit="HR" />)
        expect(screen.getByText('45')).toBeInTheDocument()
        expect(screen.getByText('2019 · LAA')).toBeInTheDocument()
    })

    it('adds the calendar season by career year', () => {
        const third = { ...point(2013, 27), x: 3 }
        render(<SeasonTooltipContent row={{ x: 3, points: [third] }} series={[TROUT]} align="career" unit="HR" />)
        expect(screen.getByText('Career year 3 · 2013 · LAA')).toBeInTheDocument()
    })

    it('marks a running total carried through a missed season', () => {
        const carried = { ...point(2020, 30), teams: '', hasStats: false }
        render(<SeasonTooltipContent row={{ x: 2020, points: [carried] }} series={[TROUT]} align="season" unit="HR" />)
        expect(screen.getByText('30')).toBeInTheDocument()
        expect(screen.getByText('2020 · No MLB stats')).toBeInTheDocument()
    })

    it('lists every player, with a dash for one who has no stats there', () => {
        render(
            <SeasonTooltipContent
                row={{ x: 2019, points: [point(2019, 45), null] }}
                series={[TROUT, JUDGE]}
                align="season"
                unit="HR"
            />,
        )
        expect(screen.getByText('2019 · HR')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument()
        expect(screen.getByText('Mike Trout')).toBeInTheDocument()
        expect(screen.getByText('—')).toBeInTheDocument()
        expect(screen.getByText('Aaron Judge')).toBeInTheDocument()
    })
})
