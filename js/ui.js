// Small DOM helpers. Text is always set through textContent, never as HTML.
(function (root) {
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === null || value === undefined || value === false) continue;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
        else if (typeof value !== 'string' && key in el) el[key] = value;
        else el.setAttribute(key, value === true ? '' : String(value));
      }
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  let toastTimer = 0;
  function toast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = h('div', { id: 'toast', role: 'status' });
      document.body.append(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function num(n, digits) {
    if (!isFinite(n)) return '-';
    return n.toLocaleString('ko-KR', { maximumFractionDigits: digits === undefined ? 4 : digits });
  }

  // A button that asks for a second click before running a destructive action.
  function confirmButton(label, confirmLabel, onConfirm, cls) {
    let armed = false, timer = 0;
    const btn = h('button', { class: cls || 'btn ghost danger', type: 'button', text: label });
    btn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        btn.textContent = confirmLabel;
        btn.classList.add('armed');
        timer = setTimeout(() => { armed = false; btn.textContent = label; btn.classList.remove('armed'); }, 3000);
        return;
      }
      clearTimeout(timer);
      onConfirm();
    });
    return btn;
  }

  // Small icon that shows a floating note (title + lines) while hovered or focused.
  let floatTip = null;
  function showTip(anchor, title, lines) {
    if (!floatTip) {
      floatTip = h('div', { class: 'float-tip', role: 'tooltip' });
      document.body.append(floatTip);
    }
    floatTip.replaceChildren(h('b', { text: title }), ...lines.map(l => h('div', { text: l })));
    floatTip.classList.add('show');
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    // Shrink to the text (a one-word note gets a small box), but never wider than 240px.
    floatTip.style.width = 'auto';
    floatTip.style.maxWidth = Math.min(240, vw - 16) + 'px';
    const width = floatTip.offsetWidth;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, vw - width - 8));
    floatTip.style.left = left + 'px';
    floatTip.style.setProperty('--arrow-x', (r.left + r.width / 2 - left) + 'px');
    const below = r.bottom + 7;
    const height = floatTip.offsetHeight;
    const above = below + height > vh - 4 && r.top - height - 7 > 4;
    floatTip.classList.toggle('above', above);
    floatTip.style.top = (above ? r.top - height - 7 : below) + 'px';
  }
  function hideTip() { if (floatTip) floatTip.classList.remove('show'); }
  function tipIcon(icon, cls) {
    const el = h('span', { class: 'tip-icon' + (cls ? ' ' + cls : ''), tabindex: '0', 'aria-label': `${icon.name}: ${icon.lines.join(' / ')}` },
      h('img', { src: icon.img, alt: '' }));
    el.addEventListener('mouseenter', () => showTip(el, icon.name, icon.lines));
    el.addEventListener('focus', () => showTip(el, icon.name, icon.lines));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('blur', hideTip);
    return el;
  }

  root.GBF_UI = { h, toast, num, confirmButton, tipIcon, showTip, hideTip };
})(globalThis);
