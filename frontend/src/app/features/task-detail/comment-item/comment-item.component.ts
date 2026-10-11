import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl } from '@angular/forms';

import { CommentOut } from '../../../core/api/generated/models';
import { apiErrorOf, fieldMessage } from '../../../core/http/api-error';
import { CurrentUserStore } from '../../../core/identity/current-user.store';
import { CommentsStore } from '../../../core/state/comments.store';
import { cleanText, requiredText } from '../../../core/text/grapheme-length';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { TextFieldComponent } from '../../../shared/ui/text-field/text-field.component';
import { ToastService } from '../../../shared/ui/toast/toast.service';

/**
 * One comment. Only its author sees "Edit" and "Delete" (FR-019); deleting asks for confirmation
 * first. The text is shown as plain text, so markup stays visible as typed (FR-021). If someone
 * deletes the comment while it is being edited, the editor closes with a notice.
 */
@Component({
  selector: 'app-comment-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, TextFieldComponent],
  template: `
    <article class="comment">
      <app-avatar [user]="comment().author" [size]="32" />
      <div class="main">
        <header class="meta">
          <strong class="author">{{ comment().author.display_name }}</strong>
          @if (mine()) {
            <span class="you">(you)</span>
          }
          <time [attr.datetime]="comment().created_at">{{ when() }}</time>
          @if (comment().edited_at) {
            <span class="edited">edited</span>
          }
        </header>

        @if (editing()) {
          <app-text-field label="Edit comment" [control]="control" [max]="2000" [multiline]="true" [required]="true" [submitted]="submitted()" [serverError]="serverError()" />
          <div class="actions">
            <button type="button" class="btn btn-ghost" (click)="cancelEdit()">Cancel</button>
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="save()">Save</button>
          </div>
        } @else {
          <p class="body">{{ comment().body }}</p>
          @if (mine()) {
            @if (confirming()) {
              <div class="confirm" role="alertdialog" aria-label="Delete this comment?">
                <p>Delete this comment? This can't be undone.</p>
                <div class="actions">
                  <button type="button" class="btn btn-ghost" (click)="cancelDelete()">Cancel</button>
                  <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="confirmDelete()">Delete</button>
                </div>
              </div>
            } @else {
              <div class="links">
                <button type="button" class="link-button" (click)="startEdit()">Edit</button>
                <button type="button" class="link-button danger" (click)="confirming.set(true)">Delete</button>
              </div>
            }
          }
        }
      </div>
    </article>
  `,
  styles: `
    .comment {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--tf-radius-card);
      background: var(--tf-glass-subtle-fill);
      border: 1px solid var(--tf-glass-lane-border);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .meta {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      font-size: var(--tf-fs-body-sm);
      color: var(--tf-text-2);
    }
    .author {
      color: var(--tf-text);
      font-weight: 600;
    }
    .edited {
      font-style: italic;
    }
    .body {
      margin-top: 4px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .links {
      display: flex;
      gap: 14px;
      margin-top: 6px;
      font-size: var(--tf-fs-body-sm);
    }
    .danger {
      color: var(--tf-error);
    }
    .confirm {
      margin-top: 8px;
      padding: 10px 12px;
      border-radius: var(--tf-radius-input);
      background: var(--tf-input-fill);
      border: 1px solid var(--tf-error-border);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }
  `,
})
export class CommentItemComponent {
  private readonly store = inject(CommentsStore);
  private readonly user = inject(CurrentUserStore);
  private readonly toast = inject(ToastService);

  /** The comment to show. */
  readonly comment = input.required<CommentOut>();

  protected readonly editing = signal(false);
  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly control = new FormControl('', { nonNullable: true, validators: [requiredText(2000, 'Comment')] });

  /** True when the selected user wrote this comment. */
  protected readonly mine = computed(() => this.comment().author.id === this.user.user()?.id);
  protected readonly when = computed(() =>
    new Date(this.comment().created_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  );
  private selfDeleting = false;

  constructor() {
    this.store.removed.subscribe((id) => {
      if (id === this.comment().id && !this.selfDeleting && this.editing()) {
        this.toast.show('notfound', 'That comment no longer exists', 'Its author deleted it. The view has been refreshed.');
      }
    });
    effect(() => {
      this.comment();
      untracked(() => this.serverError.set(null));
    });
  }

  /** Switch to the editor with the current text. */
  protected startEdit(): void {
    this.control.setValue(this.comment().body);
    this.submitted.set(false);
    this.serverError.set(null);
    this.editing.set(true);
  }

  /** Leave the editor without saving. */
  protected cancelEdit(): void {
    this.editing.set(false);
  }

  /** Save the edited text. */
  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.control.markAsTouched();
    if (this.control.invalid) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.edit(this.comment().id, cleanText(this.control.value));
      this.editing.set(false);
    } catch (error) {
      const info = apiErrorOf(error);
      this.serverError.set(info.status === 422 ? fieldMessage(info, 'body') : null);
    } finally {
      this.busy.set(false);
    }
  }

  /** Dismiss the delete confirmation. */
  protected cancelDelete(): void {
    this.confirming.set(false);
  }

  /** Delete the comment for everyone. */
  protected async confirmDelete(): Promise<void> {
    this.busy.set(true);
    this.selfDeleting = true;
    try {
      await this.store.remove(this.comment().id);
    } catch {
      this.selfDeleting = false;
      this.confirming.set(false);
    } finally {
      this.busy.set(false);
    }
  }
}
