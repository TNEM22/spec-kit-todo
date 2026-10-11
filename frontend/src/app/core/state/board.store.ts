import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { Api } from '../api/generated/api';
import { getBoard } from '../api/generated/fn/projects/get-board';
import { moveTask } from '../api/generated/fn/tasks/move-task';
import { BoardColumns, BoardOut, Column, TaskOut } from '../api/generated/models';
import { ViewRefresh } from '../http/api-error.interceptor';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { RealtimeService } from '../realtime/realtime.service';

/** The four board columns in board order (FR-009). */
export const COLUMNS: readonly Column[] = ['todo', 'in_progress', 'in_review', 'done'];

/** Display names of the columns. */
export const COLUMN_LABELS: Record<Column, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

/** Board loading state; `notfound` means the project does not exist. */
export type BoardStatus = 'idle' | 'loading' | 'ready' | 'notfound' | 'error';

/**
 * Pure helper: return a copy of `board` with the task moved to `column` at index `position`
 * (omitted or past the end means the bottom), positions renumbered. Returns null if the task is
 * not on the board. Mirrors the server's placement rules (data-model.md).
 */
export function placeTask(
  board: BoardOut,
  taskId: number,
  column: Column,
  position?: number | null,
): BoardOut | null {
  const columns = { ...board.columns } as BoardColumns;
  let task: TaskOut | undefined;
  let source: Column | undefined;
  for (const name of COLUMNS) {
    const found = columns[name].find((t) => t.id === taskId);
    if (found) {
      task = found;
      source = name;
    }
  }
  if (!task || !source) {
    return null;
  }
  const without = columns[source].filter((t) => t.id !== taskId);
  const target = source === column ? without : [...columns[column]];
  const index = position == null ? target.length : Math.max(0, Math.min(position, target.length));
  if (source === column && index === columns[source].findIndex((t) => t.id === taskId)) {
    return board; // dropped where it already is
  }
  target.splice(index, 0, { ...task, column });
  columns[source] = renumber(source === column ? target : without);
  columns[column] = renumber(target);
  return { ...board, columns };
}

function renumber(tasks: TaskOut[]): TaskOut[] {
  return tasks.map((t, position) => (t.position === position ? t : { ...t, position }));
}

/**
 * The open board: loads it, applies live events, and moves tasks optimistically with rollback.
 * While a card is being dragged, incoming events wait until the drop finishes so the card never
 * jumps (spec edge case); the server's order then wins (last move wins).
 */
@Injectable({ providedIn: 'root' })
export class BoardStore {
  private readonly api = inject(Api);
  private readonly user = inject(CurrentUserStore);
  private readonly realtime = inject(RealtimeService);
  private readonly refresh = inject(ViewRefresh);

  /** The loaded board, or null. */
  readonly board = signal<BoardOut | null>(null);
  /** Loading state. */
  readonly status = signal<BoardStatus>('idle');

  private projectId: number | null = null;
  private dragging = false;
  private queued: RealtimeEvent[] = [];

  constructor() {
    effect(() => {
      this.user.userChanged();
      untracked(() => this.reset());
    });
    effect(() => {
      this.refresh.requested();
      untracked(() => {
        if (this.projectId !== null && this.status() === 'ready') {
          void this.load(this.projectId);
        }
      });
    });
    this.realtime.events.subscribe((event) => this.receive(event));
    this.realtime.reconnected.subscribe(() => {
      if (this.projectId !== null) {
        void this.load(this.projectId);
      }
    });
  }

  /** Load a project's board. The placeholder shows only when switching projects. */
  async load(projectId: number): Promise<void> {
    if (this.projectId !== projectId || this.status() !== 'ready') {
      this.status.set('loading');
      if (this.projectId !== projectId) {
        this.board.set(null);
      }
    }
    this.projectId = projectId;
    try {
      const board = await this.api.invoke(getBoard, { project_id: projectId });
      if (this.projectId === projectId) {
        this.board.set(board);
        this.status.set('ready');
      }
    } catch (error) {
      if (this.projectId === projectId) {
        this.status.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notfound' : 'error');
      }
    }
  }

