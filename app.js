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
    document.getElementById('page-calc').style.display  = target === 'calc'  ? '' : 'none';
    document.getElementById('page-graph').style.display = target === 'graph' ? '' : 'none';
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
