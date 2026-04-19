import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchPlayerStats } from '../../services/mlbApi'
import type { HittingStats, PitchingStats } from '../../models/mlb.models'
import { Button } from '@/components/ui/button'

const CURRENT_YEAR = new Date().getFullYear()

const thClass = 'text-center text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-4 pb-2.5 border-b border-app-border whitespace-nowrap first:text-left first:pl-0'
const tdClass = 'text-center px-4 py-3 tabular-nums text-app-text whitespace-nowrap first:text-left first:pl-0'

function HittingTable({ stats }: { stats: HittingStats }) {
    const rows: { label: string; value: string | number | null }[] = [
        { label: 'G',   value: stats.games_played },
        { label: 'AB',  value: stats.at_bats },
        { label: 'R',   value: stats.runs },
        { label: 'H',   value: stats.hits },
        { label: '2B',  value: stats.doubles },
        { label: '3B',  value: stats.triples },
        { label: 'HR',  value: stats.home_runs },
        { label: 'RBI', value: stats.rbi },
        { label: 'SB',  value: stats.stolen_bases },
        { label: 'AVG', value: stats.avg },
        { label: 'OBP', value: stats.obp },
        { label: 'SLG', value: stats.slg },
        { label: 'OPS', value: stats.ops },
    ]

    return (
        <div className="flex flex-col gap-3">
            <h2 className="font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase text-app-text m-0">
                Hitting
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            {rows.map((r) => <th key={r.label} className={thClass}>{r.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {rows.map((r) => <td key={r.label} className={tdClass}>{r.value ?? '—'}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function PitchingTable({ stats }: { stats: PitchingStats }) {
    const wl = stats.wins !== null && stats.losses !== null
        ? `${stats.wins}-${stats.losses}`
        : null

    const rows: { label: string; value: string | number | null }[] = [
        { label: 'G',    value: stats.games_played },
        { label: 'GS',   value: stats.games_started },
        { label: 'W-L',  value: wl },
        { label: 'SV',   value: stats.saves },
        { label: 'IP',   value: stats.innings_pitched },
        { label: 'H',    value: stats.hits },
        { label: 'ER',   value: stats.earned_runs },
        { label: 'BB',   value: stats.base_on_balls },
        { label: 'SO',   value: stats.strike_outs },
        { label: 'ERA',  value: stats.era },
        { label: 'WHIP', value: stats.whip },
    ]

    return (
        <div className="flex flex-col gap-3">
            <h2 className="font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase text-app-text m-0">
                Pitching
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            {rows.map((r) => <th key={r.label} className={thClass}>{r.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {rows.map((r) => <td key={r.label} className={tdClass}>{r.value ?? '—'}</td>)}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default function PlayerPage() {
    const { playerId } = useParams<{ playerId: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const season = Number(searchParams.get('season')) || CURRENT_YEAR

    const query = useQuery({
        queryKey: ['player-stats', playerId, season],
        queryFn: () => fetchPlayerStats(Number(playerId), season),
        enabled: !!playerId,
    })

    const hasStats = query.data && (query.data.hitting || query.data.pitching)

    return (
        <div className="flex flex-col gap-8 max-w-[1100px] mx-auto p-8">

            <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="self-start border-app-border bg-transparent text-app-muted hover:border-app-accent hover:text-app-accent hover:bg-transparent"
            >
                <ChevronLeft />
                Back
            </Button>

            {query.isError && (
                <div className="bg-app-error-bg border border-app-error-border rounded-md text-red-400 px-4 py-3 text-sm">
                    Failed to load player stats: {(query.error as Error).message}
                </div>
            )}

            {query.isPending && (
                <div className="flex items-center gap-3 text-app-muted text-[0.95rem] py-8">
                    <Loader2 className="size-4 animate-spin text-app-accent" />
                    Loading stats…
                </div>
            )}

            {query.data && (
                <>
                    <div className="border-l-4 border-app-accent pl-4">
                        <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.02em] text-app-text mb-1">
                            {query.data.full_name}
                        </h1>
                        <p className="text-app-muted text-[0.95rem] m-0">
                            {query.data.position_type} · {season} Season
                        </p>
                    </div>

                    {!hasStats && (
                        <div className="text-center py-16 px-8 text-app-muted text-base border-2 border-dashed border-app-border rounded-xl">
                            No statistics available for the {season} season.
                        </div>
                    )}

                    {query.data.hitting && <HittingTable stats={query.data.hitting} />}
                    {query.data.pitching && <PitchingTable stats={query.data.pitching} />}
                </>
            )}

        </div>
    )
}
