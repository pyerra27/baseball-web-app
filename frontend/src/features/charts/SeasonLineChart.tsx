import { useLayoutEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { valueTicks, yearTicks } from './chartAxes'
import { tickFormatter } from './playerSeries'
import type { SeasonValue, StatDef } from './playerSeries'
import styles from './SeasonLineChart.module.css'

const HEIGHT = 320
/** Used until the container is measured, and in test environments without ResizeObserver. */
const FALLBACK_WIDTH = 720
const MARGIN = { top: 24, right: 16, bottom: 4, left: 4 }
/** Keeps the first and last seasons' dots off the chart edges. */
const X_PADDING = 16
/** Rough width of one 12px tick character, for sizing the y-axis. */
const TICK_CHAR_WIDTH = 7
/** Horizontal room each year label needs. */
const YEAR_LABEL_SPACING = 56
const TICK_STYLE = { fill: 'var(--app-muted)', fontSize: 12 }
const DOT_STYLE = { fill: 'var(--chart-series-1)', stroke: 'var(--app-surface)', strokeWidth: 2 }

/** The element's width, tracked with a ResizeObserver when the browser has one. */
function useElementWidth<T extends HTMLElement>(fallback: number) {
    const ref = useRef<T>(null)
    const [width, setWidth] = useState(fallback)

    useLayoutEffect(() => {
        const node = ref.current
        if (!node || typeof ResizeObserver === 'undefined') return
        const update = (next: number) => {
            if (next > 0) setWidth(Math.round(next))
        }
        update(node.getBoundingClientRect().width)
        const observer = new ResizeObserver(entries => update(entries[0]?.contentRect.width ?? 0))
        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    return [ref, width] as const
}

function SeasonTooltip({ active, payload, unit }: TooltipContentProps & { unit: string }) {
    const row = payload?.[0]?.payload as SeasonValue | undefined
    if (!active || !row) return null

    return (
        <div className={styles.tooltip}>
            {row.hasStats ? (
                <div className={styles.tooltipValue}>
                    <span className={styles.tooltipKey} aria-hidden="true" />
                    {row.display}
                    <span className={styles.tooltipUnit}>{unit}</span>
                </div>
            ) : (
                <div className={styles.tooltipEmpty}>No MLB stats</div>
            )}
            <div className={styles.tooltipMeta}>
                {row.teams ? `${row.season} · ${row.teams}` : row.season}
            </div>
        </div>
    )
}

interface SeasonLineChartProps {
    /** One row per season in the range, including empty rows for missed seasons. */
    rows: SeasonValue[]
    stat: StatDef
    /** The season to label directly on the chart. */
    best: SeasonValue | null
    /** Accessible name for the chart. */
    title: string
}

export default function SeasonLineChart({ rows, stat, best, title }: SeasonLineChartProps) {
    const [rootRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH)
    const values = rows.flatMap(row => (row.value === null ? [] : [row.value]))

    if (values.length === 0) {
        return (
            <div ref={rootRef} className={styles.empty}>
                No {stat.label.toLowerCase()} recorded in this range.
            </div>
        )
    }

    const isCount = stat.format === 'count' || stat.format === 'innings'
    const ticks = valueTicks(values, { includeZero: isCount, integer: isCount })
    const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]]
    const formatTick = tickFormatter(stat.format)
    const yAxisWidth = Math.max(...ticks.map(tick => formatTick(tick).length)) * TICK_CHAR_WIDTH + 12

    const plotWidth = width - yAxisWidth - MARGIN.left - MARGIN.right - 2 * X_PADDING
    const xTicks = yearTicks(rows[0].season, rows[rows.length - 1].season, Math.floor(plotWidth / YEAR_LABEL_SPACING))

    // ERA and WHIP call out their lowest season below its dot, unless that dot
    // sits on the floor of the axis, where the label would hit the year labels.
    const labelBelow =
        stat.lowerIsBetter === true &&
        best?.value != null &&
        best.value - domain[0] > (domain[1] - domain[0]) * 0.12

    return (
        <div ref={rootRef} className={styles.root}>
            <LineChart
                width={width}
                height={HEIGHT}
                data={rows}
                margin={MARGIN}
                title={title}
                desc="Use the left and right arrow keys to move between seasons."
            >
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                    dataKey="season"
                    ticks={xTicks}
                    interval={0}
                    tick={TICK_STYLE}
                    tickLine={false}
                    tickMargin={8}
                    axisLine={{ stroke: 'var(--chart-axis)' }}
                    padding={{ left: X_PADDING, right: X_PADDING }}
                />
                <YAxis
                    domain={domain}
                    ticks={ticks}
                    interval={0}
                    tickFormatter={formatTick}
                    width={yAxisWidth}
                    tick={TICK_STYLE}
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                />
                <Tooltip
                    content={props => <SeasonTooltip {...props} unit={stat.abbr} />}
                    cursor={{ stroke: 'var(--app-muted)', strokeOpacity: 0.6, strokeWidth: 1 }}
                    isAnimationActive={false}
                />
                <Line
                    dataKey="value"
                    name={stat.abbr}
                    stroke="var(--chart-series-1)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    dot={{ ...DOT_STYLE, r: 4 }}
                    activeDot={{ ...DOT_STYLE, r: 6 }}
                    connectNulls={false}
                    isAnimationActive={false}
                />
                {best?.value != null && (
                    <ReferenceDot
                        x={best.season}
                        y={best.value}
                        r={0}
                        fill="none"
                        stroke="none"
                        label={{
                            value: best.display,
                            position: labelBelow ? 'bottom' : 'top',
                            offset: 10,
                            fill: 'var(--app-text)',
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    />
                )}
            </LineChart>
        </div>
    )
}
