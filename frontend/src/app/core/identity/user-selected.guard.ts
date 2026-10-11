import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CurrentUserStore } from './current-user.store';

/** Every screen except user selection needs a selected user (FR-005). */
export const userSelectedGuard: CanActivateFn = async () => {
  // inject() only works before the first await, so take everything we need up front
  const store = inject(CurrentUserStore);
  const router = inject(Router);
  if (await store.restore()) {
    return true;
  }
  return router.parseUrl('/select-user');
};
