import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, untracked } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { Column, TaskOut } from '../../core/api/generated/models';
import { BoardStore, COLUMNS } from '../../core/state/board.store';
import { PageTitle } from '../../core/title.strategy';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { TopNavComponent } from '../../shared/ui/top-nav/top-nav.component';
import { BoardColumnComponent } from './board-column/board-column.component';
import { TaskCreateDialog } from './task-create/task-create.dialog';

/**
 * The project board (US1): four fixed columns, drag and drop (CDK) plus a "Move to" menu on every
 * card, live updates, the empty board and the loading placeholders. The task drawer is a child route
 * shown on top of this page.
 */
@Component({
  selector: 'app-board-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoardColumnComponent, CdkDropListGroup, EmptyStateComponent, RouterOutlet, SkeletonComponent, TopNavComponent],
  template: `
    <app-top-nav [crumbs]="crumbs()" />
    <section class="page">
      @switch (store.status()) {
        @case ('error') {
          <app-empty-state icon="cloud_off" title="Couldn't load this board" message="Check that the server is running.">
            <button type="button" class="btn btn-primary" (click)="reload()">Try again</button>
          </app-empty-state>
        }
        @case ('loading') {
          <div class="columns" aria-busy="true" aria-label="Loading board">
            @for (column of columns; track column) {
              <div class="lane-skeleton glass-lane">
                <app-skeleton width="120px" height="18px" />
                @for (i of [1, 2, 3]; track i) {
                  <div class="card-skeleton glass-card"><app-skeleton height="18px" /><app-skeleton width="70%" height="14px" /><div class="row"><app-skeleton width="28px" height="28px" radius="50%" /><app-skeleton width="90px" height="14px" /></div></div>
                }
              </div>
            }
          </div>
        }
        @default {
          @if (store.board(); as board) {
            <header class="head">
              <div>
                <h1 class="title">{{ board.project.name }}</h1>
                @if (board.project.description) {
                  <p class="desc">{{ board.project.description }}</p>
                }
              </div>
              <button type="button" class="btn btn-primary" (click)="newTask()">
                <span class="material-symbols-outlined" aria-hidden="true">add</span> New task
              </button>
            </header>
            <div class="columns" cdkDropListGroup>
              @for (column of columns; track column) {
                <app-board-column
                  [column]="column"
                  [tasks]="board.columns[column]"
                  (dropped)="drop($event)"
                  (dragStarted)="dragStarted()"
                  (dragEnded)="dragEnded()"
                  (opened)="open($event)"
                  (moved)="moveFromMenu($event)"
                >
                  <div empty>
                    @if (column === 'todo' && boardIsEmpty()) {
                      <app-empty-state icon="sticky_note_2" title="No tasks yet" message="Create the first task to get started.">
                        <button type="button" class="btn btn-primary" (click)="newTask()">New task</button>
                      </app-empty-state>
                    } @else {
                      Nothing here yet
                    }
                  </div>
                </app-board-column>
              }
            </div>
          }
        }
      }
    </section>
    <router-outlet />
  `,
  styles: `
    .page {
      padding: var(--tf-space-xl) var(--tf-space-2xl) var(--tf-space-2xl);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--tf-space-lg);
      margin-bottom: var(--tf-space-xl);
    }
    .title {
      font-size: var(--tf-fs-headline-xl);
      line-height: var(--tf-lh-headline-xl);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .desc {
      color: var(--tf-text-2);
      max-width: 640px;
      margin-top: 4px;
    }
    .columns {
      display: flex;
      gap: var(--tf-gutter);
      align-items: flex-start;
      overflow-x: auto;
      padding-bottom: var(--tf-space-md);
      scroll-snap-type: x proximity;
    }
    .lane-skeleton {
      flex: 1 1 0;
      min-width: var(--tf-lane-min);
      max-width: var(--tf-lane-max);
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: var(--tf-space-md);
    }
    .card-skeleton {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: var(--tf-space-md);
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `,
})
export class BoardPage {
  /** The project id from the URL. */
  readonly projectId = input.required<string>();

  protected readonly store = inject(BoardStore);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly pageTitle = inject(PageTitle);

  protected readonly columns = COLUMNS;
  private dropping = false;

  protected readonly crumbs = computed(() => [
    { label: 'Projects', link: '/projects' },
    { label: this.store.board()?.project.name ?? '…' },
  ]);
  protected readonly boardIsEmpty = computed(() => {
    const board = this.store.board();
    return !!board && COLUMNS.every((c) => board.columns[c].length === 0);
  });

  constructor() {
    effect(() => {
      const id = Number(this.projectId());
      untracked(() => void this.store.load(id));
    });
    effect(() => this.pageTitle.set(this.store.board()?.project.name));
    effect(() => {
      if (this.store.status() === 'notfound') {
        untracked(() => void this.router.navigateByUrl('/projects'));
      }
    });
    inject(DestroyRef).onDestroy(() => this.store.reset());
  }

  /** Try loading the board again. */
  protected reload(): void {
    void this.store.load(Number(this.projectId()));
  }

  /** Open the "New task" dialog. */
  protected newTask(): void {
    const board = this.store.board();
    if (!board) {
      return;
    }
    const ref = this.dialog.open<TaskOut>(TaskCreateDialog, {
      data: { projectId: board.project.id, projectName: board.project.name },
      ariaLabelledBy: 'task-create-title',
      backdropClass: 'tf-scrim',
    });
    ref.closed.subscribe((task) => {
      if (task) {
        this.store.addTask(task);
      }
    });
  }

  /** A drag started: hold incoming live events until the drop is done. */
  protected dragStarted(): void {
    this.store.beginDrag();
  }

  /** A drag ended; if nothing was dropped on a list, release the held events. */
  protected dragEnded(): void {
    queueMicrotask(() => {
      if (!this.dropping) {
        this.store.endDrag();
      }
    });
  }

  /** A card was dropped: move it to the target column at the dropped index (FR-013). */
  protected async drop(event: CdkDragDrop<Column, Column, TaskOut>): Promise<void> {
    this.dropping = true;
    try {
      await this.store.move(event.item.data.id, event.container.data, event.currentIndex);
    } finally {
      this.dropping = false;
      this.store.endDrag();
    }
  }

  /** The keyboard path: the card's "Move to" menu puts the task at the bottom of a column. */
  protected moveFromMenu(event: { task: TaskOut; column: Column }): void {
    void this.store.move(event.task.id, event.column);
  }

  /** Open the task details drawer. */
  protected open(task: TaskOut): void {
    void this.router.navigate(['/projects', task.project_id, 'tasks', task.id]);
  }
}
