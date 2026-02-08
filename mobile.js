// Mobile Library Page Script - Read-Only View
// Uses shared TweetLibrary module for rendering and filtering
// This script is designed for static hosting (e.g., GitHub Pages)

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

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize shared library in mobile mode
  TweetLibrary.init({
    mode: 'mobile',
    container: tweetsContainer,
    emptyState: emptyState,
    errorState: errorState,
    tagFilter: tagFilter,
    showingCount: showingCount,
    totalStats: totalStats
  });

  await loadTweets();
  setupEventListeners();
  showPrivacyNotice();
});

// ============================================================
// Data Loading
// ============================================================

async function loadTweets() {
  try {
    const response = await fetch('tweets.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle both raw array and wrapped format
    let tweets;
    if (Array.isArray(data)) {
      tweets = data;
    } else if (data.tweets && Array.isArray(data.tweets)) {
      tweets = data.tweets;
    } else {
      throw new Error('Invalid data format');
    }

    // Validate tweet objects
    tweets = tweets.filter(t => t && t.tweetId);

    if (tweets.length === 0) {
      showEmptyState();
      return;
    }

    TweetLibrary.setTweets(tweets);
    updateLastUpdated();
    TweetLibrary.updateTagFilter();
    filterAndRender();
    TweetLibrary.updateStats();

  } catch (error) {
    console.error('Failed to load tweets:', error);
    showErrorState(error.message);
  }
}

// ============================================================
// UI State Functions
// ============================================================

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
  if (!privacyNotice) return;

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
  if (!lastUpdated) return;

  const tweets = TweetLibrary.getTweets();
  if (tweets.length > 0) {
    const dates = tweets
      .map(t => new Date(t.savedAt))
      .filter(d => !isNaN(d));

    if (dates.length > 0) {
      const mostRecent = new Date(Math.max(...dates));
      lastUpdated.textContent = `Last updated: ${TweetLibrary.formatDate(mostRecent.toISOString())}`;
    }
  }
}

// ============================================================
// Event Listeners
// ============================================================

function setupEventListeners() {
  // Search with debounce
  searchInput.addEventListener('input', TweetLibrary.debounce(filterAndRender, 200));

  // Filters
  statusFilter.addEventListener('change', filterAndRender);
  tagFilter.addEventListener('change', filterAndRender);
  sortFilter.addEventListener('change', filterAndRender);
}

// ============================================================
// Filtering & Rendering
// ============================================================

function filterAndRender() {
  TweetLibrary.filterTweets({
    searchTerm: searchInput.value,
    status: statusFilter.value,
    tag: tagFilter.value,
    sort: sortFilter.value
  });

  TweetLibrary.render();
}
