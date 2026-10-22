import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogProvider } from './lib/catalog';
import Home from './pages/Home';
import './index.css';

// Route-level code splitting: only the home page ships in the initial bundle.
const Library = lazy(() => import('./pages/Library'));
const WorkPage = lazy(() => import('./pages/WorkPage'));
const Studio = lazy(() => import('./pages/Studio'));
const Contribute = lazy(() => import('./pages/Contribute'));
const Voices = lazy(() => import('./pages/Voices'));
const About = lazy(() => import('./pages/About'));
const NotFound = lazy(() => import('./pages/NotFound'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <Layout>
          <Suspense fallback={<div className="container-page py-24 text-center muted">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/library" element={<Library />} />
              <Route path="/work/:id" element={<WorkPage />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/contribute" element={<Contribute />} />
              <Route path="/voices" element={<Voices />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Layout>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>,
);
