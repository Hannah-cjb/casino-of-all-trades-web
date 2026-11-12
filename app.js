window.App = (() => {
  const GAMES = {
    roulette: Roulette,
    blackjack: Blackjack,
    poker: Poker,
    slots: Slots,
    baccarat: Baccarat,
    craps: Craps,
    videopoker: VideoPoker,
    keno: Keno,
    threecard: ThreeCard,
    letitride: LetItRide,
    war: War,
    sicbo: SicBo
  };
  const SCREENS = ['lobby', ...Object.keys(GAMES)];
  const GUIDES = {
    roulette: {
      title: 'Roulette',
      html: `
        <p class="g-intro">A single-zero European wheel with 37 pockets. Pick where you think the ball will land, then spin.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip value from the row above the board.</li>
          <li>Click any spot to place that chip: a number, red or black, odd or even, a dozen, a column, or low or high.</li>
          <li>Click SPIN. Winning chips pay and losing chips are collected.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Single number</span><b>35:1</b></li>
          <li><span>Dozen or column</span><b>2:1</b></li>
          <li><span>Red, black, odd, even, low, high</span><b>1:1</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Zero beats every outside bet, and Undo removes only your last chip.</p>
      `
    },
    blackjack: {
      title: 'Blackjack',
      html: `
        <p class="g-intro">Get closer to 21 than the dealer without going over. The dealer stands on 17 and blackjack pays 3:2.</p>
        <h4>Card values</h4>
        <ul class="g-pay">
          <li><span>Ace</span><b>1 or 11</b></li>
          <li><span>2 through 10</span><b>Face value</b></li>
          <li><span>Jack, Queen, King</span><b>10</b></li>
        </ul>
        <h4>How to play</h4>
        <ol>
          <li>Click chips to build a bet, then press DEAL.</li>
          <li>Hit to draw a card, Stand to end your turn, or Double to double your bet for exactly one more card.</li>
          <li>Split when your first two cards match in value. This puts up a second equal bet and creates two hands that you play one at a time.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Natural blackjack</span><b>3:2</b></li>
          <li><span>Regular winning hand</span><b>1:1</b></li>
          <li><span>Tied hand</span><b>Push</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Split aces get one card each, and a 21 made after a split pays 1:1, not 3:2.</p>
      `
    },
    poker: {
      title: "Texas Hold'em",
      html: `
        <p class="g-intro">Four-handed no-limit against three bots. Win the pot with the best five-card hand or by making everyone fold.</p>
        <h4>How to play</h4>
        <ol>
          <li>Blinds are 10 and 20. You and the bots get two private cards, then five community cards are revealed in stages.</li>
          <li>Fold to give up the hand. Check or Call to match the current bet. Raise with the slider to apply pressure.</li>
          <li>Your best five cards come from your two plus the five on the table.</li>
        </ol>
        <h4>Hand rankings</h4>
        <ol>
          <li>Royal flush</li>
          <li>Straight flush</li>
          <li>Four of a kind</li>
          <li>Full house</li>
          <li>Flush</li>
          <li>Straight</li>
          <li>Three of a kind</li>
          <li>Two pair</li>
          <li>One pair</li>
          <li>High card</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Everyone folds</span><b>Last player wins the pot</b></li>
          <li><span>Showdown</span><b>Best hand wins the pot</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Leaving the table mid-hand refunds your contribution to that pot.</p>
      `
    },
    slots: {
      title: 'Slots',
      html: `
        <p class="g-intro">Three reels, six symbols. Match all three for the big multipliers, or catch two sevens for a small pay.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip to set the spin cost.</li>
          <li>Press SPIN and watch the reels stop left to right.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Three sevens</span><b>150&times;</b></li>
          <li><span>Three diamonds</span><b>80&times;</b></li>
          <li><span>Three stars</span><b>40&times;</b></li>
          <li><span>Three spades</span><b>25&times;</b></li>
          <li><span>Three hearts</span><b>18&times;</b></li>
          <li><span>Three clubs</span><b>12&times;</b></li>
          <li><span>Exactly two sevens</span><b>2&times;</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Smaller chips make the balance last longer, but the multipliers scale with your bet.</p>
      `
    },
    baccarat: {
      title: 'Baccarat',
      html: `
        <p class="g-intro">Punto banco. Bet on which side finishes closer to 9, and the drawing rules handle the rest.</p>
        <h4>Card values</h4>
        <ul class="g-pay">
          <li><span>Ace</span><b>1</b></li>
          <li><span>2 through 9</span><b>Face value</b></li>
          <li><span>10, Jack, Queen, King</span><b>0</b></li>
        </ul>
        <h4>How to play</h4>
        <ol>
          <li>Choose Player, Banker or Tie.</li>
          <li>Pick a chip and press DEAL.</li>
          <li>Cards are drawn automatically and only the last digit of a total matters.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Player</span><b>1:1</b></li>
          <li><span>Banker</span><b>0.95:1</b></li>
          <li><span>Tie</span><b>8:1</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> A tie pushes Player and Banker bets, and Banker has the smallest house edge.</p>
      `
    },
    craps: {
      title: 'Craps',
      html: `
        <p class="g-intro">Bet on the shooter's roll. Choose the Pass Line or Don't Pass, then ride the point.</p>
        <h4>How to play</h4>
        <ol>
          <li>Choose Pass Line or Don't Pass, pick a chip, then ROLL.</li>
          <li>On the come-out roll, 7 or 11 wins the Pass Line while 2, 3 or 12 loses it. Any other total becomes the point.</li>
          <li>While the point is on, roll it again before a 7 to win the Pass Line. A 7 before the point is a seven-out.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Pass Line</span><b>1:1</b></li>
          <li><span>Don't Pass</span><b>1:1</b></li>
          <li><span>Don't Pass on 12</span><b>Push</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> The point phase can last several rolls, and your wager stays on the table until it resolves.</p>
      `
    },
    videopoker: {
      title: 'Video Poker',
      html: `
        <p class="g-intro">Jacks or Better draw poker. You get five cards, keep what you like, and replace the rest once.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip and press DEAL.</li>
          <li>Click HOLD under any cards you want to keep.</li>
          <li>Press DRAW to replace the rest. Your final five-card hand is paid from the table.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Royal Flush</span><b>250&times;</b></li>
          <li><span>Straight Flush</span><b>50&times;</b></li>
          <li><span>Four of a Kind</span><b>25&times;</b></li>
          <li><span>Full House</span><b>9&times;</b></li>
          <li><span>Flush</span><b>6&times;</b></li>
          <li><span>Straight</span><b>4&times;</b></li>
          <li><span>Three of a Kind</span><b>3&times;</b></li>
          <li><span>Two Pair</span><b>2&times;</b></li>
          <li><span>Jacks or Better</span><b>1&times;</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> A pair of jacks or higher already pays, so never throw it away without a reason.</p>
      `
    },
    keno: {
      title: 'Keno',
      html: `
        <p class="g-intro">Pick ten numbers from 1 to 80. Twenty balls are drawn, and your ticket pays by how many you catch.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip to set the ticket price.</li>
          <li>Choose exactly ten numbers on the board.</li>
          <li>Press DRAW and watch the twenty balls appear. Matching picks light up green.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>10 catches</span><b>100&times;</b></li>
          <li><span>9 catches</span><b>20&times;</b></li>
          <li><span>8 catches</span><b>8&times;</b></li>
          <li><span>7 catches</span><b>3&times;</b></li>
          <li><span>6 catches</span><b>1&times;</b></li>
          <li><span>5 catches</span><b>0.5&times;</b></li>
          <li><span>0 catches</span><b>2&times;</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Catching zero pays a small bonus, so a busted ticket is not always a total loss.</p>
      `
    },
    threecard: {
      title: 'Three Card Poker',
      html: `
        <p class="g-intro">You and the dealer each get three cards. Beat the dealer's hand after choosing to play or fold.</p>
        <h4>How to play</h4>
        <ol>
          <li>Post an ante and press DEAL. You see your three cards; the dealer's stay hidden.</li>
          <li>Fold to lose the ante, or Play to match it and reveal the dealer.</li>
          <li>The dealer must hold a queen-high or better to qualify. If not, your ante pays and the play bet pushes.</li>
        </ol>
        <h4>Hand order</h4>
        <ol>
          <li>Straight flush</li>
          <li>Three of a kind</li>
          <li>Straight</li>
          <li>Flush</li>
          <li>One pair</li>
          <li>High card</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Ante and play win</span><b>1:1 each</b></li>
          <li><span>Straight ante bonus</span><b>1:1</b></li>
          <li><span>Three of a kind ante bonus</span><b>4:1</b></li>
          <li><span>Straight flush ante bonus</span><b>5:1</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Play any pair or better, and fold most queen-high hands unless you are chasing the straight bonus.</p>
      `
    },
    letitride: {
      title: 'Let It Ride',
      html: `
        <p class="g-intro">A five-card poker game with three equal bets and two chances to take a bet back.</p>
        <h4>How to play</h4>
        <ol>
          <li>Deal posts three equal bets and gives you three cards. The dealer gets two community cards, face down.</li>
          <li>After your cards, Pull Back the third bet or Let It Ride and reveal the first community card.</li>
          <li>Repeat once more, then both community cards show and the five-card hand pays.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Royal flush</span><b>1000&times;</b></li>
          <li><span>Straight flush</span><b>200&times;</b></li>
          <li><span>Four of a kind</span><b>50&times;</b></li>
          <li><span>Full house</span><b>11&times;</b></li>
          <li><span>Flush</span><b>8&times;</b></li>
          <li><span>Straight</span><b>5&times;</b></li>
          <li><span>Three of a kind</span><b>3&times;</b></li>
          <li><span>Two pair</span><b>2&times;</b></li>
          <li><span>Pair of tens or better</span><b>1&times;</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Multipliers apply to every bet still in play, so riding a strong hand can pay three times over.</p>
      `
    },
    war: {
      title: 'War',
      html: `
        <p class="g-intro">The simplest showdown in the house: one card each, highest rank wins.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip and press DEAL. You and the dealer flip one card.</li>
          <li>Higher card wins 1:1. A tie starts a war.</li>
          <li>On a tie, surrender and take back half your wager, or Go to War by posting another equal bet and dealing until the tie breaks.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Higher card</span><b>1:1</b></li>
          <li><span>War win</span><b>1:1 plus both stakes back</b></li>
          <li><span>Surrender after a tie</span><b>Half the wager back</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> War is a coin flip with a house edge, so surrender is the cheaper escape from a tie.</p>
      `
    },
    sicbo: {
      title: 'Sic Bo',
      html: `
        <p class="g-intro">Three dice, one roll, and a spread of bets on the total and whether all three match.</p>
        <h4>How to play</h4>
        <ol>
          <li>Pick a chip and choose Small, Big, Any Triple, Total 4 or Total 17.</li>
          <li>Press ROLL. All three dice settle at once.</li>
          <li>Small covers 4 to 10 and Big covers 11 to 17. Any triple beats both of them.</li>
        </ol>
        <h4>Payouts</h4>
        <ul class="g-pay">
          <li><span>Small or Big</span><b>1:1</b></li>
          <li><span>Any triple</span><b>30:1</b></li>
          <li><span>Total 4 or 17</span><b>60:1</b></li>
        </ul>
        <p class="g-tip"><b>Tip:</b> Small and Big lose on triples, which is exactly why the triple bet pays so much.</p>
      `
    }
  };

  let current = 'lobby';
  let guideReturn = null;
  let sideOpen = false;

  function format(value) {
    return Math.round(value).toLocaleString('en-US');
  }

  function updateBalance(value) {
    const pill = document.getElementById('balancePill');
    document.getElementById('balanceValue').textContent = format(value);
    pill.classList.remove('bump');
    void pill.offsetWidth;
    pill.classList.add('bump');
  }

  function renderSide(name) {
    const guide = GUIDES[name];
    if (!guide) return;
    document.getElementById('sideTitle').textContent = `${guide.title} \u00b7 reference`;
    document.getElementById('sideBody').innerHTML = guide.html;
    document.getElementById('sideLive').innerHTML = '';
  }

  function applySide() {
    const panel = document.getElementById('sidePanel');
    const toggle = document.getElementById('sideToggle');
    const inGame = current !== 'lobby';
    toggle.classList.toggle('hidden', !inGame || sideOpen);
    panel.classList.toggle('open', inGame && sideOpen);
    panel.setAttribute('aria-hidden', inGame && sideOpen ? 'false' : 'true');
  }

  function setSideOpen(open) {
    sideOpen = Boolean(open);
    applySide();
  }

  function setSideLive(html) {
    const el = document.getElementById('sideLive');
    if (el) el.innerHTML = html;
  }

  function show(name) {
    if (!SCREENS.includes(name) || name === current) return;
    closeGuide();
    Tooltips.hide();
    const previous = GAMES[current];
    if (previous && previous.hide) previous.hide();

    document.getElementById(current).classList.remove('active');
    document.getElementById(name).classList.add('active');
    current = name;

    if (name === 'lobby') {
      setSideOpen(false);
    } else {
      renderSide(name);
      applySide();
    }

    const next = GAMES[name];
    if (next && next.show) next.show();
  }

  function openGuide(key) {
    const guide = GUIDES[key];
    if (!guide) return;
    guideReturn = document.activeElement;
    document.getElementById('guideTitle').textContent = guide.title;
    document.getElementById('guideBody').innerHTML = guide.html;
    document.getElementById('guideOverlay').hidden = false;
    Tooltips.abort();
    Sound.click();
    document.getElementById('guideClose').focus();
  }

  function closeGuide() {
    const overlay = document.getElementById('guideOverlay');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    if (guideReturn && guideReturn.focus) guideReturn.focus();
    guideReturn = null;
  }

  function init() {
    Wallet.onChange(updateBalance);

    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Sound.click();
        show('lobby');
      });
    });

    document.querySelectorAll('.game-card').forEach((card) => {
      card.addEventListener('click', () => {
        Sound.click();
        Sound.chip();
        show(card.dataset.game);
      });
    });

    document.querySelectorAll('[data-guide]').forEach((btn) => {
      btn.addEventListener('click', () => openGuide(btn.dataset.guide));
    });

    document.getElementById('guideClose').addEventListener('click', closeGuide);
    document.getElementById('guideOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'guideOverlay') closeGuide();
    });

    document.getElementById('sideToggle').addEventListener('click', () => {
      Sound.click();
      setSideOpen(true);
    });
    document.getElementById('sideClose').addEventListener('click', () => {
      Sound.click();
      setSideOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!document.getElementById('guideOverlay').hidden) closeGuide();
      else if (sideOpen) setSideOpen(false);
    });

    document.getElementById('refillBtn').addEventListener('click', () => {
      Wallet.add(1000);
      Sound.win();
    });

    document.getElementById('topupBtn').addEventListener('click', () => {
      Wallet.add(1000);
      Sound.win();
    });

    const muteBtn = document.getElementById('muteBtn');
    muteBtn.addEventListener('click', () => {
      Sound.setMuted(!Sound.isMuted());
      muteBtn.textContent = Sound.isMuted() ? 'SFX OFF' : 'SFX ON';
    });

    Object.values(GAMES).forEach((game) => {
      if (game.init) game.init();
    });

    applySide();
    updateBalance(Wallet.get());
  }

  return { init, show, format, setSideLive };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
