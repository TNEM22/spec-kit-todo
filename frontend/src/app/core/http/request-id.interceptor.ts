import { HttpInterceptorFn } from '@angular/common/http';

import { API_ROOT } from '../config';

/** Sends a fresh `X-Request-ID` with every API request so logs and live events can be correlated. */
export const requestIdInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_ROOT)) {
    return next(request);
  }
  const id = globalThis.crypto?.randomUUID?.().replaceAll('-', '') ?? String(Date.now()) + Math.random();
  return next(request.clone({ setHeaders: { 'X-Request-ID': id.slice(0, 32) } }));
};