  /** Forget the open board (leaving the board page or switching user). */
  reset(): void {
    this.projectId = null;
    this.board.set(null);
    this.status.set('idle');
    this.dragging = false;
    this.queued = [];
  }

  /** A drag started: hold incoming events until the drop is done. */
  beginDrag(): void {
    this.dragging = true;
  }

  /** The drag ended: apply the events that waited. */
  endDrag(): void {
    this.dragging = false;
    const waiting = this.queued;
    this.queued = [];
    for (const event of waiting) {
      this.apply(event);
    }
  }

  /**
   * Move a task now and tell the server. `position` is the target index; omit it to go to the
   * bottom (keyboard "Move to" menu, Status select). Rolls back if the server refuses. Returns the\n   * saved task, or null when nothing changed or the move failed.
   */
  async move(taskId: number, column: Column, position?: number): Promise<TaskOut | null> {
    const before = this.board();
    if (!before) {
      return null;
    }
    const optimistic = placeTask(before, taskId, column, position);
    if (!optimistic || optimistic === before) {
      return null;
    }
    this.board.set(optimistic);
    try {
      const saved = await this.api.invoke(moveTask, {
        task_id: taskId,
        body: position === undefined ? { column } : { column, position },
      });
      this.board.update((b) => (b ? this.replaceTask(b, saved, { keepPlace: false }) : b));
      return saved;
    } catch {
      this.board.set(before); // the interceptor already told the user what happened
      return null;
    }
  }

  /** Add a newly created task at the bottom of its column (also used for the creator's own task). */
  addTask(task: TaskOut): void {
    const board = this.board();
    if (!board || board.project.id !== task.project_id) {
      return;
    }
    if (COLUMNS.some((c) => board.columns[c].some((t) => t.id === task.id))) {
      return; // already here: the live event and the API response both arrive
    }
    const list = [...board.columns[task.column], task];
    this.board.set({ ...board, columns: { ...board.columns, [task.column]: renumber(list) } });
  }

  private receive(event: RealtimeEvent): void {
    if (this.dragging) {
      this.queued.push(event);
    } else {
      this.apply(event);
    }
  }

  /** Apply one live event to the open board. */
  apply(event: RealtimeEvent): void {
    const board = this.board();
    if (!board || this.projectId === null || event.project_id !== this.projectId) {
      return;
    }
    switch (event.type) {
      case 'task.created':
        this.addTask(event.data);
        break;
      case 'task.updated':
        this.board.set(this.replaceTask(board, event.data, { keepPlace: true }));
        break;
      case 'task.moved':
        this.applyMoved(board, event.data.task, event.data.columns);
        break;
      default:
        break;
    }
  }

  private applyMoved(
    board: BoardOut,
    moved: TaskOut,
    affected: Partial<Record<Column, number[]>>,
  ): void {
    const known = new Map<number, TaskOut>();
    for (const c of COLUMNS) {
      for (const t of board.columns[c]) {
        known.set(t.id, t);
      }
    }
    known.set(moved.id, moved);
    const columns = { ...board.columns } as BoardColumns;
    for (const [name, ids] of Object.entries(affected) as [Column, number[]][]) {
      const tasks = ids.map((id) => known.get(id));
      if (tasks.some((t) => t === undefined)) {
        void this.load(this.projectId as number); // we missed something: start from the server
        return;
      }
      columns[name] = (tasks as TaskOut[]).map((t, position) => ({ ...t, column: name, position }));
    }
    // a task that left a column listed in `affected` is already removed by the rebuilt lists above
    this.board.set({ ...board, columns });
  }

  private replaceTask(board: BoardOut, task: TaskOut, options: { keepPlace: boolean }): BoardOut {
    const columns = { ...board.columns } as BoardColumns;
    for (const name of COLUMNS) {
      columns[name] = columns[name].map((t) =>
        t.id === task.id
          ? options.keepPlace
            ? { ...task, column: t.column, position: t.position }
            : { ...task }
          : t,
      );
    }
    return { ...board, columns };
  }
}
