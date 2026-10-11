import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CurrentUserStore } from '../../../core/identity/current-user.store';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';

/** One step of the breadcrumb; the last step has no link. */
export interface Crumb {
  label: string;
  link?: string;
}

/**
 * The top navigation bar: wordmark, breadcrumb, "Reconnecting…" pill, notification bell, the
 * selected user and "Switch user". No search, tabs, settings or filters (out of scope).
 */
@Component({
  selector: 'app-top-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, ConnectionIndicatorComponent, NotificationBellComponent, RouterLink],
  template: `
    <header class="nav glass-subtle">
      <a class="brand" routerLink="/projects" aria-label="Taskify, all projects">
        <span class="logo" aria-hidden="true"><span class="material-symbols-outlined">auto_awesome</span></span>
        <span class="word">Taskify</span>
      </a>
      <nav class="crumbs" aria-label="Breadcrumb">
        @for (crumb of crumbs(); track $index) {
          <span class="sep" aria-hidden="true">/</span>
          @if (crumb.link) {
            <a [routerLink]="crumb.link">{{ crumb.label }}</a>
          } @else {
            <span class="current" aria-current="page">{{ crumb.label }}</span>
          }
        }
      </nav>
      <span class="spacer"></span>
      <app-connection-indicator />
      <app-notification-bell />
      @if (user.user(); as me) {
        <div class="me glass-subtle">
          <app-avatar [user]="me" [size]="32" />
          <span class="name">{{ me.display_name }}</span>
          <span class="role">{{ me.role === 'product_manager' ? 'Product Manager' : 'Engineer' }}</span>
          <button type="button" class="link-button switch" (click)="switchUser()">
            <span class="material-symbols-outlined" aria-hidden="true">swap_horiz</span> Switch user
          </button>
        </div>
      }
    </header>
  `,
  styles: `
    .nav {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      gap: var(--tf-space-md);
      padding: 12px var(--tf-space-2xl);
      border-width: 0 0 1px;
      box-shadow: var(--tf-shadow-panel);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--tf-text);
      text-decoration: none;
    }
    .logo {
      display: inline-flex;
      width: 36px;
      height: 36px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      color: var(--tf-accent);
      border: 1px solid var(--tf-accent);
      box-shadow: var(--tf-glow-accent-sm);
    }
    .word {
      font-size: var(--tf-fs-headline-md);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .crumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--tf-text-2);
      min-width: 0;
    }
    .crumbs a {
      color: var(--tf-text-2);
      text-decoration: none;
    }
    .crumbs a:hover {
      color: var(--tf-text);
    }
    .current {
      color: var(--tf-text);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .spacer {
      flex: 1;
    }
    .me {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 14px 4px 6px;
      border-radius: var(--tf-radius-pill);
    }
    .name {
      font-weight: 600;
    }
    .role {
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
    }
    .switch {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 4px;
    }
    .switch .material-symbols-outlined {
      font-size: 18px;
    }
  `,
})
export class TopNavComponent {
  protected readonly user = inject(CurrentUserStore);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);

  /** Breadcrumb after the wordmark. */
  readonly crumbs = input<Crumb[]>([]);

  /** Disconnect, forget the selection (stores reset themselves) and return to user selection. */
  protected switchUser(): void {
    this.realtime.disconnect();
    this.user.clear();
    void this.router.navigateByUrl('/select-user');
  }
}
