import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { fetchPlayerCareerStats } from '../../services/mlbApi'
import type { TeamSplit, YearlyStats } from '../../models/mlb.models'
import { Button } from '@/components/ui/button'

const thClass = 'text-center text-xs font-semibold tracking-[0.08em] uppercase text-app-muted px-4 pb-2.5 border-b border-app-border whitespace-nowrap first:text-left first:pl-0'
const tdBase = 'text-center px-4 py-3 tabular-nums whitespace-nowrap border-b border-app-border-subtle'
const tdClass = `${tdBase} text-app-text`
const tdHighlight = `${tdBase} text-app-text bg-app-accent-muted`
const tdSub = `${tdBase} text-app-muted text-xs`
const tdSubHighlight = `${tdBase} text-app-muted text-xs bg-app-accent-muted`

type Col = { label: string; value: (s: TeamSplit) => string | number | null | undefined }

const HITTING_COLS: Col[] = [
    { label: 'G',   value: s => s.hitting?.games_played },
    { label: 'PA',  value: s => s.hitting?.plate_appearances },
    { label: 'AB',  value: s => s.hitting?.at_bats },
    { label: 'R',   value: s => s.hitting?.runs },
    { label: 'H',   value: s => s.hitting?.hits },
    { label: '2B',  value: s => s.hitting?.doubles },
    { label: '3B',  value: s => s.hitting?.triples },
    { label: 'HR',  value: s => s.hitting?.home_runs },
    { label: 'RBI', value: s => s.hitting?.rbi },
    { label: 'SB',  value: s => s.hitting?.stolen_bases },
    { label: 'BB',  value: s => s.hitting?.base_on_balls },
    { label: 'AVG', value: s => s.hitting?.avg },
    { label: 'OBP', value: s => s.hitting?.obp },
    { label: 'SLG', value: s => s.hitting?.slg },
    { label: 'OPS', value: s => s.hitting?.ops },
]

const PITCHING_COLS: Col[] = [
    { label: 'G',    value: s => s.pitching?.games_played },
    { label: 'GS',   value: s => s.pitching?.games_started },
    { label: 'W',    value: s => s.pitching?.wins },
    { label: 'L',    value: s => s.pitching?.losses },
    { label: 'SV',   value: s => s.pitching?.saves },
    { label: 'IP',   value: s => s.pitching?.innings_pitched },
    { label: 'H',    value: s => s.pitching?.hits },
    { label: 'ER',   value: s => s.pitching?.earned_runs },
    { label: 'BB',   value: s => s.pitching?.base_on_balls },
    { label: 'SO',   value: s => s.pitching?.strike_outs },
    { label: 'ERA',  value: s => s.pitching?.era },
    { label: 'WHIP', value: s => s.pitching?.whip },
]

function TeamCell({ split, season }: { split: TeamSplit; season: number }) {
    if (split.team_abbreviation === 'TOT') {
        return <span className="text-app-muted">TOT</span>
    }
    if (split.team_id && split.team_abbreviation) {
        return (
            <Link
                to={`/roster?teamId=${split.team_id}&season=${season}`}
                className="text-app-accent hover:underline"
            >
                {split.team_abbreviation}
            </Link>
        )
    }
    return <span>{split.team_abbreviation ?? '—'}</span>
}

