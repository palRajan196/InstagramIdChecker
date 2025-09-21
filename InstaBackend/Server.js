// Server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Load cookies if you want to access private accounts
let cookies = [];
try {
  cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf8"));
} catch {
  console.warn("No cookies.json found, private accounts may return Unknown ❓.");
}

// Check Instagram URL
async function checkInstagram(url, browser) {
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    if (cookies.length) await page.setCookie(...cookies);

    // Go to URL
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    if (!response || response.status() === 404) {
      await page.close();
      return "Dead ❌";
    }

    // Wait for content or error container
    try {
      await page.waitForSelector("article, video, .error-container", { timeout: 5000 });
    } catch {
      await page.close();
      return "Unknown ❓";
    }

    // Detect status based on elements
    const status = await page.evaluate(() => {
      if (document.querySelector("article") || document.querySelector("video")) return "Active ✅";
      if (document.body.innerText.includes("Sorry, this page isn’t available") || document.body.innerText.includes("Page Not Found"))
        return "Dead ❌";
      if (document.body.innerText.includes("This Account is Private")) return "Private 🔒";
      return "Unknown ❓";
    });

    await page.close();
    return status;
  } catch (err) {
    if (page) await page.close();
    return "Failed ❌";
  }
}

// Process URLs in batches
async function processInBatches(urls, batchSize = 5) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const status = await checkInstagram(url, browser);
        return { url, status, checkedAt: new Date().toLocaleString() };
      })
    );
    results.push(...batchResults);
  }

  await browser.close();
  return results;
}

// API endpoint
app.post("/api/check", async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) return res.status(400).json({ error: "Invalid request, expected 'urls' array." });

    const results = await processInBatches(urls, 5);
    res.json(results);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
