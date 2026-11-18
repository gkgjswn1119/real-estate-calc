'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let depositAutoFilled = false;
let isUpdatingRent = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const areaEl         = document.getElementById('area');
const rentEl         = document.getElementById('rent');
const rppEl          = document.getElementById('rentPerPyeong');
const depositEl      = document.getElementById('deposit');
const salePriceEl    = document.getElementById('salePrice');
const yieldRateEl    = document.getElementById('yieldRate');
const errorMsg       = document.getElementById('errorMessage');
const depositHint    = document.getElementById('depositHint');
const resultCard     = document.getElementById('resultCard');
const btnSalePrice   = document.getElementById('btnSalePrice');
const btnYield       = document.getElementById('btnYield');

// ── Number helpers ────────────────────────────────────────────────────────────
function toComma(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  return Math.round(num).toLocaleString('ko-KR');
}

function fromField(el) {
  const raw = el.value.replace(/,/g, '').trim();
  if (raw === '') return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

// ── Comma-format integer input fields ─────────────────────────────────────────
function applyCommaFormat(el) {
  el.addEventListener('input', function () {
    const digits = this.value.replace(/[^0-9]/g, '');
    if (digits === '') { this.value = ''; return; }
    this.value = parseInt(digits, 10).toLocaleString('ko-KR');
  });
}

applyCommaFormat(rentEl);
applyCommaFormat(rppEl);
applyCommaFormat(depositEl);
applyCommaFormat(salePriceEl);

// ── Bidirectional: 임대료 ↔ 평당 임대료 ──────────────────────────────────────
rentEl.addEventListener('input', function () {
  if (isUpdatingRent) return;
  isUpdatingRent = true;
  const rent = fromField(this);
  const area = fromField(areaEl);
  if (rent !== null && area !== null && area > 0) {
    rppEl.value = toComma(rent / area);
  } else if (rent === null) {
    rppEl.value = '';
  }
  autoFillDeposit();
  isUpdatingRent = false;
});

rppEl.addEventListener('input', function () {
  if (isUpdatingRent) return;
  isUpdatingRent = true;
  const rpp = fromField(this);
  const area = fromField(areaEl);
  if (rpp !== null && area !== null && area > 0) {
    rentEl.value = toComma(rpp * area);
  } else if (rpp === null) {
    rentEl.value = '';
  }
  autoFillDeposit();
  isUpdatingRent = false;
});

areaEl.addEventListener('input', function () {
  const area = fromField(this);
  const rent = fromField(rentEl);
  const rpp  = fromField(rppEl);
  isUpdatingRent = true;
  if (area !== null && area > 0) {
    if (rent !== null) {
      rppEl.value = toComma(rent / area);
    } else if (rpp !== null) {
      rentEl.value = toComma(rpp * area);
    }
  }
  isUpdatingRent = false;
  autoFillDeposit();
});

// ── Deposit auto-fill (임대료 × 16) ───────────────────────────────────────────
function autoFillDeposit() {
  const rent = fromField(rentEl);
  if (rent !== null && rent > 0) {
    if (!depositEl.value || depositAutoFilled) {
      depositEl.value = toComma(rent * 16);
      depositAutoFilled = true;
      depositHint.textContent = '임대료 × 16 자동 입력됨';
    }
  } else {
    if (depositAutoFilled) {
      depositEl.value = '';
      depositAutoFilled = false;
      depositHint.textContent = '';
    }
  }
}

depositEl.addEventListener('input', function () {
  depositAutoFilled = false;
  depositHint.textContent = '';
});

// ── Error helpers ─────────────────────────────────────────────────────────────
function clearErrors() {
  document.querySelectorAll('.input-wrapper.error').forEach(w => w.classList.remove('error'));
  errorMsg.textContent = '';
}

function showError(msg, ...wrapIds) {
  errorMsg.textContent = msg;
  wrapIds.forEach(id => {
    const w = document.getElementById('wrap-' + id);
    if (w) w.classList.add('error');
  });
}

[areaEl, rentEl, rppEl, depositEl, salePriceEl, yieldRateEl].forEach(el => {
  el.addEventListener('input', clearErrors);
});

// ── 매매가 기준 ───────────────────────────────────────────────────────────────
function calcBySalePrice() {
  clearErrors();

  const area      = fromField(areaEl);
  const rent      = fromField(rentEl);
  const deposit   = fromField(depositEl);
  const salePrice = fromField(salePriceEl);

  if (!area || area <= 0)      return showError('전용면적을 입력해주세요.', 'area');
  if (!rent || rent <= 0)      return showError('임대료를 입력해주세요.', 'rent', 'rentPerPyeong');
  if (deposit === null)         return showError('보증금을 입력해주세요.', 'deposit');
  if (!salePrice || salePrice <= 0) return showError('매매가를 입력해주세요.', 'salePrice');
  if (salePrice <= deposit)    return showError('매매가는 보증금보다 커야 합니다.', 'salePrice', 'deposit');

  const yieldCalc      = ((rent * 12) / (salePrice - deposit)) * 100;
  const pricePerPyeong = salePrice / area;

  setActiveBtn('salePrice');
  renderResult({
    pricePerPyeong : Math.round(pricePerPyeong),
    salePrice      : Math.round(salePrice),
    yieldRate      : yieldCalc.toFixed(2),
    mode           : '매매가 기준',
  });
}

// ── 수익률 기준 ───────────────────────────────────────────────────────────────
function calcByYield() {
  clearErrors();

  const area      = fromField(areaEl);
  const rent      = fromField(rentEl);
  const deposit   = fromField(depositEl);
  const yieldRate = fromField(yieldRateEl);

  if (!area || area <= 0)       return showError('전용면적을 입력해주세요.', 'area');
  if (!rent || rent <= 0)       return showError('임대료를 입력해주세요.', 'rent', 'rentPerPyeong');
  if (deposit === null)          return showError('보증금을 입력해주세요.', 'deposit');
  if (!yieldRate || yieldRate <= 0) return showError('수익률을 입력해주세요.', 'yieldRate');

  const calcSalePrice  = Math.round(((rent * 12) / (yieldRate / 100)) + deposit);
  const pricePerPyeong = calcSalePrice / area;

  setActiveBtn('yield');
  renderResult({
    pricePerPyeong : Math.round(pricePerPyeong),
    salePrice      : calcSalePrice,
    yieldRate      : parseFloat(yieldRateEl.value.replace(/,/g, '')).toFixed(2),
    mode           : '수익률 기준',
  });
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function resetAll() {
  [areaEl, rentEl, rppEl, depositEl, salePriceEl, yieldRateEl].forEach(el => {
    el.value = '';
  });
  clearErrors();
  depositAutoFilled = false;
  depositHint.textContent = '';
  resultCard.style.display = 'none';
  btnSalePrice.classList.remove('btn-active');
  btnYield.classList.remove('btn-active');
}

// ── Render helpers ────────────────────────────────────────────────────────────
function setActiveBtn(mode) {
  btnSalePrice.classList.toggle('btn-active', mode === 'salePrice');
  btnYield.classList.toggle('btn-active', mode === 'yield');
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
    const target = this.dataset.tab;
    document.getElementById('page-calc').style.display       = target === 'calc'       ? '' : 'none';
    document.getElementById('page-graph').style.display      = target === 'graph'      ? '' : 'none';
    document.getElementById('page-commercial').style.display = target === 'commercial' ? '' : 'none';
    if (target === 'commercial') calcCommercial();
  });
});

