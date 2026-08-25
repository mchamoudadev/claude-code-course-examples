import { txns, type Txn } from "../data";

function Row({ t }: { t: Txn }) {
  return (
    <div className="txn-row" style={{ top: t.top }}>
      <div className="txn-row__left">
        {t.tint ? (
          <div className="coin-badge coin-badge--tinted" style={{ background: t.tint }}>
            <img src={t.badge} alt="" />
          </div>
        ) : (
          <img className="coin-badge" src={t.badge} alt="" />
        )}
        <div className="txn-info">
          <div className="txn-amount">{t.amount}</div>
          <div className="txn-usd">{t.usd}</div>
        </div>
      </div>
      <div className="txn-delta">{t.delta}</div>
    </div>
  );
}

export default function Transactions() {
  return (
    <div className="txn-card">
      {[90, 168, 246].map((top) => (
        <div key={top} className="txn-divider" style={{ top }} />
      ))}
      {txns.map((t) => (
        <Row key={t.amount + t.delta} t={t} />
      ))}
    </div>
  );
}
