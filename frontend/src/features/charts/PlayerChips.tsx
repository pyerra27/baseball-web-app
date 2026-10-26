import { Link } from 'react-router'
import { Loader2, X } from 'lucide-react'

import styles from './PlayerChips.module.css'

/** A player on the chart, as their stats load. */
export type ChipPlayer =
    | { status: 'loading'; playerId: number; color: string }
    | { status: 'error'; playerId: number; color: string }
    | { status: 'ready'; playerId: number; color: string; name: string; position: string }

interface PlayerChipsProps {
    /** In slot order. */
    players: ChipPlayer[]
    onRemove: (playerId: number) => void
}

/**
 * The players on the chart. Each chip has a key in the player's line color,
 * a link to their career stats, and a button to take them off the chart.
 */
export default function PlayerChips({ players, onRemove }: PlayerChipsProps) {
    return (
        <ul className={styles.list} aria-label="Players on the chart">
            {players.map(player => (
                <li key={player.playerId} className={styles.chip} aria-busy={player.status === 'loading'}>
                    <span className={styles.lineKey} style={{ background: player.color }} aria-hidden="true" />

                    {player.status === 'ready' && (
                        <>
                            <span className={styles.name}>{player.name}</span>
                            {player.position && <span className={styles.position}>{player.position}</span>}
                            <Link to={`/player/${player.playerId}`} className={styles.careerLink}>
                                Career stats
                            </Link>
                        </>
                    )}

                    {player.status === 'loading' && (
                        <span className={styles.status}>
                            <Loader2 size={14} className="spinner" />
                            Loading player…
                        </span>
                    )}

                    {player.status === 'error' && <span className={styles.status}>Couldn't load player</span>}

                    <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => onRemove(player.playerId)}
                        aria-label={player.status === 'ready' ? `Remove ${player.name}` : 'Remove player'}
                    >
                        <X size={14} />
                    </button>
                </li>
            ))}
        </ul>
    )
}
