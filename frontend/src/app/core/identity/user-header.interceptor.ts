import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_ROOT, USER_HEADER } from '../config';
import { CurrentUserStore } from './current-user.store';

/** Adds the selected user to every request to the Taskify API (research R2). */
export const userHeaderInterceptor: HttpInterceptorFn = (request, next) => {
  const id = inject(CurrentUserStore).userId();
  if (id !== null && request.url.startsWith(API_ROOT)) {
    return next(request.clone({ setHeaders: { [USER_HEADER]: String(id) } }));
  }
  return next(request);
};
