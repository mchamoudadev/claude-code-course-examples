import { A } from "../data";

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="search">
        <img src={`${A}/icon-search.svg`} alt="" />
        <input
          type="text"
          placeholder="Search cryptocurrency, auction, NFTs and more..."
        />
      </div>

      <button className="btn-new">
        <img src={`${A}/icon-new-plus.svg`} alt="" />
        <span>NEW</span>
      </button>

      <img
        className="topbar__icon"
        style={{ left: 749 }}
        src={`${A}/icon-chat.svg`}
        alt="Messages"
      />
      <img
        className="topbar__icon"
        style={{ left: 831 }}
        src={`${A}/icon-bell.svg`}
        alt="Notifications"
      />
      <img
        className="topbar__avatar"
        src={`${A}/user-avatar.png`}
        alt="Profile"
      />
    </header>
  );
}
