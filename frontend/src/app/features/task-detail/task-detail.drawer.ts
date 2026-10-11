import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Api } from '../../core/api/generated/api';
import { getTask } from '../../core/api/generated/fn/tasks/get-task';
import { updateTask } from '../../core/api/generated/fn/tasks/update-task';
import { listUsers } from '../../core/api/generated/fn/users/list-users';
import { Column, TaskOut, UserOut } from '../../core/api/generated/models';
import { apiErrorOf, fieldMessage } from '../../core/http/api-error';
import { ViewRefresh } from '../../core/http/api-error.interceptor';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { BoardStore, COLUMNS, COLUMN_LABELS } from '../../core/state/board.store';
import { CommentsStore } from '../../core/state/comments.store';
import { cleanText, optionalText, requiredText } from '../../core/text/grapheme-length';
import { PageTitle } from '../../core/title.strategy';
import { DrawerShellComponent } from '../../shared/ui/drawer-shell/drawer-shell.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { StatusChipComponent } from '../../shared/ui/status-chip/status-chip.component';
import { TextFieldComponent } from '../../shared/ui/text-field/text-field.component';
import { CommentComposerComponent } from './comment-composer/comment-composer.component';
import { CommentListComponent } from './comment-list/comment-list.component';

type Field = 'title' | 'description';

/**
 * The task details drawer (US2, US3): editable title and description, Status (the task's column, the
 * keyboard-friendly way to move it) and Assignee, then the comments. It stays current through live
 * events; if someone changes a field while you are editing it, your unsaved text is kept and a
 * notice says who changed the task (last save wins).
 */
