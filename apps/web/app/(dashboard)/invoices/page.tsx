"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import api from "../../utils/services/api"; // Патеката до твојата axios инстанца

import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";

// Дефинирање на интерфејс за типот на фактура што доаѓа од бекендот
interface Invoice {
  id: number;
  invoiceNo: string;
  client?: {
    name: string;
  };
  clientId: number;
  dueDate: string;
  finalPayable: number;
  status?: string;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Повлекување на фактурите од бекенд базата
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await api.get("/invoices");
        setInvoices(response.data);
        setError(null);
      } catch (err: any) {
        console.error("Грешка при влечење фактури:", err);
        setError("Неуспешно вчитување на фактурите од базата.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Логика за преземање на PDF директно од копче во табелата
  const handleDownloadPdf = async (id: number, invoiceNo: string) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `Faktura-${invoiceNo}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Грешка при преземање на PDF:", err);
      alert("Неуспешно преземање на PDF фајлот.");
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 4,
          width: "100%",
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontWeight: "bold",
            color: "#0f172a",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
            lineHeight: 1.2,
            textAlign: { xs: "center", sm: "left" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          Менаџирање со Фактури
        </Typography>

        <Button
          component={Link}
          href="/invoices/create"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: "#0070f3",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "8px",
            width: { xs: "100%", sm: "auto" },
            py: { xs: 1.2, sm: 1 },
          }}
        >
          Нова Фактура
        </Button>
      </Box>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        // 2. Приказ ако има грешка
        <Typography
          color="error"
          variant="body1"
          sx={{ textAlign: "center", mt: 4 }}
        >
          {error}
        </Typography>
      ) : invoices.length === 0 ? (
        // 3. Приказ ако базата е празна
        <Paper sx={{ p: 4, textAlign: "center", color: "#64748b" }}>
          <Typography variant="body1">
            Сè уште немате издадено ниту една фактура.
          </Typography>
          <Button
            component={Link}
            href="/invoices/create"
            variant="text"
            sx={{ mt: 1 }}
          >
            Креирај ја првата фактура сега
          </Button>
        </Paper>
      ) : (
        // 4. Реалната табела со податоци од базата
        <TableContainer
          component={Paper}
          sx={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
        >
          <Table>
            <TableHead sx={{ backgroundColor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Број</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Клиент</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>
                  Рок за плаќање
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Вкупна сума</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Статус</TableCell>
                <TableCell
                  sx={{ fontWeight: "bold", textAlgin: "center" }}
                  align="center"
                >
                  Акции
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(invoices) &&
                invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell sx={{ fontWeight: "600", color: "#0070f3" }}>
                      {invoice.invoiceNo}
                    </TableCell>
                    <TableCell>
                      {invoice.client
                        ? invoice.client.name
                        : `Клиент ID: ${invoice.clientId}`}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString("mk-MK")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "500" }}>
                      {invoice.finalPayable || 0} ден.
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          invoice.status === "PAID" ? "Платена" : "Неплатена"
                        }
                        color={
                          invoice.status === "PAID" ? "success" : "warning"
                        }
                        size="small"
                        sx={{ fontWeight: "bold" }}
                      />
                    </TableCell>

                    {/* НОВАТА КОЛОНА ЗА АКЦИИ */}
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        {/* Копче за Преглед */}
                        <Tooltip title="Прегледај PDF">
                          <IconButton
                            component={Link}
                            href={`/invoices/${invoice.id}/preview`} // Прилагоди ја патеката за твојот Preview екран
                            size="small"
                            sx={{
                              color: "#64748b",
                              "&:hover": { color: "#0f172a" },
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Копче за Уреди */}
                        <Tooltip title="Уреди фактура">
                          <IconButton
                            component={Link}
                            href={`/invoices/${invoice.id}/edit`} // Рута за Edit формата
                            size="small"
                            sx={{
                              color: "#0284c7",
                              "&:hover": { color: "#0369a1" },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* Копче за Директно Преземање */}
                        <Tooltip title="Преземи PDF">
                          <IconButton
                            onClick={() =>
                              handleDownloadPdf(invoice.id, invoice.invoiceNo)
                            }
                            size="small"
                            sx={{
                              color: "#16a34a",
                              "&:hover": { color: "#15803d" },
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
