import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { CopyTypes } from '@/pages/CopyTypes';
import { CopyGenerator } from '@/pages/CopyGenerator';
import { Checklist } from '@/pages/Checklist';
import { BestCopies } from '@/pages/BestCopies';

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/copy-types" element={<CopyTypes />} />
          <Route path="/generator" element={<CopyGenerator />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/best" element={<BestCopies />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
