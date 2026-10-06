# Athlete identity font assets

Barlow (display/body) and JetBrains Mono (metadata) match the current Locker type contract documented in `app/layout.tsx` and `app/player/[slug]/LockerView.tsx`. Their local Latin WOFF2 assets were obtained from Google Fonts; the generated local declarations are in `../brand-fonts.css`. Existing Oswald/Geist/Roboto Condensed remain fallbacks and continue to serve the rest of this prototype.

CSS source: https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap

Seven unique WOFF2 files cover ten declarations (JetBrains Mono reuses its variable font). Each file was checked for the WOFF2 signature. Keep `barlow-OFL.txt` and `jetbrainsmono-OFL.txt` with these assets; licenses are from the official Google Fonts repository. No remote font requests or expanded CSP are required by the prototype.

## Moment card headings

The requested uppercase Moment headings use Barlow Condensed 700, separately from the identity typography. The local Latin file `barlow-condensed-700-latin.woff2` was downloaded from the official Google Fonts endpoint on October 2, 2026 and its WOFF2 signature was verified (22,444 bytes).

- CSS source: https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&display=swap
- Font file: https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B46r2z3bWuQ.woff2
- License: `barlowcondensed-OFL.txt`, from https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/OFL.txt

The font remains self-hosted under the existing `font-src 'self'` policy.
