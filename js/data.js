// Built-in data. Monthly limits were checked on gbf.wiki on 2026-11-25.
// Shop and item pictures were saved once from gbf.wiki and ship inside the extension (img/).
// Treasure hunt numbers follow liliel's トレハン計算機 ver0.31 (liliel.web.fc2.com/gbf).
(function (root) {
  const SOURCE_DATE = '2026-11-25';

  const KINDS = {
    gold: { label: '골드문', full: '골드문 (金月)', img: 'img/item-gold.webp' },
    half: { label: '반홍', full: '하프 엘릭서 (AP 75 회복)', img: 'img/item-half.webp' },
    seed: { label: '시드', full: '소울 시드 (BP 1 회복)', img: 'img/item-seed.webp' },
    quartz: { label: '쿼츠', full: '신세계 쿼츠 (New World Quartz)', img: 'img/item-quartz.webp' },
    other: { label: '기타', full: '직접 추가한 항목', img: '' }
  };

  // qty: amount per step. steps: how many separate trades make up the item (default 1).
  const GROUPS = [
    {
      id: 'fp', name: 'FP 교환', sub: '팔로 포인트', img: 'img/shop-fp.webp',
      items: [
        { id: 'fp-gold', kind: 'gold', qty: 1, cost: '1,000 FP' },
        { id: 'fp-half', kind: 'half', qty: 100, cost: '개당 10 FP · 전부 1,000 FP' },
        { id: 'fp-seed', kind: 'seed', qty: 200, cost: '개당 5 FP · 전부 1,000 FP' }
      ]
    },
    {
      id: 'pendant', name: '펜던트', sub: '펜던트 교환', img: 'img/shop-pendants.webp',
      items: [
        { id: 'pendant-gold', kind: 'gold', qty: 1, cost: '1,000 펜던트' }
      ]
    },
    {
      id: 'casino', name: '카지노', sub: '경품 교환', img: 'img/shop-casino.webp',
      items: [
        { id: 'casino-half', kind: 'half', qty: 100, cost: '개당 1,500칩 · 전부 150,000칩' },
        { id: 'casino-seed', kind: 'seed', qty: 200, cost: '개당 500칩 · 전부 100,000칩' }
      ]
    },
    {
      id: 'skyleap', name: '스카이립', sub: '스카이립 포인트', img: 'img/shop-skyleap.webp',
      items: [
        { id: 'skyleap-half', kind: 'half', qty: 100, cost: '10개 묶음 × 10회 · 묶음당 300pt' },
        { id: 'skyleap-seed', kind: 'seed', qty: 200, cost: '10개 묶음 × 20회 · 묶음당 100pt' }
      ]
    },
    {
      id: 'daily', name: '데일리 포인트', sub: '로그인 포인트', img: 'img/shop-daily.webp',
      items: [
        { id: 'daily-half', kind: 'half', qty: 150, cost: '5개 묶음 × 30회 · 묶음당 10pt' },
        { id: 'daily-seed', kind: 'seed', qty: 450, cost: '15개 묶음 × 30회 · 묶음당 10pt' }
      ]
    },
    {
      id: 'treasure', name: '트레저 교환', sub: '트레저 종류마다', img: 'img/shop-treasure.webp',
      items: [
        // 반홍: the user writes the total (co-op host quests trade many more than 20 × 13).
        { id: 'treasure-half', kind: 'half', qty: 260, userTotal: true, cost: '트레저 10개당 1개 · 코옵 호스트 퀘스트 교환도 가능' },
        { id: 'treasure-seed', kind: 'seed', qty: 50, perKind: true, cost: '트레저 4개당 1개 · 종류마다 50개' }
      ]
    },
    {
      // Replicard Sandbox monthly event (gbf.wiki, November 2026): quartz 4 missions × 5 + 2 Denas shops × 10 = 40,
      // and 반홍 150 in each of the 2 Denas shops. label: short word shown in the chip before the icon.
      id: 'sandbox', name: '샌드박스', sub: '리플리카드 샌드박스 월간', img: 'img/shop-sandbox.webp',
      items: [
        { id: 'sandbox-mission', kind: 'quartz', qty: 20, label: '미션', cost: '월간 미션 4개 × 5개' },
        { id: 'sandbox-trade', kind: 'quartz', qty: 20, label: '상점', cost: '디나스 교환소 2곳 × 10개' },
        { id: 'sandbox-half', kind: 'half', qty: 300, cost: '디나스 교환소 2곳 × 150개' }
      ]
    }
  ];

  // Weekly caps (reset every Monday 05:00). up: a checkbox that raises the number.
  // 아티팩트: drop-rate boost for the first 50 artifacts a week, 75 with the Premium Pass (gbf.wiki Premium Pass).
  // FP: weekly cap 5,000, doubled during FP campaigns (gbf.wiki FP). 보정석: weekly quest reward (user).
  const WEEKLY = [
    { id: 'artifact', name: '아티팩트', img: 'img/item-artifact.webp', qty: 50, up: { key: 'pass', label: '패스', qty: 75 }, tip: '아티팩트 드롭률 대폭 UP 상한 (프리미엄 패스면 75)' },
    { id: 'fp', name: 'FP', img: 'img/item-fp.webp', qty: 5000, up: { key: 'double', label: '2배', qty: 10000 }, tip: '주간 FP 획득 상한 (2배 이벤트면 10,000)' },
    { id: 'crystal', name: '보정석', img: 'img/item-crystal.webp', qty: 100, tip: '주간 퀘스트 보정석' }
  ];

  // Treasure hunt (트헌) calculator tables.
  const TREHUN_LEVELS = [0, 20, 22, 24, 26, 28, 31, 35, 40, 50, 70];
  const TEARS = [
    { rate: 0, qty: 0 },
    { rate: 2, qty: 1 },
    { rate: 5, qty: 3 },
    { rate: 7, qty: 5 },
    { rate: 10, qty: 10 },
    { rate: 15, qty: 10, premium: true }
  ];
  // img: small pictures from gbf.wiki (img/party/), so players can spot the right thing.
  const P = name => `img/party/p-${name}.webp`;
  const WEAPONS = [
    { id: 'none', label: 'X', v: 0 },
    { id: 'banner', label: '셉티안 버너', v: 2, img: P('banner') },
    { id: 'snowflake', label: '스노우플레이크', v: 2, img: P('snowflake') },
    { id: 'oliver', label: '올리버', v: 5, img: P('oliver') },
    { id: 'damascus', label: '다마스커스 나이프', v: 10, img: P('damascus') }
  ];
  const FRIEND_STONES = [
    { id: 'none', label: 'X', v: 0 },
    { id: 'nobiyo4', label: '노비요 4돌', v: 15, img: P('nobiyo') },
    { id: 'white3', label: '화이트 래빗 3돌', v: 15, img: P('white') },
    { id: 'black3', label: '블랙 래빗 3돌', v: 15, img: P('black') },
    { id: 'godrabbit', label: '갓 래빗', v: 20, img: P('godrabbit') },
    { id: 'kaguya0', label: '카구야 노돌', v: 20, img: P('kaguya') },
    { id: 'kaguya3', label: '카구야 3돌', v: 25, img: P('kaguya') },
    { id: 'kaguya4', label: '카구야 4돌', v: 30, img: P('kaguya') }
  ];
  const MY_STONES = [
    FRIEND_STONES[0],
    { id: 'godrabbit-sub', label: '갓 래빗 (서브)', v: 3, img: P('godrabbit') },
    ...FRIEND_STONES.slice(1)
  ];
  const PARTY_IMG = { essel: P('essel'), richard: P('richard'), minic: P('mimic'), dbee: P('dbee'), book: 'img/party/p-liber.jpg' };
  // 고전장 HELL box rates. 90~200 are the reference calculator's estimates; 250 is 4.5% (the reference's unlabeled 4.5%, confirmed by the user).
  const BOX_PRESETS = [
    { v: 2, label: '90헬' },
    { v: 2.5, label: '95헬' },
    { v: 3, label: '100헬' },
    { v: 3.5, label: '150헬' },
    { v: 4, label: '200헬' },
    { v: 4.5, label: '250헬' }
  ];
  // Chance that a box holds the 극성기 (fixed, as the reference calculator's default).
  const ITEM_RATE = 8;
  const TREASURE_KINDS_MAX = 13;

  // 극성기 파편 (極星の晶核), from kamigame.jp item page (checked 2026-11-25).
  // gachaBoxes: 고전장 戦貨 box gacha up to box 60 · oldBoxes: 果報の古箱 cap per event (1 each) · grind: per weapon broken down.
  // final = 4돌(最終上限解放), beyond = 5돌, awaken = 覚醒. Total 295 excludes the 15 for trading a weapon.
  const STELLAR = { gachaBoxes: 60, oldBoxes: 50, grind: 15, final: 45, beyond: 80, awaken: 170 };

  const TREHUN_DEFAULTS = {
    boxBase: 2, itemBase: ITEM_RATE, trehun: 0, tears: 4, tearsMul: 1, crew: 20,
    essel: 10, richard: false, minic: false, artifact: 0,
    weapon: 'none', dbee: false, myStone: 'kaguya4', friendStone: 'kaguya4',
    book: false, bookSlot: 'gear', coexist: false
  };
  // 고전장 (Unite and Fight). HP and honors (solo) from gbf.wiki Unite and Fight September/November 2026 pages;
  // DEF from kamigame 防御値一覧; 250헬 values from the user. Checked 2026-11-26.
  // defLater: DEF drops to this partway through the fight (kamigame shows it as 14→13).
  // Pictures: last event's (September 2026) Nightmare quest banners and gbf.wiki Raids lobby icons, saved in img/raids/.
  const GW_STAGES = [
    { id: 'exp', name: 'EX+', img: 'img/raids/ex-plus.webp', hp: 35000000, def: '10', honor: 127600, cost: '30 AP' },
    { id: 'h90', name: '90헬', hell: 90, img: 'img/raids/hell-90.webp', hp: 50000000, def: '14', defLater: '13', honor: 310000, cost: '고기 5', costImg: 'img/gw/g-meat.webp' },
    { id: 'h95', name: '95헬', hell: 95, img: 'img/raids/hell-95.webp', hp: 131250000, def: '15', defLater: '14', honor: 910000, cost: '고기 10', costImg: 'img/gw/g-meat.webp' },
    { id: 'h100', name: '100헬', hell: 100, img: 'img/raids/hell-100.webp', hp: 288750000, def: '15', defLater: '14', honor: 2650000, cost: '고기 20', costImg: 'img/gw/g-meat.webp' },
    { id: 'h150', name: '150헬', hell: 150, img: 'img/raids/hell-150.webp', hp: 288750000, def: '25', honor: 4100000, cost: '고기 20', costImg: 'img/gw/g-meat.webp' },
    { id: 'h200', name: '200헬', hell: 200, img: 'img/raids/hell-200.webp', hp: 877800000, def: '25', honor: 20250000, cost: '고기 20', costImg: 'img/gw/g-meat.webp' },
    { id: 'h250', name: '250헬', hell: 250, img: 'img/raids/hell-250.webp', hp: 2326170000, def: '25', honor: 75250000, cost: '왕고기 20', costImg: 'img/gw/g-clump.webp' }
  ];
  const GW_ELEMENTS = [
    { id: 'fire', label: '화', name: '불', vs: '바람', icon: 'img/icons/elem-fire.png' },
    { id: 'water', label: '수', name: '물', vs: '불', icon: 'img/icons/elem-water.png' },
    { id: 'earth', label: '토', name: '땅', vs: '물', icon: 'img/icons/elem-earth.png' },
    { id: 'wind', label: '풍', name: '바람', vs: '땅', icon: 'img/icons/elem-wind.png' },
    { id: 'light', label: '광', name: '빛', vs: '어둠', icon: 'img/icons/elem-light.png' },
    { id: 'dark', label: '암', name: '어둠', vs: '빛', icon: 'img/icons/elem-dark.png' }
  ];
  // Test fights per element and HELL: the remaining HP% to aim for (user's table, 2026-11-26).
  // debuff = [실전 방깎, 테스트 방깎]; safe = 안전 목표. Entries with debuff or safe values are marked as uncertain.
  const G = name => `img/raids/${name}.webp`;
  const T = (mob, img, target, safe, debuff) => ({ mob, img: G(img), target, safe: safe || '', debuff: debuff || null });
  const GW_TESTS = {
    fire: { 90: T('이위야 솔로', 'ewiyar', '72.2%'), 95: T('이위야 솔로', 'ewiyar', '27.1%'), 100: T('이위야 레이드', 'ewiyar', '31.5%', '27.8%', ['50%', '50%']), 150: T('이위야 레이드', 'ewiyar', '23.4%', '9.7%', ['50%', '50%']) },
    water: { 90: T('윌나스 솔로', 'wilnas', '69.7%'), 95: T('윌나스 솔로', 'wilnas', '20.5%'), 100: T('윌나스 레이드', 'wilnas', '33.8%', '30.2%', ['50%', '50%']), 150: T('윌나스 레이드', 'wilnas', '26.0%', '12.8%', ['50%', '50%']) },
    earth: { 90: T('왐듀스 솔로', 'wamdus', '72.6%'), 95: T('왐듀스 솔로', 'wamdus', '28.0%'), 100: T('왐듀스 레이드', 'wamdus', '33.5%', '29.9%', ['50%', '50%']), 150: T('왐듀스 레이드', 'wamdus', '25.6%', '12.3%', ['50%', '50%']) },
    wind: { 90: T('가레온 솔로', 'galleon', '74.5%'), 95: T('가레온 솔로', 'galleon', '33.0%'), 100: T('가레온 레이드', 'galleon', '39.6%', '36.3%', ['50%', '50%']), 150: T('가레온 레이드', 'galleon', '32.4%', '20.4%', ['50%', '50%']) },
    light: { 90: T('길베르트 PROUD', 'gilbert', '72.2%'), 95: T('길베르트 PROUD', 'gilbert', '27.1%'), 100: T('오시리스', 'osiris', '44.4%', '35.8%', ['50%', '50%']), 150: T('오시리스', 'osiris', '37.8%', '19.7%', ['50%', '50%']) },
    dark: { 90: T('루오 솔로', 'luwoh', '74.0%'), 95: T('루오 솔로', 'luwoh', '31.6%'), 100: T('루오 레이드', 'luwoh', '39.8%'), 150: T('루오 레이드', 'luwoh', '32.7%', '24.8%', ['50%', '50%']) }
  };
  const data = {
    SOURCE_DATE, KINDS, GROUPS, WEEKLY, TREHUN_LEVELS, TEARS, WEAPONS, MY_STONES, FRIEND_STONES, PARTY_IMG,
    BOX_PRESETS, ITEM_RATE, TREASURE_KINDS_MAX, STELLAR, TREHUN_DEFAULTS, GW_STAGES, GW_ELEMENTS, GW_TESTS
  };
  root.GBF_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
