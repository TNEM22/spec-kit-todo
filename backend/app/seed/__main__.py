"""`python -m app.seed [--perf]`: load the sample data (idempotent)."""

import argparse
import asyncio

from app.core.config import get_settings
from app.core.db import make_engine, make_session_factory
from app.seed.sample_data import seed_performance_board, seed_sample_data


async def main(perf: bool) -> None:
    """Seed the configured database."""
    engine = make_engine(get_settings().database_url)
    factory = make_session_factory(engine)
    async with factory() as session:
        seeded = await seed_sample_data(session)
        print("sample data loaded" if seeded else "sample data already present; nothing changed")
        if perf:
            created = await seed_performance_board(session)
            print("performance board created" if created else "performance board already present")
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Load Taskify sample data.")
    parser.add_argument("--perf", action="store_true", help="also create the 200-task Performance Board")
    asyncio.run(main(parser.parse_args().perf))
