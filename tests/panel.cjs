// Loads the extension in Edge and drives the side panel page.
// Run with Playwright available on NODE_PATH: node tests/panel.cjs
const { chromium, expect } = require('playwright/test');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'artifacts');
fs.mkdirSync(out, { recursive: true });

// Positions and sizes of everything matching the selector, to prove nothing moves.
const boxes = (page, selector) => page.locator(selector).evaluateAll(els => els.map(e => {
  const r = e.getBoundingClientRect();
  return [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)].join(','); // page coordinates, so scrolling does not count
}));

(async () => {
  const checks = [], errors = [], outside = [];
  const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'gbf-helper-')), {
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true,
    viewport: { width: 360, height: 760 },
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
  });
  try {
    context.on('request', r => { if (!/^(chrome-extension|data|blob):/.test(r.url())) outside.push(r.url()); });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const base = `chrome-extension://${new URL(worker.url()).host}/`;
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + 'panel.html');
    const ready = () => page.waitForSelector('html[data-ready="1"]');
    await ready();

    const stock = kind => page.locator(`.stock-num[data-kind="${kind}"]`).innerText();
    const totals = () => page.locator('#tab-monthly > .status:not(.status-week) .stock-cur small').allInnerTexts();
    assert.deepEqual([await stock('gold'), await stock('half'), await stock('seed'), await stock('quartz')], ['0', '0', '0', '0']);
    assert.deepEqual(await totals(), ['/2', '/1,010', '/1,700', '/40']);
    // Order: 주간 교환 → weekly box → 월간 교환 → totals box → shops. Each total is one line ([icon] 0/2).
    assert.deepEqual(await page.locator('#tab-monthly > *').evaluateAll(els => els.slice(0, 6).map(e => e.classList[0])), ['ribbon', 'status', 'weekly-list', 'ribbon', 'status', 'shops']);
    assert.deepEqual(await page.locator('#tab-monthly > .ribbon').allInnerTexts(), ['주간 교환', '월간 교환']);
    assert.ok(await page.locator('.stock').evaluateAll(s => s.every(x => { const n = x.querySelector('.stock-num').getBoundingClientRect(), t = x.querySelector('small').getBoundingClientRect(); return Math.abs(n.top + n.height / 2 - (t.top + t.height / 2)) < 4; })), 'each total reads on one line');
    // Weekly: 아티팩트 50 (패스 75), FP 5,000 (2배 10,000), 보정석 100; checking marks it done; options stay after reload.
    const wq = () => page.locator('#tab-monthly .weekly .chip-qty').allInnerTexts();
    assert.deepEqual(await wq(), ['×50', '×5,000', '×100']);
    await page.locator('.chip-opt[data-opt="pass"]').click();
    await page.locator('.chip-opt[data-opt="double"]').click();
    await expect(page.locator('.chip-opt[data-opt="pass"]')).toHaveAttribute('aria-pressed', 'true');
    assert.deepEqual(await wq(), ['×75', '×10,000', '×100']);
    await page.locator('[data-week="crystal"]').click();
    await expect(page.locator('[data-week="crystal"]')).toHaveClass(/done/);
    await expect(page.locator('#weekLeft')).toHaveText(/^\d+(일 \d+시간|시간 \d+분|분)$/);
    await page.reload(); await ready();
    assert.deepEqual(await wq(), ['×75', '×10,000', '×100']);
    await expect(page.locator('[data-week="crystal"]')).toHaveClass(/done/);
    await page.locator('.chip-opt[data-opt="pass"]').click();
    await page.locator('.chip-opt[data-opt="double"]').click();
    await page.locator('[data-week="crystal"]').click();
    // The weekly row has the monthly shop look: thumbnail, "이번 주" title with the countdown, chips with names.
    await expect(page.locator('.weekly.shop .shop-thumb img')).toHaveAttribute('src', 'img/shop-weekly.webp');
    assert.deepEqual(await page.locator('#tab-monthly .weekly .chip-label').allInnerTexts(), ['아티팩트', 'FP', '보정석']);
    // Monthly totals: equal gaps between the four.
    // Weekly box totals follow the chips: 0/50 → 50/50 when done, 75 with 패스.
    assert.deepEqual(await page.locator('#tab-monthly > .status-week .stock-cur').allInnerTexts(), ['0/50', '0/5,000', '0/100']);
    await expect(page.locator('#tab-monthly .shop[data-group="sandbox"] .chip-qty')).toHaveText(['×20', '×20', '×300']);
    await expect(page.locator('#tab-monthly .shop[data-group="sandbox"] .chip-label')).toHaveText(['미션', '상점']);
    checks.push('주간 교환 (아티팩트 50/패스 75 · FP 5,000/2배 10,000 · 보정석 100) above 월간 교환; monthly totals box under 월간 교환 with one-line [icon] n/total incl. 샌드박스 쿼츠 40');
    await expect(page.locator('#resetAt')).toHaveText(/^\d+\/1\(.\) 05:00$/);
    await expect(page.locator('#tab-monthly > .status:not(.status-week) .reset-line')).toHaveText(/^리셋까지 \d+(일 \d+시간|시간 \d+분|분)$/);
    // Summary boxes (weekly and monthly): totals and countdown in one box; totals evenly spaced, countdown centered in its space;
    // even the longest values fit at panel and website widths.
    await expect(page.locator('#weekAt')).toHaveText(/^\d+\/\d+\(월\) 05:00$/);
    for (const w of [300, 360, 480, 1280]) {
      await page.setViewportSize({ width: w, height: 800 });
      const fit = await page.evaluate(() => {
        const out = [];
        for (const box of document.querySelectorAll('#tab-monthly > .status')) {
          const reset = box.querySelector('.status-reset'), b = reset.querySelector('.reset-line b'), keep = b.textContent;
          for (const t of ['30일 23시간', '23시간 59分'.replace('分', '분')]) {
            b.textContent = t;
            const r = reset.getBoundingClientRect(), pad = parseFloat(getComputedStyle(reset).paddingLeft);
            const kids = [...reset.children].map(x => x.getBoundingClientRect());
            const mid = (Math.min(...kids.map(k => k.left)) + Math.max(...kids.map(k => k.right))) / 2;
            out.push(Math.abs(mid - (r.left + pad + r.right) / 2) <= 2 && reset.scrollWidth <= reset.clientWidth + 1 && box.contains(reset));
          }
          b.textContent = keep;
          const s = [...box.querySelectorAll('.stock')].map(x => x.getBoundingClientRect()), left = box.querySelector('.status-left').getBoundingClientRect();
          const gaps = [s[0].left - left.left].concat(s.slice(1).map((x, k) => x.left - s[k].right), [left.right - s[s.length - 1].right]);
          out.push(Math.max(...gaps) - Math.min(...gaps) <= 2 && Math.min(...gaps) >= 0);
        }
        return out.every(Boolean) && ![...document.querySelectorAll('.stock')].some(s => s.scrollWidth > s.clientWidth + 1);
      });
      assert.ok(fit, `summary boxes: evenly spaced totals, centered countdown, nothing cut at ${w}px`);
    }
    await page.setViewportSize({ width: 360, height: 760 });
    assert.deepEqual(await page.locator('#tab-monthly .shop').evaluateAll(els => els.map(e => e.dataset.group).filter(g => g !== 'weekly')), ['fp', 'pendant', 'casino', 'skyleap', 'daily', 'treasure', 'sandbox']);
    assert.equal(await page.locator('.sign').count(), 0);
    const broken = await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
    assert.deepEqual(broken, []);
    assert.equal(await page.locator('.tile-monthly .tile-icons img').evaluateAll(els => els.filter(e => getComputedStyle(e).display !== 'none').length), 3, '월간교환 tab shows 골드문 · 반홍 · 시드');
    assert.equal(await page.locator('.tile-pattern .tile-icons img').getAttribute('src'), 'img/raids/versusia.webp');
    assert.deepEqual(await page.locator('.tile .tile-text').allInnerTexts().then(t => t.map(x => x.replace(/s+/g, ' ').trim())), ['월간교환', '레이드 탐색기', '고전장', '극성기 계산기', '패턴표', '베인 노트']);
    await expect(page.locator('.tile-search .tile-icons.yt')).toHaveCount(1); // YouTube-style icon
    assert.equal(await page.locator('.tile-recommend .tile-icons img').getAttribute('src'), 'icons/icon48.png'); // the extension's own icon
    await expect(page.locator('#tab-monthly .note')).toHaveCount(0); // usage note removed
    await page.getByRole('tab', { name: '베인 노트' }).click();
    // One profile-style card per site: picture, title ribbon (★ except GBFAL), centered text. No page header.
    await expect(page.locator('#tab-recommend .rc-card')).toHaveCount(3);
    await expect(page.locator('#tab-recommend .rc-hero img[src="img/vane.webp"]')).toHaveCount(0);
    assert.deepEqual(await page.locator('#tab-recommend .rc-ribbon').allTextContents().then(t => t.map(x => x.trim())), ['★ GBF.WIKI', '★ 루리아노트', 'GBFAL']);
    await expect(page.locator('#tab-recommend > .ribbon')).toHaveText('사이트'); // section line like the other tabs
    // The round picture is the link (2026-11-27 request); the name is plain text.
    assert.deepEqual(await page.locator('#tab-recommend a.rc-portrait').evaluateAll(a => a.map(x => x.getAttribute('href'))), ['https://gbf.wiki/', 'https://lyria-note-korean.com/', 'https://mizagbf.github.io/GBFAL/index.html']);
    await expect(page.locator('#tab-recommend .rc-ribbon a')).toHaveCount(0);
    await expect(page.locator('#tab-recommend .rc-url')).toHaveCount(0); // no address line
    // Contents on top (above the 사이트 line): Journal-style section banners; "사이트" scrolls to that section.
    assert.deepEqual(await page.locator('#tab-recommend > *').evaluateAll(els => els.slice(0, 3).map(e => e.classList[0])), ['rc-toc', 'ribbon', 'rc-list']);
    await expect(page.locator('#tab-recommend .rc-banner img')).toHaveAttribute('alt', '사이트');
    assert.ok(await page.locator('#tab-recommend .rc-banner img').evaluate(i => i.complete && i.naturalWidth > 0), 'banner picture loads');
    await page.setViewportSize({ width: 360, height: 400 });
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.locator('.rc-banner[data-target="rc-sec-sites"]').evaluate(b => b.click());
    await page.waitForTimeout(700);
    const landed = await page.evaluate(() => { const c = document.getElementById('rc-sec-sites').getBoundingClientRect(); const top = document.querySelector('.top').getBoundingClientRect().bottom; return c.top >= top - 1 && c.top < window.innerHeight; });
    assert.ok(landed, '사이트 section is scrolled into view under the tabs');
    await page.setViewportSize({ width: 360, height: 760 });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.ok(await page.locator('#tab-recommend .rc-desc').allInnerTexts().then(t => t.every(x => !x.trim().endsWith('.'))), 'no trailing period');
    assert.ok(await page.locator('#tab-recommend .rc-desc').evaluateAll(d => d.every(x => getComputedStyle(x).textAlign === 'center')), 'descriptions are centered');
    assert.ok(await page.locator('#tab-recommend .rc-hero img').evaluateAll(a => a.every(i => i.complete && i.naturalWidth > 0)), 'site pictures load');
    // Each picture sits in a round frame (the user preferred circles to pictures filling the whole box).
    assert.ok(await page.locator('#tab-recommend .rc-portrait').evaluateAll(p => p.length === 3 && p.every(x => { const r = x.getBoundingClientRect(); return getComputedStyle(x).borderRadius === '50%' && Math.abs(r.width - r.height) < 1 && r.width < x.parentElement.getBoundingClientRect().width / 2; })), 'round picture frames');
    await expect(page.locator('#tab-recommend .rc-desc em')).toHaveCSS('font-style', 'normal'); // bold, not italic
    // Card text uses the bundled Gowun Batang (fonts/, OFL) and every letter on the cards is in the cut-down font file.
    const fontOk = await page.evaluate(async () => {
      await document.fonts.load('700 16px "Gowun Batang Note"'); await document.fonts.load('400 16px "Gowun Batang Note"');
      const text = [...document.querySelectorAll('#tab-recommend .rc-ribbon, #tab-recommend .rc-body')].map(e => e.textContent).join('');
      const face = [...document.fonts].find(f => f.family.replace(/"/g, '') === 'Gowun Batang Note' && f.status === 'loaded');
      return { loaded: !!face, used: getComputedStyle(document.querySelector('#tab-recommend .rc-desc')).fontFamily.includes('Gowun Batang Note'), check: document.fonts.check('16px "Gowun Batang Note"', text) };
    });
    assert.ok(fontOk.loaded && fontOk.used && fontOk.check, 'Gowun Batang is loaded and covers the card text: ' + JSON.stringify(fontOk));
    assert.equal(await page.locator('#tab-recommend .rc-body').first().evaluate(e => getComputedStyle(e).textAlign), 'center');
    await expect(page.locator('#tab-recommend .rc-desc em')).toHaveText('엄청나게');
    await page.getByRole('tab', { name: '월간교환' }).click();
    checks.push('First open: no title sign, 6 shops with pictures, exchanged counts start at 0 of 골드문 2 · 반홍 710 · 시드 1,700, reset on the 1st at 05:00');

    // Nothing may move when items get checked.
    const watched = '.status, .stock, .status-reset, #tab-monthly .shop, #tab-monthly .shop-thumb, #tab-monthly .shop-title, .chip-item, #tab-monthly .count, .kinds, .kinds-in, .kinds-ok';
    const before = await boxes(page, watched);
    await page.locator('[data-id="fp-gold"]').click();
    await page.locator('[data-id="treasure-seed"]').click();
    await page.locator('[data-group="casino"] .shop-thumb').click();
    await expect(page.locator('[data-id="fp-gold"]')).toHaveClass(/done/);
    await expect(page.locator('[data-group="casino"] .count')).toHaveText('2/2');
    assert.deepEqual(await boxes(page, watched), before, 'layout moved after checking items');
    assert.deepEqual([await stock('gold'), await stock('half'), await stock('seed')], ['1', '100', '850']);
    await page.locator('[data-group="casino"] .shop-thumb').click();
    await page.locator('[data-id="fp-gold"]').click();
    await page.locator('[data-id="treasure-seed"]').click();
    assert.deepEqual(await boxes(page, watched), before, 'layout moved after unchecking items');
    checks.push('Exchanged counts go up as items are checked (골드문 1, 반홍 100, 시드 850), and only colours change: every row, chip, count and the stock bar stay in place');

    // Treasure chips sit on one line and hold their own fields: 반홍 ×[total], 시드 ×50×[kinds]. Enter applies.
    const kindsOf = id => page.locator(`input[data-kinds="${id}"]`);
    await expect(kindsOf('treasure-half')).toHaveValue('260');
    await expect(kindsOf('treasure-seed')).toHaveValue('13');
    await expect(page.locator('.kinds-ok, .kinds-max')).toHaveCount(0);
    await expect(page.locator('[data-id="treasure-seed"] .chip-qty')).toHaveText('×50×');
    const chipTops = await page.locator('.tchip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
    assert.equal(new Set(chipTops).size, 1, '반홍 and 시드 sit on one line');
    const fieldBg = await kindsOf('treasure-half').evaluate(e => getComputedStyle(e).backgroundColor);
    assert.notEqual(fieldBg, 'rgb(255, 255, 255)', 'the field is not a white box');
    await kindsOf('treasure-half').fill('300');
    await kindsOf('treasure-half').evaluate(e => e.blur());
    await expect(kindsOf('treasure-half')).toHaveValue('260');
    assert.deepEqual(await totals(), ['/2', '/1,010', '/1,700', '/40'], 'typing without Enter changes nothing');
    await kindsOf('treasure-half').fill('300');
    await kindsOf('treasure-half').press('Enter');
    await expect(kindsOf('treasure-half')).toHaveValue('300');
    assert.deepEqual(await totals(), ['/2', '/1,050', '/1,700', '/40']);
    await kindsOf('treasure-seed').fill('99');
    await kindsOf('treasure-seed').press('Enter');
    await expect(kindsOf('treasure-seed')).toHaveValue('13');
    await kindsOf('treasure-seed').fill('5');
    await kindsOf('treasure-seed').press('Enter');
    await expect(kindsOf('treasure-seed')).toHaveValue('5');
    assert.deepEqual(await totals(), ['/2', '/1,050', '/1,300', '/40']);    await expect(page.locator('.tip')).toBeHidden();
    await page.locator('#tab-monthly .hint-mark').hover();
    await expect(page.locator('.tip')).toBeVisible();
    const markBox = await page.locator('#tab-monthly .hint-mark').boundingBox();
    await expect(page.locator('.tip')).toHaveText('코옵 → 호스트 퀘스트 → 아이템 → 트레져 → 리커버리 아이템으로 더 많은 반홍을 편리하게 교환할 수 있어요.');
    const tipBox = await page.locator('.tip').boundingBox();
    assert.ok(tipBox.x >= 0 && tipBox.x + tipBox.width <= 360, 'tooltip stays inside the panel');
    assert.ok(tipBox.y >= markBox.y + markBox.height && tipBox.y <= markBox.y + markBox.height + 14, 'the note opens right under the "!"');
    assert.ok(tipBox.x <= markBox.x && tipBox.x + tipBox.width >= markBox.x + markBox.width, 'the note spans the "!"');
    await page.setViewportSize({ width: 360, height: 900 });
    await page.screenshot({ path: path.join(out, 'monthly-tip.png') });
    await page.mouse.move(5, 5);
    await expect(page.locator('.tip')).toBeHidden();
    await page.reload(); await ready();
    await expect(kindsOf('treasure-half')).toHaveValue('300');
    await expect(kindsOf('treasure-seed')).toHaveValue('5');
    checks.push('Treasure: 반홍 ×[total] and 시드 ×50×[kinds] chips on one line, parchment-coloured fields, Enter applies (반홍 300, 시드 99→13, 5); typing then leaving the field changes nothing; remembered; the co-op note opens right under the "!"');

    await page.locator('[data-group="casino"] .shop-thumb').click();
    await page.getByRole('button', { name: '편집', exact: true }).click();
    const fpAdd = page.locator('[data-group="fp"] form.add');
    await fpAdd.locator('select').selectOption('other');
    await fpAdd.locator('.name').fill('<img src=x onerror=alert(1)>');
    await fpAdd.locator('.qty').fill('3');
    await fpAdd.getByRole('button', { name: '추가' }).click();
    await page.locator('[data-id="skyleap-half"] .btn').click();
    await page.getByRole('button', { name: '편집 끝' }).click();
    await expect(page.locator('[data-group="fp"] .chip-name')).toHaveText('<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    await expect(page.locator('[data-id="skyleap-half"]')).toHaveCount(0);
    assert.equal(await stock('half'), '100'); // casino done
    assert.deepEqual(await totals(), ['/2', '/950', '/1,300', '/40']); // skyleap 반홍 hidden
    assert.ok(!/\bnull\b|undefined/.test(await page.locator('main').innerText()), 'no stray null/undefined text');
    checks.push('Edit: a custom item is added (name shown as plain text) and a hidden item leaves the list and totals');
    await page.screenshot({ path: path.join(out, 'monthly.png') });
    await page.setViewportSize({ width: 360, height: 760 });

    await page.evaluate(async () => {
      const s = (await chrome.storage.local.get('gbfHelper')).gbfHelper;
      s.monthly.period = '2000-01';
      await chrome.storage.local.set({ gbfHelper: s });
    });
    await page.reload(); await ready();
    await expect(page.locator('#toast')).toHaveText(/새 달이 시작돼서/);
    await expect(page.locator('[data-group="casino"] .count')).toHaveText('0/2');
    await expect(page.locator('[data-id="skyleap-half"]')).toHaveCount(0);
    await expect(page.locator('[data-group="fp"] .chip-item')).toHaveCount(4);
    await expect(kindsOf('treasure-half')).toHaveValue('300');
    checks.push('A new month clears every check with a notice; hidden items, custom items and the treasure kind count stay');

    for (const width of [300, 360, 480]) {
      await page.setViewportSize({ width, height: 760 });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 0, `monthly overflows by ${over}px at ${width}px`);
      const tall = await page.locator('#tab-monthly .shops .shop').evaluateAll(els => Math.max(...els.filter(e => e.dataset.group !== 'fp' && e.dataset.group !== 'sandbox').map(e => e.getBoundingClientRect().height))); // fp holds the extra test item, treasure has two lines
      assert.ok(tall <= (width < 340 ? 90 : 64), `a shop row is ${tall}px tall at ${width}px`);
    }
    await page.setViewportSize({ width: 360, height: 760 });
    checks.push('Shop rows stay compact and nothing scrolls sideways at 300/360/480px');

    await page.getByRole('tab', { name: '극성기 계산기' }).click();
    await page.waitForTimeout(150); // let the fragment text settle its size
    await expect(page.locator('#resItem')).toHaveText('0.359%');
    await expect(page.locator('#resItemRuns')).toHaveText('평균 278.5회에 1개');
    assert.equal(await page.locator('select[data-key="tears"]').inputValue(), '4');
    assert.equal(await page.locator('select[data-key="essel"]').inputValue(), '10');
    assert.equal(await page.locator('select[data-key="myStone"]').inputValue(), 'kaguya4');
    assert.equal(await page.locator('select[data-key="friendStone"]').inputValue(), 'kaguya4');
    assert.equal(await page.locator('select[data-key="itemBase"]').count(), 0);
    assert.deepEqual(await page.locator('select[data-key="boxBase"] option').allInnerTexts(),
      ['90헬 · 상자 2%', '95헬 · 상자 2.5%', '100헬 · 상자 3%', '150헬 · 상자 3.5%', '200헬 · 상자 4%', '250헬 · 상자 4.5%']);
    const tabText = await page.locator('#tab-trehun').innerText();
    assert.ok(!/×|1개 이상|에셀|크루|트헌 계산기|트레저 헌트|단 서포트|친구 소환석|없음|이벤트|개\)|미닉 |D비이/.test(tabText.replace(/엣셀/g, '')), 'no formula, chance line or old wording');
    assert.equal(await page.locator('select[data-key="tears"] option').nth(4).innerText(), 'Lv4 · 10%');
    assert.equal(await page.locator('select[data-key="trehun"] option').first().innerText(), 'X');
    assert.deepEqual(await page.locator('select[data-key="weapon"] option').allInnerTexts(), ['X', '셉티안 버너 2%', '스노우플레이크 2%', '올리버 5%', '다마스커스 나이프 10%']);
    assert.deepEqual(await page.locator('select[data-key="friendStone"] option').allInnerTexts(), ['X', '노비요 4돌 15%', '화이트 래빗 3돌 15%', '블랙 래빗 3돌 15%', '갓 래빗 20%', '카구야 노돌 20%', '카구야 3돌 25%', '카구야 4돌 30%']);
    const picOf = key => page.locator(`select[data-key="${key}"]`).locator('xpath=preceding-sibling::span[contains(@class,"pic")]/img').getAttribute('src').catch(() => null);
    assert.equal(await picOf('essel'), 'img/party/p-essel.webp');
    assert.equal(await picOf('myStone'), 'img/party/p-kaguya.webp');
    assert.equal(await page.locator('select[data-key="weapon"]').locator('xpath=preceding-sibling::span[contains(@class,"pic")]/img').count(), 0);
    const pairRows = await page.locator('.pair').first().evaluate(e => { const r = [...e.querySelectorAll('select')].map(s => s.getBoundingClientRect()); return Math.abs(r[0].top - r[1].top) < 2 && r[1].right <= e.getBoundingClientRect().right + 1; });
    assert.ok(pairRows, '엣셀 and 미믹베리 sit side by side on one line');
    await page.locator('select[data-key="chara"]').selectOption('minic');
    const clipped = await page.locator('.pair select, .pic-check .check').evaluateAll(els => els.filter(s => { const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(s); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if (s.tagName !== 'SELECT') return s.scrollWidth > s.clientWidth + 0.5; return c.measureText(s.options[s.selectedIndex].text).width > s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 0.5; }).map(s => s.innerText || s.options[s.selectedIndex].text));
    assert.deepEqual(clipped, [], '최종 엣셀 10%, 미믹베리 3%, D-비이 and 리베르 이니티스 are shown in full at 360px');
    const cols = await page.locator('.form-group').nth(1).locator('.form-row').evaluateAll(rows => rows.map(r => { const pic = r.querySelector('.pic'); const ctl = pic && pic.nextElementSibling; return pic ? [Math.round(pic.getBoundingClientRect().left), Math.round(pic.getBoundingClientRect().width), Math.round(ctl.getBoundingClientRect().left)].join(',') : 'none'; }));
    assert.equal(new Set(cols).size, 1, `every party row starts its picture and drop-down at the same place: ${cols}`);
    await page.locator('select[data-key="chara"]').selectOption('none');
    const picBox = await boxes(page, '.pic');
    await page.locator('select[data-key="weapon"]').selectOption('damascus');
    assert.equal(await picOf('weapon'), 'img/party/p-damascus.webp');
    await page.locator('select[data-key="chara"]').selectOption('minic');
    assert.equal(await picOf('chara'), 'img/party/p-mimic.webp');
    assert.deepEqual(await boxes(page, '.pic'), picBox, 'picture frames moved');
    await page.locator('select[data-key="weapon"]').selectOption('none');
    await page.locator('select[data-key="chara"]').selectOption('none');
    checks.push('Party: each choice shows its picture (엣셀, 카구야, 다마스커스, 미믹베리…) in a fixed frame; stone list is 노비요 4돌 → 래빗 → 갓 래빗 → 카구야 노돌/3돌/4돌');
    assert.deepEqual(await page.locator('select[data-key="chara"] option').allInnerTexts(), ['X', '리처드 1%', '미믹베리 3%']);
    await expect(page.locator('.check', { hasText: 'D-비이 3%' })).toHaveCount(1);
    await expect(page.locator('.res-top')).toHaveText('평균 278.5회에 1개(드롭률 0.359%)');
    assert.equal(await page.locator('#resBox').count(), 0, 'no box rate');
    const sizes = await page.locator('.res-top').evaluate(e => [parseFloat(getComputedStyle(e.querySelector('.res-big')).fontSize), parseFloat(getComputedStyle(e.querySelector('.res-rate')).fontSize)]);
    assert.ok(sizes[0] > sizes[1] + 4, 'average runs are larger than the drop rate');
    assert.deepEqual(await page.locator('#tab-trehun .form-label').allInnerTexts(), ['고전장', '트헌', '물방울', '단버프', '캐릭터', '아티팩트', '메인 무기', '소환석', '프렌석', '기타']);
    const checkRow = await page.locator('.pic-check').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); const b = e.querySelector('.check-box').getBoundingClientRect(); return { top: Math.round(r.top), right: r.right, img: !!e.querySelector('.pic img'), box: Math.round(b.width) }; }));
    assert.ok(checkRow.every(c => c.box === 14), 'check boxes keep their size');
    assert.equal(checkRow.length, 2);
    assert.equal(checkRow[0].top, checkRow[1].top, 'D-비이 and 리베르 이니티스 share one line');
    assert.ok(checkRow.every(c => c.img), 'both checks have pictures');
    assert.ok(checkRow[1].right <= 360 - 10, '리베르 이니티스 stays inside the panel');
    const spare = await page.locator('.pic-check .check').evaluateAll(els => els.map(e => { const kids = [...e.children].filter(k => getComputedStyle(k).position !== 'absolute'); const used = kids.reduce((s, k) => s + k.getBoundingClientRect().width, 0); return Math.round(e.clientWidth - used); }));
    assert.ok(Math.abs(spare[0] - spare[1]) <= 2, `D-비이 and 리베르 이니티스 boxes have the same spare room: ${spare}`);
    const ends = await page.evaluate(() => [Math.round(document.querySelector('.pic-check:last-child .check').getBoundingClientRect().right), Math.round(document.querySelector('select[data-key="myStone"]').getBoundingClientRect().right)]);
    assert.ok(Math.abs(ends[0] - ends[1]) <= 1, `기타 row ends where the other rows end: ${ends}`);
    await expect(page.locator('.shard-info')).toHaveText('은 기본 60개 / 고전장 박스 50개 / 갈갈하면 15개를 얻어요.최종 45개 + 쬐종 80개 + 각성 170개 = 총합 295개가 필요해요.');
    await expect(page.locator('.shard-info p').first().locator('img.shard-ico')).toHaveCount(1);
    await expect(page.locator('.shard-info .em')).toHaveCount(7);
    checks.push('극성기 계산기: defaults 물방울 Lv4 · 최종 엣셀 · 카구야 4돌 ×2 give 0.359% (avg 278.5 runs); only 90~250헬 box choices; no item-rate box, formula or chance line');

    const rowsBefore = await boxes(page, '.result, .form-row');
    await page.locator('select[data-key="trehun"]').selectOption('10');
    await expect(page.locator('#resItem')).toHaveText('0.48%');
    await expect(page.locator('#resTotal')).toHaveText('드롭 배율 381.48% → 300% (81.48% 초과)');
    await page.locator('select[data-key="boxBase"]').selectOption('4.5');
    await expect(page.locator('#resItem')).toHaveText('1.08%');
    assert.deepEqual(await boxes(page, '.result, .form-row'), rowsBefore, 'calculator layout moved');
    checks.push('Changing values updates the result (트헌 Lv10 → 0.48% at the 300% cap, shown as 381.48% → 300% (81.48% over), 250헬 → 1.08%) without moving anything');

    await page.locator('select[data-key="chara"]').selectOption('minic');
    await page.locator('.check', { hasText: 'D-비이' }).click();
    await page.reload(); await ready();
    await expect(page.locator('#tab-trehun')).toBeVisible();
    assert.equal(await page.locator('select[data-key="boxBase"]').inputValue(), '4.5');
    assert.equal(await page.locator('select[data-key="chara"]').inputValue(), 'minic');
    assert.equal(await page.locator('.check', { hasText: 'D-비이' }).locator('input').isChecked(), true);
    checks.push('Calculator values and the open tab are remembered after reopening');
    for (const width of [300, 360, 480]) {
      await page.setViewportSize({ width, height: 760 });
      await page.waitForTimeout(100);
      const fits = await page.locator('.shard-info').evaluate(box => [...box.querySelectorAll('p')].map(p => ({ fits: p.getBoundingClientRect().width <= box.clientWidth, oneLine: p.scrollHeight <= p.clientHeight + 1 && p.getClientRects().length === 1 })));
      assert.ok(fits.every(f => f.fits && f.oneLine), `fragment sentences must each fit on one line at ${width}px: ${JSON.stringify(fits)}`);
    }
    await page.setViewportSize({ width: 360, height: 760 });
    for (const width of [300, 360, 480]) {
      await page.setViewportSize({ width, height: 760 });
      const fitsTop = await page.locator('.res-top').evaluate(e => e.scrollWidth <= e.clientWidth);
      assert.ok(fitsTop, `평균·드롭률 line fits at ${width}px`);
    }
    await page.setViewportSize({ width: 360, height: 760 });
    checks.push('Fragment sentences each stay on one line at 300/360/480px (text size adjusts to the panel width)');

    await page.screenshot({ path: path.join(out, 'trehun.png') });
    for (const width of [300, 360, 480]) {
      await page.setViewportSize({ width, height: 760 });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(over <= 0, `calculator overflows by ${over}px at ${width}px`);
    }

    // ---- 고전장 tab ----
    await page.setViewportSize({ width: 360, height: 760 });
    await page.getByRole('tab', { name: '고전장' }).click();
    await expect(page.locator('#tab-gw')).toBeVisible();
    assert.deepEqual(await page.locator('.gw-row').evaluateAll(els => els.map(e => e.dataset.stage)), ['exp', 'h90', 'h95', 'h100', 'h150', 'h200', 'h250']);
    const rowOf = id => page.locator(`.gw-row[data-stage="${id}"]`);
    assert.deepEqual(await rowOf('h100').locator('.gw-stat b').allInnerTexts(), ['2억 8,875만', '15', '265만']);
    await expect(rowOf('h100').locator('.gw-sub')).toHaveText(' · 후반 14');
    const cut = await page.locator('.gw-stat > *').evaluateAll(els => els.filter(k => k.scrollWidth > k.clientWidth + 0.5).map(k => k.textContent));
    assert.deepEqual(cut, [], 'no stat cell is cut off');
    assert.equal(await rowOf('exp').locator('.gw-pic img').getAttribute('src'), 'img/raids/ex-plus.webp');
    assert.deepEqual(await rowOf('h250').locator('.gw-stat b').allInnerTexts(), ['23억 2,617만', '25', '7,525만']);
    await expect(rowOf('h100').locator('.count')).toHaveText('고기 20');
    await expect(rowOf('exp').locator('.gw-stat b').first()).toHaveText('3,500만');
    await expect(rowOf('h250').locator('.count')).toHaveText('왕고기 20');
    assert.equal(await rowOf('h250').locator('.gw-cost img').getAttribute('src'), 'img/gw/g-clump.webp');
    assert.equal(await rowOf('h90').locator('.gw-cost img').getAttribute('src'), 'img/gw/g-meat.webp');
    await expect(page.locator('.gw-hint')).toHaveCount(0);
    assert.equal(await rowOf('h90').locator('.gw-main .gw-pic img').getAttribute('src'), 'img/raids/hell-90.webp');
    assert.equal(await rowOf('h90').locator('.gw-mob > img').getAttribute('src'), 'img/raids/ewiyar.webp');
    const under = await rowOf('h90').evaluate(r => r.querySelector('.gw-test-strip').getBoundingClientRect().top >= r.querySelector('.gw-main').getBoundingClientRect().bottom);
    assert.ok(under, 'the test mob sits under the 90헬 line, not in its place');
    await expect(rowOf('h90').locator('.gw-target')).toHaveText('72.2%');
    await expect(rowOf('h100').locator('.gw-target')).toHaveText('31.5% / 27.8%');
    await expect(rowOf('h100').locator('.gw-warn')).toHaveText('!확실하지 않아요.');
    await expect(rowOf('h90').locator('.gw-warn')).toHaveCount(0);
    await expect(rowOf('h200').locator('.gw-test-strip')).toHaveCount(0);
    await expect(rowOf('h90').locator('.el-badge')).toHaveAttribute('data-el', 'fire');
    assert.equal(await rowOf('h90').locator('.el-badge img').getAttribute('src'), 'img/icons/elem-fire.png');
    const gwRows = await boxes(page, '.gw-row, .speed');
    await rowOf('h90').locator('.el-badge').click();
    await expect(rowOf('h90').locator('.el-badge')).toHaveAttribute('data-el', 'water');
    await expect(rowOf('h150').locator('.el-badge')).toHaveAttribute('data-el', 'water');
    await expect(rowOf('h90').locator('.gw-target')).toHaveText('69.7%');
    assert.equal(await rowOf('h90').locator('.gw-mob > img').getAttribute('src'), 'img/raids/wilnas.webp');
    assert.deepEqual(await boxes(page, '.gw-row, .speed'), gwRows, '고전장 rows moved when the element changed');
    for (let i = 0; i < 4; i++) await rowOf('h90').locator('.el-badge').click(); // 수 → 토 → 풍 → 광 → 암
    await expect(rowOf('h100').locator('.gw-target')).toHaveText('39.8%');
    await expect(rowOf('h100').locator('.gw-warn')).toHaveCount(0); // 어둠 100헬 has no 방깎 / 안전
    await expect(rowOf('h100').locator('.gw-test')).toHaveText('루오 레이드'); // no 방깎 → nothing written about it
    await expect(rowOf('h150').locator('.gw-test')).toHaveText('루오 레이드 · 방깎 50% 기준');
    await rowOf('h90').locator('.el-badge').click(); // 암 → 화
    await expect(rowOf('h90').locator('.el-badge')).toHaveAttribute('data-el', 'fire');
    checks.push('고전장: each HELL row shows last event\'s HELL picture; the test mob (raid icon) sits under it with target HP; element badge cycles 화→…→암 for all rows without moving them; 250헬 = 23억 2,617만 / 방어 25 / 7,525만');

    await expect(page.locator('.speed-line')).toHaveText('200헬의 시간당 공헌도가 1억 1,700만만큼 높아요.');
    const speedBox = await boxes(page, '.speed, .speed-line, .speed-sub');
    await page.locator('input[data-time="a"]').fill('0:20');
    await expect(page.locator('.speed-line')).toHaveText('150헬의 시간당 공헌도가 2억 5,200만만큼 높아요.');
    await page.locator('input[data-time="a"]').fill('abc');
    await expect(page.locator('.speed-line')).toHaveText(/분:초 형식/);
    assert.deepEqual(await boxes(page, '.speed, .speed-line, .speed-sub'), speedBox, 'speed box moved');
    await page.locator('input[data-time="a"]').fill('0:20');
    await page.locator('select[data-side="b"]').selectOption('h250');
    await page.locator('input[data-time="b"]').fill('10:00');
    await expect(page.locator('.speed-line')).toHaveText('150헬의 시간당 공헌도가 2억 8,650만만큼 높아요.');
    await page.reload(); await ready();
    await expect(page.locator('#tab-gw')).toBeVisible();
    assert.equal(await page.locator('input[data-time="b"]').inputValue(), '10:00');
    assert.equal(await page.locator('select[data-side="b"]').inputValue(), 'h250');
    checks.push('속도 비교 per hour: "n헬의 시간당 공헌도가 n만큼 높아요." (150헬 0:40 vs 200헬 2:30 → 200헬 1억 1,700만), bad time shows a hint, nothing moves, remembered');
    await page.setViewportSize({ width: 360, height: 1300 });
    await page.screenshot({ path: path.join(out, 'gw.png') });
    await page.setViewportSize({ width: 360, height: 760 });

    // ---- 검색기 tab ----
    await page.getByRole('tab', { name: '레이드 탐색기' }).click();
    await expect(page.locator('#tab-search')).toBeVisible();
    await expect(page.locator('#tab-search .sr-card')).toHaveCount(12);
    assert.deepEqual(await page.locator('#tab-search .sr-card .sr-name').allInnerTexts(), ['마리스', '별 4 레이드', '마그나 III', '육룡', '채광터', '금주', '별 7 아스트랄', '레반스', '시련', '금주 하렙', '고난이도', '고전장']);
    await page.locator('.sr-card[data-cat="lucizero"]').click();
    assert.deepEqual(await page.locator('.sr-card[data-boss]').evaluateAll(els => els.map(e => e.dataset.boss)), ['subaha', 'lucizero', 'hexachromatic', 'versusia']); // 슈퍼 바하무트·베르수시아 sit in 고난이도
    const rowsOf = id => page.locator(`.sr-card[data-boss="${id}"] .sr-loot-row`).evaluateAll(rs => rs.map(r => [...r.querySelectorAll('img')].map(i => i.getAttribute('src').replace(/^img\/icons\/|\.webp$/g, '')).join('+') + ':' + r.textContent));
    assert.deepEqual(await rowsOf('versusia'), ['chest-gold+item-sand:1.0%']); // 금상 모래시계
    assert.deepEqual(await rowsOf('lucizero'), ['chest-gold+item-sand:1.0%']);
    assert.deepEqual(await rowsOf('subaha'), ['chest-gold+item-sand:1.0%']);
    await page.getByRole('button', { name: '← 전체' }).click();
    await page.locator('.sr-card[data-cat="normal"]').click();
    assert.deepEqual(await rowsOf('huanglong-and-qilin'), ['chest-red+item-hihi:2.0%']);
    await expect(page.locator('.sr-legend')).not.toContainText('?');
    await page.getByRole('button', { name: '← 전체' }).click();
    await page.locator('.sr-card[data-cat="revans"]').click();
    await expect(page.locator('.sr-legend')).toContainText('파상 공헌도');
    assert.deepEqual(await rowsOf('mugen'), ['chest-blue+item-sand:360만1.0%']);
    const oneLine = await page.locator('.sr-card[data-boss="mugen"] .sr-loot-row').evaluate(r => [getComputedStyle(r).justifyContent, Math.round(r.getBoundingClientRect().height)]);
    assert.ok(oneLine[0] === 'center' && oneLine[1] <= 15, 'centered, one line: ' + oneLine);
    const order = await page.locator('.sr-card[data-boss="mugen"]').evaluate(c => [...c.children].map(e => e.className.split(' ')[0]));
    assert.deepEqual(order, ['sr-pic', 'sr-loot', 'sr-name'], 'picture → chests → name');
    await page.getByRole('button', { name: '← 전체' }).click();
    await page.locator('.sr-card[data-cat="proto"]').click();
    assert.deepEqual(await rowsOf('pbhl'), ['chest-blue+item-hihi:권장 120만+2.2%', 'chest-red+item-hihi:2.5%']);
    assert.deepEqual(await rowsOf('ubhl'), ['chest-gold+item-hihi:0.05%', 'chest-red+item-hihi:2.4%']);
    const brokenIcons = await page.locator('.sr-loot img, .sr-legend img').evaluateAll(imgs => imgs.filter(i => !i.complete || !i.naturalWidth).length);
    assert.equal(brokenIcons, 0);
    const lootCut = await page.locator('.sr-loot-row').evaluateAll(rs => rs.filter(r => [...r.children].some(c => c.getBoundingClientRect().right > r.getBoundingClientRect().right + 1)).map(r => r.textContent));
    assert.deepEqual(lootCut, [], 'chest rows are not cut off at 360px');
    await page.getByRole('button', { name: '← 전체' }).click();
    await page.locator('.sr-card[data-cat="dragons"]').click();
    assert.deepEqual(await rowsOf('wilnas'), ['chest-blue:권장 100만+', 'chest-gold+item-sand:0.1%']);
    assert.deepEqual(await page.locator('.sr-loot-row').evaluateAll(rs => rs.filter(r => [...r.children].some(c => c.getBoundingClientRect().right > r.getBoundingClientRect().right + 1)).map(r => r.textContent)), [], 'dragon rows fit');
    await page.getByRole('button', { name: '← 전체' }).click();
    const brokenSearch = await page.locator('#tab-search img').evaluateAll(imgs => imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
    assert.deepEqual(brokenSearch, []);
    await expect(page.locator('#srQuery')).toHaveText('グラブル スパバハ');
    await page.locator('.sr-card[data-cat="dragons"]').click();
    await page.locator('.sr-card[data-boss="wilnas"]').click();
    const cardH = await page.locator('.sr-card img').first().evaluate(e => e.getBoundingClientRect().height);
    assert.ok(cardH >= 50 && cardH <= 70, `boss pictures are mid-sized (${cardH}px)`);
    const chipGaps = await page.locator('.sr-group[data-group="buttons"] .sr-chip').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map((r, i, a) => i ? Math.round(r.left - a[i - 1].right) : null).filter(v => v !== null));
    assert.ok(chipGaps.every(g => g === 5), 'condition buttons are evenly spaced: ' + chipGaps);
    const whole = await page.locator('.sr-card img').first().evaluate(e => getComputedStyle(e).objectFit === 'contain' && Math.abs(e.clientWidth / e.clientHeight - 180 / 126) < 0.05);
    assert.ok(whole, 'the whole boss picture is visible');
    await page.locator('.sr-group[data-group="mode"] .sr-chip[data-value="full"]').click();
    await page.locator('.sr-group[data-group="party"] .sr-chip[data-value="solo"]').click();
    await page.locator('.sr-purpose button[data-value="setup"]').click();
    await page.locator('.sr-purpose button[data-value="farm"]').click();
    await expect(page.locator('#srQuery')).toHaveText('グラブル ウィルナス フルオート ソロ 編成 周回');
    await expect(page.locator('#srSummary')).toHaveText('윌나스 · 풀오토 · 솔로 · 편성 · 주회');
    const srBoxes = await boxes(page, '.sr-box, .sr-actions');
    await page.locator('.sr-chip[data-lang="en"]').click();
    await expect(page.locator('#srQuery')).toHaveText('GBF Wilnas full auto solo team farming');
    assert.deepEqual(await boxes(page, '.sr-box, .sr-actions'), srBoxes, 'search box moved');
    await page.locator('.sr-box-head .switch input').uncheck();
    await expect(page.locator('#srQuery')).toHaveText('Wilnas full auto solo team farming');
    await page.locator('.sr-box-head .switch input').check();
    await page.getByRole('button', { name: '← 전체' }).click();
    await page.locator('.sr-card[data-cat="event"]').click();
    assert.equal(await page.locator('.sr-elements .sr-orb img').first().getAttribute('src'), 'img/icons/elem-fire.png');
    await page.locator('.sr-elements button[data-value="fire"]').click();
    await page.locator('.sr-group[data-group="difficulty"] .sr-chip[data-value="150"]').click();
    await page.locator('.sr-chip[data-lang="ja"]').click();
    await expect(page.locator('#srQuery')).toHaveText('グラブル 火古戦場 150HELL フルオート ソロ 編成 周回');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.locator('[data-site="youtube"]').click()]);
    const opened = popup.url();
    await popup.close().catch(() => {});
    assert.ok(opened.startsWith('https://www.youtube.com/results?search_query=') && decodeURIComponent(opened).includes('火古戦場 150HELL'), opened);
    outside.length = 0; // the YouTube tab was opened by the user's click, not by the extension in the background
    await page.reload(); await ready();
    await expect(page.locator('#srQuery')).toHaveText('グラブル 火古戦場 150HELL フルオート ソロ 編成 周回');
    await expect(page.locator('#tab-search .note')).toHaveText('도움 : ww99w');
    // Source notes only on 레이드 탐색기; 극성기 계산기 shows the reference site as a link.
    const notes = await page.locator('.tab .note').allTextContents();
    assert.ok(notes.every(n => !/gbf\.wiki|kamigame|GameWith|출처|수량:/.test(n)), 'no source notes at the bottom: ' + notes);
    await expect(page.locator('#tab-trehun .note')).toHaveText('참고 사이트 : liliel.web.fc2.com');
    await expect(page.locator('#tab-trehun .note a')).toHaveCount(0); // plain text, not a link
    await expect(page.locator('#tab-gw .note')).toHaveCount(0);
    checks.push('검색기: pick 육룡 → 윌나스 + 풀오토·솔로·편성·주회 gives "グラブル ウィルナス フルオート ソロ 編成 周回" / English, game-name switch, 고전장 with 화 + 150헬, YouTube button opens the search, remembered, credit "도움 : ww99w"');
    await page.setViewportSize({ width: 360, height: 1100 });
    await page.screenshot({ path: path.join(out, 'search.png') });

    // ---- 패턴표 tab ----
    await page.setViewportSize({ width: 360, height: 760 });
    await page.getByRole('tab', { name: '패턴표' }).click();
    await expect(page.locator('#tab-pattern')).toBeVisible();
    assert.deepEqual(await page.locator('.pt-tab').evaluateAll(els => els.map(e => e.dataset.boss + ':' + e.textContent.trim())), ['tengen:', 'lucizero:', 'versusia:']);
    await expect(page.locator('.pt-tab.on')).toHaveAttribute('data-boss', 'tengen');
    await expect(page.locator('.pt-memo-head')).toHaveText('행동 메모');
    assert.equal(await page.locator('.pt-memo-text').first().getAttribute('placeholder'), null);
    await expect(page.locator('.pt-card', { hasText: '비콜로르 리베라티오' }).locator('.pt-stamp')).toHaveCount(1);
    const secGap = await page.evaluate(() => [...document.querySelectorAll('.pt-memo-sec:not(.first)')].map(s => { const c = [...document.querySelectorAll('.pt-cell')].find(x => x.dataset.at === s.dataset.at); return Math.abs(c.nextElementSibling.querySelector('.pt-mark i').getBoundingClientRect().top - (s.getBoundingClientRect().top + 4)); }));
    assert.ok(secGap.length >= 6 && secGap.every(g => g <= 2), 'memo section lines sit exactly at the HP marks: ' + secGap);
    const marksT = await page.locator('.pt-mark b').allInnerTexts();
    for (const m of ['100%', '90%', '80%', '70%', '60%', '50%', '40%', '15%']) assert.ok(marksT.includes(m), 'mark ' + m);
    await expect(page.locator('.pt-card', { hasText: '비콜로르 리베라티오' })).toHaveCount(1);
    await expect(page.locator('.pt-legend')).toHaveCount(0);
    await expect(page.locator('.pt-opening')).toContainText('40% 이후에 들어오면 서브 포함 전원 사망');
    await expect(page.locator('.pt-card', { hasText: '비콜로르 리베라티오' })).not.toContainText('모두 건너뛰었으면'); // the fail-count table already covers it
    await expect(page.locator('.pt-card', { hasText: '비콜로르 리베라티오' }).locator('.pt-kv', { hasText: '2번 실패' })).toHaveText('2번 실패60% 컷 무효'); // source sheet wording
    await expect(page.locator('.pt-card', { hasText: '하늘 용들의 시련' }).first()).toContainText('해제 시 자기 속성 구슬 해제');
    await page.locator('.pt-card', { hasText: '인텐시스 플레임' }).locator('.tip-icon.pt-inline').hover();
    await expect(page.locator('.float-tip.show')).toContainText('윌나스의 기운');
    await page.mouse.move(2, 2);
    await expect(page.locator('.pt-head .pt-hint')).toHaveCount(0);
    // Exactly two lines: "각 아이콘에 커서를 올리면" / "상세 내용이 나와요." (no squeezed wrapping).
    const hint = await page.locator('.pt-head-stamp > span:last-child').evaluate(s => ({ text: s.innerText, h: s.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(s).lineHeight) }));
    assert.equal(hint.text, '각 아이콘에 커서를 올리면' + String.fromCharCode(10) + '상세 내용이 나와요.');
    assert.ok(hint.h <= hint.lh * 2 + 1, 'the hint is two lines, not squeezed: ' + JSON.stringify(hint));
    await page.locator('.pt-head-stamp .tip-icon').hover();
    await expect(page.locator('.float-tip.show')).toHaveText('이렇게요!');
    assert.ok(await page.locator('.float-tip.show').evaluate(e => e.getBoundingClientRect().width < 110), '이렇게요! box is sized to its text');
    await page.mouse.move(2, 2);
    assert.ok(!/[぀-ヿ一-鿿]/.test(await page.locator('#tab-pattern').innerText()), '천원 has no kanji / kana');
    await expect(page.locator('#tab-pattern')).not.toContainText('CT · 40~15');
    await expect(page.locator('.pt-card', { hasText: '40~15% (셋 중 랜덤)' }).locator('.pt-sub')).toHaveCount(3);
    for (const name of ['루프티스 알도레', '트렌스', '그라운드', '템페스타', '스프렌드', '테네브리스', '라지오 엑제티움']) await expect(page.locator('.pt-card').filter({ has: page.locator('.pt-name', { hasText: name }) })).toHaveCount(1); // each 15% omen on its own card
    await page.locator('.pt-card', { hasText: '주홍의 불꽃 발톱' }).locator('.tip-icon').first().hover();
    await expect(page.locator('.float-tip.show')).toContainText('매 턴 랜덤으로 +1');
    await page.mouse.move(2, 2);
    await page.locator('.pt-card', { hasText: '메토스 루제트' }).locator('.pt-debuff').first().hover();
    await expect(page.locator('.float-tip.show')).toHaveText('허탈매 턴 오의게이지 감소');
    assert.ok(!/[{}]/.test(await page.locator('#tab-pattern').innerText()), 'no raw {debuff} tokens left in the text');
    assert.ok(await page.locator('.pt-debuff').count() >= 15, 'boss debuffs show as icons');
    // Icons are drawn from 2x pictures so they stay sharp on high-DPI screens (debuff sprite: 22 cells of 32px, FC 32px+).
    const res = await page.evaluate(async () => { const load = async s => { const i = new Image(); i.src = s; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }; return [await load('img/icons/debuffs.webp'), await load('img/icons/fc.webp')]; });
    assert.deepEqual(res[0], [704, 32], 'debuff sprite is 2x: ' + res[0]);
    assert.ok(res[1][0] >= 32, 'FC icon is 2x: ' + res[1]);
    await page.mouse.move(2, 2);
    const tops = await page.evaluate(() => [...document.querySelectorAll('.pt-cell[data-at]')].filter(e => e.dataset.at).map(e => [e.dataset.at, Math.round(e.getBoundingClientRect().top)]));
    for (let i = 1; i < tops.length; i++) assert.ok(tops[i][1] >= tops[i - 1][1], 'patterns follow the HP order down the bar');
    const secs = await page.locator('.pt-memo-sec').evaluateAll(s => s.map(x => x.dataset.at));
    assert.deepEqual(secs, ['100%', '90%', '80%', '70%', '60%', '50%', '40%', '15%'], 'one memo box per HP section');
    const fit = await page.evaluate(() => { const b = document.getElementById('ptBoard').getBoundingClientRect(); const s = [...document.querySelectorAll('.pt-memo-sec')]; return [Math.round(b.bottom), Math.round(s[s.length - 1].getBoundingClientRect().bottom)]; });
    assert.ok(Math.abs(fit[0] - fit[1]) <= 2, `memo boxes run the full length of the bar: ${fit}`);
    const full = await page.evaluate(() => { const a = document.querySelector('.pt-memo-text'); const m = a.parentElement.getBoundingClientRect(); return Math.round(m.right - (a.getBoundingClientRect().right - parseFloat(getComputedStyle(a).paddingRight))); });
    assert.ok(full <= 7, 'memo text uses the full width: ' + full);
    // A section box grows with its text and pushes the next HP mark (and its box) down, so they stay level.
    const markTop = l => page.evaluate(l => { const c = [...document.querySelectorAll('.pt-cell')].find(x => x.dataset.at === l); return c.nextElementSibling.querySelector('.pt-mark i').getBoundingClientRect().top + scrollY; }, l);
    const secLine = l => page.evaluate(l => document.querySelector('.pt-memo-sec[data-at="' + l + '"]').getBoundingClientRect().top + 4 + scrollY, l);
    const m90 = await markTop('90%');
    const first = page.locator('.pt-memo-text[data-at="100%"]');
    await first.fill(Array.from({ length: 40 }, (_, i) => '줄 ' + i).join('\n'));
    await page.waitForTimeout(100);
    const m90b = await markTop('90%');
    assert.ok(m90b > m90 + 300, `the 100% box grew and pushed 90% down: ${m90} → ${m90b}`);
    assert.ok(Math.abs((await secLine('90%')) - m90b) <= 2, '90% box line stays level with the 90% mark');
    assert.ok(await first.evaluate(a => a.scrollHeight <= a.clientHeight + 1), 'all lines of the grown box are visible');
    await first.press('End');
    await first.evaluate(a => a.setSelectionRange(a.value.length, a.value.length));
    await page.keyboard.press('Enter');
    await page.keyboard.type('더 쓰기');
    assert.ok((await first.inputValue()).endsWith('줄 39\n더 쓰기'), 'Enter at the end keeps writing in the same section');
    await first.fill('');
    await page.waitForTimeout(100);
    assert.ok(Math.abs((await markTop('90%')) - m90) <= 2, 'clearing the text shrinks the box back');
    // Clicking empty space below the text starts writing on the clicked line.
    const area70 = page.locator('.pt-memo-text[data-at="70%"]');
    await area70.scrollIntoViewIfNeeded();
    const box70 = await area70.boundingBox();
    const yClick = box70.y + 7 + 17 * 2 + 6;
    await page.mouse.click(box70.x + 20, yClick);
    await page.keyboard.type('70 메모');
    assert.equal(await area70.inputValue(), '\n\n70 메모', 'clicking the 3rd line starts the note there');
    // Clicking the last line that fits and typing there (no Enter) never makes the box grow; Korean composition stays intact.
    const area60 = page.locator('.pt-memo-text[data-at="60%"]');
    await area60.scrollIntoViewIfNeeded();
    const box60 = await area60.boundingBox();
    const m50 = await markTop('50%');
    await page.mouse.click(box60.x + 20, box60.y + box60.height - 6);
    const cdp = await context.newCDPSession(page);
    for (const step of ['ㅇ', '아', '안', '안ㄴ', '안녀', '안녕']) await cdp.send('Input.imeSetComposition', { text: step, selectionStart: step.length, selectionEnd: step.length });
    await cdp.send('Input.insertText', { text: '안녕' });
    await page.keyboard.type(' 끝');
    await page.waitForTimeout(100);
    assert.ok((await area60.inputValue()).endsWith('안녕 끝'), 'Korean typed in one piece: ' + JSON.stringify(await area60.inputValue()));
    assert.ok(Math.abs((await markTop('50%')) - m50) <= 1, 'clicking the last line and typing without Enter does not grow the box');
    await area60.fill('');
    checks.push('패턴표 메모: one box per HP section with a dashed line level with its mark; a box grows as you type (Enter keeps going) and pushes the rows below down; clicking empty space starts at that line');
    // A click below the text adds blank lines, but leaving the box without typing never keeps them.
    const area80 = page.locator('.pt-memo-text[data-at="80%"]');
    await area80.evaluate(a => a.scrollIntoView({ block: 'center' }));
    const box80 = await area80.boundingBox();
    await page.mouse.click(box80.x + 20, box80.y + 7 + 17 + 6);
    assert.equal(await area80.inputValue(), String.fromCharCode(10), 'the click put the caret on the 2nd line (box ' + JSON.stringify(box80) + ' hit ' + await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.className + ' ' + (e.dataset.at || '')); }, [box80.x + 20, box80.y + 7 + 17 + 6]) + ')');
    await area80.evaluate(a => a.blur());
    assert.equal(await area80.inputValue(), '', 'blank lines from a click without typing are dropped on leaving the box');
    await area70.fill('디스펠 캐릭 준비');
    await first.fill('90% 전에 오의 아껴두기');
    await page.waitForTimeout(400);
    await page.locator('.pt-tab[data-boss="lucizero"]').click();
    await expect(page.locator('.pt-tab.on')).toHaveAttribute('data-boss', 'lucizero');
    assert.ok(!/\bnull\b|undefined/.test(await page.locator('#tab-pattern').innerText()), 'no stray null in 루시제로');
    assert.ok(await page.locator('.pt-memo-text').evaluateAll(a => a.length >= 6 && a.every(x => !x.value)), '루시제로 memo is separate (empty)');
    await expect(page.locator('.pt-opening')).toContainText('공격 DOWN·방어 DOWN 무효');
    await expect(page.locator('.pt-opening')).not.toContainText('리셋'); // reset points live in the pattern list
    assert.deepEqual(await page.locator('.pt-reset').allInnerTexts(), ['종말 카운트다운 시작 · 9분 타임어택', '종말 카운트다운 리셋 · 9분 타임어택', '종말 카운트다운 리셋 · 18분 타임어택', '종말 카운트다운 리셋 · 9분 타임어택']);
    await expect(page.locator('.pt-card', { hasText: '묵시록의 나팔' })).toContainText('첫 진입자에 한해 보스 약체 리셋');
    await expect(page.locator('.pt-card', { hasText: '묵시록의 나팔' })).toContainText('HP가 10%보다 낮아지지 않음 (20%에서 자기 속성 시련을 클리어하면 해제)');
    await expect(page.locator('#tab-pattern')).not.toContainText('멈춤');
    const gauge = await page.locator('.pt-opening .pt-gauge img').evaluate(i => { const o = i.closest('.pt-opening').getBoundingClientRect(), r = i.getBoundingClientRect(); return { ok: i.complete && i.naturalWidth > 0, right: Math.round(o.right - r.right), top: Math.round(r.top - o.top) }; });
    assert.ok(gauge.ok && gauge.right < 14 && gauge.top < 20, 'gauge picture sits at the top right of 시작할 때: ' + JSON.stringify(gauge));
    assert.deepEqual(await page.locator('.pt-gauge-chip').allInnerTexts(), ['6칸', '5칸', '4칸', '3칸', '2칸', '1칸']);
    await expect(page.locator('.pt-gauge-levels')).toContainText('방어 무시');
    const resetFits = await page.locator('.pt-reset').evaluateAll(ls => ls.every(l => l.scrollWidth <= l.closest('.pt-card').clientWidth && l.getBoundingClientRect().height <= 30 && [...l.querySelectorAll('.pt-reset-k')].every(k => k.getClientRects().length === 1)));
    assert.ok(resetFits, 'reset badges stay inside their card and only break between "종말 카운트다운 리셋" and "· n분 타임어택"');
    await expect(page.locator('.pt-opening')).toContainText('전조 실패 시 -1분');
    await expect(page.locator('.pt-card', { hasText: '세피로트' }).first()).toContainText('80%에서 파라다이스 로스트');
    for (const ct of await page.locator('.pt-card.k-ct').all()) {
      const text = await ct.locator('.pt-lines > li:not(.pt-sub)').allInnerTexts();
      assert.ok(text.every(l => (l.match(/포스포로스|이브리스|테세라|절대부정|영원거절/g) || []).length <= 1), 'one pattern per line: ' + text);
    }
    await expect(page.locator('.pt-card.k-ct').first().locator('.pt-sub')).toHaveCount(3);
    await expect(page.locator('.pt-card.k-ct').first()).toContainText('테세라 전조');
    assert.equal(await page.locator('.pt-card.k-ct').first().locator('.pt-sub-eff').count(), 3, '루시제로 CT shows what each CT does');
    const vanitas = page.locator('.pt-card', { hasText: '위주일 때' });
    await expect(vanitas).toHaveCount(4); // 통상 / 어빌 / 오의 / 그 외 each on its own card
    for (const c of await vanitas.all()) await expect(c.locator('.pt-sub')).toHaveCount(3);
    const marksL = await page.locator('.pt-mark b').allInnerTexts();
    for (const m of ['개막', '95%', '80%', '60%', '55%', '20%', '13%', '6%']) assert.ok(marksL.includes(m), 'mark ' + m);
    await expect(page.locator('.pt-ref')).toHaveCount(0); // statuses live inside the patterns now
    await expect(page.locator('.pt-stamp')).toHaveCount(2); // 묵시록의 나팔, 종말의 복음
    const yellow = page.locator('.pt-card', { hasText: '파라다이스 로스트' }).locator('.tip-icon').nth(2);
    await yellow.hover();
    await expect(page.locator('.float-tip.show')).toContainText('노란 사과');
    await expect(page.locator('.float-tip.show')).toContainText('강화 어빌');
    await page.mouse.move(2, 2);
    await expect(page.locator('.float-tip.show')).toHaveCount(0);
    await page.locator('.pt-tab[data-boss="versusia"]').click();
    await expect(page.locator('.pt-card.k-route-b').first()).toBeVisible();
    await expect(page.locator('.pt-card.k-route-r').first()).toBeVisible();
    const marksV = await page.locator('.pt-mark b').allInnerTexts();
    assert.ok(marksV.includes('G50') && marksV.includes('G100'), 'Versusia shows G50 and G100: ' + marksV);
    await expect(page.locator('.pt-stamp')).toHaveCount(3); // G50 정토, 법등 해제, 광배 해제
    await expect(page.locator('.pt-card', { hasText: '신격 3주차' })).toHaveCount(0);
    const week2 = await page.locator('.pt-card', { hasText: '신격 2주차' }).locator('li').allInnerTexts();
    assert.equal(week2[0], '3주차도 같은 폭으로 증가', 'week 2 opens with the week-3 note (the 다섯 전조 line was removed on request): ' + week2);
    assert.ok(!week2.some(l => l.includes('다섯 전조')), 'no 다섯 전조 line in week 2');
    const g100 = await page.locator('.pt-card', { hasText: '정토 (G100' }).innerText();
    assert.ok(g100.includes('진입에 방어 DC를 사용하는 걸 고려'), 'G100 suggests the defence DC');
    const halo = await page.locator('.pt-card', { hasText: '6속성의 광배' }).innerText();
    assert.ok(halo.includes('전조 한 개 해제 시 자기 속성') && halo.includes('소거'), '광배 wording: 전조 한 개 해제 시 자기 속성 [광배] 소거');
    // G100: what is removed and what the boss gains are on separate lines; 댐컷 wording; HP floors and FC are icons.
    const g100Lines = await page.locator('.pt-card', { hasText: '정토 (G100' }).locator('li').allTextContents();
    assert.ok(g100Lines.some(l => l.startsWith('해제: ') && l.includes('HP 15% 하한')) && g100Lines.some(l => l.startsWith('보스 강화: ') && l.includes('창세의 일익')), 'G100 splits 해제 / 보스 강화: ' + g100Lines);
    await expect(page.locator('#tab-pattern')).not.toContainText('피해 컷');
    await expect(page.locator('#tab-pattern')).not.toContainText('페이탈 체인');
    assert.ok(await page.locator('#tab-pattern .tip-icon.pt-inline img[src$="fc.webp"]').count() >= 3, 'FC shown as an icon in cancel conditions');
    // Icons sit on the text line (not floating above it) in cancel conditions; FC gauge is written "[FC icon] 게이지".
    const off = await page.locator('#tab-pattern .pt-keep').evaluateAll(keeps => keeps.filter(k => k.firstChild && k.firstChild.nodeType === 3 && k.firstChild.textContent.trim()).map(k => {
      const r = document.createRange(); r.selectNodeContents(k.firstChild); const t = r.getClientRects(); const last = t[t.length - 1];
      const i = k.querySelector('.tip-icon, .pt-debuff').getBoundingClientRect();
      return Math.abs((i.top + i.bottom) / 2 - (last.top + last.bottom) / 2);
    }));
    assert.ok(off.length >= 3 && Math.max(...off) <= 4, 'icons sit on the same line as the word before them: ' + off);
    await expect(page.locator('#tab-pattern')).not.toContainText('FC -30%');
    const gaugeLine = page.locator('#tab-pattern .pt-sub-eff', { hasText: '게이지 -30%' }).first();
    await expect(gaugeLine.locator('.tip-icon.pt-inline img[src$="fc.webp"]')).toHaveCount(1); // "[FC icon] 게이지 -30%"
    await expect(page.locator('#tab-pattern')).not.toContainText('1주차의 3배');
    await expect(page.locator('.pt-card .pt-name', { hasText: '정토 (G100 또는 HP 16%)' })).toHaveCount(1);
    await expect(page.locator('.pt-card .pt-name', { hasText: '정토 (G50 또는 HP 51%)' })).toHaveCount(1);
    await expect(page.locator('#tab-pattern')).not.toContainText('게이지 50%');
    // Status names inside the text are shown as icons (hover for the name); definitions like "파괴의 힘(제네시스 게이지):" stay as words.
    await expect(page.locator('.pt-opening')).toContainText('파괴의 힘(제네시스 게이지):');
    await expect(page.locator('#tab-pattern')).not.toContainText('파괴의 법등·광등');
    await expect(page.locator('#tab-pattern')).not.toContainText('사왕천~화락천');
    const inline = await page.locator('#tab-pattern .tip-icon.pt-inline img').evaluateAll(a => [...new Set(a.map(i => i.getAttribute('src').split('/').pop()))]);
    for (const f of ['v-mandate-destroy.webp', 'v-halo.webp', 'v-halo6.webp', 'v-dominion.webp', 'v-k1.webp', 'v-wing.webp', 'v-mandate.webp']) assert.ok(inline.includes(f), 'inline icon ' + f + ': ' + inline);
    assert.ok(await page.locator('#tab-pattern .tip-icon.pt-inline img').evaluateAll(a => a.every(i => i.complete && i.naturalWidth > 0)), 'inline icons load');
    for (const n of ['신격 1주차', '신격 2주차']) await expect(page.locator('.pt-card').filter({ has: page.locator('.pt-name', { hasText: n }) })).toHaveCount(1);
    await expect(page.locator('.pt-opening-head .tip-icon')).toHaveCount(2); // 법등 · 파괴의 힘 only (red/blue wills come at 80%)
    await expect(page.locator('.pt-opening li .tip-icon.pt-inline')).toHaveCount(3); // 법등 / 파괴의 법등 · 광등 inside the text
    await expect(page.locator('.pt-opening')).toContainText('파괴의 힘(제네시스 게이지): 누가 턴을 넘길 때마다 +0.5%');
    await expect(page.locator('.pt-opening')).toContainText('팀 배정');
    await expect(page.locator('.pt-card.k-route-b .pt-tag.is-ct')).toHaveText('CT');
    await expect(page.locator('.pt-card.k-route-b .pt-sub-hard').first()).toContainText('타화자재');
    const hardRow = page.locator('.pt-card.k-route-b .pt-sub', { hasText: '약체 15회 + TA 4회' });
    await expect(hardRow.locator('.pt-sub-cond')).toHaveText('해제약체 15회 + TA 4회');
    await expect(hardRow.locator('.pt-sub-hard')).toHaveText('타화자재약체 18회 + TA 5회'); // full condition, not "18 + 5"
    const below = await hardRow.evaluate(r => r.querySelector('.pt-sub-hard').getBoundingClientRect().top >= r.querySelector('.pt-sub-head').getBoundingClientRect().bottom - 1);
    assert.ok(below, '타화자재 condition sits on its own line under 해제');
    assert.ok((await page.locator('.pt-sub-hard').allInnerTexts()).every(t => /회|hit|체인/.test(t)), 'every 타화자재 line spells out the full condition');
    await expect(page.locator('.pt-card.k-ct').last().locator('.pt-sub-eff')).toHaveCount(3);
    await page.locator('.pt-card', { hasText: '파괴의 시련' }).locator('.pt-stamp').hover();
    await expect(page.locator('.float-tip.show')).toContainText('법등 해제 후 자기 속성 스탬프 찍기');
    await page.mouse.move(2, 2);
    const k3 = page.locator('.pt-card', { hasText: '상시 효과 변화' }).locator('.tip-icon').nth(3);
    await k3.hover();
    await expect(page.locator('.float-tip.show')).toContainText('야마천');
    await page.mouse.move(2, 2);
    for (const boss of ['tengen', 'lucizero', 'versusia']) {
      await page.locator(`.pt-tab[data-boss="${boss}"]`).click();
      await expect(page.locator('#tab-pattern')).not.toContainText('한 방');
      await expect(page.locator('#tab-pattern')).not.toContainText('데미지'); // spelled 대미지
      const ctNames = await page.locator('.pt-card.k-ct .pt-name').allInnerTexts();
      assert.ok(ctNames.every(n => n !== 'CT 기술' && /%|G[0-9]/.test(n)), boss + ' CT cards show their HP range: ' + ctNames);
      const txt = await page.locator('#tab-pattern').innerText();
      assert.ok(!/[↑↓!]/.test(txt.replace('이렇게요!', '')), boss + ': up/down said as UP / DOWN, no arrows or "!"');
      assert.ok(!/(소환 불가|오의 봉인|가드 불가|쇠약|[가-힣]+ 기운 Lv[+-]3|두 용 기운)/.test(txt), boss + ': debuffs / dragon energy shown as icons, not words');
      // CT cards come right after the opener of their HP range (time order), not after its later omens.
      const order = await page.locator('.pt-card .pt-name').allInnerTexts();
      const after = { tengen: ['육룡 두 마리 등장', '메토스 루제트 (100~40%)'], lucizero: ['디 엔드', '100~81%'], versusia: ['파괴의 시련', '100~81%'] }[boss];
      assert.equal(order[order.indexOf(after[0]) + 1], after[1], boss + ': CT card follows ' + after[0] + ': ' + order.join(' / '));
    }
    await page.locator('.pt-tab[data-boss="lucizero"]').click();
    const lz = await page.locator('.pt-card .pt-name').allInnerTexts();
    assert.equal(lz[lz.indexOf('묵시록의 나팔') + 1], '60~21%', '루시제로 60~21% CT right after 묵시록의 나팔');
    assert.equal(lz[lz.indexOf('안티바실레이아') + 1], '아키시온 아포칼립스 (20~0%)', '루시제로 20~0% CT right after 안티바실레이아');
    await expect(page.locator('.pt-card', { hasText: '안티바실레이아' })).toContainText('해제 시 해당 속성 시련과 HP 10% 하한 소거');
    await expect(page.locator('.pt-card', { hasText: '안티바실레이아' })).toContainText('시에테 등 강제 해제 X');
    await expect(page.locator('.pt-card', { hasText: '안티바실레이아' })).not.toContainText('같은 속성끼리');
    await expect(page.locator('.pt-card', { hasText: '디 엔드' }).first()).toContainText('해제 실패시 서브를 포함해 전원 사망');
    await page.locator('.pt-card', { hasText: '절대부정일 때' }).locator('.pt-sub .tip-icon.pt-inline').first().hover();
    await expect(page.locator('.float-tip.show')).toContainText('절대부정');
    await page.mouse.move(2, 2);
    await page.locator('.pt-card', { hasText: '세피로트 바니타스' }).locator('.pt-debuff').last().hover();
    await expect(page.locator('.float-tip.show')).toHaveText('소환 불가소환석 사용 불가');
    await page.mouse.move(2, 2);
    checks.push('패턴표 순서·아이콘: CT 카드는 그 HP 구간 시작 전조 바로 다음; 소환 불가·오의 봉인·쇠약·가드 불가·기운 Lv은 아이콘(커서 올리면 설명); ↑↓! 대신 UP/DOWN');
    await page.locator('.pt-tab[data-boss="tengen"]').click();
    await page.reload(); await ready();
    await expect(page.locator('#tab-pattern')).toBeVisible();
    assert.equal(await page.locator('.pt-memo-text[data-at="100%"]').inputValue(), '90% 전에 오의 아껴두기');
    assert.equal(await page.locator('.pt-memo-text[data-at="70%"]').inputValue(), '디스펠 캐릭 준비');
    checks.push('패턴표: 천원/루시제로/베르수시아 tabs with raid pictures; patterns sit in HP order along a vertical bar with % marks; one continuous memo runs the full bar with HP guide lines; memo is kept per boss after reopening');
    await page.setViewportSize({ width: 360, height: 2400 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, 'pattern.png') });
    await page.setViewportSize({ width: 360, height: 760 });
    for (const width of [300, 360, 480]) {
      await page.setViewportSize({ width, height: 760 });
      for (const tab of ['고전장', '레이드 탐색기', '패턴표', '베인 노트']) {
        await page.getByRole('tab', { name: tab }).click();
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        assert.ok(over <= 0, `${tab} overflows by ${over}px at ${width}px`);
      }
      const clippedTabs = await page.locator('.tile-text').evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 0.5).map(e => e.textContent));
      assert.deepEqual(clippedTabs, [], `tab names cut at ${width}px`);
    }
    await page.setViewportSize({ width: 360, height: 760 });
    checks.push('고전장, 검색기, 패턴표 and the six tabs fit at 300/360/480px (no tab name cut)');
    assert.deepEqual(errors, []);
    assert.deepEqual(outside, [], 'the extension must not request anything outside itself');
    checks.push('No script errors and no network requests outside the extension');
    console.log(checks.map(c => '✔ ' + c).join('\n'));
  } finally {
    await context.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
