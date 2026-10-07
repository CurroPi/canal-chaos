// Milestone titles, celebrated every 250 points. Within each tier they're picked at random,
// so every run is a bit different; the big ones at 3000, 3500 and 4000 are always the same.

const t = (title, line) => ({ title, line });

export const TIERS = [
  {
    upTo: 750, // newcomer
    titles: [
      t('FRESH OFF THE OVERGROUND', 'Haggerston. One stop too far.'),
      t('SATURDAY CHANCER', 'You thought the towpath would be quiet.'),
      t('VICTORIA PARK VISITOR', 'You came for the Pavilion. You stayed for the chaos.'),
      t('LOYALTY CARD STAMPED', 'Nine more and the oat flat white is free.'),
      t('OAT MILK INITIATE', 'You asked if it was barista edition.'),
      t('SOURDOUGH QUEUER', '45 minutes. Worth it.'),
    ],
  },
  {
    upTo: 1750, // getting local
    titles: [
      t('PROPER LOCAL', 'You now call it "the Fields".'),
      t('NETIL MARKET REGULAR', 'You know which stall does the good bao.'),
      t('PLANT PARENT', 'Three Monsteras. One radiator.'),
      t('DALSTON AFTER DARK', 'You\'ve been to a gig in a former bank.'),
      t('NATURAL WINE CERTIFIED', 'It\'s a bit funky. In a good way.'),
      t('BROADWAY MARKET VIP', 'The cheese man knows your name.'),
      t('SHARED SPACE DIPLOMAT', 'You said sorry to a Lime bike.'),
      t('COLUMBIA ROAD SUNDAY', 'You bought eucalyptus you didn\'t need.'),
    ],
  },
  {
    upTo: 2750, // deep Hackney
    titles: [
      t('HOUSEBOAT ELIGIBLE', 'You smell faintly of woodsmoke.'),
      t('RUN CLUB DEFECTOR', 'You\'ve seen what they do after brunch.'),
      t('E8 ROYALTY', 'Your rent just went up again.'),
      t('WICK WAREHOUSE RESIDENT', 'Your landlord calls it a "live/work space".'),
      t('CLAPTON CONVERT', 'You say "Lower Clapton" to sound edgier.'),
    ],
  },
];

// Always the same, so they feel like real achievements
export const FIXED = {
  3000: t('GENTRIFICATION COMPLETE', 'Congratulations. You are the problem now.'),
  3500: t('PRICED OUT', 'You\'ve moved to Walthamstow. Keep walking.'),
  4000: t('HACKNEY LEGEND', 'Your blue plaque is awaiting planning permission.'),
};

const ALL = TIERS.flatMap((tier) => tier.titles);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// The title for a milestone, avoiding any already shown this run (`used` is a Set of titles)
export function titleFor(points, used) {
  if (FIXED[points]) return FIXED[points];
  const tier = TIERS.find((x) => points <= x.upTo);
  const fresh = (list) => list.filter((x) => !used.has(x.title));
  const choice = pick(fresh(tier ? tier.titles : ALL)) || pick(fresh(ALL)) || pick(ALL);
  used.add(choice.title);
  return choice;
}
