# 부동산 수익률 계산기 — 프로젝트 가이드

## 프로젝트 개요

부동산 임대 수익률 및 경매 투자 수익률을 계산하는 **PWA(Progressive Web App)**.
GitHub Pages로 배포되어 PC/Android/iOS에서 앱으로 설치해 오프라인에서도 사용 가능.

- **저장소**: `C:\claude\test\calculator` (GitHub에 연결됨)
- **GitHub Pages URL**: `https://gkgjswn1119.github.io/calculator/` (또는 repo 설정에서 확인)
- **배포 방식**: `git push` → GitHub Pages 자동 배포 (별도 CI/CD 없음)
- **로컬 테스트**: `시작.bat` 더블클릭 → Python HTTP 서버 (`localhost:8000`)

---

## 파일 구조

```
calculator/
├── index.html      ← SPA 전체 (3개 탭 HTML 포함)
├── app.js          ← 모든 JS 로직
├── style.css       ← 모든 CSS
├── manifest.json   ← PWA 설정
├── sw.js           ← 서비스 워커 (오프라인 캐시)
├── icons/
│   ├── icon.svg
│   └── icon-maskable.svg
├── 시작.bat        ← 로컬 서버 실행 (Windows)
└── 시작.ps1        ← 로컬 서버 스크립트
```

빌드 도구 없음. 프레임워크 없음. 순수 Vanilla JS/HTML/CSS.

---

## 현재 탭 구성

| 탭 버튼 텍스트 | `data-tab` 값 | 페이지 ID | ID 접두사 | 용도 |
|---|---|---|---|---|
| 수익률 계산기 | `calc` | `page-calc` | (없음) | 임대 수익률, 적정매가 역산 |
| 면적별 분석 | `graph` | `page-graph` | `g-` | 면적별 수익률 테이블 + 차트 |
| 상가 수익률 계산 | `commercial` | `page-commercial` | `c-` | 경매 낙찰 → 상가 투자 ROE 계산 |
| 경매 시나리오 | `auction` | `page-auction` | `s-` | 취득→공실→임대→매도 전 과정 최종수익 |

---

## 탭 시스템 동작 원리

### HTML 구조

```html
<!-- 네비게이션 -->
<nav class="tab-bar">
  <button class="tab active" data-tab="calc">수익률 계산기</button>
  <button class="tab" data-tab="graph">면적별 분석</button>
  <button class="tab" data-tab="commercial">상가 수익률 계산</button>
  <button class="tab" data-tab="auction">경매 시나리오</button>
</nav>

<!-- 각 탭 페이지 -->
<div id="page-calc" class="page">...</div>
<div id="page-graph" class="page" style="display:none">...</div>
<div id="page-commercial" class="page" style="display:none">...</div>
<div id="page-auction" class="page" style="display:none">...</div>
```

### JS 탭 전환 로직 (app.js)

```js
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', function () {
    const target = this.dataset.tab;
    // 각 탭 페이지를 show/hide
    document.getElementById('page-calc').style.display       = target === 'calc'       ? '' : 'none';
    document.getElementById('page-graph').style.display      = target === 'graph'      ? '' : 'none';
    document.getElementById('page-commercial').style.display = target === 'commercial' ? '' : 'none';
    document.getElementById('page-auction').style.display    = target === 'auction'    ? '' : 'none';
    // 탭 진입 시 계산 실행
    if (target === 'commercial') calcCommercial();
    if (target === 'auction') calcAuction();
  });
});
```

**새 탭을 추가할 때 반드시 이 블록도 수정**해야 함.

---

## 각 탭 계산 로직 요약

### 탭 1: 수익률 계산 (`main`)

입력: 면적(평), 월 임대료(원), 보증금(원), 매매가(원)

- **수익률 모드**: `(월임대료 × 12) / (매매가 − 보증금) × 100`
- **적정매가 역산**: 목표 수익률 입력 → 매매가 계산
- 임대료 ↔ 평당임대료 양방향 연동
- 보증금 자동 채움: 임대료 × 100 (사용자가 비워둔 경우)

### 탭 2: 면적별 분석 (`area`)

입력: 평당 임대료(원), 목표 수익률(%), 보증금 배율

- 면적 범위(10~100평)를 1평 단위로 테이블 생성
- Chart.js 라인 차트로 수익률 시각화

