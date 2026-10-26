import { useQuery } from '@tanstack/react-query'
import { fetchCurrentSeason } from '../services/mlbApi'

/** The MLB Stats API has reliable data from 1900 on. */
const FIRST_SEASON = 1900

/** Seasons offered by season pickers: `current` back to 1900, newest first. */
export function seasonYears(current: number): number[] {
    return Array.from({ length: current - FIRST_SEASON + 1 }, (_, i) => current - i)
}

/**
 * The newest season the API accepts, and the seasons a picker offers. The
 * backend decides the current season, so before Opening Day pickers don't
 * offer a season the API rejects. `years` is empty until it loads.
 */
export function useSeasons() {
    const query = useQuery({
        queryKey: ['currentSeason'],
        queryFn: fetchCurrentSeason,
    })
    const current = query.data?.season
    return {
        current,
        years: current === undefined ? [] : seasonYears(current),
        isLoading: query.isPending,
        error: query.error,
    }
}
