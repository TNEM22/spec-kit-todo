import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CommentsStore } from './core/state/comments.store';
import { BoardStore } from './core/state/board.store';
import { NotificationsStore } from './core/state/notifications.store';
import { ProjectsStore } from './core/state/projects.store';
import { AuroraBackgroundComponent } from './shared/ui/aurora-background/aurora-background.component';
import { ToastComponent } from './shared/ui/toast/toast.component';

/**
 * The application shell: the aurora background, the routed screen and the toast region. It also
 * creates the stores up front so each one listens to live events from the start.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AuroraBackgroundComponent, RouterOutlet, ToastComponent],
  template: `
    <app-aurora-background />
    <main class="shell"><router-outlet /></main>
    <app-toasts />
  `,
  styles: `
    .shell {
      position: relative;
      z-index: 1;
      min-height: 100vh;
    }
  `,
})
export class App {
  constructor() {
    inject(ProjectsStore);
    inject(BoardStore);
    inject(CommentsStore);
    inject(NotificationsStore);
  }
}
