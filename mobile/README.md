# Mobile View Setup Guide

This guide explains how to set up a mobile-friendly, read-only view of your saved tweets using GitHub Pages.

---

## IMPORTANT: Privacy Warning

> **YOUR SAVED TWEETS CONTAIN PERSONAL DATA**
>
> The `tweets.json` file contains all your saved tweets, including:
> - Tweet content and authors you follow
> - Your personal notes and tags
> - Timestamps of when you saved each tweet
>
> **You MUST use a PRIVATE GitHub repository.**
>
> If you use a public repository:
> - Anyone on the internet can find and read your saved tweets
> - Search engines may index your data
> - Your reading habits and interests become publicly visible
> - Your notes (which may contain personal thoughts) are exposed
>
> **GitHub Pages works with private repositories** on GitHub Pro, Team, and Enterprise plans. Free accounts can only use GitHub Pages with public repositories.
>
> If you have a free GitHub account, consider:
> 1. Upgrading to GitHub Pro ($4/month) for private Pages
> 2. Self-hosting on your own server
> 3. Not using this mobile feature

---

## Overview

This feature creates a simple, read-only web page that displays your saved tweets. You can access it from any device with a web browser, including your phone.

**How it works:**
1. You export your tweets as a `tweets.json` file from the extension
2. You upload the mobile folder files along with tweets.json to GitHub
3. GitHub Pages hosts the page for you
4. You visit the page URL on your mobile device

**Limitations:**
- This is a **read-only** view - you cannot edit, delete, or archive tweets from mobile
- Updates are **manual** - you must re-export and re-upload to see new tweets
- You need a GitHub account

---

## Step-by-Step Setup

### Step 1: Create a Private GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create an account)
2. Click the **+** button in the top right corner
3. Select **New repository**
4. Configure your repository:
   - **Repository name:** `my-tweet-library` (or any name you prefer)
   - **Description:** (optional) "My saved tweets"
   - **Visibility:** Select **Private**
   - Leave other options as default
5. Click **Create repository**

### Step 2: Enable GitHub Pages

1. In your new repository, click **Settings** (gear icon)
2. In the left sidebar, click **Pages**
3. Under "Source", select **Deploy from a branch**
4. Under "Branch", select **main** and **/ (root)**
5. Click **Save**
6. Note: GitHub Pages for private repos requires a paid GitHub plan

### Step 3: Export Your Tweets

1. Open the Tweet Read Later extension
2. Click the extension icon in Chrome
3. Click **Open Library**
4. In the library page, click the **Mobile** button in the header
5. This downloads a file named `tweets.json`
6. Save it somewhere you can find it (like your Desktop)

### Step 4: Upload Files to GitHub

Upload the contents of the `mobile/` folder plus your exported tweets:

| File | What it is |
|------|------------|
| `index.html` | The web page |
| `mobile.js` | The page functionality |
| `shared.js` | Shared utilities |
| `style.css` | The visual styling |
| `tweets.json` | Your exported tweets |

**To upload:**

1. In your GitHub repository, click **Add file** > **Upload files**
2. Drag and drop these files from the `mobile/` folder:
   - `index.html`
   - `mobile.js`
   - `shared.js`
   - `style.css`
3. Also upload your exported `tweets.json` file
4. Scroll down and click **Commit changes**

**Finding the mobile folder:**
- Look in the extension's installation directory under `mobile/`
- Or copy the files from where you cloned/downloaded the extension

### Step 5: Access Your Mobile Library

1. Go to your repository's **Settings** > **Pages**
2. You'll see a message like: "Your site is live at https://yourusername.github.io/my-tweet-library/"
3. Your mobile library URL is: `https://yourusername.github.io/my-tweet-library/` (index.html loads by default)
4. Open this URL on your phone and bookmark it!

---

## Updating Your Library

When you save new tweets and want to see them on mobile:

1. Open the extension's Library page
2. Click the **Mobile** button to export a new `tweets.json`
3. Go to your GitHub repository
4. Click on `tweets.json` in the file list
5. Click the **pencil icon** (Edit this file) or delete and re-upload
6. If editing: Replace all content with the new file's content
7. Click **Commit changes**
8. Wait 1-2 minutes for GitHub Pages to update
9. Refresh your mobile page

**Tip:** You can also use the GitHub mobile app or GitHub Desktop for easier file management.

---

## Troubleshooting

### "Could not load tweets" error
- Make sure `tweets.json` is in the same folder as `index.html`
- Check that `tweets.json` is valid JSON (no syntax errors)
- Wait a few minutes if you just uploaded - GitHub Pages needs time to deploy

### Page shows no tweets
- Verify your `tweets.json` file has content
- Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear your browser cache

### Page looks broken / unstyled
- Make sure `style.css` is uploaded
- Make sure `shared.js` is uploaded
- Check that all filenames are exactly as listed (lowercase)

### Can't enable GitHub Pages on private repo
- GitHub Pages for private repos requires a paid GitHub plan
- Options: Upgrade to GitHub Pro, use a public repo (NOT recommended), or self-host

### Changes not showing up
- GitHub Pages can take 1-5 minutes to update
- Try clearing your browser cache
- Check the repository's Actions tab for deployment status

---

## Security Best Practices

1. **Always use a private repository** for your tweet library
2. **Don't share your GitHub Pages URL** with others
3. **Regularly review** what's in your tweets.json
4. **Consider deleting sensitive tweets** from the extension before exporting
5. **Use a strong password** and enable 2FA on your GitHub account

---

## File Reference

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `index.html` | Main page structure | Only when extension updates |
| `mobile.js` | Page functionality | Only when extension updates |
| `shared.js` | Shared utilities | Only when extension updates |
| `style.css` | Visual styling | Only when extension updates |
| `tweets.json` | Your tweet data | Whenever you want to sync |

---

## FAQ

**Q: Can I edit tweets from the mobile view?**
A: No, the mobile view is read-only. Use the Chrome extension to edit tweets.

**Q: How often should I update tweets.json?**
A: Whenever you want your mobile view to reflect recent saves. Weekly or monthly is common.

**Q: Is my data sent to any servers?**
A: No. The mobile page runs entirely in your browser. It only reads the local tweets.json file.

**Q: Can I use this on iPhone/Android?**
A: Yes! It works on any device with a modern web browser.

**Q: What if I accidentally make my repo public?**
A: Immediately make it private again in Settings. Consider that your data may have been cached by search engines.
