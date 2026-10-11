import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ProjectOut } from '../../core/api/generated/models';
import { ProjectsStore } from '../../core/state/projects.store';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { TopNavComponent } from '../../shared/ui/top-nav/top-nav.component';
import { ProjectCardComponent } from './project-card/project-card.component';
import { ProjectCreateDialog } from './project-create/project-create.dialog';

/** The project list: all projects, live counts, and "New project" (US1, US4). */
@Component({
  selector: 'app-projects-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, ProjectCardComponent, SkeletonComponent, TopNavComponent],
  template: `
    <app-top-nav [crumbs]="[{ label: 'Projects' }]" />
    <section class="page">
      <header class="head">
        <div>
          <h1 class="title">Projects</h1>
          @if (store.status() === 'ready') {
            <p class="count">{{ store.projects().length }} {{ store.projects().length === 1 ? 'project' : 'projects' }}</p>
          }
        </div>
        <button type="button" class="btn btn-primary" (click)="create()">
          <span class="material-symbols-outlined" aria-hidden="true">add</span> New project
        </button>
      </header>

      @switch (store.status()) {
        @case ('error') {
          <app-empty-state icon="cloud_off" title="Couldn't load projects" message="Check that the server is running.">
            <button type="button" class="btn btn-primary" (click)="store.load()">Try again</button>
          </app-empty-state>
        }
        @case ('ready') {
          @if (store.projects().length === 0) {
            <app-empty-state icon="folder_open" title="No projects yet" message="Create a project to get started.">
              <button type="button" class="btn btn-primary" (click)="create()">New project</button>
            </app-empty-state>
          } @else {
            <div class="grid">
              @for (project of store.projects(); track project.id) {
                <app-project-card [project]="project" />
              }
            </div>
          }
        }
        @default {
          <div class="grid" aria-busy="true">
            @for (i of [1, 2, 3]; track i) {
              <div class="skeleton-card glass-card"><app-skeleton width="60%" height="22px" /><app-skeleton /><app-skeleton width="80%" /><app-skeleton height="6px" /></div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .page {
      padding: var(--tf-space-2xl);
      max-width: 1280px;
      margin: 0 auto;
    }
    .head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: var(--tf-space-xl);
    }
    .title {
      font-size: var(--tf-fs-headline-xl);
      line-height: var(--tf-lh-headline-xl);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .count {
      color: var(--tf-text-2);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--tf-gutter);
    }
    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: var(--tf-space-lg);
    }
  `,
})
export class ProjectsPage implements OnInit {
  protected readonly store = inject(ProjectsStore);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.store.load();
  }

  /** Open the "New project" dialog; on success open the new, empty board. */
  protected create(): void {
    const ref = this.dialog.open<ProjectOut>(ProjectCreateDialog, {
      ariaLabelledBy: 'project-create-title',
      backdropClass: 'tf-scrim',
    });
    ref.closed.subscribe((project) => {
      if (project) {
        void this.router.navigate(['/projects', project.id]);
      }
    });
  }
}
