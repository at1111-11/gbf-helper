// 패턴표 tab: a tall HP bar in the middle, the boss's patterns on the left at their HP,
// and one continuous memo on the right (never split by section) with faint guides at each HP mark.
(function (root) {
  const { h, tipIcon, showTip, hideTip } = root.GBF_UI;
  const P = root.GBF_PATTERN_DATA;
  let app = null;
  let saveTimer = 0;
  let observer = null;

  const KIND_TAG = { ct: 'CT', special: '특수', note: '안내', 'route-b': '파랑', 'route-r': '빨강' };

  function st() { return app.state.pattern; }

  function normalize(p) {
    const out = Object.assign({ boss: 'tengen', memo: {} }, p || {});
    out.memo = Object.assign({}, out.memo);
    if (!P.BOSSES.some(b => b.id === out.boss)) out.boss = 'tengen';
    return out;
  }

  function boss() { return P.BOSSES.find(b => b.id === st().boss) || P.BOSSES[0]; }

  function bossTabs() {
    return h('div', { class: 'pt-tabs', role: 'tablist', 'aria-label': '보스' }, P.BOSSES.map(b =>
      h('button', {
        type: 'button', role: 'tab', class: 'pt-tab' + (b.id === st().boss ? ' on' : ''), 'aria-selected': b.id === st().boss ? 'true' : 'false',
        dataset: { boss: b.id }, onclick: () => { st().boss = b.id; app.save(); render(); },
        title: b.full, 'aria-label': b.full
      }, h('img', { src: b.img, alt: '' }))));
  }

  // Hover icons for the statuses that belong to this pattern (apples, 사왕천, 시련, 용기 …).
  function icons(keys, cls) {
    if (!keys || !keys.length) return null;
    return h('span', { class: 'pt-icons' + (cls ? ' ' + cls : '') }, keys.map(k => P.ICONS[k] ? tipIcon(P.ICONS[k]) : null));
  }

  // "시작할 때" box. A boss with a gauge (루시제로's 디 엔드 게이지) shows the in-game bar at the top right
  // and, under the lines, what the boss gains as segments run out (one row per segment, coloured like the bar).
  function opening(o) {
    const g = o.gauge;
    return h('div', { class: 'pt-opening' },
      h('div', { class: 'pt-opening-head' }, h('b', { text: '시작할 때' }), icons(o.icons),
        g ? h('span', { class: 'pt-gauge' }, h('small', { text: g.label }), h('img', { src: g.img, alt: g.label })) : null),
      h('ul', null, o.lines.map(t => h('li', { text: t }))),
      g ? h('div', { class: 'pt-gauge-levels' },
        h('div', { class: 'pt-gauge-title', text: g.title }),
        g.levels.map(lv => h('div', { class: 'pt-gauge-row' },
          h('span', { class: 'pt-gauge-chip', style: `--seg:${lv.color}` }, h('i'), `${lv.left}칸`),
          h('span', { text: lv.text })))) : null);
  }

  // A line is plain text, or one pattern of a list ({ n: name, c: cancel, t: cancel under 타화자재, e: effect }) on its own row.
  // The 타화자재 condition gets its own full line under the normal one: "해제 약체 15회 + TA 4회" / "타화자재 약체 18회 + TA 5회".
  // Debuff icon from the sprite, in place of the word; hovering shows the effect.
  function debuff(name) {
    const d = P.DEBUFFS[name];
    if (!d) return name;
    const el = h('span', { class: 'pt-debuff', tabindex: '0', role: 'img', 'aria-label': `${name}: ${d.lines.join(' / ')}`, style: `--i:${d.i}` });
    el.addEventListener('mouseenter', () => showTip(el, name, d.lines));
    el.addEventListener('focus', () => showTip(el, name, d.lines));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('blur', hideTip);
    return el;
  }
  // Text with {디버프} / {@ICONS key} tokens → text and icons.
  function token(part) {
    if (part[0] !== '@') return debuff(part);
    const icon = P.ICONS[part.slice(1)];
    return icon ? tipIcon(icon, 'pt-inline') : part.slice(1);
  }
  function rich(text) {
    return String(text).split(/\{([^{}]+)\}/).map((part, k) => k % 2 ? token(part) : part).filter(x => x !== '');
  }

  function line(l) {
    if (typeof l === 'string') return h('li', null, rich(l));
    if (l.head) return h('li', { class: 'pt-lhead', text: l.head });
    if (l.reset) return h('li', { class: 'pt-reset' }, h('img', { src: 'img/icons/the-end-gauge.png', alt: '' }), `디 엔드 ${l.start ? '시작' : '리셋'} · ${l.reset} 타임어택`);
    if (l.ct) return h('li', { class: 'pt-lhead' }, h('span', { class: 'pt-tag is-ct', text: 'CT' }), ' ' + l.ct);
    if (l.k) return h('li', { class: 'pt-kv' }, h('b', { text: l.k }), h('span', null, rich(l.v)));
    return h('li', { class: 'pt-sub' },
      h('div', { class: 'pt-sub-head' },
        l.n ? h('b', null, rich(l.n)) : null,
        l.c ? h('span', { class: 'pt-sub-cond' }, h('i', { text: '해제' }), l.c) : null),
      l.t ? h('div', { class: 'pt-sub-hard', title: '타화자재가 붙었을 때의 해제 조건' }, h('i', { text: '타화자재' }), l.t) : null,
      l.e ? h('div', { class: 'pt-sub-eff' }, rich(l.e)) : null);
  }

  function card(row) {
    const tag = row.when || KIND_TAG[row.kind] || '';
    return h('div', { class: `pt-card k-${row.kind}` + (row.danger ? ' danger' : '') + (row.stamp ? ' has-stamp' : '') },
      row.stamp ? tipIcon(P.ICONS[row.stamp] || P.ICONS.stamp, 'pt-stamp') : null,
      h('div', { class: 'pt-card-head' },
        tag ? h('span', { class: 'pt-tag', text: tag }) : null,
        h('b', { class: 'pt-name', text: row.name }),
        icons(row.icons)),
      row.cond ? h('div', { class: 'pt-cond' }, h('span', { text: '해제' }), row.cond) : null,
      row.lines && row.lines.length ? h('ul', { class: 'pt-lines' }, row.lines.map(line)) : null,
      row.note ? h('div', { class: 'pt-note', text: row.note }) : null);
  }

  // Builds the grid: one grid row per phase band and per pattern. Memo spans every row.
  function board(b) {
    const cells = [];
    let gridRow = 1;
    const marks = [];
    for (const phase of b.phases) {
      cells.push(h('div', { class: `pt-phase tone-${phase.tone}`, style: `grid-row:${gridRow}` }, h('b', { text: phase.range }), phase.summary ? h('span', { text: phase.summary }) : null));
      cells.push(h('div', { class: `pt-bar tone-${phase.tone} start`, style: `grid-row:${gridRow}` }));
      gridRow++;
      for (const row of phase.rows) {
        cells.push(h('div', { class: 'pt-cell', style: `grid-row:${gridRow}`, dataset: { at: row.at || '' } }, card(row)));
        const bar = h('div', { class: `pt-bar tone-${phase.tone}`, style: `grid-row:${gridRow}` },
          row.at ? h('span', { class: 'pt-mark' }, h('i'), h('b', { text: row.at })) : null);
        cells.push(bar);
        if (row.at) marks.push({ gridRow, label: row.at });
        gridRow++;
      }
    }
    const memo = memoBox(b, marks, gridRow);
    return h('div', { class: 'pt-board', id: 'ptBoard' }, cells, memo);
  }

  // Memo per boss, split at every HP mark: { '100%': text, '90%': text, … }. An older single-text memo goes to the first mark.
  function memoOf(b) {
    let m = st().memo[b.id];
    if (typeof m === 'string') m = { [firstMark(b)]: m };
    if (!m || typeof m !== 'object') m = {};
    st().memo[b.id] = m;
    return m;
  }
  function firstMark(b) {
    for (const phase of b.phases) for (const row of phase.rows) if (row.at) return row.at;
    return '';
  }

  // The memo column: one box per HP section (from one mark to the next). Each box grows with its text; a box taller than its
  // patterns pushes the rows below down, so the HP marks, patterns and memo stay lined up.
  function memoBox(b, marks, end) {
    const memo = memoOf(b);
    const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => app.save(), 300); };
    const boxes = marks.map((m, i) => {
      const area = h('textarea', { class: 'pt-memo-text', rows: 1, spellcheck: false, dataset: { at: m.label }, 'aria-label': `${b.name} ${m.label} 구간 메모` });
      // Blank lines at the end (left by a click below the text, or by Enter without typing) are never kept.
      const clean = v => String(v || '').replace(/\s+$/, '');
      area.value = clean(memo[m.label]);
      if (!area.value) delete memo[m.label];
      area.addEventListener('input', () => {
        if (area.value) memo[m.label] = area.value; else delete memo[m.label];
        fitMemo(area);
        save();
      });
      area.addEventListener('blur', () => {
        const v = clean(area.value);
        if (v === area.value) return;
        area.value = v;
        if (v) memo[m.label] = v; else delete memo[m.label];
        fitMemo(area);
        save();
      });
      // While a Korean syllable is being composed, leave the box alone so the composition is never broken.
      area.addEventListener('compositionstart', () => { area.dataset.composing = '1'; });
      area.addEventListener('compositionend', () => { delete area.dataset.composing; fitMemo(area); });
      // Clicking empty space below the text starts writing on the clicked line (blank lines are added up to it),
      // but never past the last line that already fits, so a click alone never makes the box grow.
      area.addEventListener('click', e => {
        if (area.selectionStart !== area.selectionEnd) return;
        const rect = area.getBoundingClientRect();
        const lh = lineHeight(area);
        const fits = Math.max(1, Math.floor((area.clientHeight - padTop(area) - padBottom(area)) / lh));
        const k = Math.min(Math.floor((e.clientY - rect.top + area.scrollTop - padTop(area)) / lh), fits - 1);
        if (k >= lineCount(area, area.value)) caretToLine(area, k, () => area.dispatchEvent(new Event('input')));
      });
      const stop = i + 1 < marks.length ? marks[i + 1].gridRow : end;
      return h('div', { class: 'pt-memo-sec' + (i ? '' : ' first'), style: `grid-row:${m.gridRow} / ${stop}`, dataset: { at: m.label } }, area);
    });
    return [h('div', { class: 'pt-memo-head', style: 'grid-row:1' }, '행동 메모'), ...boxes];
  }

  // Makes a memo box at least as tall as its text (it still fills its section when the text is short).
  // The height comes from a hidden copy of the text, so the box itself is never resized while typing unless a line
  // is actually added or removed.
  function fitMemo(area) {
    if (area.dataset.composing) return;
    const need = Math.ceil(lineCount(area, area.value) * lineHeight(area) + padTop(area) + padBottom(area));
    if (area.style.minHeight !== need + 'px') area.style.minHeight = need + 'px';
  }
  function fitAll() {
    const boardEl = document.getElementById('ptBoard');
    if (boardEl) boardEl.querySelectorAll('.pt-memo-text').forEach(fitMemo);
  }

  // ---- Memo line helpers. A hidden copy of the memo measures how many visual lines a text takes. ----
  let mirror = null;
  function lineHeight(area) { return parseFloat(getComputedStyle(area).lineHeight) || 17; }
  function padTop(area) { return parseFloat(getComputedStyle(area).paddingTop) || 0; }
  function padBottom(area) { return parseFloat(getComputedStyle(area).paddingBottom) || 0; }
  function lineCount(area, text) {
    if (!mirror) {
      mirror = document.createElement('div');
      mirror.setAttribute('aria-hidden', 'true');
      Object.assign(mirror.style, { position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', boxSizing: 'border-box' });
      document.body.appendChild(mirror);
    }
    const cs = getComputedStyle(area);
    Object.assign(mirror.style, { width: area.clientWidth + 'px', font: cs.font, letterSpacing: cs.letterSpacing, padding: cs.padding, border: '0' });
    mirror.textContent = text + '​';
    const inner = mirror.scrollHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return Math.max(1, Math.round(inner / lineHeight(area)));
  }
  // Adds blank lines so the caret lands on visual line k (only called below the end of the text).
  function caretToLine(area, k, onChange) {
    const total = lineCount(area, area.value);
    if (k > total - 1) {
      area.value += '\n'.repeat(k - (total - 1));
      onChange();
    }
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
  }

  function render() {
    const host = document.getElementById('tab-pattern');
    if (!host || !app) return;
    const b = boss();
    host.replaceChildren(...[
      bossTabs(),
      h('div', { class: 'pt-head' },
        h('img', { src: b.img, alt: '' }),
        h('div', { class: 'pt-head-body' }, h('b', { text: b.full }),
          h('div', { class: 'pt-info' }, b.info.map(([k, v]) => h('span', null, h('small', { text: k }), v)))),
        h('span', { class: 'pt-head-stamp' }, tipIcon({ img: P.ICONS.stamp.img, name: '이렇게요!', lines: [] }), '각 아이콘에 커서를 올리면 상세내용이 나와요.')),
      b.opening ? opening(b.opening) : null,
      board(b),
      h('p', { class: 'note', text: '패턴: 사용자 제공 패턴표(천원) · GameWith 패턴표(루시제로·베르수시아)를 HP 순서로 다시 정리, 아이콘·효과는 gbf.wiki 레이드 문서 참고. 메모는 이 PC에만 저장돼요.' })
    ].filter(Boolean));
    requestAnimationFrame(fitAll);
    // Text wraps differently when the panel width changes, so the boxes are re-fitted then (width only, to avoid loops).
    if (observer) observer.disconnect();
    if (typeof ResizeObserver === 'function') {
      let lastWidth = 0;
      observer = new ResizeObserver(entries => {
        const w = Math.round(entries[0].contentRect.width);
        if (w !== lastWidth) { lastWidth = w; fitAll(); }
      });
      observer.observe(document.getElementById('ptBoard'));
    }
  }

  root.GBF_PATTERN = {
    normalize,
    mount(appRef) { app = appRef; render(); },
    render,
    refresh: fitAll
  };
})(globalThis);
