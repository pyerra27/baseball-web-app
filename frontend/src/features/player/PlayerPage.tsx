import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchPlayerStats } from '../../services/mlbApi'
import type { HittingStats, PitchingStats } from '../../models/mlb.models'
import './PlayerPage.css'

const CURRENT_YEAR = new Date().getFullYear()

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
        <div className="stats-section">
            <h2 className="stats-section-title">Hitting</h2>
            <table className="stats-table">
                <thead>
                    <tr>
                        {rows.map((r) => (
                            <th key={r.label}>{r.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {rows.map((r) => (
                            <td key={r.label}>{r.value ?? '—'}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

function PitchingTable({ stats }: { stats: PitchingStats }) {
    const wl = stats.wins !== null && stats.losses !== null
        ? `${stats.wins}-${stats.losses}`
        : null

    const rows: { label: string; value: string | number | null }[] = [
        { label: 'G',   value: stats.games_played },
        { label: 'GS',  value: stats.games_started },
        { label: 'W-L', value: wl },
        { label: 'SV',  value: stats.saves },
        { label: 'IP',  value: stats.innings_pitched },
        { label: 'H',   value: stats.hits },
        { label: 'ER',  value: stats.earned_runs },
        { label: 'BB',  value: stats.base_on_balls },
        { label: 'SO',  value: stats.strike_outs },
        { label: 'ERA', value: stats.era },
        { label: 'WHIP', value: stats.whip },
    ]

    return (
        <div className="stats-section">
            <h2 className="stats-section-title">Pitching</h2>
            <table className="stats-table">
                <thead>
                    <tr>
                        {rows.map((r) => (
                            <th key={r.label}>{r.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        {rows.map((r) => (
                            <td key={r.label}>{r.value ?? '—'}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
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
        <div className="player-page">
            <button className="back-button" onClick={() => navigate(-1)}>
                ← Back
            </button>

            {query.isError && (
                <div className="error-banner">
                    Failed to load player stats: {(query.error as Error).message}
                </div>
            )}

            {query.isPending && (
                <div className="loading-state">
                    <span className="loading-spinner" />
                    Loading stats…
                </div>
            )}

            {query.data && (
                <>
                    <div className="page-header">
                        <h1 className="page-title">{query.data.full_name}</h1>
                        <p className="page-subtitle">
                            {query.data.position_type} · {season} Season
                        </p>
                    </div>

                    {!hasStats && (
                        <div className="empty-prompt">
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
