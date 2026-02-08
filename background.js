// Background Service Worker - Central Storage Manager

const STORAGE_KEY = 'tweets';

// Initialize storage if needed
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  if (!data[STORAGE_KEY]) {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
  }
});

// Message handler for all storage operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request).then(sendResponse).catch(err => {
    console.error('Background error:', err);
    sendResponse({ success: false, error: err.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(request) {
  switch (request.action) {
    case 'saveTweet':
      return await saveTweet(request.tweet);
    case 'listTweets':
      return await listTweets();
    case 'deleteTweet':
      return await deleteTweet(request.tweetId);
    case 'updateTweet':
      return await updateTweet(request.tweetId, request.updates);
    case 'checkTweetExists':
      return await checkTweetExists(request.tweetId);
    case 'importTweets':
      return await importTweets(request.tweets);
    case 'getUnreadCount':
      return await getUnreadCount();
    default:
      throw new Error('Unknown action: ' + request.action);
  }
}

async function saveTweet(tweet) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];

  // Check for duplicate
  const exists = tweets.some(t => t.tweetId === tweet.tweetId);
  if (exists) {
    return { success: false, reason: 'duplicate' };
  }

  // Add new tweet with defaults
  const newTweet = {
    tweetId: tweet.tweetId,
    url: tweet.url,
    author: tweet.author,
    text: tweet.text,
    savedAt: new Date().toISOString(),
    tags: tweet.tags || [],
    note: tweet.note || '',
    status: 'unread'
  };

  tweets.unshift(newTweet);
  await chrome.storage.local.set({ [STORAGE_KEY]: tweets });

  return { success: true, tweet: newTweet };
}

async function listTweets() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return { success: true, tweets: data[STORAGE_KEY] || [] };
}

async function deleteTweet(tweetId) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];

  const index = tweets.findIndex(t => t.tweetId === tweetId);
  if (index === -1) {
    return { success: false, reason: 'not_found' };
  }

  tweets.splice(index, 1);
  await chrome.storage.local.set({ [STORAGE_KEY]: tweets });

  return { success: true };
}

async function updateTweet(tweetId, updates) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];

  const index = tweets.findIndex(t => t.tweetId === tweetId);
  if (index === -1) {
    return { success: false, reason: 'not_found' };
  }

  // Only allow updating specific fields
  const allowedFields = ['tags', 'note', 'status'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      tweets[index][field] = updates[field];
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: tweets });

  return { success: true, tweet: tweets[index] };
}

async function checkTweetExists(tweetId) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];
  const exists = tweets.some(t => t.tweetId === tweetId);
  return { success: true, exists };
}

async function importTweets(importedTweets) {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];

  let imported = 0;
  let skipped = 0;

  for (const tweet of importedTweets) {
    const exists = tweets.some(t => t.tweetId === tweet.tweetId);
    if (exists) {
      skipped++;
      continue;
    }

    // Validate and normalize imported tweet
    const normalizedTweet = {
      tweetId: tweet.tweetId,
      url: tweet.url || '',
      author: tweet.author || '',
      text: tweet.text || '',
      savedAt: tweet.savedAt || new Date().toISOString(),
      tags: Array.isArray(tweet.tags) ? tweet.tags : [],
      note: tweet.note || '',
      status: tweet.status === 'archived' ? 'archived' : 'unread'
    };

    tweets.push(normalizedTweet);
    imported++;
  }

  // Sort by savedAt descending
  tweets.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  await chrome.storage.local.set({ [STORAGE_KEY]: tweets });

  return { success: true, imported, skipped };
}

async function getUnreadCount() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const tweets = data[STORAGE_KEY] || [];
  const count = tweets.filter(t => t.status === 'unread').length;
  return { success: true, count };
}
