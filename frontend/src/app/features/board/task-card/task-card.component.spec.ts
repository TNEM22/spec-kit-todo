import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { TaskOut, UserOut } from '../../../core/api/generated/models';
import { CurrentUserStore } from '../../../core/identity/current-user.store';
import { WEBSOCKET_FACTORY } from '../../../core/realtime/realtime.service';
import { TaskCardComponent } from './task-card.component';

const ALEX: UserOut = {
  id: 1,
  display_name: 'Alex Morgan',
  role: 'product_manager',
  initials: 'AM',
  avatar_color: '#C4B5FD',
};

const SAM: UserOut = {
  id: 2,
  display_name: 'Sam Lee',
  role: 'engineer',
  initials: 'SL',
  avatar_color: '#5EEAD4',
};

const makeTask = (assignee: UserOut | null): TaskOut => ({
  id: 42,
  project_id: 1,
  title: 'Build account settings page',
  description: null,
  column: 'in_progress',
  position: 0,
  assignee,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  comment_count: 0,
});

describe('TaskCardComponent — "You" label', () => {
  let userStore: CurrentUserStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: WEBSOCKET_FACTORY, useValue: () => ({ onopen: null, onmessage: null, onclose: null, close: () => {}, readyState: 1 }) },
      ],
    }).compileComponents();
    userStore = TestBed.inject(CurrentUserStore);
  });

  it('shows the "You" chip when the task is assigned to the selected user', () => {
    userStore.select(SAM);

    const fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', makeTask(SAM));
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('app-you-chip');
    expect(chip).not.toBeNull();
  });

  it('does NOT show the "You" chip when the task is assigned to a different user', () => {
    userStore.select(SAM);

    const fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', makeTask(ALEX));
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('app-you-chip');
    expect(chip).toBeNull();
  });

  it('does NOT show the "You" chip when the task is unassigned', () => {
    userStore.select(SAM);

    const fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', makeTask(null));
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('app-you-chip');
    expect(chip).toBeNull();
  });

  it('shows "Unassigned" text when there is no assignee', () => {
    userStore.select(SAM);

    const fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', makeTask(null));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unassigned');
  });

  it('shows the teal accent edge (.mine class) only for the selected user\'s tasks', () => {
    userStore.select(SAM);

    const fixtureMine = TestBed.createComponent(TaskCardComponent);
    fixtureMine.componentRef.setInput('task', makeTask(SAM));
    fixtureMine.detectChanges();
    expect(fixtureMine.nativeElement.querySelector('.card.mine')).not.toBeNull();

    const fixtureOther = TestBed.createComponent(TaskCardComponent);
    fixtureOther.componentRef.setInput('task', makeTask(ALEX));
    fixtureOther.detectChanges();
    expect(fixtureOther.nativeElement.querySelector('.card.mine')).toBeNull();
  });
});