@Component({
  selector: 'app-task-detail-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommentComposerComponent,
    CommentListComponent,
    DrawerShellComponent,
    EmptyStateComponent,
    ReactiveFormsModule,
    SkeletonComponent,
    StatusChipComponent,
    TextFieldComponent,
  ],
  template: `
    <app-drawer-shell label="Task details" (closed)="close()">
      <div class="top">
        @if (task(); as t) {
          <app-status-chip [column]="t.column" />
        } @else {
          <span></span>
        }
        <button type="button" class="close" aria-label="Close task details" (click)="close()">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>

      @switch (status()) {
        @case ('loading') {
          <div class="scroll" aria-busy="true">
            <app-skeleton width="70%" height="28px" />
            <app-skeleton width="50%" height="14px" />
            <app-skeleton height="48px" radius="12px" />
            <app-skeleton height="96px" radius="12px" />
          </div>
        }
        @case ('error') {
          <app-empty-state icon="cloud_off" title="Couldn't load this task" message="Check that the server is running.">
            <button type="button" class="btn btn-primary" (click)="load()">Try again</button>
          </app-empty-state>
        }
        @default {
          @if (task(); as t) {
            <div class="scroll">
              @if (conflict()) {
                <p class="conflict" role="status">{{ conflict() }}. Your unsaved text is kept; saving will replace their change.</p>
              }

              <!-- title -->
              @if (editing() === 'title') {
                <app-text-field label="Title" [control]="titleControl" [max]="200" [required]="true" [submitted]="true" [serverError]="titleError()" />
                <div class="actions">
                  <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
                  <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="save('title')">Save</button>
                </div>
              } @else {
                <div class="titlerow">
                  <h2 class="title">{{ t.title }}</h2>
                  <button type="button" class="icon-btn" aria-label="Edit title" (click)="edit('title')"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
                </div>
              }
              <p class="dates">Created {{ created() }} · Updated {{ updated() }}</p>

              <div class="pickers">
                <div>
                  <label class="label" for="task-status">Status</label>
                  <select id="task-status" class="select" [value]="t.column" (change)="changeStatus($any($event.target).value)">
                    @for (column of columns; track column) {
                      <option [value]="column" [selected]="column === t.column">{{ labels[column] }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="task-assignee">Assignee</label>
                  <select id="task-assignee" class="select" (change)="changeAssignee($any($event.target).value)">
                    <option value="" [selected]="!t.assignee">Unassigned</option>
                    @for (user of users(); track user.id) {
                      <option [value]="user.id" [selected]="t.assignee?.id === user.id">{{ user.display_name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- description -->
              @if (editing() === 'description') {
                <app-text-field label="Description" [control]="descriptionControl" [max]="5000" [multiline]="true" [submitted]="true" [serverError]="descriptionError()" />
                <div class="actions">
                  <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
                  <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="save('description')">Save</button>
                </div>
              } @else {
                <div class="descrow">
                  <p class="label">Description <button type="button" class="icon-btn" aria-label="Edit description" (click)="edit('description')"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button></p>
                  <p class="desc" [class.none]="!t.description">{{ t.description || 'No description yet.' }}</p>
                </div>
              }

              <app-comment-list />
            </div>
            <app-comment-composer />
          }
        }
      }
    </app-drawer-shell>
  `,
  styles: `
    :host {
      display: contents;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--tf-space-md) var(--tf-space-lg) 0;
    }
    .close,
    .icon-btn {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--tf-text-2);
      border-radius: var(--tf-radius-pill);
      padding: 4px;
      display: inline-flex;
    }
    .icon-btn:hover,
    .close:hover {
      color: var(--tf-text);
      background: var(--tf-glass-subtle-fill);
    }
    .scroll {
      flex: 1;
      overflow-y: auto;
      padding: var(--tf-space-md) var(--tf-space-lg);
      display: flex;
      flex-direction: column;
      gap: var(--tf-space-md);
    }
    .titlerow {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .title {
      font-size: var(--tf-fs-headline-lg);
      line-height: var(--tf-lh-headline-lg);
      font-weight: 600;
      letter-spacing: -0.015em;
      overflow-wrap: anywhere;
    }
    .dates {
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
      margin-top: -8px;
    }
    .pickers {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--tf-space-md);
    }
    .label {
      display: block;
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
      margin-bottom: 6px;
    }
    .select {
      width: 100%;
      background: var(--tf-input-fill);
      border: 1px solid var(--tf-input-border);
      border-radius: var(--tf-radius-input);
      color: var(--tf-text);
      font: inherit;
      padding: 10px 14px;
    }
    .select option {
      background: var(--tf-surface-high);
    }
    .desc {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .desc.none {
      color: var(--tf-text-2);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .conflict {
      padding: 10px 14px;
      border-radius: var(--tf-radius-input);
      border-left: 3px solid var(--tf-warning);
      background: rgb(252 211 77 / 0.1);
      color: var(--tf-warning);
    }
  `,
})
export class TaskDetailDrawer {
  /** Project id from the URL. */
  readonly projectId = input.required<string>();
  /** Task id from the URL. */
  readonly taskId = input.required<string>();

  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly realtime = inject(RealtimeService);
  private readonly board = inject(BoardStore);
  private readonly comments = inject(CommentsStore);
  private readonly pageTitle = inject(PageTitle);
  private readonly refresh = inject(ViewRefresh);

  protected readonly columns = COLUMNS;
  protected readonly labels = COLUMN_LABELS;
  protected readonly task = signal<TaskOut | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly users = signal<UserOut[]>([]);
  protected readonly editing = signal<Field | null>(null);
  protected readonly busy = signal(false);
  protected readonly conflict = signal<string | null>(null);
  protected readonly titleError = signal<string | null>(null);
  protected readonly descriptionError = signal<string | null>(null);
  protected readonly titleControl = new FormControl('', { nonNullable: true, validators: [requiredText(200, 'Title')] });
  protected readonly descriptionControl = new FormControl('', { nonNullable: true, validators: [optionalText(5000, 'Description')] });

  protected readonly created = computed(() => this.date(this.task()?.created_at));
  protected readonly updated = computed(() => this.date(this.task()?.updated_at));