function CareerTable({
    title,
    seasons,
    cols,
    highlightSeason,
    highlightRowRef,
}: {
    title: string
    seasons: YearlyStats[]
    cols: Col[]
    highlightSeason: number | null
    highlightRowRef: React.RefObject<HTMLTableRowElement>
}) {
    return (
        <div className="flex flex-col gap-3">
            <h2 className="font-display text-[1.1rem] font-bold tracking-[0.03em] uppercase text-app-text m-0">
                {title}
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className={thClass}>Year</th>
                            <th className={thClass}>Team</th>
                            {cols.map(c => <th key={c.label} className={thClass}>{c.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {seasons.flatMap(yearly => {
                            const isHighlighted = yearly.season === highlightSeason
                            const td = isHighlighted ? tdHighlight : tdClass
                            const tdSplit = isHighlighted ? tdSubHighlight : tdSub

                            // Single-team season — one row, year + team + stats
                            if (!yearly.totals) {
                                const split = yearly.splits[0]
                                return [(
                                    <tr
                                        key={yearly.season}
                                        ref={isHighlighted ? highlightRowRef : undefined}
                                    >
                                        <td className={`${td} font-semibold ${isHighlighted ? 'text-app-accent' : ''}`}>
                                            {yearly.season}
                                        </td>
                                        <td className={td}>
                                            <TeamCell split={split} season={yearly.season} />
                                        </td>
                                        {cols.map(c => (
                                            <td key={c.label} className={td}>{c.value(split) ?? '—'}</td>
                                        ))}
                                    </tr>
                                )]
                            }

                            // Multi-team season — TOT row with year, then indented team splits
                            return [
                                <tr
                                    key={`${yearly.season}-tot`}
                                    ref={isHighlighted ? highlightRowRef : undefined}
                                >
                                    <td className={`${td} font-semibold ${isHighlighted ? 'text-app-accent' : ''}`}>
                                        {yearly.season}
                                    </td>
                                    <td className={`${td} font-semibold`}>TOT</td>
                                    {cols.map(c => (
                                        <td key={c.label} className={`${td} font-semibold`}>
                                            {c.value(yearly.totals!) ?? '—'}
                                        </td>
                                    ))}
                                </tr>,
                                ...yearly.splits.map(split => (
                                    <tr key={`${yearly.season}-${split.team_abbreviation}`}>
                                        <td className={tdSplit} />
                                        <td className={`${tdSplit} pl-6`}>
                                            <TeamCell split={split} season={yearly.season} />
                                        </td>
                                        {cols.map(c => (
                                            <td key={c.label} className={tdSplit}>{c.value(split) ?? '—'}</td>
                                        ))}
                                    </tr>
                                )),
                            ]
                        })}
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
    const highlightRowRef = useRef<HTMLTableRowElement>(null)

    const highlightSeason = Number(searchParams.get('season')) || null

    const query = useQuery({
        queryKey: ['player-career-stats', playerId],
        queryFn: () => fetchPlayerCareerStats(Number(playerId)),
        enabled: !!playerId,
    })

    useEffect(() => {
        if (query.data && highlightRowRef.current) {
            highlightRowRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
        }
    }, [query.data])

    const data = query.data
    const hasHitting = data?.seasons.some(s => s.splits.some(sp => sp.hitting))
    const hasPitching = data?.seasons.some(s => s.splits.some(sp => sp.pitching))

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

            {data && (
                <>
                    <div className="border-l-4 border-app-accent pl-4">
                        <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.02em] text-app-text mb-1">
                            {data.full_name}
                        </h1>
                        <p className="text-app-muted text-[0.95rem] m-0">
                            {data.position_type} · Career Statistics
                        </p>
                    </div>

                    {!hasHitting && !hasPitching && (
                        <div className="text-center py-16 px-8 text-app-muted text-base border-2 border-dashed border-app-border rounded-xl">
                            No career statistics available.
                        </div>
                    )}

                    {hasHitting && (
                        <CareerTable
                            title="Hitting"
                            seasons={data.seasons.filter(s => s.splits.some(sp => sp.hitting))}
                            cols={HITTING_COLS}
                            highlightSeason={highlightSeason}
                            highlightRowRef={highlightRowRef}
                        />
                    )}

                    {hasPitching && (
                        <CareerTable
                            title="Pitching"
                            seasons={data.seasons.filter(s => s.splits.some(sp => sp.pitching))}
                            cols={PITCHING_COLS}
                            highlightSeason={highlightSeason}
                            highlightRowRef={highlightRowRef}
                        />
                    )}
                </>
            )}

        </div>
    )
}
