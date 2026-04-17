import { Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Performance from '@/pages/Performance';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/performance" element={<Performance />} />
    </Routes>
  );
}
