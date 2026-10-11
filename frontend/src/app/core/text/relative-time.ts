/** Turn an ISO timestamp into short relative text such as "2 min ago" or "Yesterday". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 45) {
    return 'just now';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24 && then.toDateString() === now.toDateString()) {
    return `${hours} h ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
