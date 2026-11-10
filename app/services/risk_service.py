from collections import Counter
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