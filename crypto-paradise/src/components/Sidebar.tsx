import { A, wallets, inboxAvatars } from "../data";
import Caret from "./Caret";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="logo-mark">
          <img src={`${A}/logo-cp.svg`} alt="Crypto Paradise" />
        </div>
        <div className="logo-text">Crypto Paradise</div>
      </div>

      {/* Balance card */}
      <div className="balance-card">
        <div className="balance-card__head">
          <div className="balance-card__coin">
            <img src={`${A}/sidebar-btc.svg`} alt="" />
            <div className="balance-card__name">
              BitCoin <span>BTC</span>
            </div>
          </div>
          <Caret size={24} />
        </div>
        <img
          className="balance-card__spark"
          src={`${A}/balance-sparkline.svg`}
          alt=""
        />
        <div className="balance-card__balance">
          <div className="balance-card__label">BALANCE</div>
          <div className="balance-card__amount-row">
            <img src={`${A}/balance-up-arrow.svg`} alt="" />
            <div className="balance-card__amount">$21.533.10</div>
          </div>
        </div>
      </div>

      {/* Purple active indicator */}
      <div className="accent-bar" />

      {/* Home (active) */}
      <div className="nav-home">
        <img src={`${A}/icon-home.svg`} alt="" />
        <span>Home</span>
      </div>

      {/* Auctions */}
      <div className="nav-item" style={{ top: 467 }}>
        <img className="nav-icon" src={`${A}/icon-auctions.svg`} alt="" />
        <span className="nav-label nav-label--15">Auctions</span>
      </div>
      <div className="badge">4</div>

      {/* Inbox */}
      <div
        className="nav-item"
        style={{ top: 511, width: 279, justifyContent: "space-between" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img className="nav-icon" src={`${A}/icon-inbox.svg`} alt="" />
          <span className="nav-label nav-label--15">Inbox</span>
        </span>
        <span className="avatar-stack">
          {inboxAvatars.map((src) => (
            <img key={src} src={src} alt="" />
          ))}
        </span>
      </div>

      <div className="sidebar__divider" style={{ top: 563 }} />

      {/* Your wallets */}
      <div className="wallets-head">
        <div className="wallets-head__left">
          <div className="wallets-plus">
            <img src={`${A}/icon-wallets-plus.svg`} alt="" />
          </div>
          <div className="wallets-head__label">YOUR WALLETS</div>
        </div>
        <Caret size={24} />
      </div>

      {wallets.map((w) => (
        <div className="coin-item" key={w.name} style={{ top: w.top }}>
          <img src={w.icon} alt="" />
          <span>{w.name}</span>
        </div>
      ))}

      <div className="sidebar__divider" style={{ top: 836 }} />

      {/* Settings */}
      <div className="nav-item" style={{ top: 860 }}>
        <img className="nav-icon" src={`${A}/icon-settings.svg`} alt="" />
        <span className="nav-label nav-label--16">Settings</span>
      </div>

      {/* Help & FAQ */}
      <div className="nav-item" style={{ top: 908 }}>
        <img className="nav-icon" src={`${A}/icon-help.svg`} alt="" />
        <span className="nav-label nav-label--16">Help &amp; FAQ</span>
      </div>

      {/* Dark mode */}
      <div className="darkmode">
        <div className="darkmode__left">
          <img src={`${A}/icon-darkmode.svg`} alt="" />
          <span>Dark mode</span>
        </div>
        <button className="toggle" aria-label="Toggle dark mode">
          <img
            src={`${A}/toggle-off.svg`}
            alt=""
            style={{ width: "100%", height: "100%" }}
          />
        </button>
      </div>
    </aside>
  );
}
