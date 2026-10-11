import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Api } from '../../core/api/generated/api';
import { listUsers } from '../../core/api/generated/fn/users/list-users';
import { UserOut } from '../../core/api/generated/models';
import { CurrentUserStore } from '../../core/identity/current-user.store';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';

/**
 * Start screen: pick one of the five predefined users. There is no password and no sign-up; this
 * is an identity choice, not authentication (spec Security Considerations).
 */
@Component({
  selector: 'app-user-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvatarComponent, EmptyStateComponent, SkeletonComponent],
  template: `
    <section class="page">
      <div class="brand"><span class="material-symbols-outlined logo" aria-hidden="true">auto_awesome</span> Taskify</div>
      <h1 class="heading">Who’s working today?</h1>
      <p class="sub">Pick your name to continue.</p>

      @if (status() === 'loading') {
        <div class="grid" aria-busy="true">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="card glass-card"><app-skeleton width="72px" height="72px" radius="50%" /><app-skeleton width="120px" /><app-skeleton width="80px" height="22px" radius="999px" /></div>
          }
        </div>
      } @else if (status() === 'error') {
        <app-empty-state icon="cloud_off" title="Couldn't load the team" message="Check that the server is running, then try again.">
          <button type="button" class="btn btn-primary" (click)="load()">Try again</button>
        </app-empty-state>
      } @else {
        <ul class="grid">
          @for (user of users(); track user.id) {
            <li>
              <button type="button" class="card glass-card glass-hoverable" (click)="choose(user)">
                <app-avatar [user]="user" [size]="72" />
                <span class="name">{{ user.display_name }}</span>
                <span class="role" [class.pm]="user.role === 'product_manager'">{{ user.role === 'product_manager' ? 'Product Manager' : 'Engineer' }}</span>
              </button>
            </li>
          }
        </ul>
      }
      <p class="note">Phase 1 demo. Anyone can choose any user.</p>
    </section>
  `,
  styles: `
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--tf-space-md);
      padding: var(--tf-space-2xl);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: var(--tf-fs-headline-md);
      font-weight: 700;
    }
    .logo {
      color: var(--tf-accent);
    }
    .heading {
      font-size: var(--tf-fs-headline-xl);
      line-height: var(--tf-lh-headline-xl);
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .sub {
      color: var(--tf-text-2);
      margin-bottom: var(--tf-space-md);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(160px, 190px));
      gap: var(--tf-gutter);
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .card {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 16px;
      color: var(--tf-text);
      cursor: pointer;
    }
    button.card:hover,
    button.card:focus-visible {
      border-color: var(--tf-accent);
      box-shadow: var(--tf-glow-accent-sm), var(--tf-shadow-card);
    }
    .name {
      font-weight: 600;
      font-size: var(--tf-fs-body-lg);
    }
    .role {
      padding: 2px 12px;
      border-radius: var(--tf-radius-pill);
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
      background: var(--tf-glass-subtle-fill);
      color: var(--tf-text-2);
    }
    .role.pm {
      color: var(--tf-accent-2);
      background: rgb(165 180 252 / 0.12);
    }
    .note {
      margin-top: var(--tf-space-lg);
      color: var(--tf-text-2);
      font-size: var(--tf-fs-body-sm);
    }
  `,
})
export class UserSelectPage implements OnInit {
  private readonly api = inject(Api);
  private readonly current = inject(CurrentUserStore);
  private readonly router = inject(Router);

  /** The five users. */
  protected readonly users = signal<UserOut[]>([]);
  /** Loading state. */
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');

  ngOnInit(): void {
    void this.load();
  }

  /** Load the users (public endpoint). */
  protected async load(): Promise<void> {
    this.status.set('loading');
    try {
      this.users.set(await this.api.invoke(listUsers));
      this.status.set('ready');
    } catch {
      this.status.set('error');
    }
  }

  /** Remember the choice for this tab and go to the project list. */
  protected choose(user: UserOut): void {
    this.current.select(user);
    void this.router.navigateByUrl('/projects');
  }
}
