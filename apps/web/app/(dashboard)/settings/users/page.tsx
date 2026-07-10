"use client";

import React, { useState, useEffect } from "react";
import api from "../../../utils/services/api";

import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  IconButton,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete"; // Икона за бришење
import LockResetIcon from "@mui/icons-material/LockReset";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InputAdornment from "@mui/material/InputAdornment";
import { useAuth } from "../../../context/AuthContext";

export default function CompanyUsersPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Модали states
  const [openUserModal, setOpenUserModal] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);

  // --- Влечење на тимот ---
  const fetchCompanyUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/users");
      setUsers(response.data);
    } catch (err) {
      console.error("Грешка при вчитување на тимот:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyUsers();
  }, []);

  // --- Отворање модал за Креирање ---
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setSelectedUserId(null);
    setShowPassword(false);
    setNewUser({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
    });
    setOpenUserModal(true);
  };

  // --- Отворање модал за Едитирање + Лозинка ---
  const handleOpenEditModal = (targetUser: any) => {
    setIsEditMode(true);
    setSelectedUserId(targetUser.id);
    setShowPassword(false);
    setNewUser({
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      email: targetUser.email,
      password: "", // Ја оставаме празна, ако внесе нешто сопственикот ќе се смени
      role: targetUser.role,
    });
    setOpenUserModal(true);
  };

  // --- Справување со Зачувување / Ажурирање ---
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      if (isEditMode && selectedUserId) {
        // Го тргаме само password од деструктурирањето, го оставаме email да оди во updateData
        const { password, ...updateData } = newUser;

        const payload: any = { ...updateData };

        // Ако OWNER-от внел и нова лозинка, ја додаваме и неа
        if (password.trim() !== "") {
          payload.password = password;
        }

        await api.patch(`/users/${selectedUserId}`, payload);
        alert("Корисничкиот профил е успешно ажуриран!");
      } else {
        await api.post("/users", newUser);
        alert("Корисникот е успешно додаден во вашиот тим!");
      }

      setOpenUserModal(false);
      fetchCompanyUsers();
    } catch (err: any) {
      alert(`Грешка: ${err.response?.data?.message || "Неуспешна акција."}`);
    } finally {
      setSaving(false);
    }
  };

  // --- Справување со Бришење ---
  const handleOpenDeleteDialog = (targetUser: any) => {
    setUserToDelete(targetUser);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setSaving(true);
      await api.delete(`/users/${userToDelete.id}`);
      alert(
        `Корисникот ${userToDelete.firstName} е успешно отстранет од тимот.`,
      );
      setOpenDeleteDialog(false);
      setUserToDelete(null);
      fetchCompanyUsers();
    } catch (err: any) {
      alert(
        `Грешка при бришење: ${err.response?.data?.message || "Неуспешна акција."}`,
      );
    } finally {
      setSaving(false);
    }
  };

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
    <Box sx={{ maxWidth: "1000px", margin: "0 auto", px: 2 }}>
      {/* Хедер */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4, mt: 2 }}>
        <GroupIcon sx={{ fontSize: 40, color: "#0070f3" }} />
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#0f172a" }}
          >
            Управување со Тим
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Додадете или уредете соработници, оператори или надворешни
            сметководители со соодветни привилегии.
          </Typography>
        </Box>
      </Box>

      {/* Менаџмент Секција */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Вработени во компанијата
        </Typography>
        {isOwner && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenCreateModal}
            sx={{
              backgroundColor: "#0070f3",
              "&:hover": { backgroundColor: "#0051b3" },
              textTransform: "none",
              borderRadius: "8px",
              px: 3,
            }}
          >
            Додади нов член
          </Button>
        )}
      </Box>

      {/* Табела со тимот */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Име</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Презиме</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Е-пошта</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Улога</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Акции
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  Немате додадено под-корисници.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: "600" }}>
                    {u.firstName}
                  </TableCell>
                  <TableCell sx={{ fontWeight: "600" }}>{u.lastName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        backgroundColor:
                          u.role === "OWNER"
                            ? "#dcfce7"
                            : u.role === "EMPLOYEE"
                              ? "#e0f2fe"
                              : "#f1f5f9",
                        color:
                          u.role === "OWNER"
                            ? "#166534"
                            : u.role === "EMPLOYEE"
                              ? "#0369a1"
                              : "#475569",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {u.role === "OWNER"
                        ? "Сопственик"
                        : u.role === "EMPLOYEE"
                          ? "Вработен"
                          : "Прегледувач"}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {/* Акциите се дозволени само за OWNER и тоа врз други улоги (не врз друг OWNER) */}
                    {isOwner && u.role !== "OWNER" ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenEditModal(u)}
                          title="Уреди профил и лозинка"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(u)}
                          title="Избриши корисник"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* МОДАЛ ЗА ДОДАВАЊЕ / ЕДИТИРАЊЕ КОРИСНИК */}
      <Dialog
        open={openUserModal}
        onClose={() => setOpenUserModal(false)}
        fullWidth
        maxWidth="xs"
      >
        <Box component="form" onSubmit={handleSaveUser}>
          <DialogTitle sx={{ fontWeight: "bold" }}>
            {isEditMode
              ? "Ажурирај кориснички пристап"
              : "Креирај нов кориснички пристап"}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Име"
                  fullWidth
                  required
                  value={newUser.firstName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, firstName: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Презиме"
                  fullWidth
                  required
                  value={newUser.lastName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, lastName: e.target.value })
                  }
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Е-пошта"
                  type="email"
                  fullWidth
                  required
                  // disabled={isEditMode} // Е-маилот не се менува при едитирање
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  slotProps={{ htmlInput: { autoComplete: "new-username" } }}
                />
              </Grid>

              {/* Поле за Лозинка - Присутно секогаш, но со различна улога при Едит */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={
                    isEditMode
                      ? "Нова лозинка (остави празно ако не менуваш)"
                      : "Привремена лозинка"
                  }
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  required={!isEditMode} // Задолжително само при креирање нов корисник
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  slotProps={{
                    htmlInput: { autoComplete: "new-password" },
                    input: {
                      startAdornment: isEditMode ? (
                        <InputAdornment position="start">
                          <LockResetIcon
                            sx={{ color: "warning.main", mr: 0.5 }}
                          />
                        </InputAdornment>
                      ) : undefined,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  select
                  label="Улога"
                  fullWidth
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }
                >
                  <MenuItem value="EMPLOYEE">
                    Вработен (Може само да фактурира)
                  </MenuItem>
                  <MenuItem value="VIEWER">
                    Само за преглед (Надворешен сметководител)
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button
              onClick={() => setOpenUserModal(false)}
              sx={{ textTransform: "none", color: "gray" }}
            >
              Откажи
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{
                backgroundColor: "#0070f3",
                "&:hover": { backgroundColor: "#0051b3" },
                textTransform: "none",
                fontWeight: "bold",
              }}
            >
              {saving
                ? "Се зачувува..."
                : isEditMode
                  ? "Зачувај измени"
                  : "Креирај профил"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* ДИЈАЛОГ ЗА ПОТВРДА ПРИ БРИШЕЊЕ КОРИСНИК */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Предупредување за бришење
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Дали сте сигурни дека сакате трајно да го отстраните корисникот{" "}
            <strong>
              {userToDelete?.firstName} {userToDelete?.lastName}
            </strong>{" "}
            ({userToDelete?.email}) од вашиот тим? Оваа акција не може да се
            врати.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDeleteDialog(false)}
            sx={{ textTransform: "none", color: "gray" }}
          >
            Откажи
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: "bold" }}
          >
            {saving ? "Се брише..." : "Да, избриши го"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
