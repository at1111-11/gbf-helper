// 베인의 추천: a short list of useful fan sites, styled like the in-game character profile card
// (parchment picture area, dark title ribbon, serif text on dark brown). Static: nothing is saved.
(function (root) {
  const { h } = root.GBF_UI;

  // desc: plain text, with *word* drawn bold + italic.
  const SITES = [
    { name: 'GBF.WIKI', url: 'https://gbf.wiki/', desc: '정보량이 *엄청나게* 많은 서양권 위키.' },
    { name: '루리아노트', url: 'https://lyria-note-korean.com/', desc: '인게임정보 한국어화를 진행중인 팬사이트' },
    { name: 'GBFAL', url: 'https://mizagbf.github.io/GBFAL/index.html', desc: '고화질 일러스트 파일을 구할 수 있는 사이트' }
  ];

  function desc(text) {
    return text.split(/\*([^*]+)\*/).map((part, k) => k % 2 ? h('em', { text: part }) : part).filter(x => x !== '');
  }

  function render() {
    const host = document.getElementById('tab-recommend');
    if (!host) return;
    host.replaceChildren(h('article', { class: 'rc-card' },
      h('div', { class: 'rc-hero', 'aria-hidden': 'true' }, h('img', { src: 'img/vane.webp', alt: '' })),
      h('h2', { class: 'rc-ribbon', text: '베인의 추천' }),
      h('div', { class: 'rc-body' }, SITES.map(s => h('section', { class: 'rc-item' },
        h('h3', { class: 'rc-title' }, h('span', { class: 'rc-star', text: '★' }), s.name),
        h('a', { class: 'rc-url', href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.url }),
        h('p', { class: 'rc-desc' }, desc(s.desc)))))));
  }

  root.GBF_RECOMMEND = { SITES, mount() { render(); }, render };
})(globalThis);
