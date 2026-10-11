import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';

import { apiErrorOf, fieldMessage } from '../../../core/http/api-error';
import { CommentsStore } from '../../../core/state/comments.store';
import { cleanText, requiredText } from '../../../core/text/grapheme-length';
import { TextFieldComponent } from '../../../shared/ui/text-field/text-field.component';

/** The composer pinned under the comments: a text area with a counter and a "Post" button (FR-017). */
@Component({
  selector: 'app-comment-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TextFieldComponent],
  template: `
    <form class="composer" (submit)="post($event)" novalidate>
      <app-text-field label="Add a comment" placeholder="Add a comment…" [control]="control" [max]="2000" [multiline]="true" [rows]="3" [required]="true" [submitted]="submitted()" [serverError]="serverError()" />
      <div class="foot"><button type="submit" class="btn btn-primary" [disabled]="busy()">Post</button></div>
    </form>
  `,
  styles: `
    .composer {
      padding: var(--tf-space-md);
      border-top: 1px solid var(--tf-glass-lane-border);
    }
    .foot {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class CommentComposerComponent {
  private readonly store = inject(CommentsStore);

  protected readonly control = new FormControl('', { nonNullable: true, validators: [requiredText(2000, 'Comment')] });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  constructor() {
    this.control.valueChanges.subscribe(() => this.serverError.set(null));
  }

  /** Validate and add the comment; the field is cleared on success. */
  protected async post(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    this.control.markAsTouched();
    if (this.control.invalid) {
      return;
    }
    this.busy.set(true);
    try {
      await this.store.add(cleanText(this.control.value));
      this.control.reset('');
      this.submitted.set(false);
    } catch (error) {
      const info = apiErrorOf(error);
      this.serverError.set(info.status === 422 ? fieldMessage(info, 'body') : null);
    } finally {
      this.busy.set(false);
    }
  }
}
