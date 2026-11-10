import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  analyzeWallet,
  checkConnection,
  getPolExMaticBalance,
  getTransaction,
  getTransactionExplanation,
  getTransactionReceipt,
  getUsdcBalance,
  getWalletActivitySummary,
  getWalletTransfers,
  type AssetTransfer,
  type ConnectionStatus,
  type TokenBalanceResult,
  type TransactionDetails,
  type TransactionReceipt,
  type WalletAnalyzeResult,
} from "./api";
import {
  answerFromPreparedContext,
  prepareTransferData,
  type PreparedTransferData,
} from "./prepare";

type Mode = "balance" | "activity" | "transaction" | "insights";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

function shorten(value: string, left = 10, right = 8) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
}

function formatBlock(blockNum?: string) {
  if (!blockNum) return "—";
  try {
    return Number.parseInt(blockNum, 16).toLocaleString();
  } catch {
    return blockNum;
  }
}

function formatAmount(transfer: AssetTransfer) {
  const asset = transfer.asset || "ETH";
  if (transfer.value === null || transfer.value === undefined || transfer.value === "") {
    return `— ${asset}`;
  }
  return `${transfer.value} ${asset}`;
}

function formatTokenBalance(balance: number | string | null | undefined) {
  if (balance === null || balance === undefined || balance === "") return "—";
  const numeric = typeof balance === "number" ? balance : Number(balance);
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  return String(balance);
}

function CopyableAddress({ address, label }: { address: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="result-card">
      <div className="address-header">
        <span className="label">{label}</span>
        <div className="address-actions">
          <button
            type="button"
            className="link-btn"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show full"}
          </button>
          <button type="button" className="link-btn copy-btn" onClick={copyAddress}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className={`value address-value ${expanded ? "expanded" : ""}`} title={address}>
        {expanded ? address : shorten(address)}
      </div>
    </div>
  );
}

function EthLogo() {
  return (
    <svg viewBox="0 0 256 417" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" opacity="0.65" />
      <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
      <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" opacity="0.65" />
      <path d="M127.962 416.905v-104.72L0 236.585z" />
      <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" opacity="0.5" />
      <path d="M0 212.32l127.96 75.638v-133.8z" opacity="0.5" />
    </svg>
  );
}

