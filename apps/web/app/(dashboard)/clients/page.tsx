"use client";

import React, { useState, useEffect } from "react";
// Осигурај се дека оваа патека точно води до твојот конфигуриран axios инстанца
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

interface Client {
  id: number;
  name: string;
  edb: string; // Даночен број
  address: string;
  accountNo?: string; // Жиро сметка
  email?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Држава за модалот (Дијалогот)
  const [openModal, setOpenModal] = useState<boolean>(false);

  // Форма држава за нов клиент
  const [newClient, setNewClient] = useState({
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
      const response = await api.get("/clients"); // Рутата на NestJS бекендот
      setClients(response.data);
      setError(null);
    } catch (err: any) {
      console.error("Грешка при влечење клиенти:", err);
      setError("Неуспешно вчитување на клиентите од базата.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // 2. Испраќање нов клиент до бекендот
  const handleSubmitClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/clients", newClient);
      if (response.status === 201 || response.status === 200) {
        alert("Клиентот е успешно зачуван!");
        setOpenModal(false); // Затвори го модалот

        // Ресетирај ја формата на празни вредности
        setNewClient({
          name: "",
          edb: "",
          address: "",
          accountNo: "",
          email: "",
        });

        // Освежи ја табелата со новите податоци од базата
        fetchClients();
      }
    } catch (err: any) {
      console.error("Грешка при креирање клиент:", err);
      alert(
        `Грешка: ${err.response?.data?.message || "Неуспешно зачувување."}`,
      );
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewClient((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      {/* Хедер Секција */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#0f172a" }}>
          Менаџирање со Клиенти (Комитенти)
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenModal(true)}
          sx={{
            backgroundColor: "#0070f3",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "#0051bb" },
          }}
        >
          Нов Клиент
        </Button>
      </Box>

      {/* Листа / Табела */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
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
            onClick={() => setOpenModal(true)}
          >
            Додади го првиот клиент
          </Button>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* МУИ Дијалог (Модал) за Додавање Клиент */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSubmitClient}>
          <DialogTitle sx={{ fontWeight: "bold", pb: 1, pt: 3 }}>
            Додади Нов Комитент
          </DialogTitle>
          <DialogContent dividers sx={{ pt: 2, pb: 3 }}>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Назив на фирма / клиент"
                  fullWidth
                  required
                  variant="outlined"
                  value={newClient.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="ЕДБ (Единствен даночен број)"
                  fullWidth
                  required
                  variant="outlined"
                  value={newClient.edb}
                  onChange={(e) => handleInputChange("edb", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Жиро сметка"
                  fullWidth
                  variant="outlined"
                  value={newClient.accountNo}
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
                  value={newClient.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Е-пошта (за праќање фактури)"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={newClient.email}
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
                backgroundColor: "#0070f3",
                textTransform: "none",
                fontWeight: "bold",
                borderRadius: "6px",
                px: 3,
              }}
            >
              Зачувај Клиент
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
