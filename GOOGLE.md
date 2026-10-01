# How to get DebateResearcher on Google

Google does **not** automatically know your site exists. Follow these steps **after** your site is live on Render.

Your public URL: **https://debateresearcher.onrender.com**

---

## Step 1 — Deploy the site first

Google can only index **public** websites. Finish Render deploy first:

https://render.com/deploy?repo=https://github.com/xiao1dian/debateresearcher

Open that URL in a browser and confirm the homepage loads (not "Not found").

---

## Step 2 — Google Search Console (most important)

1. Go to **[Google Search Console](https://search.google.com/search-console)**

2. Click **Add property** → choose **URL prefix**

3. Enter:
   ```
   https://debateresearcher.onrender.com
   ```

4. **Verify ownership** — easiest method:
   - Choose **HTML tag**
   - Copy the meta tag Google gives you
   - Add it to `templates/index.html` (or ask Cursor to add it)
   - Redeploy on Render
   - Click **Verify** in Search Console

5. After verified, go to **Sitemaps** (left menu)

6. Submit this URL:
   ```
   sitemap.xml
   ```
   (Google will read `https://debateresearcher.onrender.com/sitemap.xml`)

7. Click **URL Inspection** → paste your homepage URL → **Request indexing**

---

## Step 3 — What people should search

| Search term | Likely to show up? |
|-------------|-------------------|
| `DebateResearcher` | ✅ Best chance (unique name) |
| `debate researcher website` | ⚠️ Takes time, competitive |
| `debate research tool` | ⚠️ Harder, many competitors |

**Tip:** A unique name like **DebateResearcher** is much easier to rank for than generic phrases.

---

## Step 4 — Help Google trust your site

- **Share the link** on social media, Discord, debate club chats
- **Link from GitHub** README (already done)
- **Keep the site online** — Render free tier sleeps after inactivity; first visit may be slow
- **Don't expect instant results** — usually **1–4 weeks**, sometimes longer for new sites

---

## Step 5 — Check if Google indexed you

Search in Google:
```
site:debateresearcher.onrender.com
```

If pages appear → Google has indexed your site.

---

## Optional — Custom domain (better for Google long-term)

Buying **debateresearcher.com** (~$10/year) and connecting it on Render helps people find and remember you. Google ranks custom domains slightly better than `.onrender.com` subdomains.

---

## Timeline (realistic)

| When | What happens |
|------|----------------|
| Day 0 | Deploy + submit to Search Console |
| Day 1–7 | Google crawls your site |
| Week 2–4 | May appear for "DebateResearcher" |
| Month 2+ | May appear for broader debate keywords |

Google chooses what to show — no one can guarantee #1 ranking.
