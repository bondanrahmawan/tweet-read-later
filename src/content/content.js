// Content Script - Inject "Read Later" button into tweets

(function() {
  'use strict';

  const BUTTON_CLASS = 'trl-save-button';
  const PROCESSED_ATTR = 'data-trl-processed';

  // ============================================================
  // Selector Configuration - Centralized for easy updates
  // Multiple fallback selectors for resilience against UI changes
  // ============================================================
  const SELECTORS = {
    // Tweet container selectors (ordered by reliability)
    tweet: [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="cellInnerDiv"] article',
      'div[data-testid="tweetDetail"]'
    ],
    // Action bar selectors
    actionBar: [
      '[role="group"][id]',
      '[role="group"]:has(> div > button)',
      'article [role="group"]'
    ],
    // Tweet text selectors
    tweetText: [
      '[data-testid="tweetText"]',
      '[lang][dir="auto"]',
      'article div[lang]'
    ],
    // User name container selectors
    userName: [
      '[data-testid="User-Name"]',
      'a[role="link"][href^="/"]:has(span)'
    ],
    // Time/permalink selectors
    timeLink: [
      'a[href*="/status/"] time',
      'time[datetime]'
    ]
  };

  // ============================================================
  // Selector Utilities
  // ============================================================

  function queryWithFallbacks(element, selectors) {
    for (const selector of selectors) {
      try {
        const result = element.querySelector(selector);
        if (result) return result;
      } catch (e) {
        // Selector might be invalid in older browsers, continue
      }
    }
    return null;
  }

  function queryAllWithFallbacks(root, selectors) {
    for (const selector of selectors) {
      try {
        const results = root.querySelectorAll(selector);
        if (results.length > 0) return results;
      } catch (e) {
        // Continue to next selector
      }
    }
    return [];
  }

  // ============================================================
  // Core Functions
  // ============================================================

  function init() {
    processTweets();

    const observer = new MutationObserver(debounce(processTweets, 100));
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Re-process on navigation (SPA route changes)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(processTweets, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function processTweets() {
    const tweets = queryAllWithFallbacks(document, SELECTORS.tweet);

    tweets.forEach(tweet => {
      if (tweet.hasAttribute(PROCESSED_ATTR)) return;

      const tweetId = extractTweetId(tweet);
      if (!tweetId) return;

      tweet.setAttribute(PROCESSED_ATTR, 'true');

      const actionBar = queryWithFallbacks(tweet, SELECTORS.actionBar);
      if (!actionBar) return;

      if (actionBar.querySelector(`.${BUTTON_CLASS}`)) return;

      injectButton(tweet, actionBar, tweetId);
    });
  }

  function extractTweetId(tweetElement) {
    // Strategy 1: Find time link with status URL
    const timeEl = queryWithFallbacks(tweetElement, SELECTORS.timeLink);
    if (timeEl) {
      const link = timeEl.closest('a');
      if (link) {
        const match = link.href.match(/\/status\/(\d+)/);
        if (match) return match[1];
      }
    }

    // Strategy 2: Any status link in the tweet
    const statusLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
    for (const link of statusLinks) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    // Strategy 3: Current URL for single tweet pages
    const urlMatch = window.location.href.match(/\/status\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    // Strategy 4: Look for data attributes that might contain tweet ID
    const dataId = tweetElement.closest('[data-tweet-id]')?.getAttribute('data-tweet-id');
    if (dataId) return dataId;

    return null;
  }

  function extractAuthor(tweetElement) {
    // Strategy 1: Look for user profile links
    const userLinks = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of userLinks) {
      const href = link.getAttribute('href');
      if (href && /^\/[a-zA-Z0-9_]{1,15}$/.test(href)) {
        return href.substring(1);
      }
    }

    // Strategy 2: User-Name testid
    const userNameEl = queryWithFallbacks(tweetElement, SELECTORS.userName);
    if (userNameEl) {
      const handleEl = userNameEl.querySelector('a[href^="/"]');
      if (handleEl) {
        const href = handleEl.getAttribute('href');
        if (href) {
          const match = href.match(/^\/([a-zA-Z0-9_]+)/);
          if (match) return match[1];
        }
      }
    }

    // Strategy 3: Look for @ mentions in text that match profile pattern
    const text = tweetElement.textContent;
    const atMatch = text.match(/@([a-zA-Z0-9_]{1,15})/);
    if (atMatch) return atMatch[1];

    return 'unknown';
  }

  function extractTweetText(tweetElement) {
    const textEl = queryWithFallbacks(tweetElement, SELECTORS.tweetText);
    if (textEl) {
      return textEl.innerText.trim();
    }

    // Fallback: Look for the main text content
    const langDiv = tweetElement.querySelector('div[lang]');
    if (langDiv) {
      return langDiv.innerText.trim();
    }

    return '';
  }

  function injectButton(tweetElement, actionBar, tweetId) {
    // Create button container matching Twitter's style
    const container = document.createElement('div');
    container.className = `${BUTTON_CLASS}-container`;
    container.style.cssText = 'display: flex; align-items: center; margin-left: 4px;';

    const button = document.createElement('button');
    button.className = BUTTON_CLASS;
    button.setAttribute('data-tweet-id', tweetId);
    button.innerHTML = getBookmarkIcon();
    button.title = 'Save to Read Later';

    // Check if already saved
    checkIfSaved(tweetId).then(saved => {
      if (saved) {
        button.classList.add('trl-saved');
        button.title = 'Already Saved';
        button.innerHTML = getBookmarkFilledIcon();
      }
    });

    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (button.classList.contains('trl-saved')) {
        showToast('Already saved!');
        return;
      }

      if (button.classList.contains('trl-saving')) {
        return;
      }

      button.classList.add('trl-saving');
      button.innerHTML = getLoadingIcon();

      const tweet = {
        tweetId: tweetId,
        url: `https://x.com/i/status/${tweetId}`,
        author: extractAuthor(tweetElement),
        text: extractTweetText(tweetElement)
      };

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'saveTweet',
          tweet: tweet
        });

        if (response.success) {
          button.classList.remove('trl-saving');
          button.classList.add('trl-saved');
          button.innerHTML = getBookmarkFilledIcon();
          button.title = 'Saved!';
          showToast('Tweet saved!');
        } else if (response.reason === 'duplicate') {
          button.classList.remove('trl-saving');
          button.classList.add('trl-saved');
          button.innerHTML = getBookmarkFilledIcon();
          button.title = 'Already Saved';
          showToast('Already saved!');
        }
      } catch (error) {
        console.error('Failed to save tweet:', error);
        button.classList.remove('trl-saving');
        button.innerHTML = getBookmarkIcon();
        showToast('Failed to save');
      }
    });

    container.appendChild(button);
    actionBar.appendChild(container);
  }

  async function checkIfSaved(tweetId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkTweetExists',
        tweetId: tweetId
      });
      return response.exists;
    } catch {
      return false;
    }
  }

  function getBookmarkIcon() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
    </svg>`;
  }

  function getBookmarkFilledIcon() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
    </svg>`;
  }

  function getLoadingIcon() {
    return `<svg viewBox="0 0 24 24" width="18" height="18" class="trl-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 70"/>
    </svg>`;
  }

  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.trl-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'trl-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('trl-toast-show');
    });

    setTimeout(() => {
      toast.classList.remove('trl-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
