// Run: node --test tests/core.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../js/data.js');
const C = require('../js/core.js');

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('monthly period switches on the 1st at 05:00 JST', () => {
  assert.equal(C.periodKey(new Date('2026-11-30T19:59:59Z')), '2026-11');
  assert.equal(C.periodKey(new Date('2026-11-30T20:00:00Z')), '2026-12');
  assert.equal(C.periodKey(new Date('2026-12-31T19:59:59Z')), '2026-12');
  assert.equal(C.periodKey(new Date('2026-12-31T20:00:00Z')), '2027-01');
  assert.equal(C.nextReset(new Date('2026-11-25T12:00:00Z')).toISOString(), '2026-11-30T20:00:00.000Z');
  assert.equal(C.nextReset(new Date('2026-12-15T00:00:00Z')).toISOString(), '2026-12-31T20:00:00.000Z');
  // Just before the reset moment the next reset is still the same one.
  assert.equal(C.nextReset(new Date('2026-11-30T19:59:00Z')).toISOString(), '2026-11-30T20:00:00.000Z');
  const p = C.jstParts(C.nextReset(new Date('2026-11-25T12:00:00Z')));
  assert.deepEqual([p.month, p.day, p.hour, p.minute], [12, 1, 5, 0]);
});

test('remaining time text', () => {
  assert.equal(C.formatLeft((2 * 24 * 60 + 3 * 60 + 5) * 60000), '2일 3시간 남음');
  assert.equal(C.formatLeft((3 * 60 + 5) * 60000), '3시간 5분 남음');
  assert.equal(C.formatLeft(59 * 1000), '0분 남음');
});

test('new month clears checks but keeps the user list settings', () => {
  const first = C.applyMonthlyReset({}, new Date('2026-11-25T00:00:00Z'));
  assert.equal(first.didReset, false);
  assert.equal(first.state.period, '2026-11');
  const m = Object.assign(first.state, { progress: { 'fp-gold': 1 }, hidden: ['skyleap-half'], overrides: { 'fp-half': { qty: 90 } } });
  const same = C.applyMonthlyReset(m, new Date('2026-11-30T19:00:00Z'));
  assert.equal(same.didReset, false);
  assert.deepEqual(same.state.progress, { 'fp-gold': 1 });
  const next = C.applyMonthlyReset(m, new Date('2026-11-30T20:00:00Z'));
  assert.equal(next.didReset, true);
  assert.equal(next.state.period, '2026-12');
  assert.deepEqual(next.state.progress, {});
  assert.deepEqual(next.state.hidden, ['skyleap-half']);
  assert.deepEqual(next.state.overrides, { 'fp-half': { qty: 90 } });
});

test('alchemy lab is not part of the list', () => {
  assert.ok(!D.GROUPS.some(g => g.id === 'alchemy'));
  for (const g of D.GROUPS) assert.ok(g.img && require('node:fs').existsSync(path.join(__dirname, '..', g.img)), g.id + ' picture');
  for (const k of ['gold', 'half', 'seed']) assert.ok(fs.existsSync(path.join(__dirname, '..', D.KINDS[k].img)));
});

test('checklist totals and remaining amounts', () => {
  const m = C.normalizeMonthly({ progress: { 'fp-gold': 1, 'casino-seed': 1 } });
  const groups = C.resolveGroups(D.GROUPS, m, D.KINDS);
  const { left, total } = C.remaining(groups);
  assert.deepEqual(total, { gold: 2, half: 710, seed: 1700, other: 0 });
  assert.deepEqual(left, { gold: 1, half: 710, seed: 1500, other: 0 });
  assert.equal(groups.find(g => g.id === 'fp').items[0].name, '골드문');
});

