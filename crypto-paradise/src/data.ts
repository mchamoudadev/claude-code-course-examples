/* Content for the dashboard, mirroring the Figma design. */

export const A = "/assets"; // asset base

export interface NFT {
  name: string;
  user: string;
  img: string;
  avatar: string;
  price: string;
  usd: string;
  time: string;
  views: string;
  left: number; // stage x
}

export const nfts: NFT[] = [
  {
    name: "Jenny Wilson",
    user: "@Jenny Wilson",
    img: `${A}/nft-1.jpg`,
    avatar: `${A}/nft-avatar-1.png`,
    price: "0,25 BTC",
    usd: "$21.533.10",
    time: "5d 16h",
    views: "2.5k",
    left: 459,
  },
  {
    name: "Ronald Richards",
    user: "@Ronald Richards",
    img: `${A}/nft-2.jpg`,
    avatar: `${A}/nft-avatar-2.png`,
    price: "0,76 BTC",
    usd: "$21.533.10",
    time: "5d 16h",
    views: "2.5k",
    left: 720,
  },
  {
    name: "Dianne Russell",
    user: "@Dianne Russell",
    img: `${A}/nft-3.jpg`,
    avatar: `${A}/nft-avatar-3.png`,
    price: "0,16 BTC",
    usd: "$21.533.10",
    time: "5d 16h",
    views: "2.5k",
    left: 981,
  },
  {
    name: "Savannah Nguyen",
    user: "@Savannah Nguyen",
    img: `${A}/nft-4.jpg`,
    avatar: `${A}/nft-avatar-4.png`,
    price: "0,75 BTC",
    usd: "$21.533.10",
    time: "5d 16h",
    views: "2.5k",
    left: 1242,
  },
];

export const wallets = [
  { name: "BitCoin", icon: `${A}/wallet-btc.svg`, top: 644 },
  { name: "Ethereum", icon: `${A}/wallet-eth.svg`, top: 692 },
  { name: "Tether", icon: `${A}/wallet-tether.svg`, top: 740 },
  { name: "USD Coin", icon: `${A}/wallet-usdc.svg`, top: 788 },
];

export interface Txn {
  amount: string;
  usd: string;
  delta: string;
  top: number;
  badge: string;           // icon asset
  tint?: string;           // background circle color for tinted badges
}

export const txns: Txn[] = [
  { amount: "0,25 BTC", usd: "$21.533.10", delta: "- $60", top: 24, badge: `${A}/txn-btc.svg` },
  { amount: "0,17 BTC", usd: "$21.533.10", delta: "-$1260", top: 102, badge: `${A}/txn-eth.svg`, tint: "var(--eth-bg)" },
  { amount: "0,55 BTC", usd: "$21.533.10", delta: "-$2360", top: 180, badge: `${A}/txn-tether.svg`, tint: "var(--tether-bg)" },
  { amount: "0,01 BTC", usd: "$21.533.10", delta: "-$630", top: 258, badge: `${A}/txn-usdc.svg`, tint: "var(--usdc-bg)" },
];

export const inboxAvatars = [
  `${A}/inbox-avatar-1.png`,
  `${A}/inbox-avatar-2.png`,
  `${A}/inbox-avatar-3.png`,
];
