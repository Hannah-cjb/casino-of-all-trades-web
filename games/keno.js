window.Keno = (() => {
  const PAYTABLE = [
    [10, 100],
    [9, 20],
    [8, 8],
    [7, 3],
    [6, 1],
    [5, 0.5],
    [0, 2]
  ];

  let chip = 25;
  let picks = new Set();
  let drawn = [];
  let matches = 0;
  let phase = 'pick';
  let drawing = false;
  let forced = null;
  const timers = [];

  function setMessage(text, cls) {
    const el = document.getElementById('kenoMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('kenoChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets the Keno ticket price to ${value} chips.`;
      btn.addEventListener('click', () => {
        if (drawing) return;
        chip = value;
        wrap.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('selected', Number(c.dataset.value) === value);
        });
        Sound.click();
        render();
      });
      wrap.appendChild(btn);
    });
  }

  function buildGrid() {
    const grid = document.getElementById('kenoGrid');
    grid.innerHTML = '';
    for (let n = 1; n <= 80; n++) {
      const btn = document.createElement('button');
      btn.className = 'keno-num';
      btn.textContent = n;
      btn.dataset.num = n;
      btn.addEventListener('click', () => toggle(n));
      grid.appendChild(btn);
    }
  }

  function toggle(n) {
    if (drawing || phase !== 'pick') return;
    if (picks.has(n)) {
      picks.delete(n);
    } else {
      if (picks.size >= 10) {
        setMessage('Ten spots max. Deselect one first.', 'lose');
        Sound.lose();
        return;
      }
      picks.add(n);
    }
    Sound.chip();
    render();
  }

  function renderGrid() {
    document.querySelectorAll('#kenoGrid .keno-num').forEach((btn) => {
      const n = Number(btn.dataset.num);
      btn.classList.toggle('selected', picks.has(n));
      btn.classList.toggle('drawn', drawn.includes(n));
      btn.classList.toggle('match', drawn.includes(n) && picks.has(n));
      btn.style.pointerEvents = drawing || phase !== 'pick' ? 'none' : 'auto';
    });
  }

  function renderDraws() {
    document.getElementById('kenoDraws').innerHTML = drawn
      .map((n) => `<span class="${picks.has(n) ? 'hit' : ''}">${n}</span>`)
      .join('');
  }

  function renderPaytable() {
    document.getElementById('kenoPaytable').innerHTML = [
      [10, 100],
      [9, 20],
      [8, 8],
      [7, 3],
      [6, 1],
      [5, 0.5],
      [0, 2]
    ]
      .map(([hits, mult]) => `<div class="pt-row"><span class="pt-sym">${hits} catches</span><span class="pt-mult">${mult}&times;</span></div>`)
      .join('');
  }

  function render() {
    document.getElementById('kenoBet').textContent = App.format(chip);
    renderGrid();
    renderDraws();
    document.getElementById('kenoDraw').disabled = drawing || phase !== 'pick' || picks.size !== 10 || chip > Wallet.get();
    document.getElementById('kenoClear').disabled = drawing;

    document.querySelectorAll('#kenoChips .chip').forEach((c) => {
      c.style.opacity = drawing ? '0.4' : '1';
      c.style.pointerEvents = drawing ? 'none' : 'auto';
    });

    if (window.App && App.setSideLive) {
      App.setSideLive(`Picked: <b>${picks.size}/10</b> \u00b7 Bet: <b>${App.format(chip)}</b>`);
    }
  }

  function finish() {
    matches = drawn.filter((n) => picks.has(n)).length;
    const row = PAYTABLE.find(([hits]) => hits === matches);
    const mult = row ? row[1] : 0;
    const ret = Math.round(chip * mult);
    if (ret > 0) Wallet.add(ret);
    drawing = false;
    phase = 'done';
    if (ret > chip) {
      setMessage(`${matches} catches! Paid ${App.format(ret)} (+${App.format(ret - chip)}).`, 'win');
      Sound.win();
    } else if (ret > 0) {
      setMessage(`${matches} catches. Returned ${App.format(ret)}.`, 'push');
      Sound.click();
    } else {
      setMessage(`${matches} catches. No win.`, 'lose');
      Sound.lose();
    }
    render();
  }

  function draw() {
    if (drawing || phase !== 'pick' || picks.size !== 10) return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips for that ticket.', 'lose');
      return;
    }
    const pool = forced ? [...forced] : Cards.shuffle(Array.from({ length: 80 }, (_, i) => i + 1)).slice(0, 20);
    forced = null;
    drawn = [];
    matches = 0;
    drawing = true;
    phase = 'drawing';
    setMessage('Drawing 20 numbers...');
    Sound.spinStart();
    render();

    pool.forEach((n, i) => {
      timers.push(setTimeout(() => {
        drawn.push(n);
        Sound.tick();
        renderDraws();
        renderGrid();
      }, 90 * (i + 1)));
    });

    timers.push(setTimeout(finish, 90 * 20 + 500));
  }

  function clear() {
    if (drawing) return;
    picks = new Set();
    drawn = [];
    matches = 0;
    phase = 'pick';
    setMessage('Pick 10 numbers, then draw.');
    Sound.click();
    render();
  }

  function init() {
    buildChips();
    buildGrid();
    renderPaytable();
    document.getElementById('kenoDraw').addEventListener('click', draw);
    document.getElementById('kenoClear').addEventListener('click', clear);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    timers.splice(0).forEach((id) => clearTimeout(id));
    drawing = false;
    if (phase === 'drawing' || phase === 'done') {
      phase = 'pick';
      drawn = [];
      picks = new Set();
      matches = 0;
    }
    forced = null;
  }

  function _testSetDraw(numbers) {
    if (location.hash === '#test') forced = numbers;
  }

  const api = { init, show, hide };
  if (location.hash === '#test') api._test = { setDraw: _testSetDraw };
  return api;
})();
