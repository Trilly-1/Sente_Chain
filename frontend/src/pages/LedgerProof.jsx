import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { T, card } from "../styles/theme"
import { apiGetPublicLedger } from "../services/api"

const network = import.meta.env.VITE_STELLAR_NETWORK || "testnet"
const explorerBase =
  network === "mainnet"
    ? "https://stellar.expert/explorer/public/tx"
    : "https://stellar.expert/explorer/testnet/tx"

export default function LedgerProof() {
  const { stellarHash } = useParams()
  const [entry, setEntry] = useState(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!stellarHash) return
    apiGetPublicLedger(stellarHash)
      .then(setEntry)
      .catch((err) => setError(err.message || "Ledger entry not found"))
      .finally(() => setLoading(false))
  }, [stellarHash])

  return (
    <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: T.font }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 20px" }}>
        <Link to="/" style={{ fontSize: "13px", color: T.green, fontWeight: 700, textDecoration: "none" }}>← Back to SenteChain</Link>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: T.textHi, margin: "16px 0 8px" }}>Transparent Ledger</h1>
        <p style={{ color: T.textMid, marginBottom: "24px" }}>Immutable proof anchored on the Stellar network. Anyone can verify this transaction.</p>

        <div style={{ ...card(), padding: "28px", background: "#fff" }}>
          {loading && <p style={{ color: T.textDim }}>Loading ledger entry...</p>}
          {error && <p style={{ color: T.red }}>{error}</p>}
          {entry && (
            <div style={{ display: "grid", gap: "14px" }}>
              {[
                ["Reference", entry.reference_number],
                ["Type", entry.transaction_type],
                ["Amount", `${entry.currency} ${parseFloat(entry.amount).toLocaleString()}`],
                ["Status", entry.status],
                ["Recorded", new Date(entry.created_at).toLocaleString()],
                ["Stellar hash", entry.stellar_tx_hash],
              ].map(([label, val]) => (
                <div key={label}>
                  <p style={{ fontSize: "11px", fontWeight: 700, color: T.textDim, margin: "0 0 4px", textTransform: "uppercase", fontFamily: T.fontMono }}>{label}</p>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: T.textHi, margin: 0, fontFamily: label === "Stellar hash" ? T.fontMono : T.font, wordBreak: "break-all" }}>{val}</p>
                </div>
              ))}
              <a
                href={`${explorerBase}/${entry.stellar_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: "8px", padding: "12px 18px", borderRadius: "10px", background: T.green, color: "#fff", fontWeight: 800, textDecoration: "none", textAlign: "center" }}
              >
                View on Stellar Explorer ↗
              </a>
              {entry.sacco_id && (
                <Link to={`/sacco/${entry.sacco_id}`} style={{ fontSize: "13px", color: T.green, fontWeight: 700 }}>
                  View SACCO public ledger →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
