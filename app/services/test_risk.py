from risk_service import calculate_risk_score

wallet_address = "0x1234567890abcdef1234567890abcdef12345678"

receiver = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"

dummy_transfers = []

for i in range(5):
    dummy_transfers.append({
        "hash": f"0xtransaction{i}",
        "from": wallet_address,
        "to": receiver,
        "asset": "ETH",
        "value": 0.06,
        "category": "external",
        "metadata": {
            "blockTimestamp": f"2026-11-10T10:0{i}:00.000Z"
        }
    })

result = calculate_risk_score(
    dummy_transfers,
    wallet_address
)

print(result)