### 탭 3: 상가 수익률 계산 (`commercial`)

입력: 감정가, 최저가, 낙찰가, 보증금, 월 임대료, 대출 유형, 금리, 각종 비용

주요 계산 흐름:

```
공정가치    = (월임대료 × 12) / 시장수익률 + 보증금   (시장수익률 > 0 일 때)
취득비용    = 낙찰가 × 0.05
대출한도
  2금융권   = MIN(낙찰가×0.9, 감정가×0.8, 공정가치×0.8)   [0인 항 제외]
  1금융권   = MIN(낙찰가×0.8, 감정가×0.7, 공정가치×0.7, 낙찰가²/감정가)   [0인 항 제외]
연이자      = 대출 × 이자율
월현금흐름  = 월임대료 − 연이자/12 − 월관리비예비
실투자금    = 낙찰가 + 취득비용 − 대출 + 명도비 + 인테리어 + 미납관리비 + 예비비 − 보증금
ROE         = (월현금흐름 × 12) / 실투자금
매각차익    = 공정가치 − 실투자금 − 보증금 − 대출
```

ROE 색상: 양수 → 초록(`#059669`, `.c-pos`), 음수 → 빨강(`.c-neg`)

### 탭 4: 경매 시나리오 (`auction`)

원본 `계산기.xlsx`(Sheet1 A1:F26)를 1:1 이식한 탭. 명세서는 `Downloads/계산기_명세서.md`.

입력(물건 예시값은 전부 공란 시작): 평수·낙찰가·취득비율·평당명도비·평당철거비·미납관리비·**추가지출**·감정가·평당관리비·공실개월수·보증금·월임대료·매매수익률·양도세율·보유개월수. 대출은 단일 입력이 아니라 **대출 방식 선택**(1금융권/2금융권/직접입력) — 기존 상가 탭과 동일. 1·2금융권은 금리만 입력하면 대출금이 자동 산출되고, 직접입력은 대출 가능액·금리를 직접 넣는다. (대출 방식·금리 기본값은 상가 탭과 동일: 2금융권 / 4.5·5·5%)

수식 17개 — `app.js`의 `calcAuction()`에 엑셀 셀 번호가 주석으로 병기되어 있음:

```
취득비(B3)      = 낙찰가 × 취득비율
명도비(B5)      = 평당명도비 × 평수
철거비(B7)      = 평당철거비 × 평수
대출            = 상가 탭과 동일한 한도식(아래) 또는 직접입력값
  1금융권       = MIN(낙찰가×80%, 감정가×70%, 시세가치×70%, 낙찰가²÷감정가)  [0 항 제외]
  2금융권       = MIN(낙찰가×90%, 감정가×80%, 시세가치×80%)                 [0 항 제외]
  시세가치      = 매도가(B18) = (월임대료 × 12 / 매매수익률) + 보증금
연이자(B9)      = 대출(산출값) × 금리
월이자(B10)     = 연이자 / 12
월관리비(B12)   = 평당관리비 × 평수
월지출(B16)     = 월이자 + 월관리비
공실기간지출(B17) = 월지출 × 공실개월수
매도가(B18)     = (월임대료 × 12 / 매매수익률) + 보증금
임대후월수입(B19) = 월임대료 − 월이자
양도세(B20)     = (매도가 − (낙찰가 + 취득비)) × 양도세율
취득시점필요(B21) = 낙찰가 − 대출 + 취득비 + 명도비 + 철거비 + 미납관리비 + 추가지출
공실기간필요(B22) = B21의 항목 전부 + 공실기간지출
임대계약시점필요(B23) = B22 − 보증금
임대후수익(B24) = 임대후월수입 × 보유개월수
매도시점수익(B25) = 매도가 − 양도세 − 대출
최종수익(B26)   = 매도시점수익 − B22 + 임대후수익
```

**⚠️ 원본 엑셀의 의도적 특성 — 임의로 "고치지 말 것"**:

1. 임대후월수입(B19)에 관리비 미차감 — 임차인 부담 가정. 공실 시 월지출(B16)에는 포함됨
2. 매도시점수익(B25)에서 보증금 반환 미차감 — 매수자 승계 가정(그래서 B18에 보증금을 더함)
3. 양도세 취득원가 = 낙찰가 + 취득비만. 명도비·철거비·미납관리비 불인정
4. 월이자는 `연이자/12` 2단계 구조 유지
5. B22는 B21을 참조하지 않고 항목을 재나열
6. 대출은 단순 거치식(원금 상환 없음)

