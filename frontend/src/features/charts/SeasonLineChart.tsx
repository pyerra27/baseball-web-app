import { useLayoutEffect, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, Tooltip, XAxis, YAxis } from 'recharts'
import type { TooltipContentProps } from 'recharts'
import { valueTicks, yearTicks } from './chartAxes'
import { LABEL_GAP, labelNames, placeEndLabels } from './endLabels'
import { bestSeason, tickFormatter } from './playerSeries'
import type { Align, SeriesPoint, StatDef } from './playerSeries'
import styles from './SeasonLineChart.module.css'

const HEIGHT = 320
/** Used until the container is measured, and in test environments without ResizeObserver. */
const FALLBACK_WIDTH = 720
const MARGIN = { top: 24, right: 16, bottom: 4, left: 4 }
/** Keeps the first and last seasons' dots off the chart edges. */
const X_PADDING = 16
/** Height of the year labels under the plot. Recharts' default, set explicitly because end-label placement relies on it. */
const X_AXIS_HEIGHT = 30
/** Rough width of one 12px tick character, for sizing the y-axis. */
const TICK_CHAR_WIDTH = 7
/** Horizontal room each year label needs. */
const YEAR_LABEL_SPACING = 56
const TICK_STYLE = { fill: 'var(--app-muted)', fontSize: 12 }

function dotStyle(color: string) {
    return { fill: color, stroke: 'var(--app-surface)', strokeWidth: 2 }
}

/** One player's line. */
export interface ChartSeries {
    /** The player's id. */
    id: number
    /** Full name, for the legend and tooltip. */
    name: string
    /** CSS color of the line. */
    color: string
    /** Points inside the range, ascending by x. */
    points: SeriesPoint[]
}

/** One x position, with each series' point there, or null where it has none. */
export interface ChartRow {
    x: number
    points: (SeriesPoint | null)[]
}

/** A row for every x from `from` to `to`, so a line breaks where a player has no point. */
function buildRows(series: ChartSeries[], from: number, to: number): ChartRow[] {
    const lookups = series.map(line => new Map(line.points.map(point => [point.x, point])))
    const rows: ChartRow[] = []
    for (let x = from; x <= to; x++) {
        rows.push({ x, points: lookups.map(lookup => lookup.get(x) ?? null) })
    }
    return rows
}

/** "2019", or "Career Year 3". */
function xLabel(x: number, align: Align): string {
    return align === 'career' ? `Career Year ${x}` : String(x)
}

/** What a point adds after its x position: the calendar season by career, and the team. */
function pointDetails(point: SeriesPoint, align: Align): string {
    const parts = align === 'career' ? [String(point.season)] : []
    parts.push(point.hasStats ? point.teams : 'No MLB stats')
    return parts.filter(Boolean).join(' · ')
}

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

interface SeasonTooltipContentProps {
    row: ChartRow
    series: ChartSeries[]
    align: Align
    /** The stat's abbreviation, e.g. "HR". */
    unit: string
}

/**
 * The tooltip for one x position. With one player it leads with the value;
 * with more, it lists every player at that position.
 */
