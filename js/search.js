// 검색기 tab: pick a boss and conditions, get Japanese / English search words, copy them or search
// YouTube, Google or X. Adapted from 그랑블루 검색 도우미 (도움: ww99w).
(function (root) {
  const { h, toast } = root.GBF_UI;
  const S = root.GBF_SEARCH_DATA;
  const Q = root.GBF_SEARCH_CORE;
  let app = null;
  let queryEl = null;
  let summaryEl = null;
  let syncs = [];

  const DEFAULTS = { view: 'categories', cat: null, boss: 'subaha', selection: {}, prefix: true, lang: 'ja' };

  function st() { return app.state.search; }

  function normalize(s) {
    const out = Object.assign({}, DEFAULTS, s || {});
    out.selection = Object.assign({}, out.selection);
    if (out.boss && !S.BOSSES.some(b => b.id === out.boss)) out.boss = DEFAULTS.boss;
    if (out.cat && !S.CATEGORIES.some(c => c.id === out.cat)) { out.cat = null; out.view = 'categories'; }
    if (out.view !== 'bosses' || !out.cat) out.view = 'categories';
    out.lang = out.lang === 'en' ? 'en' : 'ja';
    out.prefix = out.prefix !== false;
    return out;
  }

  function boss() { return S.BOSSES.find(b => b.id === st().boss) || null; }

  function save() { app.save(); }

  function stars(n) {
    return n ? h('span', { class: 'sr-stars', 'aria-hidden': 'true', text: '★'.repeat(Math.min(n, 9)) }) : null;
  }

  // Chest rows under a boss picture: [파상] honor cut, then what 모래시계 / 히히 can come out of 파상 · 금상 · 빨상.
  const CHEST = { blue: { img: 'img/icons/chest-blue.webp', name: '파상' }, gold: { img: 'img/icons/chest-gold.webp', name: '금상' }, red: { img: 'img/icons/chest-red.webp', name: '빨상' } };
  const ITEM = { sand: { img: 'img/icons/item-sand.webp', name: '모래시계' }, hihi: { img: 'img/icons/item-hihi.webp', name: '히히' } };
  const icon = (o, cls) => h('img', { class: cls, src: o.img, alt: o.name });
  const rateText = r => r === '?' ? '확률 정보 없음' : r;

  function lootTip(loot) {
    return loot.map(l => {
      const c = CHEST[l.chest].name + (l.who ? `(${l.who})` : '');
      const inside = l.item ? `${ITEM[l.item].name} ${rateText(l.rate)}` : '';
      if (l.chest !== 'blue') return `${c}: ${inside}`;
      const cut = `${l.pre ? l.pre : '확정'} 공헌도 ${l.cut}`;
      return `${c}: ${cut}` + (inside ? ` · 안에 ${inside}` : '');
    }).join('\n');
  }

  // One centered line per chest: [파상] 400만 [모래시계] 1.0% / [금상][모래시계] 0.4% / [빨상][히히] 2.5%.
  function lootRows(loot) {
    if (!loot.length) return h('span', { class: 'sr-loot empty' });
    return h('span', { class: 'sr-loot' }, loot.map(l => {
      const item = l.item ? h('span', { class: 'sr-loot-item' }, icon(ITEM[l.item], 'item'), h('em', { text: l.rate })) : null;
      if (l.chest === 'blue') {
        return h('span', { class: 'sr-loot-row is-blue' },
          h('span', { class: 'sr-loot-item' }, icon(CHEST.blue, 'chest'), h('b', { text: (l.pre ? l.pre + ' ' : '') + l.cut })), item);
      }
      return h('span', { class: `sr-loot-row is-${l.chest}` }, h('span', { class: 'sr-loot-item' }, icon(CHEST[l.chest], 'chest'), item));
    }));
  }

  function lootLegend(unknown) {
    return h('div', { class: 'sr-legend' },
      h('span', null, icon(CHEST.blue, 'chest'), '파상 공헌도'),
      h('span', null, icon(CHEST.gold, 'chest'), '금상'),
      h('span', null, icon(CHEST.red, 'chest'), '빨상(호스트)'),
      h('span', null, icon(ITEM.sand, 'item'), icon(ITEM.hihi, 'item'), unknown ? '나올 확률 (? = 확률 정보 없음)' : '나올 확률'));
  }

  function selectBoss(id) {
    const s = st();
    s.boss = s.boss === id ? null : id;
    delete s.selection.difficulty;
    save();
    render();
  }

  function picker() {
    const s = st();
    if (s.view === 'bosses') {
      const cat = S.CATEGORIES.find(c => c.id === s.cat);
      const bosses = S.BOSSES.filter(b => b.category === s.cat);
      return h('div', { class: 'sr-picker' },
        h('div', { class: 'sr-picker-head' },
          h('button', { type: 'button', class: 'btn tiny', text: '← 전체', onclick: () => { s.view = 'categories'; save(); render(); } }),
          h('b', { text: cat.ko }), stars(cat.stars)),
        bosses.some(b => b.loot.length) ? lootLegend(bosses.some(b => b.loot.some(l => l.rate === '?'))) : null,
        h('div', { class: 'sr-grid' }, bosses.map(b =>
          h('button', {
            type: 'button', class: 'sr-card boss' + (s.boss === b.id ? ' on' : ''), 'aria-pressed': s.boss === b.id ? 'true' : 'false',
            title: [`${b.ko} · ${b.jp}`, lootTip(b.loot)].filter(Boolean).join('\n'), dataset: { boss: b.id }, onclick: () => selectBoss(b.id)
          }, h('img', { class: 'sr-pic', src: b.img, alt: '' }), lootRows(b.loot), h('span', { class: 'sr-name', text: b.ko })))));
    }
    return h('div', { class: 'sr-grid' }, S.CATEGORIES.map(c => {
      const single = S.BOSSES.filter(b => b.category === c.id);
      const on = boss() && boss().category === c.id;
      return h('button', {
        type: 'button', class: 'sr-card' + (on ? ' on' : ''), title: c.ko, dataset: { cat: c.id },
        onclick: () => {
          if (single.length === 1) { selectBoss(single[0].id); return; }
          s.cat = c.id; s.view = 'bosses'; save(); render();
        }
      }, h('img', { src: c.img, alt: '' }), h('span', { class: 'sr-name' }, c.ko), stars(c.stars));
    }));
  }

  // Condition layout: what to find first, then element orbs, then short segmented rows, then extra tags.
  const SEG_GROUPS = [
    { id: 'mode', label: '조작' },
    { id: 'party', label: '참여' },
    { id: 'buttons', label: '버튼', short: v => v },
    { id: 'summons', label: '소환', short: v => v },
    { id: 'turns', label: '턴', short: (v, ko) => ko.replace('턴', '') }
  ];
  const EXTRA_GROUPS = ['build', 'ougi', 'restriction', 'priority', 'experience'];
  const ELEMENT_ICON = id => `img/icons/elem-${id}.png`;

  function groupOf(id) { return S.GROUPS.find(g => g.id === id); }

  function toggle(group, value, el) {
    const s = st();
    const isOn = () => {
      const cur = s.selection[group.id];
      return group.multiple ? (cur || []).includes(value) : cur === value;
    };
    el.dataset.value = value;
    el.addEventListener('click', () => {
      if (group.multiple) {
        const cur = new Set(s.selection[group.id] || []);
        if (cur.has(value)) cur.delete(value); else cur.add(value);
        s.selection[group.id] = [...cur];
      } else {
        s.selection[group.id] = isOn() ? undefined : value;
      }
      save();
      update();
    });
    syncs.push(() => { el.classList.toggle('on', isOn()); el.setAttribute('aria-pressed', isOn() ? 'true' : 'false'); });
    return el;
  }

  function chips() {
    const b = boss();
    const purpose = groupOf('purpose');
    const element = groupOf('element');
    const parts = [];
    parts.push(h('div', { class: 'sr-group sr-purpose', dataset: { group: 'purpose' } },
      purpose.values.map(([value, ko]) => toggle(purpose, value, h('button', { type: 'button', class: 'sr-big', text: ko })))));
    parts.push(h('div', { class: 'sr-group sr-elements', dataset: { group: 'element' } },
      h('span', { class: 'sr-label', text: '속성' }),
      h('div', { class: 'sr-orbs' }, element.values.map(([value, ko]) =>
        toggle(element, value, h('button', { type: 'button', class: 'sr-orb', title: ko + ' 속성', 'aria-label': ko + ' 속성' }, h('img', { src: ELEMENT_ICON(value), alt: '' })))))));
    if (b && b.category === 'event') {
      const diff = groupOf('difficulty');
      parts.push(h('div', { class: 'sr-group', dataset: { group: 'difficulty' } },
        h('span', { class: 'sr-label', text: '난이도' }),
        h('div', { class: 'sr-chips' }, diff.values.map(([value, ko]) => toggle(diff, value, h('button', { type: 'button', class: 'sr-chip', text: ko }))))));
    }
    // One row per condition with the same pill buttons everywhere, full names kept (0버튼, 1소환 …).
    for (const cfg of SEG_GROUPS) {
      const group = groupOf(cfg.id);
      parts.push(h('div', { class: 'sr-group', dataset: { group: cfg.id } },
        h('span', { class: 'sr-label', text: cfg.label }),
        h('div', { class: 'sr-chips' }, group.values.map(([value, ko]) =>
          toggle(group, value, h('button', { type: 'button', class: 'sr-chip', text: ko }))))));
    }    parts.push(h('div', { class: 'sr-group', dataset: { group: 'extra' } },
      h('span', { class: 'sr-label', text: '추가' }),
      h('div', { class: 'sr-chips' }, EXTRA_GROUPS.flatMap(id => {
        const group = groupOf(id);
        return group.values.map(([value, ko]) => toggle(group, value, h('button', { type: 'button', class: 'sr-chip', text: ko })));
      }))));
    return parts;
  }
  function current() {
    const s = st();
    return Q.buildQuery(boss(), s.selection, S.GROUPS, s.prefix);
  }

  function update() {
    for (const fn of syncs) fn();
    const q = current();
    const s = st();
    queryEl.textContent = s.lang === 'en' ? q.en : q.ja;
    summaryEl.textContent = q.summary || '보스나 조건을 골라 주세요';
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} 검색어를 복사했어요`);
    } catch (e) {
      toast('복사하지 못했어요. 검색어를 직접 드래그해 주세요');
    }
  }

  function openSearch(site) {
    const q = current();
    const url = Q.searchUrl(S.SEARCH_URLS[site], st().lang === 'en' ? q.en : q.ja);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) chrome.tabs.create({ url });
    else window.open(url, '_blank', 'noopener');
  }

  function queryBox() {
    const s = st();
    const langBtn = (id, label) => {
      const b = h('button', { type: 'button', class: 'sr-chip', text: label, dataset: { lang: id }, onclick: () => { s.lang = id; save(); update(); } });
      syncs.push(() => { b.classList.toggle('on', s.lang === id); b.setAttribute('aria-pressed', s.lang === id ? 'true' : 'false'); });
      return b;
    };
    const prefix = h('input', { type: 'checkbox', checked: s.prefix, onchange: e => { s.prefix = e.target.checked; save(); update(); } });
    queryEl = h('div', { class: 'sr-query', id: 'srQuery', 'aria-live': 'polite' });
    summaryEl = h('div', { class: 'sr-summary', id: 'srSummary' });
    return h('div', { class: 'sr-box' },
      h('div', { class: 'sr-box-head' },
        h('div', { class: 'sr-chips' }, langBtn('ja', '일본어'), langBtn('en', 'English')),
        h('label', { class: 'switch' }, prefix, h('span', { text: '게임명 포함' })),
        h('button', { type: 'button', class: 'btn tiny', text: '⟳ 조건 초기화', onclick: () => { s.selection = {}; save(); render(); toast('조건을 모두 지웠어요'); } })),
      queryEl, summaryEl,
      h('div', { class: 'sr-actions' },
        h('button', { type: 'button', class: 'btn tiny', text: '일본어 복사', onclick: () => copy(current().ja, '일본어') }),
        h('button', { type: 'button', class: 'btn tiny', text: '영문 복사', onclick: () => copy(current().en, '영문') })),
      h('div', { class: 'sr-actions' },
        h('button', { type: 'button', class: 'btn sr-yt', dataset: { site: 'youtube' }, text: '▶ 유튜브', onclick: () => openSearch('youtube') }),
        h('button', { type: 'button', class: 'btn', dataset: { site: 'google' }, text: '구글', onclick: () => openSearch('google') }),
        h('button', { type: 'button', class: 'btn', dataset: { site: 'x' }, text: 'X', onclick: () => openSearch('x') })));
  }

  function render() {
    const host = document.getElementById('tab-search');
    if (!host || !app) return;
    syncs = [];
    host.replaceChildren(
      h('h2', { class: 'ribbon' }, h('span', { text: '보스 선택' })),
      picker(),
      h('h2', { class: 'ribbon' }, h('span', { text: '검색 조건' })),
      h('div', { class: 'form-box sr-conditions' }, chips()),
      queryBox(),
      h('p', { class: 'note', text: '도움 : ww99w' }));
    update();
  }

  root.GBF_SEARCH = {
    normalize,
    mount(appRef) { app = appRef; render(); },
    render
  };
})(globalThis);
