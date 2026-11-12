window.Poker = (() => {
  const SB = 10;
  const BB = 20;
  const START_STACK = 1000;
  const NAMES = ['You', 'Vera', 'Marco', 'Jinx'];
  const POSITIONS = ['bottom', 'top', 'left', 'right'];

  let players = [];
  let buttonSeat = 0;
  let handNo = 0;
  let state = null;
  let showAll = false;
  let humanTurnActive = false;
  let timers = [];

  function schedule(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.splice(0).forEach((id) => clearTimeout(id));
  }

  function message(text, cls) {
    const el = document.getElementById('pokerMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function streetLabel() {
    if (state.street === 'flop') return 'FLOP';
    if (state.street === 'turn') return 'TURN';
    if (state.street === 'river') return 'RIVER';
    return 'PREFLOP';
  }

  function makePlayer(index) {
    return {
      seat: index,
      name: NAMES[index],
      human: index === 0,
      stack: index === 0 ? 0 : START_STACK,
      cards: [],
      folded: false,
      allIn: false,
      betRound: 0,
      contributed: 0,
      posted: 0,
      acted: false
    };
  }

  function startHand() {
    clearTimers();
    if (Wallet.get() < BB) {
      state = { inHand: false, street: 'preflop', community: [], pot: 0 };
      players = [0, 1, 2, 3].map(makePlayer);
      humanTurnActive = false;
      renderAll();
      renderPot();
      disableHumanControls();
      message('You need at least 20 chips to play. Refill in the lobby.', 'lose');
      return;
    }

    handNo++;
    if (handNo > 1) buttonSeat = (buttonSeat + 1) % 4;

    players = [0, 1, 2, 3].map(makePlayer);
    players.forEach((p) => {
      if (!p.human && p.stack < BB * 4) p.stack = START_STACK;
    });

    state = {
      inHand: true,
      street: 'preflop',
      community: [],
      pot: 0,
      deck: Cards.shuffle(Cards.makeDeck(1)),
      currentBet: BB,
      lastRaise: BB,
      raises: 0,
      actor: 0
    };

    showAll = false;
    humanTurnActive = false;

    const sbSeat = (buttonSeat + 1) % 4;
    const bbSeat = (buttonSeat + 2) % 4;
    postBlind(players[sbSeat], SB);
    postBlind(players[bbSeat], BB);

    for (let round = 0; round < 2; round++) {
      players.forEach((p) => p.cards.push(state.deck.pop()));
    }

    state.actor = (bbSeat + 1) % 4;
    message(`Hand ${handNo} \u2014 preflop. Blinds posted.`);
    disableHumanControls();
    renderAll();
    renderPot();
    schedule(nextTurn, 900);
  }

  function postBlind(p, amount) {
    p.betRound += amount;
    p.posted = amount;
    p.contributed += amount;
    state.pot += amount;
    if (p.human) Wallet.bet(amount);
    else p.stack -= amount;
    if ((p.human ? Wallet.get() : p.stack) <= 0) p.allIn = true;
  }

  function commit(p, amount) {
    const available = p.human ? Wallet.get() : p.stack;
    const take = Math.max(0, Math.min(amount, available));
    if (take > 0) {
      if (p.human) Wallet.bet(take);
      else p.stack -= take;
      p.betRound += take;
      p.contributed += take;
      state.pot += take;
    }
    if ((p.human ? Wallet.get() : p.stack) <= 0) p.allIn = true;
    return take;
  }

  function needsAction(p) {
    return !p.folded && !p.allIn && (!p.acted || p.betRound !== state.currentBet);
  }

  function nextTurn() {
    if (!state || !state.inHand) return;
    const alive = players.filter((p) => !p.folded);
    if (alive.length === 1) return awardUncontested(alive[0]);
    if (!players.some(needsAction)) return endStreet();

    let idx = state.actor;
    for (let i = 0; i < 8; i++) {
      if (needsAction(players[idx])) {
        state.actor = idx;
        break;
      }
      idx = (idx + 1) % 4;
    }

    const p = players[state.actor];
    renderAll();
    if (p.human) {
      enableHumanControls(p);
    } else {
      disableHumanControls();
      schedule(() => botTurn(p), 700 + Math.random() * 550);
    }
  }

  function endStreet() {
    if (!state || !state.inHand) return;
    const alive = players.filter((p) => !p.folded);
    if (alive.length === 1) return awardUncontested(alive[0]);

    players.forEach((p) => {
      p.betRound = 0;
      p.acted = false;
      p.posted = 0;
    });

    if (state.street === 'preflop') {
      state.street = 'flop';
      drawCommunity(3);
    } else if (state.street === 'flop') {
      state.street = 'turn';
      drawCommunity(1);
    } else if (state.street === 'turn') {
      state.street = 'river';
      drawCommunity(1);
    } else {
      return showdown();
    }

    state.currentBet = 0;
    state.lastRaise = BB;
    state.raises = 0;
    state.actor = (buttonSeat + 1) % 4;

    message(`${streetLabel()} \u2014 pot ${App.format(state.pot)}`);
    disableHumanControls();
    renderAll();
    schedule(nextTurn, 900);
  }

  function drawCommunity(count) {
    for (let i = 0; i < count; i++) {
      state.community.push(state.deck.pop());
      Sound.card();
    }
  }

  function awardUncontested(p) {
    const pot = state.pot;
    if (p.human) Wallet.add(pot);
    else p.stack += pot;
    state.inHand = false;
    humanTurnActive = false;
    showAll = true;
    disableHumanControls();
    message(`${p.name} wins ${App.format(pot)} \u2014 everyone else folded.`, p.human ? 'win' : 'lose');
    renderAll();
    renderPot();
    if (p.human) Sound.win();
    else Sound.lose();
    scheduleNextHand(3200);
  }

  function showdown() {
    state.street = 'showdown';
    showAll = true;
    humanTurnActive = false;
    disableHumanControls();

    const alive = players.filter((p) => !p.folded);
    const evals = alive.map((p) => ({
      p,
      e: Cards.evaluate([...p.cards, ...state.community])
    }));
    evals.sort((a, b) => Cards.compare(b.e, a.e));
    const best = evals[0].e;
    const winners = evals.filter((x) => Cards.compare(x.e, best) === 0).map((x) => x.p);
    const pot = state.pot;
    const share = Math.floor(pot / winners.length);

    winners.forEach((w, i) => {
      const amount = share + (i === 0 ? pot - share * winners.length : 0);
      if (w.human) Wallet.add(amount);
      else w.stack += amount;
    });

    state.inHand = false;
    const humanWon = winners.some((w) => w.human);
    const names = winners.map((w) => w.name).join(' & ');
    message(`${names} win${winners.length > 1 ? '' : 's'} ${App.format(pot)} with ${best.name}.`, humanWon ? 'win' : 'lose');
    renderAll();
    renderPot();
    if (humanWon) Sound.win();
    else Sound.lose();
    scheduleNextHand(4000);
  }

  function scheduleNextHand(delay) {
    schedule(() => {
      if (!state || !state.inHand) startHand();
    }, delay);
  }

  function preflopScore(cards) {
    const a = Cards.rankValue(cards[0].rank);
    const b = Cards.rankValue(cards[1].rank);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    let score = ((hi - 2) / 12) * 0.3 + ((lo - 2) / 12) * 0.12;
    if (a === b) score = 0.55 + ((hi - 2) / 12) * 0.42;
    if (cards[0].suit === cards[1].suit) score += 0.05;
    if (Math.abs(a - b) === 1) score += 0.04;
    if (hi === 14 && lo >= 10) score += 0.08;
    return Math.max(0.05, Math.min(1, score));
  }

  function postflopScore(p) {
    const e = Cards.evaluate([...p.cards, ...state.community]);
    let score = e.cat / 8;
    if (e.cat >= 1 && e.cat <= 3) score += ((e.tie[0] || 2) - 2) / 12 * 0.07;
    if (e.cat === 0) score = 0.18 + ((e.tie[0] || 2) - 2) / 12 * 0.2;
    return Math.min(1, score);
  }

  function botRaiseTo(p, score) {
    const unit = Math.max(state.lastRaise, BB);
    const mult = score > 0.85 ? 3 : score > 0.7 ? 2 : 1;
    const minTo = state.currentBet + unit;
    const target = Math.max(minTo, state.currentBet + Math.round((unit * mult) / 10) * 10);
    return Math.min(target, p.betRound + p.stack);
  }

  function botTurn(p) {
    if (!state || !state.inHand || p.folded) return nextTurn();
    const toCall = Math.max(0, state.currentBet - p.betRound);
    const score = state.street === 'preflop' ? preflopScore(p.cards) : postflopScore(p);
    const roll = Math.random();

    if (toCall <= 0) {
      if (state.raises < 3 && score > 0.66 && roll < 0.6) {
        return doAction(p, 'raise', botRaiseTo(p, score));
      }
      if (state.raises < 3 && score > 0.5 && roll < 0.22) {
        return doAction(p, 'raise', botRaiseTo(p, score));
      }
      return doAction(p, 'check');
    }

    const callCost = Math.min(toCall, p.stack);
    const odds = callCost / (state.pot + callCost);
    if (score + 0.05 < odds && roll < 0.85) return doAction(p, 'fold');
    if (state.raises < 3 && score > 0.78 && roll < 0.4) {
      return doAction(p, 'raise', botRaiseTo(p, score));
    }
    return doAction(p, 'call');
  }

  function doAction(p, action, totalTo) {
    if (!state || !state.inHand) return;
    humanTurnActive = false;

    if (action === 'fold') {
      p.folded = true;
      p.acted = true;
      Sound.click();
    } else if (action === 'check') {
      p.acted = true;
      Sound.click();
    } else if (action === 'call') {
      const toCall = Math.max(0, state.currentBet - p.betRound);
      commit(p, toCall);
      p.acted = true;
      Sound.chip();
    } else if (action === 'raise') {
      const minTo = state.currentBet + Math.max(state.lastRaise, BB);
      const maxTo = p.betRound + (p.human ? Wallet.get() : p.stack);
      if (maxTo < minTo) {
        return doAction(p, 'call');
      }
      let target = Math.max(totalTo || minTo, minTo);
      target = Math.min(target, maxTo);
      const previous = state.currentBet;
      commit(p, target - p.betRound);
      state.currentBet = Math.max(previous, p.betRound);
      state.lastRaise = state.currentBet - previous;
      state.raises++;
      p.acted = true;
      players.forEach((other) => {
        if (other !== p && !other.folded) other.acted = false;
      });
      Sound.chip();
    }

    state.actor = (p.seat + 1) % 4;
    renderAll();
    renderPot();
    schedule(nextTurn, 420);
  }

  function enableHumanControls(p) {
    humanTurnActive = true;
    const toCall = Math.max(0, state.currentBet - p.betRound);
    document.getElementById('pokerFold').disabled = false;

    const callBtn = document.getElementById('pokerCall');
    callBtn.disabled = false;
    callBtn.textContent = toCall > 0 ? `Call ${App.format(toCall)}` : 'Check';

    const raiseBtn = document.getElementById('pokerRaise');
    const range = document.getElementById('pokerRaiseRange');
    const minTo = state.currentBet + Math.max(state.lastRaise, BB);
    const maxTo = p.betRound + Wallet.get();
    const canRaise = state.raises < 3 && maxTo >= minTo;

    raiseBtn.disabled = !canRaise;
    range.disabled = !canRaise;
    if (canRaise) {
      const step = 10;
      const min = Math.ceil(minTo / step) * step;
      const max = Math.floor(maxTo / step) * step;
      range.min = min;
      range.max = Math.max(min, max);
      range.step = step;
      range.value = Math.min(min + step, Math.max(min, max));
      document.getElementById('pokerRaiseAmt').textContent = App.format(Number(range.value));
      range.dataset.available = '1';
    } else {
      delete range.dataset.available;
      document.getElementById('pokerRaiseAmt').textContent = '\u2014';
    }
    updateInfo();
  }

  function disableHumanControls() {
    ['pokerFold', 'pokerCall', 'pokerRaise'].forEach((id) => {
      document.getElementById(id).disabled = true;
    });
    document.getElementById('pokerRaiseRange').disabled = true;
    updateInfo();
  }

  function updateInfo() {
    const info = document.getElementById('pokerToCall');
    if (!state || !state.inHand) {
      info.textContent = 'Waiting for the next hand...';
      return;
    }
    const human = players[0];
    if (humanTurnActive) {
      const toCall = Math.max(0, state.currentBet - human.betRound);
      info.textContent = toCall > 0
        ? `Your move \u00b7 call ${App.format(toCall)} \u00b7 pot ${App.format(state.pot)}`
        : `Your move \u00b7 check or raise \u00b7 pot ${App.format(state.pot)}`;
      return;
    }
    const actor = players[state.actor];
    info.textContent = `${actor.name} is thinking \u00b7 pot ${App.format(state.pot)}`;
  }

  function renderAll() {
    if (!players.length) return;
    players.forEach((p) => renderSeat(p));
    const community = document.getElementById('communityCards');
    community.innerHTML = state && state.community
      ? state.community.map((c) => Cards.cardHTML(c)).join('')
      : '';
    if (!humanTurnActive) disableHumanControls();
    updateSide();
  }

  function handNameFor(p) {
    if (!p.cards.length) return '';
    const community = state && state.community ? state.community : [];
    return Cards.evaluate([...p.cards, ...community]).name;
  }

  function updateSide() {
    if (!window.App || !App.setSideLive) return;
    if (!state || !state.inHand || !players.length) {
      App.setSideLive('Waiting for the next hand to begin.');
      return;
    }
    const human = players[0];
    const liveHand = human.cards.length ? handNameFor(human) : '\u2014';
    App.setSideLive(
      `Your hand: <b>${human.folded ? 'Folded' : liveHand}</b><br>Pot: <b>${App.format(state.pot)}</b> \u00b7 Street: <b>${streetLabel()}</b>`
    );
  }

  function renderSeat(p) {
    const el = document.getElementById(`seat${p.seat}`);
    if (!el) return;
    const reveal = p.human || (showAll && !p.folded);
    const cards = p.cards.length
      ? p.cards.map((c) => Cards.cardHTML(c, !reveal, 'small')).join('')
      : '';
    const active = state && state.inHand && state.actor === p.seat && !p.folded;
    const dealer = state && buttonSeat === p.seat ? '<span class="dealer-button">D</span>' : '';
    const showHand = (p.human || showAll) && !p.folded;
    const handName = showHand ? handNameFor(p) : '';
    const status = p.folded ? 'Folded' : p.allIn ? 'All in' : '';
    const handLine = handName ? `<span class="seat-hand">${handName}</span>` : '';
    const bet = p.betRound > 0
      ? `<span class="seat-bet show">${App.format(p.betRound)}</span>`
      : '<span class="seat-bet">&nbsp;</span>';
    const stack = p.human ? Wallet.get() : p.stack;

    el.className = `seat seat-${POSITIONS[p.seat]}${active ? ' active' : ''}${p.folded ? ' folded' : ''}`;
    el.innerHTML = `
      ${dealer}
      <div class="seat-cards">${cards}</div>
      <div class="seat-plate">
        <span class="seat-name">${p.name}</span>
        <span class="seat-stack">${App.format(stack)}</span>
      </div>
      <div class="seat-status">${status}${handLine}</div>
      ${bet}
    `;
  }

  function renderPot() {
    document.getElementById('pokerPot').textContent = state ? App.format(state.pot) : '0';
  }

  function playerAction(action) {
    if (!humanTurnActive || !state || !state.inHand) return;
    const human = players[0];
    humanTurnActive = false;
    disableHumanControls();
    if (action === 'raise') {
      const value = Number(document.getElementById('pokerRaiseRange').value);
      doAction(human, 'raise', value);
    } else {
      doAction(human, action);
    }
  }

  function init() {
    players = [0, 1, 2, 3].map(makePlayer);
    state = { inHand: false, street: 'preflop', community: [], pot: 0 };
    renderAll();
    renderPot();

    document.getElementById('pokerFold').addEventListener('click', () => playerAction('fold'));
    document.getElementById('pokerCall').addEventListener('click', () => playerAction('call'));
    document.getElementById('pokerRaise').addEventListener('click', () => playerAction('raise'));
    document.getElementById('pokerRaiseRange').addEventListener('input', (e) => {
      document.getElementById('pokerRaiseAmt').textContent = App.format(Number(e.target.value));
    });
  }

  function show() {
    if (!state || !state.inHand) startHand();
    else {
      renderAll();
      renderPot();
    }
    if (humanTurnActive) enableHumanControls(players[0]);
  }

  function hide() {
    clearTimers();
    if (state && state.inHand) {
      const human = players[0];
      if (human.contributed > 0) Wallet.add(human.contributed);
      human.contributed = 0;
      state.inHand = false;
      humanTurnActive = false;
    }
  }

  return { init, show, hide };
})();
