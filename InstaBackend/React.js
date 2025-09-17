import express from "express";
import fetch from "node-fetch";
import pLimit from "p-limit";
import ExcelJS from "exceljs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let progressData = {
  total: 0,
  completed: 0,
  results: [],
  done: false,
  file: null,
};

// Function to check Instagram URL
async function checkInstagram(url) {
  try {
    const res = await fetch(url, { method: "GET", timeout: 5000 });
    if (res.status === 200) return "Active ✅";
    if (res.status === 404) return "Dead ❌";
    return `Error (${res.status})`;
  } catch (err) {
    return "Failed ❌";
  }
}

// Step 1: Start checking
app.post("/check-urls", async (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).send("Invalid URLs");
  }

  progressData = {
    total: urls.length,
    completed: 0,
    results: [],
    done: false,
    file: null,
  };

  const limit = pLimit(50);

  // Process in background (async, don’t block response)
  (async () => {
    await Promise.all(
      urls.map((url) =>
        limit(async () => {
          const status = await checkInstagram(url);
          progressData.results.push({
            url,
            status,
            checkedAt: new Date().toLocaleString(),
          });
          progressData.completed++;
        })
      )
    );

    // Create Excel after all done
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Results");

    worksheet.columns = [
      { header: "URL", key: "url", width: 40 },
      { header: "Status", key: "status", width: 15 },
      { header: "Checked At", key: "checkedAt", width: 25 },
    ];

    progressData.results.forEach((r) => worksheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    progressData.file = buffer.toString("base64");
    progressData.done = true;
  })();

  res.json({ message: "Started processing", total: urls.length });
});

// Step 2: Polling route
app.get("/check-progress", (req, res) => {
  const percent =
    progressData.total > 0
      ? Math.round((progressData.completed / progressData.total) * 100)
      : 0;

  res.json({
    percent,
    done: progressData.done,
    file: progressData.done ? progressData.file : null,
  });
});

app.listen(5000, () =>
  console.log("✅ Backend running on http://localhost:5000")
);
