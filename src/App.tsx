import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { Roadmap } from './components/Roadmap';
import { Tokenomics } from './components/Tokenomics';
import { useHealthCheck } from './hooks/useHealthCheck';

const App = () => {
  // Initialize health checker
  useHealthCheck();

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={
            <div className="min-h-screen py-8 md:py-12">
              <div className="max-w-7xl mx-auto">
                <Hero />
              </div>
            </div>
          } />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/tokenomics" element={<Tokenomics />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;