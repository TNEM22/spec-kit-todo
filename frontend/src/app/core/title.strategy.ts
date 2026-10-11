import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** Suffix of every browser tab title. */
const SUFFIX = 'Taskify';

/**
 * Sets browser tab titles as plain text through Angular's `Title` service, never as HTML (FR-021).
 * Static route titles come from the route config ("Projects · Taskify"); pages that show user text
 * (project and task names) use `PageTitle` instead.
 */
@Injectable({ providedIn: 'root' })
export class TaskifyTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const own = this.buildTitle(snapshot);
    this.title.setTitle(own ? `${own} · ${SUFFIX}` : SUFFIX);
  }
}

/** Sets the tab title from user-written text such as a project or task name, as plain text. */
@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly title = inject(Title);

  /** Show "<part> · <part> · Taskify"; empty parts are skipped. */
  set(...parts: (string | null | undefined)[]): void {
    const clean = parts.filter((p): p is string => !!p && p.trim().length > 0);
    this.title.setTitle([...clean, SUFFIX].join(' · '));
  }
}
