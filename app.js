// CoinEko 8,888 — PREVIEW page script.
// No contract is deployed yet, so there are NO on-chain reads here.
// Prices and supply are the PLANNED spec only. Mint is disabled.
// Quantity calculator (planned price math), agent-prompt copy, token
// checker (fetches sample metadata from this preview host), share link.
(function () {
  var PRICE_BNB = 0.001; // planned paid price
  var MAX_QTY = 10;
  var qty = 1;

  function $(id) { return document.getElementById(id); }

  function plannedTotal(q, freeUnused) {
    var paid = freeUnused ? Math.max(0, q - 1) : q;
    return (paid * PRICE_BNB).toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0');
  }

  function renderQty() {
    var qEl = $('qtyVal'), tEl = $('qtyTotal'), nEl = $('qtyNote');
    if (qEl) qEl.textContent = String(qty);
    if (tEl) tEl.textContent = plannedTotal(qty, true) + ' BNB';
    if (nEl) nEl.textContent = qty === 1
      ? 'for a wallet whose first mint is still free (free)'
      : 'for a wallet whose first mint is still free (1 free + ' + (qty - 1) + ' paid)';
  }

  var minus = $('qtyMinus'), plus = $('qtyPlus');
  if (minus) minus.addEventListener('click', function () { if (qty > 1) { qty -= 1; renderQty(); } });
  if (plus) plus.addEventListener('click', function () { if (qty < MAX_QTY) { qty += 1; renderQty(); } });
  renderQty();

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

  // Share link: prefilled with the planned preview spec, pointing at this host.
  var share = $('shareBtn');
  if (share) {
    var text = 'Maneki Neko Coin — 8,888 lucky cats on BNB Chain. First mint FREE, then 0.001 BNB, max 10/wallet. +120,000 MNC per paid mint. Preview: ' + window.location.origin + ' @coineko_ #CoinEko #MNC #BNBChain';
    share.href = 'https://x.com/intent/tweet?text=' + encodeURIComponent(text);
  }

  // Token checker: fetches metadata/<id> from this preview host.
  var SAMPLES = [1, 4444, 4445, 6666, 6667, 7999, 8000, 8665, 8666, 8888];
  function tierName(id) {
    if (id <= 4444) return 'Common';
    if (id <= 6666) return 'Uncommon';
    if (id <= 7999) return 'Rare';
    if (id <= 8665) return 'Epic';
    return 'Legendary';
  }
  var btn = $('checkerBtn'), out = $('checkerOut'), input = $('checkerId');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function check() {
    if (!out || !input) return;
    var id = parseInt(input.value, 10);
    if (isNaN(id) || id < 1 || id > 8888) {
      out.innerHTML = 'Enter an ID from 1 to 8,888.';
      return;
    }
    out.textContent = 'Loading…';
    fetch('metadata/' + id).then(function (r) {
      if (!r.ok) throw new Error('not served in preview');
      return r.json();
    }).then(function (m) {
      var tier = tierName(id);
      var attrs = (m.attributes || []).map(function (a) { return esc(a.trait_type) + ': ' + esc(a.value); }).join(' · ');
      out.innerHTML = '<b>' + esc(m.name) + '</b> — ' + esc(tier) + '<br>' + esc(attrs) +
        (m.image ? '<br><img src="' + esc(m.image) + '" alt="' + esc(m.name) + '">' : '');
    }).catch(function () {
      out.innerHTML = 'ID ' + id + ' (' + tierName(id) + ') is not served in this preview. ' +
        'Sample metadata is live for IDs ' + SAMPLES.join(', ') + '. The full 8,888 files go live at launch.';
    });
  }
  if (btn) btn.addEventListener('click', check);
  if (input) input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
})();
