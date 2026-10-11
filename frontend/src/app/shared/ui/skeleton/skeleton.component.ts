import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A softly shimmering placeholder; the shimmer stops with reduced motion (FR-025, FR-032). */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.width]': 'width()', '[style.height]': 'height()', '[style.border-radius]': 'radius()' },
  template: ``,
  styles: `
    :host {
      display: block;
      background: linear-gradient(90deg, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.12), rgb(255 255 255 / 0.05));
      background-size: 200% 100%;
      animation: shimmer 1.6s ease-in-out infinite;
    }
    @keyframes shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
  `,
})
export class SkeletonComponent {
  /** CSS width. */
  readonly width = input('100%');
  /** CSS height. */
  readonly height = input('16px');
  /** CSS border radius. */
  readonly radius = input('8px');
}
