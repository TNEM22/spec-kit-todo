import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { graphemeLength } from '../../../core/text/grapheme-length';
import { TaskCreateData, TaskCreateDialog } from './task-create.dialog';

describe('TaskCreateDialog', () => {
  const mockData: TaskCreateData = {
    projectId: 1,
    projectName: 'Customer Portal',
  };

  const mockDialogRef = {
    close: vi.fn(),
  };

  it('grapheme counter counts emoji as one character', () => {
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    expect(graphemeLength(family)).toBe(1);
    expect(family.length).toBe(8);
  });

  it('initializes form with empty title and description', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCreateDialog],
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: DIALOG_DATA, useValue: mockData },
        { provide: DialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskCreateDialog);
    const component = fixture.componentInstance;
    expect(component['form'].controls.title.value).toBe('');
    expect(component['form'].controls.description.value).toBe('');
    expect(component['form'].valid).toBe(false);
  });

  it('blocks submission and shows summary when title is whitespace-only', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCreateDialog],
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: DIALOG_DATA, useValue: mockData },
        { provide: DialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskCreateDialog);
    const component = fixture.componentInstance;
    component['form'].controls.title.setValue('   \t\n  ');

    await component['submit']();

    expect(component['form'].controls.title.invalid).toBe(true);
    expect(component['summary']()).toContain("The task wasn't created");
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});

