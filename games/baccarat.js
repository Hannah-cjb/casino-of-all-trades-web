window.Baccarat = (() => {
  const TENS = new Set(['10', 'J', 'Q', 'K']);
  const ORDER = ['player', 'banker', 'tie'];

  let chip = 25;
  let betType = null;
  let betAmount = 0;
  let dealing = false;
  let player = [];
  let banker = [];
  let deck = [];
  const timers = [];

  function schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
  }

  function cardValue(card) {
    if (card.rank === 'A') return 1;
    if (TENS.has(card.rank)) return 0;
    return Number(card.rank);
  }

  function total(cards) {
    return cards.reduce((sum, card) => sum + cardValue(card), 0) % 10;
  }

  function draw() {
    if (deck.length < 8) deck = Cards.shuffle(Cards.makeDeck(6));
    return deck.pop();
  }

  function setMessage(text, cls) {
    const el = document.getElementById('bacMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('bacChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Selects a ${value}-chip bet size.`;
      btn.addEventListener('click', () => {
        if (dealing) return;
        chip = value;
        if (betType) betAmount = value;
        wrap.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('selected', Number(c.dataset.value) === value);
        });
        Sound.click();
        render();
      });
      wrap.appendChild(btn);
    });
  }

  function render() {
    document.getElementById('bacPlayerCards').innerHTML = player.map((c) => Cards.cardHTML(c)).join('');
    document.getElementById('bacBankerCards').innerHTML = banker.map((c) => Cards.cardHTML(c)).join('');
    document.getElementById('bacPlayerTotal').textContent = player.length ? total(player) : '';
    document.getElementById('bacBankerTotal').textContent = banker.length ? total(banker) : '';
    document.getElementById('bacBet').textContent = betType ? App.format(betAmount) : '0';

    const wager = document.getElementById('bacWager');
    wager.textContent = betType
      ? `${betType.toUpperCase()} \u00b7 ${App.format(betAmount)} ${betType === 'banker' ? '(pays 0.95:1)' : betType === 'tie' ? '(pays 8:1)' : '(pays 1:1)'}`
      : 'No bet placed.';

    document.querySelectorAll('[data-bac]').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.bac === betType);
      btn.disabled = dealing;
    });

    document.querySelectorAll('#bacChips .chip').forEach((c) => {
      c.style.opacity = dealing ? '0.4' : '1';
      c.style.pointerEvents = dealing ? 'none' : 'auto';
    });

    document.getElementById('bacDeal').disabled = dealing || !betType || betAmount > Wallet.get();
    document.getElementById('bacClear').disabled = dealing || !betType;

    if (window.App && App.setSideLive) {
      App.setSideLive(
        player.length || banker.length
          ? `Player: <b>${total(player)}</b> \u00b7 Banker: <b>${total(banker)}</b>`
          : 'Choose Player, Banker or Tie, then deal.'
      );
    }
  }

  function choose(type) {
    if (dealing) return;
    betType = type;
    betAmount = chip;
    Sound.chip();
    render();
  }

  function clearBet() {
    if (dealing) return;
    betType = null;
    betAmount = 0;
    Sound.click();
    render();
  }

  function deal() {
    if (dealing || !betType) return;
    if (!Wallet.bet(betAmount)) {
      setMessage('Not enough chips for that bet.', 'lose');
      return;
    }
    dealing = true;
    player = [];
    banker = [];
    deck = Cards.shuffle(Cards.makeDeck(6));
    setMessage('Dealing...');
    render();

    schedule(() => { player.push(draw()); Sound.card(); render(); }, 250);
    schedule(() => { banker.push(draw()); Sound.card(); render(); }, 600);
    schedule(() => { player.push(draw()); Sound.card(); render(); }, 950);
    schedule(() => { banker.push(draw()); Sound.card(); render(); }, 1300);
    schedule(afterInitial, 1750);
  }

  function afterInitial() {
    const pt = total(player);
    const bt = total(banker);
    if (pt >= 8 || bt >= 8) {
      schedule(settle, 650);
      return;
    }
    if (pt <= 5) {
      schedule(() => { player.push(draw()); Sound.card(); render(); }, 400);
      schedule(() => bankerDecision(true), 1150);
    } else {
      schedule(() => bankerDecision(false), 450);
    }
  }

  function bankerDecision(playerDrew) {
    const bt = total(banker);
    let drawThird = false;
    if (playerDrew) {
      const third = cardValue(player[2]);
      if (bt <= 2) drawThird = true;
      else if (bt === 3) drawThird = third !== 8;
      else if (bt === 4) drawThird = third >= 2 && third <= 7;
      else if (bt === 5) drawThird = third >= 4 && third <= 7;
      else if (bt === 6) drawThird = third === 6 || third === 7;
    } else {
      drawThird = bt <= 5;
    }
    if (drawThird) {
      banker.push(draw());
      Sound.card();
      render();
    }
    schedule(settle, 800);
  }

  function settle() {
    dealing = false;
    const pt = total(player);
    const bt = total(banker);
    const tie = pt === bt;
    let ret = 0;

    if (tie) {
      ret = betType === 'tie' ? betAmount * 9 : betAmount;
    } else if (pt > bt) {
      ret = betType === 'player' ? betAmount * 2 : 0;
    } else {
      ret = betType === 'banker' ? betAmount + Math.floor(betAmount * 0.95) : 0;
    }

    Wallet.add(ret);

    const label = tie ? 'Tie' : pt > bt ? 'Player wins' : 'Banker wins';
    const cls = ret > betAmount ? 'win' : ret === betAmount ? 'push' : 'lose';
    const result = ret > betAmount
      ? `You win ${App.format(ret - betAmount)}.`
      : ret === betAmount
        ? 'Bet pushed.'
        : `You lose ${App.format(betAmount)}.`;

    setMessage(`${label}! Player ${pt} \u00b7 Banker ${bt}. ${result}`, cls);
    if (cls === 'win') Sound.win();
    else if (cls === 'push') Sound.click();
    else Sound.lose();
    render();
  }

  function init() {
    buildChips();
    document.querySelectorAll('[data-bac]').forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.bac));
    });
    document.getElementById('bacDeal').addEventListener('click', deal);
    document.getElementById('bacClear').addEventListener('click', clearBet);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    timers.splice(0).forEach((id) => clearTimeout(id));
  }

  return { init, show, hide };
})();
