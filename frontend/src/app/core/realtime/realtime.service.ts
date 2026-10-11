import { Injectable, InjectionToken, effect, inject, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';

import { WS_ROOT } from '../config';
import { CurrentUserStore } from '../identity/current-user.store';
import { RealtimeEvent } from './events';

/** Creates the WebSocket; replaced by a fake in tests. */
export const WEBSOCKET_FACTORY = new InjectionToken<(url: string) => WebSocket>('WEBSOCKET_FACTORY', {
  providedIn: 'root',
  factory: () => (url: string) => new WebSocket(url),
});

/** `idle` before a user is selected; `reconnecting` while live updates are interrupted. */
export type ConnectionStatus = 'idle' | 'connected' | 'reconnecting';

const PING_SECONDS = 25;
const BACKOFF_START_MS = 1000;
const BACKOFF_MAX_MS = 30000;
const CLOSE_NO_RETRY = new Set([4401, 4403]);

/**
 * One WebSocket per tab that delivers board events and the user's own notifications (research R6).
 * It reconnects with exponential backoff (1 s to 30 s) and announces `reconnected` so stores can
 * reload what they missed, because events sent while disconnected are not replayed.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly factory = inject(WEBSOCKET_FACTORY);
  private readonly user = inject(CurrentUserStore);

  /** Connection state; the "Reconnecting…" pill shows while it is `reconnecting`. */
  readonly status = signal<ConnectionStatus>('idle');
  /** Typed stream of live events. */
  readonly events = new Subject<RealtimeEvent>();
  /** Emits after a lost connection is restored. */
  readonly reconnected = new Subject<void>();

  private socket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = BACKOFF_START_MS;
  private userId: number | null = null;
  private lostConnection = false;

  constructor() {
    // Follow the selected user: connect for a user, close when the selection is cleared.
    effect(() => {
      const current = this.user.user();
      untracked(() => {
        if (current) {
          this.connect(current.id);
        } else {
          this.disconnect();
        }
      });
    });
  }

  /** Open the connection for `userId`, replacing any existing one. */
  connect(userId: number): void {
    this.disconnect();
    this.userId = userId;
    this.lostConnection = false;
    this.backoff = BACKOFF_START_MS;
    this.open();
  }

  /** Close the connection and stop retrying (user switch or sign-out of the selection). */
  disconnect(): void {
    this.userId = null;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
    this.status.set('idle');
  }

  private open(): void {
    if (this.userId === null) {
      return;
    }
    const socket = this.factory(`${WS_ROOT}/api/v1/ws?user=${this.userId}`);
    this.socket = socket;
    socket.onopen = () => {
      this.status.set('connected');
      this.backoff = BACKOFF_START_MS;
      this.startPing(socket);
      if (this.lostConnection) {
        this.lostConnection = false;
        this.reconnected.next();
      }
    };
    socket.onmessage = (message: MessageEvent) => this.handle(message.data);
    socket.onclose = (closeEvent: CloseEvent) => {
      this.clearTimers();
      this.socket = null;
      if (this.userId === null || CLOSE_NO_RETRY.has(closeEvent.code)) {
        this.status.set('idle');
        return;
      }
      this.lostConnection = true;
      this.status.set('reconnecting');
      this.retryTimer = setTimeout(() => this.open(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX_MS);
    };
  }

  private handle(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }
    try {
      const message = JSON.parse(raw) as { type?: string };
      if (message.type && message.type !== 'hello' && message.type !== 'pong') {
        this.events.next(message as RealtimeEvent);
      }
    } catch {
      // ignore anything that is not JSON
    }
  }

  private startPing(socket: WebSocket): void {
    this.pingTimer = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_SECONDS * 1000);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}
