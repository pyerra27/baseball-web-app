import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Download, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { downloadCsv, downloadPng } from './download'
import styles from './ChartCard.module.css'

type View = 'chart' | 'table'
type Cell = string | number

interface ChartCardProps {
    title: string
    subtitle: string
    /** Base name for downloaded files, without an extension. */
    fileName: string
    chart: ReactNode
    /** Columns and rows of the table view, the chart's accessible equivalent. */
    columns: string[]
    rows: Cell[][]
    /** How many columns at the end hold values. They're right-aligned. Defaults to 1. */
    valueColumns?: number
    /** Header row plus data rows for the CSV download. */
    csvRows: Cell[][]
}

const VIEWS: { value: View; label: string }[] = [
    { value: 'chart', label: 'Chart' },
    { value: 'table', label: 'Table' },
]

/**
 * A titled card that shows a chart or its table, and saves either as a PNG
 * of the card or the data as CSV.
 */
export default function ChartCard({
    title,
    subtitle,
    fileName,
    chart,
    columns,
    rows,
    valueColumns = 1,
    csvRows,
}: ChartCardProps) {
    const titleId = useId()
    const cardRef = useRef<HTMLElement>(null)
    const [view, setView] = useState<View>('chart')
    const [savingPng, setSavingPng] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const firstValueColumn = columns.length - valueColumns
    const valueClass = (index: number) => (index >= firstValueColumn ? styles.valueCell : undefined)

    async function savePng() {
        if (!cardRef.current) return
        setSavingPng(true)
        setError(null)
        try {
            await downloadPng(cardRef.current, `${fileName}.png`)
        } catch {
            setError('Could not save the image. Try again.')
        } finally {
            setSavingPng(false)
        }
    }

    function saveCsv() {
        setError(null)
        try {
            downloadCsv(csvRows, `${fileName}.csv`)
        } catch {
            setError('Could not save the CSV file. Try again.')
        }
    }

    return (
        <section ref={cardRef} className={styles.card} aria-labelledby={titleId}>
            <div className={styles.header}>
                <div className={styles.heading}>
                    <h3 id={titleId} className={styles.title}>{title}</h3>
                    <p className={styles.subtitle}>{subtitle}</p>
                </div>

                {/* Controls are left out of the saved image. */}
                <div className={styles.actions} data-export-exclude>
                    <div className={styles.viewToggle} role="group" aria-label="View">
                        {VIEWS.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={view === option.value}
                                className={clsx(styles.toggleButton, view === option.value && styles.toggleButtonActive)}
                                onClick={() => setView(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={savePng}
                        disabled={savingPng}
                        aria-label="Download PNG"
                    >
                        {savingPng ? <Loader2 size={14} className="spinner" /> : <Download size={14} />}
                        PNG
                    </button>
                    <button
                        type="button"
                        className={styles.actionButton}
                        onClick={saveCsv}
                        aria-label="Download CSV"
                    >
                        <Download size={14} />
                        CSV
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-box" role="alert" data-export-exclude>
                    {error}
                </div>
            )}

            {view === 'chart' ? chart : (
                <div className={styles.tableScroll}>
                    <table className={clsx('data-table', styles.table)}>
                        <thead>
                            <tr>
                                {columns.map((column, index) => (
                                    <th key={column} scope="col" className={valueClass(index)}>{column}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={String(row[0])}>
                                    {row.map((cell, index) => <td key={index} className={valueClass(index)}>{cell}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
