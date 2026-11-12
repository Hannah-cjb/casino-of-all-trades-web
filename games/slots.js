window.Slots = (() => {
  const SYMBOLS = [
    { ch: '7', name: 'Seven', mult: 150, weight: 3, cls: 'red' },
    { ch: '\u25c6', name: 'Diamond', mult: 80, weight: 5, cls: 'gold' },
    { ch: '\u2605', name: 'Star', mult: 40, weight: 7, cls: 'gold' },
    { ch: '\u2660', name: 'Spade', mult: 25, weight: 9, cls: '' },
    { ch: '\u2665', name: 'Heart', mult: 18, weight: 11, cls: 'red' },
    { ch: '\u2663', name: 'Club', mult: 12, weight: 13, cls: '' }
  ];
  const TOTAL = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

  let chip = 25;
  let spinning = false;
  let tickTimer = null;
  let stopped = [false, false, false];
  const timers = [];

  function pick() {
    let roll = Math.random() * TOTAL;
    for (const symbol of SYMBOLS) {
      roll -= symbol.weight;
      if (roll <= 0) return symbol;
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function setMessage(text, cls) {
    const el = document.getElementById('slotsMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function showSymbol(el, symbol, isSpinning) {
    el.textContent = symbol.ch;
    el.className = 'reel' + (isSpinning ? ' spinning' : '') + (symbol.cls ? ' ' + symbol.cls : '');
  }

  function buildChips() {
    const wrap = document.getElementById('slotsChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets the spin cost to ${value} chips.`;
      btn.addEventListener('click', () => {
        if (spinning) return;
        chip = value;
        wrap.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('selected', Number(c.dataset.value) === value);
        });
        Sound.click();
        renderBet();
      });
      wrap.appendChild(btn);
    });
  }

  function renderBet() {
    document.getElementById('slotsBet').textContent = App.format(chip);
    if (window.App && App.setSideLive) {
      App.setSideLive(`Spin cost: <b>${App.format(chip)}</b><br>Two sevens pay 2&times;.`);
    }
  }

  function drawPaytable() {
    const wrap = document.getElementById('slotsPaytable');
    wrap.innerHTML = SYMBOLS.map((s) => {
      const color = s.cls === 'red' ? '#ff5964' : s.cls === 'gold' ? '#f7d774' : '#efeaff';
      return `<div class="pt-row"><span class="pt-sym" style="color:${color}">${s.ch}${s.ch}${s.ch}</span><span class="pt-mult">${s.mult}\u00d7</span></div>`;
    }).join('') + '<div class="pt-row"><span class="pt-sym">7 7</span><span class="pt-mult">2\u00d7</span></div>';
  }

  function stopReel(index, symbol) {
    stopped[index] = true;
    const el = document.getElementById(`reel${index}`);
    el.classList.remove('spinning');
    showSymbol(el, symbol, false);
    Sound.click();
  }

  function spin() {
    if (spinning) return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips for that spin.', 'lose');
      return;
    }
    spinning = true;
    stopped = [false, false, false];
    document.getElementById('slotsSpin').disabled = true;
    setMessage('Spinning...');
    Sound.spinStart();

    const final = [pick(), pick(), pick()];
    const reels = [0, 1, 2].map((i) => document.getElementById(`reel${i}`));
    reels.forEach((el) => el.classList.add('spinning'));

    tickTimer = setInterval(() => {
      reels.forEach((el, i) => {
        if (!stopped[i]) showSymbol(el, pick(), true);
      });
      Sound.tick();
    }, 90);

    [850, 1350, 1850].forEach((delay, i) => {
      timers.push(setTimeout(() => stopReel(i, final[i]), delay));
    });
    timers.push(setTimeout(() => settle(final), 2250));
  }

  function settle(final) {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    spinning = false;
    document.getElementById('slotsSpin').disabled = false;

    const [a, b, c] = final;
    const triple = a.ch === b.ch && b.ch === c.ch;
    const sevens = final.filter((s) => s.ch === '7').length;
    let ret = 0;

    if (triple) {
      ret = chip * a.mult;
      setMessage(`Triple ${a.name}! Paid ${App.format(ret)} (+${App.format(ret - chip)}).`, 'win');
      Sound.win();
    } else if (sevens === 2) {
      ret = chip * 2;
      setMessage(`Two sevens \u2014 paid ${App.format(ret)} (+${App.format(chip)}).`, 'win');
      Sound.win();
    } else {
      setMessage(`No win \u2014 lost ${App.format(chip)}.`, 'lose');
      Sound.lose();
    }

    if (ret > 0) Wallet.add(ret);
    renderBet();
  }

  function init() {
    buildChips();
    drawPaytable();
    renderBet();
    const start = [pick(), pick(), pick()];
    start.forEach((symbol, i) => showSymbol(document.getElementById(`reel${i}`), symbol, false));
    document.getElementById('slotsSpin').addEventListener('click', spin);
  }

  function show() {
    renderBet();
  }

  function hide() {}

  return { init, show, hide };
})();
