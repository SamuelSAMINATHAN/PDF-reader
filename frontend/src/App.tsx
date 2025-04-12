import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from "react-hot-toast";

// Composants principaux
import Sidebar from './components/Sidebar';

// Pages
import Home from './pages/Home';
import MergePage from './pages/MergePage';
import SplitPage from './pages/SplitPage';
import ExtractPage from './pages/ExtractPage';
import RemovePage from './pages/RemovePage';
import ReorderPage from './pages/ReorderPage';
import SignPage from './pages/SignPage';
import CompressPage from './pages/CompressPage';
import ConvertPage from './pages/ConvertPage';

// Styles
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/merge" element={<MergePage />} />
            <Route path="/split" element={<SplitPage />} />
            <Route path="/extract" element={<ExtractPage />} />
            <Route path="/remove" element={<RemovePage />} />
            <Route path="/reorder" element={<ReorderPage />} />
            <Route path="/sign" element={<SignPage />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/convert" element={<ConvertPage />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </BrowserRouter>
  );
};

export default App;
