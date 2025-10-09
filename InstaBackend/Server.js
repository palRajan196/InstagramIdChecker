import express from "express";
import cors from "cors";

// Detect environment
const isLocal = process.platform === 'win32' || process.env.LOCAL === 'true';

let puppeteer;
let chromium;

if (isLocal) {
  // Local development (Windows/macOS) - use full Puppeteer
  puppeteer = await import('puppeteer');
} else {
  // Cloud deployment (Linux) - use puppeteer-core + @sparticuz/chromium
  puppeteer = await import('puppeteer-core');
  chromium = await import('@sparticuz/chromium');
}

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

async function checkInstagram(url) {
  let browser;
  try {
    if (isLocal) {
      browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    } else {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());

    if (
      bodyText.includes("sorry, this page isn't available") ||
      bodyText.includes("page not found") ||
      bodyText.includes("the link you followed may be broken")
    ) {
      return "Dead ❌";
    }

    const hasMedia = await page.$("video, img[src*='cdninstagram']");
    if (hasMedia) return "Active ✅";

    if (bodyText.includes("this account is private")) return "Private 🔒";

    return "Unknown ❓";
  } catch (err) {
    console.error("Error checking:", url, err);
    return "Failed ❌";
  } finally {
    if (browser) await browser.close();
  }
}

app.post("/api/check", async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Invalid input, expected an array of URLs" });
  }

  const results = [];
  for (const url of urls) {
    const status = await checkInstagram(url);
    results.push({ url, status, checkedAt: new Date().toLocaleString() });
  }

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT} (Local: ${isLocal})`);
});