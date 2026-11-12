# The Casino of All Trades

Play-money casino games in the browser: Blackjack, Texas Hold'em, Roulette, Slots,
Baccarat, Craps, Video Poker, Keno, Three Card Poker, Let It Ride, War and Sic Bo.

**Play: https://hannah-cjb.github.io/casino-of-all-trades-web/**

No account, no real money. The wallet is stored locally in your browser.

## Phone

Open the same URL on a phone. The layout switches to a two-column lobby with
touch-sized controls, and every table fits a portrait screen.

## Desktop app

The Windows build lives in a separate private repository. This repo only contains
the static web edition.

## Development

Everything here is plain HTML, CSS and JavaScript with no build step. Serve the
folder with any static server, for example:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.
