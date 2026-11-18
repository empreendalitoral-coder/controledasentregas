function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dias seguidos com lançamento (trabalho ou folga), terminando hoje ou ontem. */
export function launchStreak(records: readonly { data: string }[], now = new Date()) {
  const dias = new Set(records.map((r) => r.data.slice(0, 10)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lancouHoje = dias.has(ymdLocal(cursor));
  if (!lancouHoje) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dias.has(ymdLocal(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { count, lancouHoje };
}
