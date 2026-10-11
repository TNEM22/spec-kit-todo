import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from './toast.service';

/** Toast region: glass toasts bottom right, announced politely to screen readers. */
@Component({
  selector: 'app-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" aria-live="polite" aria-atomic="false">
      @for (toast of service.toasts(); track toast.id) {
        <div class="toast glass-overlay" [class.notfound]="toast.kind === 'notfound'" [class.error]="toast.kind === 'error'" role="status">
          <span class="material-symbols-outlined icon" aria-hidden="true">{{
            toast.kind === 'error' ? 'error' : 'info'
          }}</span>
          <div class="text">
            <p class="title">{{ toast.title }}</p>
            <p class="message">{{ toast.message }}</p>
          </div>
          <button type="button" class="close" aria-label="Dismiss notice" (click)="service.dismiss(toast.id)">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed;
      right: var(--tf-space-lg);
      bottom: var(--tf-space-lg);
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: var(--tf-space-sm);
      max-width: 380px;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 14px 14px 16px;
      border-radius: var(--tf-radius-card);
      border-left: 3px solid var(--tf-accent);
    }
    .toast.notfound {
      border-left-color: var(--tf-warning);
    }
    .toast.error {
      border-left-color: var(--tf-error-border);
    }
    .icon {
      color: var(--tf-accent);
    }
    .notfound .icon {
      color: var(--tf-warning);
    }
    .error .icon {
      color: var(--tf-error);
    }
    .text {
      flex: 1;
    }
    .title {
      font-weight: 600;
      color: var(--tf-text);
    }
    .message {
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
      line-height: var(--tf-lh-body-sm);
      margin-top: 2px;
    }
    .close {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--tf-text-2);
      border-radius: var(--tf-radius-pill);
      padding: 2px;
    }
  `,
})
export class ToastComponent {
  protected readonly service = inject(ToastService);
}
