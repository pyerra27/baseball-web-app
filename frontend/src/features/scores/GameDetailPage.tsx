import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchBoxScore } from '../../services/mlbApi'
import type { PlayerBoxScoreStats, TeamBoxScore } from '../../models/mlb.models'
import { Button } from '@/components/ui/button'

const thClass = 'text-left text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-3 pb-2.5 border-b border-app-border whitespace-nowrap first:w-full'
const tdClass = 'text-left px-3 py-2.5 tabular-nums whitespace-nowrap border-b border-app-border-subtle text-app-text text-sm'
const tdMuted = 'text-left px-3 py-2.5 tabular-nums whitespace-nowrap border-b border-app-border-subtle text-app-muted text-sm'

function val(v: number | string | null | undefined): string {
    return v == null ? '-' : String(v)
}

function BattingTable({ players, season }: { players: PlayerBoxScoreStats[]; season: number }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className={thClass}>Batter</th>
                        <th className={thClass}>AB</th>
                        <th className={thClass}>R</th>
                        <th className={thClass}>H</th>
                        <th className={thClass}>2B</th>
                        <th className={thClass}>3B</th>
                        <th className={thClass}>HR</th>
                        <th className={thClass}>RBI</th>
                        <th className={thClass}>BB</th>
                        <th className={thClass}>K</th>
                        <th className={thClass}>LOB</th>
                        <th className={thClass}>AVG</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.player_id} className="group">
                            <td className={tdClass}>
                                <span className="text-app-muted mr-2 text-xs w-4 inline-block text-right">
                                    {p.batting_order ?? ''}
                                </span>
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="text-app-text hover:text-app-accent hover:underline transition-colors duration-150"
                                >
                                    {p.full_name}
                                </Link>
                                <span className="ml-2 text-xs text-app-muted">{p.position_abbreviation}</span>
                            </td>
                            <td className={tdMuted}>{val(p.hitting?.at_bats)}</td>
                            <td className={tdMuted}>{val(p.hitting?.runs)}</td>
                            <td className={tdMuted}>{val(p.hitting?.hits)}</td>
                            <td className={tdMuted}>{val(p.hitting?.doubles)}</td>
                            <td className={tdMuted}>{val(p.hitting?.triples)}</td>
                            <td className={tdMuted}>{val(p.hitting?.home_runs)}</td>
                            <td className={tdMuted}>{val(p.hitting?.rbi)}</td>
                            <td className={tdMuted}>{val(p.hitting?.base_on_balls)}</td>
                            <td className={tdMuted}>{val(p.hitting?.strike_outs)}</td>
                            <td className={tdMuted}>{val(p.hitting?.left_on_base)}</td>
                            <td className={tdMuted}>{val(p.hitting?.avg)}</td>
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
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className={thClass}>Pitcher</th>
                        <th className={thClass}>IP</th>
                        <th className={thClass}>H</th>
                        <th className={thClass}>R</th>
                        <th className={thClass}>ER</th>
                        <th className={thClass}>BB</th>
                        <th className={thClass}>K</th>
                        <th className={thClass}>HR</th>
                        <th className={thClass}>ERA</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.player_id} className="group">
                            <td className={tdClass}>
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="text-app-text hover:text-app-accent hover:underline transition-colors duration-150"
                                >
                                    {p.full_name}
                                </Link>
                            </td>
                            <td className={tdMuted}>{val(p.pitching?.innings_pitched)}</td>
                            <td className={tdMuted}>{val(p.pitching?.hits)}</td>
                            <td className={tdMuted}>{val(p.pitching?.runs)}</td>
                            <td className={tdMuted}>{val(p.pitching?.earned_runs)}</td>
                            <td className={tdMuted}>{val(p.pitching?.base_on_balls)}</td>
                            <td className={tdMuted}>{val(p.pitching?.strike_outs)}</td>
                            <td className={tdMuted}>{val(p.pitching?.home_runs)}</td>
                            <td className={tdMuted}>{val(p.pitching?.era)}</td>
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
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-app-muted">Batting</h3>
                <BattingTable players={team.batters} season={season} />
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-app-muted">Pitching</h3>
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
        <div className="flex flex-col gap-8 max-w-[1100px] mx-auto p-8">
            <Button
                variant="ghost"
                className="self-start -ml-2 text-app-muted hover:text-app-text"
                onClick={() => navigate(-1)}
            >
                <ChevronLeft className="size-4 mr-1" />
                Back
            </Button>

            {query.isFetching && (
                <div className="flex items-center gap-3 text-app-muted text-[0.95rem] py-8">
                    <Loader2 className="size-4 animate-spin text-app-accent" />
                    Loading box score…
                </div>
            )}

            {query.isError && (
                <div className="bg-app-error-bg border border-app-error-border rounded-md text-red-400 px-4 py-3 text-sm">
                    Failed to load box score: {(query.error as Error).message}
                </div>
            )}

            {query.data && !query.isFetching && (
                <>
                    <div className="border-l-4 border-app-accent pl-4">
                        <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.02em] text-app-text mb-1">
                            {query.data.away.abbreviation} @ {query.data.home.abbreviation}
                        </h1>
                        <p className="text-app-muted text-[0.95rem] m-0">{query.data.status}</p>
                    </div>

                    <div className="flex flex-col gap-12">
                        <TeamSection team={query.data.away} season={Number(query.data.game_date.slice(0, 4))} />
                        <TeamSection team={query.data.home} season={Number(query.data.game_date.slice(0, 4))} />
                    </div>
                </>
            )}
        </div>
    )
}
