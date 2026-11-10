import type { AssetTransfer } from "./api";

/** Mirrors app/services/llm_service.py → prepare_transfer_data */
export type PreparedTransferData = {
  transaction_hash: string | null | undefined;
  sender: string | null | undefined;
  receiver: string | null | undefined;
  asset: string | null | undefined;
  amount: number | string | null | undefined;
  category: string | null | undefined;
  timestamp: string | null | undefined;
};

export function prepareTransferData(transfer: AssetTransfer): PreparedTransferData {
  return {
    transaction_hash: transfer.hash ?? null,
    sender: transfer.from ?? null,
    receiver: transfer.to ?? null,
    asset: transfer.asset ?? null,
    amount: transfer.value ?? null,
    category: transfer.category ?? null,
    timestamp: transfer.metadata?.blockTimestamp ?? null,
  };
}

export function answerFromPreparedContext(
  question: string,
  prepared: PreparedTransferData | null,
  aiSummary?: string | null,
  aiExplanation?: string | null,
): string {
  const q = question.trim().toLowerCase();
  if (!q) return "Type a question about the selected transfer or AI summary.";

  if (!prepared && !aiSummary && !aiExplanation) {
    return "Load an AI summary or select a transfer first. Answers use prepared transfer data (same fields as the backend).";
  }

  if (prepared) {
    if (/(who\s+)?(sent|sender|from\b)/.test(q)) {
      return prepared.sender ? `Sender: ${prepared.sender}` : "Sender: Not available";
    }
    if (/(who\s+)?(received|receiver|to\b)/.test(q)) {
      return prepared.receiver ? `Receiver: ${prepared.receiver}` : "Receiver: Not available";
    }
    if (/(how much|amount|value)/.test(q)) {
      return prepared.amount != null && prepared.amount !== ""
        ? `Amount: ${prepared.amount}${prepared.asset ? ` ${prepared.asset}` : ""}`
        : "Amount: Not available";
    }
    if (/(asset|token|coin)/.test(q)) {
      return prepared.asset ? `Asset: ${prepared.asset}` : "Asset: Not available";
    }
    if (/(when|time|date|timestamp)/.test(q)) {
      return prepared.timestamp ? `Timestamp: ${prepared.timestamp}` : "Timestamp: Not available";
    }
    if (/categor/.test(q)) {
      return prepared.category ? `Category: ${prepared.category}` : "Category: Not available";
    }
    if (/(hash|txid|transaction id)/.test(q)) {
      return prepared.transaction_hash
        ? `Transaction hash: ${prepared.transaction_hash}`
        : "Transaction hash: Not available";
    }
  }

  if (/(summar|overview|pattern|activity|what happened)/.test(q) && aiSummary) {
    return aiSummary;
  }
  if (/(explain|what happened|summary)/.test(q) && aiExplanation) {
    return aiExplanation;
  }

  const lines: string[] = [];
  if (prepared) {
    lines.push("I can answer from this prepared transfer data:");
    lines.push(`• Hash: ${prepared.transaction_hash ?? "Not available"}`);
    lines.push(`• Sender: ${prepared.sender ?? "Not available"}`);
    lines.push(`• Receiver: ${prepared.receiver ?? "Not available"}`);
    lines.push(`• Asset: ${prepared.asset ?? "Not available"}`);
    lines.push(`• Amount: ${prepared.amount ?? "Not available"}`);
    lines.push(`• Category: ${prepared.category ?? "Not available"}`);
    lines.push(`• Timestamp: ${prepared.timestamp ?? "Not available"}`);
    lines.push("");
    lines.push('Try asking: "Who sent this?", "How much?", "What asset?", "When?"');
  }
  if (aiSummary) {
    lines.push("", "AI wallet summary is also available — ask for a summary or overview.");
  }
  if (aiExplanation) {
    lines.push("", "AI transaction explanation is loaded — ask what happened.");
  }
  return lines.join("\n");
}
