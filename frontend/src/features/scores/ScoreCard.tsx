import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchScores } from '../../services/mlbApi'
import type { GameResult } from '../../models/mlb.models'
import { cn } from '@/lib/utils'

type Tab = 'today' | 'yesterday'

function getTodayStr(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function GameCard({ game }: { game: GameResult }) {
    const isFinal = game.status === 'Final' || game.status === 'Game Over'
    const { away, home } = game

    return (
        <Link to={`/game/${game.game_pk}`} className="no-underline">
            <div className="game-card">
                <TeamRow
                    abbreviation={away.abbreviation}
                    score={away.score}
                    isWinner={away.is_winner}
                    isFinal={isFinal}
                />
                <div className="h-px bg-app-border-subtle" />
                <TeamRow
                    abbreviation={home.abbreviation}
                    score={home.score}
                    isWinner={home.is_winner}
                    isFinal={isFinal}
                />
                <span className="text-[0.7rem] font-semibold tracking-wider uppercase text-app-muted mt-1">
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
        <div className="flex items-center justify-between gap-4">
            <span className={cn(
                'font-display text-sm tracking-wider uppercase',
                winner ? 'text-app-text font-bold' : 'text-app-muted font-semibold',
            )}>
                {abbreviation}
            </span>
            <span className={cn(
                'font-display text-base tabular-nums',
                winner ? 'text-app-text font-extrabold' : 'text-app-muted',
            )}>
                {score ?? '-'}
            </span>
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
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-app-border-subtle">
                {(['today', 'yesterday'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'pb-2 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 -mb-px',
                            activeTab === tab
                                ? 'border-app-accent text-app-text'
                                : 'border-transparent text-app-muted hover:text-app-text',
                        )}
                    >
                        {tab === 'today' ? "Today's Games" : 'Yesterday'}
                    </button>
                ))}
                {date && (
                    <span className="ml-1 pb-2 text-xs text-app-muted font-semibold tracking-wide">
                        {formatDate(date)}
                    </span>
                )}
                {activeQuery.isFetching && (
                    <Loader2 className="size-3.5 animate-spin text-app-accent mb-0.5" />
                )}
            </div>

            {activeQuery.isError && (
                <div className="error-box">
                    Failed to load scores: {(activeQuery.error as Error).message}
                </div>
            )}

            {!activeQuery.isFetching && !activeQuery.isError && games.length === 0 && (
                <p className="text-app-muted text-sm">
                    {activeTab === 'today' ? 'No games scheduled today.' : 'No games played.'}
                </p>
            )}

            {games.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {games.map((game) => (
                        <GameCard key={game.game_pk} game={game} />
                    ))}
                </div>
            )}
        </div>
    )
}
