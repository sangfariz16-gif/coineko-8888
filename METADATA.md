# CoinEko 8,888 — Metadata

- Collection: Maneki Neko Coin — 8,888 edition
- Chain: BNB Chain (BSC), BEP-721 (contracts not yet deployed — preview only)
- Supply: 8,888 tokens, sequential IDs 1–8888
- Planned base URI (preview): `https://coineko-8888.vercel.app/metadata/`
- Launch base URI: `https://coineko.fun/metadata/` (coineko.fun switches to this
  edition at launch; old 1,111 page moves to Vercel only)
- Files: `metadata/1` … `metadata/8888` (extensionless JSON), generated locally
  by `gen_metadata.py`. Re-running it regenerates identical files.
- Images: all tokens in a tier share that tier's cropped artwork
  (`https://coineko-8888.vercel.app/assets/<tier>.jpg`), cropped from the
  user's 5-tier grid upload. No variant images were supplied; traits are
  descriptive only and do not change the artwork. Do not invent variants.
- Traits: Tier / Coin / Charm (招財寶) / Motto / Edition
- Name format: `Maneki Neko Coin #<id>`

## Rarity distribution (sums to 8,888)

| Tier | ID range | Count | Coin |
|------|----------|-------|------|
| Common | 1–4444 | 4,444 | Silver |
| Uncommon | 4445–6666 | 2,222 | Jade Green |
| Rare | 6667–7999 | 1,333 | Sapphire Blue |
| Epic | 8000–8665 | 666 | Amethyst Purple |
| Legendary | 8666–8888 | 223 | Gold |
| **Total** | | **8,888** | |

Verified locally: file count 8,888; per-tier counts match the ranges above;
samples 1, 4444, 4445, 6666, 6667, 7999, 8000, 8665, 8666, 8888 checked
(valid JSON, correct name, image URL, and traits).

## Preview hosting

The preview Vercel deployment carries only the 10 boundary sample files
(`metadata/1, 4444, 4445, 6666, 6667, 7999, 8000, 8665, 8666, 8888`) — the
file-upload route cannot carry 8,888 files inline. The full set is generated
locally and goes live with the launch deployment via the git route (repo to be
created; binary images must be uploaded to the repo via the GitHub web UI,
as with HATCHIEggy's hero.jpg — the connector cannot push binaries).

## Spec (preview — no contract deployed yet)

- First mint free, then 0.001 BNB, max 10/wallet, agent-only mint,
  +120,000 MNC per paid mint. NFT name Maneki Neko Coin, symbol MNC.
  Token coineko (MNC): total 2B, pool 1.08B, treasury 920M.
- Official X: https://x.com/coineko_
- Preview domain: https://coineko-8888.vercel.app/
- Old CoinEko (1,111, contract 0xc0C15426Edc77128d928E1aaF44a5F885071BB9A)
  is a separate collection — do not touch it.
