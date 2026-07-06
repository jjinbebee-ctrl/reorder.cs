const CUSTOMER_API_URL = 'https://script.google.com/macros/s/AKfycbwd_tjMT6ijMFInn4XGzmQunrT5i6q9JGGGy1fTQhLqjuB66I8haFQbtcyzHvry5l7lcA/exec';

const keywordInput = document.getElementById('keyword');
const searchButton = document.getElementById('searchButton');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const resultInfoEl = document.getElementById('resultInfo');
const lastUpdatedEl = document.getElementById('lastUpdated');

let latestResults = [];

if (searchButton) {
  searchButton.addEventListener('click', searchRestock);
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    searchRestock();
  }
});

if (keywordInput) {
  keywordInput.addEventListener('input', function() {
    const clearButton = document.querySelector('.clear-btn[data-clear="keyword"]');

    if (clearButton) {
      clearButton.style.display = keywordInput.value.trim() ? 'block' : 'none';
    }
  });
}

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
  const keyword = keywordInput ? keywordInput.value.trim() : '';

  if (!keyword) {
    setText(statusEl, '상품명 또는 컬러명을 입력해주세요.');
    setText(resultInfoEl, '0건');
    setHtml(resultEl, '<div class="no-result">검색어가 없습니다.</div>');
    latestResults = [];
    return;
  }

  const params = new URLSearchParams({
    keyword
  });

  if (searchButton) {
    searchButton.disabled = true;
    searchButton.textContent = '조회 중';
  }

  setText(statusEl, '재입고 일정을 조회하고 있습니다...');
  setText(resultInfoEl, '-');
  setText(lastUpdatedEl, '조회 중...');
  setHtml(resultEl, '<div class="no-result">조회 중...</div>');

  try {
    const response = await fetch(`${CUSTOMER_API_URL}?${params.toString()}`, {
      method: 'GET'
    });

    const data = await response.json();

    if (!data.success) {
      setText(statusEl, data.message || '조회에 실패했습니다.');
      setText(resultInfoEl, '0건');
      setHtml(resultEl, '<div class="no-result">조회 가능한 재입고 일정이 없습니다.</div>');
      latestResults = [];
      return;
    }

    latestResults = data.results || [];

    setHtml(statusEl, `<strong>${latestResults.length}건</strong> 조회 완료`);
    setText(resultInfoEl, `${latestResults.length}건`);
    setText(lastUpdatedEl, data.searchedAt ? `마지막 조회: ${data.searchedAt}` : '조회 완료');

    renderResults(latestResults);

  } catch (error) {
    console.error(error);

    setText(statusEl, '오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    setText(resultInfoEl, '0건');
    setHtml(resultEl, '<div class="no-result">오류가 발생했습니다.</div>');
  } finally {
    if (searchButton) {
      searchButton.disabled = false;
      searchButton.textContent = '조회';
    }
  }
}

function renderResults(items) {
  setText(resultInfoEl, `${items.length}건`);

  if (!items.length) {
    setHtml(resultEl, `
      <div class="no-result">
        조회 가능한 재입고 일정이 없습니다.<br>
        상품명 또는 컬러명을 다시 확인해주세요.
      </div>
    `);
    return;
  }

  setHtml(resultEl, `
    <div class="result-list">
      ${items.map(item => renderItem(item)).join('')}
    </div>
  `);
}

function renderItem(item) {
  const keyword = keywordInput ? keywordInput.value.trim() : '';

  return `
    <div class="result-item">
      <div class="result-top">
        <div class="product-name">${highlightText(item.productName || '-', keyword)}</div>
        ${renderStatus(item.status)}
      </div>

      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">컬러</span>
          <span class="info-value">${highlightText(item.color || '-', keyword)}</span>
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

  const keywords = keyword
    .split(/[\s,\/]+/)
    .map(v => v.trim())
    .filter(Boolean);

  if (!keywords.length) return base;

  let highlighted = base;

  keywords.forEach(function(word) {
    const safeKeyword = escapeRegExp(escapeHtml(word));
    if (!safeKeyword) return;

    const regex = new RegExp(safeKeyword, 'gi');
    highlighted = highlighted.replace(regex, match => `<mark class="kw-mark">${match}</mark>`);
  });

  return highlighted;
}

function setText(element, text) {
  if (!element) return;
  element.textContent = text;
}

function setHtml(element, html) {
  if (!element) return;
  element.innerHTML = html;
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
