import express from "express";
import cors from "cors";
import fs from "fs";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Load Instagram cookies if available
let cookies = [];
try {
  if (fs.existsSync("./cookies.json")) {
    cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf8"));
  }
} catch (err) {
  console.error("⚠️ Could not load cookies.json:", err.message);
}

// Launch Puppeteer with correct Chrome path
async function launchBrowser() {
  return await puppeteer.launch({
    headless: true,
    executablePath: puppeteer.executablePath(), // ✅ Works on Render
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-infobars",
      "--window-size=1920,1080",
    ],
  });
}

// Check Instagram page
async function checkInstagram(url, browser) {
  let page;
  try {
    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    if (cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const status = await page.evaluate(() => {
      if (document.querySelector("video")) return "Active ✅";
      if (
        document.body.innerText.includes("Sorry, this page isn’t available") ||
        document.body.innerText.includes("Page Not Found")
      )
        return "Dead ❌";
      if (document.body.innerText.includes("This Account is Private"))
        return "Private 🔒";
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
  const browser = await launchBrowser();
  const results = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`🚀 Checking ${batch.length} URLs...`);

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
    if (!urls || !Array.isArray(urls)) {
      return res
        .status(400)
        .json({ error: "Invalid request, expected 'urls' array." });
    }

    const results = await processInBatches(urls, 5);
    res.json(results);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
