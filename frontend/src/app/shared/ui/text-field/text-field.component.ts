import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { map, startWith, switchMap } from 'rxjs';

import { cleanText, graphemeLength } from '../../../core/text/grapheme-length';

let nextId = 0;

/**
 * A labelled text field or text area with a live "n / max" counter and an error message below it
 * that names the field and the rule (FR-020). The count uses the same user-perceived-character
 * rule as the server.
 */
@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <label class="label" [attr.for]="id">
      {{ label() }}
      @if (!required()) {
        <span class="optional">(optional)</span>
      }
    </label>
    @if (multiline()) {
      <textarea class="input" [id]="id" [formControl]="control()" [rows]="rows()" [attr.placeholder]="placeholder() || null" [attr.aria-invalid]="shownError() ? 'true' : null" [attr.aria-describedby]="shownError() ? id + '-error' : null"></textarea>
    } @else {
      <input class="input" type="text" [id]="id" [formControl]="control()" [attr.placeholder]="placeholder() || null" [attr.aria-invalid]="shownError() ? 'true' : null" [attr.aria-describedby]="shownError() ? id + '-error' : null" />
    }
    <div class="foot">
      <p class="error" [id]="id + '-error'" role="alert">
        @if (shownError()) {
          <span class="material-symbols-outlined" aria-hidden="true">error</span>{{ shownError() }}
        }
      </p>
      <span class="counter" [class.over]="count() > max()">{{ count() }} / {{ max() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--tf-space-md);
    }
    .label {
      display: block;
      font-size: var(--tf-fs-label-md);
      line-height: var(--tf-lh-label-md);
      font-weight: 600;
      margin-bottom: 6px;
    }
    .optional {
      color: var(--tf-text-2);
      font-weight: 400;
    }
    .input {
      width: 100%;
      background: var(--tf-input-fill);
      border: 1px solid var(--tf-input-border);
      border-radius: var(--tf-radius-input);
      color: var(--tf-text);
      font: inherit;
      padding: 10px 14px;
      resize: vertical;
    }
    .input:focus {
      outline: none;
      border-color: var(--tf-accent);
      box-shadow: var(--tf-ring-focus);
    }
    .input[aria-invalid='true'] {
      border-color: var(--tf-error-border);
      box-shadow: 0 0 10px rgb(248 113 113 / 0.25);
    }
    .foot {
      display: flex;
      justify-content: space-between;
      gap: var(--tf-space-sm);
      margin-top: 4px;
      min-height: 18px;
    }
    .error {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--tf-error);
      font-size: var(--tf-fs-body-sm);
    }
    .error .material-symbols-outlined {
      font-size: 16px;
    }
    .counter {
      margin-left: auto;
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
    }
    .counter.over {
      color: var(--tf-error);
    }
  `,
})
export class TextFieldComponent {
  /** The form control holding the text. */
  readonly control = input.required<FormControl<string>>();
  /** Visible label. */
  readonly label = input.required<string>();
  /** Maximum number of user-perceived characters (shown in the counter). */
  readonly max = input.required<number>();
  /** Use a multi-line text area. */
  readonly multiline = input(false);
  /** Rows of the text area. */
  readonly rows = input(4);
  /** Whether the field is required (otherwise "(optional)" is shown). */
  readonly required = input(false);
  /** Placeholder text. */
  readonly placeholder = input('');
  /** Set after a failed submit so errors show even on untouched fields. */
  readonly submitted = input(false);
  /** An error from the server for this field; it wins over the local check. */
  readonly serverError = input<string | null>(null);

  protected readonly id = `tf-field-${nextId++}`;

  private readonly value = toSignal(
    toObservable(this.control).pipe(switchMap((c) => c.valueChanges.pipe(startWith(c.value)))),
    { initialValue: '' },
  );
  private readonly touched = toSignal(
    toObservable(this.control).pipe(
      switchMap((c) => c.events.pipe(startWith(null), map(() => c.touched || c.dirty))),
    ),
    { initialValue: false },
  );
  /** Number of user-perceived characters in the trimmed text. */
  protected readonly count = computed(() => graphemeLength(cleanText(String(this.value() ?? ''))));

  /** The message to show: the server's, or the local rule once the field was touched or submitted. */
  protected readonly shownError = computed<string | null>(() => {
    const server = this.serverError();
    if (server) {
      return server;
    }
    if (!(this.submitted() || this.touched())) {
      return null;
    }
    this.value(); // re-evaluate on every change
    const errors = this.control().errors;
    return typeof errors?.['text'] === 'string' ? errors['text'] : null;
  });
}
