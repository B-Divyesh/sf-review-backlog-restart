const subjects = [
  ['Spanish::Core', 'la cosecha', 'the harvest'],
  ['Spanish::Core', 'acordarse de', 'to remember'],
  ['Spanish::Listening', '¿A qué hora?', 'At what time?'],
  ['Biology', 'mitochondrial matrix', 'space inside the inner membrane'],
  ['Biology', 'allosteric site', 'regulatory binding site'],
  ['Geography', 'Salar de Uyuni', 'salt flat in Bolivia'],
  ['French::Travel', 'le quai', 'the platform'],
  ['History', 'Treaty of Tordesillas', '1494 division of claimed overseas land'],
  ['Chemistry', 'activation energy', 'minimum energy for a reaction'],
  ['Japanese::Core', '約束', 'promise'],
  ['Music theory', 'secondary dominant', 'dominant chord borrowed from another key'],
  ['Anatomy', 'brachial plexus', 'nerve network serving the arm'],
];

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/** A 120-card, mixed-difficulty return-to-study sample for the isolated demo. */
export function sampleCsv(): string {
  const lines = ['Deck,Front,Back,Due,Interval,Lapses,Reviews,Ease,Tags'];
  for (let index = 0; index < 120; index += 1) {
    const [deck, front, back] = subjects[index % subjects.length];
    const interval = 2 + ((index * 7) % 39);
    const lapses = index % 9 === 0 ? 4 : index % 5 === 0 ? 2 : index % 3 === 0 ? 1 : 0;
    const overdue = 3 + ((index * 11) % 74);
    const reviews = 3 + ((index * 5) % 28);
    const ease = (2.15 + ((index % 7) * 0.08)).toFixed(2);
    lines.push(`${deck},${front} ${index + 1},${back},${isoDaysAgo(overdue)},${interval},${lapses},${reviews},${ease},restart-sample`);
  }
  return lines.join('\n');
}

export const SAMPLE_SOURCE_NAME = 'Sample 120-card return deck.csv';
