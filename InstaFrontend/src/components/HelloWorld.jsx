import React, { useState } from "react";

export default function HelloWorld() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);

  const handleCheck = async () => {
    try {
      // split by newline so user can paste multiple links
      const urls = input.split("\n").map(u => u.trim()).filter(u => u);
      const res = await fetch("https://instagramidchecker.onrender.com/api/check", {
      //const res = await fetch("http://localhost:10000/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }), // ✅ must send { urls: [...] }
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Error:", err);
      alert("Error checking URLs");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Instagram Link Checker</h2>
      <textarea
        rows="6"
        cols="60"
        placeholder="Paste Instagram URLs (one per line)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <br />
      <button onClick={handleCheck}>Proceed</button>

      <h3>Results:</h3>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>URL</th>
            <th>Status</th>
            <th>Checked At</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td>{r.url}</td>
              <td>{r.status}</td>
              <td>{r.checkedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
