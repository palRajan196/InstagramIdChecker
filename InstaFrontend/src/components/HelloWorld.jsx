import { useState } from "react";
import React from "react";
function App() {
  const [urlsText, setUrlsText] = useState(""); // Copy-paste input
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    const urlArray = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urlArray.length === 0) {
      alert("Please paste some URLs first!");
      return;
    }

    setProcessing(true);
    setProgress(0);

    // Step 1: Start checking
    await fetch("http://localhost:5000/check-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: urlArray }),
    });

    // Step 2: Poll backend every second for progress
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:5000/check-progress");
        const data = await res.json();

        setProgress(data.percent);

        if (data.file) {
          // Step 3: Convert Base64 -> Excel Blob -> Download
          const byteCharacters = atob(data.file);
          const byteNumbers = Array.from(byteCharacters, (c) => c.charCodeAt(0));
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          const link = document.createElement("a");
          link.href = window.URL.createObjectURL(blob);
          link.download = "Instagram_Check_Results.xlsx";
          link.click();

          clearInterval(interval);
          setProcessing(false);
          setProgress(0);
        }
      } catch (err) {
        console.error("Polling failed:", err);
        clearInterval(interval);
        setProcessing(false);
      }
    }, 1000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Bulk Instagram URL Checker</h1>

      {/* Copy-paste input */}
      <textarea
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        rows={10}
        placeholder="Paste Instagram URLs here (one per line)"
        className="w-full p-2 border rounded mb-4"
      />

      <button
        onClick={handleProcess}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={urlsText.trim() === "" || processing}
      >
        {processing ? "Processing..." : "Process & Download Excel"}
      </button>

      {/* Progress Bar */}
      {processing && (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full text-xs text-white text-center"
            style={{ width: `${progress}%` }}
          >
            {progress}%
          </div>
        </div>
      )}

      {!processing && urlsText.trim() !== "" && (
        <p className="mt-3 text-gray-600">
          ✅ {urlsText.split("\n").filter((u) => u.trim() !== "").length} URLs ready
        </p>
      )}
    </div>
  );
}

export default App;
