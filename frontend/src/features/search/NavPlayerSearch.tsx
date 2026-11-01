import { useNavigate } from 'react-router'

import PlayerSearch from './PlayerSearch'

/** The navigation bar's player search: picking a result opens that player's page. */
export default function NavPlayerSearch() {
    const navigate = useNavigate()

    return (
        <PlayerSearch
            label="Search players"
            hideLabel
            placeholder="Search players…"
            onSelect={player => navigate(`/player/${player.id}`)}
        />
    )
}
