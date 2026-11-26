// Panel start-up: loads saved state, applies the monthly reset and switches tabs.
(function (root) {
  const D = root.GBF_DATA;
  const C = root.GBF_CORE;
  const Store = root.GBF_STORE;
  const { toast } = root.GBF_UI;

  const app = {
    state: null,
    lastSaved: '',
    save() {
      app.lastSaved = JSON.stringify(app.state);
      Store.save(app.state);
    }
  };

  function normalize(raw) {
    const state = Object.assign({ v: 1, tab: 'monthly' }, raw || {});
    if (state.v < 2) {
      // 1.2.0: new calculator defaults, and treasure trades became one check per item.
      delete state.trehun;
      if (state.monthly && state.monthly.progress) {
        delete state.monthly.progress['treasure-half'];
        delete state.monthly.progress['treasure-seed'];
      }
      state.v = 2;
    }
    state.monthly = C.normalizeMonthly(state.monthly);
    state.trehun = Object.assign({}, D.TREHUN_DEFAULTS, state.trehun || {});
    // The 극성기 rate is fixed and the box rate is one of the HELL presets.
    state.trehun.itemBase = D.ITEM_RATE;
    // 조루리 (the upgraded 올리버) was removed; saved choices move to 올리버.
    if (state.trehun.weapon === 'joruri') state.trehun.weapon = 'oliver';
    // 노비요 3돌 was removed from the summon list.
    for (const key of ['myStone', 'friendStone']) if (state.trehun[key] === 'nobiyo3') state.trehun[key] = 'none';
    if (!D.BOX_PRESETS.some(p => p.v === state.trehun.boxBase)) state.trehun.boxBase = D.TREHUN_DEFAULTS.boxBase;
    // Options removed in 1.1.0 go back to the reference calculator's defaults.
    state.trehun.coexist = false;
    state.trehun.bookSlot = 'gear';
    delete state.trehun.showOver;
    if (state.trehun.richard && state.trehun.minic) state.trehun.richard = false;
    state.gw = root.GBF_GW.normalize(state.gw);
    state.search = root.GBF_SEARCH.normalize(state.search);
    state.pattern = root.GBF_PATTERN.normalize(state.pattern);
    if (!['monthly', 'trehun', 'gw', 'search', 'pattern', 'recommend'].includes(state.tab)) state.tab = 'monthly';
    return state;
  }

  function checkReset(showNotice) {
    const result = C.applyMonthlyReset(app.state.monthly, new Date());
    if (result.state.period !== app.state.monthly.period || result.didReset) {
      app.state.monthly = result.state;
      app.save();
      if (result.didReset && showNotice) toast('새 달이 시작돼서 월간교환 체크를 풀었어요');
      return true;
    }
    return false;
  }

  function showTab(tab) {
    app.state.tab = tab;
    for (const btn of document.querySelectorAll('.tabs [data-tab]')) {
      const on = btn.dataset.tab === tab;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    }
    document.getElementById('tab-monthly').hidden = tab !== 'monthly';
    document.getElementById('tab-trehun').hidden = tab !== 'trehun';
    document.getElementById('tab-gw').hidden = tab !== 'gw';
    document.getElementById('tab-search').hidden = tab !== 'search';
    document.getElementById('tab-pattern').hidden = tab !== 'pattern';
    document.getElementById('tab-recommend').hidden = tab !== 'recommend';
    if (tab === 'pattern' && root.GBF_PATTERN) requestAnimationFrame(() => root.GBF_PATTERN.refresh());
    if (tab === 'trehun' && root.GBF_TREHUN) root.GBF_TREHUN.fit();
  }

  function updateHeaderHeight() {
    const top = document.querySelector('.top');
    if (top) document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
  }

  async function start() {
    app.state = normalize(await Store.load());
    checkReset(true);
    app.save();

    for (const btn of document.querySelectorAll('.tabs [data-tab]')) {
      btn.addEventListener('click', () => { showTab(btn.dataset.tab); app.save(); window.scrollTo(0, 0); });
    }
    showTab(app.state.tab);
    root.GBF_MONTHLY.mount(app);
    root.GBF_TREHUN.mount(app);
    root.GBF_GW.mount(app);
    root.GBF_SEARCH.mount(app);
    root.GBF_PATTERN.mount(app);
    root.GBF_RECOMMEND.mount(app);
    if (app.state.tab === 'trehun') root.GBF_TREHUN.fit();
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    // Keeps panels in several windows in step with each other.
    Store.onChange(next => {
      const text = JSON.stringify(next);
      if (text === app.lastSaved) return;
      app.state = normalize(next);
      app.lastSaved = text;
      showTab(app.state.tab);
      root.GBF_MONTHLY.render();
      root.GBF_TREHUN.render();
      root.GBF_GW.render();
      root.GBF_SEARCH.render();
      if (!(document.activeElement && document.activeElement.classList.contains('pt-memo-text'))) root.GBF_PATTERN.render();
    });

    // Countdown and month change while the panel stays open.
    setInterval(() => {
      if (checkReset(true)) root.GBF_MONTHLY.render();
      else root.GBF_MONTHLY.tick();
    }, 30000);
    document.documentElement.dataset.ready = '1';
  }

  start();
})(globalThis);
