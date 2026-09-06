# Clancifer ($CLANCIFER)

Meme coin landing page for a Pump.fun / Solana fair launch.

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## After you launch on Pump.fun

Edit `config.js`:

- `contractAddress` — mint / CA
- `pumpUrl` — `https://pump.fun/coin/<mint>`
- `twitterUrl` / `telegramUrl` — your socials

## Pump.fun listing checklist

1. Wallet with a little SOL (Phantom/Solflare)
2. Go to https://pump.fun → Create
3. Name: `Clancifer`
4. Ticker: `CLANCIFER`
5. Description: short meme lore (see site tagline)
6. Image: square logo (~1000×1000 PNG)
7. Website: your deployed URL for this site
8. Optional: X + Telegram links
9. Create coin → share the CA everywhere

## Deploy ideas

- Cloudflare Pages / Netlify / GitHub Pages / any static host
- Point a custom domain at it when ready
