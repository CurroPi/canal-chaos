// The playable hipsters. Each one carries their own drink, which is also their extra life.

export const CHARACTERS = [
  {
    id: 'sophie',
    name: 'Sophie',
    bio: 'Tote bag full of other tote bags.',
    drink: { name: 'Oat flat white', kind: 'cup', body: 0xffffff, lid: 0x6b4a2f, sleeve: 0xc8a27a, splash: 0x6b4a2f },
  },
  {
    id: 'alex',
    name: 'Alex',
    bio: 'Always wears an Aries tee. She\'s a Pisces.',
    drink: { name: 'Builder\'s tea', kind: 'cup', body: 0xffffff, lid: 0xffffff, tag: 0xffd23f, splash: 0xa0662e },
  },
  {
    id: 'joe',
    name: 'Joe',
    bio: 'Says "no problemo". Has several problemos.',
    drink: { name: 'Black batch brew', kind: 'cup', body: 0x1b1b1b, lid: 0x1b1b1b, sleeve: 0xe8e2d4, splash: 0x2b1d14 },
  },
  {
    id: 'jasper',
    name: 'Jasper',
    bio: 'Owns a sourdough starter called Kevin.',
    drink: { name: 'Matcha latte', kind: 'cup', body: 0xffffff, lid: 0x6f9a3a, sleeve: 0x9ccc65, splash: 0x8bc34a },
  },
  {
    id: 'pilar', // the potter
    name: 'Pilar',
    bio: 'Does pottery on Wednesdays. Talks about it the other six days.',
    drink: { name: 'Chai in a mug she made', kind: 'mug', body: 0x8fb3a6, coffee: 0xc8935f, splash: 0xc8935f },
  },
  {
    id: 'josh',
    unlockLine: 'JOSH IS FULLY CHARGED. SO IS HIS VAPE.',
    name: 'Josh',
    bio: 'In a band. The band doesn\'t know yet.',
    drink: { name: 'Energy drink', kind: 'can', body: 0x1e5bd8, lid: 0xc0c0c0, band: 0xf5d000, splash: 0xe8e05a },
  },
  {
    id: 'ross',
    unlockLine: 'ROSS IS HERE. HE BROUGHT HIS OWN MUG.',
    name: 'Ross',
    bio: 'Brings his own mug. Brings it up constantly.',
    drink: { name: 'Flat white in his own mug', kind: 'mug', body: 0xe07a5f, coffee: 0x8a5a3a, splash: 0x6b4a2f },
  },
  {
    id: 'tanner',
    unlockLine: 'TANNER HAS HYDRATED. TANNER IS READY.',
    name: 'Tanner',
    bio: 'Dressed for K2. Walking to Broadway Market.',
    drink: { name: 'Huge water bottle', kind: 'bottle', body: 0x7fc8ff, lid: 0x1b1b1b, splash: 0x9ad7ff },
  },
  {
    id: 'david', // the real local: skinny old boy, messy grey hair, dirty boiler suit, pint of Guinness
    name: 'David',
    bio: 'Always at The Victory. Even when it\'s shut.',
    unlockLine: 'DAVID IS HERE. THE VICTORY MUST BE SHUT.',
    drink: { name: 'Pint of Guinness', kind: 'pint', body: 0x1a120d, head: 0xf3e6c8, splash: 0x2b1d14 },
  },
];

// Designed but not playable yet (not on the selection screen). Preview locally with debug.walker('david').
export const DRAFTS = [];

export const characterById = (id) => CHARACTERS.find((c) => c.id === id) || DRAFTS.find((c) => c.id === id) || CHARACTERS[0];

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
  if (d.kind === 'mug') {
    return `<svg viewBox="0 0 24 32" aria-hidden="true">
      <path d="M17 13h3a3 3 0 0 1 0 8h-3" fill="none" stroke="${css(d.body)}" stroke-width="2.5"/>
      <rect x="3" y="10" width="15" height="18" rx="2" fill="${css(d.body)}"/>
      <rect x="4.5" y="10" width="12" height="3" fill="${css(d.coffee)}"/>
    </svg>`;
  }
  if (d.kind === 'bottle') {
    return `<svg viewBox="0 0 24 32" aria-hidden="true">
      <rect x="8" y="1" width="8" height="5" rx="1" fill="${css(d.lid)}"/>
      <rect x="5" y="6" width="14" height="25" rx="3" fill="${css(d.body)}" stroke="#1b1b1b" stroke-width="0.6"/>
      <rect x="5" y="14" width="14" height="2" fill="#ffffff" opacity="0.6"/>
    </svg>`;
  }
  if (d.kind === 'pint') {
    return `<svg viewBox="0 0 24 32" aria-hidden="true">
      <path d="M4 3h16l-1.5 27h-13z" fill="${css(d.body)}" stroke="#1b1b1b" stroke-width="0.6"/>
      <path d="M4 3h16l-0.3 5h-15.4z" fill="${css(d.head)}"/>
      <rect x="6" y="10" width="1.5" height="17" fill="#ffffff" opacity="0.25"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 32" aria-hidden="true">
    ${d.straw ? `<rect x="13" y="0" width="2.5" height="6" fill="${css(d.straw)}"/>` : ''}
    <rect x="2.5" y="3" width="19" height="5" rx="1.5" fill="${css(d.lid)}" stroke="#1b1b1b" stroke-width="0.6"/>
    <path d="M4 8h16l-2 22H6z" fill="${css(d.body)}" stroke="#1b1b1b" stroke-width="0.6"/>
    ${d.sleeve ? `<path d="M4.6 13h14.8l-0.8 9H5.4z" fill="${css(d.sleeve)}"/>` : ''}
    ${d.tag ? `<path d="M15 8v8" stroke="#888" stroke-width="0.8"/><rect x="13" y="16" width="5" height="5" fill="${css(d.tag)}"/>` : ''}
  </svg>`;
}
