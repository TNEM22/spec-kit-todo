import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { provideApiConfiguration } from '../../core/api/generated/api-configuration';
import { TaskOut } from '../../core/api/generated/models';
import { WEBSOCKET_FACTORY } from '../../core/realtime/realtime.service';
import { TaskDetailDrawer } from './task-detail.drawer';

const mockTask: TaskOut = {
  id: 10,
  project_id: 1,
  title: 'Original Title',
  description: 'Original Description',
  column: 'todo',
  position: 0,
  assignee: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  comment_count: 0,
};

describe('TaskDetailDrawer — Edit conflict notice', () => {
  it('keeps unsaved text and sets conflict notice when another user updates the task', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDetailDrawer],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: WEBSOCKET_FACTORY, useValue: () => ({ onopen: null, onmessage: null, onclose: null, close: () => {}, readyState: 1 }) },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskDetailDrawer);
    fixture.componentRef.setInput('projectId', '1');
    fixture.componentRef.setInput('taskId', '10');
    const comp = fixture.componentInstance;

    // Simulate task loaded
    comp['task'].set(mockTask);
    comp['status'].set('ready');

    // User starts editing title and types something dirty
    comp['edit']('title');
    comp['titleControl'].setValue('My Unsaved Edit');
    comp['titleControl'].markAsDirty();

    // Another user changes the title on the server
    const remoteUpdate: TaskOut = {
      ...mockTask,
      title: 'Remote User Edit',
    };

    comp['receive'](remoteUpdate, 99);

    // Unsaved edit is preserved
    expect(comp['titleControl'].value).toBe('My Unsaved Edit');
    // Conflict warning is displayed
    expect(comp['conflict']()).toContain('changed this task');
  });
});

