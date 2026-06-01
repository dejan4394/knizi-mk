"use client";

import React, { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarWidth = 260;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          display: { md: "none" },
          backgroundColor: "#1e293b",
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontWeight: "bold" }}
          >
            Книжи.мк
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 2. СЛАТКА МУИ МАГИЈА ЗА САЈДБАРОТ */}
      <Box
        component="nav"
        sx={{ width: { md: sidebarWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: sidebarWidth,
              backgroundColor: "#1e293b",
              border: "none",
            },
          }}
        >
          <Box onClick={handleDrawerToggle}>
            <Sidebar />
          </Box>
        </Drawer>
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            width: sidebarWidth,
            height: "100vh",
            position: "sticky",
            top: 0,
          }}
        >
          <Sidebar />
        </Box>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: { xs: "20px", md: "40px" },
          paddingTop: { xs: "80px", md: "40px" },
          backgroundColor: "#f8fafc",
          minHeight: "100vh",
          width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
          overflowX: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
