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
