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
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Divider,
  Grid,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InvoiceStatusManager, {
  InvoiceStatus,
} from "../../components/invoices/InvoiceStatusManager";

// Дефинирање на интерфејс за типот на фактура што доаѓа од бекендот
interface Invoice {
  sentAtDate: any;
  id: number;
  invoiceNo: string;
  client?: {
    name: string;
  };
  clientId: number;
  dueDate: string;
  finalPayable: number;
  status: InvoiceStatus;
}

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  // Функција за повик до бекендот за испраќање меил
  const handleSendEmail = async (id: number, invoiceNo: string) => {
    try {
      setSendingEmailId(id);
      await api.post(`/invoices/${id}/send-email`);
      alert(
        `Фактурата ${invoiceNo} е успешно испратена на е-маил до клиентот.`,
      );
      fetchInvoices();
    } catch (err: any) {
      console.error("Грешка при праќање е-маил:", err);
      alert(
        `Неуспешно праќање: ${err.response?.data?.message || "Системска грешка."}`,
      );
    } finally {
      setSendingEmailId(null);
    }
  };

  // Повлекување на фактурите од бекенд базата
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

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Логика за преземање на PDF директно од копче
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
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      {/* Хедер Секција */}
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
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography
          color="error"
          variant="body1"
          sx={{ textAlign: "center", mt: 4 }}
        >
          {error}
        </Typography>
      ) : invoices.length === 0 ? (
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
        <>
          {/* ---------------- SCENARIO A: МОБИЛЕН ПРИКАЗ (КАРТИЧКИ) ---------------- */}
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 2,
              mb: 2,
            }}
          >
            {Array.isArray(invoices) &&
              invoices.map((invoice) => {
                const isSent = !!invoice.sentAtDate;
                return (
                  <Card
                    key={invoice.id}
                    variant="outlined"
                    sx={{
                      borderRadius: "12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Горен дел на картичката */}
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <Typography sx={{ fontWeight: "700", color: "#0070f3" }}>
                        # {invoice.invoiceNo}
                      </Typography>
                      {/* Менаџер на статус директно на картичката */}
                      <InvoiceStatusManager
                        invoiceId={invoice.id}
                        currentStatus={invoice.status}
                        onStatusChangeSuccess={() => fetchInvoices()}
                        dueDate={invoice.dueDate}
                      />
                    </Box>

                    {/* Содржина на картичката */}
                    <CardContent
                      sx={{
                        p: 2,
                        "&:last-child": { pb: 2 },
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: "block" }}
                        >
                          Клиент
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: "600", color: "#1e293b" }}
                        >
                          {invoice.client
                            ? invoice.client.name
                            : `Клиент ID: ${invoice.clientId}`}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: "block" }}
                          >
                            Рок за плаќање
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "500" }}
                          >
                            {new Date(invoice.dueDate).toLocaleDateString(
                              "mk-MK",
                            )}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ display: "block" }}
                          >
                            Вкупна сума
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "700", color: "#0f172a" }}
                          >
                            {invoice.finalPayable || 0} ден.
                          </Typography>
                        </Grid>
                      </Grid>

                      <Divider sx={{ my: 0.5 }} />

                      {/* Статус на испраќање и Акциски копчиња */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        {/* Испратено инфо */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          {isSent ? (
                            <>
                              <CheckCircleIcon
                                sx={{ color: "#16a34a", fontSize: 16 }}
                              />
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "#16a34a",
                                    fontWeight: "bold",
                                    display: "block",
                                    lineHeight: 1,
                                  }}
                                >
                                  Испратено
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "#64748b", fontSize: "10px" }}
                                >
                                  {new Date(
                                    invoice.sentAtDate,
                                  ).toLocaleDateString("mk-MK")}
                                </Typography>
                              </Box>
                            </>
                          ) : (
                            <>
                              <ErrorOutlineIcon
                                sx={{ color: "#94a3b8", fontSize: 16 }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ color: "#64748b", fontWeight: "500" }}
                              >
                                Не е испратено
                              </Typography>
                            </>
                          )}
                        </Box>

                        {/* Акции за мобилен */}
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton
                            component={Link}
                            href={`/invoices/${invoice.id}/preview`}
                            size="small"
                            sx={{ color: "#64748b" }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            component={Link}
                            href={`/invoices/${invoice.id}/edit`}
                            size="small"
                            sx={{ color: "#0284c7" }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            onClick={() =>
                              handleDownloadPdf(invoice.id, invoice.invoiceNo)
                            }
                            size="small"
                            sx={{ color: "#16a34a" }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>

                          <IconButton
                            onClick={() =>
                              handleSendEmail(invoice.id, invoice.invoiceNo)
                            }
                            disabled={
                              sendingEmailId !== null ||
                              invoice.status === "CANCELED"
                            }
                            size="small"
                            sx={{ color: "#7c3aed" }}
                          >
                            {sendingEmailId === invoice.id ? (
                              <CircularProgress
                                size={16}
                                sx={{ color: "#7c3aed" }}
                              />
                            ) : (
                              <EmailIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Box>

          {/* ---------------- SCENARIO B: ДЕСКТОП ПРИКАЗ (ТАБЕЛА) ---------------- */}
          <TableContainer
            component={Paper}
            sx={{
              display: { xs: "none", md: "block" },
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              borderRadius: "8px",
            }}
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
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Статус
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Испратено
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }} align="center">
                    Акции
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(invoices) &&
                  invoices.map((invoice) => {
                    const isSent = !!invoice.sentAtDate;
                    return (
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
                          {new Date(invoice.dueDate).toLocaleDateString(
                            "mk-MK",
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: "500" }}>
                          {invoice.finalPayable || 0} ден.
                        </TableCell>

                        <TableCell align="center">
                          <InvoiceStatusManager
                            invoiceId={invoice.id}
                            currentStatus={invoice.status}
                            onStatusChangeSuccess={() => fetchInvoices()}
                            dueDate={invoice.dueDate}
                          />
                        </TableCell>

                        <TableCell align="center">
                          {isSent ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <CheckCircleIcon
                                sx={{ color: "#16a34a", fontSize: 18 }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#16a34a",
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                  mt: 0.5,
                                }}
                              >
                                Испратено
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "#64748b", fontSize: "11px" }}
                              >
                                {new Date(
                                  invoice.sentAtDate,
                                ).toLocaleDateString("mk-MK")}{" "}
                                во{" "}
                                {new Date(
                                  invoice.sentAtDate,
                                ).toLocaleTimeString("mk-MK", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Typography>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <ErrorOutlineIcon
                                sx={{ color: "#94a3b8", fontSize: 18 }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: "#64748b",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  mt: 0.5,
                                }}
                              >
                                Не е испратено
                              </Typography>
                            </Box>
                          )}
                        </TableCell>

                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 1,
                            }}
                          >
                            <Tooltip title="Прегледај PDF">
                              <IconButton
                                component={Link}
                                href={`/invoices/${invoice.id}/preview`}
                                size="small"
                                sx={{
                                  color: "#64748b",
                                  "&:hover": { color: "#0f172a" },
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Уреди фактура">
                              <IconButton
                                component={Link}
                                href={`/invoices/${invoice.id}/edit`}
                                size="small"
                                sx={{
                                  color: "#0284c7",
                                  "&:hover": { color: "#0369a1" },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Преземи PDF">
                              <IconButton
                                onClick={() =>
                                  handleDownloadPdf(
                                    invoice.id,
                                    invoice.invoiceNo,
                                  )
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

                            <Tooltip title="Испрати на е-маил">
                              <span>
                                <IconButton
                                  onClick={() =>
                                    handleSendEmail(
                                      invoice.id,
                                      invoice.invoiceNo,
                                    )
                                  }
                                  disabled={
                                    sendingEmailId !== null ||
                                    invoice.status === "CANCELED"
                                  }
                                  size="small"
                                  sx={{
                                    color: "#7c3aed",
                                    "&:hover": { color: "#6d28d9" },
                                  }}
                                >
                                  {sendingEmailId === invoice.id ? (
                                    <CircularProgress
                                      size={18}
                                      sx={{ color: "#7c3aed" }}
                                    />
                                  ) : (
                                    <EmailIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
