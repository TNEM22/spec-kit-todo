import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';

import { Api } from '../api/generated/api';
import { addComment } from '../api/generated/fn/comments/add-comment';
import { deleteComment } from '../api/generated/fn/comments/delete-comment';
import { editComment } from '../api/generated/fn/comments/edit-comment';
import { listComments } from '../api/generated/fn/comments/list-comments';
import { CommentOut } from '../api/generated/models';
import { ViewRefresh } from '../http/api-error.interceptor';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from '../realtime/events';
import { RealtimeService } from '../realtime/realtime.service';
import { LoadStatus } from './projects.store';

/**
 * The comments of the task open in the details drawer, oldest first (FR-018), kept current by live
 * events. Drafts and loaded comments are discarded when the selected user changes (FR-031).
 */
@Injectable({ providedIn: 'root' })
export class CommentsStore {
  private readonly api = inject(Api);
  private readonly user = inject(CurrentUserStore);
  private readonly realtime = inject(RealtimeService);
  private readonly refresh = inject(ViewRefresh);

  /** Comments of the open task. */
  readonly comments = signal<CommentOut[]>([]);
  /** Loading state. */
  readonly status = signal<LoadStatus>('idle');
  /** Emits the id of every comment that was deleted (by anyone) while the task is open. */
  readonly removed = new Subject<number>();

  private taskId: number | null = null;

  constructor() {
    effect(() => {
      this.user.userChanged();
      untracked(() => this.reset());
    });
    effect(() => {
      this.refresh.requested();
      untracked(() => {
        if (this.taskId !== null && this.status() === 'ready') {
          void this.load(this.taskId);
        }
      });
    });
    this.realtime.events.subscribe((event) => this.apply(event));
    this.realtime.reconnected.subscribe(() => {
      if (this.taskId !== null) {
        void this.load(this.taskId);
      }
    });
  }

  /** Load a task's comments. */
  async load(taskId: number): Promise<void> {
    if (this.taskId !== taskId) {
      this.comments.set([]);
      this.status.set('loading');
    }
    this.taskId = taskId;
    try {
      const list = await this.api.invoke(listComments, { task_id: taskId });
      if (this.taskId === taskId) {
        this.comments.set(list);
        this.status.set('ready');
      }
    } catch {
      if (this.taskId === taskId) {
        this.status.set('error');
      }
    }
  }

  /** Reload the comments of the open task (used by the "Try again" button). */
  refreshCurrent(): void {
    if (this.taskId !== null) {
      void this.load(this.taskId);
    }
  }

  /** Forget the open task's comments. */
  reset(): void {
    this.taskId = null;
    this.comments.set([]);
    this.status.set('idle');
  }

  /** Add a comment as the selected user. Throws the HTTP error so the composer can show it. */
  async add(body: string): Promise<void> {
    if (this.taskId === null) {
      return;
    }
    this.upsert(await this.api.invoke(addComment, { task_id: this.taskId, body: { body } }));
  }

  /** Replace the text of one of your comments. */
  async edit(commentId: number, body: string): Promise<void> {
    this.upsert(await this.api.invoke(editComment, { comment_id: commentId, body: { body } }));
  }

  /** Delete one of your comments for everyone. */
  async remove(commentId: number): Promise<void> {
    await this.api.invoke(deleteComment, { comment_id: commentId });
    this.drop(commentId);
  }

  /** Apply one live event for the open task. */
  apply(event: RealtimeEvent): void {
    if (this.taskId === null) {
      return;
    }
    switch (event.type) {
      case 'comment.created':
      case 'comment.updated':
        if (event.data.task_id === this.taskId) {
          this.upsert(event.data);
        }
        break;
      case 'comment.deleted':
        if (event.data.task_id === this.taskId) {
          this.drop(event.data.comment_id);
        }
        break;
      default:
        break;
    }
  }

  private upsert(comment: CommentOut): void {
    this.comments.update((list) =>
      list.some((c) => c.id === comment.id)
        ? list.map((c) => (c.id === comment.id ? comment : c))
        : [...list, comment],
    );
  }

  private drop(commentId: number): void {
    if (this.comments().some((c) => c.id === commentId)) {
      this.comments.update((list) => list.filter((c) => c.id !== commentId));
      this.removed.next(commentId);
    }
  }
}