// ── Graph page ────────────────────────────────────────────────────────────────
applyCommaFormat(document.getElementById('g-rpp'));

const AREAS = Array.from({ length: 17 }, (_, i) => 10 + i * 5); // 10, 15, … 90
let chartInstance = null;

function calcGraph() {
  const rppEl   = document.getElementById('g-rpp');
  const yldEl   = document.getElementById('g-yield');
  const errorEl = document.getElementById('g-error');

  ['g-rpp', 'g-yield'].forEach(id => {
    document.getElementById('wrap-' + id)?.classList.remove('error');
  });
  errorEl.textContent = '';

  const rpp     = fromField(rppEl);
  const yldRate = fromField(yldEl);

  if (!rpp || rpp <= 0) {
    errorEl.textContent = '평당 임대료를 입력해주세요.';
    document.getElementById('wrap-g-rpp').classList.add('error');
    return;
  }
  if (!yldRate || yldRate <= 0) {
    errorEl.textContent = '수익률을 입력해주세요.';
    document.getElementById('wrap-g-yield').classList.add('error');
    return;
  }

  // 평당 매매가 = 평당임대료 × (1200/수익률 + 16)
  const ppp    = rpp * (1200 / yldRate + 16);
  const totals = AREAS.map(a => Math.round(a * ppp));

  document.getElementById('g-ppp-value').textContent = toComma(Math.round(ppp));

  const tbody = document.getElementById('g-table-body');
  tbody.innerHTML = AREAS.map((a, i) =>
    `<tr><td>${a}평</td><td>${totals[i].toLocaleString('ko-KR')}원</td></tr>`
  ).join('');

  const resultCard = document.getElementById('g-result-card');
  resultCard.style.display = 'block';

  renderChart(AREAS, totals);
}