유일한 방어적 변경: 매매수익률 0/공란 시 원본은 `#DIV/0!`이지만 여기선 매도가·양도세·매도시점수익·최종수익을 `-`로 표시.

**원본 엑셀과 다른 점 (사용자 요청으로 변경됨)**:
- 감정가: 원본은 어떤 수식에도 미참조(참고값)였으나, 이 탭에서는 **대출 한도 산출에 사용**한다.
- 대출: 원본은 단일 입력이었으나, **대출 방식 선택(1/2금융권/직접입력)으로 자동 산출**한다(상가 탭과 동일).
- 추가지출: 원본에 없던 입력. **취득시점 필요(B21)·공실기간 필요(B22)에 가산**되어 최종수익까지 반영된다.

화면 구성: 최종수익 히어로 → 필요현금 타임라인 → 공통계수(평수) → 단계 카드 5개(취득·금융·공실·임대·매도). 각 단계 카드는 좌측 입력 / 우측 결과 2열.

---

## 코딩 컨벤션

### ID 네임스페이싱

기존 탭 ID와 충돌 방지를 위해 **각 탭마다 고유 접두사** 사용:
- `calc` 탭: 접두사 없음 (예: `area`, `rent`, `deposit`)
- `graph` 탭: `g-` 접두사 (예: `g-rpp`, `g-yield`)
- `commercial` 탭: `c-` 접두사 (예: `c-appraised`, `c-bid`, `c-roe`)
- `auction` 탭: `s-` 접두사 (예: `s-bid`, `s-final-profit`)

새 탭 추가 시 충돌하지 않는 접두사 하나 정해서 모든 ID에 적용.

### 숫자 입력 필드 패턴

**금액 필드** (원 단위): `applyCommaFormat(el)` 함수로 천 단위 콤마 자동 포맷

```js
// 등록 방법
const C_MONEY_IDS = ['c-appraised', 'c-bid', /* ... */];
C_MONEY_IDS.forEach(id => applyCommaFormat(document.getElementById(id)));

// applyCommaFormat 구현 (기존 코드 그대로 재활용)
function applyCommaFormat(el) {
  el.addEventListener('input', function () {
    const digits = this.value.replace(/[^0-9]/g, '');
    if (digits === '') { this.value = ''; return; }
    this.value = parseInt(digits, 10).toLocaleString('ko-KR');
  });
}
```

**퍼센트 필드**: 사용자는 `6` 입력 → 코드에서 `/100` 해서 `0.06`으로 사용.
콤마 포맷 적용 안 함. `<input type="number" step="0.1">` 사용.

### 자동 계산

버튼 없이 **입력 이벤트마다 자동 계산**. 모든 input에 이벤트 리스너 등록:

```js
C_ALL_INPUT_IDS.forEach(id => {
  document.getElementById(id)?.addEventListener('input', calcCommercial);
});
```

### CSS 클래스 네임스페이싱

새 탭의 CSS 클래스도 접두사로 구분. `commercial` 탭 예시:
`.c-result-card`, `.c-hero-grid`, `.c-hero-value`, `.c-pos`, `.c-neg`

---

## PWA 설정

### manifest.json

```json
{
  "name": "부동산 수익률 계산기",
  "short_name": "수익률계산기",
  "start_url": "./index.html",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#2563EB",
  "background_color": "#EFF2F7"
}
```

`start_url`은 반드시 `./index.html` (상대 경로) — GitHub Pages 하위 경로에서도 동작.

### 서비스 워커 (sw.js)

오프라인 사용을 위해 주요 파일을 캐시. **배포할 때마다 캐시 버전 번호 올려야 함**:

```js
const CACHE = 'real-estate-calc-v4';  // ← 배포마다 v5, v6... 증가
```

버전을 올리지 않으면 모바일 PWA가 이전 버전 캐시를 계속 사용함.

---

## 배포 절차

### 일반 배포 (코드 변경 후)

```bash
# 1. sw.js 캐시 버전 증가 (real-estate-calc-vN → vN+1)
# 2. 커밋 & 푸시
git add index.html app.js style.css sw.js
git commit -m "변경 내용 요약"
git push origin master
```

