import {
  Column,
  CommentOut,
  NotificationOut,
  ProjectOut,
  TaskOut,
} from '../api/generated/models';

/** Fields every live event carries (contracts/websocket.md). */
export interface EventBase<T extends string, D> {
  type: T;
  event_id: string;
  occurred_at: string;
  actor_id: number | null;
  project_id: number | null;
  request_id: string | null;
  data: D;
}

/** Every live event the server can push, as a discriminated union on `type`. */
export type RealtimeEvent =
  | EventBase<'project.created', ProjectOut>
  | EventBase<'task.created', TaskOut>
  | EventBase<'task.updated', TaskOut>
  | EventBase<
      'task.moved',
      { task: TaskOut; from_column: Column; columns: Partial<Record<Column, number[]>> }
    >
  | EventBase<'comment.created', CommentOut>
  | EventBase<'comment.updated', CommentOut>
  | EventBase<'comment.deleted', { comment_id: number; task_id: number }>
  | EventBase<'notification.created', { notification: NotificationOut; unread_count: number }>
  | EventBase<'notifications.read', { ids: number[] | 'all'; unread_count: number }>;
