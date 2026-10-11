"""In-process counters exposed at `/api/v1/metrics` (research R12)."""

from collections import Counter

_BUCKETS_MS = (50, 100, 250, 500, 1000, 3000)


class Metrics:
    """Request counts by route and status, latency buckets, and open WebSocket connections."""

    def __init__(self) -> None:
        """Create empty counters."""
        self.requests: Counter[str] = Counter()
        self.latency: Counter[str] = Counter()
        self.open_sockets = 0

    def record(self, method: str, route: str, status: int, elapsed_ms: float) -> None:
        """Count one finished request."""
        self.requests[f"{method} {route} {status}"] += 1
        for bound in _BUCKETS_MS:
            if elapsed_ms <= bound:
                self.latency[f"le_{bound}ms"] += 1
                break
        else:
            self.latency["gt_3000ms"] += 1

    def snapshot(self) -> dict:
        """Return the counters as plain data."""
        return {
            "requests": dict(self.requests),
            "latency_ms_buckets": dict(self.latency),
            "open_websockets": self.open_sockets,
        }


metrics = Metrics()
