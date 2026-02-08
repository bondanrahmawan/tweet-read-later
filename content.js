// Content Script - Inject "Read Later" button into tweets

(function() {
  'use strict';

  const BUTTON_CLASS = 'trl-save-button';
  const PROCESSED_ATTR = 'data-trl-processed';

  // Track processed tweets to avoid duplicate buttons
  const processedTweets = new Set();

  // Initialize
  function init() {
    // Process existing tweets
    processTweets();

    // Watch for new tweets (infinite scroll, navigation)
    const observer = new MutationObserver(debounce(processTweets, 100));
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function processTweets() {
    // Find all tweet articles
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');

    tweets.forEach(tweet => {
      if (tweet.hasAttribute(PROCESSED_ATTR)) return;

      const tweetId = extractTweetId(tweet);
      if (!tweetId) return;

      // Mark as processed
      tweet.setAttribute(PROCESSED_ATTR, 'true');

      // Find the action bar (like, retweet, reply buttons)
      const actionBar = tweet.querySelector('[role="group"]');
      if (!actionBar) return;

      // Check if button already exists
      if (actionBar.querySelector(`.${BUTTON_CLASS}`)) return;

      // Create and inject button
      injectButton(tweet, actionBar, tweetId);
    });
  }

  function extractTweetId(tweetElement) {
    // Try to find tweet ID from links within the tweet
    const timeLink = tweetElement.querySelector('a[href*="/status/"] time');
    if (timeLink) {
      const link = timeLink.closest('a');
      if (link) {
        const match = link.href.match(/\/status\/(\d+)/);
        if (match) return match[1];
      }
    }

    // Fallback: look for any status link
    const statusLinks = tweetElement.querySelectorAll('a[href*="/status/"]');
    for (const link of statusLinks) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }

    // Last resort: check current URL if on single tweet page
    const urlMatch = window.location.href.match(/\/status\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    return null;
  }

  function extractAuthor(tweetElement) {
    // Look for the author handle
    const userLinks = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of userLinks) {
      const href = link.getAttribute('href');
      if (href && href.match(/^\/[a-zA-Z0-9_]+$/) && !href.includes('/status/')) {
        return href.substring(1);
      }
    }

    // Try data-testid approach
    const userNameEl = tweetElement.querySelector('[data-testid="User-Name"]');
    if (userNameEl) {
      const handleEl = userNameEl.querySelector('a[href^="/"]');
      if (handleEl) {
        const href = handleEl.getAttribute('href');
        if (href) return href.substring(1).split('/')[0];
      }
    }

    return 'unknown';
  }

  function extractTweetText(tweetElement) {
    const textEl = tweetElement.querySelector('[data-testid="tweetText"]');
    if (textEl) {
      return textEl.innerText.trim();
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
