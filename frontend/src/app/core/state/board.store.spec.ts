import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideApiConfiguration } from '../api/generated/api-configuration';
import { Column, TaskOut, UserOut } from '../api/generated/models';
import { ViewRefresh } from '../http/api-error.interceptor';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { RealtimeService, WEBSOCKET_FACTORY } from '../realtime/realtime.service';
import { BoardStore, COLUMNS, placeTask } from './board.store';

const makeUser = (id: number): UserOut => ({
  id,
  display_name: `User ${id}`,
  role: 'engineer',
  initials: 'U',
  avatar_color: '#5EEAD4',
});

const makeTask = (id: number, column: Column = 'todo', position = 0): TaskOut => ({
  id,
  project_id: 1,
  title: `Task ${id}`,
  description: null,
  column,
  position,
  assignee: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  comment_count: 0,
});

const EMPTY_BOARD = {
  project: { id: 1, name: 'Test Project', description: null, created_at: '2026-01-01T00:00:00Z' },
  columns: { todo: [], in_progress: [], in_review: [], done: [] },
};

describe('placeTask (pure helper)', () => {
  it('moves a task to a different column and renumbers both columns', () => {
    const board = {
      ...EMPTY_BOARD,
      columns: {
        ...EMPTY_BOARD.columns,
        todo: [makeTask(1, 'todo', 0), makeTask(2, 'todo', 1)],
        in_progress: [makeTask(3, 'in_progress', 0)],
      },
    };

    const result = placeTask(board, 1, 'in_progress', 0);
    expect(result).not.toBeNull();
    expect(result!.columns.todo.map((t) => t.id)).toEqual([2]);
    expect(result!.columns.todo[0].position).toBe(0);
    expect(result!.columns.in_progress.map((t) => t.id)).toEqual([1, 3]);
    expect(result!.columns.in_progress[0].position).toBe(0);
    expect(result!.columns.in_progress[1].position).toBe(1);
  });

  it('returns the same board reference when dropped at the same position', () => {
    const board = {
      ...EMPTY_BOARD,
      columns: { ...EMPTY_BOARD.columns, todo: [makeTask(1, 'todo', 0)] },
    };
    const result = placeTask(board, 1, 'todo', 0);
    expect(result).toBe(board); // exact same reference
  });

  it('clamps position to the end when position exceeds the column length', () => {
    const board = {
      ...EMPTY_BOARD,
      columns: {
        ...EMPTY_BOARD.columns,
        todo: [makeTask(1, 'todo', 0)],
        done: [makeTask(2, 'done', 0), makeTask(3, 'done', 1)],
      },
    };
    const result = placeTask(board, 1, 'done', 999);
    expect(result!.columns.done.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('returns null when the task is not on the board', () => {
    expect(placeTask(EMPTY_BOARD, 999, 'todo', 0)).toBeNull();
  });
});

describe('BoardStore', () => {
  let store: BoardStore;
  let realtimeEvents: Subject<RealtimeEvent>;
  let realtimeReconnected: Subject<void>;

  const fakeWs = () => ({ onopen: null, onmessage: null, onclose: null, close: vi.fn(), readyState: 1 });

  beforeEach(async () => {
    realtimeEvents = new Subject();
    realtimeReconnected = new Subject();

    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: WEBSOCKET_FACTORY, useValue: () => fakeWs() },
      ],
    }).compileComponents();

    // Stub the realtime service so we can push events manually
    const realtime = TestBed.inject(RealtimeService);
    Object.defineProperty(realtime, 'events', { value: realtimeEvents, writable: false });
    Object.defineProperty(realtime, 'reconnected', { value: realtimeReconnected, writable: false });

    store = TestBed.inject(BoardStore);
  });

  describe('optimistic move with rollback', () => {
    it('applies the move immediately and confirms with the server response', async () => {
      const board = {
        ...EMPTY_BOARD,
        columns: {
          ...EMPTY_BOARD.columns,
          todo: [makeTask(1, 'todo', 0)],
        },
      };
      store.board.set(board);
      store.status.set('ready');

      // Mock the API to succeed
      const movedTask = { ...makeTask(1, 'in_progress', 0) };
      vi.spyOn(store['api'], 'invoke').mockResolvedValueOnce(movedTask);

      const result = await store.move(1, 'in_progress');
      expect(result).toEqual(movedTask);
      // Board should have task in in_progress
      expect(store.board()!.columns.in_progress.some((t) => t.id === 1)).toBe(true);
    });

    it('rolls back the board to the previous state when the server rejects the move', async () => {
      const board = {
        ...EMPTY_BOARD,
        columns: {
          ...EMPTY_BOARD.columns,
          todo: [makeTask(1, 'todo', 0)],
        },
      };
      store.board.set(board);
      store.status.set('ready');

      vi.spyOn(store['api'], 'invoke').mockRejectedValueOnce(new Error('422'));

      const result = await store.move(1, 'in_progress');
      expect(result).toBeNull();
      // Board should be rolled back: task 1 still in todo
      expect(store.board()!.columns.todo.some((t) => t.id === 1)).toBe(true);
      expect(store.board()!.columns.in_progress).toHaveLength(0);
    });
  });

  describe('event queuing during drag', () => {
    it('queues task.moved events while a drag is in progress and applies them after endDrag', () => {
      const board = {
        ...EMPTY_BOARD,
        columns: {
          ...EMPTY_BOARD.columns,
          todo: [makeTask(10, 'todo', 0)],
        },
      };
      store['projectId'] = 1;
      store.board.set(board);
      store.status.set('ready');

      store.beginDrag();

      // Push a task.updated event during the drag
      const updatedTask = { ...makeTask(10, 'todo', 0), title: 'Updated during drag' };
      realtimeEvents.next({
        type: 'task.updated',
        event_id: 'e1',
        occurred_at: new Date().toISOString(),
        actor_id: 1,
        project_id: 1,
        request_id: null,
        data: updatedTask,
      });

      // Board should NOT yet reflect the update while dragging
      expect(store.board()!.columns.todo[0].title).toBe('Task 10');

      store.endDrag();

      // After endDrag, the queued event is applied
      expect(store.board()!.columns.todo[0].title).toBe('Updated during drag');
    });
  });

  describe('COLUMNS constant', () => {
    it('has all four columns in board order', () => {
      expect(COLUMNS).toEqual(['todo', 'in_progress', 'in_review', 'done']);
    });
  });
});

