import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchBoxScore } from '../../services/mlbApi'
import type { PlayerBoxScoreStats, TeamBoxScore } from '../../models/mlb.models'
import clsx from 'clsx'
import styles from './GameDetailPage.module.css'

function val(v: number | string | null | undefined): string {
    return v == null ? '-' : String(v)
}

function BattingTable({ players, season }: { players: PlayerBoxScoreStats[]; season: number }) {
    const batters = players.filter(p =>
        p.hitting !== null && ((p.hitting.at_bats ?? 0) > 0 || (p.hitting.base_on_balls ?? 0) > 0)
    )
    return (
        <div className={styles.tableScroll}>
            <table className={clsx('data-table', styles.boxScoreTable)}>
                <thead>
                    <tr>
                        <th>Batter</th>
                        <th>AB</th>
                        <th>R</th>
                        <th>H</th>
                        <th>2B</th>
                        <th>3B</th>
                        <th>HR</th>
                        <th>RBI</th>
                        <th>BB</th>
                        <th>K</th>
                        <th>LOB</th>
                        <th>AVG</th>
                    </tr>
                </thead>
                <tbody>
                    {batters.map((p) => (
                        <tr key={p.player_id}>
                            <td>
                                <span className={styles.battingOrder}>
                                    {p.batting_order ?? ''}
                                </span>
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="app-link"
                                >
                                    {p.full_name}
                                </Link>
                                <span className={styles.position}>{p.position_abbreviation}</span>
                            </td>
                            <td>{val(p.hitting?.at_bats)}</td>
                            <td>{val(p.hitting?.runs)}</td>
                            <td>{val(p.hitting?.hits)}</td>
                            <td>{val(p.hitting?.doubles)}</td>
                            <td>{val(p.hitting?.triples)}</td>
                            <td>{val(p.hitting?.home_runs)}</td>
                            <td>{val(p.hitting?.rbi)}</td>
                            <td>{val(p.hitting?.base_on_balls)}</td>
                            <td>{val(p.hitting?.strike_outs)}</td>
                            <td>{val(p.hitting?.left_on_base)}</td>
                            <td>{val(p.hitting?.avg)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function PitchingTable({ players, season }: { players: PlayerBoxScoreStats[]; season: number }) {
    return (
        <div className={styles.tableScroll}>
            <table className={clsx('data-table', styles.boxScoreTable)}>
                <thead>
                    <tr>
                        <th>Pitcher</th>
                        <th>IP</th>
                        <th>H</th>
                        <th>R</th>
                        <th>ER</th>
                        <th>BB</th>
                        <th>K</th>
                        <th>HR</th>
                        <th>ERA</th>
                    </tr>
                </thead>
                <tbody>
                    {players.map((p) => (
                        <tr key={p.player_id}>
                            <td>
                                <Link
                                    to={`/player/${p.player_id}?season=${season}`}
                                    className="app-link"
                                >
                                    {p.full_name}
                                </Link>
                            </td>
                            <td>{val(p.pitching?.innings_pitched)}</td>
                            <td>{val(p.pitching?.hits)}</td>
                            <td>{val(p.pitching?.runs)}</td>
                            <td>{val(p.pitching?.earned_runs)}</td>
                            <td>{val(p.pitching?.base_on_balls)}</td>
                            <td>{val(p.pitching?.strike_outs)}</td>
                            <td>{val(p.pitching?.home_runs)}</td>
                            <td>{val(p.pitching?.era)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function TeamSection({ team, season }: { team: TeamBoxScore; season: number }) {
    return (
        <section className={styles.teamSection}>
            <h2 className={styles.teamHeading}>
                {team.team_name}
                <span className={styles.teamScore}>{team.score ?? '-'}</span>
            </h2>

            <div className={styles.statGroup}>
                <h3 className="field-label">Batting</h3>
                <BattingTable players={team.batters} season={season} />
            </div>

            <div className={styles.statGroup}>
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
            <button onClick={() => navigate(-1)} className={styles.backButton}>
                <ChevronLeft size={16} />
                Back
            </button>

            {query.isFetching && (
                <div className="loading">
                    <Loader2 size={16} className="spinner" />
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

                    <div className={styles.teams}>
                        <TeamSection team={query.data.away} season={Number(query.data.game_date.slice(0, 4))} />
                        <TeamSection team={query.data.home} season={Number(query.data.game_date.slice(0, 4))} />
                    </div>
                </>
            )}
        </div>
    )
}
