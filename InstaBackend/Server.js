import express from "express";
import cors from "cors";

const isLocal = process.platform === "win32" || process.env.LOCAL === "true";

let puppeteer;
let chromium;

if (isLocal) {
  puppeteer = await import("puppeteer");
} else {
  puppeteer = await import("puppeteer-core");
  chromium = await import("@sparticuz/chromium");
}

const app = express();
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  "http://localhost:5173", // for local dev
  "https://instagramidchecker-frontend.onrender.com", // ✅ your deployed frontend URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.options("*", cors()); // <-- PASTE THIS LINE HERE
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ Instagram Checker Backend is Running!");
});

async function checkInstagram(url) {
  let browser;
  try {
    const launchOptions = isLocal
      ? {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        }
      : {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: chromium.executablePath || (await chromium.executablePath),
          headless: chromium.headless,
        };

    browser = await puppeteer.launch(launchOptions);
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

app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT} (Local: ${isLocal ? "true" : "false"})`)
);