GitHub Pages가 자동으로 배포함. 보통 1~2분 소요.

### 롤백 포인트 (git tag)

중요한 작업 전에 태그 생성:

```bash
git tag pre-작업명
git push origin pre-작업명
```

롤백 시:

```bash
git checkout pre-작업명   # 확인용
git reset --hard pre-작업명   # 실제 롤백 (신중히)
```

현재 태그:
- `pre-commercial-tab`: 상가 수익률 계산 탭 추가 직전 상태
- `pre-auction-tab`: 경매 시나리오 탭 추가 직전 상태 (로컬에만 존재, 미푸시)

---

## 앱 설치 방법 (사용자 안내)

### PC (Chrome / Edge)
1. GitHub Pages URL 접속
2. 주소창 오른쪽 설치 아이콘(⊞) 클릭 → "설치"
3. 이후 독립 창으로 실행됨

### Android (Chrome)
1. GitHub Pages URL 접속
2. 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"

### iOS (Safari)
1. GitHub Pages URL 접속 (**Safari만 가능**, Chrome 불가)
2. 하단 공유 버튼(□↑) → "홈 화면에 추가"

---

## 새 계산기 탭 추가하는 방법

다음 순서로 진행:

### 1. 롤백 태그 생성
```bash
git tag pre-새탭이름
git push origin pre-새탭이름
```

### 2. index.html — 탭 버튼 추가
```html
<button class="tab" data-tab="newtab">새 계산기</button>
```

### 3. index.html — 탭 페이지 추가
모든 input ID에 고유 접두사(`n-` 등) 사용.
Chart.js 쓰는 경우 `<script src="...chart.js">` 태그 뒤에 배치.

```html
<section id="page-newtab" style="display:none">
  <!-- 입력 카드 -->
  <!-- 결과 카드 -->
</section>
```

### 4. app.js — 탭 전환 블록에 한 줄 추가
```js
document.getElementById('page-newtab').style.display = target === 'newtab' ? '' : 'none';
if (target === 'newtab') calcNewTab();
```

### 5. app.js — 계산 함수 블록 추가
`renderResult` 함수 앞에 삽입. 패턴:
```js
// ── 새 계산기 탭 ──────────────────────────────────────────────────────────────
const N_MONEY_IDS = ['n-field1', 'n-field2'];
N_MONEY_IDS.forEach(id => applyCommaFormat(document.getElementById(id)));

function nFromId(id) { /* 필드 값 읽기 */ }

function calcNewTab() { /* 계산 로직 */ }
function resetNewTab() { /* 초기화 */ }

document.querySelectorAll('#page-newtab input, #page-newtab select')
  .forEach(el => el.addEventListener('input', calcNewTab));
```

### 6. style.css — 새 클래스 추가
파일 맨 끝에 추가. 클래스에 고유 접두사 사용.

### 7. sw.js — 캐시 버전 증가
```js
const CACHE = 'real-estate-calc-vN+1';
```

### 8. 배포
```bash
git add index.html app.js style.css sw.js
git commit -m "Add 새 계산기 탭"
git push origin master
```

---

## 로컬 테스트

```
시작.bat 더블클릭
→ http://localhost:8000 (PC)
→ http://[로컬IP]:8000 (같은 WiFi의 폰)
```

**주의**: 로컬 서버는 임시 테스트용. 실제 앱 배포는 GitHub Pages.
PWA 설치는 반드시 GitHub Pages HTTPS URL에서 해야 함.

---

## 주의사항 & 과거 이슈

- **탭 ID 충돌**: 기존 탭과 같은 ID 쓰면 JS/CSS가 엉킴 → 접두사 필수
- **서비스 워커 캐시**: 버전 안 올리면 모바일에서 업데이트 안 됨
- **CSS 탭 버튼**: 4개 탭이 한 줄에 들어가도록 font-size 12px, padding 11px 4px, `word-break:keep-all` 적용됨 — 탭 버튼 텍스트 너무 길면 레이아웃 깨질 수 있음. 5번째 탭을 추가하려면 `.tab-bar`를 가로 스크롤(`overflow-x:auto`)로 전환하는 게 낫다
- **`start_url` 절대경로 금지**: GitHub Pages 하위 경로 배포 시 절대경로 `/index.html`이면 404
