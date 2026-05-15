import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Photobooth from './pages/Photobooth';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Photobooth />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
