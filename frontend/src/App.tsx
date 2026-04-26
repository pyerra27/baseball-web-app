import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RosterPage from './features/roster/RosterPage'
import PlayerPage from './features/player/PlayerPage'
import GameDetailPage from './features/scores/GameDetailPage'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/roster" element={<RosterPage />} />
                <Route path="/player/:playerId" element={<PlayerPage />} />
                <Route path="/game/:gamePk" element={<GameDetailPage />} />
                <Route path="*" element={<Navigate to="/roster" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
