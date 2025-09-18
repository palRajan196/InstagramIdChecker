// backend/index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

/**
 * Function to check if an Instagram URL is Active, Dead, Private, etc.
 */
async function checkInstagram(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const html = await res.text();
    const l = html.toLowerCase();

    // If page not found
    if (res.status === 404) return "Dead ❌";

    // Known dead phrases
    const deadPhrases = [
      "sorry, this page isn't available",
      "page not found",
      "the link you followed may be broken",
      "content not available",
      "page was removed",
    ];
    for (const phrase of deadPhrases) {
      if (l.includes(phrase)) {
        return "Dead ❌";
      }
    }

    // Private account
    if (l.includes("this account is private")) {
      return "Private 🔒";
    }

    // Detect Instagram meta tags
    const hasOgVideo =
      l.includes("og:video") || l.includes("og:video:secure_url");
    const hasJsonLdVideo = l.includes('"@type":"videoobject"');
    const hasOgUrl = l.includes("og:url");

    // ✅ Active post rule
    if (hasOgUrl && (hasOgVideo || hasJsonLdVideo)) {
      return "Active ✅";
    }

    // ❌ If og:url exists but no video meta → Dead
    if (hasOgUrl && !hasOgVideo && !hasJsonLdVideo) {
      return "Dead ❌";
    }

    // Default → Dead
    return "Dead ❌";
  } catch (err) {
    if (err.name === "AbortError") {
      return "Failed (timeout) ❌";
    }
    return "Failed ❌";
  }
}

/**
 * POST API: check multiple Instagram URLs
 */
app.post("/api/check", async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Invalid input, expected an array of URLs" });
  }

  const results = [];
  for (const url of urls) {
    const status = await checkInstagram(url);
    results.push({
      url,
      status,
      checkedAt: new Date().toLocaleString(),
    });
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
