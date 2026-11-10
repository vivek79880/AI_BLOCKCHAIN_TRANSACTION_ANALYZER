const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail)) detail = body.detail.map(String).join(", ");
    } catch {
      // keep default message
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export type ConnectionStatus = {
  connected: boolean;
  network: string;
};

export type WalletAnalyzeResult = {
  wallet_address: string;
  balance: string | null;
  network: string;
};

export type TokenBalanceResult = {
  wallet_address: string;
  token: string;
  balance: number | string;
};

export type TransactionDetails = {
  transaction_hash: string;
  from: string;
  to: string | null;
  value: string;
  block_number: number | null;
  nonce: number;
};

export type TransactionReceipt = {
  transaction_hash: string;
  status: number;
  block_number: number;
  gas_used: number;
  gas_fee_eth: string;
  block_timestamps: string;
  confirmations: number;
};

export type AssetTransfer = {
  uniqueId?: string;
  hash?: string;
  from?: string;
  to?: string | null;
  value?: number | string | null;
  asset?: string | null;
  category?: string;
  blockNum?: string;
  metadata?: {
    blockTimestamp?: string;
  };
};

export type WalletTransfersResult = {
  wallet_address: string;
  transfers: AssetTransfer[];
};

export function checkConnection() {
  return request<ConnectionStatus>("/wallet/connection");
}

export function analyzeWallet(walletAddress: string) {
  return request<WalletAnalyzeResult>("/wallet/analyze", {
    method: "POST",
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
}

export function getUsdcBalance(walletAddress: string) {
  return request<TokenBalanceResult>(`/wallet/usdc/${walletAddress}`);
}

export function getPolExMaticBalance(walletAddress: string) {
  return request<TokenBalanceResult>(`/wallet/pol_ex_matic/${walletAddress}`);
}

export function getWalletTransfers(walletAddress: string) {
  return request<WalletTransfersResult>(`/transactions/wallet/${walletAddress}`);
}

export function getTransaction(txHash: string) {
  return request<TransactionDetails>(`/transactions/${txHash}`);
}

export function getTransactionReceipt(txHash: string) {
  return request<TransactionReceipt>(`/transactions/${txHash}/receipt`);
}

export type TransactionExplanation = {
  transaction_hash: string;
  explanation: string;
};

export type WalletActivitySummary = {
  wallet_address: string;
  summary: string;
};

export function getTransactionExplanation(txHash: string) {
  return request<TransactionExplanation>(`/transactions/${txHash}/explanation`);
}

export function getWalletActivitySummary(walletAddress: string) {
  return request<WalletActivitySummary>(`/transactions/wallet/${walletAddress}/summary`);
}

export type RepeatedTransferFinding = {
  address: string;
  transfer_count: number;
};

export type LargeTransferFinding = {
  transaction_hash?: string;
  receiver?: string | null;
  amount?: number | string;
  asset?: string;
};

export type FrequentTransferFinding = {
  start_time?: string;
  transfer_count?: number;
  time_window_minutes?: number;
};

export type RiskAnalysis = {
  wallet_address: string;
  risk_score: number;
  risk_level: string;
  findings: {
    repeated_transfers: RepeatedTransferFinding[];
    large_transfers: LargeTransferFinding[];
    frequent_transfers: FrequentTransferFinding[];
  };
};

export type WalletRiskResponse = {
  risk_analysis?: RiskAnalysis;
  ai_explanation?: string;
  // Fallback shape when AI summarizer fails
  "Oops! ai summarizer is not working at the moment, here is your summary of the risk analysis"?: RiskAnalysis;
  "ai explanation"?: string;
};

export function normalizeWalletRisk(raw: WalletRiskResponse): {
  risk: RiskAnalysis | null;
  explanation: string | null;
  aiUnavailable: boolean;
} {
  if (raw.risk_analysis) {
    return {
      risk: raw.risk_analysis,
      explanation: raw.ai_explanation ?? null,
      aiUnavailable: false,
    };
  }

  const fallbackRisk =
    raw["Oops! ai summarizer is not working at the moment, here is your summary of the risk analysis"] ??
    null;

  return {
    risk: fallbackRisk,
    explanation: raw["ai explanation"] ?? null,
    aiUnavailable: true,
  };
}

export function getWalletRisk(walletAddress: string) {
  return request<WalletRiskResponse>(`/transactions/wallet/${walletAddress}/risk`);
}
