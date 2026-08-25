import { A, nfts, type NFT } from "../data";
import Caret from "./Caret";

function HChevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d={dir === "left" ? "M14.5 7l-5 5 5 5" : "M9.5 7l5 5-5 5"}
        stroke="#3f444e"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NFTCard({ nft }: { nft: NFT }) {
  return (
    <div className="nft-card" style={{ left: nft.left }}>
      <img className="nft-card__img" src={nft.img} alt={nft.name} />
      <img className="nft-card__avatar" src={nft.avatar} alt="" />

      <div className="nft-card__name">{nft.name}</div>
      <div className="nft-card__user">{nft.user}</div>
      <div className="nft-card__price-label">Price</div>

      <div className="nft-card__price">
        <img src={`${A}/btc-badge.svg`} alt="" />
        <span>{nft.price}</span>
      </div>
      <div className="nft-card__usd">{nft.usd}</div>

      <div className="nft-meta nft-meta--time">
        <img src={`${A}/clock.svg`} alt="" />
        <span>{nft.time}</span>
      </div>
      <div className="nft-meta nft-meta--views">
        <img src={`${A}/eye.svg`} alt="" />
        <span>{nft.views}</span>
      </div>
    </div>
  );
}

export default function Featured() {
  return (
    <>
      <div className="featured-head">
        <div className="section-title">Featured NFTs</div>
        <div className="featured-controls">
          <div className="dropdown">
            <span>Popular</span>
            <Caret size={20} />
          </div>
          <button className="arrow-btn" aria-label="Previous">
            <HChevron dir="left" />
          </button>
          <button className="arrow-btn arrow-btn--active" aria-label="Next">
            <HChevron dir="right" />
          </button>
        </div>
      </div>

      {nfts.map((nft) => (
        <NFTCard key={nft.name} nft={nft} />
      ))}
    </>
  );
}
