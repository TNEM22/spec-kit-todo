import { Routes } from '@angular/router';

import { userSelectedGuard } from './core/identity/user-selected.guard';

/**
 * Screens: user selection is open; everything else needs a selected user (FR-005). The task drawer
 * is a child route of its board, so the board stays visible behind it.
 */
export const routes: Routes = [
  {
    path: 'select-user',
    title: 'Who’s working today?',
    loadComponent: () => import('./features/user-select/user-select.page').then((m) => m.UserSelectPage),
  },
  {
    path: 'projects',
    title: 'Projects',
    canActivate: [userSelectedGuard],
    loadComponent: () => import('./features/projects/projects.page').then((m) => m.ProjectsPage),
  },
  {
    path: 'projects/:projectId',
    canActivate: [userSelectedGuard],
    loadComponent: () => import('./features/board/board.page').then((m) => m.BoardPage),
    children: [
      {
        path: 'tasks/:taskId',
        loadComponent: () =>
          import('./features/task-detail/task-detail.drawer').then((m) => m.TaskDetailDrawer),
      },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  { path: '**', redirectTo: 'projects' },
];
