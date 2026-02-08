// Library Page Script
// Uses shared TweetLibrary module for rendering and filtering

let currentEditTweetId = null;
let currentDeleteTweetId = null;

// DOM Elements - Library specific
const tweetsContainer = document.getElementById('tweets-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const tagFilter = document.getElementById('tag-filter');
const sortFilter = document.getElementById('sort-filter');
const showingCount = document.getElementById('showing-count');
const totalStats = document.getElementById('total-stats');
const exportBtn = document.getElementById('export-btn');
const exportMobileBtn = document.getElementById('export-mobile-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// Edit Modal
const editModal = document.getElementById('edit-modal');
const editTags = document.getElementById('edit-tags');
const editNote = document.getElementById('edit-note');
const editStatus = document.getElementById('edit-status');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSave = document.getElementById('modal-save');

// Import Modal
const importModal = document.getElementById('import-modal');
const importedCount = document.getElementById('imported-count');
const skippedCount = document.getElementById('skipped-count');
const importModalClose = document.getElementById('import-modal-close');
const importModalOk = document.getElementById('import-modal-ok');

// Delete Modal
const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize shared library
  TweetLibrary.init({
    mode: 'library',
    container: tweetsContainer,
    emptyState: emptyState,
    tagFilter: tagFilter,
    showingCount: showingCount,
    totalStats: totalStats
  });

  await loadTweets();
  setupEventListeners();
});

async function loadTweets() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listTweets' });
    if (response.success) {
      TweetLibrary.setTweets(response.tweets);
      TweetLibrary.updateTagFilter();
      filterAndRender();
      TweetLibrary.updateStats();
    }
  } catch (error) {
    console.error('Failed to load tweets:', error);
    tweetsContainer.innerHTML = '<div class="error">Failed to load tweets</div>';
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

  // Export
  exportBtn.addEventListener('click', exportLibrary);
  exportMobileBtn.addEventListener('click', exportForMobile);

  // Import
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', handleImport);

  // Edit Modal
  modalClose.addEventListener('click', closeEditModal);
  modalCancel.addEventListener('click', closeEditModal);
  modalSave.addEventListener('click', saveEdit);
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  // Import Modal
  importModalClose.addEventListener('click', closeImportModal);
  importModalOk.addEventListener('click', closeImportModal);
  importModal.addEventListener('click', (e) => {
    if (e.target === importModal) closeImportModal();
  });

  // Delete Modal
  deleteModalClose.addEventListener('click', closeDeleteModal);
  deleteCancel.addEventListener('click', closeDeleteModal);
  deleteConfirm.addEventListener('click', confirmDelete);
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeImportModal();
      closeDeleteModal();
    }
  });
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

  TweetLibrary.render({
    onCardClick: handleCardClick
  });
}

function handleCardClick(e, tweet, card) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  switch (action) {
    case 'open':
      window.open(tweet.url || `https://x.com/i/status/${tweet.tweetId}`, '_blank');
      break;
    case 'edit':
      openEditModal(tweet);
      break;
    case 'toggle':
      toggleStatus(tweet.tweetId, tweet.status);
      break;
    case 'delete':
      openDeleteModal(tweet.tweetId);
      break;
  }
}

// ============================================================
// Edit Modal Functions
// ============================================================

function openEditModal(tweet) {
  currentEditTweetId = tweet.tweetId;
  editTags.value = (tweet.tags || []).join(', ');
  editNote.value = tweet.note || '';
  editStatus.value = tweet.status;
  editModal.style.display = 'flex';
  editTags.focus();
}

function closeEditModal() {
  editModal.style.display = 'none';
  currentEditTweetId = null;
}

async function saveEdit() {
  if (!currentEditTweetId) return;

  const tags = editTags.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  const updates = {
    tags: tags,
    note: editNote.value.trim(),
    status: editStatus.value
  };

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateTweet',
      tweetId: currentEditTweetId,
      updates: updates
    });

    if (response.success) {
      // Update in shared library
      const tweets = TweetLibrary.getTweets();
      const index = tweets.findIndex(t => t.tweetId === currentEditTweetId);
      if (index !== -1) {
        Object.assign(tweets[index], updates);
      }

      TweetLibrary.updateTagFilter();
      filterAndRender();
      TweetLibrary.updateStats();
      closeEditModal();
    }
  } catch (error) {
    console.error('Failed to update tweet:', error);
    alert('Failed to save changes');
  }
}

// ============================================================
// Toggle Status
// ============================================================

async function toggleStatus(tweetId, currentStatus) {
  const newStatus = currentStatus === 'archived' ? 'unread' : 'archived';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateTweet',
      tweetId: tweetId,
      updates: { status: newStatus }
    });

    if (response.success) {
      // Try incremental update first
      if (!TweetLibrary.updateTweetInPlace(tweetId, { status: newStatus })) {
        filterAndRender();
      }
      TweetLibrary.updateStats();
    }
  } catch (error) {
    console.error('Failed to toggle status:', error);
  }
}

// ============================================================
// Delete Modal Functions
// ============================================================

function openDeleteModal(tweetId) {
  currentDeleteTweetId = tweetId;
  deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
  deleteModal.style.display = 'none';
  currentDeleteTweetId = null;
}

async function confirmDelete() {
  if (!currentDeleteTweetId) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteTweet',
      tweetId: currentDeleteTweetId
    });

    if (response.success) {
      const tweets = TweetLibrary.getTweets();
      const index = tweets.findIndex(t => t.tweetId === currentDeleteTweetId);
      if (index !== -1) {
        tweets.splice(index, 1);
      }

      TweetLibrary.updateTagFilter();
      filterAndRender();
      TweetLibrary.updateStats();
      closeDeleteModal();
    }
  } catch (error) {
    console.error('Failed to delete tweet:', error);
    alert('Failed to delete tweet');
  }
}

// ============================================================
// Export Functions
// ============================================================

function exportLibrary() {
  const tweets = TweetLibrary.getTweets();
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tweets: tweets
  };

  downloadJson(exportData, 'tweets-backup.json');
}

function exportForMobile() {
  const tweets = TweetLibrary.getTweets();
  downloadJson(tweets, 'tweets.json');
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// Import Function
// ============================================================

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate schema
    if (!data.version || !Array.isArray(data.tweets)) {
      throw new Error('Invalid backup file format');
    }

    if (data.version !== 1) {
      throw new Error('Unsupported backup version');
    }

    // Validate tweets array
    const validTweets = data.tweets.filter(t => t.tweetId && typeof t.tweetId === 'string');

    if (validTweets.length === 0) {
      throw new Error('No valid tweets found in backup');
    }

    // Import via background
    const response = await chrome.runtime.sendMessage({
      action: 'importTweets',
      tweets: validTweets
    });

    if (response.success) {
      // Show import summary
      importedCount.textContent = response.imported;
      skippedCount.textContent = response.skipped;
      importModal.style.display = 'flex';

      // Reload tweets
      await loadTweets();
    } else {
      throw new Error('Import failed');
    }
  } catch (error) {
    console.error('Import error:', error);
    alert('Failed to import: ' + error.message);
  }

  // Reset file input
  event.target.value = '';
}

function closeImportModal() {
  importModal.style.display = 'none';
}
