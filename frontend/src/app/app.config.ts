import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';

import { provideApiConfiguration } from './core/api/generated/api-configuration';
import { API_ROOT } from './core/config';
import { apiErrorInterceptor } from './core/http/api-error.interceptor';
import { requestIdInterceptor } from './core/http/request-id.interceptor';
import { userHeaderInterceptor } from './core/identity/user-header.interceptor';
import { TaskifyTitleStrategy } from './core/title.strategy';
import { routes } from './app.routes';

/**
 * Application providers: zoneless change detection (the Angular 21 default), the router with
 * route params bound to component inputs, and the HTTP client with the identity, request-id and
 * error interceptors.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    { provide: TitleStrategy, useClass: TaskifyTitleStrategy },
    provideHttpClient(
      withInterceptors([userHeaderInterceptor, requestIdInterceptor, apiErrorInterceptor]),
    ),
    provideApiConfiguration(API_ROOT),
  ],
};