function renderChart(areas, totals) {
  const ctx = document.getElementById('g-chart').getContext('2d');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: areas.map(a => a + '평'),
      datasets: [{
        data: totals,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#2563EB',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title:  (items) => items[0].label,
            label:  (item)  => ' 총 매매가: ' + item.parsed.y.toLocaleString('ko-KR') + ' 원',
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: { font: { size: 11 }, color: '#64748B' },
          title: {
            display: true,
            text: '전용면적 (평)',
            font: { size: 11, weight: '600' },
            color: '#64748B',
            padding: { top: 6 },
          }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)' },
          ticks: {
            font: { size: 11 },
            color: '#64748B',
            callback: (v) => toEok(v),
          },
          title: {
            display: true,
            text: '총 매매가',
            font: { size: 11, weight: '600' },
            color: '#64748B',
            padding: { bottom: 6 },
          }
        }
      }
    }
  });
}

function toEok(v) {
  if (v >= 100000000) return (v / 100000000).toFixed(1) + '억';
  if (v >= 10000000)  return Math.round(v / 10000000) + '천만';
  if (v >= 10000)     return Math.round(v / 10000) + '만';
  return v.toLocaleString('ko-KR');
}

// ── 상가 수익률 계산 탭 ───────────────────────────────────────────────────────

const C_MONEY_IDS = [
  'c-appraised', 'c-minimum', 'c-bid', 'c-deposit', 'c-rent',
  'c-eviction-pp', 'c-interior-pp', 'c-mgmt-pp', 'c-unpaid-mgmt', 'c-manual-loan',
];

C_MONEY_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) applyCommaFormat(el);
});

const C_ALL_INPUT_IDS = [
  ...C_MONEY_IDS,
  'c-area', 'c-market-yield', 'c-first-rate', 'c-second-rate',
  'c-manual-rate', 'c-reserve-months', 'c-custom-yield',
];

C_ALL_INPUT_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', calcCommercial);
});

document.getElementById('c-loan-type').addEventListener('change', function () {
  updateLoanTypeUI(this.value);
  calcCommercial();
});

