// Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  await loadStats();

  // Open library button
  document.getElementById('open-library').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/library/library.html') });
    window.close();
  });
});

async function loadStats() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'listTweets' });
    if (response.success) {
      const tweets = response.tweets;
      const unreadCount = tweets.filter(t => t.status === 'unread').length;

      document.getElementById('unread-count').textContent = unreadCount;
      document.getElementById('total-count').textContent = tweets.length;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}
