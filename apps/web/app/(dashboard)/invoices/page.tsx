"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

// Икони
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import InvoiceStatusManager, {
  InvoiceStatus,
} from "../../components/invoices/InvoiceStatusManager";
import api from "../../utils/services/api";

// Твои локални компоненти (прилагоди патеки по потреба)

// --- Типови (Замени со твоите реални интерфејси ако се во друг фајл) ---
interface Client {
  id: number;
  name: string;
}

interface Invoice {
  id: number;
  invoiceNo: number;
  status: InvoiceStatus;
  dueDate: string;
  finalPayable: number;
  clientId: number;
  client?: Client;
  sentAtDate?: string | null;
  convertedFromId?: number | null;
  convertedToId?: number | null;
}

export default function InvoicesListComponent() {
  // --- States ---
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  // --- Фетчување податоци ---
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/invoices");
      setInvoices(response.data);
    } catch (err: any) {
      console.error("Грешка при влечење фактури:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // --- Хендлери за акции ---
  const handleDownloadPdf = async (id: number, invoiceNo: number) => {
    try {
      window.open(`/api/invoices/${id}/pdf`, "_blank");
    } catch (error) {
      console.error("Грешка при преземање PDF:", error);
    }
  };

  const handleSendEmail = async (id: number, invoiceNo: number) => {
    try {
      setSendingEmailId(id);
      const res = await fetch(`/api/invoices/${id}/send-email`, {
        method: "POST",
      });
      if (res.ok) {
        alert(`Фактурата бр. ${invoiceNo} е успешно испратена по е-пошта.`);
        fetchInvoices(); // Освежи статус на испраќање
      } else {
        alert("Грешка при испраќање на е-поштата.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSendingEmailId(null);
    }
  };

  // --- Филтрирање логика ---
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNo.toString().includes(searchTerm) ||
      (invoice.client?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && invoice.status === statusFilter;
  });

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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Наслов и Копче за креирање */}
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
        <Typography variant="h4" sx={{ fontWeight: "800", color: "#0f172a" }}>
          Фактури и Профактури
        </Typography>
        <Button
          component={Link}
          href="/invoices/create"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: "#0070f3",
            "&:hover": { backgroundColor: "#0051b3" },
            borderRadius: "8px",
            px: 3,
          }}
        >
          Нова Фактура
        </Button>
      </Box>

      {/* Филтри (Пребарување и Статус) */}
      <Paper
        sx={{
          p: 2,
          mb: 4,
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, sm: 6, md: 8 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Пребарај по број на фактура или клиент..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Филтрирај по статус"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="ALL">Сите</MenuItem>
              <MenuItem value="PAID">Платени</MenuItem>
              <MenuItem value="PENDING">Неплатени</MenuItem>
              <MenuItem value="PROFORMA_PENDING">
                Профактури - Неплатени
              </MenuItem>
              <MenuItem value="PROFORMA_PAID">Профактури - Платени</MenuItem>
              <MenuItem value="CONVERTED">Конвертирани во Фактура</MenuItem>
              <MenuItem value="CANCELED">Сторнирани</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* ---------------- SCENARIO A: МОБИЛЕН ПРИКАЗ (КАРТИЧКИ) ---------------- */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          gap: 2.5,
          mb: 2,
        }}
      >
        {filteredInvoices.length === 0 ? (
          <Typography align="center" color="textSecondary" sx={{ py: 4 }}>
            Неможе да се најдат документи.
          </Typography>
        ) : (
          filteredInvoices.map((invoice) => {
            const isSent = !!invoice.sentAtDate;
            const isProforma =
              invoice.status === "PROFORMA_PENDING" ||
              invoice.status === "PROFORMA_PAID" ||
              invoice.status === "CONVERTED";

            return (
              <Card
                key={invoice.id}
                variant="elevation"
                sx={{
                  borderRadius: "16px",
                  boxShadow:
                    "0 10px 15px -3px rgba(15, 23, 42, 0.04), 0 4px 6px -4px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.05)",
                  border: "1px solid #f1f5f9",
                  position: "relative",
                  overflow: "hidden",
                  transition:
                    "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 20px 25px -5px rgba(15, 23, 42, 0.06), 0 8px 10px -6px rgba(15, 23, 42, 0.06)",
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: "5px",
                    backgroundColor: isProforma ? "#7c3aed" : "#10b981",
                  },
                  pl: "5px",
                }}
              >
                {/* Горна лента на картичката */}
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
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography
                      sx={{
                        fontWeight: "700",
                        color: "#0070f3",
                        fontSize: "1.05rem",
                      }}
                    >
                      # {invoice.invoiceNo}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: "800",
                        letterSpacing: "0.5px",
                        color: isProforma ? "#7c3aed" : "#16a34a",
                      }}
                    >
                      {isProforma ? "ПРОФАКТУРА" : "ФАКТУРА"}
                    </Typography>
                  </Box>

                  <InvoiceStatusManager
                    invoiceId={invoice.id}
                    currentStatus={invoice.status as InvoiceStatus}
                    onStatusChangeSuccess={() => fetchInvoices()}
                    dueDate={invoice.dueDate}
                    convertedFrom={
                      invoice.convertedFromId
                        ? {
                            id: invoice.convertedFromId,
                            invoiceNo: invoice.convertedFromId,
                            year: new Date().getFullYear(),
                          }
                        : undefined
                    }
                    convertedTo={
                      invoice.convertedToId
                        ? {
                            id: invoice.convertedToId,
                            invoiceNo: invoice.convertedToId,
                            year: new Date().getFullYear(),
                          }
                        : undefined
                    }
                  />
                </Box>

                {/* Главна содржина на картичката */}
                <CardContent
                  sx={{
                    p: 2,
                    "&:last-child": { pb: 2 },
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ display: "block", mb: 0.2, fontWeight: "500" }}
                    >
                      Клиент
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ fontWeight: "600", color: "#0f172a" }}
                    >
                      {invoice.client
                        ? invoice.client.name
                        : `Клиент ID: ${invoice.clientId}`}
                    </Typography>
                  </Box>

                  {/* Податочна табела во грид */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          backgroundColor: "#f8fafc",
                          p: 1,
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: "block", fontSize: "11px" }}
                        >
                          Рок за плаќање
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "600", color: "#334155" }}
                        >
                          {new Date(invoice.dueDate).toLocaleDateString(
                            "mk-MK",
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Box
                        sx={{
                          backgroundColor: "#f8fafc",
                          p: 1,
                          borderRadius: "8px",
                          border: "1px solid #f1f5f9",
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          sx={{ display: "block", fontSize: "11px" }}
                        >
                          Вкупна сума
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: "700", color: "#0f172a" }}
                        >
                          {invoice.finalPayable || 0} ден.
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 0.5, borderColor: "#f1f5f9" }} />

                  {/* Испратено статус + Акциски икони */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyValue: "space-between",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      {isSent ? (
                        <>
                          <CheckCircleIcon
                            sx={{ color: "#16a34a", fontSize: 18 }}
                          />
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                color: "#16a34a",
                                fontWeight: "700",
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
                              {new Date(invoice.sentAtDate!).toLocaleDateString(
                                "mk-MK",
                              )}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <ErrorOutlineIcon
                            sx={{ color: "#94a3b8", fontSize: 18 }}
                          />
                          <Typography
                            variant="caption"
                            sx={{ color: "#64748b", fontWeight: "600" }}
                          >
                            Не е испратено
                          </Typography>
                        </>
                      )}
                    </Box>

                    {/* Брзи икони-копчиња */}
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        component={Link}
                        href={`/invoices/${invoice.id}/preview`}
                        size="small"
                        sx={{ color: "#64748b", backgroundColor: "#f1f5f9" }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        component={Link}
                        href={`/invoices/${invoice.id}/edit`}
                        size="small"
                        sx={{ color: "#0284c7", backgroundColor: "#e0f2fe" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        onClick={() =>
                          handleDownloadPdf(invoice.id, invoice.invoiceNo)
                        }
                        size="small"
                        sx={{ color: "#16a34a", backgroundColor: "#dcfce7" }}
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
                        sx={{ color: "#7c3aed", backgroundColor: "#f3e8ff" }}
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
          })
        )}
      </Box>

      {/* ---------------- SCENARIO B: ДЕСКТОП ПРИКАЗ (ТАБЕЛА) ---------------- */}
      <TableContainer
        component={Paper}
        sx={{
          display: { xs: "none", md: "block" },
          borderRadius: "12px",
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "700" }}>Број</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>Клиент</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>Рок за плаќање</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>Вкупна сума</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>Статус</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>Е-пошта</TableCell>
              <TableCell align="right" sx={{ fontWeight: "700", pr: 3 }}>
                Акции
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  Нема пронајдено фактури/профактури.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const isSent = !!invoice.sentAtDate;
                return (
                  <TableRow
                    key={invoice.id}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ fontWeight: "600", color: "#0070f3" }}>
                      # {invoice.invoiceNo}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "500" }}>
                      {invoice.client
                        ? invoice.client.name
                        : `Клиент ID: ${invoice.clientId}`}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.dueDate).toLocaleDateString("mk-MK")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: "600" }}>
                      {invoice.finalPayable || 0} ден.
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusManager
                        invoiceId={invoice.id}
                        currentStatus={invoice.status}
                        onStatusChangeSuccess={() => fetchInvoices()}
                        dueDate={invoice.dueDate}
                        convertedFrom={
                          invoice.convertedFromId
                            ? {
                                id: invoice.convertedFromId,
                                invoiceNo: invoice.convertedFromId,
                                year: new Date().getFullYear(),
                              }
                            : undefined
                        }
                        convertedTo={
                          invoice.convertedToId
                            ? {
                                id: invoice.convertedToId,
                                invoiceNo: invoice.convertedToId,
                                year: new Date().getFullYear(),
                              }
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isSent ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "#16a34a",
                          }}
                        >
                          <CheckCircleIcon fontSize="small" />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "600" }}
                          >
                            {new Date(invoice.sentAtDate!).toLocaleDateString(
                              "mk-MK",
                            )}
                          </Typography>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            color: "#94a3b8",
                          }}
                        >
                          <ErrorOutlineIcon fontSize="small" />
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "500" }}
                          >
                            Неиспратено
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 1,
                        }}
                      >
                        <Button
                          component={Link}
                          href={`/invoices/${invoice.id}/preview`}
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          sx={{ borderRadius: "6px", textTransform: "none" }}
                        >
                          Преглед
                        </Button>
                        <Button
                          component={Link}
                          href={`/invoices/${invoice.id}/edit`}
                          variant="outlined"
                          color="info"
                          size="small"
                          startIcon={<EditIcon />}
                          sx={{ borderRadius: "6px", textTransform: "none" }}
                        >
                          Уреди
                        </Button>
                        <Button
                          onClick={() =>
                            handleDownloadPdf(invoice.id, invoice.invoiceNo)
                          }
                          variant="outlined"
                          color="success"
                          size="small"
                          startIcon={<DownloadIcon />}
                          sx={{ borderRadius: "6px", textTransform: "none" }}
                        >
                          PDF
                        </Button>
                        <Button
                          onClick={() =>
                            handleSendEmail(invoice.id, invoice.invoiceNo)
                          }
                          disabled={
                            sendingEmailId !== null ||
                            invoice.status === "CANCELED"
                          }
                          variant="contained"
                          color="secondary"
                          size="small"
                          startIcon={
                            sendingEmailId === invoice.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <EmailIcon />
                            )
                          }
                          sx={{
                            borderRadius: "6px",
                            textTransform: "none",
                            backgroundColor: "#7c3aed",
                            "&:hover": { backgroundColor: "#6d28d9" },
                          }}
                        >
                          Прати
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
