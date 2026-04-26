import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchScores } from '../../services/mlbApi'
import type { GameResult } from '../../models/mlb.models'
import { cn } from '@/lib/utils'

function GameCard({ game }: { game: GameResult }) {
    const isFinal = game.status === 'Final' || game.status === 'Game Over'
    const { away, home } = game

    return (
        <Link to={`/game/${game.game_pk}`} className="no-underline">
            <div className="bg-app-surface border border-app-border rounded-lg px-4 py-3 flex flex-col gap-2 min-w-[160px] hover:border-app-accent transition-colors duration-150 cursor-pointer">
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
    const scoresQuery = useQuery({
        queryKey: ['scores'],
        queryFn: () => fetchScores(),
        staleTime: 5 * 60 * 1000,
    })

    if (scoresQuery.isError) {
        return (
            <div className="bg-app-error-bg border border-app-error-border rounded-md text-red-400 px-4 py-3 text-sm">
                Failed to load scores: {(scoresQuery.error as Error).message}
            </div>
        )
    }

    const date = scoresQuery.data?.date
    const games = scoresQuery.data?.games ?? []

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <h2 className="font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase text-app-text">
                    Yesterday's Scores
                </h2>
                {date && (
                    <span className="text-xs text-app-muted font-semibold tracking-wide">
                        {formatDate(date)}
                    </span>
                )}
                {scoresQuery.isFetching && (
                    <Loader2 className="size-3.5 animate-spin text-app-accent" />
                )}
            </div>

            {!scoresQuery.isFetching && games.length === 0 && (
                <p className="text-app-muted text-sm">No games played.</p>
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
