"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SpeedIcon from "@mui/icons-material/Speed";
import AddIcon from "@mui/icons-material/Add";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Link from "next/link";
import api from "../../utils/services/api";

// Интерфејс за структурата на податоците што ги очекуваме од NestJS
interface DashboardStats {
  companyName: string; // Новата променлива од бекенд
  monthlyInvoiced: number;
  totalPaid: number;
  totalReceivables: number;
  estimatedVat: number;
  criticalInvoices: Array<{
    id: string;
    client: string;
    date: string;
    dueDate: string;
    amount: number;
    status: string;
  }>;
}

export default function DashboardPage() {
  // const [stats, setStats] = useState<DashboardStats | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Го користиме твојот Axios клиент - рутата сега е чиста бидејќи baseURL е веќе http://localhost:3001
        const response = await api.get("/dashboard/stats");

        // Axios автоматски го парсира JSON-от во response.data
        setStats(response.data);
      } catch (err: any) {
        // Axios грешките имаат специфична структура, па вака безбедно ја земаме пораката
        const errorMessage =
          err.response?.data?.message || "Грешка при поврзување со серверот.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // 1. Состојба на вчитавање (Loading Spinner)
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={50} sx={{ color: "#2563eb" }} />
      </Box>
    );
  }

  // 2. Состојба на грешка
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center", color: "#ef4444" }}>
        <Typography variant="h6">⚠️ {error}</Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Освежи ја страницата
        </Button>
      </Box>
    );
  }

  // Помошна функција за форматирање на валута во денари
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("mk-MK", {
      style: "currency",
      currency: "MKD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Динамична конфигурација на картичките со реалните податоци од состојбата (stats)
  const kpis = [
    {
      title: "Вкупно фактурирано (овој месец)",
      value: formatCurrency(stats?.monthlyInvoiced || 0),
      icon: <ReceiptLongIcon sx={{ fontSize: 40, color: "#3b82f6" }} />,
      bgColor: "#eff6ff",
    },
    {
      title: "Наплатени средства (глобално)",
      value: formatCurrency(stats?.totalPaid || 0),
      icon: (
        <AccountBalanceWalletIcon sx={{ fontSize: 40, color: "#10b981" }} />
      ),
      bgColor: "#ecfdf5",
    },
    {
      title: "Вкупно побарувања (сите месеци)",
      value: formatCurrency(stats?.totalReceivables || 0),
      icon: <WarningAmberIcon sx={{ fontSize: 40, color: "#f59e0b" }} />,
      bgColor: "#fffbeb",
    },
    {
      title: "Проценка на ДДВ (тековен промет)",
      value: formatCurrency(stats?.estimatedVat || 0),
      icon: <SpeedIcon sx={{ fontSize: 40, color: "#ef4444" }} />,
      bgColor: "#fef2f2",
    },
  ];

  return (
    <Box>
      {/* Наслов и Брзи Акции */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#1e293b" }}
          >
            {stats?.companyName || "Вчитавање..."}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Еве брз преглед на финансиската состојба на твојот бизнис денес.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            component={Link}
            href="/invoices/create"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              backgroundColor: "#2563eb",
              "&:hover": { backgroundColor: "#1d4ed8" },
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Нова Фактура
          </Button>
          <Button
            component={Link}
            href="/clients"
            variant="outlined"
            startIcon={<PersonAddIcon />}
            sx={{
              color: "#475569",
              borderColor: "#cbd5e1",
              "&:hover": { borderColor: "#94a3b8" },
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Нов Клиент
          </Button>
        </Box>
      </Box>

      {/* РЕД 1: Динамични KPI Картички */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              sx={{
                borderRadius: "12px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 3,
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontWeight: "medium", mb: 0.5 }}
                  >
                    {kpi.title}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "#0f172a" }}
                  >
                    {kpi.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "12px",
                    backgroundColor: kpi.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {kpi.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* РЕД 2: Критични неплатени фактури */}
      <Typography
        variant="h6"
        sx={{ fontWeight: "bold", color: "#1e293b", mb: 2 }}
      >
        ⚠️ Фактури кои го надминале рокот за наплата
      </Typography>

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Table sx={{ minWidth: 650 }} aria-label="critical invoices table">
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Број
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Клиент
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Издадена на
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Рок за плаќање
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Износ
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#475569" }}>
                Статус
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.criticalInvoices && stats.criticalInvoices.length > 0 ? (
              stats.criticalInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                >
                  <TableCell sx={{ fontWeight: "bold", color: "#2563eb" }}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      #{invoice.id}
                    </Link>
                  </TableCell>
                  <TableCell sx={{ fontWeight: "medium" }}>
                    {invoice.client}
                  </TableCell>
                  <TableCell color="text.secondary">{invoice.date}</TableCell>
                  <TableCell color="text.secondary">
                    {invoice.dueDate}
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    {formatCurrency(invoice.amount)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color="error"
                      size="small"
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: "#fef2f2",
                        color: "#ef4444",
                        border: "1px solid #fee2e2",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                  sx={{ py: 3, color: "text.secondary" }}
                >
                  Одлично! Немате фактури со поминат рок за наплата. 👍
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