test('treasure trades: 반홍 total written by the user, 시드 = 50 × kinds', () => {
  const pick = monthly => {
    const groups = C.resolveGroups(D.GROUPS, C.normalizeMonthly(monthly), D.KINDS);
    const items = groups.find(g => g.id === 'treasure').items;
    return { sum: C.remaining(groups), half: items[0], seed: items[1] };
  };
  const def = pick({});
  assert.equal(def.half.qty, 260);
  assert.equal(def.seed.qty, 650);
  const set = pick({ userQty: { 'treasure-half': 300 }, treasureKinds: { 'treasure-seed': 5 } });
  assert.equal(set.half.qty, 300);
  assert.equal(set.seed.kinds, 5);
  assert.equal(set.seed.qty, 250);
  assert.deepEqual(set.sum.total, { gold: 2, half: 450 + 300, seed: 1050 + 250, other: 0 });
  const done = pick({ userQty: { 'treasure-half': 300 }, progress: { 'treasure-half': 1 } });
  assert.equal(done.half.complete, true);
  assert.equal(done.sum.left.half, 450);
  assert.equal(pick({ treasureKinds: { 'treasure-seed': 99 } }).seed.kinds, 13);
  assert.equal(pick({ treasureKinds: { 'treasure-seed': -3 } }).seed.kinds, 0);
  assert.equal(pick({ userQty: { 'treasure-half': -5 } }).half.qty, 0);
  // Older saves: a 반홍 kind count becomes a total of 20 × kinds.
  assert.equal(pick({ treasureKinds: { 'treasure-half': 4 } }).half.qty, 80);
  assert.equal(pick({ treasureKinds: 7 }).half.qty, 140);
  assert.equal(pick({ treasureKinds: 7 }).seed.kinds, 7);
});
test('hidden, edited and custom items', () => {
  const m = C.normalizeMonthly({
    hidden: ['skyleap-half', 'skyleap-seed'],
    overrides: { 'fp-half': { qty: 50, cost: '바뀐 가격' } },
    custom: { groups: [{ id: 'g-x', name: '이벤트' }], items: { 'g-x': [{ id: 'c-1', kind: 'gold', name: '이벤트 골드문', qty: 2 }] } },
    progress: { 'c-1': 1 }
  });
  const groups = C.resolveGroups(D.GROUPS, m, D.KINDS);
  const fpHalf = groups.find(g => g.id === 'fp').items.find(i => i.id === 'fp-half');
  assert.equal(fpHalf.qty, 50);
  assert.equal(fpHalf.cost, '바뀐 가격');
  const custom = groups.find(g => g.id === 'g-x');
  assert.equal(custom.custom, true);
  assert.equal(custom.items[0].complete, true);
  const { left, total } = C.remaining(groups);
  assert.equal(total.gold, 4);
  assert.equal(left.gold, 2);
  assert.equal(total.half, 710 - 50 - 100); // fp 100 -> 50, skyleap 100 hidden
});
const REF = { boxBase: 2, itemBase: 8, tears: 0, essel: 0, myStone: 'none', friendStone: 'none' };

test('drop rate: new defaults (물방울 Lv4, 최종 엣셀, 카구야 4돌 ×2)', () => {
  const r = C.calcDrop({}, D);
  close(r.total, 100 * 1.1 * 1.2 * 1.7);
  close(r.box, 2 * 2.244);
  close(r.item, 2 * 2.244 * 0.08);
  assert.deepEqual(D.BOX_PRESETS.map(p => p.label), ['90헬', '95헬', '100헬', '150헬', '200헬', '250헬']);
});

test('drop rate: reference calculator defaults', () => {
  const r = C.calcDrop(REF, D);
  close(r.total, 120);
  close(r.box, 2.4);
  close(r.item, 0.192);
  assert.equal(C.runsForChance(r.item, 0.5), 361);
});

test('drop rate: slots multiply, the same slot adds, 300% cap', () => {
  const r = C.calcDrop({
    trehun: 10, tears: 5, tearsMul: 4, crew: 20, essel: 10, richard: true, minic: true, artifact: 5,
    weapon: 'damascus', dbee: true, myStone: 'kaguya4', friendStone: 'kaguya4'
  }, D);
  close(r.slots.gear, 88.5); // Richard and Minic do not stack by default: Minic 3%
  close(r.total, 100 * 1.7 * 1.6 * 1.2 * 1.885);
  close(r.capped, 300);
  assert.equal(r.isCapped, true);
  close(r.box, 6);
  close(r.item, 0.48);
  const both = C.calcDrop(Object.assign({}, REF, { richard: true, minic: true, coexist: true, book: true, bookSlot: 'book', crew: 0 }), D);
  close(both.slots.gear, 4);
  close(both.slots.book, 3);
  close(both.total, 100 * 1.04 * 1.03);
});

