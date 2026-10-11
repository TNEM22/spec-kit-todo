import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { Column, TaskOut } from '../../../core/api/generated/models';
import { CurrentUserStore } from '../../../core/identity/current-user.store';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { YouChipComponent } from '../../../shared/ui/you-chip/you-chip.component';
import { MoveMenuComponent } from '../move-menu/move-menu.component';

/**
 * A task on the board: its title (two lines at most), the assignee or "Unassigned", the "You" label
 * and accent edge when it is the selected user's own task (FR-014, FR-016), and the "Move to" menu.
 * The card shows nothing else: no tags, ids, dates, flags or comment counts.
 */
@Component({
  selector: 'app-task-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, MoveMenuComponent, YouChipComponent],
  template: `
    <article class="card glass-card glass-hoverable" [class.mine]="mine()">
      <button type="button" class="title" (click)="opened.emit(task())">{{ task().title }}</button>
      <div class="foot">
        <app-avatar [user]="task().assignee" [size]="28" />
        <span class="assignee" [class.none]="!task().assignee">{{ task().assignee?.display_name ?? 'Unassigned' }}</span>
        @if (mine()) {
          <app-you-chip />
        }
        <span class="spacer"></span>
        <app-move-menu [taskTitle]="task().title" [current]="task().column" (picked)="moved.emit($event)" />
      </div>
    </article>
  `,
  styles: `
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: var(--tf-space-md);
      cursor: grab;
    }
    .card.mine {
      background: var(--tf-glass-hover-fill);
    }
    .card.mine::before {
      content: '';
      position: absolute;
      left: 0;
      top: 12px;
      bottom: 12px;
      width: 3px;
      border-radius: 3px;
      background: var(--tf-accent);
      box-shadow: var(--tf-glow-accent-sm);
    }
    .title {
      background: none;
      border: 0;
      padding: 0;
      text-align: left;
      cursor: pointer;
      font-size: var(--tf-fs-headline-md);
      line-height: var(--tf-lh-headline-md);
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--tf-text);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .assignee {
      font-size: var(--tf-fs-body-sm);
    }
    .assignee.none {
      color: var(--tf-text-2);
    }
    .spacer {
      flex: 1;
    }
  `,
})
export class TaskCardComponent {
  private readonly user = inject(CurrentUserStore);

  /** The task to show. */
  readonly task = input.required<TaskOut>();
  /** Emitted when the title is chosen (opens the details drawer). */
  readonly opened = output<TaskOut>();
  /** Emitted when a column is picked from the "Move to" menu. */
  readonly moved = output<Column>();

  /** True when the task is assigned to the selected user. */
  protected readonly mine = computed(() => {
    const assignee = this.task().assignee;
    return assignee !== null && assignee.id === this.user.user()?.id;
  });
}