export function SeasonTooltipContent({ row, series, align, unit }: SeasonTooltipContentProps) {
    if (series.length === 1) {
        const point = row.points[0]
        const meta = [xLabel(row.x, align), point ? pointDetails(point, align) : '']
        return (
            <div className={styles.tooltip}>
                {point ? (
                    <div className={styles.tooltipValue}>
                        <span className={styles.tooltipKey} style={{ background: series[0].color }} aria-hidden="true" />
                        {point.display}
                        <span className={styles.tooltipUnit}>{unit}</span>
                    </div>
                ) : (
                    <div className={styles.tooltipEmpty}>No MLB stats</div>
                )}
                <div className={styles.tooltipMeta}>{meta.filter(Boolean).join(' · ')}</div>
            </div>
        )
    }

    return (
        <div className={styles.tooltip}>
            <div className={styles.tooltipHeader}>{xLabel(row.x, align)} · {unit}</div>
            <div className={styles.tooltipRows}>
                {series.map((line, index) => {
                    const point = row.points[index]
                    return (
                        <div key={line.id} className={styles.tooltipRow}>
                            <span className={styles.tooltipKey} style={{ background: line.color }} aria-hidden="true" />
                            <span className={styles.tooltipRowValue}>{point?.display ?? '—'}</span>
                            <span className={styles.tooltipRowName}>{line.name}</span>
                            <span className={styles.tooltipRowMeta}>{point ? pointDetails(point, align) : ''}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function SeasonTooltip({ active, payload, ...rest }: TooltipContentProps & Omit<SeasonTooltipContentProps, 'row'>) {
    const row = payload?.[0]?.payload as ChartRow | undefined
    if (!active || !row) return null
    return <SeasonTooltipContent row={row} series={rest.series} align={rest.align} unit={rest.unit} />
}

interface SeasonLineChartProps {
    /** One line per player. Two or more add a legend and labels at the line ends. */
    series: ChartSeries[]
    /** The x range: seasons, or career years when aligned by career. */
    from: number
    to: number
    align: Align
    stat: StatDef
    /** Accessible name for the chart. */
    title: string
}

export default function SeasonLineChart({ series, from, to, align, stat, title }: SeasonLineChartProps) {
    const [rootRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH)
    const values = series.flatMap(line => line.points.flatMap(point => (point.value === null ? [] : [point.value])))

    if (values.length === 0) {
        return (
            <div ref={rootRef} className={styles.empty}>
                No {stat.label.toLowerCase()} recorded in this range.
            </div>
        )
    }

    const rows = buildRows(series, from, to)
    const comparing = series.length > 1

    const isCount = stat.format === 'count' || stat.format === 'innings'
    const ticks = valueTicks(values, { includeZero: isCount, integer: isCount })
    const domain: [number, number] = [ticks[0], ticks[ticks.length - 1]]
    const formatTick = tickFormatter(stat.format)
    const yAxisWidth = Math.max(...ticks.map(tick => formatTick(tick).length)) * TICK_CHAR_WIDTH + 12

    // With two or more players, name each line where it ends.
    const names = labelNames(series.map(line => line.name))
    const ends = comparing
        ? series.flatMap((line, index) => {
            const last = [...line.points].reverse().find(point => point.value !== null)
            return last?.value != null
                ? [{ id: line.id, point: last, label: { text: names[index], index: last.x - from, value: last.value } }]
                : []
        })
        : []
    const placement = placeEndLabels(ends.map(end => end.label), {
        width,
        count: rows.length,
        left: MARGIN.left + yAxisWidth + X_PADDING,
        right: width - MARGIN.right - X_PADDING,
        top: MARGIN.top,
        bottom: HEIGHT - MARGIN.bottom - X_AXIS_HEIGHT,
        domain,
    })
    const margin = { ...MARGIN, right: MARGIN.right + placement.gutter }

    const plotWidth = width - yAxisWidth - margin.left - margin.right - 2 * X_PADDING
    const xTicks = yearTicks(from, to, Math.floor(plotWidth / YEAR_LABEL_SPACING))

    // One player gets their best season called out. ERA and WHIP call out
    // their lowest season below its dot, unless that dot sits on the floor
    // of the axis, where the label would hit the year labels.
    const best = comparing ? null : bestSeason(series[0].points, stat)
    const labelBelow =
        stat.lowerIsBetter === true &&
        best?.value != null &&
        best.value - domain[0] > (domain[1] - domain[0]) * 0.12

    return (
        <div ref={rootRef} className={styles.root}>
            {comparing && (
                <ul className={styles.legend} aria-label="Legend">
                    {series.map(line => (
                        <li key={line.id} className={styles.legendItem}>
                            <span className={styles.legendKey} style={{ background: line.color }} aria-hidden="true" />
                            {line.name}
                        </li>
                    ))}
                </ul>
            )}

            <LineChart
                width={width}
                height={HEIGHT}
                data={rows}
                margin={margin}
                title={title}
                desc="Use the left and right arrow keys to move between seasons."
            >
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                    dataKey="x"
                    ticks={xTicks}
                    interval={0}
                    height={X_AXIS_HEIGHT}
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
                    content={props => <SeasonTooltip {...props} series={series} align={align} unit={stat.abbr} />}
                    cursor={{ stroke: 'var(--app-muted)', strokeOpacity: 0.6, strokeWidth: 1 }}
                    isAnimationActive={false}
                />
                {series.map((line, index) => (
                    <Line
                        key={line.id}
                        dataKey={(row: ChartRow) => row.points[index]?.value ?? null}
                        name={line.name}
                        stroke={line.color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        dot={{ ...dotStyle(line.color), r: 4 }}
                        activeDot={{ ...dotStyle(line.color), r: 6 }}
                        connectNulls={false}
                        isAnimationActive={false}
                    />
                ))}
                {best?.value != null && (
                    <ReferenceDot
                        x={best.x}
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
                {ends.map((end, index) =>
                    placement.visible[index] ? (
                        <ReferenceDot
                            key={end.id}
                            x={end.point.x}
                            y={end.label.value}
                            r={0}
                            fill="none"
                            stroke="none"
                            label={{
                                value: end.label.text,
                                position: 'right',
                                offset: LABEL_GAP,
                                fill: 'var(--app-text)',
                                fontSize: 12,
                                fontWeight: 600,
                                className: styles.endLabel,
                            }}
                        />
                    ) : null,
                )}
            </LineChart>
        </div>
    )
}
