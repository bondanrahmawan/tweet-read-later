// Shared utilities for library and mobile pages
// This module contains common rendering, filtering, and utility functions

// ============================================================
// Configuration
// ============================================================

const TweetLibrary = {
  // Virtual scrolling settings
  virtualScroll: {
    itemHeight: 180,
    bufferSize: 5,
    threshold: 50 // Enable virtual scroll when items exceed this
  },

  // State
  state: {
    allTweets: [],
    filteredTweets: [],
    virtualScrollState: { startIndex: 0, endIndex: 0 },
    elementCache: new Map(),
    scrollListenerAttached: false
  },

  // DOM references (set by init)
  dom: {
    container: null,
    emptyState: null,
    tagFilter: null,
    showingCount: null,
    totalStats: null
  },

  // Mode: 'library' or 'mobile'
  mode: 'library',

  // ============================================================
  // Initialization
  // ============================================================

  init(options = {}) {
    this.mode = options.mode || 'library';
    this.dom = {
      container: options.container,
      emptyState: options.emptyState,
      errorState: options.errorState,
      tagFilter: options.tagFilter,
      showingCount: options.showingCount,
      totalStats: options.totalStats
    };
    this.state.allTweets = [];
    this.state.filteredTweets = [];
    this.state.elementCache.clear();
  },

  setTweets(tweets) {
    this.state.allTweets = tweets;
    this.state.elementCache.clear();
  },

  getTweets() {
    return this.state.allTweets;
  },

  getFilteredTweets() {
    return this.state.filteredTweets;
  },

  // ============================================================
  // Utility Functions
  // ============================================================

  debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // ============================================================
  // Filtering & Sorting
  // ============================================================

  filterTweets(options = {}) {
    const { searchTerm = '', status = 'all', tag = 'all', sort = 'newest' } = options;
    const searchLower = searchTerm.toLowerCase().trim();

    this.state.filteredTweets = this.state.allTweets.filter(tweet => {
      // Status filter
      if (status !== 'all' && tweet.status !== status) return false;

      // Tag filter
      if (tag !== 'all') {
        if (!tweet.tags || !tweet.tags.includes(tag)) return false;
      }

      // Search filter
      if (searchLower) {
        const searchableText = [
          tweet.text || '',
          tweet.author || '',
          tweet.note || '',
          (tweet.tags || []).join(' ')
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) return false;
      }

      return true;
    });

    // Sort
    this.state.filteredTweets.sort((a, b) => {
      const dateA = new Date(a.savedAt);
      const dateB = new Date(b.savedAt);
      return sort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Clear element cache when filter changes
    this.state.elementCache.clear();

    return this.state.filteredTweets;
  },

  // ============================================================
  // Tag Filter Population
  // ============================================================

  updateTagFilter() {
    if (!this.dom.tagFilter) return;

    const tags = new Set();
    this.state.allTweets.forEach(tweet => {
      if (tweet.tags && Array.isArray(tweet.tags)) {
        tweet.tags.forEach(tag => tags.add(tag));
      }
    });

    const currentValue = this.dom.tagFilter.value;
    this.dom.tagFilter.innerHTML = '<option value="all">All Tags</option>';

    Array.from(tags).sort().forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      this.dom.tagFilter.appendChild(option);
    });

    // Restore selection if still valid
    if (tags.has(currentValue)) {
      this.dom.tagFilter.value = currentValue;
    }
  },

  // ============================================================
  // Statistics
  // ============================================================

  updateShowingCount() {
    if (!this.dom.showingCount) return;
    const count = this.state.filteredTweets.length;
    this.dom.showingCount.textContent = count === 1 ? 'Showing 1 tweet' : `Showing ${count} tweets`;
  },

  updateStats() {
    if (!this.dom.totalStats) return;
    const unread = this.state.allTweets.filter(t => t.status === 'unread').length;
    const archived = this.state.allTweets.filter(t => t.status === 'archived').length;
    this.dom.totalStats.textContent = `(${unread} unread, ${archived} archived)`;
  },

  // ============================================================
  // Rendering
  // ============================================================

  render(options = {}) {
    const { onCardClick } = options;

    if (this.state.allTweets.length === 0) {
      if (this.dom.container) this.dom.container.style.display = 'none';
      if (this.dom.emptyState) this.dom.emptyState.style.display = 'flex';
      if (this.dom.errorState) this.dom.errorState.style.display = 'none';
      return;
    }

    if (this.dom.emptyState) this.dom.emptyState.style.display = 'none';
    if (this.dom.errorState) this.dom.errorState.style.display = 'none';
    if (this.dom.container) this.dom.container.style.display = 'block';

    if (this.state.filteredTweets.length === 0) {
      this.dom.container.innerHTML = '<div class="no-results">No tweets match your filters</div>';
      return;
    }

    // Use virtual scrolling for large lists
    const useVirtual = this.state.filteredTweets.length > this.virtualScroll.threshold;

    if (useVirtual) {
      this.renderVirtualList(onCardClick);
    } else {
      this.renderFullList(onCardClick);
    }

    this.updateShowingCount();
  },

  renderFullList(onCardClick) {
    const fragment = document.createDocumentFragment();

    this.state.filteredTweets.forEach(tweet => {
      const card = this.createTweetCard(tweet, onCardClick);
      fragment.appendChild(card);
    });

    this.dom.container.innerHTML = '';
    this.dom.container.style.position = '';
    this.dom.container.style.height = '';
    this.dom.container.appendChild(fragment);
  },

  renderVirtualList(onCardClick) {
    const totalHeight = this.state.filteredTweets.length * this.virtualScroll.itemHeight;

    this.dom.container.innerHTML = '';
    this.dom.container.style.position = 'relative';
    this.dom.container.style.height = `${totalHeight}px`;
    this.dom.container.style.overflow = 'visible';

    // Store callback for virtual view updates
    this._onCardClick = onCardClick;

    // Initial render
    this.updateVirtualView();

    // Attach scroll listener once
    if (!this.state.scrollListenerAttached) {
      window.addEventListener('scroll', this.throttle(() => this.updateVirtualView(), 16), { passive: true });
      this.state.scrollListenerAttached = true;
    }
  },

  updateVirtualView() {
    if (this.state.filteredTweets.length <= this.virtualScroll.threshold) return;
    if (!this.dom.container) return;

    const scrollTop = window.scrollY;
    const containerTop = this.dom.container.offsetTop;
    const viewportHeight = window.innerHeight;

    const relativeScroll = Math.max(0, scrollTop - containerTop);
    const startIndex = Math.max(0, Math.floor(relativeScroll / this.virtualScroll.itemHeight) - this.virtualScroll.bufferSize);
    const visibleCount = Math.ceil(viewportHeight / this.virtualScroll.itemHeight) + (this.virtualScroll.bufferSize * 2);
    const endIndex = Math.min(this.state.filteredTweets.length, startIndex + visibleCount);

    // Skip if range hasn't changed
    if (startIndex === this.state.virtualScrollState.startIndex &&
        endIndex === this.state.virtualScrollState.endIndex) {
      return;
    }

    this.state.virtualScrollState.startIndex = startIndex;
    this.state.virtualScrollState.endIndex = endIndex;

    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i < endIndex; i++) {
      const tweet = this.state.filteredTweets[i];
      let card = this.state.elementCache.get(tweet.tweetId);

      if (!card) {
        card = this.createTweetCard(tweet, this._onCardClick);
        this.state.elementCache.set(tweet.tweetId, card);
      }

      card.style.position = 'absolute';
      card.style.top = `${i * this.virtualScroll.itemHeight}px`;
      card.style.left = '0';
      card.style.right = '0';
      fragment.appendChild(card);
    }

    this.dom.container.innerHTML = '';
    this.dom.container.style.height = `${this.state.filteredTweets.length * this.virtualScroll.itemHeight}px`;
    this.dom.container.appendChild(fragment);
  },

  // ============================================================
  // Tweet Card Creation
  // ============================================================

  createTweetCard(tweet, onCardClick) {
    const card = document.createElement('div');
    card.className = `tweet-card ${tweet.status === 'archived' ? 'archived' : ''}`;
    card.dataset.tweetId = tweet.tweetId;

    const savedDate = this.formatDate(tweet.savedAt);

    const tagsHtml = (tweet.tags && tweet.tags.length > 0)
      ? `<div class="tweet-tags">${tweet.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>`
      : '';

    const noteHtml = tweet.note
      ? `<div class="tweet-note"><strong>Note:</strong> ${this.escapeHtml(tweet.note)}</div>`
      : '';

    const statusBadge = tweet.status === 'archived'
      ? '<span class="status-badge archived">Archived</span>'
      : '<span class="status-badge unread">Unread</span>';

    // Different action buttons for library vs mobile
    const actionsHtml = this.mode === 'mobile'
      ? this.createMobileActions(tweet)
      : this.createLibraryActions(tweet);

    card.innerHTML = `
      <div class="tweet-header">
        <div class="tweet-author">
          <a href="https://x.com/${this.escapeHtml(tweet.author || 'unknown')}" target="_blank" rel="noopener noreferrer">
            @${this.escapeHtml(tweet.author || 'unknown')}
          </a>
          ${statusBadge}
        </div>
        <div class="tweet-date">${savedDate}</div>
      </div>
      <div class="tweet-text">${this.escapeHtml(tweet.text) || '<em>No text content</em>'}</div>
      ${tagsHtml}
      ${noteHtml}
      <div class="tweet-actions">
        ${actionsHtml}
      </div>
    `;

    // Attach click handler if provided
    if (onCardClick && this.mode === 'library') {
      card.addEventListener('click', (e) => onCardClick(e, tweet, card));
    }

    return card;
  },

  createMobileActions(tweet) {
    const url = this.escapeHtml(tweet.url || `https://x.com/i/status/${tweet.tweetId}`);
    return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" class="action-btn open-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
        </svg>
        Open Tweet
      </a>
    `;
  },

  createLibraryActions(tweet) {
    const archiveIcon = tweet.status === 'archived'
      ? '<path d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.01 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.49-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.93 1H5.12z"/>'
      : '<path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>';

    return `
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
          ${archiveIcon}
        </svg>
        ${tweet.status === 'archived' ? 'Unread' : 'Archive'}
      </button>
      <button class="action-btn delete-btn" title="Delete" data-action="delete">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Delete
      </button>
    `;
  },

  // ============================================================
  // Incremental Updates (for library mode)
  // ============================================================

  updateTweetInPlace(tweetId, updates) {
    const card = document.querySelector(`[data-tweet-id="${tweetId}"]`);
    if (!card) return false;

    const tweet = this.state.allTweets.find(t => t.tweetId === tweetId);
    if (!tweet) return false;

    // Apply updates to tweet object
    Object.assign(tweet, updates);

    // Update status badge
    const statusBadge = card.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge ${tweet.status}`;
      statusBadge.textContent = tweet.status === 'archived' ? 'Archived' : 'Unread';
    }

    // Update card class
    card.className = `tweet-card ${tweet.status === 'archived' ? 'archived' : ''}`;

    // Update toggle button
    const toggleBtn = card.querySelector('.toggle-btn');
    if (toggleBtn) {
      toggleBtn.title = tweet.status === 'archived' ? 'Mark Unread' : 'Archive';
      const textNode = Array.from(toggleBtn.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      if (textNode) {
        textNode.textContent = tweet.status === 'archived' ? '\n        Unread\n      ' : '\n        Archive\n      ';
      }
    }

    // Remove from element cache to force rebuild next time
    this.state.elementCache.delete(tweetId);

    return true;
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.TweetLibrary = TweetLibrary;
}
