import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'roster',
        pathMatch: 'full',
    },
    {
        path: 'roster',
        loadComponent: () =>
            import('./features/roster/components/roster-page.component').then(
                (m) => m.RosterPageComponent
            ),
    },
    {
        path: '**',
        redirectTo: 'roster',
    },
];
