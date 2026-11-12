window.Wallet = (() => {
  const KEY = 'casino_of_all_trades_wallet_v1';
  const START = 1000;
  const stored = localStorage.getItem(KEY);
  let balance = stored === null ? NaN : Number(stored);

  if (!Number.isFinite(balance) || balance < 0) balance = START;
  localStorage.setItem(KEY, String(balance));

  const listeners = new Set();

  function save() {
    localStorage.setItem(KEY, String(balance));
  }

  function notify() {
    listeners.forEach((fn) => fn(balance));
  }

  function set(value) {
    balance = Math.max(0, Math.round(value));
    save();
    notify();
  }

  function get() {
    return balance;
  }

  function add(value) {
    set(balance + value);
  }

  function bet(value) {
    if (value <= 0 || value > balance) return false;
    set(balance - value);
    return true;
  }

  function onChange(fn) {
    listeners.add(fn);
    fn(balance);
    return () => listeners.delete(fn);
  }

  function refill() {
    set(START);
  }

  return { get, add, bet, set, onChange, refill };
})();
