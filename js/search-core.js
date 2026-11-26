// Builds the Japanese / English search words for 검색기 (same rules as 그랑블루 검색 도우미).
(function (root) {
  function selected(selection, group) {
    const v = selection[group.id];
    return Array.isArray(v) ? v : v === undefined || v === null ? [] : [v];
  }

  function buildQuery(boss, selection, groups, prefix) {
    const ja = prefix ? ['グラブル'] : [];
    const en = prefix ? ['GBF'] : [];
    const labels = [];
    const isEvent = boss && boss.category === 'event';
    const eventElement = isEvent ? groups.find(g => g.id === 'element').values.find(v => v[0] === selection.element) : null;
    if (boss) {
      ja.push(eventElement ? eventElement[2].replace('属性', '') + boss.jp : boss.jp);
      en.push(eventElement ? eventElement[3] + ' ' + boss.en : boss.en);
      labels.push(eventElement ? eventElement[1] + '고전장' : boss.ko);
    }
    for (const group of groups) {
      if (group.eventOnly && !isEvent) continue;
      for (const value of group.values.filter(v => selected(selection, group).includes(v[0]))) {
        // A 고전장 card already carries its element, so it is not repeated.
        if (group.id === 'element' && isEvent) continue;
        ja.push(value[2]);
        en.push(value[3]);
        labels.push(value[1]);
      }
    }
    return { ja: ja.join(' '), en: en.join(' '), summary: labels.join(' · ') };
  }

  function searchUrl(base, query) {
    return base + encodeURIComponent(query);
  }

  const api = { buildQuery, searchUrl };
  root.GBF_SEARCH_CORE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
