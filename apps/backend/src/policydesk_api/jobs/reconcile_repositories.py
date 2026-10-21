import logging
import sys

from policydesk_api.services.repository_sync import reconcile_all


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    result = reconcile_all()
    logging.getLogger("policydesk.jobs").info("Repository reconciliation finished connections=%s failed=%s", result["connections"], result["failed"])
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
