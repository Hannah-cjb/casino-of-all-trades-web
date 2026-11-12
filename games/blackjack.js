window.Blackjack = (() => {
  let shoe = [];
  let bet = 0;
  let dealer = [];
  let hands = [];
  let active = 0;
  let phase = 'betting';
  let autoStand = false;
  let splitCount = 0;
  const timers = [];

  function schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.splice(0).forEach((id) => clearTimeout(id));
  }

  function newShoe() {
    shoe = Cards.shuffle(Cards.makeDeck(6));
  }

  function draw() {
    if (shoe.length < 20) newShoe();
    return shoe.pop();
  }

  function setMessage(text, cls) {
    const el = document.getElementById('bjMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function makeHand(cards, amount) {
    return { cards: cards || [], bet: amount, done: false, doubled: false };
  }

  function activeHand() {
    return hands[active];
  }

  function handTotal(hand) {
    return Cards.blackjackValue(hand.cards);
  }

  function buildChips() {
    const wrap = document.getElementById('bjChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Adds ${value} chips to your bet.`;
      btn.addEventListener('click', () => addBet(value));
      wrap.appendChild(btn);
    });
  }

  function addBet(value) {
    if (phase !== 'betting') return;
    if (bet + value > Wallet.get()) return;
    bet += value;
    Sound.chip();
    render();
  }

  function startDeal() {
    if (phase !== 'betting' || bet < 5) return;
    if (!Wallet.bet(bet)) return;
    phase = 'dealing';
    autoStand = false;
    splitCount = 0;
    dealer = [];
    hands = [makeHand([], bet)];
    render();
    setMessage('Dealing...');

    schedule(() => {
      hands[0].cards.push(draw());
      Sound.card();
      render();
    }, 140);
    schedule(() => {
      dealer.push(draw());
      Sound.card();
      render();
    }, 420);
    schedule(() => {
      hands[0].cards.push(draw());
      Sound.card();
      render();
    }, 700);
    schedule(() => {
      dealer.push(draw());
      Sound.card();
      render();
      afterDeal();
    }, 980);
  }

  function afterDeal() {
    const playerBJ = Cards.isBlackjack(hands[0].cards);
    const dealerBJ = Cards.isBlackjack(dealer);

    if (playerBJ || dealerBJ) {
      phase = 'done';
      render();
      if (playerBJ && dealerBJ) {
        Wallet.add(bet);
        setMessage('Push \u2014 both blackjack. Your bet is returned.', 'push');
      } else if (playerBJ) {
        const win = bet + Math.floor(bet * 1.5);
        Wallet.add(win);
        setMessage(`Blackjack! Paid out ${App.format(win)} at 3:2.`, 'win');
        Sound.win();
      } else {
        setMessage('Dealer has blackjack. You lose.', 'lose');
        Sound.lose();
      }
      render();
      return;
    }

    phase = 'player';
    render();
    setMessage(handPrompt());
    if (autoStand) stand();
  }

  function handPrompt() {
    const hand = activeHand();
    const options = ['Hit or stand'];
    if (hand && hand.cards.length === 2 && Wallet.get() >= hand.bet) options.push('double');
    if (canSplit()) options.push('split');
    const prefix = hands.length > 1 ? `Hand ${active + 1}: ` : '';
    return `${prefix}${options.join(', ')}.`;
  }

  function hit() {
    if (phase !== 'player') return;
    const hand = activeHand();
    if (!hand || hand.done) return;
    hand.cards.push(draw());
    Sound.card();
    const total = handTotal(hand);
    if (total > 21) {
      hand.done = true;
      render();
      setMessage(`${hands.length > 1 ? 'Hand ' + (active + 1) : 'You'} busted with ${total}.`, 'lose');
      Sound.lose();
      advance();
      return;
    }
    if (total === 21) {
      stand();
      return;
    }
    render();
  }

  function stand() {
    if (phase !== 'player') return;
    const hand = activeHand();
    if (!hand || hand.done) return;
    hand.done = true;
    advance();
  }

  function advance() {
    render();
    const next = hands.findIndex((hand) => !hand.done);
    if (next === -1) {
      phase = 'dealer';
      render();
      setMessage('Dealer plays...');
      schedule(dealerStep, 500);
      return;
    }
    active = next;
    render();
    if (phase === 'player') {
      if (autoStand) {
        stand();
        return;
      }
      setMessage(handPrompt());
    }
  }

  function dealerStep() {
    if (phase !== 'dealer') return;
    if (hands.every((hand) => handTotal(hand) > 21)) {
      resolve();
      return;
    }
    const total = Cards.blackjackValue(dealer);
    if (total < 17) {
      dealer.push(draw());
      Sound.card();
      render();
      schedule(dealerStep, 620);
    } else {
      resolve();
    }
  }

  function resolve() {
    phase = 'done';
    const dealerTotal = Cards.blackjackValue(dealer);
    const multi = hands.length > 1;
    const parts = [];
    let net = 0;

    hands.forEach((hand, i) => {
      const total = handTotal(hand);
      const amount = hand.bet;
      if (total > 21) {
        net -= amount;
        parts.push(multi ? `Hand ${i + 1} busts` : `Busted with ${total}`);
      } else if (dealerTotal > 21 || total > dealerTotal) {
        Wallet.add(amount * 2);
        net += amount;
        parts.push(multi ? `Hand ${i + 1} wins ${App.format(amount)}` : `You win ${App.format(amount)}`);
      } else if (total === dealerTotal) {
        Wallet.add(amount);
        parts.push(multi ? `Hand ${i + 1} pushes` : `Push at ${total}`);
      } else {
        net -= amount;
        parts.push(multi ? `Hand ${i + 1} loses ${App.format(amount)}` : `You lose ${App.format(amount)}`);
      }
    });

    const prefix = dealerTotal > 21 ? `Dealer busts with ${dealerTotal}.` : `Dealer has ${dealerTotal}.`;
    const cls = net > 0 ? 'win' : net === 0 ? 'push' : 'lose';
    setMessage(`${prefix} ${parts.join(' \u00b7 ')}.`, cls);
    if (net > 0) Sound.win();
    else if (net === 0) Sound.click();
    else Sound.lose();
    render();
  }

  function doubleDown() {
    if (phase !== 'player') return;
    const hand = activeHand();
    if (!hand || hand.done || hand.cards.length !== 2) return;
    if (Wallet.get() < hand.bet) return;
    if (!Wallet.bet(hand.bet)) return;
    hand.bet *= 2;
    hand.doubled = true;
    hand.cards.push(draw());
    Sound.chip();
    Sound.card();
    const total = handTotal(hand);
    hand.done = true;
    render();
    if (total > 21) {
      setMessage(`${hands.length > 1 ? 'Hand ' + (active + 1) : 'You'} busted with ${total}.`, 'lose');
      Sound.lose();
      advance();
      return;
    }
    setMessage(`${hands.length > 1 ? 'Hand ' + (active + 1) : 'You'} doubled to ${App.format(hand.bet)}.`);
    advance();
  }

  function splitRank(card) {
    return ['10', 'J', 'Q', 'K'].includes(card.rank) ? '10' : card.rank;
  }

  function canSplit() {
    if (phase !== 'player') return false;
    const hand = activeHand();
    if (!hand || hand.done || hand.cards.length !== 2) return false;
    if (splitCount >= 3) return false;
    if (splitRank(hand.cards[0]) !== splitRank(hand.cards[1])) return false;
    return Wallet.get() >= hand.bet;
  }

  function split() {
    if (!canSplit()) return;
    const hand = activeHand();
    if (!Wallet.bet(hand.bet)) return;
    splitCount++;
    const moved = hand.cards.pop();
    const second = makeHand([moved], hand.bet);
    hands.splice(active + 1, 0, second);
    hand.cards.push(draw());
    second.cards.push(draw());
    Sound.chip();
    Sound.card();
    if (splitRank(hand.cards[0]) === 'A') {
      hand.done = true;
      second.done = true;
      render();
      setMessage('Split aces \u2014 one card each.', 'push');
      Sound.click();
      advance();
      return;
    }
    render();
    setMessage(`Split! Playing hand ${active + 1} of ${hands.length}.`);
  }

  function newHand() {
    clearTimers();
    phase = 'betting';
    bet = 0;
    dealer = [];
    hands = [];
    active = 0;
    autoStand = false;
    splitCount = 0;
    render();
    setMessage('Place your bet to begin.');
  }

  function render() {
    const reveal = phase === 'dealer' || phase === 'done';

    const dealerWrap = document.getElementById('dealerCards');
    dealerWrap.innerHTML = dealer
      .map((card, i) => Cards.cardHTML(card, i === 1 && !reveal))
      .join('');

    const dealerTotalEl = document.getElementById('dealerTotal');
    if (dealer.length === 0) {
      dealerTotalEl.textContent = '';
    } else if (reveal) {
      dealerTotalEl.textContent = Cards.blackjackValue(dealer);
    } else {
      const shown = Cards.blackjackValue([dealer[0]]);
      dealerTotalEl.textContent = `${shown} + ?`;
    }

    const wrap = document.getElementById('playerHands');
    if (wrap) {
      wrap.innerHTML = hands
        .map((hand, i) => {
          const total = handTotal(hand);
          const isActive = phase === 'player' && i === active && !hand.done;
          const label = hands.length > 1 ? `HAND ${i + 1}` : 'YOU';
          const cls = [
            'bj-hand',
            isActive ? 'active' : '',
            hand.done ? 'done' : '',
            total > 21 ? 'bust' : ''
          ].filter(Boolean).join(' ');
          return `
            <div class="${cls}">
              <div class="bj-hand-head"><span>${label}</span><span class="bj-hand-total">${hand.cards.length ? total : ''}</span></div>
              <div class="cards">${hand.cards.map((card) => Cards.cardHTML(card)).join('')}</div>
              <div class="bj-hand-bet">${App.format(hand.bet)}${hand.doubled ? ' DOUBLED' : ''}</div>
            </div>
          `;
        })
        .join('');
    }

    const displayBet = phase === 'betting' ? bet : hands.reduce((sum, hand) => sum + hand.bet, 0);
    document.getElementById('bjBet').textContent = App.format(displayBet);
    document.getElementById('bjBetHead').textContent = App.format(displayBet);

    const canBet = phase === 'betting';
    document.querySelectorAll('#bjChips .chip').forEach((chip) => {
      chip.style.opacity = canBet ? '1' : '0.4';
      chip.style.pointerEvents = canBet ? 'auto' : 'none';
    });

    const hand = activeHand();
    const canAct = phase === 'player' && hand && !hand.done;
    document.getElementById('bjDeal').disabled = !(phase === 'betting' && bet >= 5);
    document.getElementById('bjHit').disabled = !canAct;
    document.getElementById('bjStand').disabled = !canAct;
    document.getElementById('bjDouble').disabled =
      !(canAct && hand.cards.length === 2 && Wallet.get() >= hand.bet);
    document.getElementById('bjSplit').disabled = !canSplit();
    document.getElementById('bjNew').disabled = phase !== 'done';
    updateSide();
  }

  function updateSide() {
    if (!window.App || !App.setSideLive) return;
    if (phase === 'betting' || hands.length === 0) {
      App.setSideLive('Place a bet to start. Aces count 1 or 11, face cards count 10.');
      return;
    }
    const reveal = phase === 'dealer' || phase === 'done';
    const dealerShown = dealer.length
      ? reveal
        ? Cards.blackjackValue(dealer)
        : `${Cards.blackjackValue([dealer[0]])} + ?`
      : '\u2014';
    const lines = hands
      .map((hand, i) => `${hands.length > 1 ? `Hand ${i + 1}` : 'You'}: <b>${handTotal(hand)}</b>`)
      .join(' \u00b7 ');
    App.setSideLive(`Dealer: <b>${dealerShown}</b><br>${lines}`);
  }

  function init() {
    newShoe();
    buildChips();
    document.getElementById('bjDeal').addEventListener('click', startDeal);
    document.getElementById('bjHit').addEventListener('click', hit);
    document.getElementById('bjStand').addEventListener('click', stand);
    document.getElementById('bjDouble').addEventListener('click', doubleDown);
    document.getElementById('bjSplit').addEventListener('click', split);
    document.getElementById('bjNew').addEventListener('click', newHand);
    render();
  }

  function show() {
    render();
  }

  function hide() {
    if (phase === 'player') {
      autoStand = true;
      stand();
    } else if (phase === 'dealing') {
      autoStand = true;
    }
  }

  const api = { init, show, hide };
  if (location.hash === '#test') {
    api._test = {
      setShoe(cards) {
        shoe = cards.map((card) => ({ rank: card.rank, suit: card.suit }));
      }
    };
  }
  return api;
})();
