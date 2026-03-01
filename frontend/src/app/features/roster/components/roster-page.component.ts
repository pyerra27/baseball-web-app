import {
    Component,
    OnInit,
    inject,
    signal,
    computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MlbApiService } from '../../../core/services/mlb-api.service';
import { Team, RosterResponse } from '../../../core/models/mlb.models';

@Component({
    selector: 'app-roster-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './roster-page.component.html',
    styleUrl: './roster-page.component.css',
})
export class RosterPageComponent implements OnInit {
    private readonly api = inject(MlbApiService);

    // -----------------------------------------------------------------------
    // Signals — state
    // -----------------------------------------------------------------------

    readonly teams = signal<Team[]>([]);
    readonly teamsLoading = signal(false);
    readonly teamsError = signal<string | null>(null);

    readonly selectedSeason = signal<number>(new Date().getFullYear());
    readonly selectedTeamId = signal<number | null>(null);

    readonly roster = signal<RosterResponse | null>(null);
    readonly rosterLoading = signal(false);
    readonly rosterError = signal<string | null>(null);

    // -----------------------------------------------------------------------
    // Computed
    // -----------------------------------------------------------------------

    readonly totalPlayers = computed(() => {
        const r = this.roster();
        if (!r) return 0;
        return r.pitchers.length + r.position_players.length;
    });

    // -----------------------------------------------------------------------
    // Year list — 1900 to current year, descending
    // -----------------------------------------------------------------------

    readonly years: number[] = (() => {
        const currentYear = new Date().getFullYear();
        const result: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            result.push(y);
        }
        return result;
    })();

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    ngOnInit(): void {
        this.loadTeams(this.selectedSeason());
    }

    // -----------------------------------------------------------------------
    // Event handlers
    // -----------------------------------------------------------------------

    onSeasonChange(season: number): void {
        this.selectedSeason.set(Number(season));
        this.selectedTeamId.set(null);
        this.roster.set(null);
        this.rosterError.set(null);
        this.loadTeams(Number(season));
    }

    onTeamChange(teamId: number): void {
        this.selectedTeamId.set(Number(teamId));
        this.loadRoster(Number(teamId), this.selectedSeason());
    }

    // -----------------------------------------------------------------------
    // Data fetching
    // -----------------------------------------------------------------------

    private loadTeams(season: number): void {
        this.teamsLoading.set(true);
        this.teamsError.set(null);
        this.teams.set([]);

        this.api.getTeams(season).subscribe({
            next: (teams) => {
                this.teams.set(teams);
                this.teamsLoading.set(false);
            },
            error: (err) => {
                this.teamsError.set(
                    `Failed to load teams: ${err?.error?.detail ?? err.message ?? 'Unknown error'}`
                );
                this.teamsLoading.set(false);
            },
        });
    }

    private loadRoster(teamId: number, season: number): void {
        this.rosterLoading.set(true);
        this.rosterError.set(null);
        this.roster.set(null);

        this.api.getRoster(teamId, season).subscribe({
            next: (roster) => {
                this.roster.set(roster);
                this.rosterLoading.set(false);
            },
            error: (err) => {
                this.rosterError.set(
                    `Failed to load roster: ${err?.error?.detail ?? err.message ?? 'Unknown error'}`
                );
                this.rosterLoading.set(false);
            },
        });
    }
}
