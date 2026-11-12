window.ThreeCard = (() => {
  let chip = 25;
  let phase = 'bet';
  let ante = 0;
  let play = 0;
  let player = [];
  let dealer = [];
  let deck = [];
  let forcedPlayer = null;
  let forcedDealer = null;

  const BONUS = { 5: 5, 4: 4, 3: 1 };

  function values(cards) {
    return cards.map((c) => Cards.rankValue(c.rank)).sort((a, b) => b - a);
  }

  function evaluate3(cards) {
    const vals = values(cards);
    const unique = new Set(vals);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    const trips = unique.size === 1;
    const straight =
      (unique.size === 3 && vals[0] - vals[2] === 2) ||
      (vals[0] === 14 && vals[1] === 3 && vals[2] === 2);
    const high = vals[0] === 14 && vals[1] === 3 && vals[2] === 2 ? 3 : vals[0];

    if (flush && straight) return { cat: 5, tie: [high], name: 'Straight Flush' };
    if (trips) return { cat: 4, tie: [vals[0]], name: 'Three of a Kind' };
    if (straight) return { cat: 3, tie: [high], name: 'Straight' };
    if (flush) return { cat: 2, tie: vals, name: 'Flush' };

    const counts = {};
    vals.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
    const pairs = Object.entries(counts).filter(([, c]) => c === 2);
    if (pairs.length) {
      const pair = Number(pairs[0][0]);
      const kicker = vals.find((v) => v !== pair);
      return { cat: 1, tie: [pair, kicker], name: 'One Pair' };
    }

    return { cat: 0, tie: vals, name: 'High Card' };
  }

  function compare3(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const len = Math.max(a.tie.length, b.tie.length);
    for (let i = 0; i < len; i++) {
      const av = a.tie[i] || 0;
      const bv = b.tie[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  function qualifies(hand) {
    return hand.cat >= 1 || hand.tie[0] >= 12;
  }

  function setMessage(text, cls) {
    const el = document.getElementById('tcpMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function buildChips() {
    const wrap = document.getElementById('tcpChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets your ante to ${value} chips.`;
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

  function renderCards() {
    const hideDealer = phase === 'decide';
    document.getElementById('tcpPlayerCards').innerHTML = player
      .map((card) => Cards.cardHTML(card, false, 'tcp-card'))
      .join('');
    document.getElementById('tcpDealerCards').innerHTML = dealer
      .map((card) => Cards.cardHTML(card, hideDealer, 'tcp-card'))
      .join('');

    const playerHand = player.length ? evaluate3(player) : null;
    const dealerHand = dealer.length && !hideDealer ? evaluate3(dealer) : null;
    document.getElementById('tcpPlayerLabel').textContent = playerHand ? playerHand.name : '';
    document.getElementById('tcpDealerLabel').textContent = dealerHand
      ? dealerHand.name
      : hideDealer
        ? 'Hidden'
        : '';
  }

  function render() {
    document.getElementById('tcpAnte').textContent = App.format(ante || chip);
    renderCards();

    document.getElementById('tcpDeal').disabled = phase !== 'bet' || chip > Wallet.get();
    document.getElementById('tcpPlay').disabled = phase !== 'decide' || chip > Wallet.get();
    document.getElementById('tcpFold').disabled = phase !== 'decide';
    document.getElementById('tcpNew').disabled = phase !== 'done';

    document.querySelectorAll('#tcpChips .chip').forEach((c) => {
      const off = phase !== 'bet';
      c.style.opacity = off ? '0.4' : '1';
      c.style.pointerEvents = off ? 'none' : 'auto';
    });

    if (window.App && App.setSideLive) {
      const p = player.length ? evaluate3(player).name : '\u2014';
      const d = dealer.length ? (phase === 'decide' ? 'hidden' : evaluate3(dealer).name) : '\u2014';
      App.setSideLive(
        `You: <b>${p}</b><br>Dealer: <b>${d}</b><br>Ante: <b>${App.format(ante || chip)}</b>`
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
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips for that ante.', 'lose');
      return;
    }
    ante = chip;
    play = 0;
    deck = Cards.shuffle(Cards.makeDeck(1));
    player = forcedPlayer ? forcedPlayer.slice() : drawCards(3);
    dealer = forcedDealer ? forcedDealer.slice() : drawCards(3);
    forcedPlayer = null;
    forcedDealer = null;
    phase = 'decide';
    Sound.card();
    setMessage('Play to reveal the dealer, or fold and lose the ante.');
    render();
  }

  function resolve(folded) {
    const playerHand = evaluate3(player);
    const dealerHand = evaluate3(dealer);
    phase = 'done';

    if (folded) {
      setMessage(`Folded. ${playerHand.name} got away; ante lost.`, 'lose');
      Sound.lose();
      render();
      return;
    }

    const bonus = BONUS[playerHand.cat] || 0;
    const qual = qualifies(dealerHand);
    const cmp = compare3(playerHand, dealerHand);

    if (!qual) {
      const ret = ante * 2 + ante * bonus;
      Wallet.add(ret);
      setMessage(`Dealer has ${dealerHand.name} and does not qualify. Ante pays ${App.format(ante * 2)}.`, 'win');
      Sound.win();
    } else if (cmp > 0) {
      const ret = ante * 2 + play * 2 + ante * bonus;
      Wallet.add(ret);
      const extra = bonus ? ` Ante bonus ${bonus}:1.` : '';
      setMessage(`${playerHand.name} beats ${dealerHand.name}. Paid ${App.format(ret)}.${extra}`, 'win');
      Sound.win();
    } else if (cmp === 0) {
      Wallet.add(ante + play);
      setMessage(`Both have ${playerHand.name}. Push.`, 'push');
      Sound.click();
    } else {
      setMessage(`${dealerHand.name} beats ${playerHand.name}. Ante and play lost.`, 'lose');
      Sound.lose();
    }
    render();
  }

  function playHand() {
    if (phase !== 'decide') return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips to play.', 'lose');
      return;
    }
    play = chip;
    Sound.chip();
    resolve(false);
  }

  function fold() {
    if (phase !== 'decide') return;
    resolve(true);
  }

  function newHand() {
    if (phase !== 'done') return;
    phase = 'bet';
    ante = 0;
    play = 0;
    player = [];
    dealer = [];
    setMessage('Place an ante and deal.');
    Sound.click();
    render();
  }

  function init() {
    buildChips();
    document.getElementById('tcpDeal').addEventListener('click', deal);
    document.getElementById('tcpPlay').addEventListener('click', playHand);
    document.getElementById('tcpFold').addEventListener('click', fold);
    document.getElementById('tcpNew').addEventListener('click', newHand);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    if (phase !== 'bet') {
      phase = 'bet';
      ante = 0;
      play = 0;
      player = [];
      dealer = [];
      forcedPlayer = null;
      forcedDealer = null;
      setMessage('Place an ante and deal.');
      render();
    }
  }

  function _testSetHands(playerCards, dealerCards) {
    if (location.hash === '#test') {
      forcedPlayer = playerCards;
      forcedDealer = dealerCards;
    }
  }

  const api = { init, show, hide };
  if (location.hash === '#test') api._test = { setHands: _testSetHands };
  return api;
})();
