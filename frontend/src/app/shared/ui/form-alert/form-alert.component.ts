import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The summary banner at the top of a form that has errors (FR-020). */
@Component({
  selector: 'app-form-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message()) {
      <div class="alert" role="alert">
        <span class="material-symbols-outlined" aria-hidden="true">error</span>
        {{ message() }}
      </div>
    }
  `,
  styles: `
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      margin-bottom: var(--tf-space-md);
      border-radius: var(--tf-radius-input);
      border-left: 3px solid var(--tf-error-border);
      background: rgb(248 113 113 / 0.12);
      color: var(--tf-error);
    }
  `,
})
export class FormAlertComponent {
  /** The summary text; nothing is shown when empty. */
  readonly message = input('');
}
