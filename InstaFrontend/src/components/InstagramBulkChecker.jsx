import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../Style/Style.css';


export default function InstagramBulkChecker() {
  const [urls, setUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  //https://instagramidchecker.onrender.com

  //onst API_URL = 'http://localhost:10000/api/check'; // Change when deployed

const API_URL = 'https://instagramidchecker.onrender.com/api/check';

  const handleCheck = async () => {
    const urlList = urls.split(/\n|\s+/).filter(Boolean);
    if (urlList.length === 0) return alert('Please enter some URLs');

    setIsChecking(true);
    setResults([]);
    setProgress(0);

    const batchSize = 10; // URLs per request
    const concurrency = 5; // Parallel requests

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
        console.error('Batch failed', err);
      } finally {
        completed++;
        setProgress(Math.round((completed / batches.length) * 100));
      }
    }

    // Run with concurrency control
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

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'Instagram_Check_Results.xlsx');
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1  className="Heading">Instagram Bulk URL Checker</h1>

      <textarea id='textArea'
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder="Paste up to 3500 Instagram URLs (one per line)"
        className="w-full h-64 border rounded-lg p-3 text-sm"
      />

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleCheck}
          disabled={isChecking}
          className={`px-4 py-2 rounded-lg text-white ${isChecking ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isChecking ? 'Checking...' : 'Start Checking'}
        </button>

        <button
          onClick={handleDownload}
          disabled={results.length === 0}
          className={`px-4 py-2 rounded-lg text-white ${results.length === 0 ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          Download Excel
        </button>
      </div>

      {/* Progress bar */}
      {isChecking && (
        <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {progress > 0 && !isChecking && (
        <div className="mt-2 text-sm text-gray-700 text-center">
          ✅ Completed {progress}%
        </div>
      )}

      <div className="mt-6">
        <p className="font-semibold mb-2">Checked Results ({results.length}):</p>
        <div className="max-h-80 overflow-auto border rounded-lg p-2 text-sm">
          {results.map((r, i) => (
            <div key={i} className="flex justify-between border-b py-1">
              <span className="truncate w-3/4">{r.url}</span>
              <span>{" -> "}{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}