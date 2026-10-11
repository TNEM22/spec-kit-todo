import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideApiConfiguration } from '../../../core/api/generated/api-configuration';
import { CommentOut, UserOut } from '../../../core/api/generated/models';
import { CurrentUserStore } from '../../../core/identity/current-user.store';
import { WEBSOCKET_FACTORY } from '../../../core/realtime/realtime.service';
import { CommentItemComponent } from './comment-item.component';

const AUTHOR: UserOut = {
  id: 1,
  display_name: 'Alex Morgan',
  role: 'product_manager',
  initials: 'AM',
  avatar_color: '#C4B5FD',
};

const OTHER_USER: UserOut = {
  id: 2,
  display_name: 'Sam Lee',
  role: 'engineer',
  initials: 'SL',
  avatar_color: '#5EEAD4',
};

const mockComment: CommentOut = {
  id: 101,
  task_id: 1,
  author: AUTHOR,
  body: '<b>Hello</b> <script>alert(1)</script>',
  created_at: '2026-01-01T12:00:00Z',
  edited_at: null,
};

describe('CommentItemComponent', () => {
  let userStore: CurrentUserStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentItemComponent],
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
        { provide: WEBSOCKET_FACTORY, useValue: () => ({ onopen: null, onmessage: null, onclose: null, close: () => {}, readyState: 1 }) },
      ],
    }).compileComponents();
    userStore = TestBed.inject(CurrentUserStore);
  });

  it('shows Edit and Delete buttons only when the current user is the author', () => {
    userStore.select(AUTHOR);

    const fixture = TestBed.createComponent(CommentItemComponent);
    fixture.componentRef.setInput('comment', mockComment);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.link-button');
    expect(links.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Edit');
    expect(fixture.nativeElement.textContent).toContain('Delete');
  });

  it('hides Edit and Delete buttons when the current user is NOT the author', () => {
    userStore.select(OTHER_USER);

    const fixture = TestBed.createComponent(CommentItemComponent);
    fixture.componentRef.setInput('comment', mockComment);
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.link-button');
    expect(links.length).toBe(0);
  });

  it('renders HTML/script markup as plain text without interpretation', () => {
    userStore.select(OTHER_USER);

    const fixture = TestBed.createComponent(CommentItemComponent);
    fixture.componentRef.setInput('comment', mockComment);
    fixture.detectChanges();

    const bodyEl = fixture.nativeElement.querySelector('.body');
    expect(bodyEl.textContent).toBe('<b>Hello</b> <script>alert(1)</script>');
    expect(bodyEl.querySelector('b')).toBeNull();
    expect(bodyEl.querySelector('script')).toBeNull();
  });

  it('requires confirmation before delete', () => {
    userStore.select(AUTHOR);

    const fixture = TestBed.createComponent(CommentItemComponent);
    fixture.componentRef.setInput('comment', mockComment);
    fixture.detectChanges();

    const deleteBtn = fixture.nativeElement.querySelector('.link-button.danger');
    deleteBtn.click();
    fixture.detectChanges();

    const confirmDialog = fixture.nativeElement.querySelector('.confirm');
    expect(confirmDialog).not.toBeNull();
    expect(confirmDialog.textContent).toContain("Delete this comment? This can't be undone.");
  });
});

