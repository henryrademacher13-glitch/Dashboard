"""Tests for the dedup rule — the logic that prevents double-replies."""
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scanner.dedup import unanswered_messages  # noqa: E402

STUDENT = "s036407@students.lmsd.org"
OWNER = "henry.rademacher13@gmail.com"


@dataclass
class FakeMessage:
    sender: str
    internal_date: int
    owner: bool = False

    @property
    def is_from_owner(self) -> bool:
        return self.owner


def student(ts): return FakeMessage(STUDENT, ts)
def owner(ts): return FakeMessage(OWNER, ts, owner=True)


def check(name, actual, expected):
    status = "PASS" if actual == expected else "FAIL"
    print(f"{status}: {name} (got {actual}, expected {expected})")
    return actual == expected


def main():
    results = []

    # A brand new message with no reply is unanswered.
    results.append(check(
        "new message is unanswered",
        len(unanswered_messages([student(100)], STUDENT)), 1))

    # Once answered, it is not picked up again.
    results.append(check(
        "answered message is skipped",
        len(unanswered_messages([student(100), owner(200)], STUDENT)), 0))

    # A follow-up after our reply is new work.
    results.append(check(
        "follow-up after reply is new work",
        len(unanswered_messages([student(100), owner(200), student(300)], STUDENT)), 1))

    # Two unanswered messages both come back, so one reply can cover both.
    results.append(check(
        "two pending messages both returned",
        len(unanswered_messages([student(100), student(150)], STUDENT)), 2))

    # A crash after reading but before replying leaves it unanswered — retried.
    results.append(check(
        "crashed run retries the message",
        len(unanswered_messages([student(100)], STUDENT)), 1))

    # Mail from anyone else is ignored entirely.
    results.append(check(
        "other senders ignored",
        len(unanswered_messages([FakeMessage("someone@else.com", 100)], STUDENT)), 0))

    # Case differences in the address still match.
    results.append(check(
        "sender match is case-insensitive",
        len(unanswered_messages([FakeMessage(STUDENT.upper(), 100)], STUDENT)), 1))

    # Identical timestamps count as answered, never double-sent.
    results.append(check(
        "timestamp tie counts as answered",
        len(unanswered_messages([student(100), owner(100)], STUDENT)), 0))

    # An empty thread is safe.
    results.append(check("empty thread", len(unanswered_messages([], STUDENT)), 0))

    print()
    if all(results):
        print(f"All {len(results)} tests passed.")
        return 0
    print(f"{results.count(False)} of {len(results)} tests FAILED.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