  constructor() {
    effect(() => {
      const id = Number(this.taskId());
      untracked(() => {
        this.editing.set(null);
        this.conflict.set(null);
        void this.load(id);
        void this.comments.load(id);
      });
    });
    effect(() => {
      this.refresh.requested();
      untracked(() => {
        if (this.status() === 'ready') {
          void this.load(Number(this.taskId()));
        }
      });
    });
    effect(() => this.pageTitle.set(this.task()?.title, this.board.board()?.project.name));
    this.titleControl.valueChanges.subscribe(() => this.titleError.set(null));
    this.descriptionControl.valueChanges.subscribe(() => this.descriptionError.set(null));
    this.api.invoke(listUsers).then((users) => this.users.set(users), () => undefined);
    this.realtime.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.type === 'task.updated') {
        this.receive(event.data, event.actor_id);
      } else if (event.type === 'task.moved') {
        this.receive(event.data.task, event.actor_id);
      }
    });
  }

  /** Load the task (also the "Try again" action). */
  protected async load(id = Number(this.taskId())): Promise<void> {
    if (this.status() !== 'ready' || this.task()?.id !== id) {
      this.status.set('loading');
    }
    try {
      this.task.set(await this.api.invoke(getTask, { task_id: id }));
      this.status.set('ready');
    } catch (error) {
      if (apiErrorOf(error).status === 404) {
        this.close(); // the interceptor already said it no longer exists
      } else {
        this.status.set('error');
      }
    }
  }

  /** Close the drawer and return to the board. */
  protected close(): void {
    void this.router.navigate(['/projects', this.projectId()]);
  }

  /** Switch a field to its editor. */
  protected edit(field: Field): void {
    const task = this.task();
    if (!task) {
      return;
    }
    this.conflict.set(null);
    (field === 'title' ? this.titleControl : this.descriptionControl).setValue(field === 'title' ? task.title : (task.description ?? ''));
    (field === 'title' ? this.titleControl : this.descriptionControl).markAsPristine();
    this.editing.set(field);
  }

  /** Leave the editor without saving. */
  protected cancel(): void {
    this.conflict.set(null);
    this.editing.set(null);
  }

  /** Save one field with PATCH; the last save wins (spec edge case). */
  protected async save(field: Field): Promise<void> {
    const task = this.task();
    const control = field === 'title' ? this.titleControl : this.descriptionControl;
    control.markAsTouched();
    if (!task || control.invalid) {
      return;
    }
    this.busy.set(true);
    try {
      const updated = await this.api.invoke(updateTask, { task_id: task.id, body: { [field]: cleanText(control.value) } });
      this.task.set(updated);
      this.editing.set(null);
      this.conflict.set(null);
    } catch (error) {
      const info = apiErrorOf(error);
      if (info.status === 422) {
        (field === 'title' ? this.titleError : this.descriptionError).set(fieldMessage(info, field));
      }
    } finally {
      this.busy.set(false);
    }
  }

  /** Change the assignee ("" means Unassigned). */
  protected async changeAssignee(value: string): Promise<void> {
    const task = this.task();
    if (!task) {
      return;
    }
    try {
      this.task.set(await this.api.invoke(updateTask, { task_id: task.id, body: { assignee_id: value === '' ? null : Number(value) } }));
    } catch {
      this.task.update((t) => (t ? { ...t } : t)); // re-render the select with the real value
    }
  }

  /** Change the task's column from the Status select (puts it at the bottom of that column). */
  protected async changeStatus(value: string): Promise<void> {
    const task = this.task();
    if (!task || value === task.column) {
      return;
    }
    const saved = await this.board.move(task.id, value as Column);
    if (saved) {
      this.task.set(saved);
    } else {
      this.task.update((t) => (t ? { ...t } : t));
    }
  }

  /** A live update for this task: merge it, keeping unsaved text and noting the conflict. */
  private receive(incoming: TaskOut, actorId: number | null): void {
    const current = this.task();
    if (!current || incoming.id !== current.id) {
      return;
    }
    const field = this.editing();
    if (field) {
      const control = field === 'title' ? this.titleControl : this.descriptionControl;
      const serverValue = (field === 'title' ? incoming.title : (incoming.description ?? '')) ?? '';
      const previous = (field === 'title' ? current.title : (current.description ?? '')) ?? '';
      if (serverValue !== previous && control.dirty) {
        const who = this.users().find((u) => u.id === actorId)?.display_name ?? 'Someone';
        this.conflict.set(`${who} changed this task`);
      } else if (serverValue !== previous) {
        control.setValue(serverValue);
        control.markAsPristine();
      }
    }
    this.task.set(incoming);
  }

  private date(iso: string | undefined): string {
    return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  }
}
