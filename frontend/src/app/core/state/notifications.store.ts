import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { Api } from '../api/generated/api';
import { listNotifications } from '../api/generated/fn/notifications/list-notifications';
import { readAll } from '../api/generated/fn/notifications/read-all';
import { readOne } from '../api/generated/fn/notifications/read-one';
import { NotificationOut } from '../api/generated/models';
import { ViewRefresh } from '../http/api-error.interceptor';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { RealtimeService } from '../realtime/realtime.service';
import { LoadStatus } from './projects.store';

const KEEP = 100;

/**
 * The selected user's notifications and unread count (FR-026 to FR-031). Everything is cleared the
 * moment the selected user changes, so another user's notifications are never shown (FR-031).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(Api);
  private readonly user = inject(CurrentUserStore);
  private readonly realtime = inject(RealtimeService);
  private readonly refresh = inject(ViewRefresh);

  /** Notifications, newest first. */
  readonly items = signal<NotificationOut[]>([]);
  /** Number of unread notifications. */
  readonly unread = signal(0);
  /** Loading state. */
  readonly status = signal<LoadStatus>('idle');
  /** Text for the bell badge: empty at 0, "99+" above 99. */
  readonly badge = computed(() => {
    const count = this.unread();
    return count === 0 ? '' : count > 99 ? '99+' : String(count);
  });

  constructor() {
    effect(() => {
      const current = this.user.user();
      untracked(() => {
        this.items.set([]);
        this.unread.set(0);
        this.status.set('idle');
        if (current) {
          void this.load();
        }
      });
    });
    effect(() => {
      this.refresh.requested();
      untracked(() => {
        if (this.status() === 'ready') {
          void this.load();
        }
      });
    });
    this.realtime.events.subscribe((event) => this.apply(event));
    this.realtime.reconnected.subscribe(() => {
      if (this.user.user()) {
        void this.load();
      }
    });
  }

  /** Load the notification list and unread count. */
  async load(): Promise<void> {
    if (this.status() !== 'ready') {
      this.status.set('loading');
    }
    try {
      const list = await this.api.invoke(listNotifications, { limit: KEEP });
      this.items.set(list.items);
      this.unread.set(list.unread_count);
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  /** Mark one notification read (opening it does this). */
  async markRead(id: number): Promise<void> {
    const note = await this.api.invoke(readOne, { notification_id: id });
    this.items.update((list) => list.map((n) => (n.id === id ? note : n)));
    this.unread.set(this.items().filter((n) => !n.read).length);
  }

  /** Mark all notifications read. */
  async markAllRead(): Promise<void> {
    const result = await this.api.invoke(readAll);
    this.items.update((list) => list.map((n) => ({ ...n, read: true })));
    this.unread.set(result.unread_count);
  }

  /** Apply one live event. */
  apply(event: RealtimeEvent): void {
    if (event.type === 'notification.created') {
      const { notification, unread_count } = event.data;
      this.items.update((list) =>
        list.some((n) => n.id === notification.id) ? list : [notification, ...list].slice(0, KEEP),
      );
      this.unread.set(unread_count);
    } else if (event.type === 'notifications.read') {
      const { ids, unread_count } = event.data;
      this.items.update((list) =>
        list.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)),
      );
      this.unread.set(unread_count);
    }
  }
}
