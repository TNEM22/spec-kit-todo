import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { RealtimeService } from '../../../core/realtime/realtime.service';

/** The "Reconnecting…" pill shown while live updates are interrupted (FR-015). */
@Component({
  selector: 'app-connection-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (realtime.status() === 'reconnecting') {
      <span class="pill" role="status">
        <span class="material-symbols-outlined spin" aria-hidden="true">sync</span>
        Reconnecting…
      </span>
    }
  `,
  styles: `
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--tf-radius-pill);
      border: 1px solid var(--tf-warning);
      color: var(--tf-warning);
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
    }
    .spin {
      font-size: 16px;
      animation: spin 1.4s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class ConnectionIndicatorComponent {
  protected readonly realtime = inject(RealtimeService);
}
