"use client";

import React from "react";
import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar"; // Прилагоди ја патеката до Sidebar компонентата

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* 1. Постојаниот MUI Сајдбар од левата страна */}
      <Sidebar />

      {/* 2. Главниот простор за содржина на страниците (десно) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: "40px",
          backgroundColor: "#f8fafc", // Пријатна светла сива позадина за контраст со темното мени
          minHeight: "100vh",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
