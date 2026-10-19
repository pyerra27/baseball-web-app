import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import RosterPage from './features/roster/RosterPage'
import PlayerPage from './features/player/PlayerPage'
import GameDetailPage from './features/scores/GameDetailPage'
import styles from './App.module.css'

function useTheme() {
    const [dark, setDark] = useState(() => {
        try { return localStorage.getItem('theme') !== 'light' } catch { return true }
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
        try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
    }, [dark])

    return { dark, toggle: () => setDark(d => !d) }
}

export default function App() {
    const { dark, toggle } = useTheme()

    return (
        <BrowserRouter>
            <button
                onClick={toggle}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={styles.themeToggle}
            >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Routes>
                <Route path="/roster" element={<RosterPage />} />
                <Route path="/player/:playerId" element={<PlayerPage />} />
                <Route path="/game/:gamePk" element={<GameDetailPage />} />
                <Route path="*" element={<Navigate to="/roster" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
