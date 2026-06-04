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
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InputAdornment from "@mui/material/InputAdornment";
import { useAuth } from "../../../context/AuthContext";

export default function CompanyUsersPage() {
  // 1. Земи ја улогата на логираниот корисник (пример од твојот Auth систем)
  const { user } = useAuth();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [openUserModal, setOpenUserModal] = useState<boolean>(false);

  // Состојба за да знаеме дали креираме нов или едитираме постоечки корисник
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);

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

  // Функција за отворање на модалот во режим на едитирање
  const handleOpenEditModal = (user: any) => {
    setIsEditMode(true);
    setSelectedUserId(user.id);
    setNewUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "", // Лозинката ја оставаме празна при едитирање
      role: user.role,
    });
    setOpenUserModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      if (isEditMode && selectedUserId) {
        // Изземање на е-пошта и лозинка ако не се менуваат на оваа PATCH рута
        const { email, password, ...updateData } = newUser;

        // Ако сепак сакаш да дозволиш менување лозинка, може да го додадеш пак овој услов:
        // if (password.trim() !== "") { (updateData as any).password = password; }

        await api.patch(`/users/${selectedUserId}`, updateData);
        alert("Корисничкиот профил е успешно ажуриран!");
      } else {
        // Креирање на нов корисник
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
    <Box sx={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Хедер */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
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
        {user?.role === "OWNER" && (
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenCreateModal}
            sx={{
              backgroundColor: "#0f172a",
              textTransform: "none",
              borderRadius: "8px",
              px: 3,
            }}
          >
            Додади нов член
          </Button>
        )}
      </Box>

      {/* Табела со посебни колони */}
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
                <TableCell colSpan={5} align="center">
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
                    {/* Копче за едитирање - Оневозможено ако е OWNER за да се заштити главниот акаунт */}
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditModal(u)}
                      disabled={u.role === "OWNER"}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
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
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Е-пошта"
                  type="email"
                  fullWidth
                  required
                  disabled={isEditMode}
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  slotProps={{ htmlInput: { autoComplete: "new-username" } }}
                />
              </Grid>

              {!isEditMode && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Привремена лозинка"
                    // Динамично го менуваме типот: ако showPassword е true оди во "text", во спротивно е "password"
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    required
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    slotProps={{
                      htmlInput: { autoComplete: "new-password" },
                      // Го додаваме окото како додаток на крајот од инпутот (End Adornment)
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff />
                              ) : (
                                <Visibility />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
              )}

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
    </Box>
  );
}
