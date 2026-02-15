import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/board/:id"
            element={
              <div className="mx-auto max-w-6xl px-4 py-8 text-gray-400">
                Board detail page — coming soon
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
