// Server.js
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

/**
 * Detect Instagram post status
 */
async function checkInstagram(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Grab meta + body
    const meta = await page.evaluate(() => {
      const getMeta = (name) =>
        document.querySelector(`meta[property='${name}']`)?.content || null;

      const jsonLd = Array.from(
        document.querySelectorAll("script[type='application/ld+json']")
      )
        .map((el) => {
          try {
            return JSON.parse(el.innerText);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      return {
        ogUrl: getMeta("og:url"),
        ogType: getMeta("og:type"),
        ogVideo: getMeta("og:video"),
        ogImage: getMeta("og:image"),
        title: document.title,
        bodyText: document.body.innerText.toLowerCase(),
        jsonLd,
      };
    });

    // ❌ Dead phrases
    if (
      meta.bodyText.includes("sorry, this page isn't available") ||
      meta.bodyText.includes("page not found") ||
      meta.bodyText.includes("link you followed may be broken") ||
      meta.bodyText.includes("content not available")
    ) {
      return "Dead ❌";
    }

    // 🔒 Private
    if (
      meta.title?.toLowerCase().includes("private") ||
      meta.bodyText.includes("this account is private")
    ) {
      return "Private 🔒";
    }

    // ✅ Active if video/image exists
    if (meta.ogType === "video.other" && (meta.ogVideo || meta.ogImage)) {
      return "Active ✅";
    }

    // ✅ Active if JSON-LD video
    const hasVideoJsonLd = meta.jsonLd.some(
      (obj) => obj["@type"]?.toLowerCase() === "videoobject"
    );
    if (hasVideoJsonLd) {
      return "Active ✅";
    }

    // ❌ Dead if og:url exists but no media
    if (meta.ogUrl && !meta.ogVideo && !meta.ogImage && !hasVideoJsonLd) {
      return "Dead ❌";
    }

    // ❓ Fallback
    return "Unknown ❓";
  } catch (err) {
    console.error("Error checking:", url, err.message);
    return "Failed ❌";
  }
}

/**
 * POST /api/check → checks multiple URLs
 */
app.post("/api/check", async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Invalid input, expected array of URLs" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const results = [];
    for (const url of urls) {
      const status = await checkInstagram(page, url);
      results.push({
        url,
        status,
        checkedAt: new Date().toLocaleString(),
      });
    }

    await browser.close();
    res.json(results);
  } catch (err) {
    if (browser) await browser.close();
    console.error("Server error:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
