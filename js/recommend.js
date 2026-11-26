// 베인 노트: useful fan sites, each drawn like the in-game character profile card
// (picture area on top, dark title ribbon, centered serif text on dark brown). Static: nothing is saved.
(function (root) {
  const { h } = root.GBF_UI;

  // hero: 'logo' = the site's logo on a themed backdrop, 'art' = a full-width picture.
  // desc: plain text, with *word* drawn bold + italic.
  const SITES = [
    { name: 'GBF.WIKI', star: true, url: 'https://gbf.wiki/', img: 'img/notes/gbf-wiki.webp', hero: 'logo', theme: 'sky',
      desc: '정보량이 *엄청나게* 많은 서양권 위키.' },
    { name: '루리아노트', star: true, url: 'https://lyria-note-korean.com/', img: 'img/notes/lyria-note.webp', hero: 'art', theme: 'meadow',
      desc: '인게임정보 한국어화를 진행중인 팬사이트' },
    { name: 'GBFAL', star: false, url: 'https://mizagbf.github.io/GBFAL/index.html', img: 'img/notes/gbfal.webp', hero: 'logo', theme: 'pink',
      desc: '고화질 일러스트 파일을 구할 수 있는 사이트' }
  ];

  function desc(text) {
    return text.split(/\*([^*]+)\*/).map((part, k) => k % 2 ? h('em', { text: part }) : part).filter(x => x !== '');
  }

  function card(s) {
    return h('article', { class: 'rc-card' },
      h('div', { class: `rc-hero is-${s.hero} theme-${s.theme}`, 'aria-hidden': 'true' }, h('img', { src: s.img, alt: '' })),
      h('h3', { class: 'rc-ribbon' }, s.star ? h('span', { class: 'rc-star', text: '★' }) : null, s.name),
      h('div', { class: 'rc-body' },
        h('p', { class: 'rc-desc' }, desc(s.desc)),
        h('a', { class: 'rc-url', href: s.url, target: '_blank', rel: 'noopener noreferrer', text: s.url })));
  }

  function render() {
    const host = document.getElementById('tab-recommend');
    if (!host) return;
    host.replaceChildren(h('div', { class: 'rc-list' }, SITES.map(card)));
  }

  root.GBF_RECOMMEND = { SITES, mount() { render(); }, render };
})(globalThis);
