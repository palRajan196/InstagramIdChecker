import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const isLocal =
  process.platform === "win32" ||
  process.env.LOCAL === "true";

const app = express();
const PORT = process.env.PORT || 10000;

// --------------------- CORS ---------------------
const allowedOrigins = [
  "http://localhost:5173",
  "https://instagramidchecker-frontend.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

// --------------------- ROOT ---------------------
app.get("/", (req, res) => {
  res.send("✅ Instagram Checker Backend is Running!");
});

// --------------------- PUPPETEER LOGIC ---------------------
async function checkInstagram(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const bodyText = await page.evaluate(() =>
      document.body.innerText.toLowerCase()
    );

    if (
      bodyText.includes("sorry, this page isn't available") ||
      bodyText.includes("page not found") ||
      bodyText.includes("post isn't available") ||
      bodyText.includes("the link you followed may be broken")
    ) {
      return "Dead ❌";
    }

    if (bodyText.includes("this account is private")) {
      return "Private 🔒";
    }

    const hasMedia = await page.$("video, img[src*='cdninstagram']");
    if (hasMedia) return "Active ✅";

    return "Unknown ❓";
  } catch (err) {
    console.error("Error:", err.message);
    return "Failed ❌";
  } finally {
    if (browser) await browser.close();
  }
}

// --------------------- API ---------------------
app.post("/api/check", async (req, res) => {
  const { urls } = req.body;

  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: "URLs must be an array" });
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

// --------------------- START ---------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