test('drop rate: guaranteed box and item', () => {
  const r = C.calcDrop(Object.assign({}, REF, { boxBase: 50, itemBase: 100, trehun: 10, tears: 5, tearsMul: 4 }), D);
  close(r.box, 150);
  close(r.item, 100);
  assert.equal(r.boxSure, true);
  assert.equal(r.itemSure, true);
  assert.equal(C.runsForChance(100, 0.9), 1);
  assert.equal(C.runsForChance(0, 0.9), Infinity);
});

test('고전장: Korean numbers, time reading and speed comparison', () => {
  assert.equal(C.korNum(288750000), '2억 8,875만');
  assert.equal(C.korNum(127600), '12만 7,600');
  assert.equal(C.korNum(2326170000), '23억 2,617만');
  assert.equal(C.korNum(9500), '9,500');
  assert.equal(C.parseTime('1:30'), 90);
  assert.equal(C.parseTime('2'), 120);
  assert.equal(C.parseTime('0:00'), null);
  assert.equal(C.parseTime('1:75'), null);
  const r = C.compareSpeed({ honor: 4100000, seconds: 40 }, { honor: 20250000, seconds: 150 });
  assert.equal(r.winner, 'b');
  close(r.diff, 1950000 * 60); // per hour
  assert.equal(C.compareSpeed({ honor: 1, seconds: null }, { honor: 1, seconds: 60 }), null);
  assert.equal(C.compareSpeed({ honor: 600, seconds: 60 }, { honor: 1200, seconds: 120 }).same, true);
  assert.deepEqual(D.GW_STAGES.map(s => s.name), ['EX+', '90헬', '95헬', '100헬', '150헬', '200헬', '250헬']);
  for (const el of D.GW_ELEMENTS) for (const lv of [90, 95, 100, 150]) assert.ok(D.GW_TESTS[el.id][lv].target, el.id + lv);
});

test('검색기: search words like 그랑블루 검색 도우미', () => {
  const S = require('../js/search-data.js');
  const Q = require('../js/search-core.js');
  const boss = id => S.BOSSES.find(b => b.id === id);
  const q = Q.buildQuery(boss('subaha'), { mode: 'full', party: 'solo', build: ['magna'], purpose: ['setup'] }, S.GROUPS, true);
  assert.equal(q.ja, 'グラブル スパバハ フルオート ソロ マグナ 編成');
  assert.equal(q.en, 'GBF Super Ultimate Bahamut full auto solo Magna team');
  assert.equal(q.summary, '슈퍼 바하무트 · 풀오토 · 솔로 · 마그나 · 편성');
  const gw = Q.buildQuery(boss('gw'), { element: 'fire', difficulty: '150' }, S.GROUPS, false);
  assert.equal(gw.ja, '火古戦場 150HELL');
  assert.equal(gw.en, 'Fire GW 150HELL');
  assert.equal(Q.buildQuery(boss('wilnas'), { difficulty: '150' }, S.GROUPS, true).ja, 'グラブル ウィルナス');
  assert.equal(Q.searchUrl(S.SEARCH_URLS.youtube, '火古戦場 150HELL'), 'https://www.youtube.com/results?search_query=%E7%81%AB%E5%8F%A4%E6%88%A6%E5%A0%B4%20150HELL');
  for (const b of S.BOSSES) assert.ok(require('node:fs').existsSync(path.join(__dirname, '..', b.img)), b.id + ' picture');
  for (const c of S.CATEGORIES) assert.ok(S.BOSSES.some(b => b.category === c.id), c.id);
});

test('extension never contacts the game or any website', () => {
  const root = path.join(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.name, '그랑블루 도우미', 'manifest Korean text is intact (not broken by a non-UTF-8 save)');
  assert.ok(/^[가-힣]/.test(manifest.description));
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.deepEqual(manifest.permissions.sort(), ['sidePanel', 'storage']);
  const files = ['background.js', 'panel.html', 'panel.css', ...fs.readdirSync(path.join(root, 'js')).map(f => 'js/' + f)];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(!/granbluefantasy|fetch\(|XMLHttpRequest|WebSocket|https?:\/\/(?!www\.w3\.org|www\.youtube\.com\/results|www\.google\.com\/search|x\.com\/search)/i.test(text.replace(/\/\/.*$/gm, '')), `${file} must not reach the network`);
  }
});
