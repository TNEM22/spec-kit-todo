import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Api } from '../../../core/api/generated/api';
import { listUsers } from '../../../core/api/generated/fn/users/list-users';
import { createTask } from '../../../core/api/generated/fn/tasks/create-task';
import { TaskOut, UserOut } from '../../../core/api/generated/models';
import { apiErrorOf, fieldMessage } from '../../../core/http/api-error';
import { cleanText, optionalText, requiredText } from '../../../core/text/grapheme-length';
import { FormAlertComponent } from '../../../shared/ui/form-alert/form-alert.component';
import { ModalShellComponent } from '../../../shared/ui/modal-shell/modal-shell.component';
import { TextFieldComponent } from '../../../shared/ui/text-field/text-field.component';

/** What the dialog needs to know about the board it was opened from. */
export interface TaskCreateData {
  projectId: number;
  projectName: string;
}

/**
 * "New task" dialog (US2, FR-010, FR-012). The task starts at the bottom of To Do. Client checks
 * mirror the server's rules; field errors (422) are shown under their field with a summary banner
 * and the input is kept.
 */
@Component({
  selector: 'app-task-create-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormAlertComponent, ModalShellComponent, ReactiveFormsModule, TextFieldComponent],
  template: `
    <app-modal-shell title="New task" [subtitle]="data.projectName + ' · will be added to To Do'" titleId="task-create-title" (closed)="close()">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate id="task-create-form">
        <app-form-alert [message]="summary()" />
        <app-text-field label="Title" [control]="form.controls.title" [max]="200" [required]="true" [submitted]="submitted()" [serverError]="titleError()" />
        <app-text-field label="Description" [control]="form.controls.description" [max]="5000" [multiline]="true" [submitted]="submitted()" [serverError]="descriptionError()" />
        <label class="label" for="task-assignee">Assignee</label>
        <select id="task-assignee" class="select" [formControl]="form.controls.assignee">
          <option [ngValue]="null">Unassigned</option>
          @for (user of users(); track user.id) {
            <option [ngValue]="user.id">{{ user.display_name }} · {{ user.role === 'product_manager' ? 'Product Manager' : 'Engineer' }}</option>
          }
        </select>
        @if (assigneeError()) {
          <p class="error" role="alert">{{ assigneeError() }}</p>
        }
      </form>
      <div footer>
        <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
        <button type="submit" form="task-create-form" class="btn btn-primary" [disabled]="busy()">Create task</button>
      </div>
    </app-modal-shell>
  `,
  styles: `
    .label {
      display: block;
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
      margin-bottom: 6px;
    }
    .select {
      width: 100%;
      background: var(--tf-input-fill);
      border: 1px solid var(--tf-input-border);
      border-radius: var(--tf-radius-input);
      color: var(--tf-text);
      font: inherit;
      padding: 10px 14px;
    }
    .select option {
      background: var(--tf-surface-high);
      color: var(--tf-text);
    }
    .select:focus {
      outline: none;
      border-color: var(--tf-accent);
      box-shadow: var(--tf-ring-focus);
    }
    .error {
      color: var(--tf-error);
      font-size: var(--tf-fs-body-sm);
      margin-top: 4px;
    }
  `,
})
export class TaskCreateDialog implements OnInit {
  private readonly api = inject(Api);
  private readonly ref = inject<DialogRef<TaskOut>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly data = inject<TaskCreateData>(DIALOG_DATA);

  protected readonly users = signal<UserOut[]>([]);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [requiredText(200, 'Title')] }),
    description: new FormControl('', { nonNullable: true, validators: [optionalText(5000, 'Description')] }),
    assignee: new FormControl<number | null>(null),
  });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly summary = signal('');
  protected readonly titleError = signal<string | null>(null);
  protected readonly descriptionError = signal<string | null>(null);
  protected readonly assigneeError = signal<string | null>(null);

  constructor() {
    this.form.controls.title.valueChanges.subscribe(() => this.titleError.set(null));
    this.form.controls.description.valueChanges.subscribe(() => this.descriptionError.set(null));
    this.form.controls.assignee.valueChanges.subscribe(() => this.assigneeError.set(null));
  }

  ngOnInit(): void {
    this.api.invoke(listUsers).then((users) => this.users.set(users), () => undefined);
  }

  /** Close without creating a task. */
  protected close(): void {
    this.ref.close();
  }

  /** Create the task; keep the dialog open with field errors if it is refused. */
  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.summary.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.summary.set("The task wasn't created. Fix the highlighted field.");
      this.focusFirstInvalid();
      return;
    }
    this.busy.set(true);
    try {
      const task = await this.api.invoke(createTask, {
        project_id: this.data.projectId,
        body: {
          title: cleanText(this.form.controls.title.value),
          description: cleanText(this.form.controls.description.value) || null,
          assignee_id: this.form.controls.assignee.value,
        },
      });
      this.ref.close(task);
    } catch (error) {
      const info = apiErrorOf(error);
      if (info.status === 422) {
        this.titleError.set(fieldMessage(info, 'title'));
        this.descriptionError.set(fieldMessage(info, 'description'));
        this.assigneeError.set(fieldMessage(info, 'assignee_id'));
        this.summary.set("The task wasn't created. Fix the highlighted field.");
        this.focusFirstInvalid();
      } else if (info.status === 404) {
        this.ref.close(); // the project no longer exists; the interceptor already said so
      }
    } finally {
      this.busy.set(false);
    }
  }

  private focusFirstInvalid(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
}
