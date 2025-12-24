import React, { useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../Style/Style.css";

export default function InstagramBulkChecker() {
  const [urls, setUrls] = useState("");
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");

  const startTimeRef = useRef(null);

  // 🔁 Change when deployed
  const API_URL = "http://localhost:10000/api/check";
  // const API_URL = "https://instagramidchecker.onrender.com/api/check";

  // ---------------- START CHECK ----------------
  const handleCheck = async () => {
    const urlList = urls.split(/\n|\s+/).filter(Boolean);
    if (urlList.length === 0) {
      alert("Please enter some URLs");
      return;
    }

    setIsChecking(true);
    setResults([]);
    setProgress(0);
    setEta("");
    startTimeRef.current = Date.now();

    const batchSize = 10;      // URLs per request
    const concurrency = 5;     // Parallel API calls

    // Create batches
    const batches = [];
    for (let i = 0; i < urlList.length; i += batchSize) {
      batches.push(urlList.slice(i, i + batchSize));
    }

    let completed = 0;

    async function processBatch(batch) {
      try {
        const res = await axios.post(API_URL, { urls: batch });
        setResults(prev => [...prev, ...res.data]);
      } catch (err) {
        console.error("Batch failed", err);
      } finally {
        completed++;

        const elapsedMs = Date.now() - startTimeRef.current;
        const avgPerBatch = elapsedMs / completed;
        const remainingBatches = batches.length - completed;
        const remainingMs = remainingBatches * avgPerBatch;

        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        setEta(`${minutes} min ${seconds} sec`);
        setProgress(Math.round((completed / batches.length) * 100));
      }
    }

    // Concurrency controller
    const runBatches = async () => {
      const queue = [...batches];
      const running = [];

      while (queue.length > 0) {
        while (running.length < concurrency && queue.length > 0) {
          const batch = queue.shift();
          const promise = processBatch(batch).then(() => {
            running.splice(running.indexOf(promise), 1);
          });
          running.push(promise);
        }
        await Promise.race(running);
      }
      await Promise.all(running);
    };

    await runBatches();
    setIsChecking(false);
  };

  // ---------------- EXCEL DOWNLOAD ----------------
  const handleDownloadExcel = () => {
    if (results.length === 0) return;

    const formatted = results.map((r, i) => ({
      "S.No": i + 1,
      "Instagram URL": r.url,
      "Status": r.status,
      "Checked At": r.checkedAt,
    }));

    const ws = XLSX.utils.json_to_sheet(formatted);
    ws["!cols"] = [
      { wch: 8 },
      { wch: 50 },
      { wch: 15 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    XLSX.writeFile(wb, "Instagram_Check_Results.xlsx");
  };

  // ---------------- CSV DOWNLOAD ----------------
  const handleDownloadCSV = () => {
    if (results.length === 0) return;

    const headers = ["S.No", "Instagram URL", "Status", "Checked At"];
    const rows = results.map((r, i) => [
      i + 1,
      r.url,
      r.status,
      r.checkedAt,
    ]);

    const csv =
      headers.join(",") +
      "\n" +
      rows.map(row => row.map(v => `"${v}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Instagram_Check_Results.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // ---------------- UI ----------------
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="Heading">Instagram Bulk URL Checker</h1>

      <textarea
        id="textArea"
        value={urls}
        onChange={e => setUrls(e.target.value)}
        placeholder="Paste up to 3500 Instagram URLs (one per line)"
        className="w-full h-64 border rounded-lg p-3 text-sm"
      />

      <div className="flex gap-4 mt-4 flex-wrap">
        <button
          onClick={handleCheck}
          disabled={isChecking}
          className={`px-4 py-2 rounded-lg text-white ${
            isChecking ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isChecking ? "Checking..." : "Start Checking"}
        </button>

        <button
          onClick={handleDownloadExcel}
          disabled={results.length === 0}
          className={`px-4 py-2 rounded-lg text-white ${
            results.length === 0
              ? "bg-gray-400"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          Download Excel
        </button>

        <button
          onClick={handleDownloadCSV}
          disabled={results.length === 0}
          className={`px-4 py-2 rounded-lg text-white ${
            results.length === 0
              ? "bg-gray-400"
              : "bg-yellow-600 hover:bg-yellow-700"
          }`}
        >
          Download CSV
        </button>
      </div>

      {isChecking && (
        <>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 text-sm text-center text-gray-700">
            ⏳ ETA: {eta || "Calculating..."} | Progress: {progress}%
          </div>
        </>
      )}

      {!isChecking && progress === 100 && (
        <div className="mt-2 text-sm text-center text-green-700">
          ✅ Completed Successfully
        </div>
      )}

      <div className="mt-6">
        <p className="font-semibold mb-2">
          Checked Results ({results.length})
        </p>

        <div className="max-h-80 overflow-auto border rounded-lg p-2 text-sm">
          {results.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-1">
              <span className="truncate w-3/4">{r.url}</span>
              <span>"     "{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
