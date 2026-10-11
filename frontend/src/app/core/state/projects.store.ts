import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { Api } from '../api/generated/api';
import { listProjects } from '../api/generated/fn/projects/list-projects';
import { ColumnCounts, ProjectSummary } from '../api/generated/models';
import { ViewRefresh } from '../http/api-error.interceptor';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { RealtimeService } from '../realtime/realtime.service';

/** Loading state shared by the stores. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The project list with live per-column counts and the "assigned to you" number (FR-008, FR-015).
 * It resets whenever the selected user changes, because "assigned to you" belongs to that user.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsStore {
  private readonly api = inject(Api);
  private readonly user = inject(CurrentUserStore);
  private readonly realtime = inject(RealtimeService);
  private readonly refresh = inject(ViewRefresh);

  /** Projects in creation order. */
  readonly projects = signal<ProjectSummary[]>([]);
  /** Whether the list is loading, ready or failed. */
  readonly status = signal<LoadStatus>('idle');

  constructor() {
    effect(() => {
      this.user.userChanged();
      untracked(() => {
        this.projects.set([]);
        this.status.set('idle');
      });
    });
    effect(() => {
      this.refresh.requested();
      untracked(() => {
        if (this.status() === 'ready') {
          void this.load();
        }
      });
    });
    this.realtime.events.subscribe((event) => this.apply(event));
    this.realtime.reconnected.subscribe(() => {
      if (this.status() !== 'idle') {
        void this.load();
      }
    });
  }

  /** Load the list from the server; the placeholder shows only on the first load. */
  async load(): Promise<void> {
    if (this.status() !== 'ready') {
      this.status.set('loading');
    }
    try {
      this.projects.set(await this.api.invoke(listProjects));
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  /** Apply one live event. */
  apply(event: RealtimeEvent): void {
    if (this.status() !== 'ready') {
      return;
    }
    const me = this.user.user()?.id;
    switch (event.type) {
      case 'project.created':
        this.projects.update((list) =>
          list.some((p) => p.id === event.data.id)
            ? list
            : [...list, { ...event.data, counts: emptyCounts(), assigned_to_me: 0 }],
        );
        break;
      case 'task.created': {
        const task = event.data;
        this.change(task.project_id, (p) => ({
          ...p,
          counts: { ...p.counts, [task.column]: p.counts[task.column] + 1 },
          assigned_to_me: p.assigned_to_me + (task.assignee?.id === me ? 1 : 0),
        }));
        break;
      }
      case 'task.moved': {
        const { columns, task } = event.data;
        this.change(task.project_id, (p) => {
          const counts = { ...p.counts };
          for (const [column, ids] of Object.entries(columns)) {
            counts[column as keyof ColumnCounts] = ids.length;
          }
          return { ...p, counts };
        });
        break;
      }
      case 'task.updated':
        void this.load(); // the assignee may have changed, which affects "assigned to you"
        break;
      default:
        break;
    }
  }

  private change(projectId: number, update: (p: ProjectSummary) => ProjectSummary): void {
    this.projects.update((list) => list.map((p) => (p.id === projectId ? update(p) : p)));
  }
}

function emptyCounts(): ColumnCounts {
  return { todo: 0, in_progress: 0, in_review: 0, done: 0 };
}
