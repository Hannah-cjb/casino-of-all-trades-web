window.Cards = (() => {
  const SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const VALUE = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };

  function makeDeck(count = 1) {
    const deck = [];
    for (let i = 0; i < count; i++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) deck.push({ rank, suit });
      }
    }
    return deck;
  }

  function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function rankValue(rank) {
    return VALUE[rank] || 0;
  }

  function isRed(card) {
    return card.suit === '\u2665' || card.suit === '\u2666';
  }

  function blackjackValue(cards) {
    let total = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.rank === 'A') {
        aces++;
        total += 11;
      } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
        total += 10;
      } else {
        total += VALUE[card.rank];
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isBlackjack(cards) {
    return cards.length === 2 && blackjackValue(cards) === 21;
  }

  function cardHTML(card, hidden, extraClass) {
    if (hidden) return `<div class="card back ${extraClass || ''}"></div>`;
    const red = isRed(card) ? 'red' : 'black';
    return `<div class="card ${red} ${extraClass || ''}">
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${card.suit}</span>
      <span class="card-corner">${card.suit}</span>
    </div>`;
  }

  function straightHigh(values) {
    const set = new Set(values);
    if (set.has(14)) set.add(1);
    const sorted = [...set].sort((a, b) => b - a);
    for (const high of sorted) {
      if (high < 5) continue;
      let ok = true;
      for (let k = 1; k < 5; k++) {
        if (!set.has(high - k)) {
          ok = false;
          break;
        }
      }
      if (ok) return high;
    }
    return 0;
  }

  function evaluate(cards) {
    const values = cards.map((c) => VALUE[c.rank]);
    const counts = {};
    values.forEach((v) => {
      counts[v] = (counts[v] || 0) + 1;
    });
    const groups = Object.entries(counts)
      .map(([v, c]) => ({ v: Number(v), c }))
      .sort((a, b) => b.c - a.c || b.v - a.v);

    const suitCounts = {};
    cards.forEach((c) => {
      suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
    });
    const flushSuit = Object.keys(suitCounts).find((s) => suitCounts[s] >= 5);
    const flushCards = flushSuit ? cards.filter((c) => c.suit === flushSuit) : null;

    if (flushCards) {
      const high = straightHigh(flushCards.map((c) => VALUE[c.rank]));
      if (high) return { cat: 8, tie: [high], name: 'Straight Flush' };
    }

    const quad = groups.find((g) => g.c === 4);
    if (quad) {
      const kicker = groups.find((g) => g.v !== quad.v).v;
      return { cat: 7, tie: [quad.v, kicker], name: 'Four of a Kind' };
    }

    const trips = groups.filter((g) => g.c >= 3);
    if (trips.length >= 2) {
      return { cat: 6, tie: [trips[0].v, trips[1].v], name: 'Full House' };
    }
    if (trips.length === 1) {
      const pair = groups.find((g) => g.c >= 2 && g.v !== trips[0].v);
      if (pair) return { cat: 6, tie: [trips[0].v, pair.v], name: 'Full House' };
    }

    if (flushCards) {
      const top = flushCards
        .map((c) => VALUE[c.rank])
        .sort((a, b) => b - a)
        .slice(0, 5);
      return { cat: 5, tie: top, name: 'Flush' };
    }

    const straight = straightHigh(values);
    if (straight) return { cat: 4, tie: [straight], name: 'Straight' };

    if (trips.length === 1) {
      const kickers = groups
        .filter((g) => g.v !== trips[0].v)
        .map((g) => g.v)
        .sort((a, b) => b - a)
        .slice(0, 2);
      return { cat: 3, tie: [trips[0].v, ...kickers], name: 'Three of a Kind' };
    }

    if (trips.length === 0 && groups.filter((g) => g.c === 2).length >= 2) {
      const pairs = groups.filter((g) => g.c === 2);
      const [p1, p2] = pairs;
      const kicker = groups
        .filter((g) => g.v !== p1.v && g.v !== p2.v)
        .map((g) => g.v)
        .sort((a, b) => b - a)[0];
      return { cat: 2, tie: [p1.v, p2.v, kicker], name: 'Two Pair' };
    }

    if (trips.length === 0) {
      const pair = groups.find((g) => g.c === 2);
      if (pair) {
        const kickers = groups
          .filter((g) => g.v !== pair.v)
          .map((g) => g.v)
          .sort((a, b) => b - a)
          .slice(0, 3);
        return { cat: 1, tie: [pair.v, ...kickers], name: 'One Pair' };
      }
    }

    const top = values.sort((a, b) => b - a).slice(0, 5);
    return { cat: 0, tie: top, name: 'High Card' };
  }

  function compare(a, b) {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const len = Math.max(a.tie.length, b.tie.length);
    for (let i = 0; i < len; i++) {
      const av = a.tie[i] || 0;
      const bv = b.tie[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  return {
    SUITS,
    RANKS,
    makeDeck,
    shuffle,
    rankValue,
    isRed,
    blackjackValue,
    isBlackjack,
    cardHTML,
    evaluate,
    compare
  };
})();
