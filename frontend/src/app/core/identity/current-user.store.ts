import { Injectable, computed, inject, signal } from '@angular/core';

import { Api } from '../api/generated/api';
import { currentUser } from '../api/generated/fn/users/current-user';
import { UserOut } from '../api/generated/models';
import { USER_STORAGE_KEY } from '../config';

/**
 * The selected user (identity without login, FR-002). The id is kept in `sessionStorage`, so it
 * survives reloads and disappears when the tab or window closes. `userChanged` increases every time
 * the selection changes, so per-user stores can reset themselves and never show the previous user's
 * data (FR-031).
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserStore {
  private readonly api = inject(Api);

  /** The selected user, or null before one is chosen. */
  readonly user = signal<UserOut | null>(null);
  /** Id sent in the `X-Taskify-User` header; available as soon as a stored id is read. */
  readonly userId = signal<number | null>(this.readStoredId());
  /** True once a user is selected. */
  readonly isSelected = computed(() => this.user() !== null);
  /** Increases whenever the selection changes or is cleared. */
  readonly userChanged = signal(0);

  /** Choose a user and remember the choice for this tab. */
  select(user: UserOut): void {
    this.writeStoredId(user.id);
    this.userId.set(user.id);
    this.user.set(user);
    this.userChanged.update((n) => n + 1);
  }

  /** Forget the selected user ("Switch user", or the server rejected the selection). */
  clear(): void {
    this.writeStoredId(null);
    this.userId.set(null);
    this.user.set(null);
    this.userChanged.update((n) => n + 1);
  }

  /**
   * Restore a stored selection by asking the server who it is. Returns false (and clears the
   * selection) when nothing is stored or the stored user is no longer valid.
   */
  async restore(): Promise<boolean> {
    if (this.user()) {
      return true;
    }
    if (this.userId() === null) {
      return false;
    }
    try {
      const user = await this.api.invoke(currentUser);
      this.user.set(user);
      this.userChanged.update((n) => n + 1);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  private readStoredId(): number | null {
    try {
      const raw = sessionStorage.getItem(USER_STORAGE_KEY);
      const id = raw === null ? NaN : Number(raw);
      return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
      return null; // storage can be blocked; the app still works, it just forgets on reload
    }
  }

  private writeStoredId(id: number | null): void {
    try {
      if (id === null) {
        sessionStorage.removeItem(USER_STORAGE_KEY);
      } else {
        sessionStorage.setItem(USER_STORAGE_KEY, String(id));
      }
    } catch {
      // ignore: see readStoredId
    }
  }
}
