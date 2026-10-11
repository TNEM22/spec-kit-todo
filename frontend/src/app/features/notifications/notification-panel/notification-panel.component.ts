import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, ElementRef, inject, output } from '@angular/core';
import { Router } from '@angular/router';

import { NotificationOut } from '../../../core/api/generated/models';
import { NotificationsStore } from '../../../core/state/notifications.store';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { NotificationItemComponent } from '../notification-item/notification-item.component';

/**
 * The notification dropdown: newest first, "Mark all as read", a loading placeholder, an error with
 * retry, and "You're all caught up" when empty. Arrow keys move between rows; Escape (handled by
 * the bell) closes it and returns focus to the bell. Selecting a notification opens its task.
 */
@Component({
  selector: 'app-notification-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, EmptyStateComponent, NotificationItemComponent, SkeletonComponent],
  template: `
    <section class="panel glass-overlay glass-panel-popover" role="dialog" aria-modal="true" aria-label="Notifications" cdkTrapFocus cdkTrapFocusAutoCapture (keydown)="onKey($event)">
      <header class="head">
        <h2 class="title">Notifications</h2>
        @if (store.unread() > 0) {
          <span class="chip">{{ store.unread() }} unread</span>
        }
        <button type="button" class="link-button mark-all" [disabled]="store.unread() === 0" (click)="markAll()">Mark all as read</button>
      </header>
      <div class="list">
        @switch (store.status()) {
          @case ('loading') {
            @for (i of [1, 2, 3]; track i) {
              <div class="skeleton-row"><app-skeleton width="36px" height="36px" radius="50%" /><div class="skeleton-text"><app-skeleton height="14px" /><app-skeleton width="60%" height="12px" /></div></div>
            }
          }
          @case ('error') {
            <app-empty-state icon="cloud_off" title="Couldn't load notifications" message="Check that the server is running.">
              <button type="button" class="btn btn-ghost" (click)="store.load()">Try again</button>
            </app-empty-state>
          }
          @default {
            @if (store.items().length === 0) {
              <app-empty-state icon="notifications_off" title="You're all caught up" message="We'll let you know when someone assigns, comments on or moves your tasks." />
            } @else {
              @for (note of store.items(); track note.id) {
                <app-notification-item [notification]="note" (opened)="open($event)" />
              }
            }
          }
        }
      </div>
    </section>
  `,
  styles: `
    .panel {
      padding: var(--tf-space-md);
      max-height: min(70vh, 560px);
      display: flex;
      flex-direction: column;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px 12px;
      border-bottom: 1px solid var(--tf-glass-lane-border);
    }
    .title {
      font-size: var(--tf-fs-headline-md);
      line-height: var(--tf-lh-headline-md);
      font-weight: 600;
    }
    .chip {
      padding: 1px 10px;
      border-radius: var(--tf-radius-pill);
      font-size: var(--tf-fs-label-sm);
      font-weight: 600;
      color: var(--tf-accent);
      background: rgb(94 234 212 / 0.1);
    }
    .mark-all {
      margin-left: auto;
    }
    .mark-all:disabled {
      color: var(--tf-text-2);
      cursor: not-allowed;
      opacity: 0.6;
    }
    .list {
      overflow-y: auto;
      padding-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .skeleton-row {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
    }
    .skeleton-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  `,
})
export class NotificationPanelComponent {
  protected readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Emitted when the panel wants to close (a notification was opened). */
  readonly closed = output<void>();

  /** Mark everything read. */
  protected async markAll(): Promise<void> {
    try {
      await this.store.markAllRead();
    } catch {
      // the interceptor already told the user
    }
  }

  /** Mark the notification read, close the panel and open its task. */
  protected async open(note: NotificationOut): Promise<void> {
    try {
      await this.store.markRead(note.id);
    } catch {
      // still open the task; the error was reported by the interceptor
    }
    this.closed.emit();
    await this.router.navigate(['/projects', note.project.id, 'tasks', note.task_id]);
  }

  /** Arrow keys move between the rows. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const rows = Array.from(this.host.nativeElement.querySelectorAll<HTMLButtonElement>('button.row'));
    if (rows.length === 0) {
      return;
    }
    event.preventDefault();
    const current = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? (current + 1) % rows.length : (current - 1 + rows.length) % rows.length;
    rows[current === -1 ? 0 : next].focus();
  }
}
