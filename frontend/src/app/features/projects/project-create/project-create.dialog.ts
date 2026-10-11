import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { Api } from '../../../core/api/generated/api';
import { createProject } from '../../../core/api/generated/fn/projects/create-project';
import { ProjectOut } from '../../../core/api/generated/models';
import { apiErrorOf, fieldMessage } from '../../../core/http/api-error';
import { COLUMNS } from '../../../core/state/board.store';
import { cleanText, optionalText, requiredText } from '../../../core/text/grapheme-length';
import { FormAlertComponent } from '../../../shared/ui/form-alert/form-alert.component';
import { ModalShellComponent } from '../../../shared/ui/modal-shell/modal-shell.component';
import { StatusChipComponent } from '../../../shared/ui/status-chip/status-chip.component';
import { TextFieldComponent } from '../../../shared/ui/text-field/text-field.component';

/**
 * "New project" dialog (US4, FR-007). Client checks mirror the server rules; the server stays
 * authoritative, and a duplicate name (409) or any field error is shown under its field with a
 * summary banner while the input is kept.
 */
@Component({
  selector: 'app-project-create-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormAlertComponent, ModalShellComponent, ReactiveFormsModule, StatusChipComponent, TextFieldComponent],
  template: `
    <app-modal-shell title="New project" subtitle="Everyone on the team will see this project." titleId="project-create-title" (closed)="close()">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate id="project-create-form">
        <app-form-alert [message]="summary()" />
        <app-text-field label="Project name" [control]="form.controls.name" [max]="100" [required]="true" [submitted]="submitted()" [serverError]="nameError()" />
        <app-text-field label="Description" [control]="form.controls.description" [max]="1000" [multiline]="true" [submitted]="submitted()" [serverError]="descriptionError()" />
        <div class="preview">
          <p class="hint">Every project uses these four columns.</p>
          <div class="chips">
            @for (column of columns; track column) {
              <app-status-chip [column]="column" />
            }
          </div>
        </div>
      </form>
      <div footer>
        <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
        <button type="submit" form="project-create-form" class="btn btn-primary" [disabled]="busy()">Create project</button>
      </div>
    </app-modal-shell>
  `,
  styles: `
    .preview {
      margin-top: var(--tf-space-sm);
    }
    .hint {
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
      margin-bottom: 8px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
    }
  `,
})
export class ProjectCreateDialog {
  private readonly api = inject(Api);
  private readonly ref = inject<DialogRef<ProjectOut>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly columns = COLUMNS;
  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [requiredText(100, 'Name')] }),
    description: new FormControl('', { nonNullable: true, validators: [optionalText(1000, 'Description')] }),
  });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly summary = signal('');
  protected readonly nameError = signal<string | null>(null);
  protected readonly descriptionError = signal<string | null>(null);

  constructor() {
    // editing a field clears the server's message for it
    this.form.controls.name.valueChanges.subscribe(() => this.nameError.set(null));
    this.form.controls.description.valueChanges.subscribe(() => this.descriptionError.set(null));
  }

  /** Close without creating anything. */
  protected close(): void {
    this.ref.close();
  }

  /** Create the project; show field errors and keep the input when it is refused. */
  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.summary.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.summary.set("The project wasn't created. Fix the highlighted field.");
      this.focusFirstInvalid();
      return;
    }
    this.busy.set(true);
    try {
      const project = await this.api.invoke(createProject, {
        body: {
          name: cleanText(this.form.controls.name.value),
          description: cleanText(this.form.controls.description.value) || null,
        },
      });
      this.ref.close(project);
    } catch (error) {
      const info = apiErrorOf(error);
      if (info.status === 409 || info.status === 422) {
        this.nameError.set(fieldMessage(info, 'name'));
        this.descriptionError.set(fieldMessage(info, 'description'));
        this.summary.set("The project wasn't created. Fix the highlighted field.");
        this.focusFirstInvalid();
      }
    } finally {
      this.busy.set(false);
    }
  }

  private focusFirstInvalid(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
}
