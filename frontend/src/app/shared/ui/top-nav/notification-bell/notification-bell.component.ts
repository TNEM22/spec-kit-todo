import { OverlayModule, ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';

import { NotificationPanelComponent } from '../../../../features/notifications/notification-panel/notification-panel.component';
import { NotificationsStore } from '../../../../core/state/notifications.store';

/**
 * The bell with the unread count in the top navigation bar. It opens the notification panel in an
 * overlay with a dimmed backdrop; Escape or a click outside closes it and focus returns to the bell.
 */
@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule, NotificationPanelComponent],
  template: `
    <button
      #bell
      type="button"
      class="bell glass-subtle"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [class.active]="open()"
      [attr.aria-label]="label()"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
      @if (store.badge()) {
        <span class="badge" aria-hidden="true">{{ store.badge() }}</span>
      }
    </button>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="tf-scrim"
      (backdropClick)="close()"
      (detach)="close()"
      (overlayKeydown)="onKey($event)"
    >
      <app-notification-panel (closed)="close()" />
    </ng-template>
  `,
  styles: `
    .bell {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--tf-text);
      box-shadow: var(--tf-shadow-inset-top);
    }
    .bell.active {
      box-shadow: var(--tf-glow-accent-sm), var(--tf-shadow-inset-top);
      border-color: var(--tf-accent);
    }
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: var(--tf-radius-pill);
      background: var(--tf-badge-bg);
      color: var(--tf-badge-text);
      box-shadow: var(--tf-badge-glow);
      font-size: 11px;
      font-weight: 700;
      line-height: 18px;
      text-align: center;
    }
  `,
})
export class NotificationBellComponent {
  protected readonly store = inject(NotificationsStore);
  private readonly bell = viewChild.required<ElementRef<HTMLButtonElement>>('bell');

  /** Whether the panel is open. */
  readonly open = signal(false);
  /** Panel position: under the bell, aligned to its right edge. */
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];
  /** Accessible name, including the unread count. */
  protected readonly label = computed(() => `Notifications, ${this.store.unread()} unread`);

  /** Open or close the panel. */
  toggle(): void {
    this.open.update((value) => !value);
  }

  /** Close the panel and return focus to the bell. */
  close(): void {
    if (this.open()) {
      this.open.set(false);
      this.bell().nativeElement.focus();
    }
  }

  /** Escape closes the panel. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }
}
