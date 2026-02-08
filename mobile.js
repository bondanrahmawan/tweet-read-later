// Mobile Library Page Script - Read-Only View
// This script is designed for static hosting (e.g., GitHub Pages)
// It fetches tweet data from a local tweets.json file

let allTweets = [];
let filteredTweets = [];

// DOM Elements
const tweetsContainer = document.getElementById('tweets-container');
const emptyState = document.getElementById('empty-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const tagFilter = document.getElementById('tag-filter');
const sortFilter = document.getElementById('sort-filter');
const showingCount = document.getElementById('showing-count');
const totalStats = document.getElementById('total-stats');
const lastUpdated = document.getElementById('last-updated');
const privacyNotice = document.getElementById('privacy-notice');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadTweets();
  setupEventListeners();
  showPrivacyNotice();
});

async function loadTweets() {
  try {
    const response = await fetch('tweets.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both raw array and wrapped format
    if (Array.isArray(data)) {
      allTweets = data;
    } else if (data.tweets && Array.isArray(data.tweets)) {
      allTweets = data.tweets;
    } else {
      throw new Error('Invalid data format');
    }

    // Validate tweet objects
    allTweets = allTweets.filter(t => t && t.tweetId);

    if (allTweets.length === 0) {
      showEmptyState();
      return;
    }

    updateLastUpdated();
    updateTagFilter();
    filterAndRender();
    updateStats();

  } catch (error) {
    console.error('Failed to load tweets:', error);
    showErrorState(error.message);
  }
}

function showEmptyState() {
  tweetsContainer.style.display = 'none';
  errorState.style.display = 'none';
  emptyState.style.display = 'flex';
}

function showErrorState(message) {
  tweetsContainer.style.display = 'none';
  emptyState.style.display = 'none';
  errorState.style.display = 'flex';
  errorMessage.textContent = message || 'Make sure tweets.json exists in this directory';
}

function showPrivacyNotice() {
  // Show privacy notice briefly
  privacyNotice.style.display = 'block';

  // Hide after 10 seconds
  setTimeout(() => {
    privacyNotice.style.opacity = '0';
    privacyNotice.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      privacyNotice.style.display = 'none';
    }, 500);
  }, 10000);
}

function updateLastUpdated() {
  // Try to find the most recent savedAt date
  if (allTweets.length > 0) {
    const dates = allTweets
      .map(t => new Date(t.savedAt))
      .filter(d => !isNaN(d));

    if (dates.length > 0) {
      const mostRecent = new Date(Math.max(...dates));
      lastUpdated.textContent = `Last updated: ${mostRecent.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })}`;
    }
  }
}

function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', debounce(filterAndRender, 200));

  // Filters
  statusFilter.addEventListener('change', filterAndRender);
  tagFilter.addEventListener('change', filterAndRender);
  sortFilter.addEventListener('change', filterAndRender);
}

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

function filterAndRender() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const status = statusFilter.value;
  const tag = tagFilter.value;
  const sort = sortFilter.value;

  // Filter
  filteredTweets = allTweets.filter(tweet => {
    if (status !== 'all' && tweet.status !== status) return false;
    if (tag !== 'all' && (!tweet.tags || !tweet.tags.includes(tag))) return false;

    if (searchTerm) {
      const searchableText = `${tweet.text || ''} ${tweet.author || ''} ${tweet.note || ''} ${(tweet.tags || []).join(' ')}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }

    return true;
  });

  // Sort
  filteredTweets.sort((a, b) => {
    const dateA = new Date(a.savedAt);
    const dateB = new Date(b.savedAt);
    return sort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  renderTweets();
  updateShowingCount();
}

function renderTweets() {
  if (allTweets.length === 0) {
    tweetsContainer.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  errorState.style.display = 'none';
  tweetsContainer.style.display = 'block';

  if (filteredTweets.length === 0) {
    tweetsContainer.innerHTML = '<div class="no-results">No tweets match your filters</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredTweets.forEach(tweet => {
    const card = createTweetCard(tweet);
    fragment.appendChild(card);
  });

  tweetsContainer.innerHTML = '';
  tweetsContainer.appendChild(fragment);
}

function createTweetCard(tweet) {
  const card = document.createElement('div');
  card.className = `tweet-card ${tweet.status === 'archived' ? 'archived' : ''}`;

  const savedDate = new Date(tweet.savedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const tagsHtml = (tweet.tags && tweet.tags.length > 0)
    ? `<div class="tweet-tags">${tweet.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';

  const noteHtml = tweet.note
    ? `<div class="tweet-note"><strong>Note:</strong> ${escapeHtml(tweet.note)}</div>`
    : '';

  const statusBadge = tweet.status === 'archived'
    ? '<span class="status-badge archived">Archived</span>'
    : '<span class="status-badge unread">Unread</span>';

  card.innerHTML = `
    <div class="tweet-header">
      <div class="tweet-author">
        <a href="https://x.com/${escapeHtml(tweet.author || 'unknown')}" target="_blank" rel="noopener noreferrer">
          @${escapeHtml(tweet.author || 'unknown')}
        </a>
        ${statusBadge}
      </div>
      <div class="tweet-date">${savedDate}</div>
    </div>
    <div class="tweet-text">${escapeHtml(tweet.text) || '<em>No text content</em>'}</div>
    ${tagsHtml}
    ${noteHtml}
    <div class="tweet-actions">
      <a href="${escapeHtml(tweet.url || `https://x.com/i/status/${tweet.tweetId}`)}"
         target="_blank"
         rel="noopener noreferrer"
         class="action-btn open-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
        Open Tweet
      </a>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateTagFilter() {
  const tags = new Set();
  allTweets.forEach(tweet => {
    if (tweet.tags && Array.isArray(tweet.tags)) {
      tweet.tags.forEach(tag => tags.add(tag));
    }
  });

  tagFilter.innerHTML = '<option value="all">All Tags</option>';

  Array.from(tags).sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
}

function updateShowingCount() {
  const text = filteredTweets.length === 1
    ? 'Showing 1 tweet'
    : `Showing ${filteredTweets.length} tweets`;
  showingCount.textContent = text;
}

function updateStats() {
  const unread = allTweets.filter(t => t.status === 'unread').length;
  const archived = allTweets.filter(t => t.status === 'archived').length;
  totalStats.textContent = `(${unread} unread, ${archived} archived)`;
}
