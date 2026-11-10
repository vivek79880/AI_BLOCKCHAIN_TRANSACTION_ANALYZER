from collections import Counter
from datetime import datetime, timedelta
def detect_repeated_transfers(transfers: list, wallet_address: str):

    outgoing_transfers = [
        transfer for transfer in transfers
        if transfer.get("from", "").lower() == wallet_address.lower()
    ]

    receiver_counts = Counter(
        transfer.get("to", "").lower()
        for transfer in outgoing_transfers
    )

    flagged_addresses = [
        {
            "address": address,
            "transfer_count": count
        }
        for address, count in receiver_counts.items()
        if count >= 3
    ]

    return flagged_addresses

def detect_large_eth_transfers(
    transfers: list,
    wallet_address: str,
    threshold_eth: float = 0.051
):
    large_transfers = []

    for transfer in transfers:

        sender = (transfer.get("from") or "").lower()
        amount = transfer.get("value")

        if sender != wallet_address.lower():
            continue

        if transfer.get("asset") != "ETH":
            continue

        if amount is None:
            continue

        if float(amount) >= threshold_eth:
            large_transfers.append({
                "transaction_hash": transfer.get("hash"),
                "receiver": transfer.get("to"),
                "amount": amount,
                "asset": "ETH"
            })

    return large_transfers

def detect_frequent_transfers(
    transfers: list,
    wallet_address: str,
    limit: int = 5,
    time_window_minutes: int = 5
):
    outgoing_transfers = [
        transfer for transfer in transfers
        if (transfer.get("from") or "").lower()
        == wallet_address.lower()
        and transfer.get("metadata", {}).get("blockTimestamp")
    ]

    outgoing_transfers.sort(
        key=lambda x: x["metadata"]["blockTimestamp"]
    )

    flagged_transfers = []

    for i in range(len(outgoing_transfers)):

        start_time = datetime.fromisoformat(
            outgoing_transfers[i]["metadata"]["blockTimestamp"]
            .replace("Z", "+00:00")
        )

        count = 0

        for j in range(i, len(outgoing_transfers)):
            current_time = datetime.fromisoformat(
                outgoing_transfers[j]["metadata"]["blockTimestamp"]
                .replace("Z", "+00:00")
            )

            if current_time - start_time <= timedelta(
                minutes=time_window_minutes
            ):
                count += 1
            else:
                break

        if count >= limit:
            flagged_transfers.append({
                "start_time": outgoing_transfers[i]["metadata"]["blockTimestamp"],
                "transfer_count": count,
                "time_window_minutes": time_window_minutes
            })

            break

    return flagged_transfers

def calculate_risk_score(
    transfers: list,
    wallet_address: str
):
    repeated = detect_repeated_transfers(
        transfers, wallet_address
    )

    large = detect_large_eth_transfers(
        transfers, wallet_address
    )

    frequent = detect_frequent_transfers(
        transfers, wallet_address
    )

    score = 0

    if repeated:
        score += 2

    if large:
        score += 3

    if frequent:
        score += 3

    if score >= 6:
        risk_level = "High"
    elif score >= 3:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "wallet_address": wallet_address,
        "risk_score": score,
        "risk_level": risk_level,
        "findings": {
            "repeated_transfers": repeated,
            "large_transfers": large,
            "frequent_transfers": frequent
        }
    }



