window.Craps = (() => {
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
  let phase = 'comeout';
  let point = 0;
  let rolling = false;
  let dice = [1, 1];
  let history = [];
  let animTimer = null;
  const timers = [];

  function rollDie() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function setMessage(text, cls) {
    const el = document.getElementById('crapsMessage');
    el.textContent = text;
    el.className = `table-message${cls ? ' ' + cls : ''}`;
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
    renderDie(document.getElementById('die0'), dice[0]);
    renderDie(document.getElementById('die1'), dice[1]);
  }

  function buildChips() {
    const wrap = document.getElementById('crapsChips');
    wrap.innerHTML = '';
    [5, 25, 100, 500].forEach((value) => {
      const btn = document.createElement('button');
      btn.className = `chip chip-${value}${value === chip ? ' selected' : ''}`;
      btn.textContent = value;
      btn.dataset.value = value;
      btn.dataset.tip = `Selects a ${value}-chip wager.`;
      btn.addEventListener('click', () => {
        if (rolling || phase === 'point') return;
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
    if (rolling || phase === 'point') return;
    betType = type;
    Sound.chip();
    render();
  }

  function render() {
    const puck = document.getElementById('crapsPuck');
    puck.textContent = phase === 'point' ? `POINT ${point}` : 'COME OUT';
    puck.classList.toggle('point', phase === 'point');

    document.getElementById('crapsBet').textContent = App.format(wager || (betType ? chip : 0));
    renderDice();

    document.querySelectorAll('[data-craps]').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.craps === betType);
      btn.disabled = rolling || phase === 'point';
    });

    document.querySelectorAll('#crapsChips .chip').forEach((c) => {
      const disabled = rolling || phase === 'point';
      c.style.opacity = disabled ? '0.4' : '1';
      c.style.pointerEvents = disabled ? 'none' : 'auto';
    });

    const roll = document.getElementById('crapsRoll');
    roll.disabled = rolling || (phase === 'comeout' && !betType) || (phase === 'comeout' && chip > Wallet.get());

    document.getElementById('crapsHistory').innerHTML = history
      .map((sum) => `<span class="${sum === 7 ? 'seven' : ''}">${sum}</span>`)
      .join('');

    if (window.App && App.setSideLive) {
      const phaseLabel = phase === 'point' ? `Point ${point}` : 'Come Out';
      App.setSideLive(`Phase: <b>${phaseLabel}</b><br>Wager: <b>${App.format(wager || (betType ? chip : 0))}</b>`);
    }
  }

  function roll() {
    if (rolling) return;
    if (phase === 'comeout') {
      if (!betType) return;
      if (!Wallet.bet(chip)) {
        setMessage('Not enough chips for that roll.', 'lose');
        return;
      }
      wager = chip;
    }
    rolling = true;
    render();
    setMessage('Rolling...');
    Sound.spinStart();

    animTimer = setInterval(() => {
      dice = [rollDie(), rollDie()];
      renderDice();
      Sound.tick();
    }, 85);

    const final = [rollDie(), rollDie()];
    timers.push(setTimeout(() => {
      if (animTimer) {
        clearInterval(animTimer);
        animTimer = null;
      }
      dice = final;
      renderDice();
      resolve(final[0], final[1]);
    }, 950));
  }

  function finish(ret, text, cls) {
    Wallet.add(ret);
    wager = 0;
    phase = 'comeout';
    point = 0;
    rolling = false;
    setMessage(text, cls);
    if (cls === 'win') Sound.win();
    else if (cls === 'push') Sound.click();
    else Sound.lose();
    render();
  }

  function resolve(a, b) {
    const sum = a + b;

    if (phase === 'comeout') {
      if (sum === 7 || sum === 11) {
        if (betType === 'pass') {
          const ret = wager * 2;
          addHistory(sum);
          return finish(ret, `Natural ${sum}! Pass line wins ${App.format(wager)}.`, 'win');
        }
        addHistory(sum);
        return finish(0, `Natural ${sum}. Don't pass loses ${App.format(wager)}.`, 'lose');
      }
      if (sum === 2 || sum === 3 || sum === 12) {
        addHistory(sum);
        if (betType === 'dont') {
          if (sum === 12) return finish(wager, 'Boxcars 12. Don\'t pass pushes.', 'push');
          return finish(wager * 2, `Craps ${sum}! Don't pass wins ${App.format(wager)}.`, 'win');
        }
        return finish(0, `Craps ${sum}. Pass line loses ${App.format(wager)}.`, 'lose');
      }
      point = sum;
      phase = 'point';
      rolling = false;
      addHistory(sum);
      setMessage(`Point is ${sum}. Roll again.`);
      Sound.click();
      render();
      return;
    }

    addHistory(sum);

    if (sum === point) {
      if (betType === 'pass') {
        return finish(wager * 2, `Point ${point} hit! Pass line wins ${App.format(wager)}.`, 'win');
      }
      return finish(0, `Point ${point} hit. Don't pass loses ${App.format(wager)}.`, 'lose');
    }

    if (sum === 7) {
      if (betType === 'dont') {
        return finish(wager * 2, `Seven out. Don't pass wins ${App.format(wager)}.`, 'win');
      }
      return finish(0, `Seven out. Pass line loses ${App.format(wager)}.`, 'lose');
    }

    rolling = false;
    setMessage(`Rolled ${sum}. Point is ${point}.`);
    Sound.click();
    render();
  }

  function addHistory(sum) {
    history.unshift(sum);
    history = history.slice(0, 8);
  }

  function init() {
    buildChips();
    document.querySelectorAll('[data-craps]').forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.craps));
    });
    document.getElementById('crapsRoll').addEventListener('click', roll);
    dice = [rollDie(), rollDie()];
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
    if (phase === 'point') {
      phase = 'comeout';
      point = 0;
      wager = 0;
    }
  }

  return { init, show, hide };
})();
