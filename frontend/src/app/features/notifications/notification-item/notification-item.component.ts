import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Column, NotificationOut } from '../../../core/api/generated/models';
import { COLUMN_LABELS } from '../../../core/state/board.store';
import { relativeTime } from '../../../core/text/relative-time';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';

/**
 * One row of the notification panel. Wording is fixed per event type (FR-028):
 * "<Actor> assigned you <task>", "<Actor> commented on <task>" (with a preview), or
 * "<Actor> moved <task> to <column>". Unread rows have a dot and a visually hidden "Unread" label.
 */
@Component({
  selector: 'app-notification-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, StatusChipComponent],
  template: `
    <button type="button" class="row" [class.unread]="!notification().read" (click)="opened.emit(notification())">
      <app-avatar [user]="notification().actor" [size]="36" />
      <span class="main">
        <span class="line">
          @if (!notification().read) {
            <span class="visually-hidden">Unread. </span>
          }
          <strong>{{ notification().actor.display_name }}</strong>
          {{ verb() }}
          <strong>{{ notification().task_title }}</strong>
          @if (notification().type === 'task_moved' && column()) {
            to <app-status-chip [column]="column()!" />
          }
        </span>
        @if (notification().comment_preview) {
          <span class="preview">“{{ notification().comment_preview }}”</span>
        }
        <span class="meta">
          <span class="material-symbols-outlined icon" aria-hidden="true">{{ icon() }}</span>
          {{ notification().project.name }} · {{ when() }}
        </span>
      </span>
      @if (!notification().read) {
        <span class="dot" aria-hidden="true"></span>
      }
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      text-align: left;
      padding: 12px 14px;
      border-radius: var(--tf-radius-input);
      border: 1px solid transparent;
      background: transparent;
      color: var(--tf-text-2);
      cursor: pointer;
    }
    .row.unread {
      background: var(--tf-glass-subtle-fill);
      border-color: var(--tf-glass-lane-border);
      color: var(--tf-text);
    }
    .row:hover {
      background: var(--tf-glass-hover-fill);
    }
    .main {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .line strong {
      font-weight: 600;
      color: var(--tf-text);
    }
    .line app-status-chip {
      vertical-align: middle;
    }
    .preview {
      font-style: italic;
      font-size: var(--tf-fs-body-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--tf-fs-body-sm);
      color: var(--tf-text-2);
    }
    .icon {
      font-size: 16px;
      color: var(--tf-accent-2);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
      background: var(--tf-unread-dot);
      box-shadow: var(--tf-unread-dot-glow);
      flex: none;
    }
  `,
})
export class NotificationItemComponent {
  /** The notification to show. */
  readonly notification = input.required<NotificationOut>();
  /** Emitted when the row is chosen (click or Enter). */
  readonly opened = output<NotificationOut>();

  protected readonly verb = computed(() => {
    switch (this.notification().type) {
      case 'task_assigned':
        return 'assigned you';
      case 'task_commented':
        return 'commented on';
      default:
        return 'moved';
    }
  });
  protected readonly icon = computed(() => {
    switch (this.notification().type) {
      case 'task_assigned':
        return 'person_add';
      case 'task_commented':
        return 'chat_bubble';
      default:
        return 'arrow_forward';
    }
  });
  protected readonly column = computed<Column | null>(() => {
    const value = this.notification().to_column;
    return value && value in COLUMN_LABELS ? (value as Column) : null;
  });
  protected readonly when = computed(() => relativeTime(this.notification().created_at));
}
