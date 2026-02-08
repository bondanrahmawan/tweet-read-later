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
const syncGitHubBtn = document.getElementById('sync-github-btn');
const gitHubSettingsBtn = document.getElementById('github-settings-btn');
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

// GitHub Settings Modal
const gitHubSettingsModal = document.getElementById('github-settings-modal');
const gitHubSettingsClose = document.getElementById('github-settings-close');
const gitHubSettingsCancel = document.getElementById('github-settings-cancel');
const gitHubSettingsSave = document.getElementById('github-settings-save');
const gitHubToken = document.getElementById('github-token');
const gitHubOwner = document.getElementById('github-owner');
const gitHubRepo = document.getElementById('github-repo');
const gitHubPath = document.getElementById('github-path');

// Sync Result Modal
const syncResultModal = document.getElementById('sync-result-modal');
const syncResultTitle = document.getElementById('sync-result-title');
const syncResultBody = document.getElementById('sync-result-body');
const syncResultClose = document.getElementById('sync-result-close');
const syncResultOk = document.getElementById('sync-result-ok');

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

  // GitHub Sync
  syncGitHubBtn.addEventListener('click', handleSyncToGitHub);
  gitHubSettingsBtn.addEventListener('click', openGitHubSettingsModal);

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

  // GitHub Settings Modal
  gitHubSettingsClose.addEventListener('click', closeGitHubSettingsModal);
  gitHubSettingsCancel.addEventListener('click', closeGitHubSettingsModal);
  gitHubSettingsSave.addEventListener('click', saveGitHubSettings);
  gitHubSettingsModal.addEventListener('click', (e) => {
    if (e.target === gitHubSettingsModal) closeGitHubSettingsModal();
  });

  // Sync Result Modal
  syncResultClose.addEventListener('click', closeSyncResultModal);
  syncResultOk.addEventListener('click', closeSyncResultModal);
  syncResultModal.addEventListener('click', (e) => {
    if (e.target === syncResultModal) closeSyncResultModal();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeImportModal();
      closeDeleteModal();
      closeGitHubSettingsModal();
      closeSyncResultModal();
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

// ============================================================
// GitHub Sync Functions
// ============================================================

async function openGitHubSettingsModal() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getGitHubSettings' });
    if (response.success && response.settings) {
      gitHubToken.value = response.settings.token || '';
      gitHubOwner.value = response.settings.owner || '';
      gitHubRepo.value = response.settings.repo || '';
      gitHubPath.value = response.settings.path || 'mobile/tweets.json';
    }
  } catch (error) {
    console.error('Failed to load GitHub settings:', error);
  }
  gitHubSettingsModal.style.display = 'flex';
}

function closeGitHubSettingsModal() {
  gitHubSettingsModal.style.display = 'none';
}

async function saveGitHubSettings() {
  const settings = {
    token: gitHubToken.value.trim(),
    owner: gitHubOwner.value.trim(),
    repo: gitHubRepo.value.trim(),
    path: gitHubPath.value.trim() || 'mobile/tweets.json'
  };

  if (!settings.token || !settings.owner || !settings.repo) {
    alert('Token, Owner, and Repository are required.');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveGitHubSettings',
      settings
    });

    if (response.success) {
      closeGitHubSettingsModal();
    }
  } catch (error) {
    console.error('Failed to save GitHub settings:', error);
    alert('Failed to save settings.');
  }
}

async function handleSyncToGitHub() {
  // Show loading state
  syncGitHubBtn.disabled = true;
  syncGitHubBtn.classList.add('syncing');
  const originalHTML = syncGitHubBtn.innerHTML;
  syncGitHubBtn.innerHTML = `
    <svg class="spin" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
    </svg>
    Syncing...
  `;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'syncToGitHub' });

    if (response.success) {
      const time = new Date(response.timestamp).toLocaleString();
      syncResultTitle.textContent = 'Sync Successful';
      syncResultBody.innerHTML = `
        <div class="sync-success">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--success-color)">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <p>${response.tweetCount} tweets synced</p>
          <span class="sync-time">${time}</span>
        </div>
      `;
    } else {
      syncResultTitle.textContent = 'Sync Failed';
      syncResultBody.innerHTML = `
        <div class="sync-error">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--danger-color)">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
          </svg>
          <p>${response.error}</p>
        </div>
      `;
    }

    syncResultModal.style.display = 'flex';
  } catch (error) {
    console.error('Sync failed:', error);
    syncResultTitle.textContent = 'Sync Failed';
    syncResultBody.innerHTML = `
      <div class="sync-error">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--danger-color)">
          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
        </svg>
        <p>Failed to sync: ${error.message}</p>
      </div>
    `;
    syncResultModal.style.display = 'flex';
  } finally {
    syncGitHubBtn.disabled = false;
    syncGitHubBtn.classList.remove('syncing');
    syncGitHubBtn.innerHTML = originalHTML;
  }
}

function closeSyncResultModal() {
  syncResultModal.style.display = 'none';
}
