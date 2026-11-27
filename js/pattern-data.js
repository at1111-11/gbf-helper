// 패턴표 data. Rewritten from the pattern sheets the user shared (천원 sheet, GameWith 루시제로 / 베르수시아 sheets),
// checked item by item against the gbf.wiki raid pages (2026-11-26), and ordered by boss HP so each pattern sits at its place on the HP bar.
// Row: hp (bar position, null = right after the row above), at (label on the bar), when (timing), name, cond (how to cancel),
// lines (effects), kind ('hp' | 'ct' | 'special' | 'note' | 'route-b' | 'route-r'), danger, icons (keys into ICONS),
// stamp (ICONS key of the stamp to throw there: 'stamp' = omen pause, 'stampMandate' / 'stampHalo' = own-element stamp).
// A line is text, or { n: name, c: cancel, t: cancel under 타화자재, e: effect }, { k, v } for small tables, { head } / { ct } for sub titles.
// ICONS: in-game status icons (img/icons/) with the text shown when hovering them.
(function (root) {
  const R = name => `img/raids/${name}.webp`;
  const I = name => `img/icons/${name}.webp`;
  const DRAGON_UP = '매 턴 랜덤으로 +1';

  const ICONS = {
    // 천원
    crucible: { img: I('t-crucible'), name: '심원의 도가니', lines: ['40% 비콜로르 리베라티오가 레벨만큼 강해짐 (최대 20)', '구간이 바뀔 때 직전 두 용의 기운 레벨만큼 상승'] },
    hplock: { img: I('hp-lock'), name: 'HP 고정', lines: ['HP가 40%보다 낮아지지 않음 → 40% 이후엔 15%보다 낮아지지 않음', '15% 루프티스 알도레를 처리하면 해제'] },
    wilnas: { img: I('t-wilnas'), name: '윌나스의 기운', lines: ['레벨만큼 보스 공격력 UP (최대 6)', DRAGON_UP] },
    wamdus: { img: I('t-wamdus'), name: '왐듀스의 기운', lines: ['레벨만큼 보스 받는 피해 감소 + 반사 (최대 6)', DRAGON_UP] },
    galleon: { img: I('t-galleon'), name: '가레온의 기운', lines: ['레벨만큼 보스 방어력 UP (최대 6)', DRAGON_UP] },
    ewiyar: { img: I('t-ewiyar'), name: '이위야의 기운', lines: ['Lv3부터 보스 통상공격 hit 수 UP (최대 6)', DRAGON_UP] },
    luwoh: { img: I('t-luwoh'), name: '루오의 기운', lines: ['레벨만큼 보스 2회 행동 확률 UP (최대 6)', DRAGON_UP] },
    fediel: { img: I('t-fediel'), name: '페디엘의 기운', lines: ['레벨만큼 보스 통상공격에 랜덤 약체 (최대 6)', DRAGON_UP] },
    skytrial: { img: I('t-trial'), name: '하늘 용들의 시련', lines: ['주는 피해 상한 100만 · 턴 종료 시 아군 HP 10% 감소 + 랜덤 약체', '해제: 6턴 안에 TA 18회 또는 오의 18회'] },
    pearl1: { img: I('t-pearl1'), name: '주홍 구슬 (화)', lines: ['보스 화 공격 UP · 통상공격에 화 추가 피해', '화 파티가 시련을 풀면 사라짐'] },
    pearl2: { img: I('t-pearl2'), name: '청람 구슬 (수)', lines: ['보스 수 공격 UP · 통상공격에 수 추가 피해', '수 파티가 시련을 풀면 사라짐'] },
    pearl3: { img: I('t-pearl3'), name: '황금 구슬 (토)', lines: ['보스 토 공격 UP · 통상공격에 토 추가 피해', '토 파티가 시련을 풀면 사라짐'] },
    pearl4: { img: I('t-pearl4'), name: '비취 구슬 (풍)', lines: ['보스 풍 공격 UP · 통상공격에 풍 추가 피해', '풍 파티가 시련을 풀면 사라짐'] },
    pearl5: { img: I('t-pearl5'), name: '순백 구슬 (광)', lines: ['보스 광 공격 UP · 통상공격에 광 추가 피해', '광 파티가 시련을 풀면 사라짐'] },
    pearl6: { img: I('t-pearl6'), name: '칠흑 구슬 (암)', lines: ['보스 암 공격 UP · 통상공격에 암 추가 피해', '암 파티가 시련을 풀면 사라짐'] },
    // 루시제로
    appleRed: { img: I('z-apple-red'), name: '빨간 사과', lines: ['효과: 오의게이지 상승량 DOWN', '해제: 대미지 어빌 사용', '→ 재행동 / 대신 오의게이지 100% 감소 · 받는 피해 UP'] },
    appleBlue: { img: I('z-apple-blue'), name: '파란 사과', lines: ['효과: 매 턴 랜덤 약체', '해제: 약체 어빌 사용', '→ 난격 / 대신 어빌 봉인 2턴'] },
    appleYellow: { img: I('z-apple-yellow'), name: '노란 사과 (바로 해제)', lines: ['효과: 명중률 DOWN', '해제: 강화 어빌 사용', '→ 오의 재발동 / 대신 언데드 3턴'] },
    appleGreen: { img: I('z-apple-green'), name: '초록 사과', lines: ['효과: 매 턴 무속성 5000', '해제: 회복 어빌 사용', '→ 어빌 재사용 3턴 단축 / 대신 암흑 2턴'] },
    repud: { img: I('z-repud'), name: '절대부정', lines: ['한 턴에 25hit 미만이면 턴 종료 시 아군 오의게이지 감소 + 보스 피해 고정', 'CT 해제: 오의 4회'] },
    renun: { img: I('z-renun'), name: '영원거절', lines: ['한 턴에 TA 2회 미만이면 턴 종료 시 보스 반사 + 피해 고정', 'CT 해제: TA 3회'] },
    t1: { img: I('z-t1'), name: '제1절', lines: ['턴 종료 시 아군 강화 3개 소거', '해제: 오의 5회'] },
    t2: { img: I('z-t2'), name: '제2절', lines: ['보스 공격 UP · 공격 시 유리속성 추가 피해', '해제: 공격행동 6회'] },
    t3: { img: I('z-t3'), name: '제3절', lines: ['매 턴 아군 전체 무속성 1만', '해제: 3500만 대미지'] },
    t4: { img: I('z-t4'), name: '제4절', lines: ['약체 지속시간 1턴 단축', '해제: 약체 10회'] },
    t5: { img: I('z-t5'), name: '제5절', lines: ['보스 TA 확률 UP', '해제: 페이탈 체인'] },
    t6: { img: I('z-t6'), name: '제6절', lines: ['보스 받는 피해 감소', '해제: 60hit'] },
    t7: { img: I('z-t7'), name: '제7절', lines: ['보스 공격력 · TA 확률 UP', '배정된 속성의 참전자가 안티바실레이아를 풀면 해제'] },
    t8: { img: I('z-t8'), name: '제8절', lines: ['보스 방어력 UP · 약체내성 대폭 UP'] },
    t9: { img: I('z-t9'), name: '제9절', lines: ['보스 hit 수 UP · CT 증가량 UP'] },
    t10: { img: I('z-t10'), name: '제10절', lines: ['매 턴 종료 시 아군 최대 HP 감소'] },
    t11: { img: I('z-t11'), name: '제11절', lines: ['보스 공격에 랜덤 2속성 추가 피해'] },
    t12: { img: I('z-t12'), name: '제12절', lines: ['보스 공격·약체가 암흑·회피·약체 무효 등을 무시하고 필중', '턴 종료 시 아군에게 랜덤 약체'] },
    stamp: { img: 'img/icons/stamp-ok.png', name: 'OK콘 · 전조', lines: ['전조가 뜨면 스탬프를 찍고 전원 확인 후 전조 클리어'] },
    stampMandate: { img: 'img/icons/stamp-ok.png', name: 'OK콘 · 법등 해제', lines: ['법등 해제 후 자기 속성 스탬프 찍기'] },
    stampHalo: { img: 'img/icons/stamp-ok.png', name: 'OK콘 · 광배 해제', lines: ['광배 해제 후 자기 속성 스탬프 찍기'] },
    // 베르수시아
    mandate: { img: I('v-mandate'), name: '6속성의 법등', lines: ['해당 속성 보스 공격 UP', '주는 피해 상한: 400만에서 남은 법등 1개당 50만 DOWN', '해당 속성 파티가 파괴의 시련을 풀면 해제', '6속성을 모두 풀어야 파괴의 법등(게이지 상승 3배)도 사라짐'] },
    vtrial: { img: I('v-trial'), name: '파괴의 시련', lines: ['주는 피해 상한 100만 · 턴 종료 시 아군 HP 10% 감소 + 랜덤 약체 2개', '해제: 150hit + 오의 10회 (또는 10턴 경과)'] },
    destroy: { img: I('v-destroy'), name: '파괴의 신의 (빨강)', lines: ['보스 유리속성 추가 피해 · 아군 속성 컷 무시', '한 턴에 2만 이상 맞은 캐릭터 어빌 재사용 +2턴', '타화자재 조건: 공격 6회 미만이고 어빌 5회 미만'] },
    rebirth: { img: I('v-rebirth'), name: '재생의 신의 (파랑)', lines: ['보스 방어력 대폭 UP · 걸리는 약체 1턴 단축 (1턴 약체는 안 걸림)', '타화자재 조건: 50hit 미만이고 오의 6회 미만'] },
    gauge: { img: I('v-gauge'), name: '파괴의 힘 (제네시스 게이지)', lines: ['누가 턴을 넘길 때마다 +0.5% (파괴의 법등·광등 동안 +1.5%) · 전조 실패 시 +1%', 'G50(HP 51%)에 정토 · G100(HP 16%)에 정토(MAX)', 'G100 때 HP 50% 이상이거나 광등이 남아 있으면 전원 사망'] },
    halo: { img: I('v-halo'), name: '파괴의 광등', lines: ['제네시스 게이지 상승 가속', '6속성 광배를 모두 풀면 해제'] },
    wing: { img: I('v-wing'), name: '창세의 일익', lines: ['보스 공격·방어 UP · 주는 피해 증가', '통상공격이 파괴속성 + 파괴 추가 피해'] },
    k1: { img: I('v-k1'), name: '사왕천', lines: ['턴 종료시 전체공격 후 HP 20% × Lv 이하인 캐릭터 사망', '해제: 공격행동 5 / 6 / 7회 (Lv1 / 2 / 3)'] },
    k2: { img: I('v-k2'), name: '도리천', lines: ['통상공격시 Lv × 인원 수의 어빌 쿨타임 +2턴', '해제: 오의 4 / 5 / 6회 (Lv1 / 2 / 3)'] },
    k3: { img: I('v-k3'), name: '야마천', lines: ['통상공격시 랜덤디버프 × Lv 개 부여', '◆ Lv2부터 약체내성을 무시', '해제: 어빌 대미지 3000만 / 3500만 / 4000만 (Lv1 / 2 / 3)'] },
    k4: { img: I('v-k4'), name: '도솔천', lines: ['Lv에 비례해 순차적으로 2회 행동 / 파괴 대미지 / 3회 행동', '해제: TA 3 / 4 / 5회 (Lv1 / 2 / 3)'] },
    k5: { img: I('v-k5'), name: '화락천', lines: ['통상공격시 Lv에 비례해서 강해지는 랜덤타겟 무속성 대미지 5hit', '해제: 40 / 60 / 80hit (Lv1 / 2 / 3)'] }
  };

  // Debuffs the boss puts on the party. Written as {이름} in pattern text; shown as the in-game icon (img/icons/debuffs.webp,
  // 22px cells in this order; 소환 불가~부활 불가 added 2026-11-26) with the effect on hover. Effects from the gbf.wiki status tooltips.
  const DEBUFFS = {
    '강압': { i: 0, lines: ['회복 불가'] },
    '허탈': { i: 1, lines: ['매 턴 오의게이지 감소'] },
    '어빌 봉인': { i: 2, lines: ['어빌리티 사용 불가'] },
    '참격': { i: 3, lines: ['매 턴 HP 감소'] },
    '암흑': { i: 4, lines: ['공격이 가끔 빗나감'] },
    '언데드': { i: 5, lines: ['회복을 받으면 대신 피해'] },
    '마비': { i: 6, lines: ['공격 불가'] },
    '석화': { i: 7, lines: ['오의게이지가 차지 않음'] },
    '공격 DOWN': { i: 8, lines: ['공격력 감소'] },
    '방어 DOWN': { i: 9, lines: ['방어력 감소'] },
    '약체내성 DOWN': { i: 10, lines: ['약체 내성 감소'] },
    '부패': { i: 11, lines: ['매 턴 HP 감소'] },
    'DA DOWN': { i: 12, lines: ['더블어택 확률 감소'] },
    'TA DOWN': { i: 13, lines: ['트리플어택 확률 감소'] },
    '회복성능 DOWN': { i: 14, lines: ['회복 어빌의 회복량·상한 감소'] },
    '소환 불가': { i: 15, lines: ['소환석 사용 불가'] },
    '오의 봉인': { i: 16, lines: ['오의 사용 불가'] },
    '쇠약': { i: 17, lines: ['공격 불가'] },
    '가드 불가': { i: 18, lines: ['가드 사용 불가'] },
    '오의게이지 상승률 DOWN': { i: 19, lines: ['오의게이지 상승량 감소'] },
    '부활 불가': { i: 20, lines: ['전투불능이 되면 부활할 수 없음'] }
  };

  const BOSSES = [
    {
      id: 'tengen', name: '천원', full: '천원 · 여섯 빛깔의 이치', img: R('hexachromatic'),
      info: [['HP', '약 60억'], ['CT', '◇◇ · 전 구간 슬로우 면역']],
      opening: { icons: ['crucible', 'hplock'], lines: [
        '타속성 캐릭터 사망 (부활 불가)',
        '40% 이후에 들어오면 서브 포함 전원 사망',
        '100% / 80% / 60%에서 육룡 두 마리가 랜덤으로 등장함',
        '전조가 떠 있는 동안은 다음 구간으로 넘어가지 않음']},
      phases: [
        {
          range: '100 – 80%', tone: 'red', summary: '첫 구간',
          rows: [
            { hp: 100, at: '100%', kind: 'note', name: '육룡 두 마리 등장', cond: '오의 + 어빌 대미지 2000만', lines: ['두 용 속성 외 피해 30% 경감 · 약체내성 UP · 매 턴 약체 1개 회복'] },
            { hp: 100, kind: 'ct', name: '메토스 루제트 (100~40%)', cond: '2000만 대미지', lines: ['랜덤 무속성 6000 × 6 · {허탈} · {어빌 봉인}', '해제 시 랜덤 용 기운 Lv-1'] },
            { hp: 90, at: '90%', kind: 'hp', danger: true, name: '주홍의 불꽃 발톱 · 비취의 폭풍 날개', cond: '200만 이상 대미지 9회', icons: ['wilnas', 'ewiyar'], lines: ['전체 화/풍 10배 × 2 · {약체내성 DOWN}{오의게이지 상승률 DOWN}', '{@wilnas}{@ewiyar} Lv+2 (해제 시 각각 -1)'] },
            { hp: null, kind: 'special', when: '오의 피해 5천만 누적', name: '인텐시스 플레임', cond: '36hit', icons: ['wilnas'], lines: ['전체 화 15배 · {오의게이지 상승률 DOWN}', '해제 시 {@wilnas} Lv-3'] },
            { hp: null, kind: 'special', when: '어빌 피해 5천만 누적', name: '엑저스티브 콜랩스', cond: '오의 5회', icons: ['ewiyar'], lines: ['랜덤 풍 × 12 (총 36배) · {약체내성 DOWN}', '해제 시 {@ewiyar} Lv-3'] }
          ]
        },
        {
          range: '80 – 60%', tone: 'blue', summary: '둘째 구간',
          rows: [
            { hp: 80, at: '80%', kind: 'note', name: '육룡 두 마리 등장', cond: '오의 + 어빌 대미지 2000만', icons: ['crucible'], lines: ['두 용 속성 외 피해 30% 경감 · 약체내성 UP'] },
            { hp: 70, at: '70%', kind: 'hp', danger: true, name: '청람의 소용돌이 · 황금의 낙석', cond: '200만 이상 대미지 12회', icons: ['wamdus', 'galleon'], lines: ['전체 수/토 10배 × 2 · {공격 DOWN}{방어 DOWN}', '{@wamdus}{@galleon} Lv+2 (해제 시 각각 -1)'] },
            { hp: null, kind: 'special', when: '오의 피해 5천만 누적', name: '페로시아 트랙터', cond: 'TA 4회', icons: ['wamdus'], lines: ['랜덤 수 × 6 (총 40배) · {공격 DOWN}', '해제 시 {@wamdus} Lv-3'] },
            { hp: null, kind: 'special', when: '어빌 피해 5천만 누적', name: '천지를 뒤흔드는 진동', cond: '페이탈 체인', icons: ['galleon'], lines: ['전체 토 15배 · {방어 DOWN}', '해제 시 {@galleon} Lv-3'] }
          ]
        },
        {
          range: '60 – 40%', tone: 'yellow', summary: '셋째 구간',
          rows: [
            { hp: 60, at: '60%', kind: 'note', name: '육룡 두 마리 등장', cond: '오의 + 어빌 대미지 2000만', icons: ['crucible'], lines: ['두 용 속성 외 피해 30% 경감 · 약체내성 UP'] },
            { hp: 50, at: '50%', kind: 'hp', danger: true, name: '순백의 섬광 · 칠흑의 저주', cond: '200만 이상 대미지 15회', icons: ['luwoh', 'fediel'], lines: ['전체 광/암 10배 × 2 · {회복성능 DOWN}{DA DOWN}{TA DOWN}', '{@luwoh}{@fediel} Lv+2 (해제 시 각각 -1)'] },
            { hp: null, kind: 'special', when: '오의 피해 5천만 누적', name: '흩날리는 만 갈래 번개', cond: '어빌 5회', icons: ['luwoh'], lines: ['랜덤 광 × 4 (총 40배) · {DA DOWN}{TA DOWN}', '해제 시 {@luwoh} Lv-3'] },
            { hp: null, kind: 'special', when: '어빌 피해 5천만 누적', name: '네크로시스 스톰', cond: '약체 10회', icons: ['fediel'], lines: ['전체 암 15배 · {회복성능 DOWN}', '해제 시 {@fediel} Lv-3'] }
          ]
        },
        {
          range: '40 – 15%', tone: 'gray', summary: '하늘 용들의 시련 · 광륜',
          rows: [
            { hp: 40, at: '40%', kind: 'hp', danger: true, stamp: 'stamp', name: '비콜로르 리베라티오', cond: '해제 불가', icons: ['crucible', 'hplock'], lines: [
              '전체 6속성 × 6 + 무속성 ({@crucible} Lv × 3000) · 사망 시 {부활 불가}',
              '보스 약체 리셋',
              { head: '도가니 레벨별 보스 강화 (높을수록 누적)' },
              { k: 'Lv 1~4', v: '대미지 컷 무효' },
              { k: 'Lv 5~8', v: '+ 필중' },
              { k: 'Lv 9~12', v: '+ 약체 1턴 단축' },
              { k: 'Lv 13~16', v: '+ 방어 무시' },
              { k: 'Lv 17~20', v: '+ 재행동' },
              { head: '90·70·50% 전조를 못 푼 횟수별 추가' },
              { k: '1번 실패', v: '약체 개수 증가' },
              { k: '2번 실패', v: '60% 컷 무효' },
              { k: '3번 실패', v: '서브까지 HP 100% 무속성 피해' }] },
            { hp: null, kind: 'hp', when: '리베라티오 다음 턴', name: '하늘 용들의 시련', cond: '6턴 안에 TA 18회 또는 오의 18회', icons: ['skytrial', 'pearl1', 'pearl2', 'pearl3', 'pearl4', 'pearl5', 'pearl6'], lines: [
              '시련 동안 보스 공격 없음',
              '해제 시 자기 속성 구슬 해제', '시에테 등 강제 해제 X',
              '남은 구슬 1개 이상: 보스 공격 UP · 4개 이상: 방어 UP',
              '주는 피해 상한: 400만에서 남은 구슬 1개당 60만 DOWN'] },
            { hp: null, kind: 'note', name: '광륜 (시련이 끝난 뒤)', lines: [
              '{@crucible} Lv → 광륜 Lv (높을수록 보스 TA 확률·추가 피해 UP)',
              '보스 통상공격이 전체 공격 · 1hit마다 아군 강화를 광륜 Lv개 소거',
              '아군 어빌 6번마다 전체 무속성 2만 + {어빌 봉인} · 광륜 Lv-1'] },
            { hp: null, kind: 'ct', name: '40~15% (셋 중 랜덤)', lines: [
              { n: '엑세이저 라셀라티오', c: '디스펠 3회', e: '랜덤 수/암 8hit · {부패} · FC 게이지 -30%' },
              { n: '클레디스 루체아', c: '40hit', e: '랜덤 화/광 6hit · 아군 강화 전부 소거 · 맞은 캐릭터 {마비} · FC 게이지 -30%' },
              { n: '아트로피아 임페토스', c: '2500만 대미지', e: '전체 토/풍 10배 · 2명 어빌 슬로우·오의게이지 감소 · FC 게이지 -30%' }] }
          ]
        },
        {
          range: '15 – 0%', tone: 'dark', summary: '루프티스 연쇄',
          rows: [
            { hp: 15, at: '15%', when: '1번째', kind: 'hp', danger: true, name: '루프티스 알도레', cond: '페이탈 체인', icons: ['hplock'], lines: ['전체 화 60배 · {가드 불가}', '처리하면 HP가 15%보다 낮아질 수 있음 (해제·피격 모두)', '이후 매 턴 다음 전조 · 피격 시 통상공격 추가'] },
            { hp: null, when: '2번째', kind: 'hp', name: '트렌스', cond: '오의 대미지 2000만', lines: ['전체 수 60배 · {강압}'] },
            { hp: null, when: '3번째', kind: 'hp', name: '그라운드', cond: '어빌 대미지 2000만', lines: ['전체 토 60배 · {석화}'] },
            { hp: null, when: '4번째', kind: 'hp', name: '템페스타', cond: '약체 10회', lines: ['전체 풍 60배 · {소환 불가}'] },
            { hp: null, when: '5번째', kind: 'hp', name: '스프렌드', cond: '200만 이상 대미지 10회', lines: ['전체 광 60배 · {어빌 봉인}'] },
            { hp: null, when: '6번째', kind: 'hp', name: '테네브리스', cond: '페이탈 체인', lines: ['전체 암 60배 · {오의 봉인}'] },
            { hp: null, when: '마지막', kind: 'hp', danger: true, name: '라지오 엑제티움', cond: '해제 불가', lines: ['서브 포함 전원 사망 — 그 전에 끝내기'] }
          ]
        }
      ]
    },
    {
      id: 'lucizero', name: '루시제로', full: '다크 랩처 제로', img: R('lucizero'),
      info: [['HP', '약 80억'], ['통상', '랜덤 3hit × 1~3'], ['CT', '◇◇']],
      opening: { icons: [], lines: [
        '타속성 캐릭터 사망 (부활 불가)',
        '보스는 공격 DOWN·방어 DOWN 무효',
        '종말 카운트다운(디 엔드 게이지): 시간이 지나면 줄어듦 · 전조 실패 시 -1분 · 사망 시 최대치 -1분 (제1~6절 실패도 최대치 감소) · 0이 되면 전원 사망'],
        gauge: { label: '종말 카운트다운(디 엔드 게이지)', img: 'img/icons/the-end-gauge.png', title: '남은 칸별 보스 강화 (칸이 줄수록 누적)', levels: [
          { left: 6, color: '#ebe9e3', text: '강화 없음' },
          { left: 5, color: '#f2eac1', text: '추가 피해 1000' },
          { left: 4, color: '#fbea58', text: '추가 피해 2000 · 필중 · 속성 컷 무시' },
          { left: 3, color: '#fbcc50', text: '추가 피해 3000 · 아군 전체 랜덤 약체 2개' },
          { left: 2, color: '#f78c45', text: '추가 피해 4000 · 2회 행동 · 유리속성 피해' },
          { left: 1, color: '#e32751', text: '추가 피해 5000 · 방어 무시' }] } },
      phases: [
        {
          range: '100 – 81%', tone: 'red', summary: '사과 · 디 엔드',
          rows: [
            { hp: 100, at: '개막', kind: 'hp', danger: true, name: '파라다이스 로스트', icons: ['appleRed', 'appleBlue', 'appleYellow', 'appleGreen'], lines: [{ reset: '9분', start: true }, '전체 무속성 5만 + 사과 2개', '노란 사과 {@appleYellow}는 바로 해제'] },
            { hp: 100, when: '다음 턴', kind: 'hp', danger: true, name: '디 엔드', cond: '3000만 대미지', lines: ['해제 실패시 서브를 포함해 전원 사망'] },
            { hp: null, kind: 'ct', name: '100~81%', note: '포스포로스·이브리스 해제 시 확률로 테세라 전조', lines: [
              { n: '포스포로스', c: '약체 7회', e: '랜덤 5hit 20배 + 전체 6000 · {강압}{암흑}' },
              { n: '이브리스', c: '디스펠 2회', e: '랜덤 5hit 20배 + 전체 6000 · 보스 피해 컷·추가 피해' },
              { n: '테세라', c: '150만 이상 대미지 7회', e: '전체 30배 · 아군 강화 전부 소거 · 오의게이지 감소' }] },
            { hp: 95, at: '95%', kind: 'hp', name: '아키시온', cond: 'TA 4회', lines: ['전체 3hit 30배 · {허탈} · {DA DOWN}{TA DOWN}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '피크스', cond: '오의 대미지 2000만', lines: ['전체 30배 · {참격} · 2명 {쇠약}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '세피로트', cond: '어빌 대미지 1500만', lines: ['전체 12hit 24배 · 어빌 슬로우', '95% 셋 다 못 풀면 80%에서 파라다이스 로스트'] }
          ]
        },
        {
          range: '80 – 61%', tone: 'blue', summary: '자세 · 바니타스',
          rows: [
            { hp: 80, at: '80%', kind: 'hp', name: '오비탈 레조넌스', icons: ['repud', 'renun'], lines: [{ reset: '9분' }, '절대부정 / 영원거절 중 하나 → CT 기술이 바뀜', '건너뛰면 60%에서 파라다이스 로스트'] },
            { hp: null, when: '다음 턴부터 3연속', kind: 'note', name: '바니타스 3연속', lines: [
              '직전 턴에 가장 많이 준 피해 종류로 해제 조건이 정해짐',
              { n: '① 아키시온 바니타스', e: '랜덤 6hit 24배 · {강압}{암흑} · FC -30%' },
              { n: '② 피크스 바니타스', e: '전체 3hit 30배 · 오의게이지 감소 · 2명 어빌 슬로우 · FC -30%' },
              { n: '③ 세피로트 바니타스', e: '랜덤 12hit 24배 · {소환 불가} · FC -30%' }] },
            { hp: null, when: '통상', kind: 'hp', name: '통상공격·반격 위주일 때', lines: [
              { n: '① 아키시온', c: '100만 이상 대미지 10회' }, { n: '② 피크스', c: '약체 7회' }, { n: '③ 세피로트', c: '어빌 대미지 1500만' }] },
            { hp: null, when: '어빌', kind: 'hp', name: '어빌리티 위주일 때', lines: [
              { n: '① 아키시온', c: '오의 4회' }, { n: '② 피크스', c: 'TA 4회' }, { n: '③ 세피로트', c: '40hit' }] },
            { hp: null, when: '오의', kind: 'hp', name: '오의 위주일 때', lines: [
              { n: '① 아키시온', c: '40hit' }, { n: '② 피크스', c: '어빌 대미지 1500만' }, { n: '③ 세피로트', c: 'TA 4회' }] },
            { hp: null, when: '그 외', kind: 'hp', name: 'FC·체인 버스트·소환 위주일 때', lines: [
              { n: '① 아키시온', c: '어빌 대미지 15hit' }, { n: '② 피크스', c: '오의 4회' }, { n: '③ 세피로트', c: '40hit' }] },
            { hp: null, kind: 'ct', name: '80~61% (자세에 따라)', icons: ['repud', 'renun'], lines: [
              { n: '{@repud} 절대부정일 때', c: '오의 4회', e: '전체 3hit 24배 · {DA DOWN}{TA DOWN} · 2명 {마비} · FC -30% · 보스 추가 피해' },
              { n: '{@renun} 영원거절일 때', c: 'TA 3회', e: '전체 3hit 24배 · {DA DOWN}{TA DOWN} · 2명 {마비} · FC -30%' }] }
          ]
        },
        {
          range: '60 – 21%', tone: 'yellow', summary: '시련 1~6 (개인별)',
          rows: [
            { hp: 60, at: '60%', kind: 'hp', danger: true, stamp: 'stamp', name: '묵시록의 나팔', icons: ['appleRed', 'appleBlue', 'appleYellow', 'appleGreen'], lines: [
              { reset: '18분' },
              '전체 랜덤 12배 + 사과 2개 · 자세 삭제',
              '첫 진입자에 한해 보스 약체 리셋',
              '시련 1~6 개시 〈개인별〉 · 보스 통상공격이 전체 공격으로',
              'HP가 10%보다 낮아지지 않음 (20%에서 자기 속성 시련을 클리어하면 해제)'] },
            { hp: null, kind: 'ct', name: '60~21%', note: '포스포로스·이브리스 해제 시 확률로 테세라 전조', lines: [
              { n: '포스포로스', c: '약체 7회', e: '랜덤 5hit 20배 + 전체 6000 · {강압}{암흑}' },
              { n: '이브리스', c: '디스펠 2회', e: '랜덤 5hit 20배 + 전체 6000 · 보스 피해 컷·추가 피해' },
              { n: '테세라', c: '어빌 5회', e: '전체 30배 · 아군 강화 전부 소거 · 오의게이지 감소' }] },
            { hp: 55, at: '55%', kind: 'hp', name: '제1절', cond: '오의 5회', icons: ['t1'], lines: ['전체 120배 · {DA DOWN}{TA DOWN}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '제2절', cond: '공격행동 6회', icons: ['t2'], lines: ['랜덤 12hit 120배 · 보스 약체내성 UP'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '제3절', cond: '3500만 대미지', icons: ['t3'], lines: ['전체 3hit 120배 · {오의 봉인}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '제4절', cond: '약체 10회', icons: ['t4'], lines: ['전체 120배 · {어빌 봉인}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '제5절', cond: '페이탈 체인', icons: ['t5'], lines: ['랜덤 12hit 120배 · 보스 공격·방어 UP'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '제6절', cond: '60hit', icons: ['t6'], lines: ['전체 3hit 120배 · 보스 피해 경감 (50만)'] }
          ]
        },
        {
          range: '20 – 0%', tone: 'dark', summary: '시련 7~12 (공유)',
          rows: [
            { hp: 20, at: '20%', kind: 'hp', danger: true, stamp: 'stamp', name: '종말의 복음', icons: ['t7', 't8', 't9', 't10', 't11', 't12'], lines: [
              { reset: '9분' },
              '전체 무속성 1만 · 시련 7~12를 속성별로 배정 〈전원 공유〉',
              '주는 피해 상한: 남은 시련 6개면 100만 ~ 1개면 400만'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '안티바실레이아', cond: '66hit / 어빌 12회 / 오의 6회 중 뜬 조건', lines: [
              '전체 120배',
              '해제 시 해당 속성 시련과 HP 10% 하한 소거',
              '시에테 등 강제 해제 X',
              '못 풀면 다른 조건으로 재등장 (최대 2번)'] },
            { hp: null, kind: 'ct', name: '아키시온 아포칼립스 (20~0%)', cond: '페이탈 체인', lines: ['전체 3hit 30배 · {언데드}'] },
            { hp: 13, at: '13%', kind: 'hp', danger: true, name: '포스포로스 아포칼립스', cond: '9999만 9999 대미지', lines: ['전체 3hit 30배 · {강압} · 보스 피해 50% 컷'] },
            { hp: 6, at: '6%', kind: 'hp', danger: true, name: '이브리스 아포칼립스', cond: '99hit', lines: ['랜덤 5hit 20배 + 전체 6000 · 2명 {어빌 봉인} · 오의게이지 감소'] }
          ]
        }
      ]
    },
    {
      id: 'versusia', name: '베르수시아', full: '베르수시아 제네시스', img: R('versusia'),
      info: [['HP', '약 165억'], ['통상', '랜덤 속성 4hit'], ['CT', '◇◇']],
      opening: { icons: ['mandate', 'gauge'], lines: [
        '타속성 캐릭터 사망 (부활 불가)',
        '입장 시 전체 최대 HP 50% 파괴속성 피해',
        '누군가 법등을 푼 뒤에 들어오면 전원 사망 → 모두 먼저 입장',
        '파괴의 힘(제네시스 게이지): 누가 턴을 넘길 때마다 +0.5% (파괴의 법등·광등 동안 +1.5%) · 전조 실패 시 +1% → G50에 정토, G100에 정토(MAX)',
        '입장 시 파괴(빨강) / 재생(파랑) 팀 배정 (팀당 최대 3명) → 80%부터 팀별로 다른 전조',
        '디멘션 체인(DC): 같은 팀이 전조를 풀면 차오름 → 100%면 팀원마다 체인 스킬 1회']},
      phases: [
        {
          range: '100 – 81%', tone: 'red', summary: '파괴의 시련',
          rows: [
            { hp: 100, at: '개막', kind: 'hp', stamp: 'stampMandate', name: '파괴의 시련', cond: '150hit + 오의 10회', icons: ['vtrial', 'mandate'], lines: ['턴 종료 시 아군 HP 10% 감소 + 랜덤 약체 2개', '해제 시 자기 속성 법등 해제', '시에테 등 강제 해제 X'] },
            { hp: null, kind: 'ct', name: '100~81%', lines: [
              { n: '신광', c: '약체 10회', e: '전체 30배 · FC -30% · 보스 어빌·오의 피해 70% 컷' },
              { n: '윤회', c: '50hit', e: '랜덤 6hit 60배 · {공격 DOWN}{방어 DOWN} · 보스 유리속성 추가 피해' }] },
            { hp: 90, at: '90%', kind: 'hp', danger: true, name: '신광', cond: '9999만 9999 대미지', lines: ['전체 30배 · FC -30% · 보스 어빌·오의 피해 컷', '신광·윤회를 못 풀면 다음 전조 없음'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '윤회', cond: '오의 6회', lines: ['랜덤 6hit 60배 · {공격 DOWN}{방어 DOWN}'] },
            { hp: null, when: '다음 턴', kind: 'hp', name: '황천', cond: '80hit + 페이탈 체인', lines: ['전체 10hit 40배 · {강압}{참격} · 강화 5턴 단축'] }
          ]
        },
        {
          range: '80% – 형태 변화', tone: 'blue', summary: '파랑 / 빨강 루트',
          rows: [
            { hp: 80, at: '80%', kind: 'note', name: '루트 갈림 — 타화자재 주의', icons: ['rebirth', 'destroy'], lines: [
              '자기 팀 색에 따라 재생(파랑) / 파괴(빨강) 신의',
              '매 턴 아래를 못 채우면 타화자재 (해제 조건 증가 · 보스 필중 · 특수기 후 추가 피해)',
              { k: '파랑', v: '50hit 또는 오의 6회 + 일정 피해' },
              { k: '빨강', v: '공격 6회 또는 어빌 5회 + 일정 피해' },
              '①·②를 못 풀면 다음 전조 없음'] },
            { hp: 70, at: '70%', kind: 'route-b', name: '파랑 루트', icons: ['rebirth'], lines: [
              { n: '① 신광', c: '어빌 6회', t: '어빌 7회', e: '전체 30배 · FC -30% · 보스 어빌·오의 피해 70% 컷' },
              { n: '② 무상', c: '디스펠 5회 + 공격 5회', t: '디스펠 6회 + 공격 6회', e: '랜덤 4hit 60배 · {DA DOWN}{TA DOWN}{회복성능 DOWN}' },
              { n: '③ 황천', c: '50hit + 300만 이상 대미지 5회', t: '70hit + 300만 이상 대미지 7회', e: '전체 10hit 40배 · {강압}{참격}' },
              { ct: '80% ~ G50' },
              { n: '신광', c: '약체 15회 + TA 4회', t: '약체 18회 + TA 5회', e: '전체 30배 · FC -30% · 보스 어빌·오의 피해 70% 컷' },
              { n: '무상', c: '디스펠 5회 + 200만 이상 대미지 7회', t: '디스펠 6회 + 200만 이상 대미지 8회', e: '랜덤 4hit 60배 · {DA DOWN}{TA DOWN}{회복성능 DOWN}' }] },
            { hp: null, kind: 'route-r', name: '빨강 루트', icons: ['destroy'], lines: [
              { n: '① 천개', c: '오의 5회', t: '오의 6회', e: '전체 2hit 24배 · 오의게이지 크게 감소 · 보스 추가 피해' },
              { n: '② 윤회', c: 'TA 4회 + 디스펠 3회', t: 'TA 5회 + 디스펠 4회', e: '랜덤 6hit 60배 · {공격 DOWN}{방어 DOWN}' },
              { n: '③ 황천', c: '800만 이상 대미지 3회 + 페이탈 체인', t: '800만 이상 대미지 5회 + 페이탈 체인', e: '전체 10hit 40배 · {강압}{참격}' },
              { ct: '80% ~ G50' },
              { n: '윤회', c: '50hit + 약체 12회', t: '60hit + 약체 15회', e: '랜덤 6hit 60배 · {공격 DOWN}{방어 DOWN}' },
              { n: '천개', c: '오의 5회 + 대미지 어빌 3회', t: '오의 6회 + 대미지 어빌 4회', e: '전체 2hit 24배 · 오의게이지 크게 감소 · 보스 추가 피해' }] }
          ]
        },
        {
          range: '형태 변화 – G100', tone: 'yellow', summary: 'G50 정토 · 광배 · 사왕천 등',
          rows: [
            { hp: 51, at: 'G50', kind: 'hp', danger: true, stamp: 'stamp', name: '정토 (G50 또는 HP 51%)', cond: '어빌 대미지 3000만 + 오의 대미지 3000만 + 어빌 12회', icons: ['gauge'], lines: [
              '피격 시 주인공 외 전열 캐릭터 전원 사망',
              '처리 후 신의·타화자재·남은 법등 소멸',
              'HP가 15%보다 낮아지지 않음 (G100 정토에서 해제)'] },
            { hp: null, when: '정토 처리 후', kind: 'note', name: '상시 효과 변화', icons: ['halo', 'k1', 'k2', 'k3', 'k4', 'k5'], lines: [
              '보스 약체 리셋 · 파괴의 광등 + 6속성 광배',
              '턴 종료 시 사왕천~화락천 중 하나 랜덤 부여 · 못 풀면 매 턴 Lv+1 (최대 3)',
              'Lv2 이상일때 -천을 해제하면 그 턴엔 추가로 생기지 않으며 베르수시아의 스테이터스가 감소',
              'Lv2 이상이 남거나 그 턴 피해 5000만 미만이면 타화자재'] },
            { hp: null, kind: 'hp', stamp: 'stampHalo', name: '6속성의 광배', cond: '전조 한 개 해제', icons: ['halo'], lines: ['자기 속성 파티가 전조 하나 해제 → 자기 속성 광배 해제', '남아 있으면 게이지 상승 가속'] },
            { hp: null, kind: 'ct', name: 'G50 ~ G100', lines: [
              { n: '정토', c: '디스펠 5회 + 페이탈 체인', t: '디스펠 6회 + 페이탈 체인', e: '전체 16hit 48배 · {강압}{참격} · 강화 5턴 단축' },
              { n: '무상', c: '약체 15회 + 300만 이상 대미지 8회', t: '약체 18회 + 300만 이상 대미지 10회', e: '랜덤 4hit 80배 · 보스 어빌·오의 피해 70% 컷' },
              { n: '천개', c: '800만 이상 대미지 3회 + 약체 어빌 2회', t: '800만 이상 대미지 5회 + 약체 어빌 3회', e: '전체 2hit 30배 · 오의게이지 크게 감소 · FC -30%' }] }
          ]
        },
        {
          range: 'G100 – 0', tone: 'dark', summary: '정토(MAX) · 신격',
          rows: [
            { hp: 20, at: 'G100', kind: 'hp', danger: true, name: '정토 (G100 또는 HP 16%)', icons: ['gauge', 'wing'], lines: [
              '전체 랜덤 속성 16hit 64배',
              'HP 15% 하한·사왕천 등·타화자재 해제 · 창세의 일익 · 피해 컷 무효',
              '이때 HP 50% 이상이거나 광등이 남아 있으면 전원 사망',
              '진입에 방어 DC를 사용하는 걸 고려'] },
            { hp: null, when: '다음 턴부터 5턴', danger: true, kind: 'hp', name: '신격 1주차', lines: [
              '해제 실패시 서브를 포함해 전원 사망',
              '다섯 전조가 한 턴씩 랜덤 순서로',
              { c: '120hit' }, { c: '1억 대미지' }, { c: '600만 이상 대미지 5회' }, { c: '디스펠 6회' }, { c: '약체 15회' }] },
            { hp: null, when: '그다음 5턴', danger: true, kind: 'hp', name: '신격 2주차', lines: [
              '3주차도 같은 폭으로 증가',
              { c: '240hit' }, { c: '2억 대미지' }, { c: '600만 이상 대미지 10회' }, { c: '디스펠 12회' }, { c: '약체 30회' }] }
          ]
        }
      ]
    }
  ];

  const data = { ICONS, DEBUFFS, BOSSES };
  root.GBF_PATTERN_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
