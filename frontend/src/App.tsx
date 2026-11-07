import { FormEvent, useEffect, useState } from "react";
import {
  analyzeWallet,
  checkConnection,
  getTransaction,
  getTransactionReceipt,
  type ConnectionStatus,
  type TransactionDetails,
  type TransactionReceipt,
  type WalletAnalyzeResult,
} from "./api";

type Tab = "wallet" | "transaction";

function shorten(value: string, left = 10, right = 8) {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}…${value.slice(-right)}`;
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
  const [tab, setTab] = useState<Tab>("wallet");
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletResult, setWalletResult] = useState<WalletAnalyzeResult | null>(null);

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
            <p>Ethereum wallet & transaction analyzer</p>
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
                ? `${connection.network} connected`
                : "ETH RPC not connected"
              : "Checking network…"}
        </div>
      </header>

      <section className="hero">
        <h2>Inspect Ethereum activity in plain English.</h2>
        <p>
          Look up any wallet balance or transaction details from Ethereum Mainnet.
          More chains can be added later — this UI is ready for them.
        </p>
        <div className="network-row">
          <span className="network-pill">Ethereum</span>
          <span className="network-pill soon">Bitcoin soon</span>
          <span className="network-pill soon">Solana soon</span>
        </div>
      </section>

      <nav className="tabs" aria-label="Analyzer tools">
        <button
          type="button"
          className={`tab ${tab === "wallet" ? "active" : ""}`}
          onClick={() => setTab("wallet")}
        >
          Wallet balance
        </button>
        <button
          type="button"
          className={`tab ${tab === "transaction" ? "active" : ""}`}
          onClick={() => setTab("transaction")}
        >
          Transaction lookup
        </button>
      </nav>

      {tab === "wallet" ? (
        <section className="panel">
          <h3>Analyze a wallet</h3>
          <p className="hint">Paste an Ethereum address to fetch its current ETH balance.</p>

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
            <div className="result-grid">
              <div className="result-card">
                <span className="label">Balance</span>
                <div className="value large">{walletResult.balance ?? "—"}</div>
              </div>
              <div className="result-card">
                <span className="label">Network</span>
                <div className="value">{walletResult.network}</div>
              </div>
              <div className="result-card result-span">
                <span className="label">Wallet address</span>
                <div className="value">{walletResult.wallet_address}</div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <h3>Look up a transaction</h3>
          <p className="hint">
            Paste a transaction hash to see sender, receiver, value, gas fee, and confirmation status.
          </p>

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
                <div className="result-card">
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
                <div className="result-card result-span">
                  <span className="label">Transaction hash</span>
                  <div className="value">{txDetails.transaction_hash}</div>
                </div>
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
