// frontend/src/HelloWorld.jsx
import React, { useState } from "react";
import * as XLSX from "xlsx";

const HelloWorld = () => {
  const [urlsText, setUrlsText] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u);

    if (urls.length === 0) {
      alert("Please enter at least one Instagram URL.");
      return;
    }

    setLoading(true);
    setResults([]);
   
    
    try {
    //  const res = await fetch("http://localhost:5000/api/check", {
      const res = await fetch("https://instagramidchecker.onrender.com/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      alert("Failed to check URLs. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (results.length === 0) {
      alert("No results to download.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Instagram Status");
    XLSX.writeFile(workbook, "instagram_status.xlsx");
  };

  return (
    <div style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h2>Instagram URL Checker</h2>
      <textarea
        rows={10}
        placeholder="Paste Instagram URLs (one per line)"
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <div style={{ marginBottom: 10 }}>
        <button onClick={handleCheck} disabled={loading}>
          {loading ? "Checking..." : "Check URLs"}
        </button>
        <button
          onClick={handleDownloadExcel}
          style={{ marginLeft: 10 }}
          disabled={results.length === 0}
        >
          Download Excel
        </button>
      </div>
      <div>
        {results.length > 0 && (
          <table border="1" cellPadding="5" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>Checked At</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.url}</td>
                  <td>{r.status}</td>
                  <td>{r.checkedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default HelloWorld;
