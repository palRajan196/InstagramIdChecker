// Server.js (Backend)
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Function to check Instagram URL with Puppeteer
async function checkInstagram(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Check for dead/error text
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    if (
      bodyText.includes("sorry, this page isn't available") ||
      bodyText.includes("page not found") ||
      bodyText.includes("the link you followed may be broken")
    ) {
      return "Dead ❌";
    }

    // Wait if a video/image container exists
    const hasMedia = await page.$("video, img[src*='cdninstagram']");
    if (hasMedia) {
      return "Active ✅";
    }

    // Private account message
    if (bodyText.includes("this account is private")) {
      return "Private 🔒";
    }

    return "Unknown ❓";
  } catch (err) {
    return "Failed ❌";
  } finally {
    if (browser) await browser.close();
  }
}

// API endpoint
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
  console.log(`✅ Server running on port ${PORT}`);
});
