// 월간교환 tab: weekly caps on top, then the monthly exchange checklist (one compact row per shop, one chip per item).
(function (root) {
  const { h, toast, num, confirmButton } = root.GBF_UI;
  const D = root.GBF_DATA;
  const C = root.GBF_CORE;
  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  let app = null;
  let editing = false;

  function m() { return app.state.monthly; }

  function commit() {
    app.save();
    render();
  }

  function setProgress(id, value) {
    const progress = m().progress;
    if (value > 0) progress[id] = value; else delete progress[id];
  }

  function kindOf(i) { return D.KINDS[i.kind] && i.kind !== 'other' ? i.kind : 'other'; }

  function itemIcon(kind) {
    const img = D.KINDS[kind] && D.KINDS[kind].img;
    return img ? h('img', { class: 'item-ico', src: img, alt: '' }) : h('i', { class: 'item-ico other' });
  }

  // Monthly totals on one line ([icon] 1/2 …), the countdown to the next monthly reset beside or under them.
  function statusBar(groups) {
    const now = new Date();
    const next = C.nextReset(now);
    const p = C.jstParts(next);
    const { left, total } = C.remaining(groups);
    return h('div', { class: 'status' },
      h('div', { class: 'status-left' }, ['gold', 'half', 'seed', 'quartz'].map(kind =>
        h('span', { class: `stock kind-${kind}`, title: `${D.KINDS[kind].full} · 이번 달 교환한 수량` },
          itemIcon(kind),
          h('b', { class: 'stock-num', dataset: { kind }, text: num(total[kind] - left[kind], 0) }),
          h('small', { text: `/${num(total[kind], 0)}` })))),
      h('div', { class: 'status-reset', title: `다음 리셋 ${p.month}월 ${p.day}일(${WEEKDAYS[p.weekday]}) 05:00` },
        h('span', { class: 'reset-line' }, h('small', { text: '리셋까지 ' }), h('b', { id: 'resetLeft', text: C.formatLeft(next - now).replace(' 남음', '') })),
        h('small', { id: 'resetAt', text: `${p.month}/${p.day}(${WEEKDAYS[p.weekday]}) 05:00` })));
  }

  // ---- Weekly caps ----
  function w() { return app.state.weekly; }
  function weeklyQty(x) { return x.up && w().opts[x.up.key] ? x.up.qty : x.qty; }

  function weeklySection() {
    const now = new Date();
    const next = C.nextWeeklyReset(now);
    const p = C.jstParts(next);
    const cell = x => {
      const done = !!w().done[x.id];
      const qty = weeklyQty(x);
      return h('div', { class: 'wk-cell' + (done ? ' done' : ''), dataset: { id: x.id } },
        h('button', {
          type: 'button', class: 'chip-item wk-chip' + (done ? ' done' : ''), title: x.tip,
          'aria-pressed': done ? 'true' : 'false', 'aria-label': `${x.name} ${num(qty, 0)} ${done ? '완료' : '진행 전'}`,
          onclick: () => { if (done) delete w().done[x.id]; else w().done[x.id] = true; commit(); }
        }, h('img', { class: 'item-ico', src: x.img, alt: '' }), h('span', { class: 'chip-qty', text: `×${num(qty, 0)}` })),
        h('div', { class: 'wk-sub' },
          h('span', { class: 'wk-name', text: x.name }),
          x.up ? h('label', { class: 'wk-opt', title: x.tip },
            h('input', { type: 'checkbox', checked: !!w().opts[x.up.key], dataset: { opt: x.up.key },
              onchange: e => { w().opts[x.up.key] = e.target.checked; commit(); } }),
            x.up.label) : h('span', { class: 'wk-note', text: x.note || '' })));
    };
    return h('section', { class: 'weekly' },
      h('div', { class: 'wk-cells' }, D.WEEKLY.map(cell)),
      h('div', { class: 'wk-reset', title: `다음 리셋 ${p.month}월 ${p.day}일(${WEEKDAYS[p.weekday]}) 05:00` },
        h('small', { text: '리셋까지 ' }), h('b', { id: 'weekLeft', text: C.formatLeft(next - now).replace(' 남음', '') }),
        h('small', { text: ` · 매주 월 05:00` })));
  }

  function chip(i) {
    const kind = kindOf(i);
    const qtyText = `×${num(i.perKind ? i.perQty : i.qty, 0)}`;
    const tip = `${i.name} ${num(i.qty, 0)}개${i.cost ? ' · ' + i.cost : ''}`;
    return h('button', {
      type: 'button', class: `chip-item kind-${kind}` + (i.complete ? ' done' : ''), title: tip,
      'aria-pressed': i.complete ? 'true' : 'false', 'aria-label': `${i.name} ${num(i.qty, 0)}개 ${i.complete ? '교환함' : '교환 전'}`,
      dataset: { id: i.id },
      onclick: () => { setProgress(i.id, i.complete ? 0 : 1); commit(); }
    }, itemIcon(kind), kind === 'other' ? h('span', { class: 'chip-name', text: i.name }) : null, h('span', { class: 'chip-qty', text: qtyText }));
  }

  // Treasure chips hold their own number field; Enter applies it, leaving the field puts back the saved number.
  //  반홍: [icon ×[total]]   시드: [icon ×50×[kinds]]
  function treasureChip(i) {
    const st = m();
    const kind = kindOf(i);
    const saved = i.userTotal ? i.qty : i.kinds;
    const input = h('input', {
      class: 'kinds-in' + (i.userTotal ? ' wide' : ''), type: 'number', min: 0, max: i.userTotal ? 99999 : D.TREASURE_KINDS_MAX, step: 1,
      inputmode: 'numeric', value: String(saved), dataset: { kinds: i.id },
      'aria-label': i.userTotal ? `${i.name} 교환할 총 수량 (Enter로 확정)` : `${i.name} 교환할 트레저 종류 수 (Enter로 확정)`
    });
    input.addEventListener('blur', () => { input.value = String(saved); });
    const toggle = h('button', {
      type: 'button', class: 'tchip-toggle', dataset: { id: i.id }, title: `${i.name} ${num(i.qty, 0)}개${i.cost ? ' · ' + i.cost : ''}`,
      'aria-pressed': i.complete ? 'true' : 'false', 'aria-label': `${i.name} ${num(i.qty, 0)}개 ${i.complete ? '교환함' : '교환 전'}`,
      onclick: () => { setProgress(i.id, i.complete ? 0 : 1); commit(); }
    }, itemIcon(kind), h('span', { class: 'chip-qty', text: i.userTotal ? '×' : `×${num(i.perQty, 0)}×` }));
    return h('span', { class: `chip-item tchip kind-${kind}` + (i.complete ? ' done' : '') }, toggle,
      h('form', {
        class: 'kinds', novalidate: true, onsubmit: e => {
          e.preventDefault();
          if (input.value === '') return;
          if (i.userTotal) {
            const n = C.clampQty(input.value);
            st.userQty = Object.assign({}, st.userQty, { [i.id]: n });
            toast(`${i.name} ${num(n, 0)}개로 정했어요`);
          } else {
            const n = C.clampKinds(input.value);
            st.treasureKinds = Object.assign({}, st.treasureKinds, { [i.id]: n });
            toast(`${i.name} 트레저 ${n}종으로 정했어요`);
          }
          commit();
        }
      }, input));
  }
  // Yellow "!" that shows its note right under itself while hovered or focused.
  function hintMark(text) {
    const tip = h('span', { class: 'tip', role: 'tooltip', text });
    const mark = h('span', { class: 'hint-mark', tabindex: '0', 'aria-label': text }, '!', tip);
    const place = () => {
      const r = mark.getBoundingClientRect();
      const width = Math.min(240, document.documentElement.clientWidth - 16);
      const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, document.documentElement.clientWidth - width - 8));
      tip.style.width = width + 'px';
      tip.style.left = left + 'px';
      tip.style.top = (r.bottom + 7) + 'px';
      tip.style.setProperty('--arrow-x', (r.left + r.width / 2 - left) + 'px');
    };
    mark.addEventListener('mouseenter', place);
    mark.addEventListener('focus', place);
    return mark;
  }

  const TREASURE_TIP = '코옵 → 호스트 퀘스트 → 아이템 → 트레져 → 리커버리 아이템으로 더 많은 반홍을 편리하게 교환할 수 있어요.';

  function thumb(g, onclick, title) {
    return h('button', { type: 'button', class: 'shop-thumb' + (g.img ? '' : ' plain'), title, onclick },
      g.img ? h('img', { src: g.img, alt: g.name }) : h('span', { class: 'thumb-text', text: g.name }));
  }

  function shopRow(g) {
    const items = g.items.filter(i => !i.hidden);
    if (!items.length) return null;
    const done = items.filter(i => i.complete).length;
    const allDone = done === items.length;
    const toggleAll = () => { for (const i of items) setProgress(i.id, allDone ? 0 : i.steps); commit(); };
    const isTreasureItem = i => i.perKind || i.userTotal;
    return h('section', { class: 'shop' + (allDone ? ' all-done' : '') + (items.some(isTreasureItem) ? ' has-fields' : ''), dataset: { group: g.id } },
      thumb(g, toggleAll, allDone ? '눌러서 이 교환소 체크 모두 해제' : '눌러서 이 교환소 모두 교환함으로 체크'),
      h('div', { class: 'shop-body' },
        h('div', { class: 'shop-title' },
          h('b', { text: g.name }),
          g.id === 'treasure' ? hintMark(TREASURE_TIP) : null,
          h('span', { class: 'count' + (allDone ? ' done' : ''), text: `${done}/${items.length}` })),
        h('div', { class: 'chips' }, items.map(i => isTreasureItem(i) ? treasureChip(i) : chip(i)))),
    );
  }
  // ---- Edit mode ----
  function setField(i, groupId, key, value) {
    const st = m();
    if (key === 'qty' && i.userTotal) { st.userQty = Object.assign({}, st.userQty, { [i.id]: C.clampQty(value) }); return; }
    if (i.custom) {
      const target = (st.custom.items[groupId] || []).find(x => x.id === i.id);
      if (target) target[key] = value;
      return;
    }
    st.overrides[i.id] = Object.assign({}, st.overrides[i.id], { [key]: value });
  }

  function editItem(i, g) {
    const st = m();
    const kind = kindOf(i);
    const action = i.custom
      ? h('button', {
        type: 'button', class: 'btn tiny danger', text: '삭제', onclick: () => {
          st.custom.items[g.id] = (st.custom.items[g.id] || []).filter(x => x.id !== i.id);
          delete st.progress[i.id];
          commit();
        }
      })
      : h('button', {
        type: 'button', class: 'btn tiny', text: i.hidden ? '보이기' : '숨기기', onclick: () => {
          st.hidden = i.hidden ? st.hidden.filter(x => x !== i.id) : st.hidden.concat(i.id);
          commit();
        }
      });
    return h('div', { class: 'edit-item' + (i.hidden ? ' is-hidden' : ''), dataset: { id: i.id } },
      itemIcon(kind),
      h('input', { class: 'in name', value: i.name, maxlength: 30, 'aria-label': '이름', onchange: e => { setField(i, g.id, 'name', e.target.value.trim()); commit(); } }),
      h('input', { class: 'in qty', type: 'number', min: 0, max: 99999, value: String(i.perKind ? i.perQty : i.qty), 'aria-label': i.perKind ? '종류당 수량' : '수량', onchange: e => { setField(i, g.id, 'qty', Math.max(0, Math.min(99999, Number(e.target.value) || 0))); commit(); } }),
      action);
  }

  function addItemForm(g) {
    const kind = h('select', { class: 'in kind', 'aria-label': '종류' },
      Object.entries(D.KINDS).map(([id, k]) => h('option', { value: id, text: k.label })));
    const name = h('input', { class: 'in name', maxlength: 30, placeholder: '이름(선택)', 'aria-label': '새 항목 이름' });
    const qty = h('input', { class: 'in qty', type: 'number', min: 0, max: 99999, value: '1', 'aria-label': '새 항목 수량' });
    return h('form', {
      class: 'edit-item add', onsubmit: e => {
        e.preventDefault();
        const st = m();
        const label = name.value.trim() || D.KINDS[kind.value].label;
        (st.custom.items[g.id] || (st.custom.items[g.id] = [])).push({
          id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          kind: kind.value, name: label, qty: Math.max(0, Math.min(99999, Number(qty.value) || 0)), cost: ''
        });
        commit();
        toast(`"${label}" 항목을 추가했어요`);
      }
    }, kind, name, qty, h('button', { class: 'btn tiny primary', type: 'submit', text: '추가' }));
  }

  function editShop(g) {
    const st = m();
    return h('section', { class: 'edit-shop', dataset: { group: g.id } },
      h('div', { class: 'edit-head' },
        g.img ? h('img', { class: 'edit-thumb', src: g.img, alt: '' }) : null,
        h('b', { text: g.name }),
        g.custom ? confirmButton('묶음 삭제', '한 번 더', () => {
          st.custom.groups = st.custom.groups.filter(x => x.id !== g.id);
          for (const i of st.custom.items[g.id] || []) delete st.progress[i.id];
          delete st.custom.items[g.id];
          commit();
        }, 'btn tiny danger') : null),
      g.items.map(i => editItem(i, g)),
      addItemForm(g));
  }

  function editFooter() {
    const st = m();
    const name = h('input', { class: 'in', maxlength: 24, placeholder: '새 교환소 이름 (예: 이벤트 교환)', 'aria-label': '새 교환소 이름' });
    return h('div', { class: 'edit-footer' },
      h('form', {
        class: 'add-group', onsubmit: e => {
          e.preventDefault();
          const label = name.value.trim();
          if (!label) return;
          st.custom.groups.push({ id: 'g-' + Date.now().toString(36), name: label, sub: '직접 추가' });
          commit();
        }
      }, name, h('button', { class: 'btn tiny primary', type: 'submit', text: '교환소 추가' })),
      confirmButton('숨김·수정 되돌리기', '한 번 더 누르면 되돌려요', () => {
        st.hidden = [];
        st.overrides = {};
        commit();
        toast('기본 목록으로 되돌렸어요');
      }, 'btn ghost'));
  }

  function render() {
    const host = document.getElementById('tab-monthly');
    if (!host || !app) return;
    const groups = C.resolveGroups(D.GROUPS, m(), D.KINDS);
    const rows = editing ? groups.map(editShop) : groups.map(shopRow).filter(Boolean);
    host.replaceChildren(...[
      editing ? null : h('h2', { class: 'ribbon' }, h('span', { text: '주간 교환' })),
      editing ? null : weeklySection(),
      h('h2', { class: 'ribbon' }, h('span', { text: editing ? '교환소 편집' : '월간 교환' })),
      editing ? null : statusBar(groups),
      h('div', { class: editing ? 'edit-list' : 'shops' }, rows.length ? rows : h('p', { class: 'empty', text: '표시할 교환소가 없어요. [편집]에서 숨긴 항목을 되돌릴 수 있어요.' })),
      editing ? editFooter() : null,
      h('div', { class: 'footer' },
        h('button', { type: 'button', class: 'btn' + (editing ? ' primary' : ''), text: editing ? '편집 끝' : '편집', onclick: () => { editing = !editing; render(); } }),
        editing ? null : confirmButton('이번 달 체크 지우기', '한 번 더 누르면 지워져요', () => {
          m().progress = {};
          commit();
          toast('이번 달 체크를 모두 지웠어요');
        }))
    ].filter(Boolean));
  }

  function tick() {
    const left = document.getElementById('resetLeft');
    if (left) left.textContent = C.formatLeft(C.nextReset(new Date()) - new Date()).replace(' 남음', '');
    const week = document.getElementById('weekLeft');
    if (week) week.textContent = C.formatLeft(C.nextWeeklyReset(new Date()) - new Date()).replace(' 남음', '');
  }

  root.GBF_MONTHLY = {
    mount(appRef) { app = appRef; render(); },
    render,
    tick
  };
})(globalThis);
