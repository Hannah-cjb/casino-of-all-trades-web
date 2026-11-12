window.VideoPoker = (() => {
  const PAYTABLE = [
    ['Royal Flush', 250],
    ['Straight Flush', 50],
    ['Four of a Kind', 25],
    ['Full House', 9],
    ['Flush', 6],
    ['Straight', 4],
    ['Three of a Kind', 3],
    ['Two Pair', 2],
    ['Jacks or Better', 1]
  ];

  let chip = 25;
  let phase = 'betting';
  let hand = [];
  let held = [false, false, false, false, false];
  let deck = [];

  function setMessage(text, cls) {
    const el = document.getElementById('vpMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('vpChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Selects a ${value}-chip bet.`;
      btn.addEventListener('click', () => {
        if (phase === 'held') return;
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

  function buildSlots() {
    const wrap = document.getElementById('vpSlots');
    wrap.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement('div');
      slot.className = 'vp-slot';
      slot.innerHTML = `
        <button class="hold-btn" data-index="${i}" disabled>HOLD</button>
        <div class="vp-card" id="vpCard${i}"></div>
      `;
      const holdBtn = slot.querySelector('.hold-btn');
      holdBtn.dataset.tip = 'Holds this card so it stays when you draw.';
      holdBtn.addEventListener('click', () => toggleHold(i));
      wrap.appendChild(slot);
    }
  }

  function drawPaytable() {
    document.getElementById('vpPaytable').innerHTML = PAYTABLE
      .map(([name, mult]) => `<div class="pt-row"><span class="pt-sym">${name}</span><span class="pt-mult">${mult}\u00d7</span></div>`)
      .join('');
  }

  function toggleHold(index) {
    if (phase !== 'held') return;
    held[index] = !held[index];
    Sound.click();
    render();
  }

  function deal() {
    if (phase === 'held') return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips to deal.', 'lose');
      return;
    }
    deck = Cards.shuffle(Cards.makeDeck(1));
    hand = [];
    for (let i = 0; i < 5; i++) hand.push(deck.pop());
    held = [false, false, false, false, false];
    phase = 'held';
    Sound.card();
    setMessage('Hold the cards you want, then draw.');
    render();
  }

  function evaluateHand() {
    const result = Cards.evaluate(hand);
    let mult = 0;
    if (result.cat === 8) mult = result.tie[0] === 14 ? 250 : 50;
    else if (result.cat === 7) mult = 25;
    else if (result.cat === 6) mult = 9;
    else if (result.cat === 5) mult = 6;
    else if (result.cat === 4) mult = 4;
    else if (result.cat === 3) mult = 3;
    else if (result.cat === 2) mult = 2;
    else if (result.cat === 1 && result.tie[0] >= 11) mult = 1;

    const ret = chip * mult;
    if (ret > 0) Wallet.add(ret);

    if (mult === 0) {
      setMessage(`${result.name}. No win.`, 'lose');
      Sound.lose();
    } else if (mult === 1) {
      setMessage(`${result.name}. Bet returned.`, 'push');
      Sound.click();
    } else {
      setMessage(`${result.name}! Paid ${App.format(ret)} (+${App.format(ret - chip)}).`, 'win');
      Sound.win();
    }
  }

  function draw() {
    if (phase !== 'held') return;
    for (let i = 0; i < 5; i++) {
      if (!held[i]) hand[i] = deck.pop();
    }
    phase = 'done';
    Sound.card();
    evaluateHand();
    render();
  }

  function reset() {
    if (phase !== 'done') return;
    phase = 'betting';
    hand = [];
    held = [false, false, false, false, false];
    setMessage('Pick a chip, then deal.');
    Sound.click();
    render();
  }

  function render() {
    document.getElementById('vpBet').textContent = App.format(chip);

    for (let i = 0; i < 5; i++) {
      const cardEl = document.getElementById(`vpCard${i}`);
      if (cardEl) {
        cardEl.innerHTML = hand[i] ? Cards.cardHTML(hand[i], phase === 'betting') : Cards.cardHTML(null, true);
      }
      const btn = document.querySelector(`.hold-btn[data-index="${i}"]`);
      if (btn) {
        btn.disabled = phase !== 'held';
        btn.classList.toggle('held', held[i]);
        btn.textContent = held[i] ? 'HELD' : 'HOLD';
      }
    }

    document.querySelectorAll('#vpChips .chip').forEach((c) => {
      const disabled = phase === 'held';
      c.style.opacity = disabled ? '0.4' : '1';
      c.style.pointerEvents = disabled ? 'none' : 'auto';
    });

    document.getElementById('vpDeal').disabled = phase === 'held';
    document.getElementById('vpDraw').disabled = phase !== 'held';
    document.getElementById('vpClear').disabled = phase !== 'done';

    if (window.App && App.setSideLive) {
      const live = hand.length === 5 ? `Your hand: <b>${Cards.evaluate(hand).name}</b>` : 'Pick a chip and deal.';
      App.setSideLive(`${live}<br>Bet: <b>${App.format(chip)}</b>`);
    }
  }

  function init() {
    buildChips();
    buildSlots();
    drawPaytable();
    document.getElementById('vpDeal').addEventListener('click', deal);
    document.getElementById('vpDraw').addEventListener('click', draw);
    document.getElementById('vpClear').addEventListener('click', reset);
    render();
  }

  function show() {
    render();
  }

  function hide() {}

  return { init, show, hide };
})();
