import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import BoardDetail from "./pages/BoardDetail";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/board/:id" element={<BoardDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
