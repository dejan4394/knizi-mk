"use client";

import React, { useState, useEffect } from "react";
import api from "../../utils/services/api";

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EmailIcon from "@mui/icons-material/Email";

interface Client {
  id: number;
  name: string;
  edb: string;
  address: string;
  accountNo?: string;
  email?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Држава за модалот (Дијалогот)
  const [openModal, setOpenModal] = useState<boolean>(false);

  // Следење дали модалот е во режим на уредување
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Форма држава за клиент
  const [formData, setFormData] = useState({
    name: "",
    edb: "",
    address: "",
    accountNo: "",
    email: "",
  });

  // 1. Повлекување клиенти од базата
  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await api.get("/clients");
      setClients(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Грешка при влечење клиенти:", err);
      setError("Неуспешно вчитавање на клиентите од базата.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Функција за отворање на модалот во режим на "Нов Клиент"
  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      edb: "",
      address: "",
      accountNo: "",
      email: "",
    });
    setOpenModal(true);
  };

  // Функција за отворање на модалот во режим на "Измена (Edit)"
  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      edb: client.edb || "",
      address: client.address || "",
      accountNo: client.accountNo || "",
      email: client.email || "",
    });
    setOpenModal(true);
  };

  // 2. Заеднички Handler за зачувување (Креирање или Ажурирање)
  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, formData);
        alert("Податоците за клиентот се успешно ажурирани!");
      } else {
        await api.post("/clients", formData);
        alert("Клиентот е успешно зачуван!");
      }

      setOpenModal(false);
      fetchClients(); // Освежи ја листата
    } catch (err: any) {
      console.error("Грешка при процесирање на клиентот:", err);
      alert(
        `Грешка: ${err.response?.data?.message || "Операцијата не е зачувана."}`,
      );
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
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
          Менаџирање со Клиенти (Комитенти)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
          sx={{
            backgroundColor: "#0070f3",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "8px",
            width: { xs: "100%", sm: "auto" },
            py: { xs: 1.2, sm: 1 },
          }}
        >
          Нов Клиент
        </Button>
      </Box>

      {/* Листа / Табела со Лоадинг состојби */}
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
          sx={{ textAlign: "center", mt: 4, fontWeight: "500" }}
        >
          {error}
        </Typography>
      ) : clients.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            color: "#64748b",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          }}
        >
          <Typography variant="body1" sx={{ mb: 2 }}>
            Сè уште немате додадено клиенти во базата.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateModal}
          >
            Додади го првиот клиент
          </Button>
        </Paper>
      ) : (
        <>
          {/* ============================================================= */}
          {/* 1. ПРИКАЗ НА МОБИЛЕН (КАРТИЧКИ) - Се прикажува само на xs и sm */}
          {/* ============================================================= */}
          <Box sx={{ display: { xs: "block", md: "none" } }}>
            <Grid container spacing={2}>
              {clients.map((client) => (
                <Grid size={{ xs: 12 }} key={client.id}>
                  <Card
                    sx={{
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                      {/* Назив и Едит икона */}
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "flex-start",
                            maxWidth: "80%",
                          }}
                        >
                          <BusinessIcon
                            sx={{ color: "#0070f3", mt: 0.3, flexShrink: 0 }}
                          />
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: "700",
                              color: "#0f172a",
                              lineHeight: 1.3,
                            }}
                          >
                            {client.name}
                          </Typography>
                        </Box>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditModal(client)}
                          sx={{
                            color: "#0070f3",
                            backgroundColor: "#f0f7ff",
                            p: 1,
                            borderRadius: "8px",
                            "&:hover": { backgroundColor: "#e0f0ff" },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Информации на картичката */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.2,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              fontWeight: "600",
                              color: "#64748b",
                              width: "50px",
                              flexShrink: 0,
                            }}
                          >
                            ЕДБ:
                          </Box>
                          {client.edb}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "#334155",
                            display: "flex",
                            alignItems: "flex-start",
                          }}
                        >
                          <LocationOnIcon
                            sx={{
                              fontSize: 18,
                              color: "#64748b",
                              mr: 1,
                              mt: 0.2,
                              flexShrink: 0,
                            }}
                          />
                          {client.address}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "#334155",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <AccountBalanceWalletIcon
                            sx={{
                              fontSize: 18,
                              color: "#64748b",
                              mr: 1,
                              flexShrink: 0,
                            }}
                          />
                          {client.accountNo || "/"}
                        </Typography>

                        {client.email && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#334155",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <EmailIcon
                              sx={{
                                fontSize: 18,
                                color: "#64748b",
                                mr: 1,
                                flexShrink: 0,
                              }}
                            />
                            <Box
                              component="span"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {client.email}
                            </Box>
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* ============================================================= */}
          {/* 2. ПРИКАЗ НА ДЕСКТОП (ТАБЕЛА) - Се прикажува од md нагоре */}
          {/* ============================================================= */}
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
                  <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>
                    Назив на компанија
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>
                    ЕДБ / Даночен број
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>
                    Адреса
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>
                    Жиро Сметка
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#334155" }}>
                    Е-пошта
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: "bold", color: "#334155", pr: 3 }}
                  >
                    Акции
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell sx={{ fontWeight: "600", color: "#0f172a" }}>
                      {client.name}
                    </TableCell>
                    <TableCell>{client.edb}</TableCell>
                    <TableCell>{client.address}</TableCell>
                    <TableCell>{client.accountNo || "/"}</TableCell>
                    <TableCell>{client.email || "/"}</TableCell>
                    <TableCell align="right" sx={{ pr: 2 }}>
                      <Tooltip title="Уреди податоци" arrow>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditModal(client)}
                          sx={{
                            color: "#0070f3",
                            "&:hover": { backgroundColor: "#f0f7ff" },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* МУИ Дијалог (Модал) - Заеднички за Креирање и Измена */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmitClient}>
          <DialogTitle sx={{ fontWeight: "bold", pb: 1, pt: 3 }}>
            {editingClient
              ? "Ажурирај Податоци на Комитент"
              : "Додади Нов Комитент"}
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2, pb: 3 }}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Назив на фирма / клиент"
                  fullWidth
                  required
                  variant="outlined"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="ЕДБ (Единствен даночен број)"
                  fullWidth
                  required
                  variant="outlined"
                  value={formData.edb}
                  onChange={(e) => handleInputChange("edb", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Жиро сметка"
                  fullWidth
                  variant="outlined"
                  value={formData.accountNo}
                  onChange={(e) =>
                    handleInputChange("accountNo", e.target.value)
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Адреса и Седиште"
                  fullWidth
                  required
                  variant="outlined"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Е-пошта (за праќање фактури)"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button
              onClick={() => setOpenModal(false)}
              sx={{
                textTransform: "none",
                color: "#64748b",
                fontWeight: "bold",
              }}
            >
              Откажи
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{
                backgroundColor: editingClient ? "#7c3aed" : "#0070f3",
                textTransform: "none",
                fontWeight: "bold",
                borderRadius: "6px",
                px: 3,
                "&:hover": {
                  backgroundColor: editingClient ? "#6d28d9" : "#0051bb",
                },
              }}
            >
              {editingClient ? "Зачувај Измени" : "Зачувај  Клиент"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
