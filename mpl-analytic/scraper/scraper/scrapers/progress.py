def start(title):
    print(f"\n{'=' * 60}\n{title}\n{'=' * 60}")


def step(current, total, message):
    print(f"[{current:>3}/{total:<3}] {message}")


def ok(message):
    print(f"      ✓ {message}")


def warn(message):
    print(f"      ! {message}")


def finish(message):
    print(f"\n[OK] {message}")
