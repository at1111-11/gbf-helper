// 베인 노트: useful fan sites, each drawn like the in-game character profile card
// (picture area on top, dark title ribbon, centered serif text on dark brown). Static: nothing is saved.
(function (root) {
  const { h } = root.GBF_UI;

  // Picture: shown in a round frame on a themed backdrop ('art' = a picture that fills the circle,
  // 'logo' = a logo fitted inside it). bg: an optional picture shown soft and blurred behind the circle.
  // desc: plain text, with *word* drawn bold.
  const SITES = [
    { name: 'GBF.WIKI', star: true, url: 'https://gbf.wiki/', img: 'img/notes/gbf-wiki.webp', fit: 'logo', theme: 'sky',
      desc: '정보량이 *엄청나게* 많은 서양권 위키' },
    { name: '루리아노트', star: true, url: 'https://lyria-note-korean.com/', img: 'img/notes/lyria-note-face.webp', bg: 'img/notes/lyria-note.webp', fit: 'art', theme: 'meadow',
      desc: '인게임정보 한국어화를 진행중인 팬사이트' },
    { name: 'GBFAL', star: false, url: 'https://mizagbf.github.io/GBFAL/index.html', img: 'img/notes/gbfal.webp', fit: 'logo', theme: 'pink',
      desc: '고화질 일러스트 파일을 구할 수 있는 사이트' }
  ];

  function desc(text) {
    return text.split(/\*([^*]+)\*/).map((part, k) => k % 2 ? h('em', { text: part }) : part).filter(x => x !== '');
  }

  // The round picture is the link (opens the site); the name in the ribbon is plain text.
  function card(s, i) {
    return h('article', { class: 'rc-card', id: `rc-site-${i}` },
      h('div', { class: `rc-hero theme-${s.theme}` },
        s.bg ? h('img', { class: 'rc-bg', src: s.bg, alt: '', 'aria-hidden': 'true' }) : null,
        h('a', {
          class: `rc-portrait is-${s.fit}`, href: s.url, target: '_blank', rel: 'noopener noreferrer',
          title: `${s.name} 열기`, 'aria-label': `${s.name} 사이트 열기`
        }, h('img', { src: s.img, alt: '' }))),
      h('h3', { class: 'rc-ribbon' },
        s.star ? h('span', { class: 'rc-star', text: '★' }) : null, s.star ? ' ' : null, s.name),
      h('div', { class: 'rc-body' },
        h('p', { class: 'rc-desc' }, desc(s.desc))));
  }

  // Contents at the top: one Journal-style banner per section (only 사이트 for now; more sections will come).
  // Pressing a banner scrolls to its section.
  const SECTIONS = [{ id: 'sites', title: '사이트', banner: 'img/notes/banner-sites.webp' }];

  function toc() {
    return h('nav', { class: 'rc-toc', 'aria-label': '베인 노트 목차' }, SECTIONS.map(sec =>
      h('button', {
        type: 'button', class: 'rc-banner', dataset: { target: `rc-sec-${sec.id}` }, 'aria-label': `${sec.title}로 이동`,
        onclick: () => {
          const el = document.getElementById(`rc-sec-${sec.id}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, h('img', { src: sec.banner, alt: sec.title }))));
  }

  function render() {
    const host = document.getElementById('tab-recommend');
    if (!host) return;
    host.replaceChildren(
      toc(),
      h('h2', { class: 'ribbon', id: 'rc-sec-sites' }, h('span', { text: '사이트' })),
      h('div', { class: 'rc-list' }, SITES.map(card)));
  }
  root.GBF_RECOMMEND = { SITES, mount() { render(); }, render };
})(globalThis);
