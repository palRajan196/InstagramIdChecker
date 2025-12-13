import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
const PORT = 10000;
const BATCH_SIZE = 10;

// ---------------- CORS ----------------
app.use(cors());
app.use(express.json());

// ---------------- ROOT ----------------
app.get("/", (req, res) => {
  res.send("✅ Instagram Checker Backend (Batch Mode)");
});

// ---------------- CHECK FUNCTION ----------------
async function checkInstagram(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000, // ⬅ increase timeout
    });

    // ⏳ Allow Instagram JS to hydrate
    await page.waitForTimeout(4000);

    // 🧠 Wait until either content OR error appears
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          text.includes("isn't available") ||
          text.includes("page not found") ||
          document.querySelector("time") ||
          document.querySelector("article")
        );
      },
      { timeout: 15000 }
    ).catch(() => {}); // don't crash if timeout

    const result = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();

      // ❌ DEAD
      if (
        text.includes("sorry, this page isn't available") ||
        text.includes("this page isn't available") ||
        text.includes("page not found") ||
        text.includes("the link you followed may be broken") ||
        text.includes("post isn't available")
      ) {
        return "Dead ❌";
      }

      // 🔒 PRIVATE
      if (text.includes("this account is private")) {
        return "Private 🔒";
      }

      const timeTag = document.querySelector("time");
      const article = document.querySelector("article");

      // ✅ ACTIVE requires BOTH
      if (timeTag && article) {
        return "Active ✅";
      }

      return "Unknown ❓";
    });

    return result;
  } catch (err) {
    console.error("Check failed:", url);
    return "Failed ❌";
  }
}


// ---------------- API ----------------
app.post("/api/check", async (req, res) => {
  const { urls } = req.body;

  if (!Array.isArray(urls)) {
    return res.status(400).json({ error: "URLs must be an array" });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox"],
  });

  const results = [];

  try {
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);

      // open 10 pages at once
      const pages = await Promise.all(
        batch.map(async () => {
          const page = await browser.newPage();
          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120"
          );
          return page;
        })
      );

      const batchResults = await Promise.all(
        pages.map((page, index) =>
          checkInstagram(page, batch[index])
        )
      );

      // close pages
      await Promise.all(pages.map((p) => p.close()));

      // store results
      batch.forEach((url, index) => {
        results.push({
          url,
          status: batchResults[index],
          checkedAt: new Date().toLocaleString(),
        });
      });

      console.log(
        `✅ Completed batch ${i / BATCH_SIZE + 1} / ${Math.ceil(
          urls.length / BATCH_SIZE
        )}`
      );
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Batch processing failed" });
  } finally {
    await browser.close();
  }
});

// ---------------- START ----------------
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
