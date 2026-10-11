import { CdkDrag, CdkDragDrop, CdkDragStart, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Column, TaskOut } from '../../../core/api/generated/models';
import { COLUMN_LABELS } from '../../../core/state/board.store';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { TaskCardComponent } from '../task-card/task-card.component';

/** A board column: a glowing top line, its name and count, and a drop list of task cards. */
@Component({
  selector: 'app-board-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDrag, CdkDropList, StatusChipComponent, TaskCardComponent],
  template: `
    <section class="lane glass-lane" [style.--status]="'var(--tf-status-' + css() + ')'" [attr.aria-label]="label() + ', ' + tasks().length + ' tasks'">
      <header class="head">
        <h2 class="name"><app-status-chip [column]="column()" /></h2>
        <span class="count" [attr.aria-label]="tasks().length + ' tasks'">{{ tasks().length }}</span>
      </header>
      <div
        class="list"
        cdkDropList
        [cdkDropListData]="column()"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        @for (task of tasks(); track task.id) {
          <app-task-card
            cdkDrag
            [cdkDragData]="task"
            (cdkDragStarted)="dragStarted.emit($event)"
            (cdkDragEnded)="dragEnded.emit()"
            [task]="task"
            (opened)="opened.emit($event)"
            (moved)="moved.emit({ task, column: $event })"
          />
        }
        @if (tasks().length === 0) {
          <div class="empty"><ng-content select="[empty]" /></div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      flex: 1 1 0;
      min-width: var(--tf-lane-min);
      max-width: var(--tf-lane-max);
    }
    .lane {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 280px;
      padding: var(--tf-space-md);
      overflow: hidden;
    }
    .lane::before {
      content: '';
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 2px;
      background: var(--status);
      box-shadow: 0 0 12px var(--status);
      border-radius: 2px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px var(--tf-space-md);
    }
    .name {
      font-size: var(--tf-fs-label-lg);
      font-weight: 600;
    }
    .count {
      min-width: 24px;
      padding: 1px 8px;
      text-align: center;
      border-radius: var(--tf-radius-pill);
      background: var(--tf-glass-subtle-fill);
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      min-height: 80px;
    }
    .empty {
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
      text-align: center;
      padding: var(--tf-space-md) 0;
    }
  `,
})
export class BoardColumnComponent {
  /** Which column this is. */
  readonly column = input.required<Column>();
  /** Its tasks, ordered by position. */
  readonly tasks = input.required<TaskOut[]>();

  /** A card was dropped here or reordered. */
  readonly dropped = output<CdkDragDrop<Column, Column, TaskOut>>();
  /** A card drag started. */
  readonly dragStarted = output<CdkDragStart<TaskOut>>();
  /** A card drag ended (dropped or released outside). */
  readonly dragEnded = output<void>();
  /** A card title was chosen. */
  readonly opened = output<TaskOut>();
  /** A card's "Move to" menu picked a column. */
  readonly moved = output<{ task: TaskOut; column: Column }>();

  protected readonly label = computed(() => COLUMN_LABELS[this.column()]);
  protected readonly css = computed(() => this.column().replaceAll('_', '-'));
}
