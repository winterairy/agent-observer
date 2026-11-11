# Third-party notices

## pixel-agent-desk

Portions of this project are derived from https://github.com/Mgpixelart/pixel-agent-desk.

MIT License

Copyright (c) 2025 geunilbae

The full license text is in `vendor/pixel-agent-desk/LICENSE`. Art assets of that
project are under a separate restrictive license and are not included here.

### Derived files

| File in this project | Derived from | What was taken |
|---|---|---|
| `src/cost/pricing.ts` | `vendor/pixel-agent-desk/src/pricing.js` | Cost formula shape (cache read = input price × multiplier, cache write = input price × 1.25, rounding to 5 decimals). Price values were not copied; they were re-checked against Anthropic's public pricing page (see the file header). |
