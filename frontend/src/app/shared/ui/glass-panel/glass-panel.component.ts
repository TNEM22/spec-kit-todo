import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Which glass layer a panel uses (tokens.md "Glass surfaces"). */
export type GlassVariant = 'lane' | 'card' | 'subtle' | 'overlay';

/** A frosted glass surface; its content is projected. */
@Component({
  selector: 'app-glass-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.glass-lane]': "variant() === 'lane'",
    '[class.glass-card]': "variant() === 'card'",
    '[class.glass-subtle]': "variant() === 'subtle'",
    '[class.glass-overlay]': "variant() === 'overlay'",
    style: 'display: block',
  },
  template: `<ng-content />`,
})
export class GlassPanelComponent {
  /** Glass layer to use. */
  readonly variant = input<GlassVariant>('card');
}
