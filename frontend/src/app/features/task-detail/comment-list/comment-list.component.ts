import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CommentsStore } from '../../../core/state/comments.store';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/ui/skeleton/skeleton.component';
import { CommentItemComponent } from '../comment-item/comment-item.component';

/** The "Comments · N" heading and the comments, oldest first (FR-018). */
@Component({
  selector: 'app-comment-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommentItemComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    <h3 class="heading">Comments · {{ store.comments().length }}</h3>
    @switch (store.status()) {
      @case ('loading') {
        <div class="list" aria-busy="true"><app-skeleton height="64px" radius="16px" /><app-skeleton height="64px" radius="16px" /></div>
      }
      @case ('error') {
        <app-empty-state icon="cloud_off" title="Couldn't load comments">
          <button type="button" class="btn btn-ghost" (click)="reload()">Try again</button>
        </app-empty-state>
      }
      @default {
        @if (store.comments().length === 0) {
          <p class="none">No comments yet</p>
        } @else {
          <div class="list">
            @for (comment of store.comments(); track comment.id) {
              <app-comment-item [comment]="comment" />
            }
          </div>
        }
      }
    }
  `,
  styles: `
    .heading {
      font-size: var(--tf-fs-label-lg);
      font-weight: 600;
      margin-bottom: var(--tf-space-sm);
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .none {
      color: var(--tf-text-2);
    }
  `,
})
export class CommentListComponent {
  protected readonly store = inject(CommentsStore);

  /** Reload the comments of the open task. */
  protected reload(): void {
    this.store.refreshCurrent();
  }
}
