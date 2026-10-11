import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Column } from '../../../core/api/generated/models';
import { COLUMNS } from '../../../core/state/board.store';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';

/**
 * The keyboard-friendly way to move a task (FR-013, FR-025): a "Move to" menu listing the four
 * columns. The current column is checked and disabled; arrow keys move, Enter picks, Escape closes
 * and returns focus to the button. Picking a column puts the task at the bottom of it.
 */
@Component({
  selector: 'app-move-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, StatusChipComponent],
  template: `
    <button type="button" class="more" [cdkMenuTriggerFor]="menu" [attr.aria-label]="'Move “' + taskTitle() + '” to another column'">
      <span class="material-symbols-outlined" aria-hidden="true">more_horiz</span>
    </button>
    <ng-template #menu>
      <div class="menu glass-overlay" cdkMenu aria-label="Move to">
        <p class="menu-title">Move to</p>
        @for (column of columns; track column) {
          <button type="button" class="item" cdkMenuItem [cdkMenuItemDisabled]="column === current()" (cdkMenuItemTriggered)="picked.emit(column)">
            <app-status-chip [column]="column" />
            @if (column === current()) {
              <span class="current"><span class="material-symbols-outlined" aria-hidden="true">check</span> Current</span>
            }
          </button>
        }
        <p class="hint">↑ ↓ to choose · Enter to move</p>
      </div>
    </ng-template>
  `,
  styles: `
    .more {
      background: none;
      border: 0;
      border-radius: var(--tf-radius-pill);
      color: var(--tf-text-2);
      cursor: pointer;
      padding: 2px 4px;
    }
    .more:hover {
      color: var(--tf-text);
      background: var(--tf-glass-subtle-fill);
    }
    .menu {
      min-width: 220px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-radius: var(--tf-radius-card);
    }
    .menu-title {
      padding: 6px 10px;
      font-weight: 600;
      color: var(--tf-text-2);
      font-size: var(--tf-fs-label-md);
    }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      background: transparent;
      border: 0;
      border-radius: var(--tf-radius-input);
      cursor: pointer;
      color: var(--tf-text);
      text-align: left;
    }
    .item:hover,
    .item:focus-visible,
    .item.cdk-active {
      background: var(--tf-glass-hover-fill);
    }
    .item:disabled {
      cursor: default;
      opacity: 0.7;
    }
    .current {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: var(--tf-accent);
      font-size: var(--tf-fs-body-sm);
    }
    .current .material-symbols-outlined {
      font-size: 16px;
    }
    .hint {
      padding: 8px 10px 4px;
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
    }
  `,
})
export class MoveMenuComponent {
  /** Title of the task (for the button's accessible name). */
  readonly taskTitle = input.required<string>();
  /** The task's current column. */
  readonly current = input.required<Column>();
  /** Emitted with the chosen column. */
  readonly picked = output<Column>();

  protected readonly columns = COLUMNS;
}