function PreparedDataBox({ data }: { data: PreparedTransferData }) {
  return (
    <div className="ai-box">
      <div className="ai-box-title">Prepared transfer data</div>
      <p className="ai-box-hint">
        Same fields as backend <code>prepare_transfer_data</code> — used for Q&amp;A context.
      </p>
      <div className="prepared-grid">
        {(
          [
            ["transaction_hash", data.transaction_hash],
            ["sender", data.sender],
            ["receiver", data.receiver],
            ["asset", data.asset],
            ["amount", data.amount],
            ["category", data.category],
            ["timestamp", data.timestamp],
          ] as const
        ).map(([key, value]) => (
          <div className="prepared-row" key={key}>
            <span>{key}</span>
            <strong>{value == null || value === "" ? "Not available" : String(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskBox({
  messages,
  question,
  setQuestion,
  onAsk,
  disabled,
  placeholder,
}: {
  messages: ChatMessage[];
  question: string;
  setQuestion: (value: string) => void;
  onAsk: (event: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="ai-box ask-box">
      <div className="ai-box-title">Ask about this transfer</div>
      <p className="ai-box-hint">
        Ask about sender, receiver, amount, asset, time, category, hash — answers use prepared
        transfer data{disabled ? "" : " and any loaded AI text"}.
      </p>

      <div className="chat-log">
        {messages.length === 0 ? (
          <div className="chat-empty">No questions yet. Try “Who sent this?” or “How much?”</div>
        ) : (
          messages.map((message, index) => (
            <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}>
              <span className="chat-role">{message.role === "user" ? "You" : "ChainLens"}</span>
              <p>{message.text}</p>
            </div>
          ))
        )}
      </div>

      <form className="ask-form" onSubmit={onAsk}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder || "Ask a question about the selected transfer…"}
          rows={3}
          disabled={disabled}
        />
        <button className="btn" type="submit" disabled={disabled || !question.trim()}>
          Ask
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("balance");
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<WalletAnalyzeResult | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<TokenBalanceResult | null>(null);
  const [polBalance, setPolBalance] = useState<TokenBalanceResult | null>(null);
  const [tokenWarnings, setTokenWarnings] = useState<string[]>([]);

  const [activityAddress, setActivityAddress] = useState("");
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [activityWallet, setActivityWallet] = useState<string | null>(null);

  const [txHash, setTxHash] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<TransactionDetails | null>(null);
  const [txReceipt, setTxReceipt] = useState<TransactionReceipt | null>(null);
  const [txExplanation, setTxExplanation] = useState<string | null>(null);
  const [txExplanationLoading, setTxExplanationLoading] = useState(false);
  const [txExplanationError, setTxExplanationError] = useState<string | null>(null);
  const [txQuestion, setTxQuestion] = useState("");
  const [txMessages, setTxMessages] = useState<ChatMessage[]>([]);

  const [insightsAddress, setInsightsAddress] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [walletSummary, setWalletSummary] = useState<string | null>(null);
  const [insightsTransfers, setInsightsTransfers] = useState<AssetTransfer[]>([]);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [insightsQuestion, setInsightsQuestion] = useState("");
  const [insightsMessages, setInsightsMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    checkConnection()
      .then((data) => {
        if (!cancelled) {
          setConnection(data);
          setConnectionError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setConnection(null);
          setConnectionError(err.message || "Backend unreachable");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedTransfer = useMemo(() => {
    if (!selectedTransferId) return null;
    return (
      insightsTransfers.find(
        (transfer, index) => (transfer.uniqueId || transfer.hash || `${index}`) === selectedTransferId,
      ) ?? null
    );
  }, [insightsTransfers, selectedTransferId]);

  const preparedSelected = useMemo(
    () => (selectedTransfer ? prepareTransferData(selectedTransfer) : null),
    [selectedTransfer],
  );

  const preparedTxContext = useMemo<PreparedTransferData | null>(() => {
    if (!txDetails) return null;
    return {
      transaction_hash: txDetails.transaction_hash,
      sender: txDetails.from,
      receiver: txDetails.to,
      asset: "ETH",
      amount: txDetails.value,
      category: "external",
      timestamp: txReceipt?.block_timestamps ?? null,
    };
  }, [txDetails, txReceipt]);

  async function onAnalyzeWallet(event: FormEvent) {
    event.preventDefault();
    setWalletError(null);
    setWalletResult(null);
    setUsdcBalance(null);
    setPolBalance(null);
    setTokenWarnings([]);

    const address = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletError("Enter a valid Ethereum address (0x + 40 hex characters).");
      return;
    }

    setWalletLoading(true);
    try {
      const [ethResult, usdcResult, polResult] = await Promise.allSettled([
        analyzeWallet(address),
        getUsdcBalance(address),
        getPolExMaticBalance(address),
      ]);

      const warnings: string[] = [];

      if (ethResult.status === "fulfilled") {
        setWalletResult(ethResult.value);
      } else {
        setWalletError(
          ethResult.reason instanceof Error
            ? ethResult.reason.message
            : "Could not fetch ETH balance.",
        );
      }

      if (usdcResult.status === "fulfilled") {
        setUsdcBalance(usdcResult.value);
      } else {
        warnings.push("USDC balance unavailable");
      }

      if (polResult.status === "fulfilled") {
        setPolBalance(polResult.value);
      } else {
        warnings.push("POL EX-MATIC balance unavailable");
      }

      setTokenWarnings(warnings);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Could not analyze wallet.");
    } finally {
      setWalletLoading(false);
    }
  }

  async function onLoadActivity(event: FormEvent) {
    event.preventDefault();
    setActivityError(null);
    setTransfers([]);
    setActivityWallet(null);

    const address = activityAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setActivityError("Enter a valid Ethereum address (0x + 40 hex characters).");
      return;
    }

    setActivityLoading(true);
    try {
      const result = await getWalletTransfers(address);
      setTransfers(result.transfers ?? []);
      setActivityWallet(result.wallet_address);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : "Could not load transfers.");
    } finally {
      setActivityLoading(false);
    }
  }

  async function onLookupTransaction(event: FormEvent) {
    event.preventDefault();
    setTxError(null);
    setTxDetails(null);
    setTxReceipt(null);
    setTxExplanation(null);
    setTxExplanationError(null);
    setTxMessages([]);

    const hash = txHash.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      setTxError("Enter a valid transaction hash (0x + 64 hex characters).");
      return;
    }

    setTxLoading(true);
    try {
      const [details, receipt] = await Promise.all([
        getTransaction(hash),
        getTransactionReceipt(hash),
      ]);
      setTxDetails(details);
      setTxReceipt(receipt);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Could not fetch transaction.");
    } finally {
      setTxLoading(false);
    }
  }

  async function onLoadTxExplanation() {
    const hash = (txDetails?.transaction_hash || txHash).trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      setTxExplanationError("Look up a valid transaction first.");
      return;
    }

    setTxExplanationLoading(true);
    setTxExplanationError(null);
    try {
      const result = await getTransactionExplanation(hash);
      setTxExplanation(result.explanation);
    } catch (err) {
      setTxExplanationError(
        err instanceof Error ? err.message : "Could not load AI explanation.",
      );
    } finally {
      setTxExplanationLoading(false);
    }
  }

  function onAskTxQuestion(event: FormEvent) {
    event.preventDefault();
    const q = txQuestion.trim();
    if (!q) return;

    const answer = answerFromPreparedContext(q, preparedTxContext, null, txExplanation);
    setTxMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: answer }]);
    setTxQuestion("");
  }

  async function onLoadInsights(event: FormEvent) {
    event.preventDefault();
    setInsightsError(null);
    setWalletSummary(null);
    setInsightsTransfers([]);
    setSelectedTransferId(null);
    setInsightsMessages([]);

    const address = insightsAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setInsightsError("Enter a valid Ethereum address (0x + 40 hex characters).");
      return;
    }

    setInsightsLoading(true);
    try {
      const [summaryResult, transfersResult] = await Promise.allSettled([
        getWalletActivitySummary(address),
        getWalletTransfers(address),
      ]);

      if (summaryResult.status === "fulfilled") {
        setWalletSummary(summaryResult.value.summary);
      } else {
        setInsightsError(
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : "Could not load wallet summary.",
        );
      }

      if (transfersResult.status === "fulfilled") {
        const list = transfersResult.value.transfers ?? [];
        setInsightsTransfers(list);
        if (list[0]) {
          setSelectedTransferId(list[0].uniqueId || list[0].hash || "0");
        }
      }
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Could not load AI insights.");
    } finally {
      setInsightsLoading(false);
    }
  }

  function onAskInsightsQuestion(event: FormEvent) {
    event.preventDefault();
    const q = insightsQuestion.trim();
    if (!q) return;

    const answer = answerFromPreparedContext(q, preparedSelected, walletSummary, null);
    setInsightsMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: answer },
    ]);
    setInsightsQuestion("");
  }

  function openTransaction(hash?: string) {
    if (!hash) return;
    setTxHash(hash);
    setMode("transaction");
    setTxError(null);
    setTxDetails(null);
    setTxReceipt(null);
    setTxExplanation(null);
    setTxExplanationError(null);
    setTxMessages([]);
  }

  const online = Boolean(connection?.connected);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <EthLogo />
          </div>
          <div>
            <h1>ChainLens</h1>
            <p>Neon desk for Ethereum wallets & txs</p>
          </div>
        </div>

        <div
          className={`status-chip ${online ? "online" : "offline"}`}
          title={connectionError ?? connection?.network ?? "Checking…"}
        >
          <span className="status-dot" />
          {connectionError
            ? "Backend offline"
            : connection
              ? connection.connected
                ? `${connection.network} live`
                : "ETH RPC offline"
              : "Checking network…"}
        </div>
      </header>

      <section className="hero">
        <div className="hero-kicker">Ethereum first · AI summaries ready</div>
        <h2>See the chain. Follow the money.</h2>
        <p>
          Check balances, scan transfers, look up hashes, and read AI summaries built from prepared
          transfer data.
        </p>
        <div className="network-row">
          <span className="network-pill">Ethereum</span>
          <span className="network-pill">USDC</span>
          <span className="network-pill">POL EX-MATIC</span>
          <span className="network-pill">AI summary</span>
        </div>
      </section>

      <div className="mode-grid modes-4" role="tablist" aria-label="Analyzer modes">
        <button
          type="button"
          className={`mode-card ${mode === "balance" ? "active" : ""}`}
          onClick={() => setMode("balance")}
        >
          <strong>Wallet balance</strong>
          <span>ETH + USDC + POL EX-MATIC</span>
        </button>
        <button
          type="button"
          className={`mode-card ${mode === "activity" ? "active" : ""}`}
          onClick={() => setMode("activity")}
        >
          <strong>Transfer history</strong>
          <span>Incoming & outgoing asset transfers</span>
        </button>
        <button
          type="button"
          className={`mode-card ${mode === "transaction" ? "active" : ""}`}
          onClick={() => setMode("transaction")}
        >
          <strong>Tx lookup</strong>
          <span>Hash details + AI explanation</span>
        </button>
        <button
          type="button"
          className={`mode-card ${mode === "insights" ? "active" : ""}`}
          onClick={() => setMode("insights")}
        >
          <strong>AI insights</strong>
          <span>Wallet summary + ask about transfers</span>
        </button>
      </div>

      {mode === "balance" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Analyze a wallet</h3>
              <p className="hint">
                Paste an Ethereum address to fetch ETH, USDC, and POL EX-MATIC balances.
              </p>
            </div>
          </div>

          <form className="form-row" onSubmit={onAnalyzeWallet}>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x… wallet address"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={walletLoading}>
              {walletLoading ? "Checking…" : "Get balances"}
            </button>
          </form>

          {walletError && <div className="message error">{walletError}</div>}
          {tokenWarnings.length > 0 && (
            <div className="message info">{tokenWarnings.join(" · ")}</div>
          )}

          {(walletResult || usdcBalance || polBalance) && (
            <div className="result-grid split">
              {walletResult && (
                <div className="result-card accent">
                  <span className="label">ETH</span>
                  <div className="value large">{walletResult.balance ?? "—"}</div>
                </div>
              )}

              {usdcBalance && (
                <div className="result-card accent">
                  <span className="label">{usdcBalance.token}</span>
                  <div className="value large">{formatTokenBalance(usdcBalance.balance)}</div>
                </div>
              )}

              {polBalance && (
                <div className="result-card accent">
                  <span className="label">{polBalance.token}</span>
                  <div className="value large">{formatTokenBalance(polBalance.balance)}</div>
                </div>
              )}

              {walletResult && (
                <div className="result-card">
                  <span className="label">Network</span>
                  <div className="value">{walletResult.network}</div>
                </div>
              )}

              {(walletResult || usdcBalance || polBalance) && (
                <CopyableAddress
                  label="Wallet address"
                  address={
                    walletResult?.wallet_address ||
                    usdcBalance?.wallet_address ||
                    polBalance?.wallet_address ||
                    ""
                  }
                />
              )}

              {walletResult && (
                <div className="result-card">
                  <span className="label">Next step</span>
                  <div className="value" style={{ fontFamily: "var(--font-body)" }}>
                    Open AI insights for a wallet activity summary.
                  </div>
                  <button
                    type="button"
                    className="ghost-btn"
                    style={{ marginTop: "0.75rem" }}
                    onClick={() => {
                      setInsightsAddress(walletResult.wallet_address);
                      setMode("insights");
                    }}
                  >
                    Open AI insights
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {mode === "activity" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Wallet transfer history</h3>
              <p className="hint">
                Loads incoming and outgoing transfers (external, internal, ERC-20) from the backend.
              </p>
            </div>
          </div>

          <form className="form-row" onSubmit={onLoadActivity}>
            <input
              type="text"
              value={activityAddress}
              onChange={(e) => setActivityAddress(e.target.value)}
              placeholder="0x… wallet address"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={activityLoading}>
              {activityLoading ? "Scanning…" : "Load transfers"}
            </button>
          </form>

          {activityLoading && (
            <div className="message info">
              <span className="loading-pulse">Fetching transfers from Ethereum…</span>
            </div>
          )}

          {activityError && <div className="message error">{activityError}</div>}

          {!activityLoading && activityWallet && transfers.length === 0 && (
            <div className="empty-state">No transfers returned for this wallet.</div>
          )}

          {transfers.length > 0 && activityWallet && (
            <>
              <div className="section-title">
                {transfers.length} transfer{transfers.length === 1 ? "" : "s"} · {shorten(activityWallet)}
              </div>
              <div className="transfer-list">
                {transfers.map((transfer, index) => {
                  const from = (transfer.from || "").toLowerCase();
                  const to = (transfer.to || "").toLowerCase();
                  const wallet = activityWallet.toLowerCase();
                  const direction =
                    from === wallet && to === wallet
                      ? "self"
                      : from === wallet
                        ? "out"
                        : to === wallet
                          ? "in"
                          : "other";

                  return (
                    <article
                      className="transfer-item"
                      key={transfer.uniqueId || transfer.hash || `${index}`}
                    >
                      <div className="transfer-top">
                        <div className="transfer-amount">{formatAmount(transfer)}</div>
                        <span
                          className={`badge ${
                            direction === "in"
                              ? "in"
                              : direction === "out"
                                ? "out"
                                : "neutral"
                          }`}
                        >
                          {direction === "in"
                            ? "Incoming"
                            : direction === "out"
                              ? "Outgoing"
                              : direction === "self"
                                ? "Self"
                                : transfer.category || "Transfer"}
                        </span>
                      </div>

                      <div className="transfer-meta">
                        <div>
                          From <strong>{transfer.from ? shorten(transfer.from) : "—"}</strong>
                        </div>
                        <div>
                          To <strong>{transfer.to ? shorten(transfer.to) : "—"}</strong>
                        </div>
                        <div>
                          Block <strong>{formatBlock(transfer.blockNum)}</strong>
                          {transfer.category ? ` · ${transfer.category}` : ""}
                          {transfer.metadata?.blockTimestamp
                            ? ` · ${transfer.metadata.blockTimestamp}`
                            : ""}
                        </div>
                      </div>

                      <div className="transfer-actions">
                        {transfer.hash && (
                          <>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => openTransaction(transfer.hash)}
                            >
                              Open tx details
                            </button>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => navigator.clipboard.writeText(transfer.hash || "")}
                            >
                              Copy hash
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="ghost-btn"
                          onClick={() => {
                            setInsightsAddress(activityWallet);
                            setInsightsTransfers(transfers);
                            setSelectedTransferId(
                              transfer.uniqueId || transfer.hash || `${index}`,
                            );
                            setMode("insights");
                          }}
                        >
                          Ask about this
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {mode === "transaction" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Look up a transaction</h3>
              <p className="hint">
                Paste a transaction hash for details, then load an AI explanation and ask questions.
              </p>
            </div>
          </div>

          <form className="form-row" onSubmit={onLookupTransaction}>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x… transaction hash"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={txLoading}>
              {txLoading ? "Fetching…" : "Look up"}
            </button>
          </form>

          {txError && <div className="message error">{txError}</div>}

          {(txDetails || txReceipt) && (
            <div className="result-grid split">
              {txReceipt && (
                <div className="result-card">
                  <span className="label">Status</span>
                  <div className="value">
                    <span className={`badge ${txReceipt.status === 1 ? "success" : "fail"}`}>
                      {txReceipt.status === 1 ? "Success" : "Failed"}
                    </span>
                  </div>
                </div>
              )}

              {txDetails && (
                <div className="result-card accent">
                  <span className="label">Value</span>
                  <div className="value large">{txDetails.value} ETH</div>
                </div>
              )}

              {txReceipt && (
                <div className="result-card">
                  <span className="label">Gas fee</span>
                  <div className="value">{txReceipt.gas_fee_eth} ETH</div>
                </div>
              )}

              {txReceipt && (
                <div className="result-card">
                  <span className="label">Confirmations</span>
                  <div className="value">{txReceipt.confirmations}</div>
                </div>
              )}

              {txDetails && <CopyableAddress label="From" address={txDetails.from} />}

              {txDetails &&
                (txDetails.to ? (
                  <CopyableAddress label="To" address={txDetails.to} />
                ) : (
                  <div className="result-card">
                    <span className="label">To</span>
                    <div className="value">Contract creation</div>
                  </div>
                ))}

              {txReceipt && (
                <div className="result-card">
                  <span className="label">Block</span>
                  <div className="value">{txReceipt.block_number}</div>
                </div>
              )}

              {txReceipt && (
                <div className="result-card">
                  <span className="label">Timestamp (UTC)</span>
                  <div className="value">{txReceipt.block_timestamps}</div>
                </div>
              )}

              {txDetails && (
                <CopyableAddress label="Transaction hash" address={txDetails.transaction_hash} />
              )}
            </div>
          )}

          {(txDetails || txReceipt) && (
            <div className="ai-stack">
              <div className="ai-box">
                <div className="ai-box-head">
                  <div>
                    <div className="ai-box-title">AI transaction summary</div>
                    <p className="ai-box-hint">
                      Calls <code>GET /transactions/{"{tx_hash}"}/explanation</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={onLoadTxExplanation}
                    disabled={txExplanationLoading}
                  >
                    {txExplanationLoading ? "Generating…" : "Generate summary"}
                  </button>
                </div>

                {txExplanationError && <div className="message error">{txExplanationError}</div>}
                {txExplanationLoading && (
                  <div className="message info">
                    <span className="loading-pulse">Asking Gemini to explain this transaction…</span>
                  </div>
                )}
                {txExplanation && <div className="ai-prose">{txExplanation}</div>}
                {!txExplanation && !txExplanationLoading && !txExplanationError && (
                  <div className="chat-empty">Generate a summary to see the AI explanation here.</div>
                )}
              </div>

              {preparedTxContext && <PreparedDataBox data={preparedTxContext} />}

              <AskBox
                messages={txMessages}
                question={txQuestion}
                setQuestion={setTxQuestion}
                onAsk={onAskTxQuestion}
                disabled={!preparedTxContext}
                placeholder='e.g. "Who received the funds?" or "What was the amount?"'
              />
            </div>
          )}
        </section>
      )}

      {mode === "insights" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>AI wallet insights</h3>
              <p className="hint">
                Loads the wallet activity summary (built with <code>prepare_transfer_data</code>),
                shows prepared fields for a selected transfer, and lets you ask questions.
              </p>
            </div>
          </div>

          <form className="form-row" onSubmit={onLoadInsights}>
            <input
              type="text"
              value={insightsAddress}
              onChange={(e) => setInsightsAddress(e.target.value)}
              placeholder="0x… wallet address"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="btn" type="submit" disabled={insightsLoading}>
              {insightsLoading ? "Summarizing…" : "Get AI summary"}
            </button>
          </form>

          {insightsLoading && (
            <div className="message info">
              <span className="loading-pulse">Building wallet summary from recent transfers…</span>
            </div>
          )}
          {insightsError && <div className="message error">{insightsError}</div>}

          {(walletSummary || insightsTransfers.length > 0) && (
            <div className="ai-stack">
              <div className="ai-box">
                <div className="ai-box-title">AI transaction summary</div>
                <p className="ai-box-hint">
                  Calls <code>GET /transactions/wallet/{"{address}"}/summary</code>
                </p>
                {walletSummary ? (
                  <div className="ai-prose">{walletSummary}</div>
                ) : (
                  <div className="chat-empty">Summary unavailable for this wallet.</div>
                )}
              </div>

              {insightsTransfers.length > 0 && (
                <div className="ai-box">
                  <div className="ai-box-title">Select a transfer for Q&amp;A</div>
                  <p className="ai-box-hint">
                    Choosing a row loads prepared transfer data for the ask box.
                  </p>
                  <div className="transfer-pick-list">
                    {insightsTransfers.slice(0, 12).map((transfer, index) => {
                      const id = transfer.uniqueId || transfer.hash || `${index}`;
                      const active = selectedTransferId === id;
                      return (
                        <button
                          type="button"
                          key={id}
                          className={`transfer-pick ${active ? "active" : ""}`}
                          onClick={() => setSelectedTransferId(id)}
                        >
                          <span>{formatAmount(transfer)}</span>
                          <small>
                            {transfer.metadata?.blockTimestamp || transfer.category || "transfer"}
                            {transfer.hash ? ` · ${shorten(transfer.hash, 8, 6)}` : ""}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {preparedSelected && <PreparedDataBox data={preparedSelected} />}

              <AskBox
                messages={insightsMessages}
                question={insightsQuestion}
                setQuestion={setInsightsQuestion}
                onAsk={onAskInsightsQuestion}
                disabled={!preparedSelected && !walletSummary}
                placeholder='e.g. "Who is the receiver?" or "Summarize the activity"'
              />
            </div>
          )}
        </section>
      )}

      {!online && !connectionError && (
        <div className="message info" style={{ marginTop: "1rem" }}>
          Waiting for Ethereum RPC connection from the backend…
        </div>
      )}
    </div>
  );
}
