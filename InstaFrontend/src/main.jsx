import React from "react";
import ReactDOM from "react-dom/client";   // ✅ use "react-dom/clien
import "./style.css";
import App from './components/InstagramBulkChecker.jsx';

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);