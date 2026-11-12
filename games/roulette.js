window.Roulette = (() => {
  const ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  let bets = [];
  let chip = 25;
  let spinning = false;
  let rotation = 0;
  let history = [];
  let tickTimer = null;
  const timers = [];

  function isRed(n) {
    return REDS.has(n);
  }

  function colorClass(n) {
    if (n === 0) return 'zero';
    return isRed(n) ? 'red' : 'black';
  }

  function keyOf(bet) {
    if (bet.kind === 'straight') return `straight:${bet.n}`;
    if (bet.kind === 'dozen') return `dozen:${bet.d}`;
    if (bet.kind === 'column') return `column:${bet.c}`;
    return bet.kind;
  }

  function labelOf(bet) {
    switch (bet.kind) {
      case 'straight':
        return String(bet.n);
      case 'red':
        return 'Red';
      case 'black':
        return 'Black';
      case 'odd':
        return 'Odd';
      case 'even':
        return 'Even';
      case 'low':
        return '1-18';
      case 'high':
        return '19-36';
      case 'dozen':
        return ['1st 12', '2nd 12', '3rd 12'][bet.d - 1];
      case 'column':
        return `Col ${bet.c}`;
      default:
        return 'Bet';
    }
  }

  function stagedTotal() {
    return bets.reduce((sum, b) => sum + b.amount, 0);
  }

  function buildChips() {
    const wrap = document.getElementById('rouletteChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Selects the ${value}-chip for betting.`;
      btn.addEventListener('click', () => {
        chip = value;
        wrap.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('selected', Number(c.dataset.value) === value);
        });
        Sound.click();
      });
      wrap.appendChild(btn);
    });
  }

  function spot(label, bet, extraClass) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `spot ${extraClass || ''}`;
    el.dataset.betKey = keyOf(bet);
    const odds = bet.kind === 'straight' ? 'Pays 35:1.' : bet.kind === 'dozen' || bet.kind === 'column' ? 'Pays 2:1.' : 'Pays 1:1.';
    el.dataset.tip = `Bets on ${label}. ${odds}`;
    el.innerHTML = `<span class="spot-label">${label}</span><span class="spot-amt"></span>`;
    el.addEventListener('click', () => placeBet(bet));
    return el;
  }

  function buildBoard() {
    const board = document.getElementById('rouletteBoard');
    board.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'number-grid';

    const zero = spot('0', { kind: 'straight', n: 0 }, 'zero');
    zero.style.gridColumn = '1';
    zero.style.gridRow = '1 / span 3';
    grid.appendChild(zero);

    const rows = [
      [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
      [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
      [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
    ];

    rows.forEach((row, r) => {
      row.forEach((n, c) => {
        const s = spot(String(n), { kind: 'straight', n }, colorClass(n));
        s.style.gridColumn = String(c + 2);
        s.style.gridRow = String(r + 1);
        grid.appendChild(s);
      });
    });

    const columnRows = [3, 2, 1];
    columnRows.forEach((col, r) => {
      const s = spot('2:1', { kind: 'column', c: col }, 'outside');
      s.style.gridColumn = '14';
      s.style.gridRow = String(r + 1);
      grid.appendChild(s);
    });

    board.appendChild(grid);

    const outside = document.createElement('div');
    outside.className = 'outside-row';
    [
      ['1st 12', { kind: 'dozen', d: 1 }],
      ['2nd 12', { kind: 'dozen', d: 2 }],
      ['3rd 12', { kind: 'dozen', d: 3 }],
      ['1-18', { kind: 'low' }],
      ['EVEN', { kind: 'even' }],
      ['RED', { kind: 'red' }, 'red'],
      ['BLACK', { kind: 'black' }, 'black'],
      ['ODD', { kind: 'odd' }],
      ['19-36', { kind: 'high' }]
    ].forEach(([label, bet, cls]) => {
      outside.appendChild(spot(label, bet, `outside ${cls || ''}`));
    });
    board.appendChild(outside);
  }

  function placeBet(bet) {
    if (spinning) return;
    if (stagedTotal() + chip > Wallet.get()) {
      flashResult('Not enough chips for that bet.', 'lose');
      return;
    }
    bets.push({ ...bet, amount: chip });
    Sound.chip();
    renderBets();
  }

  function renderBets() {
    const board = document.getElementById('rouletteBoard');
    const totals = {};
    bets.forEach((b) => {
      const k = keyOf(b);
      totals[k] = (totals[k] || 0) + b.amount;
    });

    board.querySelectorAll('.spot').forEach((el) => {
      const amount = totals[el.dataset.betKey] || 0;
      const badge = el.querySelector('.spot-amt');
      badge.textContent = amount;
      badge.classList.toggle('show', amount > 0);
    });

    const total = stagedTotal();
    document.getElementById('rouletteRisk').textContent = App.format(total);
    document.getElementById('spinBtn').disabled = spinning || total === 0;

    if (window.App && App.setSideLive) {
      App.setSideLive(`Chip: <b>${chip}</b><br>At risk: <b>${App.format(total)}</b>`);
    }

    const list = document.getElementById('rouletteBets');
    if (!bets.length) {
      list.textContent = 'No chips placed.';
      return;
    }
    const grouped = {};
    bets.forEach((b) => {
      const k = keyOf(b);
      grouped[k] = grouped[k] || { label: labelOf(b), amount: 0 };
      grouped[k].amount += b.amount;
    });
    list.innerHTML = Object.values(grouped)
      .map((g) => `<span class="bet-pill">${g.label} &middot; ${g.amount}</span>`)
      .join('');
  }

  function flashResult(text, cls) {
    const el = document.getElementById('rouletteResult');
    el.innerHTML = `<span class="${cls}">${text}</span>`;
  }

  function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R = 210;
    const seg = (Math.PI * 2) / ORDER.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rim = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    rim.addColorStop(0, '#f7d774');
    rim.addColorStop(0.35, '#8a6c22');
    rim.addColorStop(0.6, '#f7d774');
    rim.addColorStop(1, '#5c470f');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();

    ORDER.forEach((n, i) => {
      const a0 = i * seg - seg / 2;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R - 16, a0, a1);
      ctx.closePath();
      if (n === 0) ctx.fillStyle = '#1f9d55';
      else if (isRed(n)) ctx.fillStyle = '#c02636';
      else ctx.fillStyle = '#151019';
      ctx.fill();
      ctx.strokeStyle = 'rgba(247, 215, 116, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * seg);
      ctx.fillStyle = '#fdf6e3';
      ctx.font = 'bold 15px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), R - 34, 0);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.fillStyle = '#0d0818';
    ctx.fill();
    ctx.strokeStyle = 'rgba(247, 215, 116, 0.55)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  function tickSound() {
    let delay = 0;
    const total = 5000;
    tickTimer = setInterval(() => {
      Sound.tick();
      delay += 100;
      if (delay > total && tickTimer) {
        clearInterval(tickTimer);
        tickTimer = null;
      }
    }, 100);
  }

  function spin() {
    if (spinning) return;
    const total = stagedTotal();
    if (total === 0) return;
    if (!Wallet.bet(total)) return;

    spinning = true;
    Sound.spinStart();
    tickSound();
    renderBets();
    flashResult('');

    const number = Math.floor(Math.random() * 37);
    const index = ORDER.indexOf(number);
    const seg = 360 / 37;
    const desired = ((270 - index * seg) % 360 + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = ((desired - currentMod) % 360 + 360) % 360;
    rotation += 360 * 6 + delta;

    const canvas = document.getElementById('wheelCanvas');
    canvas.style.transition = 'transform 5.2s cubic-bezier(0.12, 0.82, 0.16, 1)';
    canvas.style.transform = `rotate(${rotation}deg)`;

    const timer = setTimeout(() => resolve(number, total), 5300);
    timers.push(timer);
  }

  function resolve(number, total) {
    let ret = 0;
    bets.forEach((b) => {
      if (winsOn(b, number)) ret += b.amount * multiplier(b);
    });

    Wallet.add(ret);
    history.unshift(number);
    history = history.slice(0, 10);
    renderHistory();

    const chipEl = `<span class="result-chip" style="background:${number === 0 ? '#1f9d55' : isRed(number) ? '#c02636' : '#151019'};color:#fff">${number}</span>`;
    let text;
    if (ret > total) text = `<span class="win">You won ${App.format(ret - total)}!</span>`;
    else if (ret === total) text = `<span class="win">Even money &mdash; bet returned.</span>`;
    else if (ret > 0) text = `<span class="lose">Partial hit &mdash; net ${App.format(total - ret)} lost.</span>`;
    else text = `<span class="lose">Lost ${App.format(total)}.</span>`;

    document.getElementById('rouletteResult').innerHTML = chipEl + text;
    if (ret > total || ret === total) Sound.win();
    else Sound.lose();

    bets = [];
    spinning = false;
    renderBets();
  }

  function winsOn(bet, n) {
    switch (bet.kind) {
      case 'straight':
        return n === bet.n;
      case 'red':
        return n !== 0 && isRed(n);
      case 'black':
        return n !== 0 && !isRed(n);
      case 'odd':
        return n !== 0 && n % 2 === 1;
      case 'even':
        return n !== 0 && n % 2 === 0;
      case 'low':
        return n >= 1 && n <= 18;
      case 'high':
        return n >= 19 && n <= 36;
      case 'dozen':
        return n !== 0 && Math.floor((n - 1) / 12) + 1 === bet.d;
      case 'column':
        return n !== 0 && ((n - 1) % 3) + 1 === bet.c;
      default:
        return false;
    }
  }

  function multiplier(bet) {
    if (bet.kind === 'straight') return 36;
    if (bet.kind === 'dozen' || bet.kind === 'column') return 3;
    return 2;
  }

  function renderHistory() {
    const wrap = document.getElementById('rouletteHistory');
    wrap.innerHTML = history
      .map((n) => {
        const cls = n === 0 ? 'green' : isRed(n) ? 'red' : 'black';
        return `<span class="${cls}">${n}</span>`;
      })
      .join('');
  }

  function undo() {
    if (spinning || !bets.length) return;
    bets.pop();
    Sound.click();
    renderBets();
  }

  function clear() {
    if (spinning || !bets.length) return;
    bets = [];
    Sound.click();
    renderBets();
  }

  function init() {
    buildChips();
    buildBoard();
    drawWheel();
    renderHistory();
    document.getElementById('spinBtn').addEventListener('click', spin);
    document.getElementById('undoBet').addEventListener('click', undo);
    document.getElementById('clearBets').addEventListener('click', clear);
    renderBets();
  }

  function show() {
    renderBets();
  }

  function hide() {
    if (!spinning) {
      bets = [];
      renderBets();
    }
  }

  return { init, show, hide };
})();
