import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import AppLayout from "./routes/layout";
import Home from "./routes/home";
import AlbumDetail from "./routes/albums.$id";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/albums/:id" element={<AlbumDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    <Toaster richColors position="bottom-center" />
  </StrictMode>
);
