import { Injectable, signal } from '@angular/core';

/** How a toast looks: "not found" notices have an amber edge, errors a red one. */
export type ToastKind = 'info' | 'notfound' | 'error';

/** One message shown in the bottom-right corner. */
export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message: string;
}

/** How long a toast stays before it closes by itself (design `not-found-toast`). */
export const TOAST_SECONDS = 6;

/** Shows short notices; each closes after 6 seconds or when dismissed. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** The toasts currently on screen. */
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  /** Show a toast and schedule its automatic close. */
  show(kind: ToastKind, title: string, message: string): number {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, title, message }]);
    setTimeout(() => this.dismiss(id), TOAST_SECONDS * 1000);
    return id;
  }

  /** Close one toast. */
  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
