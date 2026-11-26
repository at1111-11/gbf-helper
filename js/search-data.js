// 검색기 data: bosses and search conditions, adapted from 그랑블루 검색 도우미 (ww99w).
// Pictures are gbf.wiki Raids lobby icons saved in img/raids/.
(function (root) {
  const R = name => `img/raids/${name}.webp`;

  const CATEGORIES = [
    { id: 'malice', ko: '마리스', stars: 3, img: R('tiamal') },
    { id: 'normal', ko: '별 4 레이드', stars: 4, img: R('four-primarchs') },
    { id: 'magna3', ko: '마그나 III', stars: 5, img: R('tia3') },
    { id: 'dragons', ko: '육룡', stars: 5, img: R('wilnas') },
    { id: 'proto', ko: '채광터', stars: 6, img: R('pbhl') },
    { id: 'odious', ko: '금주', stars: 6, img: R('belmervolk') },
    { id: 'faa', ko: '별 7 아스트랄', stars: 7, img: R('faahl') },
    { id: 'revans', ko: '레반스', stars: 7, img: R('mugen') },
    { id: 'special', ko: '시련', stars: 7, img: R('martial') },
    { id: 'hard', ko: '금주 하렙', stars: 7, img: R('belmervolk-hard') },
    { id: 'lucizero', ko: '고난이도', stars: 9, img: R('lucizero') },
    { id: 'event', ko: '고전장', stars: 0, img: R('hell-150') }
  ];

  const B = (id, category, ko, jp, en, img) => ({ id, category, ko, jp, en, img: R(img || id), loot: LOOT[id] || [] });

  // Chest info shown on boss cards, from each raid's gbf.wiki drop table (2026-11-26).
  // blue: 파상 — cut = honor that guarantees it (wiki % of total honor × HP/100); pre '권장' = recommended honor where it is never guaranteed (user's numbers).
  // gold / red: 금상 / 빨상(호스트) that can hold 모래시계(sand) or 히히(hihi). Sand rates for 마리스·마3·육룡 (0.1%) and
  // 시련·슈바하·고난이도 (1%) are the user's numbers (2026-11-26); rate '?' = unknown.
  const blue = (cut, item, rate, extra) => Object.assign({ chest: 'blue', cut, item: item || '', rate: rate || '' }, extra);
  const gold = (item, rate) => ({ chest: 'gold', item, rate });
  const host = (item, rate) => ({ chest: 'red', item, rate, who: '호스트' });
  const MAGNA = [blue('125만'), gold('sand', '0.1%')];
  const ODIOUS = [blue('159만'), gold('sand', '0.4%')];
  const DRAGON = [blue('100만+', '', '', { pre: '권장' }), gold('sand', '0.1%')];
  const MALICE = [gold('sand', '0.1%')];
  const LOOT = {
    tiamal: MALICE, levimal: MALICE, phronesis: MALICE, 'lumi-mal': MALICE, anima: MALICE, 'legion-void': MALICE,
    'huanglong-and-qilin': [host('hihi', '2.0%')], // 자발 2%: user's number (wiki lists the brick without a rate)
    'faa-normal': [blue('70만')], 'four-primarchs': [blue('42만')], lindwurm: [blue('100만')],
    colo3: MAGNA, levi3: MAGNA, ygg3: MAGNA, tia3: MAGNA, lumi3: MAGNA, cele3: MAGNA,
    wilnas: DRAGON, wamdus: DRAGON, galleon: DRAGON, ewiyar: DRAGON, luwoh: DRAGON, fediel: DRAGON,
    pbhl: [blue('120만+', 'hihi', '2.2%', { pre: '권장' }), host('hihi', '2.5%')],
    ubhl: [gold('hihi', '0.05%'), host('hihi', '2.4%')],
    akasha: [blue('144만', 'hihi', '0.2%')], 'grand-order-hl': [blue('130만', 'hihi', '0.2%')],
    belmervolk: ODIOUS, nihuyvintae: ODIOUS, narophirmidas: ODIOUS, macutanmacar: ODIOUS, papahlukruva: ODIOUS, zamalvoch: ODIOUS,
    'the-world': [blue('141만', 'sand', '0.6%')],
    mugen: [blue('360만', 'sand', '1.0%')], diaspora: [blue('400만', 'sand', '1.0%')], siegfried: [blue('400만', 'sand', '1.0%')],
    siete: [blue('400만', 'sand', '1.0%')], cosmos: [blue('400만', 'sand', '1.0%')], agastia: [blue('400만', 'sand', '1.0%')],
    martial: [blue('500만', 'sand', '1.0%')], esoteric: [blue('500만', 'sand', '1.0%')], virtuosic: [blue('500만', 'sand', '1.0%')],
    'belmervolk-hard': [blue('580만', 'sand', '1.0%')], 'nihuyvintae-hard': [blue('564만', 'sand', '1.0%')], 'zamalvoch-hard': [blue('552만', 'sand', '1.0%')],
    subaha: [gold('sand', '1.0%')], lucizero: [gold('sand', '1.0%')], hexachromatic: [gold('sand', '1.0%')], versusia: [gold('sand', '1.0%')]
  };
  const BOSSES = [
    B('tiamal', 'malice', '티아마트 마리스', 'ティアマリス', 'Tiamat Malice'),
    B('levimal', 'malice', '리바이어선 마리스', 'リヴァイアサン・マリス', 'Leviathan Malice'),
    B('phronesis', 'malice', '프로네시스', 'フロネシス', 'Phronesis'),
    B('lumi-mal', 'malice', '슈발리에 마리스', 'シュヴァリエ・マリス', 'Luminiera Malice'),
    B('anima', 'malice', '아니마 아니무스 코어', 'アニマ・アニムス・コア', 'Anima-Animus Core'),
    B('legion-void', 'malice', '레기온 보이드', 'レギオン・ヴォイド', 'Legion Void'),
    B('faa-normal', 'normal', '루시퍼 NORMAL', 'ルシN', 'Lucilius Normal'),
    B('huanglong-and-qilin', 'normal', '황룡·흑기린 HL', '黄龍・黒麒麟HL', 'Huanglong & Qilin HL'),
    B('four-primarchs', 'normal', '사대천사', '四大天司HL', 'Four Primarchs'),
    B('lindwurm', 'normal', '린드블룸', 'リンドヴルムHL', 'Lindwurm'),
    B('colo3', 'magna3', '콜로서스 이라 마그나', 'コロッサス・イラマグナ', 'Colossus Ira Omega'),
    B('levi3', 'magna3', '리바이어선 마레 마그나', 'リヴァイアサン・マレマグナ', 'Leviathan Mare Omega'),
    B('ygg3', 'magna3', '유그드라실 아르보스 마그나', 'ユグドラシル・アルボスマグナ', 'Yggdrasil Arbos Omega'),
    B('tia3', 'magna3', '티아마트 아우라 마그나', 'ティアマト・アウラマグナ', 'Tiamat Aura Omega'),
    B('lumi3', 'magna3', '슈발리에 크레도 마그나', 'シュヴァリエ・クレドマグナ', 'Luminiera Credo Omega'),
    B('cele3', 'magna3', '세레스트 아텔 마그나', 'セレスト・アーテルマグナ', 'Celeste Ater Omega'),
    B('wilnas', 'dragons', '윌나스', 'ウィルナス', 'Wilnas'),
    B('wamdus', 'dragons', '왐듀스', 'ワムデュス', 'Wamdus'),
    B('galleon', 'dragons', '가레온', 'ガレヲン', 'Galleon'),
    B('ewiyar', 'dragons', '이위야', 'イーウィヤ', 'Ewiyar'),
    B('luwoh', 'dragons', '루오', 'ル・オー', 'Lu Woh'),
    B('fediel', 'dragons', '페디엘', 'フェディエル', 'Fediel'),
    B('pbhl', 'proto', '프로토 바하무트 HL', 'つよばは', 'Proto Bahamut HL'),
    B('ubhl', 'proto', '얼티밋 바하무트 HL', 'アルバハHL', 'Ultimate Bahamut HL'),
    B('akasha', 'proto', '아카샤', 'アーカーシャHL', 'Akasha'),
    B('grand-order-hl', 'proto', '그랑데 HL', 'グランデHL', 'Grand Order HL'),
    B('belmervolk', 'odious', '벨메르볼크', 'ベルメルヴォルク', 'Belmervolk'),
    B('nihuyvintae', 'odious', '니후이빈테', 'ニフイヴィンテ', 'Nihuyvintae'),
    B('narophirmidas', 'odious', '나로필미다스', 'ナロフィルミダス', 'Narophirmidas'),
    B('macutanmacar', 'odious', '마크탄마칼', 'マクタンマカル', 'Macutanmacar'),
    B('papahlukruva', 'odious', '파파루크루바', 'パパルクルヴァ', 'Papahlukruva'),
    B('zamalvoch', 'odious', '자마르보치', 'ザマルヴォッチ', 'Zamalvoch'),
    B('faahl', 'faa', '루시퍼 HL', 'ルシHL', 'Lucilius HL'),
    B('bubs', 'faa', '벨제바브', 'バブさん', 'Beelzebub'),
    B('belial', 'faa', '벨리알', 'ベリアル', 'Belial'),
    B('the-world', 'faa', '더 월드 HL', 'ザ・ワールドHL', 'The World HL'),
    B('mugen', 'revans', '무겐', 'ムゲン', 'Mugen'),
    B('diaspora', 'revans', '디아스포라', 'ディアスポラ', 'Diaspora'),
    B('siegfried', 'revans', '지크프리트', 'ジークフリート', 'Siegfried HL'),
    B('siete', 'revans', '시에테', 'シエテ', 'Seofon'),
    B('cosmos', 'revans', '코스모스', 'コスモス', 'Cosmos'),
    B('agastia', 'revans', '아가스티아', 'アガスティア', 'Agastia'),
    B('martial', 'special', '무극의 시련', '武極の試練', 'Martial Mastery Trial'),
    B('esoteric', 'special', '마성의 시련', '魔星の試練', 'Esoteric Mastery Trial'),
    B('virtuosic', 'special', '신장의 시련', '神匠の試練', 'Virtuosic Mastery Trial'),
    B('belmervolk-hard', 'hard', '벨메르볼크 하렙', 'ベルメルヴォルクHARD', 'Belmervolk (Hard)'),
    B('nihuyvintae-hard', 'hard', '니후이빈테 하렙', 'ニフイヴィンテHARD', 'Nihuyvintae Hard'),
    B('zamalvoch-hard', 'hard', '자마르보치 하렙', 'ザマルヴォッチHARD', 'Zamalvoch Hard'),
    B('subaha', 'lucizero', '슈퍼 바하무트', 'スパバハ', 'Super Ultimate Bahamut'),
    B('lucizero', 'lucizero', '루시퍼 제로', 'ルシゼロ', 'Dark Rapture Zero'),
    B('hexachromatic', 'lucizero', '천원', '天元', 'Hexachromatic Hierarch'),
    B('versusia', 'lucizero', '베르수시아', 'ヴェルサシア', 'Versusia Genesis'),
    B('gw', 'event', '고전장', '古戦場', 'GW', 'hell-150')
  ];

  // [value, 한국어, 日本語, English]
  const GROUPS = [
    { id: 'element', label: '편성 속성', values: [['fire', '화', '火属性', 'Fire'], ['water', '수', '水属性', 'Water'], ['earth', '토', '土属性', 'Earth'], ['wind', '풍', '風属性', 'Wind'], ['light', '광', '光属性', 'Light'], ['dark', '암', '闇属性', 'Dark']] },
    { id: 'difficulty', label: '고전장 난이도', eventOnly: true, values: [['explus', 'EX+', 'EX+', 'EX+'], ['swarm', 'SWARM', 'SWARM', 'SWARM'], ...['90', '95', '100', '150', '200', '250'].map(x => [x, x + '헬', x + 'HELL', x + 'HELL'])] },
    { id: 'mode', label: '조작 방식', values: [['full', '풀오토', 'フルオート', 'full auto'], ['manual', '수동', '手動', 'manual']] },
    { id: 'party', label: '참여 방식', values: [['solo', '솔로', 'ソロ', 'solo'], ['help', '구원', '救援', 'raid help'], ['blue', '청상', '青箱', 'blue chest']] },
    { id: 'buttons', label: '버튼 수', values: [['0', '0버튼', '0ポチ', '0 buttons'], ['1', '1버튼', '1ポチ', '1 button'], ['2', '2버튼', '2ポチ', '2 buttons']] },
    { id: 'summons', label: '소환 수', values: [['0', '0소환', '召喚なし', 'no summons'], ['1', '1소환', '1召喚', '1 summon']] },
    { id: 'turns', label: '턴 수', values: [['one', '1턴', '1ターン', '1 turn'], ['two', '2턴', '2ターン', '2 turns'], ['three', '3턴', '3ターン', '3 turns']] },
    { id: 'build', label: '편성 계열', multiple: true, values: [['magna', '마그나', 'マグナ', 'Magna'], ['primal', '신석', '神石', 'Primal']] },
    { id: 'ougi', label: '오의', multiple: true, values: [['focused', '오의축', '奥義軸', 'ougi team'], ['off', '오의 끄기', '奥義オフ', 'ougi off']] },
    { id: 'restriction', label: '캐릭터', multiple: true, values: [['no-seasonal', '시즌 한정 없음', '季節限定なし', 'no seasonal characters']] },
    { id: 'purpose', label: '찾을 정보', multiple: true, values: [['setup', '편성', '編成', 'team'], ['guide', '공략', '攻略', 'guide'], ['farm', '주회', '周回', 'farming']] },
    { id: 'priority', label: '안정성', multiple: true, values: [['stable', '안정', '安定', 'stable']] },
    { id: 'experience', label: '대상', multiple: true, values: [['beginner', '초보자용', '初心者', 'beginner']] }
  ];

  // Opened only when the user presses a search button.
  const SEARCH_URLS = {
    youtube: 'https://www.youtube.com/results?search_query=',
    google: 'https://www.google.com/search?q=',
    x: 'https://x.com/search?f=live&q='
  };

  const data = { CATEGORIES, BOSSES, GROUPS, SEARCH_URLS };
  root.GBF_SEARCH_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
