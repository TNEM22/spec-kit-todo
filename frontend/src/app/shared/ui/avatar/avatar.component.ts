import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { UserOut } from '../../../core/api/generated/models';

/** Initials on a colored circle; an unassigned task shows a dashed circle with a person icon. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) {
      <span class="avatar" [style.background]="u.avatar_color" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="fontSize()" aria-hidden="true">{{ u.initials }}</span>
    } @else {
      <span class="avatar empty" [style.width.px]="size()" [style.height.px]="size()" aria-hidden="true">
        <span class="material-symbols-outlined" [style.font-size.px]="fontSize() + 4">person</span>
      </span>
    }
  `,
  styles: `
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: var(--tf-accent-on);
      font-weight: 700;
      flex: none;
      border: 1.5px solid rgb(255 255 255 / 0.3);
    }
    .empty {
      background: transparent;
      border: 1.5px dashed var(--tf-text-2);
      color: var(--tf-text-2);
    }
  `,
})
export class AvatarComponent {
  /** The user, or null for "Unassigned". */
  readonly user = input<UserOut | null>(null);
  /** Diameter in pixels. */
  readonly size = input(28);
  /** Font size derived from the diameter. */
  protected readonly fontSize = computed(() => Math.round(this.size() * 0.38));
}
