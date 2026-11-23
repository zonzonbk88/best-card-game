// The Emberfall catalogue: every card in the game, written for this duel alone.
// Elements are told apart by colour AND shape, never by text alone:
//   ember ◆ burnt orange, tide ● deep blue, grove ▲ leaf green, storm ★ gold.
// A "ward" is a creature that stays on the table; a "charm" is a one-shot spell.
// `arrive` names an effect a ward triggers as it is played. `swift` wards may
// attack the turn they arrive; `bulwark` wards must be attacked before anything
// behind them. Numbers on charms grow by 1 when the charm is Kindled (see engine).
export const ELEMENTS = {
  ember: { name: 'Ember', glyph: '◆', colour: '#e2572b', soft: '#ffd9c4' },
  tide: { name: 'Tide', glyph: '●', colour: '#2b7de2', soft: '#cfe6ff' },
  grove: { name: 'Grove', glyph: '▲', colour: '#3fa34d', soft: '#d6f2d8' },
  storm: { name: 'Storm', glyph: '★', colour: '#d9a41c', soft: '#fdf0bd' },
};

export const CARDS = {
  cinderImp: { name: 'Cinder Imp', element: 'ember', cost: 1, kind: 'ward', power: 2, guard: 1, text: 'Small, rude, flammable.' },
  ashenHound: { name: 'Ashen Hound', element: 'ember', cost: 2, kind: 'ward', power: 3, guard: 2, text: 'It fetches only embers.' },
  pyreColossus: { name: 'Pyre Colossus', element: 'ember', cost: 5, kind: 'ward', power: 6, guard: 5, text: 'A bonfire that learned to walk.' },
  kindleBolt: { name: 'Kindle Bolt', element: 'ember', cost: 1, kind: 'charm', effect: 'bolt', amount: 2, text: 'Deal 2 damage to a ward or duelist.' },
  wildfire: { name: 'Wildfire', element: 'ember', cost: 4, kind: 'charm', effect: 'wildfire', amount: 3, text: 'Deal 3 damage to every enemy ward.' },
  mistSprite: { name: 'Mist Sprite', element: 'tide', cost: 1, kind: 'ward', power: 1, guard: 2, arrive: 'mend', text: 'Arrive: restore 1 life.' },
  reefTurtle: { name: 'Reef Turtle', element: 'tide', cost: 2, kind: 'ward', power: 1, guard: 5, bulwark: true, text: 'Bulwark. Slow, and proud of it.' },
  tidalSerpent: { name: 'Tidal Serpent', element: 'tide', cost: 4, kind: 'ward', power: 4, guard: 5, text: 'It swims through the table itself.' },
  healingRain: { name: 'Healing Rain', element: 'tide', cost: 2, kind: 'charm', effect: 'mend', amount: 4, text: 'Restore 4 life to your duelist.' },
  secondTide: { name: 'Second Tide', element: 'tide', cost: 3, kind: 'charm', effect: 'draw', amount: 2, text: 'Draw 2 cards.' },
  thornbackCub: { name: 'Thornback Cub', element: 'grove', cost: 1, kind: 'ward', power: 2, guard: 2, text: 'Pet it once. Once.' },
  briarGolem: { name: 'Briar Golem', element: 'grove', cost: 3, kind: 'ward', power: 3, guard: 4, bulwark: true, text: 'Bulwark. A fence with opinions.' },
  elderwoodTitan: { name: 'Elderwood Titan', element: 'grove', cost: 6, kind: 'ward', power: 6, guard: 8, text: 'Older than the duel itself.' },
  overgrowth: { name: 'Overgrowth', element: 'grove', cost: 2, kind: 'charm', effect: 'grow', amount: 2, text: 'Give a ward +2 power and +2 guard.' },
  uproot: { name: 'Uproot', element: 'grove', cost: 1, kind: 'charm', effect: 'uproot', amount: 2, text: 'Banish an enemy ward, power 2 or less.' },
  sparkFalcon: { name: 'Spark Falcon', element: 'storm', cost: 2, kind: 'ward', power: 3, guard: 1, swift: true, text: 'Swift. Gone before the thunder.' },
  voltCharger: { name: 'Volt Charger', element: 'storm', cost: 3, kind: 'ward', power: 4, guard: 3, text: 'It counts to one, then charges.' },
  tempestRoc: { name: 'Tempest Roc', element: 'storm', cost: 5, kind: 'ward', power: 5, guard: 5, swift: true, text: 'Swift. The sky, objecting loudly.' },
  chainSpark: { name: 'Chain Spark', element: 'storm', cost: 2, kind: 'charm', effect: 'chain', amount: 2, text: 'Deal 2 to a ward, 1 to its duelist.' },
  surge: { name: 'Surge', element: 'storm', cost: 1, kind: 'charm', effect: 'surge', amount: 2, text: 'Gain 2 aether this turn.' },
};

/** The 26-card deck both duelists draw from: two copies of the cheap cards, one of the rest. */
export function buildDeckList() {
  const list = [];
  const add = (id, copies) => {
    for (let i = 0; i < copies; i += 1) list.push(id);
  };
  add('cinderImp', 2);
  add('kindleBolt', 2);
  add('mistSprite', 2);
  add('thornbackCub', 2);
  add('surge', 2);
  add('ashenHound', 1);
  add('reefTurtle', 1);
  add('sparkFalcon', 1);
  add('healingRain', 1);
  add('overgrowth', 1);
  add('uproot', 1);
  add('chainSpark', 1);
  add('briarGolem', 1);
  add('voltCharger', 1);
  add('secondTide', 1);
  add('tidalSerpent', 1);
  add('wildfire', 1);
  add('pyreColossus', 1);
  add('tempestRoc', 1);
  add('elderwoodTitan', 1);
  return list;
}
