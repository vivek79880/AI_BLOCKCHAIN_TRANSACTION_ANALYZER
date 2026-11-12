from datetime import datetime, timedelta, timezone
from decimal import Decimal

from datetime import datetime, timedelta, timezone
from decimal import Decimal


def find_largest_transaction(
    transfers: list,
    wallet_address: str,
    direction: str,
    time_range_days: int | None
):
    matching_transfers = []

    cutoff_time = None

    if time_range_days is not None:
        cutoff_time = datetime.now(timezone.utc) - timedelta(
            days=time_range_days
        )

    for transfer in transfers:

        # Consider ETH transfers only
        if transfer.get("asset") != "ETH":
            continue

        # Check transaction direction
        sender = transfer.get("from", "").lower()
        receiver = transfer.get("to", "").lower()
        wallet = wallet_address.lower()

        if direction == "outgoing" and sender != wallet:
            continue

        if direction == "incoming" and receiver != wallet:
            continue

        # Check transaction date
        timestamp = transfer.get("metadata", {}).get("blockTimestamp")

        if cutoff_time is not None:
            if not timestamp:
                continue

            transaction_time = datetime.fromisoformat(
                timestamp.replace("Z", "+00:00")
            )

            if transaction_time < cutoff_time:
                continue

        value = transfer.get("value")

        if value is None:
            continue

        matching_transfers.append(transfer)

    if not matching_transfers:
        return None

    largest_transfer = max(
        matching_transfers,
        key=lambda transfer: Decimal(str(transfer["value"]))
    )

    return largest_transfer


def execute_wallet_intent(
    intent_data: dict,
    transfers: list,
    wallet_address: str
):
    intent = intent_data.get("intent")

    if intent == "largest_transaction":
        return find_largest_transaction(
            transfers=transfers,
            wallet_address=wallet_address,
            direction=intent_data.get("direction", "both"),
            time_range_days=intent_data.get("time_range_days")
        )

    return {
        "error": "This question type is not supported yet."
    }






    
    

