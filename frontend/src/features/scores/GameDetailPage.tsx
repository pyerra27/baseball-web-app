import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchBoxScore } from '../../services/mlbApi'
import type { PlayerBoxScoreStats, TeamBoxScore } from '../../models/mlb.models'
import { Button } from '@/components/ui/button'

function val(v: number | string | null | undefined): string {
    return v == null ? '-' : String(v)
}

function BattingTable({ players, season }: { players: PlayerBoxScoreStats[]; season: number }) {
    const batters = players.filter(p =>
        p.hitting !== null && ((p.hitting.at_bats ?? 0) > 0 || (p.hitting.base_on_balls ?? 0) > 0)
    )
    return (
        <div className="overflow-x-auto">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="th first:w-full">Batter</th>
                        <th className="th">AB</th>
                        <th className="th">R</th>
                        <th className="th">H</th>
                        <th className="th">2B</th>
                        <th className="th">3B</th>
                        <th className="th">HR</th>
                        <th className="th">RBI</th>
                        <th className="th">BB</th>
                        <th className="th">K</th>
                        <th className="th">LOB</th>
                        <th className="th">AVG</th>
                    </tr>
                </thead>
                <tbody>
                    {batters.map((p) => (
                        <tr key={p.player_id} className="group">
                            <td className="td">
                                <span className="text-app-muted mr-2 text-xs w-4 inline-block text-right">
                                    {p.batting_order ?? ''}
                                </span>
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="app-link"
                                >
                                    {p.full_name}
                                </Link>
                                <span className="ml-2 text-xs text-app-muted">{p.position_abbreviation}</span>
                            </td>
                            <td className="td-muted">{val(p.hitting?.at_bats)}</td>
                            <td className="td-muted">{val(p.hitting?.runs)}</td>
                            <td className="td-muted">{val(p.hitting?.hits)}</td>
                            <td className="td-muted">{val(p.hitting?.doubles)}</td>
                            <td className="td-muted">{val(p.hitting?.triples)}</td>
                            <td className="td-muted">{val(p.hitting?.home_runs)}</td>
                            <td className="td-muted">{val(p.hitting?.rbi)}</td>
                            <td className="td-muted">{val(p.hitting?.base_on_balls)}</td>
                            <td className="td-muted">{val(p.hitting?.strike_outs)}</td>
                            <td className="td-muted">{val(p.hitting?.left_on_base)}</td>
                            <td className="td-muted">{val(p.hitting?.avg)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function PitchingTable({ players, season }: { players: PlayerBoxScoreStats[]; season: number }) {
    return (
        <div className="overflow-x-auto">
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="th first:w-full">Pitcher</th>
                        <th className="th">IP</th>
                        <th className="th">H</th>
                        <th className="th">R</th>
                        <th className="th">ER</th>
                        <th className="th">BB</th>
                        <th className="th">K</th>
                        <th className="th">HR</th>
                        <th className="th">ERA</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.player_id} className="group">
                            <td className="td">
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="app-link"
                                >
                                    {p.full_name}
                                </Link>
                            </td>
                            <td className="td-muted">{val(p.pitching?.innings_pitched)}</td>
                            <td className="td-muted">{val(p.pitching?.hits)}</td>
                            <td className="td-muted">{val(p.pitching?.runs)}</td>
                            <td className="td-muted">{val(p.pitching?.earned_runs)}</td>
                            <td className="td-muted">{val(p.pitching?.base_on_balls)}</td>
                            <td className="td-muted">{val(p.pitching?.strike_outs)}</td>
                            <td className="td-muted">{val(p.pitching?.home_runs)}</td>
                            <td className="td-muted">{val(p.pitching?.era)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function TeamSection({ team, season }: { team: TeamBoxScore; season: number }) {
    return (
        <section className="flex flex-col gap-6">
            <h2 className="font-display text-[1.25rem] font-bold tracking-[0.03em] uppercase text-app-text border-l-4 border-app-accent pl-3">
                {team.team_name}
                <span className="ml-3 text-app-accent text-[1.5rem]">{team.score ?? '-'}</span>
            </h2>

            <div className="flex flex-col gap-2">
                <h3 className="field-label">Batting</h3>
                <BattingTable players={team.batters} season={season} />
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="field-label">Pitching</h3>
                <PitchingTable players={team.pitchers} season={season} />
            </div>
        </section>
    )
}

export default function GameDetailPage() {
    const { gamePk } = useParams<{ gamePk: string }>()
    const navigate = useNavigate()

    const query = useQuery({
        queryKey: ['boxscore', gamePk],
        queryFn: () => fetchBoxScore(Number(gamePk)),
        enabled: !!gamePk,
    })

    return (
        <div className="page">
            <Button
                variant="ghost"
                className="self-start -ml-2 text-app-muted hover:text-app-text"
                onClick={() => navigate(-1)}
            >
                <ChevronLeft className="size-4 mr-1" />
                Back
            </Button>

            {query.isFetching && (
                <div className="loading">
                    <Loader2 className="size-4 animate-spin text-app-accent" />
                    Loading box score…
                </div>
            )}

            {query.isError && (
                <div className="error-box">
                    Failed to load box score: {(query.error as Error).message}
                </div>
            )}

            {query.data && !query.isFetching && (
                <>
                    <div className="accent-bar">
                        <h1 className="page-title">
                            {query.data.away.abbreviation} @ {query.data.home.abbreviation}
                        </h1>
                        <p className="page-sub">{query.data.status}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 max-lg:grid-cols-1">
                        <TeamSection team={query.data.away} season={Number(query.data.game_date.slice(0, 4))} />
                        <TeamSection team={query.data.home} season={Number(query.data.game_date.slice(0, 4))} />
                    </div>
                </>
            )}
        </div>
    )
}
