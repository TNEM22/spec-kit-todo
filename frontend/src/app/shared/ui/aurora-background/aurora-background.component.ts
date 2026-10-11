import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Soft teal, indigo and violet glows behind every screen (dark "fluid glass" background). */
@Component({
  selector: 'app-aurora-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="aurora" aria-hidden="true">
      <span class="blob teal"></span>
      <span class="blob indigo"></span>
      <span class="blob violet"></span>
    </div>
  `,
  styles: `
    .aurora {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(150px);
      opacity: 0.16;
    }
    .teal {
      width: 520px;
      height: 520px;
      top: -140px;
      left: -120px;
      background: var(--tf-aurora-teal);
    }
    .indigo {
      width: 620px;
      height: 620px;
      bottom: -220px;
      right: -160px;
      background: var(--tf-aurora-indigo);
    }
    .violet {
      width: 460px;
      height: 460px;
      top: 38%;
      left: 46%;
      background: var(--tf-aurora-violet);
      opacity: 0.12;
    }
  `,
})
export class AuroraBackgroundComponent {}
