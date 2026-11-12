window.SicBo = (() => {
  const PIPS = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9]
  };

  let chip = 25;
  let betType = null;
  let wager = 0;
  let rolling = false;
  let dice = [1, 1, 1];
  let history = [];
  let forced = null;
  let animTimer = null;
  const timers = [];

  function setMessage(text, cls) {
    const el = document.getElementById('sicboMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
  }

  function rollDie() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function renderDie(el, value) {
    el.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
      const pip = document.createElement('span');
      pip.className = 'pip' + (PIPS[value].includes(i) ? ' on' : '');
      el.appendChild(pip);
    }
  }

  function renderDice() {
    dice.forEach((value, i) => renderDie(document.getElementById(`sdie${i}`), value));
  }

  function buildChips() {
    const wrap = document.getElementById('sicboChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Sets the Sic Bo wager to ${value} chips.`;
      btn.addEventListener('click', () => {
        if (rolling) return;
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

  function choose(type) {
    if (rolling) return;
    betType = type;
    Sound.chip();
    render();
  }

  function render() {
    document.getElementById('sicboBet').textContent = App.format(wager || (betType ? chip : 0));
    renderDice();

    document.querySelectorAll('[data-sicbo]').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.sicbo === betType);
      btn.disabled = rolling;
    });

    document.querySelectorAll('#sicboChips .chip').forEach((c) => {
      c.style.opacity = rolling ? '0.4' : '1';
      c.style.pointerEvents = rolling ? 'none' : 'auto';
    });

    const sum = dice[0] + dice[1] + dice[2];
    document.getElementById('sicboRoll').disabled = rolling || !betType || chip > Wallet.get();
    document.getElementById('sicboHistory').innerHTML = history
      .map((s) => `<span class="${s === 7 ? 'seven' : ''}">${s}</span>`)
      .join('');

    if (window.App && App.setSideLive) {
      App.setSideLive(
        `Dice: <b>${dice.join(' \u00b7 ')}</b> (${sum})<br>Bet: <b>${betType ? labelFor(betType) : 'none'}</b> \u00b7 ${App.format(wager || chip)}`
      );
    }
  }

  function labelFor(type) {
    return {
      small: 'Small 4-10',
      big: 'Big 11-17',
      triple: 'Any Triple',
      four: 'Total 4',
      seventeen: 'Total 17'
    }[type] || type;
  }

  function roll() {
    if (rolling || !betType) return;
    if (!Wallet.bet(chip)) {
      setMessage('Not enough chips for that bet.', 'lose');
      return;
    }
    wager = chip;
    rolling = true;
    render();
    setMessage('Rolling...');
    Sound.spinStart();

    animTimer = setInterval(() => {
      dice = [rollDie(), rollDie(), rollDie()];
      renderDice();
      Sound.tick();
    }, 85);

    const final = forced ? forced.slice() : [rollDie(), rollDie(), rollDie()];
    forced = null;
    timers.push(setTimeout(() => {
      if (animTimer) {
        clearInterval(animTimer);
        animTimer = null;
      }
      dice = final;
      renderDice();
      resolve();
    }, 950));
  }

  function resolve() {
    const sum = dice[0] + dice[1] + dice[2];
    const triple = dice[0] === dice[1] && dice[1] === dice[2];
    let ret = 0;
    let desc = '';

    if (betType === 'small') {
      if (!triple && sum >= 4 && sum <= 10) {
        ret = wager * 2;
        desc = `Small ${sum} wins`;
      } else {
        desc = triple ? `Triple ${dice[0]} kills Small` : `Small ${sum} loses`;
      }
    } else if (betType === 'big') {
      if (!triple && sum >= 11 && sum <= 17) {
        ret = wager * 2;
        desc = `Big ${sum} wins`;
      } else {
        desc = triple ? `Triple ${dice[0]} kills Big` : `Big ${sum} loses`;
      }
    } else if (betType === 'triple') {
      if (triple) {
        ret = wager * 31;
        desc = `Triple ${dice[0]}!`;
      } else {
        desc = `No triple (${sum})`;
      }
    } else if (betType === 'four') {
      if (sum === 4) {
        ret = wager * 61;
        desc = 'Total 4!';
      } else {
        desc = `Total ${sum}, not 4`;
      }
    } else if (betType === 'seventeen') {
      if (sum === 17) {
        ret = wager * 61;
        desc = 'Total 17!';
      } else {
        desc = `Total ${sum}, not 17`;
      }
    }

    if (ret > 0) Wallet.add(ret);
    rolling = false;
    wager = 0;
    history.unshift(sum);
    history = history.slice(0, 8);

    if (ret > 0) {
      setMessage(`${desc}. Paid ${App.format(ret)}.`, 'win');
      Sound.win();
    } else {
      setMessage(`${desc}. Wager lost.`, 'lose');
      Sound.lose();
    }
    render();
  }

  function init() {
    buildChips();
    document.querySelectorAll('[data-sicbo]').forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.sicbo));
    });
    document.getElementById('sicboRoll').addEventListener('click', roll);
    dice = [rollDie(), rollDie(), rollDie()];
    render();
  }

  function show() {
    render();
  }

  function hide() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
    timers.splice(0).forEach((id) => clearTimeout(id));
    rolling = false;
    wager = 0;
    forced = null;
  }

  function _testSetDice(values) {
    if (location.hash === '#test') forced = values.slice();
  }

  const api = { init, show, hide };
  if (location.hash === '#test') api._test = { setDice: _testSetDice };
  return api;
})();
