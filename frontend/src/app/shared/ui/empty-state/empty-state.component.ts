import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A calm empty state with an icon, a title, a message and optional projected actions. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="material-symbols-outlined icon" aria-hidden="true">{{ icon() }}</span>
    <p class="title">{{ title() }}</p>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--tf-space-sm);
      padding: var(--tf-space-xl) var(--tf-space-md);
    }
    .icon {
      font-size: 40px;
      color: var(--tf-accent);
      filter: drop-shadow(0 0 10px rgb(94 234 212 / 0.4));
    }
    .title {
      font-size: var(--tf-fs-headline-md);
      line-height: var(--tf-lh-headline-md);
      font-weight: 600;
    }
    .message {
      color: var(--tf-text-2);
      max-width: 280px;
    }
    .actions {
      margin-top: var(--tf-space-sm);
    }
  `,
})
export class EmptyStateComponent {
  /** Material Symbols icon name. */
  readonly icon = input('inbox');
  /** Heading. */
  readonly title = input.required<string>();
  /** Optional secondary line. */
  readonly message = input('');
}
