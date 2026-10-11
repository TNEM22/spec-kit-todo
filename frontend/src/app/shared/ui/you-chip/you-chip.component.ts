import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The "You" label that marks the selected user's own tasks; never relies on color alone (FR-014). */
@Component({
  selector: 'app-you-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `You`,
  styles: `
    :host {
      display: inline-block;
      background: var(--tf-accent);
      color: var(--tf-accent-on);
      border-radius: var(--tf-radius-pill);
      padding: 1px 8px;
      font-size: var(--tf-fs-label-sm);
      line-height: var(--tf-lh-label-sm);
      font-weight: 700;
    }
  `,
})
export class YouChipComponent {}
