const CUSTOMER_API_URL = 'https://script.google.com/macros/s/AKfycbwd_tjMT6ijMFInn4XGzmQunrT5i6q9JGGGy1fTQhLqjuB66I8haFQbtcyzHvry5l7lcA/exec
';

const keywordInput = document.getElementById('keyword');
const searchButton = document.getElementById('searchButton');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const resultInfoEl = document.getElementById('resultInfo');
const lastUpdatedEl = document.getElementById('lastUpdated');

let latestResults = [];

searchButton.addEventListener('click', searchRestock);

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    searchRestock();
  }
});

keywordInput.addEventListener('input', function() {
  const clearButton = document.querySelector('.clear-btn[data-clear="keyword"]');

  if (clearButton) {
    clearButton.style.display = keywordInput.value.trim() ? 'block' : 'none';
  }
});

document.querySelectorAll('.clear-btn').forEach(function(button) {
  button.addEventListener('click', function() {
    const targetId = button.dataset.clear;
    const target = document.getElementById(targetId);

    if (target) {
      target.value = '';
      target.focus();
      button.style.display = 'none';
    }
  });
});

async function searchRestock() {
  const keyword = keywordInput.value.trim();

  if (!keyword) {
    statusEl.textContent = '상품명 또는 컬러명을 입력해주세요.';
    resultEl.innerHTML = '<div class="no-result">검색어가 없습니다.</div>';
    resultInfoEl.textContent = '0건';
    latestResults = [];
    return;
  }

  const params = new URLSearchParams({
    keyword
  });

  searchButton.disabled = true;
  searchButton.textContent = '조회 중';
  statusEl.textContent = '재입고 일정을 조회하고 있습니다...';
  resultEl.innerHTML = '<div class="no-result">조회 중...</div>';
  resultInfoEl.textContent = '-';
  lastUpdatedEl.textContent = '조회 중...';

  try {
    const response = await fetch(`${CUSTOMER_API_URL}?${params.toString()}`, {
      method: 'GET'
    });

    const data = await response.json();

    if (!data.success) {
      statusEl.textContent = data.message || '조회에 실패했습니다.';
      resultEl.innerHTML = '<div class="no-result">조회 가능한 재입고 일정이 없습니다.</div>';
      resultInfoEl.textContent = '0건';
      latestResults = [];
      return;
    }

    latestResults = data.results || [];

    statusEl.innerHTML = `<strong>${latestResults.length}건</strong> 조회 완료`;
    lastUpdatedEl.textContent = data.searchedAt ? `마지막 조회: ${data.searchedAt}` : '조회 완료';

    renderResults(latestResults);

  } catch (error) {
    console.error(error);
    statusEl.textContent = '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    resultEl.innerHTML = '<div class="no-result">오류가 발생했습니다.</div>';
    resultInfoEl.textContent = '0건';
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = '조회';
  }
}

function renderResults(items) {
  resultInfoEl.textContent = `${items.length}건`;

  if (!items.length) {
    resultEl.innerHTML = `
      <div class="no-result">
        조회 가능한 재입고 일정이 없습니다.<br>
        상품명 또는 컬러명을 다시 확인해주세요.
      </div>
    `;
    return;
  }

  resultEl.innerHTML = `
    <div class="result-list">
      ${items.map(item => renderItem(item)).join('')}
    </div>
  `;
}

function renderItem(item) {
  return `
    <div class="result-item">
      <div class="result-top">
        <div class="product-name">${highlightText(item.productName || '-', keywordInput.value.trim())}</div>
        ${renderStatus(item.status)}
      </div>

      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">컬러</span>
          <span class="info-value">${highlightText(item.color || '-', keywordInput.value.trim())}</span>
        </div>

        <div class="info-row">
          <span class="info-label">재생산 시작일</span>
          <span class="info-value">${escapeHtml(item.reorderStartDate || '-')}</span>
        </div>

        <div class="info-row">
          <span class="info-label">재입고 예정일</span>
          <span class="info-value">${escapeHtml(item.restockDate || '-')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderStatus(status) {
  let cls = 'status-pill-unknown';

  if (status === '입고 예정') {
    cls = 'status-pill-upcoming';
  } else if (status === '최근 입고') {
    cls = 'status-pill-recent';
  } else if (status === '입고 미정') {
    cls = 'status-pill-unknown';
  }

  return `<span class="status-pill ${cls}">${escapeHtml(status || '입고 미정')}</span>`;
}

function highlightText(text, keyword) {
  const base = escapeHtml(text || '');
  if (!keyword) return base;

  const safeKeyword = escapeRegExp(escapeHtml(keyword));
  if (!safeKeyword) return base;

  const regex = new RegExp(safeKeyword, 'gi');
  return base.replace(regex, match => `<mark class="kw-mark">${match}</mark>`);
}

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
