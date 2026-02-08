// Background Service Worker - Central Storage Manager

const STORAGE_KEY = 'tweets';
const GITHUB_SETTINGS_KEY = 'githubSettings';

// ============================================================
// Storage Helpers - Centralized data access layer
// ============================================================

async function getTweets() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || [];
}

async function setTweets(tweets) {
  await chrome.storage.local.set({ [STORAGE_KEY]: tweets });
}

async function withTweets(modifier) {
  const tweets = await getTweets();
  const result = await modifier(tweets);
  if (result.save !== false) {
    await setTweets(tweets);
  }
  return result;
}

function findTweetIndex(tweets, tweetId) {
  return tweets.findIndex(t => t.tweetId === tweetId);
}

function normalizeTweet(tweet, defaults = {}) {
  return {
    tweetId: tweet.tweetId,
    url: tweet.url || defaults.url || '',
    author: tweet.author || defaults.author || '',
    text: tweet.text || defaults.text || '',
    savedAt: tweet.savedAt || defaults.savedAt || new Date().toISOString(),
    tags: Array.isArray(tweet.tags) ? tweet.tags : (defaults.tags || []),
    note: tweet.note || defaults.note || '',
    status: tweet.status === 'archived' ? 'archived' : (defaults.status || 'unread')
  };
}

// ============================================================
// Initialization
// ============================================================

chrome.runtime.onInstalled.addListener(async () => {
  const tweets = await getTweets();
  if (!tweets.length) {
    await setTweets([]);
  }
});

// ============================================================
// Message Handler
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse).catch(err => {
    console.error('Background error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true;
});

async function handleMessage(request) {
  const handlers = {
    saveTweet: () => saveTweet(request.tweet),
    listTweets: () => listTweets(),
    deleteTweet: () => deleteTweet(request.tweetId),
    updateTweet: () => updateTweet(request.tweetId, request.updates),
    checkTweetExists: () => checkTweetExists(request.tweetId),
    importTweets: () => importTweets(request.tweets),
    getUnreadCount: () => getUnreadCount(),
    saveGitHubSettings: () => saveGitHubSettings(request.settings),
    getGitHubSettings: () => getGitHubSettings(),
    syncToGitHub: () => syncToGitHub()
  };

  const handler = handlers[request.action];
  if (!handler) {
    throw new Error('Unknown action: ' + request.action);
  }
  return handler();
}

// ============================================================
// Tweet Operations
// ============================================================

async function saveTweet(tweet) {
  return withTweets(tweets => {
    if (tweets.some(t => t.tweetId === tweet.tweetId)) {
      return { success: false, reason: 'duplicate', save: false };
    }

    const newTweet = normalizeTweet(tweet);
    tweets.unshift(newTweet);
    return { success: true, tweet: newTweet };
  });
}

async function listTweets() {
  const tweets = await getTweets();
  return { success: true, tweets };
}

async function deleteTweet(tweetId) {
  return withTweets(tweets => {
    const index = findTweetIndex(tweets, tweetId);
    if (index === -1) {
      return { success: false, reason: 'not_found', save: false };
    }
    tweets.splice(index, 1);
    return { success: true };
  });
}

async function updateTweet(tweetId, updates) {
  const allowedFields = ['tags', 'note', 'status'];

  return withTweets(tweets => {
    const index = findTweetIndex(tweets, tweetId);
    if (index === -1) {
      return { success: false, reason: 'not_found', save: false };
    }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        tweets[index][field] = updates[field];
      }
    }
    return { success: true, tweet: tweets[index] };
  });
}

async function checkTweetExists(tweetId) {
  const tweets = await getTweets();
  const exists = tweets.some(t => t.tweetId === tweetId);
  return { success: true, exists };
}

async function importTweets(importedTweets) {
  return withTweets(tweets => {
    const existingIds = new Set(tweets.map(t => t.tweetId));
    let imported = 0;
    let skipped = 0;

    for (const tweet of importedTweets) {
      if (existingIds.has(tweet.tweetId)) {
        skipped++;
        continue;
      }
      tweets.push(normalizeTweet(tweet));
      existingIds.add(tweet.tweetId);
      imported++;
    }

    tweets.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    return { success: true, imported, skipped };
  });
}

async function getUnreadCount() {
  const tweets = await getTweets();
  const count = tweets.filter(t => t.status === 'unread').length;
  return { success: true, count };
}

// ============================================================
// GitHub Sync Operations
// ============================================================

async function saveGitHubSettings(settings) {
  await chrome.storage.local.set({ [GITHUB_SETTINGS_KEY]: settings });
  return { success: true };
}

async function getGitHubSettings() {
  const data = await chrome.storage.local.get(GITHUB_SETTINGS_KEY);
  return { success: true, settings: data[GITHUB_SETTINGS_KEY] || null };
}

async function syncToGitHub() {
  const data = await chrome.storage.local.get(GITHUB_SETTINGS_KEY);
  const settings = data[GITHUB_SETTINGS_KEY];

  if (!settings || !settings.token || !settings.owner || !settings.repo) {
    return { success: false, error: 'GitHub settings not configured. Click the gear icon to set up.' };
  }

  const { token, owner, repo, path } = settings;
  const filePath = path || 'mobile/tweets.json';

  const tweets = await getTweets();
  const content = JSON.stringify(tweets, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(content)));

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  // Get current file SHA (needed for updates)
  let sha = null;
  try {
    const getResponse = await fetch(apiUrl, { headers });
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    } else if (getResponse.status !== 404) {
      const errorData = await getResponse.json().catch(() => ({}));
      return { success: false, error: `GitHub API error: ${getResponse.status} - ${errorData.message || 'Unknown error'}` };
    }
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }

  // PUT the file content
  const putBody = {
    message: `Update tweets.json - ${new Date().toISOString()}`,
    content: base64Content
  };
  if (sha) {
    putBody.sha = sha;
  }

  try {
    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(putBody)
    });

    if (putResponse.ok) {
      const timestamp = new Date().toISOString();
      return { success: true, timestamp, tweetCount: tweets.length };
    }

    const errorData = await putResponse.json().catch(() => ({}));
    return { success: false, error: `GitHub API error: ${putResponse.status} - ${errorData.message || 'Unknown error'}` };
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}