function updateLoanTypeUI(type) {
  document.getElementById('c-row-first-rate').style.display  = type === '1'      ? '' : 'none';
  document.getElementById('c-row-second-rate').style.display = type === '2'      ? '' : 'none';
  document.getElementById('c-row-manual-rate').style.display = type === 'manual' ? '' : 'none';
  document.getElementById('c-row-manual-loan').style.display = type === 'manual' ? '' : 'none';

  const note = document.getElementById('c-loan-note');
  if (type === '1') {
    note.textContent = '1금융권: MIN(입찰가×80%, 감정가×70%, 시세가치×70%, 입찰가²÷감정가)';
  } else if (type === '2') {
    note.textContent = '2금융권: MIN(입찰가×90%, 감정가×80%, 시세가치×80%)';
  } else {
    note.textContent = '직접 입력한 대출 가능액·금리를 사용합니다.';
  }
}

function cFromId(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const raw = el.value.replace(/,/g, '').trim();
  if (raw === '') return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

function cPct(id) {
  const v = cFromId(id);
  return v === null ? null : v / 100;
}

function cFmtMoney(v) {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return Math.round(v).toLocaleString('ko-KR') + '원';
}

function cFmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '-';
  return (v * 100).toFixed(2) + '%';
}

function calcCommercial() {
  const appraised   = cFromId('c-appraised') ?? 0;
  const minimum     = cFromId('c-minimum') ?? 0;
  const area        = cFromId('c-area') ?? 0;
  const bidPrice    = cFromId('c-bid') ?? 0;
  const deposit     = cFromId('c-deposit') ?? 0;
  const monthlyRent = cFromId('c-rent') ?? 0;
  const marketYield = cPct('c-market-yield') ?? 0.06;
  const firstRate   = cPct('c-first-rate') ?? 0.045;
  const secondRate  = cPct('c-second-rate') ?? 0.05;
  const manualRate  = cPct('c-manual-rate') ?? 0.05;
  const manualLoan  = cFromId('c-manual-loan') ?? 0;
  const evictionPP  = cFromId('c-eviction-pp') ?? 100000;
  const interiorPP  = cFromId('c-interior-pp') ?? 800000;
  const mgmtPP      = cFromId('c-mgmt-pp') ?? 0;
  const unpaidMgmt  = cFromId('c-unpaid-mgmt') ?? 0;
  const reserveMo   = cFromId('c-reserve-months') ?? 10;
  const customYield = cPct('c-custom-yield') ?? 0.06;
  const loanType    = document.getElementById('c-loan-type').value;

  const fairValue       = marketYield > 0 ? (monthlyRent * 12) / marketYield + deposit : 0;
  const acquisitionCost = bidPrice * 0.05;

  let loan = 0;
  if (loanType === 'manual') {
    loan = manualLoan;
  } else if (bidPrice > 0) {
    if (loanType === '1') {
      const c = [bidPrice * 0.8];
      if (appraised > 0) { c.push(appraised * 0.7); c.push((bidPrice * bidPrice) / appraised); }
      if (fairValue  > 0) c.push(fairValue * 0.7);
      loan = Math.min(...c);
    } else {
      const c = [bidPrice * 0.9];
      if (appraised > 0) c.push(appraised * 0.8);
      if (fairValue  > 0) c.push(fairValue * 0.8);
      loan = Math.min(...c);
    }
  }
  if (!isFinite(loan) || loan < 0) loan = 0;

  const rate            = loanType === 'manual' ? manualRate : loanType === '1' ? firstRate : secondRate;
  const annualInterest  = loan * rate;
  const eviction        = evictionPP * area;
  const interior        = interiorPP * area;
  const monthlyMgmt     = mgmtPP * area;
  const reserve         = (annualInterest / 12 + monthlyMgmt) * reserveMo;
  const cashIn          = bidPrice + acquisitionCost - loan + eviction + interior + unpaidMgmt + reserve - deposit;
  const monthlyCashflow = monthlyRent - annualInterest / 12;
  const propertyYield   = bidPrice > deposit ? (monthlyRent * 12) / (bidPrice - deposit) : null;
  const roe             = cashIn !== 0 ? (monthlyCashflow * 12) / cashIn : null;
  const saleProfit      = fairValue - cashIn - deposit - loan;
  const bidToMinimum    = minimum > 0 ? bidPrice / minimum - 1 : null;
  const rentPerPyeong   = area > 0 ? monthlyRent / area : null;
  const customYieldVal  = customYield > 0 ? (monthlyRent * 12) / customYield + deposit : null;
  const bidRate         = appraised > 0 ? bidPrice / appraised : null;

  document.getElementById('c-cash-in').textContent          = cFmtMoney(cashIn);
  document.getElementById('c-monthly-cashflow').textContent = cFmtMoney(monthlyCashflow);

  const roeEl = document.getElementById('c-roe');
  roeEl.textContent = roe !== null ? cFmtPct(roe) : '-';
  roeEl.className   = 'c-hero-value' + (roe === null ? '' : roe >= 0 ? ' c-pos' : ' c-neg');

  document.getElementById('c-sale-profit').textContent    = cFmtMoney(saleProfit);
  document.getElementById('c-acquisition').textContent    = cFmtMoney(acquisitionCost);
  document.getElementById('c-eviction').textContent       = cFmtMoney(eviction);
  document.getElementById('c-interior').textContent       = cFmtMoney(interior);
  document.getElementById('c-unpaid-cost').textContent    = cFmtMoney(unpaidMgmt);
  document.getElementById('c-reserve').textContent        = cFmtMoney(reserve);
  document.getElementById('c-annual-interest').textContent = cFmtMoney(annualInterest);
  document.getElementById('c-fair-value').textContent     = cFmtMoney(fairValue);
  document.getElementById('c-loan-amount').textContent    = cFmtMoney(loan);
  document.getElementById('c-loan-rate').textContent      = cFmtPct(rate);
  document.getElementById('c-prop-yield').textContent     = cFmtPct(propertyYield);
  document.getElementById('c-rent-pp').textContent        = rentPerPyeong !== null ? cFmtMoney(rentPerPyeong) : '-';
  document.getElementById('c-bid-rate').textContent       = bidRate !== null ? cFmtPct(bidRate) : '-';
  document.getElementById('c-min-gap').textContent        = bidToMinimum !== null ? cFmtPct(bidToMinimum) : '-';
  document.getElementById('c-custom-yield-value').textContent = customYieldVal !== null ? cFmtMoney(customYieldVal) : '-';
}

