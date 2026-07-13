"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

// Увоз на MUI компоненти
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Button,
  Divider,
} from "@mui/material";

// Увоз на MUI икони
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptIcon from "@mui/icons-material/Description";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import LogoutIcon from "@mui/icons-material/Logout";
import BusinessIcon from "@mui/icons-material/Business";
import CreditCardIcon from "@mui/icons-material/CreditCard";

interface MenuItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  allowedRoles?: string[];
}

const SIDEBAR_WIDTH = 260;

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Табла (Dashboard)",
    path: "/dashboard",
    icon: <DashboardIcon />,
  },
  {
    title: "Фактури",
    path: "/invoices",
    icon: <ReceiptIcon />,
  },
  {
    title: "Клиенти",
    path: "/clients",
    icon: <PeopleIcon />,
  },
  {
    title: "Моја Фирма",
    path: "/settings/company",
    icon: <BusinessIcon />,
  },
  {
    title: "Вработени и Тим",
    path: "/settings/users",
    icon: <BadgeIcon />,
    allowedRoles: ["OWNER"], // Прикажи само за сопственик
  },
  {
    title: "Претплата",
    path: "/settings/billing",
    icon: <CreditCardIcon />,
    allowedRoles: ["OWNER"], // Само сопственикот менува претплата
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  console.log(user);

  if (!user) return null;

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
          backgroundColor: "#1e293b", // Темно сива модерна боја
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "16px 8px",
        },
      }}
    >
      <Box>
        {/* Лого секција */}
        <Box sx={{ padding: "8px 16px", marginBottom: "24px" }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: "bold", color: "#38bdf8" }}
          >
            Книжи.мк
          </Typography>

          {/* Името на компанијата директно од user објектот */}
          {user.companyName && (
            <Typography
              variant="caption"
              sx={{
                color: "#38bdf8", // Се совпаѓа со сината боја од логото
                display: "block",
                mt: 0.2,
                fontSize: "11px",
                fontWeight: "medium",
              }}
            >
              {user.companyName}
            </Typography>
          )}
          {/* Име на корисникот и улога */}
          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              display: "block",
              mt: 0.5,
              fontWeight: "500",
            }}
          >
            {user.firstName} ({user.role})
          </Typography>
        </Box>

        <Divider sx={{ backgroundColor: "#334155", mb: 2 }} />

        {/* Навигациска листа */}
        <List sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {MENU_ITEMS.map((item, index) => {
            if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
              return null;
            }

            const isActive = pathname === item.path;

            return (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.path}
                  selected={isActive}
                  sx={{
                    borderRadius: "8px",
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    backgroundColor: isActive
                      ? "#334155 !important"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "#334155",
                      color: "#ffffff",
                      "& .MuiListItemIcon-root": { color: "#38bdf8" },
                    },
                    transition: "all 0.2s",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? "#38bdf8" : "#94a3b8",
                      minWidth: "40px",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{ fontSize: "14px", fontWeight: "medium" }}
                      >
                        {item.title}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Копче за излез на дното */}
      <Box sx={{ padding: "8px" }}>
        <Divider sx={{ backgroundColor: "#334155", mb: 2 }} />
        <Button
          variant="contained"
          color="error"
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={logout}
          sx={{
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "8px",
            padding: "10px",
          }}
        >
          Излези
        </Button>
      </Box>
    </Drawer>
  );
}
