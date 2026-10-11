import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideApiConfiguration } from '../api/generated/api-configuration';
import { NotificationOut, UserOut } from '../api/generated/models';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { WEBSOCKET_FACTORY } from '../realtime/realtime.service';
import { NotificationsStore } from './notifications.store';

const USER1: UserOut = {
  id: 1,
  display_name: 'Alex Morgan',
  role: 'product_manager',
  initials: 'AM',
  avatar_color: '#C4B5FD',
};

const USER2: UserOut = {
  id: 2,
  display_name: 'Sam Lee',
  role: 'engineer',
  initials: 'SL',
  avatar_color: '#5EEAD4',
};

const makeNotification = (id: number, read = false): NotificationOut => ({
  id,
  type: 'task_assigned',
  actor: USER2,
  project: { id: 1, name: 'Customer Portal' },
  task_id: 10,
  task_title: 'Test Task',
  to_column: null,
  comment_preview: null,
  created_at: '2026-01-01T00:00:00Z',
  read,
});

describe('NotificationsStore', () => {
  let store: NotificationsStore;
  let userStore: CurrentUserStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: WEBSOCKET_FACTORY, useValue: () => ({ onopen: null, onmessage: null, onclose: null, close: () => {}, readyState: 1 }) },
      ],
    }).compileComponents();

    userStore = TestBed.inject(CurrentUserStore);
    store = TestBed.inject(NotificationsStore);
  });

  describe('badge computation', () => {
    it('returns empty string when unread is 0', () => {
      store.unread.set(0);
      expect(store.badge()).toBe('');
    });

    it('returns exact count as string when unread is between 1 and 99', () => {
      store.unread.set(5);
      expect(store.badge()).toBe('5');

      store.unread.set(99);
      expect(store.badge()).toBe('99');
    });

    it('returns "99+" when unread exceeds 99', () => {
      store.unread.set(100);
      expect(store.badge()).toBe('99+');

      store.unread.set(150);
      expect(store.badge()).toBe('99+');
    });
  });

  describe('realtime event handling', () => {
    it('applies notification.created event', () => {
      const note = makeNotification(1);
      const event: RealtimeEvent = {
        type: 'notification.created',
        event_id: 'e1',
        occurred_at: '2026-01-01T00:00:00Z',
        actor_id: 2,
        project_id: 1,
        request_id: null,
        data: { notification: note, unread_count: 1 },
      };

      store.apply(event);

      expect(store.items().length).toBe(1);
      expect(store.items()[0].id).toBe(1);
      expect(store.unread()).toBe(1);
    });

    it('applies notifications.read event with specific ids', () => {
      store.items.set([makeNotification(1, false), makeNotification(2, false)]);
      store.unread.set(2);

      const event: RealtimeEvent = {
        type: 'notifications.read',
        event_id: 'e2',
        occurred_at: '2026-01-01T00:00:00Z',
        actor_id: 1,
        project_id: 1,
        request_id: null,
        data: { ids: [1], unread_count: 1 },
      };

      store.apply(event);

      expect(store.items().find((n) => n.id === 1)?.read).toBe(true);
      expect(store.items().find((n) => n.id === 2)?.read).toBe(false);
      expect(store.unread()).toBe(1);
    });
  });
});

