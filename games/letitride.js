window.LetItRide = (() => {
  let chip = 25;
  let phase = 'bet';
  let player = [];
  let community = [];
  let revealed = 0;
  let remaining = 3;
  let pulled = [false, false, false];
  let deck = [];
  let forcedPlayer = null;
  let forcedCommunity = null;

  function setMessage(text, cls) {
    const el = document.getElementById('lirMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('lirChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets each of your three bets to ${value} chips.`;
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

  function payoutFor(result) {
    if (result.cat === 8) return result.tie[0] === 14 ? 1000 : 200;
    if (result.cat === 7) return 50;
    if (result.cat === 6) return 11;
    if (result.cat === 5) return 8;
    if (result.cat === 4) return 5;
    if (result.cat === 3) return 3;
    if (result.cat === 2) return 2;
    if (result.cat === 1 && result.tie[0] >= 10) return 1;
    return 0;
  }

  function fiveCards() {
    return [...player, ...community];
  }

  function renderBets() {
    const wrap = document.getElementById('lirBets');
    const labels = ['BET 1', 'BET 2', 'BET 3'];
    wrap.innerHTML = labels
      .map((label, i) => {
        const pullable = (phase === 'decide1' && i === 2) || (phase === 'decide2' && i === 1);
        const active = !pulled[i] && (phase !== 'bet' || i < 3);
        return `<span class="lir-bet${active ? ' active' : ''}${pullable ? ' pullable' : ''}">${label}</span>`;
      })
      .join('');
  }

  function render() {
    document.getElementById('lirBet').textContent = App.format(remaining * chip);
    document.getElementById('lirPlayer').innerHTML = player
      .map((card) => Cards.cardHTML(card, false, 'lir-card'))
      .join('');
    document.getElementById('lirCommunity').innerHTML = community
      .map((card, i) => Cards.cardHTML(card, i >= revealed, 'lir-card'))
      .join('');
    renderBets();

    const five = player.length === 3 && revealed === 2 ? Cards.evaluate(fiveCards()) : null;
    document.getElementById('lirHandName').textContent = five ? five.name : '';

    document.getElementById('lirDeal').disabled = phase !== 'bet' || chip * 3 > Wallet.get();
    document.getElementById('lirPull').disabled = phase !== 'decide1' && phase !== 'decide2';
    document.getElementById('lirRide').disabled = phase !== 'decide1' && phase !== 'decide2';
    document.getElementById('lirNew').disabled = phase !== 'done';

    document.querySelectorAll('#lirChips .chip').forEach((c) => {
      const off = phase !== 'bet';
      c.style.opacity = off ? '0.4' : '1';
      c.style.pointerEvents = off ? 'none' : 'auto';
    });

    if (window.App && App.setSideLive) {
      const shown = player.length === 3 ? Cards.evaluate([...player, ...community.slice(0, revealed)]).name : '\u2014';
      App.setSideLive(
        `Bets in play: <b>${phase === 'bet' ? 3 : remaining}</b><br>Your hand: <b>${shown}</b><br>Stake: <b>${App.format(phase === 'bet' ? chip * 3 : remaining * chip)}</b>`
      );
    }
  }

  function drawCards(count) {
    const cards = [];
    for (let i = 0; i < count; i++) cards.push(deck.pop());
    return cards;
  }

  function deal() {
    if (phase !== 'bet') return;
    if (!Wallet.bet(chip * 3)) {
      setMessage('Not enough chips for three bets.', 'lose');
      return;
    }
    deck = Cards.shuffle(Cards.makeDeck(1));
    player = forcedPlayer ? forcedPlayer.slice() : drawCards(3);
    community = forcedCommunity ? forcedCommunity.slice() : drawCards(2);
    forcedPlayer = null;
    forcedCommunity = null;
    revealed = 0;
    remaining = 3;
    pulled = [false, false, false];
    phase = 'decide1';
    Sound.card();
    setMessage('Pull back the third bet, or let it ride.');
    render();
  }

  function revealNext() {
    revealed += 1;
  }

  function pull() {
    if (phase !== 'decide1' && phase !== 'decide2') return;
    Wallet.add(chip);
    remaining -= 1;
    pulled[phase === 'decide1' ? 2 : 1] = true;
    Sound.chip();
    if (phase === 'decide1') {
      revealNext();
      phase = 'decide2';
      setMessage('One bet pulled. Decide again, or pull the second.');
      render();
    } else {
      revealNext();
      resolve();
    }
  }

  function ride() {
    if (phase !== 'decide1' && phase !== 'decide2') return;
    if (phase === 'decide1') {
      revealNext();
      phase = 'decide2';
      Sound.card();
      setMessage('One community card out. Pull the second bet or ride.');
      render();
    } else {
      revealNext();
      resolve();
    }
  }

  function resolve() {
    phase = 'done';
    const result = Cards.evaluate(fiveCards());
    const mult = payoutFor(result);
    const stake = remaining * chip;
    const ret = mult > 0 ? stake * (1 + mult) : 0;
    if (ret > 0) Wallet.add(ret);

    if (ret > stake) {
      setMessage(`${result.name}! Paid ${App.format(ret)} (+${App.format(ret - stake)}).`, 'win');
      Sound.win();
    } else if (ret > 0) {
      setMessage(`${result.name}. Bets returned.`, 'push');
      Sound.click();
    } else {
      setMessage(`${result.name}. No win.`, 'lose');
      Sound.lose();
    }
    render();
  }

  function newHand() {
    if (phase !== 'done') return;
    phase = 'bet';
    player = [];
    community = [];
    revealed = 0;
    remaining = 3;
    pulled = [false, false, false];
    setMessage('Deal to start. Three equal bets go on the table.');
    Sound.click();
    render();
  }

  function init() {
    buildChips();
    document.getElementById('lirDeal').addEventListener('click', deal);
    document.getElementById('lirPull').addEventListener('click', pull);
    document.getElementById('lirRide').addEventListener('click', ride);
    document.getElementById('lirNew').addEventListener('click', newHand);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    if (phase !== 'bet') {
      phase = 'bet';
      player = [];
      community = [];
      revealed = 0;
      remaining = 3;
      pulled = [false, false, false];
      forcedPlayer = null;
      forcedCommunity = null;
      setMessage('Deal to start. Three equal bets go on the table.');
      render();
    }
  }

  function _testSetCards(playerCards, communityCards) {
    if (location.hash === '#test') {
      forcedPlayer = playerCards;
      forcedCommunity = communityCards;
    }
  }

  const api = { init, show, hide };
  if (location.hash === '#test') api._test = { setCards: _testSetCards };
  return api;
})();