function resetCommercial() {
  ['c-appraised', 'c-minimum', 'c-bid', 'c-deposit', 'c-rent', 'c-manual-loan'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c-area').value           = '';
  document.getElementById('c-market-yield').value   = '6';
  document.getElementById('c-first-rate').value     = '4.5';
  document.getElementById('c-second-rate').value    = '5';
  document.getElementById('c-manual-rate').value    = '5';
  document.getElementById('c-eviction-pp').value    = '100,000';
  document.getElementById('c-interior-pp').value    = '800,000';
  document.getElementById('c-mgmt-pp').value        = '0';
  document.getElementById('c-unpaid-mgmt').value    = '0';
  document.getElementById('c-reserve-months').value = '10';
  document.getElementById('c-custom-yield').value   = '6';
  document.getElementById('c-loan-type').value      = '2';
  updateLoanTypeUI('2');
  calcCommercial();
}

// ─────────────────────────────────────────────────────────────────────────────

function renderResult({ pricePerPyeong, salePrice, yieldRate, mode }) {
  document.getElementById('resultPricePerPyeong').textContent = toComma(pricePerPyeong);
  document.getElementById('resultSalePrice').textContent      = toComma(salePrice);
  document.getElementById('resultYield').textContent          = yieldRate;
  document.getElementById('resultMode').textContent           = mode;

  resultCard.style.display = 'block';
  // re-trigger animation
  resultCard.classList.remove('result-card');
  void resultCard.offsetWidth;
  resultCard.classList.add('result-card');

  setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
}
