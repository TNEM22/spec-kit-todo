/** Address of the Taskify API. It only ever listens on this machine (spec Security Considerations). */
export const API_ROOT = 'http://127.0.0.1:8000';

/** Address of the live-update WebSocket server (same process as the API). */
export const WS_ROOT = 'ws://127.0.0.1:8000';

/** Header that carries the selected user (identity without login, research R2). */
export const USER_HEADER = 'X-Taskify-User';

/** Where the selected user id is kept: per browser tab, cleared when the tab closes (FR-002). */
export const USER_STORAGE_KEY = 'taskify.selectedUserId';
