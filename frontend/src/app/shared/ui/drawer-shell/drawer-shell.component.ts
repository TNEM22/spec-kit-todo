import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A right-side slide-over with a dimmed backdrop. Focus is trapped inside while open and returns
 * to the opener when it closes; Escape or a click on the backdrop closes it (FR-025).
 */
@Component({
  selector: 'app-drawer-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule],
  host: { '(keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="closed.emit()" aria-hidden="true"></div>
    <aside class="panel glass-overlay" role="dialog" aria-modal="true" [attr.aria-label]="label()" cdkTrapFocus cdkTrapFocusAutoCapture>
      <ng-content />
    </aside>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(8 12 24 / 0.55);
      backdrop-filter: blur(2px);
    }
    .panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(480px, 100vw);
      display: flex;
      flex-direction: column;
      border-radius: var(--tf-radius-overlay) 0 0 var(--tf-radius-overlay);
      animation: slide 220ms ease-out;
    }
    @keyframes slide {
      from {
        transform: translateX(32px);
        opacity: 0;
      }
    }
  `,
})
export class DrawerShellComponent {
  /** Accessible name of the drawer. */
  readonly label = input('Details');
  /** Emitted on Escape or a click outside the panel. */
  readonly closed = output<void>();
}
