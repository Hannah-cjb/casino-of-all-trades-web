window.War = (() => {
  let chip = 25;
  let phase = 'bet';
  let wager = 0;
  let warBet = 0;
  let player = [];
  let dealer = [];
  let deck = [];
  let forced = null;
  let message = 'Place a bet and deal. High card wins.';

  function setMessage(text, cls) {
    message = text;
    const el = document.getElementById('warMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('warChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets your War wager to ${value} chips.`;
      btn.addEventListener('click', () => {
        if (phase !== 'bet') return;
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

  function draw() {
    if (forced && forced.length) return forced.shift();
    return deck.pop();
  }

  function render() {
    document.getElementById('warBet').textContent = App.format(phase === 'war' ? wager + warBet : wager || chip);
    document.getElementById('warPlayer').innerHTML = player.map((card) => Cards.cardHTML(card, false, 'war-card')).join('');
    document.getElementById('warDealer').innerHTML = dealer.map((card) => Cards.cardHTML(card, false, 'war-card')).join('');

    document.getElementById('warDeal').disabled = phase !== 'bet' || chip > Wallet.get();
    document.getElementById('warGo').disabled = phase !== 'war' || chip > Wallet.get();
    document.getElementById('warSurrender').disabled = phase !== 'war';
    document.getElementById('warNew').disabled = phase !== 'done';

    document.querySelectorAll('#warChips .chip').forEach((c) => {
      const off = phase !== 'bet';
      c.style.opacity = off ? '0.4' : '1';
      c.style.pointerEvents = off ? 'none' : 'auto';
    });

    if (window.App && App.setSideLive) {
      const p = player.length ? player[0].rank : '\u2014';
      const d = dealer.length ? dealer[0].rank : '\u2014';
      App.setSideLive(`You: <b>${p}</b> \u00b7 Dealer: <b>${d}</b><br>Wager: <b>${App.format(wager || chip)}</b>`);
    }
  }

  function deal() {
    if (phase !== 'bet') return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips for that wager.', 'lose');
      return;
    }
    wager = chip;
    warBet = 0;
    deck = Cards.shuffle(Cards.makeDeck(1));
    player = [draw()];
    dealer = [draw()];
    Sound.card();
    resolveNormal();
  }

  function resolveNormal() {
    const p = Cards.rankValue(player[0].rank);
    const d = Cards.rankValue(dealer[0].rank);
    if (p > d) {
      Wallet.add(wager * 2);
      phase = 'done';
      setMessage(`Your ${player[0].rank} beats ${dealer[0].rank}. Paid ${App.format(wager * 2)}.`, 'win');
      Sound.win();
    } else if (p < d) {
      phase = 'done';
      setMessage(`Your ${player[0].rank} loses to ${dealer[0].rank}. Wager lost.`, 'lose');
      Sound.lose();
    } else {
      phase = 'war';
      setMessage(`Both show ${player[0].rank}. Surrender half or go to war for double.`, 'push');
      Sound.click();
    }
    render();
  }

  function goToWar() {
    if (phase !== 'war') return;
    if (!Wallet.bet(wager)) {
      setMessage('Not enough chips to go to war.', 'lose');
      return;
    }
    warBet = wager;
    phase = 'war';
    Sound.spinStart();
    let p = draw();
    let d = draw();
    let guard = 0;
    while (Cards.rankValue(p.rank) === Cards.rankValue(d.rank) && guard < 40) {
      p = draw();
      d = draw();
      guard += 1;
    }
    player = [p];
    dealer = [d];
    const pv = Cards.rankValue(p.rank);
    const dv = Cards.rankValue(d.rank);
    phase = 'done';
    if (pv > dv) {
      Wallet.add(wager * 3);
      setMessage(`War! Your ${p.rank} beats ${d.rank}. Paid ${App.format(wager * 3)}.`, 'win');
      Sound.win();
    } else {
      setMessage(`War lost. ${d.rank} beats ${p.rank}. Both wagers gone.`, 'lose');
      Sound.lose();
    }
    render();
  }

  function surrender() {
    if (phase !== 'war') return;
    const back = Math.floor(wager / 2);
    Wallet.add(back);
    phase = 'done';
    setMessage(`Surrendered. ${App.format(back)} returned, ${App.format(wager - back)} lost.`, 'lose');
    Sound.lose();
    render();
  }

  function newHand() {
    if (phase !== 'done') return;
    phase = 'bet';
    wager = 0;
    warBet = 0;
    player = [];
    dealer = [];
    setMessage('Place a bet and deal. High card wins.');
    Sound.click();
    render();
  }

  function init() {
    buildChips();
    document.getElementById('warDeal').addEventListener('click', deal);
    document.getElementById('warGo').addEventListener('click', goToWar);
    document.getElementById('warSurrender').addEventListener('click', surrender);
    document.getElementById('warNew').addEventListener('click', newHand);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    if (phase !== 'bet') {
      phase = 'bet';
      wager = 0;
      warBet = 0;
      player = [];
      dealer = [];
      forced = null;
      setMessage('Place a bet and deal. High card wins.');
      render();
    }
    void message;
  }

  function _testSetCards(cards) {
    if (location.hash === '#test') forced = cards.slice();
  }

  const api = { init, show, hide };
  if (location.hash === '#test') api._test = { setCards: _testSetCards };
  return api;
})();
