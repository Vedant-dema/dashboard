"""Import transitional demo/blob customers state into SQL persistence."""

from __future__ import annotations

import argparse

from app.repositories.customer_repository import CustomerRepository


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import demo/blob customer state into SQL customer tables."
    )
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="Delete current customer-domain SQL rows before importing.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo = CustomerRepository()
    summary = repo.import_transitional_state_to_db(replace_existing=args.replace_existing)
    print("Customer import completed.")
    for key, value in summary.items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()

