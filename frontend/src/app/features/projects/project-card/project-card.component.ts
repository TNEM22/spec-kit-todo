import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Column, ProjectSummary } from '../../../core/api/generated/models';
import { COLUMN_LABELS, COLUMNS } from '../../../core/state/board.store';

/** One project in the list: name, description, a per-column count bar and an "assigned to you" badge. */
@Component({
  selector: 'app-project-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="card glass-card glass-hoverable">
      <h2 class="name"><a [routerLink]="['/projects', project().id]">{{ project().name }}</a></h2>
      <p class="desc">{{ project().description || 'No description yet.' }}</p>
      <div class="bar" role="img" [attr.aria-label]="summary()">
        @for (seg of barSegments(); track seg.column) {
          <span class="seg" [style.flex-grow]="seg.count" [style.background]="'var(--tf-status-' + seg.css + ')'"></span>
        }
      </div>
      <ul class="counts">
        @for (seg of segments(); track seg.column) {
          <li><span class="dot" [style.background]="'var(--tf-status-' + seg.css + ')'" aria-hidden="true"></span>{{ seg.count }} <span class="label">{{ seg.label }}</span></li>
        }
      </ul>
      <div class="foot">
        @if (project().assigned_to_me > 0) {
          <span class="mine">{{ project().assigned_to_me }} assigned to you</span>
        }
        <a class="open" [routerLink]="['/projects', project().id]">Open board <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
      </div>
    </article>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: var(--tf-space-lg);
      height: 100%;
    }
    .name {
      font-size: var(--tf-fs-headline-md);
      line-height: var(--tf-lh-headline-md);
      font-weight: 600;
    }
    .name a {
      color: var(--tf-text);
      text-decoration: none;
    }
    .desc {
      color: var(--tf-text-2);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 40px;
    }
    .bar {
      display: flex;
      gap: 3px;
      height: 6px;
    }
    .seg {
      flex-basis: 0;
      min-width: 0;
      border-radius: 3px;
    }
    .counts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 16px;
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: var(--tf-fs-body-sm);
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .label {
      color: var(--tf-text-2);
    }
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: auto;
    }
    .mine {
      padding: 2px 10px;
      border-radius: var(--tf-radius-pill);
      background: rgb(94 234 212 / 0.12);
      color: var(--tf-accent);
      font-size: var(--tf-fs-label-md);
      font-weight: 600;
    }
    .open {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--tf-accent-2);
      font-weight: 600;
      text-decoration: none;
    }
    .open .material-symbols-outlined {
      font-size: 18px;
    }
  `,
})
export class ProjectCardComponent {
  /** The project to show. */
  readonly project = input.required<ProjectSummary>();

  /** All four columns, for the count list. */
  protected readonly segments = computed(() =>
    COLUMNS.map((column: Column) => ({
      column,
      css: column.replaceAll('_', '-'),
      label: COLUMN_LABELS[column],
      count: this.project().counts[column],
    })),
  );
  /** Only the non-empty columns, for the proportional bar. */
  protected readonly barSegments = computed(() => this.segments().filter((s) => s.count > 0));
  protected readonly summary = computed(() =>
    COLUMNS.map((c) => `${COLUMN_LABELS[c]} ${this.project().counts[c]}`).join(', '),
  );
}
