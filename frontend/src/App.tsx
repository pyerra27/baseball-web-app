import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import { Sun, Moon, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import RosterPage from './features/roster/RosterPage'
import PlayerPage from './features/player/PlayerPage'
import GameDetailPage from './features/scores/GameDetailPage'
import styles from './App.module.css'

// Loaded on demand so the charting library stays out of the other pages' bundle.
const ChartsPage = lazy(() => import('./features/charts/ChartsPage'))

function navLinkClass({ isActive }: { isActive: boolean }) {
    return clsx(styles.navLink, isActive && styles.navLinkActive)
}

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
            <header className={styles.header}>
                <nav aria-label="Main" className={styles.nav}>
                    <NavLink to="/roster" className={navLinkClass}>Roster</NavLink>
                    <NavLink to="/charts" className={navLinkClass}>Charts</NavLink>
                </nav>
            </header>
            <Suspense
                fallback={
                    <div className="page">
                        <div className="loading">
                            <Loader2 size={16} className="spinner" />
                            Loading…
                        </div>
                    </div>
                }
            >
                <Routes>
                    <Route path="/roster" element={<RosterPage />} />
                    <Route path="/charts" element={<ChartsPage />} />
                    <Route path="/player/:playerId" element={<PlayerPage />} />
                    <Route path="/game/:gamePk" element={<GameDetailPage />} />
                    <Route path="*" element={<Navigate to="/roster" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}
