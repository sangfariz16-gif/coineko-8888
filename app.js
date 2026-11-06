// CoinEko 8,888 — LIVE page script (live-ready build).
// Live stats from the NFT contract via public BSC RPC (no wallet needed for
// reads), wallet-connect mint (Binance Agentic Wallet / MetaMask / any injected
// wallet), exact priceFor quote before sending, and coineko (MNC) claim.
// Reads go through public RPC endpoints with fallbacks; writes go through
// the connected wallet on BNB Chain (56). Never presents a failed read as a
// verified zero.
(function () {
  // PREDICTED — ganti dengan alamat asli setelah deploy bila berbeda.
  // CREATE2 deterministic proxy, salt 0 (same route as HATCHIEggy/Archon).
  var NFT = '0x128eAC869659E263d8483f70245467E2501FF4e1'; // Maneki Neko Coin NFT (MNC), BEP-721
  var TOKEN = '0xCa2d2797FDBE84FC3347c2F95Cc28650726c17E4'; // coineko bonus token (MNC), BEP-20
  var METADATA_BASE = 'https://coineko.fun/metadata/';
  var SITE_URL = 'https://coineko.fun/';
  var MAX_SUPPLY = 8888;
  var MAX_QTY = 10;
  var BSC_CHAIN_ID = '0x38'; // 56

  var RPCS = [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://rpc.ankr.com/bsc'
  ];

  // Function selectors — verified against contracts/CoinEko8888.sol and
  // contracts/CoinEkoToken.sol with ethers.id():
  var SEL_TOTAL_MINTED = '0xa2309ff8'; // totalMinted()
  var SEL_MINT_OPEN = '0x24bbd049';    // mintOpen()
  var SEL_CURRENT_PRICE = '0x9d1b464a'; // currentPrice()
  var SEL_NEXT_PRICE = '0xe27da0fa';   // nextPrice(address)
  var SEL_PRICE_FOR = '0xd527979a';    // priceFor(address,uint256)
  var SEL_MINT_0 = '0x1249c58b';       // mint()
  var SEL_MINT_QTY = '0xa0712d68';     // mint(uint256)
  var SEL_CLAIMABLE = '0x402914f5';    // claimable(address) on coineko token
  var SEL_CLAIM = '0x4e71d92d';        // claim() on coineko token
  var SEL_BALANCE_OF = '0x70a08231';   // balanceOf(address)

  var qty = 1;
  var wallet = null; // connected address, checksummed as returned by wallet
  var exactPriceWei = null; // BigInt priceFor(wallet, qty), null until read

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function padAddress(addr) {
    return '0x' + '000000000000000000000000' + addr.slice(2).toLowerCase();
  }
  function padUint(n) {
    var h = BigInt(n).toString(16);
    return '0x' + '0'.repeat(64 - h.length) + h;
  }
  function parseUintHex(hex) {
    try { return BigInt(hex); } catch (e) { return null; }
  }
  function fmtBnb(wei) {
    if (wei === null || wei === undefined) return 'unavailable';
    var whole = wei / 1000000000000000000n;
    var frac = wei % 1000000000000000000n;
    if (frac === 0n) return whole.toString() + ' BNB';
    var f = frac.toString().padStart(18, '0').replace(/0+$/, '').slice(0, 4);
    return whole.toString() + '.' + f + ' BNB';
  }
  function fmtMnc(wei) {
    if (wei === null || wei === undefined) return 'unavailable';
    var whole = wei / 1000000000000000000n;
    return Number(whole).toLocaleString('en-US') + ' MNC';
  }
  function shortAddr(a) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : ''; }

  function rpcCall(rpc, to, data) {
    return fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.result) throw new Error('no result');
      return j.result;
    });
  }
  function callWithFallback(to, data) {
    var chain = Promise.reject();
    RPCS.forEach(function (rpc) {
      chain = chain.catch(function () { return rpcCall(rpc, to, data); });
    });
    return chain;
  }

  // ---- Live stats (public reads, no wallet) ----
  function refreshStats() {
    var mintedEl = $('mintedCount'), statusEl = $('mintStatus'), priceEl = $('priceNow');
    callWithFallback(NFT, SEL_TOTAL_MINTED).then(function (hex) {
      var n = parseUintHex(hex);
      if (mintedEl) mintedEl.textContent = (n === null) ? 'unavailable' : (Number(n).toLocaleString('en-US') + ' / ' + MAX_SUPPLY.toLocaleString('en-US'));
    }).catch(function () { if (mintedEl) mintedEl.textContent = 'unavailable'; });
    callWithFallback(NFT, SEL_MINT_OPEN).then(function (hex) {
      var open = parseUintHex(hex) === 1n;
      if (statusEl) statusEl.textContent = open ? 'Open' : 'Closed';
    }).catch(function () { if (statusEl) statusEl.textContent = 'unavailable'; });
    callWithFallback(NFT, SEL_CURRENT_PRICE).then(function (hex) {
      var wei = parseUintHex(hex);
      if (priceEl) priceEl.textContent = fmtBnb(wei);
    }).catch(function () { /* keep the static 0.001 BNB fallback text */ });
  }

  // ---- Quantity + exact price ----
  function estimateTotalWei(q) {
    // Before connect: assume the free first mint is still unused.
    return BigInt(Math.max(0, q - 1)) * 1000000000000000n; // 0.001 BNB each
  }
  function renderQty() {
    var qEl = $('qtyVal'), nEl = $('qtyNote');
    if (qEl) qEl.textContent = String(qty);
    if (nEl) nEl.textContent = qty === 1
      ? 'for a wallet whose first mint is still free (free)'
      : 'for a wallet whose first mint is still free (1 free + ' + (qty - 1) + ' paid)';
    refreshExactPrice();
  }
  function refreshExactPrice() {
    var tEl = $('qtyTotal'), mintBtn = $('mintBtn');
    if (!tEl) return;
    if (!wallet) {
      exactPriceWei = null;
      tEl.textContent = 'connect your wallet for the exact price (' + fmtBnb(estimateTotalWei(qty)) + ' if your free mint is still unused)';
      if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = 'Connect wallet to mint'; }
      return;
    }
    var data = SEL_PRICE_FOR + padAddress(wallet).slice(2) + padUint(qty).slice(2);
    callWithFallback(NFT, data).then(function (hex) {
      var wei = parseUintHex(hex);
      exactPriceWei = wei;
      tEl.textContent = fmtBnb(wei) + ' (exact, from priceFor)';
      if (mintBtn) { mintBtn.disabled = false; mintBtn.textContent = 'Mint ' + qty + ' — ' + fmtBnb(wei); }
    }).catch(function () {
      exactPriceWei = null;
      tEl.textContent = fmtBnb(estimateTotalWei(qty)) + ' (estimate — live quote unavailable, retrying)';
      if (mintBtn) { mintBtn.disabled = true; mintBtn.textContent = 'Price quote unavailable — retry'; }
    });
  }

  var minus = $('qtyMinus'), plus = $('qtyPlus');
  if (minus) minus.addEventListener('click', function () { if (qty > 1) { qty -= 1; renderQty(); } });
  if (plus) plus.addEventListener('click', function () { if (qty < MAX_QTY) { qty += 1; renderQty(); } });
  renderQty();

  // ---- Wallet connect + mint ----
  function ensureBsc() {
    if (!window.ethereum) return Promise.reject(new Error('No injected wallet found.'));
    return window.ethereum.request({ method: 'eth_chainId' }).then(function (id) {
      if (id === BSC_CHAIN_ID) return;
      return window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BSC_CHAIN_ID }] })
        .catch(function (err) {
          if (err && err.code === 4902) {
            return window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: BSC_CHAIN_ID, chainName: 'BNB Smart Chain', nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorerUrls: ['https://bscscan.com'] }]
            });
          }
          throw err;
        });
    });
  }

  function connectWallet() {
    var st = $('walletStatus'), btn = $('connectBtn');
    if (!window.ethereum) {
      if (st) st.textContent = 'No wallet found. Open this page in Binance Agentic Wallet, MetaMask, or another BNB Chain wallet browser.';
      return;
    }
    if (st) st.textContent = 'Connecting…';
    ensureBsc().then(function () {
      return window.ethereum.request({ method: 'eth_requestAccounts' });
    }).then(function (accounts) {
      if (!accounts || !accounts.length) throw new Error('No account returned.');
      wallet = accounts[0];
      if (st) st.textContent = 'Connected: ' + shortAddr(wallet) + ' (BNB Chain)';
      if (btn) btn.textContent = 'Connected: ' + shortAddr(wallet);
      refreshExactPrice();
      refreshClaim();
    }).catch(function (err) {
      if (st) st.textContent = 'Connect failed: ' + (err && err.message ? err.message : 'wallet rejected the request.');
    });
  }
  var connectBtn = $('connectBtn');
  if (connectBtn) connectBtn.addEventListener('click', connectWallet);
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
      wallet = (accounts && accounts.length) ? accounts[0] : null;
      var st = $('walletStatus'), btn = $('connectBtn');
      if (wallet) {
        if (st) st.textContent = 'Connected: ' + shortAddr(wallet) + ' (BNB Chain)';
        if (btn) btn.textContent = 'Connected: ' + shortAddr(wallet);
      } else {
        if (st) st.textContent = 'Not connected.';
        if (btn) btn.textContent = 'Connect wallet';
      }
      refreshExactPrice();
      refreshClaim();
    });
  }

  function mintNow() {
    var out = $('mintStatus2'), mintBtn = $('mintBtn');
    if (!wallet) { if (out) out.textContent = 'Connect your wallet first.'; return; }
    if (out) out.textContent = 'Quoting exact price from the contract…';
    if (mintBtn) mintBtn.disabled = true;
    var data = SEL_PRICE_FOR + padAddress(wallet).slice(2) + padUint(qty).slice(2);
    callWithFallback(NFT, data).then(function (hex) {
      var wei = parseUintHex(hex);
      if (wei === null) throw new Error('priceFor returned nothing');
      exactPriceWei = wei;
      var callData = (qty === 1) ? SEL_MINT_0 : (SEL_MINT_QTY + padUint(qty).slice(2));
      if (out) out.textContent = 'Sending mint(' + (qty === 1 ? '' : qty) + ') for ' + fmtBnb(wei) + ' — confirm in your wallet…';
      return window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet, to: NFT, value: '0x' + wei.toString(16), data: callData }]
      });
    }).then(function (txHash) {
      if (out) out.innerHTML = 'Mint sent! Tx: <a href="https://bscscan.com/tx/' + esc(txHash) + '" target="_blank" rel="noopener">' + esc(txHash) + '</a> — wait for confirmation, then check your new token IDs on BscScan.';
      refreshStats();
      setTimeout(refreshStats, 15000);
      setTimeout(refreshExactPrice, 15000);
      setTimeout(refreshClaim, 15000);
    }).catch(function (err) {
      if (out) out.textContent = 'Mint failed: ' + (err && err.message ? err.message : 'transaction rejected.');
    }).then(function () {
      if (mintBtn) mintBtn.disabled = false;
      renderQty();
    });
  }
  var mintBtn = $('mintBtn');
  if (mintBtn) mintBtn.addEventListener('click', mintNow);

  // ---- coineko (MNC) claim ----
  function refreshClaim() {
    var cEl = $('claimableAmt'), bEl = $('mncBal'), claimBtn = $('claimBtn');
    if (!wallet) {
      if (cEl) cEl.textContent = 'connect your wallet';
      if (bEl) bEl.textContent = '—';
      if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = 'Connect wallet to claim'; }
      return;
    }
    callWithFallback(TOKEN, SEL_CLAIMABLE + padAddress(wallet).slice(2)).then(function (hex) {
      var amt = parseUintHex(hex);
      if (cEl) cEl.textContent = fmtMnc(amt);
      if (claimBtn) {
        var has = amt !== null && amt > 0n;
        claimBtn.disabled = !has;
        claimBtn.textContent = has ? ('Claim ' + fmtMnc(amt)) : 'Nothing to claim yet';
      }
    }).catch(function () { if (cEl) cEl.textContent = 'unavailable'; });
    callWithFallback(TOKEN, SEL_BALANCE_OF + padAddress(wallet).slice(2)).then(function (hex) {
      if (bEl) bEl.textContent = fmtMnc(parseUintHex(hex));
    }).catch(function () { if (bEl) bEl.textContent = 'unavailable'; });
  }
  function claimNow() {
    var out = $('claimStatus'), claimBtn = $('claimBtn');
    if (!wallet) { if (out) out.textContent = 'Connect your wallet first.'; return; }
    if (out) out.textContent = 'Sending claim() — confirm in your wallet…';
    if (claimBtn) claimBtn.disabled = true;
    ensureBsc().then(function () {
      return window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet, to: TOKEN, value: '0x0', data: SEL_CLAIM }]
      });
    }).then(function (txHash) {
      if (out) out.innerHTML = 'Claim sent! Tx: <a href="https://bscscan.com/tx/' + esc(txHash) + '" target="_blank" rel="noopener">' + esc(txHash) + '</a>';
      setTimeout(refreshClaim, 15000);
    }).catch(function (err) {
      if (out) out.textContent = 'Claim failed: ' + (err && err.message ? err.message : 'transaction rejected.');
    }).then(function () { refreshClaim(); });
  }
  var claimBtn = $('claimBtn');
  if (claimBtn) claimBtn.addEventListener('click', claimNow);
  var refreshClaimBtn = $('refreshClaimBtn');
  if (refreshClaimBtn) refreshClaimBtn.addEventListener('click', refreshClaim);

  // ---- Copy agent prompt ----
  function copyText(text, statusEl) {
    function done(ok) {
      if (statusEl) statusEl.textContent = ok ? 'Copied.' : 'Copy failed — select the text manually.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  }
  var promptText = '';
  var promptEl = $('agentPrompt');
  if (promptEl) promptText = promptEl.textContent;
  var c1 = $('copyPromptBtn'), c2 = $('copyPromptBtn2');
  if (c1) c1.addEventListener('click', function () { copyText(promptText, $('copyStatus')); });
  if (c2) c2.addEventListener('click', function () { copyText(promptText, $('copyStatus2')); });

  // ---- Share link: live page on coineko.fun ----
  var share = $('shareBtn');
  if (share) {
    var text = 'Maneki Neko Coin — 8,888 lucky cats on BNB Chain. MINT IS LIVE: first mint FREE, then 0.001 BNB, max 10/wallet. +120,000 MNC per paid mint. ' + SITE_URL + ' @coineko_ #CoinEko #MNC #BNBChain';
    share.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(text);
  }

  // ---- Token checker: live metadata from coineko.fun (all 8,888 IDs) ----
  function tierName(id) {
    if (id <= 4444) return 'Common';
    if (id <= 6666) return 'Uncommon';
    if (id <= 7999) return 'Rare';
    if (id <= 8665) return 'Epic';
    return 'Legendary';
  }
  var btn = $('checkerBtn'), out = $('checkerOut'), input = $('checkerId');
  function check() {
    if (!out || !input) return;
    var id = parseInt(input.value, 10);
    if (isNaN(id) || id < 1 || id > 8888) {
      out.innerHTML = 'Enter an ID from 1 to 8,888.';
      return;
    }
    out.textContent = 'Loading…';
    fetch(METADATA_BASE + id).then(function (r) {
      if (!r.ok) throw new Error('metadata not served (HTTP ' + r.status + ')');
      return r.json();
    }).then(function (m) {
      var tier = tierName(id);
      var attrs = (m.attributes || []).map(function (a) { return esc(a.trait_type) + ': ' + esc(a.value); }).join(' · ');
      out.innerHTML = '<b>' + esc(m.name) + '</b> — ' + esc(tier) + '<br>' + esc(attrs) +
        (m.image ? '<br><img src="' + esc(m.image) + '" alt="' + esc(m.name) + '">' : '');
    }).catch(function (err) {
      out.innerHTML = 'ID ' + id + ' (' + tierName(id) + ') metadata is not reachable right now. ' +
        'All 8,888 files are live at ' + esc(METADATA_BASE) + ' — ' + esc(err && err.message ? err.message : 'check the launch hosting and try again.');
    });
  }
  if (btn) btn.addEventListener('click', check);
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });

  refreshStats();
  setInterval(refreshStats, 30000);
})();
