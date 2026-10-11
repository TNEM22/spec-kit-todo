import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Column } from '../../../core/api/generated/models';
import { COLUMN_LABELS } from '../../../core/state/board.store';

/** A column's colored dot with its name (or the dot alone). */
@Component({
  selector: 'app-status-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="dot" [style.background]="color()" [style.box-shadow]="'0 0 8px ' + color()" aria-hidden="true"></span>
    @if (!dotOnly()) {
      <span class="label">{{ label() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex: none;
    }
    .label {
      font-size: var(--tf-fs-label-md);
      line-height: var(--tf-lh-label-md);
      font-weight: 600;
    }
  `,
})
export class StatusChipComponent {
  /** The column. */
  readonly column = input.required<Column>();
  /** Show only the dot. */
  readonly dotOnly = input(false);
  protected readonly label = computed(() => COLUMN_LABELS[this.column()]);
  protected readonly color = computed(() => `var(--tf-status-${this.column().replaceAll('_', '-')})`);
}
