import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import RosterPage from './features/roster/RosterPage'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/roster" element={<RosterPage />} />
                <Route path="*" element={<Navigate to="/roster" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
