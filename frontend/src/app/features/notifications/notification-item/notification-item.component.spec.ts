import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { NotificationOut, UserOut } from '../../../core/api/generated/models';
import { NotificationItemComponent } from './notification-item.component';

const SENDER: UserOut = {
  id: 1,
  display_name: 'Alex Morgan',
  role: 'product_manager',
  initials: 'AM',
  avatar_color: '#C4B5FD',
};

const baseNotification: NotificationOut = {
  id: 1,
  type: 'task_assigned',
  actor: SENDER,
  project: { id: 1, name: 'Customer Portal' },
  task_id: 10,
  task_title: 'Setup Database',
  to_column: null,
  comment_preview: null,
  created_at: new Date().toISOString(),
  read: false,
};

describe('NotificationItemComponent', () => {
  it('renders "assigned you" wording for task_assigned type', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', { ...baseNotification, type: 'task_assigned' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('assigned you');
    expect(fixture.nativeElement.textContent).toContain('Setup Database');
  });

  it('renders "commented on" wording and preview for task_commented type', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', {
      ...baseNotification,
      type: 'task_commented',
      comment_preview: 'Looks good to me!',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('commented on');
    expect(fixture.nativeElement.textContent).toContain('“Looks good to me!”');
  });

  it('omits comment preview when preview is null', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', {
      ...baseNotification,
      type: 'task_commented',
      comment_preview: null,
    });
    fixture.detectChanges();

    const previewEl = fixture.nativeElement.querySelector('.preview');
    expect(previewEl).toBeNull();
  });

  it('renders "moved" wording for task_moved type', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', {
      ...baseNotification,
      type: 'task_moved',
      to_column: 'done',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('moved');
  });

  it('marks unread items with unread class and visually hidden text', () => {
    const fixture = TestBed.createComponent(NotificationItemComponent);
    fixture.componentRef.setInput('notification', { ...baseNotification, read: false });
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.row.unread');
    expect(row).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Unread.');
  });
});

