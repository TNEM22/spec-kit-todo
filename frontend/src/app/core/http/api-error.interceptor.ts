import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../../shared/ui/toast/toast.service';
import { API_ROOT } from '../config';
import { CurrentUserStore } from '../identity/current-user.store';
import { apiErrorOf } from './api-error';

/** Lets views know the server said something no longer exists, so they should reload. */
@Injectable({ providedIn: 'root' })
export class ViewRefresh {
  /** Increases whenever a view should reload its data. */
  readonly requested = signal(0);

  /** Ask open views to reload. */
  request(): void {
    this.requested.update((n) => n + 1);
  }
}

/**
 * Turns failed API calls into the right reaction: 401 returns to user selection, 404/403 show a
 * notice and refresh the view, server and network errors show a generic notice. Validation (422)
 * and duplicate (409) errors are left to the forms. The error is always passed on to the caller.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);
  const user = inject(CurrentUserStore);
  const refresh = inject(ViewRefresh);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && request.url.startsWith(API_ROOT)) {
        const info = apiErrorOf(error);
        if (info.status === 401) {
          user.clear();
          if (!router.url.startsWith('/select-user')) {
            void router.navigateByUrl('/select-user');
          }
        } else if (info.status === 404) {
          toast.show('notfound', 'That item no longer exists', 'The view has been refreshed.');
          refresh.request();
        } else if (info.status === 403) {
          toast.show('notfound', 'Not allowed', info.message);
          refresh.request();
        } else if (info.status === 0) {
          toast.show('error', "Can't reach Taskify", 'Check that the server is running, then try again.');
        } else if (info.status >= 500) {
          toast.show('error', 'Something went wrong', 'Try again.');
        }
      }
      return throwError(() => error);
    }),
  );
};
