import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideApiConfiguration } from '../api/generated/api-configuration';
import { USER_STORAGE_KEY } from '../config';
import { CurrentUserStore } from './current-user.store';

const MOCK_USER = {
  id: 2,
  display_name: 'Sam Lee',
  role: 'engineer' as const,
  initials: 'SL',
  avatar_color: '#5EEAD4',
};

describe('CurrentUserStore', () => {
  let store: CurrentUserStore;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://127.0.0.1:8000'),
      ],
    }).compileComponents();
    store = TestBed.inject(CurrentUserStore);
  });

  describe('select()', () => {
    it('sets the user signal and stores the id in sessionStorage', () => {
      store.select(MOCK_USER);

      expect(store.user()).toEqual(MOCK_USER);
      expect(store.userId()).toBe(2);
      expect(store.isSelected()).toBe(true);
      expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBe('2');
    });

    it('increments userChanged so per-user stores can reset', () => {
      const before = store.userChanged();
      store.select(MOCK_USER);
      expect(store.userChanged()).toBe(before + 1);
    });

    it('increments userChanged again on a second select (user switch)', () => {
      store.select(MOCK_USER);
      const after1 = store.userChanged();
      store.select({ ...MOCK_USER, id: 3, display_name: 'Jordan Patel' });
      expect(store.userChanged()).toBe(after1 + 1);
    });
  });

  describe('clear()', () => {
    it('clears user and userId signals and removes the sessionStorage key', () => {
      store.select(MOCK_USER);
      store.clear();

      expect(store.user()).toBeNull();
      expect(store.userId()).toBeNull();
      expect(store.isSelected()).toBe(false);
      expect(sessionStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });

    it('increments userChanged so per-user stores reset', () => {
      store.select(MOCK_USER);
      const after = store.userChanged();
      store.clear();
      expect(store.userChanged()).toBe(after + 1);
    });

    it('is idempotent: calling clear() twice does not throw', () => {
      expect(() => {
        store.clear();
        store.clear();
      }).not.toThrow();
    });
  });

  describe('userId initial read from sessionStorage', () => {
    it('reads a stored id before the module initialises', () => {
      sessionStorage.setItem(USER_STORAGE_KEY, '3');
      // Re-create the store so the constructor reads the stored value
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideApiConfiguration('http://127.0.0.1:8000'),
        ],
      });
      const fresh = TestBed.inject(CurrentUserStore);
      expect(fresh.userId()).toBe(3);
    });

    it('ignores non-integer values in sessionStorage', () => {
      sessionStorage.setItem(USER_STORAGE_KEY, 'not-a-number');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideApiConfiguration('http://127.0.0.1:8000'),
        ],
      });
      const fresh = TestBed.inject(CurrentUserStore);
      expect(fresh.userId()).toBeNull();
    });
  });
});

