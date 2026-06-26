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
import { useAuth } from "../context/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

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

          {/* Вертикален контејнер што ги реди насловот и компанијата едно под друго */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: "bold",
                lineHeight: 1.2, // Го намалуваме за да нема преголем празен простор меѓу нив
              }}
            >
              Книжи.мк
            </Typography>

            {/* Името на компанијата како поднаслов */}
            {user?.companyName && (
              <Typography
                variant="caption"
                noWrap
                sx={{
                  color: "#38bdf8", // Светло сина брендирана боја
                  fontWeight: "500",
                  fontSize: "11px",
                  lineHeight: 1.2,
                  mt: 0.2, // Мало растојание од главниот наслов
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.companyName}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Сајдбар навигација */}
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
