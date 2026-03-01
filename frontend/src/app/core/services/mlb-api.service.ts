import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Team, RosterResponse } from '../models/mlb.models';

@Injectable({ providedIn: 'root' })
export class MlbApiService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiBaseUrl;

    /**
     * Fetch all active MLB teams for the given season.
     * Results are returned sorted alphabetically by the backend.
     */
    getTeams(season: number): Observable<Team[]> {
        const params = new HttpParams().set('season', season);
        return this.http.get<Team[]>(`${this.base}/teams`, { params });
    }

    /**
     * Fetch the full-season roster for a team, pre-split into pitchers
     * and position players by the backend.
     */
    getRoster(teamId: number, season: number): Observable<RosterResponse> {
        return this.http.get<RosterResponse>(
            `${this.base}/roster/${teamId}/${season}`
        );
    }
}
