// Pure logic shared by the panel and the tests: monthly reset timing, checklist state, drop rates.
(function (root) {
  const HOUR = 3600 * 1000;
  // Monthly limits reset on the 1st at 05:00 JST (UTC+9). Shifting by +4h makes that moment midnight UTC.
  const RESET_SHIFT = 4 * HOUR;
  const TOTAL_CAP = 300;

  function periodKey(now) {
    const d = new Date(now.getTime() + RESET_SHIFT);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  }

  function nextReset(now) {
    const d = new Date(now.getTime() + RESET_SHIFT);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, -4));
  }

  // Weekly limits reset every Monday 05:00 JST. With the same +4h shift that moment is Monday 00:00 UTC.
  function weekStart(now) {
    const d = new Date(now.getTime() + RESET_SHIFT);
    const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return new Date(day - ((d.getUTCDay() + 6) % 7) * 24 * HOUR);
  }
  function weekKey(now) {
    const s = weekStart(now);
    return s.getUTCFullYear() + '-' + String(s.getUTCMonth() + 1).padStart(2, '0') + '-' + String(s.getUTCDate()).padStart(2, '0');
  }
  function nextWeeklyReset(now) {
    return new Date(weekStart(now).getTime() + 7 * 24 * HOUR - RESET_SHIFT);
  }
  // Weekly checklist: done ids reset each week; the 패스 / 2배 options stay.
  function normalizeWeekly(w) {
    const src = w || {};
    return {
      period: typeof src.period === 'string' ? src.period : null,
      done: Object.assign({}, src.done),
      opts: Object.assign({}, src.opts)
    };
  }
  function applyWeeklyReset(w, now) {
    const state = normalizeWeekly(w);
    const key = weekKey(now);
    if (state.period === key) return { state, didReset: false };
    const hadPeriod = state.period !== null;
    state.period = key;
    state.done = {};
    return { state, didReset: hadPeriod };
  }

  // Parts of a Date as seen in Japan/Korea time (both UTC+9).
  function jstParts(date) {
    const d = new Date(date.getTime() + 9 * HOUR);
    return {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      weekday: d.getUTCDay(), hour: d.getUTCHours(), minute: d.getUTCMinutes()
    };
  }

  function formatLeft(ms) {
    const min = Math.max(0, Math.floor(ms / 60000));
    const days = Math.floor(min / 1440), hours = Math.floor((min % 1440) / 60), mins = min % 60;
    if (days > 0) return days + '일 ' + hours + '시간 남음';
    if (hours > 0) return hours + '시간 ' + mins + '분 남음';
    return mins + '분 남음';
  }

  function emptyMonthly() {
    return {
      period: null, progress: {}, hidden: [], overrides: {}, treasureKinds: {}, userQty: {},
      custom: { groups: [], items: {} }, collapsed: {}, hideDone: false, filter: 'all', lastReset: null
    };
  }

  function normalizeMonthly(m) {
    const base = emptyMonthly();
    const out = Object.assign(base, m || {});
    out.progress = Object.assign({}, out.progress);
    out.hidden = Array.isArray(out.hidden) ? out.hidden.slice() : [];
    out.overrides = Object.assign({}, out.overrides);
    out.custom = {
      groups: Array.isArray(out.custom && out.custom.groups) ? out.custom.groups.slice() : [],
      items: Object.assign({}, out.custom && out.custom.items)
    };
    out.collapsed = Object.assign({}, out.collapsed);
    const oldHalfKinds = typeof out.treasureKinds === 'object' && out.treasureKinds ? out.treasureKinds['treasure-half'] : (typeof out.treasureKinds === 'number' ? out.treasureKinds : undefined);
    out.treasureKinds = normalizeKinds(out.treasureKinds);
    out.userQty = {};
    for (const [id, n] of Object.entries((m && m.userQty) || {})) out.userQty[id] = clampQty(n);
    // Before 1.6 the 반홍 treasure total was 20 × kinds.
    if (out.userQty['treasure-half'] === undefined && oldHalfKinds !== undefined) out.userQty['treasure-half'] = 20 * clampKinds(oldHalfKinds);
    return out;
  }

  // Treasure kind counts per item id. Older saves kept one number for both items.
  function normalizeKinds(value) {
    if (typeof value === 'number' || typeof value === 'string') {
      const n = clampKinds(value);
      return { 'treasure-half': n, 'treasure-seed': n };
    }
    const out = {};
    if (value && typeof value === 'object') for (const [id, n] of Object.entries(value)) out[id] = clampKinds(n);
    return out;
  }

  function kindsFor(m, id) {
    const map = normalizeKinds(m.treasureKinds);
    return map[id] === undefined ? 13 : map[id];
  }

  function clampQty(n) {
    const v = Math.floor(Number(n));
    return isFinite(v) ? Math.min(99999, Math.max(0, v)) : 0;
  }

  function clampKinds(n) {
    const v = Math.floor(Number(n));
    if (!isFinite(v)) return 13;
    return Math.min(13, Math.max(0, v));
  }

  // Clears this month's checks once a new month (by the game's reset time) has started.
  function applyMonthlyReset(m, now) {
    const state = normalizeMonthly(m);
    const key = periodKey(now);
    if (state.period === key) return { state, didReset: false };
    const hadPeriod = state.period !== null;
    state.period = key;
    state.progress = {};
    if (hadPeriod) state.lastReset = now.toISOString();
    return { state, didReset: hadPeriod };
  }

  function resolveGroups(defaults, m, kinds) {
    const hidden = new Set(m.hidden || []);
    const overrides = m.overrides || {};
    const progress = m.progress || {};
    const custom = m.custom || { groups: [], items: {} };
    const all = defaults.map(g => Object.assign({}, g, { custom: false }))
      .concat((custom.groups || []).map(g => Object.assign({}, g, { items: [], custom: true })));
    return all.map(g => {
      const extra = ((custom.items || {})[g.id] || []).map(i => Object.assign({}, i, { custom: true }));
      const items = g.items.map(i => Object.assign({}, i, { custom: false })).concat(extra).map(i => {
        const merged = Object.assign({}, i, overrides[i.id] || {});
        const steps = Math.max(1, Math.floor(merged.steps || 1));
        const done = Math.min(steps, Math.max(0, Math.floor(progress[i.id] || 0)));
        // Treasure trades repeat once per treasure kind; the user picks how many kinds they trade.
        const perQty = Math.max(0, Number(merged.qty) || 0);
        const kindCount = merged.perKind ? kindsFor(m, i.id) : 1;
        const userQty = m.userQty || {};
        const qty = merged.userTotal && userQty[i.id] !== undefined ? clampQty(userQty[i.id]) : perQty * kindCount;
        const name = merged.name || (kinds && kinds[merged.kind] ? kinds[merged.kind].label : '');
        return Object.assign(merged, { name, qty, perQty, kinds: kindCount, steps, done, complete: done >= steps, hidden: hidden.has(i.id) });
      });
      return Object.assign(g, { items });
    });
  }

  function remaining(groups) {
    const left = { gold: 0, half: 0, seed: 0, quartz: 0, other: 0 };
    const total = { gold: 0, half: 0, seed: 0, quartz: 0, other: 0 };
    for (const g of groups) {
      for (const i of g.items) {
        if (i.hidden) continue;
        const kind = left[i.kind] === undefined ? 'other' : i.kind;
        total[kind] += i.qty * i.steps;
        left[kind] += i.qty * (i.steps - i.done);
      }
    }
    return { left, total };
  }

  function findOption(list, id) {
    return list.find(o => o.id === id) || list[0];
  }

  // Drop rate formula from the reference calculator: each slot multiplies, values in the same slot add,
  // and the combined boost is capped at 300%.
  function calcDrop(input, data) {
    const s = Object.assign({}, data.TREHUN_DEFAULTS, input);
    const tears = data.TEARS[s.tears] || data.TEARS[0];
    const slots = {
      trehun: data.TREHUN_LEVELS[s.trehun] || 0,
      tears: tears.rate * (Number(s.tearsMul) || 1),
      crew: Number(s.crew) || 0,
      gear: 0,
      book: 0
    };
    const chara = s.coexist ? (s.richard ? 1 : 0) + (s.minic ? 3 : 0) : Math.max(s.richard ? 1 : 0, s.minic ? 3 : 0);
    slots.gear = (Number(s.essel) || 0) + chara + (Number(s.artifact) || 0) * 0.5 +
      findOption(data.WEAPONS, s.weapon).v + (s.dbee ? 3 : 0) +
      findOption(data.MY_STONES, s.myStone).v + findOption(data.FRIEND_STONES, s.friendStone).v;
    if (s.book) slots[slots[s.bookSlot] === undefined ? 'gear' : s.bookSlot] += 3;

    let total = 100;
    for (const key of ['trehun', 'tears', 'crew', 'gear', 'book']) total *= 1 + slots[key] / 100;
    const capped = Math.min(total, TOTAL_CAP);
    const boxBase = clampRate(s.boxBase), itemBase = clampRate(s.itemBase);
    const box = boxBase * capped / 100;
    const item = Math.min(box, 100) * itemBase / 100;
    return {
      slots, total, capped, isCapped: total >= TOTAL_CAP, boxBase, itemBase,
      box, item, boxSure: box >= 100, itemSure: item >= 100,
      boxRuns: box > 0 ? 100 / box : Infinity,
      itemRuns: item > 0 ? 100 / item : Infinity,
      tearsUsed: tears.qty
    };
  }

  function clampRate(v) {
    const n = Number(v);
    if (!isFinite(n) || n < 0) return 0;
    return Math.min(n, 100);
  }

  // Runs needed to get at least one drop with the given probability.
  function runsForChance(ratePercent, chance) {
    if (ratePercent >= 100) return 1;
    if (ratePercent <= 0) return Infinity;
    return Math.ceil(Math.log(1 - chance) / Math.log(1 - ratePercent / 100));
  }

  function round4(n) {
    return Math.round(n * 10000) / 10000;
  }

  // Korean large-number style: 2억 8,875만 / 31만 / 12만 7,600.
  function korNum(n) {
    const v = Math.round(Number(n) || 0);
    if (v < 10000) return v.toLocaleString('ko-KR');
    const eok = Math.floor(v / 1e8), man = Math.floor((v % 1e8) / 1e4), rest = v % 1e4;
    const parts = [];
    if (eok) parts.push(eok.toLocaleString('ko-KR') + '억');
    if (man) parts.push(man.toLocaleString('ko-KR') + '만');
    if (rest) parts.push(rest.toLocaleString('ko-KR'));
    return parts.join(' ');
  }

  // "1:30" → 90 seconds, "2" → 120 seconds (minutes). Returns null when it cannot be read or is 0.
  function parseTime(text) {
    const s = String(text || '').trim();
    let sec = null;
    let m = /^(\d{1,3}):([0-5]?\d)$/.exec(s);
    if (m) sec = Number(m[1]) * 60 + Number(m[2]);
    else if ((m = /^(\d{1,3})$/.exec(s))) sec = Number(m[1]) * 60;
    return sec && sec > 0 ? sec : null;
  }

  function honorPerHour(honor, seconds) {
    return seconds ? honor * 3600 / seconds : 0;
  }

  // Which side earns more honor per hour, and by how much.
  function compareSpeed(a, b) {
    const pa = honorPerHour(a.honor, a.seconds), pb = honorPerHour(b.honor, b.seconds);
    if (!a.seconds || !b.seconds) return null;
    if (Math.round(pa) === Math.round(pb)) return { same: true, perHour: [pa, pb] };
    return pa > pb
      ? { winner: 'a', diff: pa - pb, perHour: [pa, pb] }
      : { winner: 'b', diff: pb - pa, perHour: [pa, pb] };
  }
  const core = {
    TOTAL_CAP, periodKey, nextReset, weekKey, nextWeeklyReset, normalizeWeekly, applyWeeklyReset, jstParts, formatLeft, emptyMonthly, normalizeMonthly,
    applyMonthlyReset, resolveGroups, clampKinds, clampQty, kindsFor, korNum, parseTime, honorPerHour, compareSpeed, remaining, calcDrop, runsForChance, round4, findOption
  };
  root.GBF_CORE = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})(typeof globalThis !== 'undefined' ? globalThis : this);
