import { FormEvent, useEffect, useState } from "react";
import {
  analyzeWallet,
  checkConnection,
  getTransaction,
  getTransactionReceipt,
  getWalletTransfers,
  type AssetTransfer,
  type ConnectionStatus,
  type TransactionDetails,
  type TransactionReceipt,
  type WalletAnalyzeResult,
} from "./api";

type Mode = "balance" | "activity" | "transaction";

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

export default function App() {
  const [mode, setMode] = useState<Mode>("balance");
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<WalletAnalyzeResult | null>(null);

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

  async function onAnalyzeWallet(event: FormEvent) {
    event.preventDefault();
    setWalletError(null);
    setWalletResult(null);

    const address = walletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletError("Enter a valid Ethereum address (0x + 40 hex characters).");
      return;
    }

    setWalletLoading(true);
    try {
      const result = await analyzeWallet(address);
      setWalletResult(result);
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

  function openTransaction(hash?: string) {
    if (!hash) return;
    setTxHash(hash);
    setMode("transaction");
    setTxError(null);
    setTxDetails(null);
    setTxReceipt(null);
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
        <div className="hero-kicker">Ethereum first · multi-chain ready</div>
        <h2>See the chain. Follow the money.</h2>
        <p>
          Check balances, scan wallet transfer history, and open any transaction hash —
          built for ETH Mainnet, designed to grow with more networks.
        </p>
        <div className="network-row">
          <span className="network-pill">Ethereum</span>
          <span className="network-pill soon">Bitcoin soon</span>
          <span className="network-pill soon">Solana soon</span>
        </div>
      </section>

      <div className="mode-grid" role="tablist" aria-label="Analyzer modes">
        <button
          type="button"
          className={`mode-card ${mode === "balance" ? "active" : ""}`}
          onClick={() => setMode("balance")}
        >
          <strong>Wallet balance</strong>
          <span>Live ETH balance for any address</span>
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
          <span>Hash → value, gas, status, parties</span>
        </button>
      </div>

      {mode === "balance" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Analyze a wallet</h3>
              <p className="hint">Paste an Ethereum address to fetch its current ETH balance.</p>
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
              {walletLoading ? "Checking…" : "Get balance"}
            </button>
          </form>

          {walletError && <div className="message error">{walletError}</div>}

          {walletResult && (
            <div className="result-grid split">
              <div className="result-card accent">
                <span className="label">Balance</span>
                <div className="value large">{walletResult.balance ?? "—"}</div>
              </div>
              <div className="result-card">
                <span className="label">Network</span>
                <div className="value">{walletResult.network}</div>
              </div>
              <CopyableAddress label="Wallet address" address={walletResult.wallet_address} />
              <div className="result-card">
                <span className="label">Next step</span>
                <div className="value" style={{ fontFamily: "var(--font-body)" }}>
                  Open Transfer history to scan this wallet’s moves.
                </div>
                <button
                  type="button"
                  className="ghost-btn"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => {
                    setActivityAddress(walletResult.wallet_address);
                    setMode("activity");
                  }}
                >
                  View activity
                </button>
              </div>
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

                      {transfer.hash && (
                        <div className="transfer-actions">
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
                        </div>
                      )}
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
                Paste a transaction hash for sender, receiver, value, gas fee, and confirmation status.
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
