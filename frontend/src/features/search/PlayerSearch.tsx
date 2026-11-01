import { useEffect, useId, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search } from 'lucide-react'
import clsx from 'clsx'

import { searchPlayers } from '../../services/mlbApi'
import type { PlayerSearchResult } from '../../models/mlb.models'

import styles from './PlayerSearch.module.css'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250
const RESULTS_STALE_MS = 5 * 60 * 1000

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])

    return debounced
}

/** True when one text starts the other, as happens while typing or backspacing. */
function isSameSearch(a: string, b: string): boolean {
    return a.startsWith(b) || b.startsWith(a)
}

/** "2016–present", "1914–1935", or one year for a single-season career. */
function careerYears(player: PlayerSearchResult): string {
    if (player.active) return `${player.debut_year}–present`
    if (player.last_played_year === null || player.last_played_year === player.debut_year) {
        return String(player.debut_year)
    }
    return `${player.debut_year}–${player.last_played_year}`
}

interface PlayerSearchProps {
    label: string
    /** Give the input its label for screen readers only. */
    hideLabel?: boolean
    placeholder?: string
    onSelect: (player: PlayerSearchResult) => void
    /** Players shown dimmed, who can't be picked. */
    disabledIds?: number[]
    disabled?: boolean
}

/**
 * Search box that finds players by name and lists the matches in a popup.
 * Follows the WAI-ARIA combobox pattern, so focus stays in the input and the
 * arrow keys move a highlight through the rows.
 */
export default function PlayerSearch({
    label,
    hideLabel = false,
    placeholder,
    onSelect,
    disabledIds = [],
    disabled = false,
}: PlayerSearchProps) {
    const id = useId()
    const inputId = `${id}-input`
    const listboxId = `${id}-listbox`
    const optionId = (playerId: number) => `${id}-option-${playerId}`

    const [text, setText] = useState('')
    const [focused, setFocused] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    // The row chosen with the arrow keys, if any.
    const [arrowedId, setArrowedId] = useState<number | null>(null)

    const typed = text.trim().toLowerCase()
    const query = useDebouncedValue(typed, DEBOUNCE_MS)
    const canSearch = query.length >= MIN_QUERY_LENGTH

    const search = useQuery({
        queryKey: ['player-search', query],
        queryFn: () => searchPlayers(query),
        enabled: canSearch,
        staleTime: RESULTS_STALE_MS,
        // A failed search shows right away, and the next keystroke tries again.
        retry: false,
        // Keeps the rows up while the text changes, but never shows an unrelated search's rows.
        placeholderData: (previous, previousQuery) =>
            previousQuery && isSameSearch(query, previousQuery.queryKey[1]) ? previous : undefined,
    })

    const players = canSearch && isSameSearch(typed, query) ? search.data?.players : undefined
    // False while older rows are on screen, waiting for the debounce or the response.
    const isCurrent = query === typed && !search.isPlaceholderData

    const selectable = (players ?? []).filter(player => !disabledIds.includes(player.id))
    // The top row is only highlighted once it matches the text, so Enter can't pick from older rows.
    const highlighted = selectable.find(player => player.id === arrowedId)
        ?? (isCurrent ? selectable[0] : undefined)

    const open = focused && !dismissed && !disabled && typed.length >= MIN_QUERY_LENGTH

    let message = ''
    if (isCurrent && search.isError) message = `Search failed: ${search.error.message}`
    else if (!players || (players.length === 0 && !isCurrent)) message = 'Searching…'
    else if (players.length === 0) message = 'No players found'

    function pick(player: PlayerSearchResult) {
        onSelect(player)
        setText('')
        setArrowedId(null)
    }

    function moveHighlight(step: 1 | -1) {
        if (selectable.length === 0) return
        const current = highlighted ? selectable.indexOf(highlighted) : -1
        const nextIndex = current === -1
            ? (step === 1 ? 0 : selectable.length - 1)
            : (current + step + selectable.length) % selectable.length
        const next = selectable[nextIndex]
        setArrowedId(next.id)
        // Optional because jsdom has no scrollIntoView.
        document.getElementById(optionId(next.id))?.scrollIntoView?.({ block: 'nearest' })
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (open) moveHighlight(event.key === 'ArrowDown' ? 1 : -1)
            else setDismissed(false)
        } else if (event.key === 'Enter') {
            event.preventDefault()
            if (open && highlighted) pick(highlighted)
        } else if (event.key === 'Escape') {
            if (open) {
                setDismissed(true)
            } else {
                setText('')
                setArrowedId(null)
            }
        }
    }

    return (
        <div className={clsx('form-field', styles.root)}>
            {!hideLabel && <label htmlFor={inputId} className="field-label">{label}</label>}
            <div className={styles.inputWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                    id={inputId}
                    type="text"
                    role="combobox"
                    className={styles.input}
                    aria-label={hideLabel ? label : undefined}
                    aria-expanded={open}
                    aria-controls={open ? listboxId : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={open && highlighted ? optionId(highlighted.id) : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={50}
                    placeholder={placeholder}
                    disabled={disabled}
                    value={text}
                    onChange={e => {
                        setText(e.target.value)
                        setArrowedId(null)
                        setDismissed(false)
                    }}
                    onFocus={() => {
                        setFocused(true)
                        setDismissed(false)
                    }}
                    onBlur={() => setFocused(false)}
                    onKeyDown={handleKeyDown}
                />
                {search.isFetching && <Loader2 size={16} className={clsx('spinner', styles.inputSpinner)} />}
            </div>

            {open && (
                // Keeps focus in the input, so a click lands before the blur closes the popup.
                <div className={styles.popup} onMouseDown={e => e.preventDefault()}>
                    <ul id={listboxId} role="listbox" aria-label="Matching players" className={styles.listbox}>
                        {(players ?? []).map(player => {
                            const isDisabled = disabledIds.includes(player.id)
                            const isHighlighted = player.id === highlighted?.id
                            const years = careerYears(player)
                            return (
                                <li
                                    key={player.id}
                                    id={optionId(player.id)}
                                    role="option"
                                    aria-label={[player.full_name, player.position_abbreviation, years].filter(Boolean).join(', ')}
                                    aria-selected={isHighlighted}
                                    aria-disabled={isDisabled || undefined}
                                    className={clsx(
                                        styles.option,
                                        isHighlighted && styles.optionActive,
                                        isDisabled && styles.optionDisabled,
                                    )}
                                    onClick={() => {
                                        if (!isDisabled) pick(player)
                                    }}
                                >
                                    <span className={styles.name}>{player.full_name}</span>
                                    {player.position_abbreviation && (
                                        <span
                                            className={clsx(
                                                styles.badge,
                                                player.position_type === 'Pitcher' ? styles.pitcherBadge : styles.fielderBadge,
                                            )}
                                        >
                                            {player.position_abbreviation}
                                        </span>
                                    )}
                                    <span className={styles.years}>{years}</span>
                                </li>
                            )
                        })}
                    </ul>
                    <div role="status" className={styles.status}>{message}</div>
                </div>
            )}
        </div>
    )
}
