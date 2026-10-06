// The playable hipsters. Each one carries their own drink, which is also their extra life.

export const CHARACTERS = [
  {
    id: 'sophie',
    name: 'Sophie',
    drink: { name: 'Oat flat white', kind: 'cup', body: 0xffffff, lid: 0x6b4a2f, sleeve: 0xc8a27a, splash: 0x6b4a2f },
  },
  {
    id: 'alex',
    name: 'Alex',
    drink: { name: 'Iced matcha', kind: 'cup', body: 0xa8d08d, lid: 0xf5f5f5, straw: 0x2e7d32, splash: 0x7cb342 },
  },
  {
    id: 'joe',
    name: 'Joe',
    drink: { name: 'Black batch brew', kind: 'cup', body: 0x1b1b1b, lid: 0x1b1b1b, sleeve: 0xe8e2d4, splash: 0x2b1d14 },
  },
  {
    id: 'josh',
    name: 'Josh',
    drink: { name: 'Energy drink', kind: 'can', body: 0x1e5bd8, lid: 0xc0c0c0, band: 0xf5d000, splash: 0xe8e05a },
  },
];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// The HUD icon for a drink
export function drinkSvg(d) {
  if (d.kind === 'can') {
    return `<svg viewBox="0 0 24 32" aria-hidden="true">
      <rect x="5" y="4" width="14" height="26" rx="2" fill="${css(d.body)}"/>
      <rect x="5" y="4" width="14" height="3" fill="${css(d.lid)}"/>
      <rect x="5" y="15" width="14" height="5" fill="${css(d.band)}"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 32" aria-hidden="true">
    ${d.straw ? `<rect x="13" y="0" width="2.5" height="6" fill="${css(d.straw)}"/>` : ''}
    <rect x="2.5" y="3" width="19" height="5" rx="1.5" fill="${css(d.lid)}"/>
    <path d="M4 8h16l-2 22H6z" fill="${css(d.body)}" stroke="#1b1b1b" stroke-width="0.6"/>
    ${d.sleeve ? `<path d="M4.6 13h14.8l-0.8 9H5.4z" fill="${css(d.sleeve)}"/>` : ''}
  </svg>`;
}
