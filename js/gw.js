// 고전장 tab: stage table (EX+ ~ 250헬) with test-fight targets per element, and a speed comparison.
(function (root) {
  const { h, toast } = root.GBF_UI;
  const D = root.GBF_DATA;
  const C = root.GBF_CORE;
  let app = null;
  let resultEl = null;

  const DEFAULTS = { element: 'fire', a: { stage: 'h150', time: '0:40' }, b: { stage: 'h200', time: '2:30' } };

  function g() { return app.state.gw; }

  function normalize(gw) {
    const out = Object.assign({}, DEFAULTS, gw || {});
    out.a = Object.assign({}, DEFAULTS.a, out.a);
    out.b = Object.assign({}, DEFAULTS.b, out.b);
    if (!D.GW_ELEMENTS.some(e => e.id === out.element)) out.element = DEFAULTS.element;
    for (const side of ['a', 'b']) if (!D.GW_STAGES.some(s => s.id === out[side].stage)) out[side].stage = DEFAULTS[side].stage;
    return out;
  }

  function element() { return D.GW_ELEMENTS.find(e => e.id === g().element) || D.GW_ELEMENTS[0]; }

  function cycleElement() {
    const list = D.GW_ELEMENTS;
    const next = list[(list.findIndex(e => e.id === g().element) + 1) % list.length];
    g().element = next.id;
    app.save();
    render();
    toast(`${next.name} 고전장 (상대 ${next.vs}) 테스트로 바꿨어요`);
  }

  function warn() {
    return h('span', { class: 'gw-warn' }, h('span', { class: 'hint-mark static', 'aria-hidden': 'true', text: '!' }), '확실하지 않아요.');
  }

  // The stage's own picture (last event's Nightmare banner); EX+ gets a plain tile.
  function stagePic(stage) {
    return h('span', { class: 'gw-pic' + (stage.img ? '' : ' plain') },
      stage.img ? h('img', { src: stage.img, alt: stage.name }) : h('span', { text: stage.name }));
  }

  // Test fight strip under a HELL row: [test mob picture with element badge] target HP · mob · 방깎.
  function testStrip(test) {
    const el = element();
    const uncertain = test.debuff || test.safe;
    return h('div', { class: 'gw-test-strip' },
      h('span', { class: 'gw-mob' },
        h('img', { src: test.img, alt: test.mob }),
        h('button', {
          type: 'button', class: 'el-badge', dataset: { el: el.id },
          title: '눌러서 속성 바꾸기 (화 → 수 → 토 → 풍 → 광 → 암)', 'aria-label': `${el.name} 속성, 눌러서 바꾸기`, onclick: cycleElement
        }, h('img', { src: el.icon, alt: '' }))),
      h('div', { class: 'gw-test-body' },
        h('div', { class: 'gw-test-head' },
          h('span', { class: 'gw-test-label', text: '테스트 목표 HP' }),
          h('b', { class: 'gw-target', title: test.safe ? '예상 / 안전' : '목표 HP', text: test.safe ? `${test.target} / ${test.safe}` : test.target }),
          uncertain ? warn() : null),
        h('div', { class: 'gw-test', text: test.mob + (test.debuff ? ' · 방깎 50% 기준' : '') })));
  }

  // sub goes next to the label (e.g. "방어 · 후반 13") so the number cell never gets cut off.
  function stat(label, value, sub) {
    return h('span', { class: 'gw-stat' }, h('small', null, label, sub ? h('span', { class: 'gw-sub', text: ' · ' + sub }) : null), h('b', { text: value }));
  }

  function row(stage) {
    const test = stage.hell ? (D.GW_TESTS[g().element] || {})[stage.hell] : null;
    return h('section', { class: 'shop gw-row', dataset: { stage: stage.id } },
      h('div', { class: 'gw-main' },
        stagePic(stage),
        h('div', { class: 'shop-body' },
          h('div', { class: 'shop-title' }, h('b', { text: stage.name }), h('span', { class: 'count gw-cost' }, stage.costImg ? h('img', { src: stage.costImg, alt: '' }) : null, stage.cost)),
          h('div', { class: 'gw-stats' }, stat('체력', C.korNum(stage.hp)), stat('방어', stage.def, stage.defLater ? `후반 ${stage.defLater}` : ''), stat('공헌도', C.korNum(stage.honor))))),
      test ? testStrip(test) : null);
  }
  // ---- Speed comparison ----
  function side(key) {
    const st = g()[key];
    const sel = h('select', { class: 'in', 'aria-label': key === 'a' ? '비교할 단계 1' : '비교할 단계 2', dataset: { side: key } },
      D.GW_STAGES.map(s => h('option', { value: s.id, text: s.name })));
    sel.value = st.stage;
    sel.addEventListener('change', () => { st.stage = sel.value; app.save(); renderResult(); });
    const time = h('input', {
      class: 'in time', value: st.time, placeholder: '분:초', inputmode: 'numeric', maxlength: 6,
      'aria-label': key === 'a' ? '단계 1 처치 시간 (분:초)' : '단계 2 처치 시간 (분:초)', dataset: { time: key }
    });
    time.addEventListener('input', () => { st.time = time.value.trim(); app.save(); renderResult(); });
    return h('span', { class: 'speed-side' }, sel, time);
  }

  function renderResult() {
    if (!resultEl) return;
    const st = g();
    const stageOf = key => D.GW_STAGES.find(s => s.id === st[key].stage);
    const A = stageOf('a'), B = stageOf('b');
    const r = C.compareSpeed({ honor: A.honor, seconds: C.parseTime(st.a.time) }, { honor: B.honor, seconds: C.parseTime(st.b.time) });
    if (!r) {
      resultEl.replaceChildren(h('p', { class: 'speed-line muted', text: '분:초 형식으로 시간을 적으면 비교해 드려요. (예: 1:30)' }), h('p', { class: 'speed-sub', text: ' ' }));
      return;
    }
    const sub = `시간당 ${A.name} ${C.korNum(r.perHour[0])} · ${B.name} ${C.korNum(r.perHour[1])}`;
    if (r.same) {
      resultEl.replaceChildren(h('p', { class: 'speed-line', text: '두 쪽의 시간당 공헌도가 같아요.' }), h('p', { class: 'speed-sub', text: sub }));
      return;
    }
    const win = r.winner === 'a' ? A : B;
    resultEl.replaceChildren(
      h('p', { class: 'speed-line' }, h('b', { class: 'em', text: win.name }), '의 시간당 공헌도가 ', h('b', { class: 'em', text: C.korNum(r.diff) }), '만큼 높아요.'),
      h('p', { class: 'speed-sub', text: sub }));
  }

  function render() {
    const host = document.getElementById('tab-gw');
    if (!host || !app) return;
    const el = element();
    resultEl = h('div', { class: 'speed-result', id: 'speedResult', 'aria-live': 'polite' });
    host.replaceChildren(
      h('h2', { class: 'ribbon' }, h('span', { text: '단계별 정보' })),
      h('div', { class: 'shops' }, D.GW_STAGES.map(row)),
      h('h2', { class: 'ribbon' }, h('span', { text: '속도 비교' })),
      h('div', { class: 'speed' },
        h('div', { class: 'speed-inputs' }, side('a'), h('span', { class: 'vs', text: 'vs' }), side('b')),
        resultEl),
      h('p', { class: 'note', text: '체력·공헌도(솔로)·고기: gbf.wiki 2026년 고전장 / 방어: kamigame 防御値一覧 / 헬 그림: 지난 고전장(2026년 9월) / 테스트 목표 HP: 사용자 제공 표' }));
    renderResult();
  }

  root.GBF_GW = {
    normalize,
    mount(appRef) { app = appRef; render(); },
    render
  };
})(globalThis);
