"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/services/api";

import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  Divider,
  Alert,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import BusinessIcon from "@mui/icons-material/Business";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

export default function LoginPage() {
  const { login } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Состојби за корисничките полиња
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Состојби за фирмата
  const [companyName, setCompanyName] = useState("");
  const [edb, setEdb] = useState("");

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        const response = await api.post("/auth/login", { email, password });
        const { accessToken, user } = response.data;
        login(accessToken, user);
      } else {
        await api.post("/auth/register", {
          companyName,
          edb: edb || null,
          firstName,
          lastName,
          ownerEmail: email,
          password,
        });

        alert(
          "Успешна регистрација! Сега можете да се најавите со Вашата е-пошта.",
        );
        setMode("login");

        setFirstName("");
        setLastName("");
        setCompanyName("");
        setEdb("");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Грешка при поврзување со серверот.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const bgMain = "#1e293b";
  const bgCard = "#0f172a";
  const textCyan = "#38bdf8";
  const textMuted = "#94a3b8";

  const accentColor = mode === "login" ? textCyan : "#c084fc";
  const accentHoverColor = mode === "login" ? "#0ea5e9" : "#a855f7";

  const textFieldStyles = {
    "& .MuiOutlinedInput-root": {
      color: "#f8fafc",
      "& fieldset": { borderColor: "rgba(148, 163, 184, 0.3)" },
      "&:hover fieldset": { borderColor: "rgba(56, 189, 248, 0.5)" },
      "&.Mui-focused fieldset": { borderColor: accentColor },

      "& input:-webkit-autofill": {
        WebkitBoxShadow: `0 0 0 100px ${bgCard} inset !important`,
        WebkitTextFillColor: "#f8fafc !important",
        caretColor: "#f8fafc",
        borderRadius: "inherit",
        transition: "background-color 5000s ease-in-out 0s",
      },
    },
    "& .MuiInputLabel-root": {
      color: textMuted,
      // Го средува преклопувањето на лабелата кај некои верзии на Chrome
      transform: "translate(14px, -9px) scale(0.75) !important",
    },
    "& .MuiInputLabel-root.Mui-focused": { color: accentColor },
    "& .MuiFormHelperText-root": { color: "rgba(148, 163, 184, 0.7)" },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bgMain,
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: "480px",
          width: "100%",
          borderRadius: "16px",
          backgroundColor: bgCard,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Box
              sx={{
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                border: `1px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <BusinessIcon sx={{ color: accentColor, fontSize: 28 }} />
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: "800",
                letterSpacing: "-0.5px",
                color: "#f8fafc",
              }}
            >
              Книжи
              <Box component="span" sx={{ color: accentColor }}>
                .мк
              </Box>
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: textMuted, mt: 0.5, textAlign: "center" }}
            >
              {mode === "login"
                ? "Пристап до вашите фактури и сметководство"
                : "Дигитализирајте го менаџирањето со Вашата фирма"}
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: "8px",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                color: "#fca5a5",
                border: "1px solid rgba(239, 68, 68, 0.2)",
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {mode === "register" && (
                <>
                  <Divider
                    sx={{
                      mb: 0.5,
                      "&::before, &::after": {
                        borderColor: "rgba(255,255,255,0.07)",
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: textMuted,
                        px: 1,
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                      }}
                    >
                      ПОДАТОЦИ ЗА КОМПАНИЈАТА
                    </Typography>
                  </Divider>

                  <TextField
                    label="Назив на Фирмата"
                    fullWidth
                    required
                    variant="outlined"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    // Сè оди внатре во slotProps
                    slotProps={{
                      input: { sx: { borderRadius: "8px" } },
                      inputLabel: { shrink: true },
                    }}
                    sx={textFieldStyles}
                  />

                  <TextField
                    label="ЕДБ / Даночен број"
                    fullWidth
                    variant="outlined"
                    helperText="Опционално поле - може да го внесете и подоцна"
                    value={edb}
                    onChange={(e) => setEdb(e.target.value)}
                    slotProps={{
                      input: { sx: { borderRadius: "8px" } },
                      inputLabel: { shrink: true },
                    }}
                    sx={textFieldStyles}
                  />

                  <Divider
                    sx={{
                      my: 0.5,
                      "&::before, &::after": {
                        borderColor: "rgba(255,255,255,0.07)",
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: textMuted,
                        px: 1,
                        fontWeight: "600",
                        letterSpacing: "0.5px",
                      }}
                    >
                      ПОДАТОЦИ ЗА СОПСТВЕНИКОТ (OWNER)
                    </Typography>
                  </Divider>

                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Име"
                      fullWidth
                      required
                      variant="outlined"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      slotProps={{
                        input: { sx: { borderRadius: "8px" } },
                        inputLabel: { shrink: true },
                      }}
                      sx={textFieldStyles}
                    />

                    <TextField
                      label="Презиме"
                      fullWidth
                      required
                      variant="outlined"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      slotProps={{
                        input: { sx: { borderRadius: "8px" } },
                        inputLabel: { shrink: true },
                      }}
                      sx={textFieldStyles}
                    />
                  </Box>
                </>
              )}

              <TextField
                label={mode === "login" ? "Е-маил адреса" : "Е-маил за Најава"}
                type="email"
                fullWidth
                required
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                // Преместено внатре
                slotProps={{
                  input: { sx: { borderRadius: "8px" } },
                  inputLabel: { shrink: true },
                }}
                sx={textFieldStyles}
              />

              <TextField
                label="Лозинка"
                type={showPassword ? "text" : "password"}
                fullWidth
                required
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={textFieldStyles}
                // Ги комбинираме и копчето за окото и shrink ефектот во еден slotProps
                slotProps={{
                  input: {
                    sx: { borderRadius: "8px" },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: textMuted }}
                        >
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                  inputLabel: { shrink: true },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={mode === "login" ? <LoginIcon /> : <PersonAddIcon />}
                sx={{
                  backgroundColor: accentColor,
                  color: "#0f172a",
                  padding: "11px",
                  textTransform: "none",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  fontSize: "15px",
                  boxShadow: "none",
                  mt: 1,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: accentHoverColor,
                    color: "#fff",
                    boxShadow: "none",
                  },
                }}
              >
                {submitting
                  ? mode === "login"
                    ? "Се најавувате..."
                    : "Се регистрирате..."
                  : mode === "login"
                    ? "Влези во систем"
                    : "Креирај профил"}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.07)" }} />

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: textMuted }}>
              {mode === "login"
                ? "Нови сте на Книжи.мк?"
                : "Веќе имате профил?"}{" "}
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={toggleMode}
                sx={{
                  color: mode === "login" ? "#c084fc" : textCyan,
                  fontWeight: "bold",
                  textDecoration: "none",
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {mode === "login"
                  ? "Креирај сметка тука"
                  : "Најави се на системот"}
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
