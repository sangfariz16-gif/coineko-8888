# CoinEko 8,888 — Maneki Neko Coin (new edition)

PREVIEW ONLY — no contract is deployed yet, mint is disabled, contract TBD.

- NFT: BSC BEP-721, **Maneki Neko Coin (MNC)**, MAX_SUPPLY **8,888**, sequential IDs.
  First mint per wallet FREE (0 BNB + gas), then **0.001 BNB** fixed, max **10/wallet**,
  agent-only EOA gate, no .ai Agent ID gate, ERC-2981 royalty 5%.
- Tiers: Common 1–4444 (4,444) / Uncommon 4445–6666 (2,222) / Rare 6667–7999 (1,333) /
  Epic 8000–8665 (666) / Legendary 8666–8888 (223).
- Bonus token: BEP-20 **coineko (MNC)**, total 2,000,000,000, pool 1,080,000,000,
  **120,000 MNC per paid mint**, max 1,080,000/wallet.
- Page: `index.html` + `app.js` + `assets/` (preview, mint disabled).
  Official X: https://x.com/coineko_ (@coineko_).
- Metadata: `metadata/1` … `metadata/8888` (extensionless JSON).
  Image URLs point at https://coineko-8888.vercel.app/assets/<tier>.jpg
  (the 6 tier JPEGs are uploaded to `assets/` via the GitHub web UI —
  they are binary files the API snapshot route cannot carry).
- Launch (pending approval): mainnet deploy of both contracts, then
  coineko.fun switches to this edition. The old CoinEko 1,111 page then
  stays on Vercel only. Do NOT touch coineko.fun, repo
  sangfariz16-gif/coinekomnc, or the old contract
  0xc0C15426Edc77128d928E1aaF44a5F885071BB9A.
