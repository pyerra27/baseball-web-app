import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import clsx from 'clsx'

import { fetchScores } from '../../services/mlbApi'
import type { GameResult } from '../../models/mlb.models'

import styles from './ScoreCard.module.css'

type Tab = 'today' | 'yesterday'

function getTodayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function GameCard({ game }: { game: GameResult }) {
    const isFinal = game.status === 'Final' || game.status === 'Game Over'
    const { away, home } = game

    return (
        <Link to={`/game/${game.game_pk}`}>
            <div className={styles.gameCard}>
                <TeamRow
                    abbreviation={away.abbreviation}
                    score={away.score}
                    isWinner={away.is_winner}
                    isFinal={isFinal}
                />
                <div className={styles.divider} />
                <TeamRow
                    abbreviation={home.abbreviation}
                    score={home.score}
                    isWinner={home.is_winner}
                    isFinal={isFinal}
                />
                <span className={styles.status}>
                    {game.status}
                </span>
            </div>
        </Link>
    )
}

function TeamRow({
    abbreviation,
    score,
    isWinner,
    isFinal,
}: {
    abbreviation: string
    score: number | null
    isWinner: boolean | null
    isFinal: boolean
}) {
    const winner = isFinal && isWinner === true
    return (
        <div className={clsx(styles.teamRow, winner && styles.winner)}>
            <span className={styles.abbreviation}>{abbreviation}</span>
            <span className={styles.score}>{score ?? '-'}</span>
        </div>
    )
}

function formatDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
    })
}

export default function ScoresTicker() {
    const [activeTab, setActiveTab] = useState<Tab>('yesterday')
    const today = getTodayStr()

    const yesterdayQuery = useQuery({
        queryKey: ['scores', 'yesterday'],
        queryFn: () => fetchScores(),
        staleTime: 5 * 60 * 1000,
    })

    const todayQuery = useQuery({
        queryKey: ['scores', 'today', today],
        queryFn: () => fetchScores(today),
        staleTime: 60 * 1000,
        refetchInterval: 60 * 1000,
    })

    const activeQuery = activeTab === 'today' ? todayQuery : yesterdayQuery
    const date = activeQuery.data?.date
    const games = activeQuery.data?.games ?? []

    return (
        <div className={styles.ticker}>
            <div className={styles.tabs}>
                {(['today', 'yesterday'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(styles.tab, activeTab === tab && styles.activeTab)}
                    >
                        {tab === 'today' ? "Today's Games" : 'Yesterday'}
                    </button>
                ))}
                {date && (
                    <span className={styles.tabDate}>
                        {formatDate(date)}
                    </span>
                )}
                {activeQuery.isFetching && (
                    <Loader2 size={14} className={clsx('spinner', styles.fetchingSpinner)} />
                )}
            </div>

            {activeQuery.isError && (
                <div className="error-box">
                    Failed to load scores: {(activeQuery.error as Error).message}
                </div>
            )}

            {!activeQuery.isFetching && !activeQuery.isError && games.length === 0 && (
                <p className={styles.emptyMessage}>
                    {activeTab === 'today' ? 'No games scheduled today.' : 'No games played.'}
                </p>
            )}

            {games.length > 0 && (
                <div className={styles.games}>
                    {games.map((game) => (
                        <GameCard key={game.game_pk} game={game} />
                    ))}
                </div>
            )}
        </div>
    )
}
