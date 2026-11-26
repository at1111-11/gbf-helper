// 극성기 drop calculator tab (treasure hunt math): two groups of drop-downs and one result plaque.
(function (root) {
  const { h, num, confirmButton } = root.GBF_UI;
  const D = root.GBF_DATA;
  const C = root.GBF_CORE;
  let app = null;
  let syncs = [];
  let resultEl = null;
  let fitShard = () => {};

  function s() { return app.state.trehun; }

  function changed() {
    app.save();
    for (const fn of syncs) fn();
    renderResult();
  }

  // A drop-down bound to one saved value. options: [{v, text}] or a function returning them (for live labels).
  function select(key, options, label, toValue) {
    const el = h('select', { class: 'in', 'aria-label': label, dataset: { key } });
    el.addEventListener('change', () => {
      s()[key] = toValue ? toValue(el.value) : el.value;
      changed();
    });
    syncs.push(() => {
      const list = typeof options === 'function' ? options() : options;
      if (typeof options === 'function' || !el.options.length) {
        el.replaceChildren(...list.map(o => h('option', { value: String(o.v), text: o.text })));
      }
      el.value = String(s()[key]);
      if (el.selectedIndex < 0) el.append(h('option', { value: String(s()[key]), text: `${s()[key]}%`, selected: true }));
    });
    return el;
  }

  // Puts a fixed-size picture of the chosen option in front of a drop-down. imgOf() returns '' for no picture.
  function pictured(selectEl, imgOf, cls) {
    const pic = h('span', { class: 'pic' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' });
    syncs.push(() => {
      const src = imgOf(selectEl.value);
      const cur = pic.firstChild;
      if (!src) { pic.replaceChildren(); return; }
      if (!cur || cur.getAttribute('src') !== src) pic.replaceChildren(h('img', { src, alt: '' }));
    });
    return h('span', { class: 'pic-select' }, pic, selectEl);
  }

  // Picture frame first, then the check box, laid out like the drop-down rows. The picture dims when unchecked.
  function picCheck(key, label, img) {
    const pic = h('span', { class: 'pic', 'aria-hidden': 'true' }, h('img', { src: img, alt: '' }));
    syncs.push(() => pic.classList.toggle('off', !s()[key]));
    return h('span', { class: 'pic-select pic-check' }, pic, check(key, label));
  }

  function check(key, label, img) {
    const input = h('input', { type: 'checkbox', dataset: { key }, onchange: e => { s()[key] = e.target.checked; changed(); } });
    syncs.push(() => { input.checked = !!s()[key]; });
    return h('label', { class: 'check' }, input, h('span', { class: 'check-box', 'aria-hidden': 'true' }),
      img ? h('img', { class: 'check-img', src: img, alt: '' }) : null, h('span', { text: label }));
  }

  function row(label, ...controls) {
    return h('div', { class: 'form-row' }, h('span', { class: 'form-label', text: label }), h('div', { class: 'form-ctrl' }, controls));
  }

  function group(title, ...rows) {
    return h('section', { class: 'form-group' }, h('h2', { class: 'ribbon' }, h('span', { text: title })), h('div', { class: 'form-box' }, rows));
  }

  // "X" means the option is not used, as players write it.
  const NONE = 'X';

  function form() {
    const numberValue = v => Number(v);
    const charaSelect = h('select', { class: 'in', 'aria-label': '리처드 / 미믹베리', dataset: { key: 'chara' } },
      h('option', { value: 'none', text: NONE }), h('option', { value: 'richard', text: '리처드 1%' }), h('option', { value: 'minic', text: '미믹베리 3%' }));
    charaSelect.addEventListener('change', () => {
      s().richard = charaSelect.value === 'richard';
      s().minic = charaSelect.value === 'minic';
      changed();
    });
    syncs.push(() => { charaSelect.value = s().minic ? 'minic' : s().richard ? 'richard' : 'none'; });

    const tearsOptions = () => D.TEARS.map((t, lv) => ({
      v: lv, text: lv ? `Lv${lv} · ${num(t.rate * (Number(s().tearsMul) || 1))}%${t.premium ? ' (프리미엄 패스)' : ''}` : NONE
    }));

    return [
      group('퀘스트·버프',
        row('고전장', select('boxBase', D.BOX_PRESETS.map(p => ({ v: p.v, text: `${p.label} · 상자 ${num(p.v)}%` })), '고전장 HELL', numberValue)),
        row('트헌', select('trehun', D.TREHUN_LEVELS.map((v, lv) => ({ v: lv, text: lv ? `Lv${lv} · ${v}%` : NONE })), '트레저 헌트', numberValue)),
        row('물방울',
          select('tears', tearsOptions, '물방울 레벨', numberValue),
          select('tearsMul', [1, 2, 3, 4].map(v => ({ v, text: v === 1 ? '기본' : `${v}배` })), '물방울 배율', numberValue)),
        row('단버프', select('crew', [0, 10, 15, 20].map(v => ({ v, text: v ? `풍향계 ${v}%` : NONE })), '단버프', numberValue))),
      group('파티',
        row('캐릭터', h('span', { class: 'pair' },
          pictured(select('essel', [{ v: 0, text: `엣셀 ${NONE}` }, { v: 5, text: '엣셀 4돌 5%' }, { v: 10, text: '최종 엣셀 10%' }], '엣셀', numberValue), v => v !== '0' ? D.PARTY_IMG.essel : ''),
          pictured(charaSelect, v => D.PARTY_IMG[v] || ''))),
        row('아티팩트', pictured(select('artifact', [0, 1, 2, 3, 4, 5].map(v => ({ v, text: v ? `Lv${v} · ${num(v * 0.5)}%` : NONE })), '아티팩트', numberValue), () => '', 'blank')),
        row('메인 무기', pictured(select('weapon', D.WEAPONS.map(w => ({ v: w.id, text: w.v ? `${w.label} ${w.v}%` : NONE })), '메인 무기'), v => C.findOption(D.WEAPONS, v).img || '')),
        row('소환석', pictured(select('myStone', D.MY_STONES.map(o => ({ v: o.id, text: o.v ? `${o.label} ${o.v}%` : NONE })), '소환석'), v => C.findOption(D.MY_STONES, v).img || '')),
        row('프렌석', pictured(select('friendStone', D.FRIEND_STONES.map(o => ({ v: o.id, text: o.v ? `${o.label} ${o.v}%` : NONE })), '프렌석'), v => C.findOption(D.FRIEND_STONES, v).img || '')),
        row('기타', h('span', { class: 'pair extras' },
          picCheck('dbee', 'D-비이 3%', D.PARTY_IMG.dbee),
          picCheck('book', '리베르 이니티스 3%', D.PARTY_IMG.book))))
    ];
  }

  function pct(n) { return num(C.round4(n)) + '%'; }

  // Sentence with the numbers picked out in bold.
  function line(parts) {
    return h('p', null, parts.map((p, i) => i % 2 ? h('b', { class: 'em', text: p }) : p));
  }

  function shardInfo() {
    const S = D.STELLAR;
    const first = line(['은 기본 ', `${S.gachaBoxes}개`, ' / 고전장 박스 ', `${S.oldBoxes}개`, ' / 갈갈하면 ', `${S.grind}개`, '를 얻어요.']);
    first.prepend(h('img', { class: 'shard-ico', src: 'img/item-stellar.jpg', alt: '극성기 파편' }));
    const second = line(['최종 ', `${S.final}개`, ' + 쬐종 ', `${S.beyond}개`, ' + 각성 ', `${S.awaken}개`, ' = 총합 ', `${S.final + S.beyond + S.awaken}개`, '가 필요해요.']);
    const box = h('div', { class: 'shard-info' }, first, second);
    // Each sentence stays on one line: shrink the text (both lines alike) until the longer one fits.
    // Text width grows in step with font size, so one measure gives the size; re-running it changes nothing.
    const fit = () => {
      const width = box.clientWidth - 18;
      if (width <= 0) return;
      const current = parseFloat(getComputedStyle(box).fontSize) || 13;
      const widestAt13 = Math.max(first.scrollWidth, second.scrollWidth) * 13 / current;
      const size = widestAt13 > width ? Math.max(8, Math.floor(13 * width / widestAt13 * 10) / 10) : 13;
      if (size !== current) box.style.fontSize = size + 'px';
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(box);
    fitShard = fit;
    return box;
  }

  function renderResult() {
    if (!resultEl) return;
    const r = C.calcDrop(s(), D);
    const runs = r.itemSure ? '매번 나와요' : isFinite(r.itemRuns) ? `평균 ${num(r.itemRuns, r.itemRuns < 10 ? 2 : 1)}회에 1개` : '나오지 않아요';
    resultEl.replaceChildren(
      // "평균 N회에 1개" large, "(드롭률 N%)" small beside it.
      h('div', { class: 'res-top' },
        h('b', { class: 'res-big' + (r.itemSure ? ' sure' : ''), id: 'resItemRuns', text: runs }),
        h('span', { class: 'res-rate' }, '(', h('span', { class: 'res-label', text: '드롭률 ' }), h('span', { id: 'resItem', text: pct(r.item) }), ')')),
      h('div', { class: 'res-mult' + (r.isCapped ? ' capped' : ''), id: 'resTotal' },
        h('span', { class: 'mult-bar', style: `width:${Math.min(100, r.capped / C.TOTAL_CAP * 100)}%` }),
        // The cap stays at 300%; anything above it is shown as the overflow.
        h('span', { class: 'mult-text', text: r.total > C.TOTAL_CAP
          ? `드롭 배율 ${num(r.total, 2)}% → 300% (${num(r.total - C.TOTAL_CAP, 2)}% 초과)`
          : `드롭 배율 ${pct(r.capped)}${r.isCapped ? ' (상한)' : ' / 300%'}` })));
  }
  function render() {
    const host = document.getElementById('tab-trehun');
    if (!host || !app) return;
    syncs = [];
    resultEl = h('div', { class: 'result', id: 'trehunResult', 'aria-live': 'polite' });
    host.replaceChildren(resultEl, shardInfo(), ...form(),
      h('div', { class: 'footer' }, confirmButton('처음 값으로', '한 번 더 누르면 초기화', () => {
        app.state.trehun = Object.assign({}, D.TREHUN_DEFAULTS);
        changed();
      })),
      h('p', { class: 'note', text: '헬 상자 드롭률은 커뮤니티 추정치예요. 참고: liliel 님 トレハン計算機' }));
    for (const fn of syncs) fn();
    renderResult();
  }

  root.GBF_TREHUN = {
    mount(appRef) { app = appRef; render(); },
    render,
    fit() { fitShard(); }
  };
})(globalThis);
