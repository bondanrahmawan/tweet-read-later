// Library Page Script

let allTweets = [];
let filteredTweets = [];
let currentEditTweetId = null;
let currentDeleteTweetId = null;

// DOM Elements
const tweetsContainer = document.getElementById('tweets-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const tagFilter = document.getElementById('tag-filter');
const sortFilter = document.getElementById('sort-filter');
const showingCount = document.getElementById('showing-count');
const totalStats = document.getElementById('total-stats');
const exportBtn = document.getElementById('export-btn');
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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadTweets();
  setupEventListeners();
});

async function loadTweets() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listTweets' });
    if (response.success) {
      allTweets = response.tweets;
      updateTagFilter();
      filterAndRender();
      updateStats();
    }
  } catch (error) {
    console.error('Failed to load tweets:', error);
    tweetsContainer.innerHTML = '<div class="error">Failed to load tweets</div>';
  }
}

function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', debounce(filterAndRender, 200));

  // Filters
  statusFilter.addEventListener('change', filterAndRender);
  tagFilter.addEventListener('change', filterAndRender);
  sortFilter.addEventListener('change', filterAndRender);

  // Export
  exportBtn.addEventListener('click', exportLibrary);

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
    // Status filter
    if (status !== 'all' && tweet.status !== status) return false;

    // Tag filter
    if (tag !== 'all' && !tweet.tags.includes(tag)) return false;

    // Search filter
    if (searchTerm) {
      const matchesText = tweet.text.toLowerCase().includes(searchTerm);
      const matchesAuthor = tweet.author.toLowerCase().includes(searchTerm);
      const matchesNote = (tweet.note || '').toLowerCase().includes(searchTerm);
      const matchesTags = tweet.tags.some(t => t.toLowerCase().includes(searchTerm));
      if (!matchesText && !matchesAuthor && !matchesNote && !matchesTags) return false;
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
  tweetsContainer.style.display = 'block';

  if (filteredTweets.length === 0) {
    tweetsContainer.innerHTML = '<div class="no-results">No tweets match your filters</div>';
    return;
  }

  // Use DocumentFragment for performance
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
  card.dataset.tweetId = tweet.tweetId;

  const savedDate = new Date(tweet.savedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const tagsHtml = tweet.tags.length > 0
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
        <a href="https://x.com/${escapeHtml(tweet.author)}" target="_blank" rel="noopener">
          @${escapeHtml(tweet.author)}
        </a>
        ${statusBadge}
      </div>
      <div class="tweet-date">${savedDate}</div>
    </div>
    <div class="tweet-text">${escapeHtml(tweet.text) || '<em>No text content</em>'}</div>
    ${tagsHtml}
    ${noteHtml}
    <div class="tweet-actions">
      <button class="action-btn open-btn" title="Open Tweet" data-action="open">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
        Open
      </button>
      <button class="action-btn edit-btn" title="Edit" data-action="edit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
        Edit
      </button>
      <button class="action-btn toggle-btn" title="${tweet.status === 'archived' ? 'Mark Unread' : 'Archive'}" data-action="toggle">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          ${tweet.status === 'archived'
            ? '<path d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"/>'
            : '<path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>'
          }
        </svg>
        ${tweet.status === 'archived' ? 'Unread' : 'Archive'}
      </button>
      <button class="action-btn delete-btn" title="Delete" data-action="delete">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Delete
      </button>
    </div>
  `;

  // Event delegation for actions
  card.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const tweetId = card.dataset.tweetId;

    switch (action) {
      case 'open':
        window.open(tweet.url, '_blank');
        break;
      case 'edit':
        openEditModal(tweet);
        break;
      case 'toggle':
        toggleStatus(tweetId, tweet.status);
        break;
      case 'delete':
        openDeleteModal(tweetId);
        break;
    }
  });

  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateTagFilter() {
  const tags = new Set();
  allTweets.forEach(tweet => {
    tweet.tags.forEach(tag => tags.add(tag));
  });

  const currentValue = tagFilter.value;
  tagFilter.innerHTML = '<option value="all">All Tags</option>';

  Array.from(tags).sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });

  // Restore selection if still valid
  if (tags.has(currentValue)) {
    tagFilter.value = currentValue;
  }
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

// Edit Modal Functions
function openEditModal(tweet) {
  currentEditTweetId = tweet.tweetId;
  editTags.value = tweet.tags.join(', ');
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
      // Update local data
      const index = allTweets.findIndex(t => t.tweetId === currentEditTweetId);
      if (index !== -1) {
        allTweets[index] = { ...allTweets[index], ...updates };
      }
      updateTagFilter();
      filterAndRender();
      updateStats();
      closeEditModal();
    }
  } catch (error) {
    console.error('Failed to update tweet:', error);
    alert('Failed to save changes');
  }
}

// Toggle Status
async function toggleStatus(tweetId, currentStatus) {
  const newStatus = currentStatus === 'archived' ? 'unread' : 'archived';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'updateTweet',
      tweetId: tweetId,
      updates: { status: newStatus }
    });

    if (response.success) {
      const index = allTweets.findIndex(t => t.tweetId === tweetId);
      if (index !== -1) {
        allTweets[index].status = newStatus;
      }
      filterAndRender();
      updateStats();
    }
  } catch (error) {
    console.error('Failed to toggle status:', error);
  }
}

// Delete Modal Functions
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
      allTweets = allTweets.filter(t => t.tweetId !== currentDeleteTweetId);
      updateTagFilter();
      filterAndRender();
      updateStats();
      closeDeleteModal();
    }
  } catch (error) {
    console.error('Failed to delete tweet:', error);
    alert('Failed to delete tweet');
  }
}

// Export Library
function exportLibrary() {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tweets: allTweets
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tweets-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import Library
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
