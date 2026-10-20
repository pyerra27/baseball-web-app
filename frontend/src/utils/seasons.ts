/**
 * Seasons offered by season pickers, newest first. The MLB Stats API has
 * reliable data from 1900 on.
 *
 * TODO(#2): derive the newest season from the API instead of the calendar,
 * so pickers don't offer a season that hasn't started yet.
 */
export const CURRENT_YEAR = new Date().getFullYear()

export const SEASON_YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i)
