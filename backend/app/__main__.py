"""`python -m app`: run Taskify on 127.0.0.1:8000 with one worker.

There is deliberately no option to change the host: Taskify has no authentication in this phase and
must only accept connections from the same machine (spec Security Considerations, research R13).
One worker is required because live updates are broadcast in memory (research R6).
"""

import uvicorn

HOST = "127.0.0.1"
PORT = 8000


def main() -> None:
    """Start the server."""
    uvicorn.run("app.main:create_app", factory=True, host=HOST, port=PORT, workers=1)


if __name__ == "__main__":
    main()
