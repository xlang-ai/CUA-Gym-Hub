import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BoardView from './pages/BoardView.jsx';
import Go from './pages/Go.jsx';
import './index.css';

// This app has a board-list dashboard (matching the real product's entry point) in front of
// the single-board editor, so routing lives here: "/" is the dashboard, "/board/:boardId" is
// the editor, and "/go" is a client-side fallback for state inspection (the dev/preview server
// normally answers GET /go itself via a Vite middleware — see vite.config.js — but a plain
// static host has no such middleware, so this route keeps /go working there too).
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/go" element={<Go />} />
          <Route path="/board/:boardId" element={<BoardView />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
