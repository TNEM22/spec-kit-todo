import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Chrome for dialogs opened with the CDK Dialog (which supplies the focus trap, Escape to close
 * and focus return to the opener). Shows a title, an optional subtitle, a close button, the
 * projected body and a projected footer (`[footer]`).
 */
@Component({
  selector: 'app-modal-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h2 class="title" [id]="titleId()">{{ title() }}</h2>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>
      <button type="button" class="close" aria-label="Close" (click)="closed.emit()">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </header>
    <div class="body"><ng-content /></div>
    <footer class="foot"><ng-content select="[footer]" /></footer>
  `,
  styles: `
    :host {
      display: block;
      width: min(560px, calc(100vw - 2rem));
      padding: var(--tf-space-xl);
      border-radius: var(--tf-radius-overlay);
      background: var(--tf-surface-high);
      border: 1px solid var(--tf-glass-overlay-border);
      box-shadow: var(--tf-shadow-overlay);
      color: var(--tf-text);
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--tf-space-md);
      margin-bottom: var(--tf-space-lg);
    }
    .title {
      font-size: var(--tf-fs-headline-lg);
      line-height: var(--tf-lh-headline-lg);
      font-weight: 600;
      letter-spacing: -0.015em;
    }
    .subtitle {
      color: var(--tf-text-2);
      margin-top: 2px;
    }
    .close {
      background: none;
      border: 0;
      cursor: pointer;
      color: var(--tf-text-2);
      border-radius: var(--tf-radius-pill);
      padding: 4px;
    }
    .foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--tf-space-sm);
      margin-top: var(--tf-space-lg);
    }
  `,
})
export class ModalShellComponent {
  /** Dialog title. */
  readonly title = input.required<string>();
  /** Optional line under the title. */
  readonly subtitle = input('');
  /** Id of the title element (for `aria-labelledby`). */
  readonly titleId = input('modal-title');
  /** Emitted when the close button is pressed. */
  readonly closed = output<void>();
}
