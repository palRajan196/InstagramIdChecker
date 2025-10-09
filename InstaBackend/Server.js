import express from "express";
import cors from "cors";

let puppeteer;
let chromium;

// 🧠 Use normal puppeteer locally, puppeteer-core + chromium in production
if (process.env.NODE_ENV === "production") {
  puppeteer = (await import("puppeteer-core")).default;
  chromium = (await import("@sparticuz/chromium")).default;
} else {
  puppeteer = (await import("puppeteer")).default;
}

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ✅ Function to check Instagram URL
async function checkInstagram(url) {
  let browser;
  try {
    let launchOptions;

    if (process.env.NODE_ENV === "production") {
      // For Render, Railway, Vercel, etc.
      launchOptions = {
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--single-process",
          "--no-zygote",
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      };
    } else {
      // For local development
      launchOptions = {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 40000 });

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());

    if (
      bodyText.includes("sorry, this page isn't available") ||
      bodyText.includes("page not found") ||
      bodyText.includes("the link you followed may be broken")
    ) {
      return "Dead ❌";
    }

    if (bodyText.includes("this account is private")) {
      return "Private 🔒";
    }

    const hasMedia = await page.$("video, img[src*='cdninstagram']");
    if (hasMedia) {
      return "Active ✅";
    }

    return "Unknown ❓";
  } catch (err) {
    console.error("Error checking:", url, err.message);
    return `Failed ❌ (${err.message})`;
  } finally {
    if (browser) await browser.close();
  }
}

// ✅ POST API endpoint for bulk checking
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

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
