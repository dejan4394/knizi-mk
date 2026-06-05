"use client";

import React, { useState, useEffect } from "react";
import api from "../../../utils/services/api";

import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link, // ДОДАДЕНО: MUI Link компонента
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import BusinessIcon from "@mui/icons-material/Business";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LaunchIcon from "@mui/icons-material/Launch"; // ДОДАДЕНО: Икона за надворешен линк
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Tooltip } from "@mui/material";

export default function MyCompanySettingsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [companyData, setCompanyData] = useState({
    name: "",
    edb: "",
    address: "",
    giroAccount: "",
    bankName: "",
    phone: "",
    email: "",
    smtpHost: "",
    smtpPort: 465,
    smtpUser: "",
    smtpPass: "",
  });

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/companies/my-company");
        if (response.data) {
          setCompanyData({
            name: response.data.name || "",
            edb: response.data.edb || "",
            address: response.data.address || "",
            giroAccount: response.data.giroAccount || "",
            bankName: response.data.bankName || "",
            phone: response.data.phone || "",
            email: response.data.email || "",
            smtpHost: response.data.smtpHost || "",
            smtpPort: response.data.smtpPort || 465,
            smtpUser: response.data.smtpUser || "",
            smtpPass: "",
          });
        }
      } catch (err: any) {
        console.error("Грешка при вчитување на фирмата:", err);
        if (err.response?.status !== 404) {
          setError("Неуспешно вчитување на профилот на компанијата.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      const payload = {
        ...companyData,
        smtpPort: Number(companyData.smtpPort),
        smtpPass: companyData.smtpPass || undefined,
      };

      await api.put("/companies/my-company", payload);

      setCompanyData((prev) => ({ ...prev, smtpPass: "" }));
      alert("Податоците за вашата фирма се успешно зачувани!");
    } catch (err: any) {
      console.error("Грешка при зачувување фирма:", err);
      alert(
        `Грешка: ${err.response?.data?.message || "Неуспешно зачувување."}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
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
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: "800px", margin: "0 auto" }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 4,
          width: "100%",
        }}
      >
        {/* <BusinessIcon sx={{ fontSize: 40, color: "#0070f3" }} /> */}
        <Box>
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
            Профил на Мојата Фирма
          </Typography>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{
              textAlign: { xs: "center", sm: "left" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Уредете ги генералиите и SMTP е-маил поставките на вашата компанија
            за правилно издавање на фактурите.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 3 }}>
          {error}
        </Typography>
      )}

      <Card
        sx={{
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          borderRadius: "12px",
          p: 2,
        }}
      >
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Официјален назив на фирмата"
                fullWidth
                required
                value={companyData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="ЕДБ (Даночен број)"
                fullWidth
                required
                value={companyData.edb}
                onChange={(e) => handleChange("edb", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Адреса и седиште"
                fullWidth
                required
                value={companyData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Банкарски податоци
                </Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Жиро Сметка"
                fullWidth
                required
                value={companyData.giroAccount}
                onChange={(e) => handleChange("giroAccount", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Депонент банка"
                fullWidth
                required
                value={companyData.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Контакт информации
                </Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Телефонски број"
                fullWidth
                value={companyData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Официјален Е-маил"
                type="email"
                fullWidth
                value={companyData.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "#7c3aed", fontWeight: "600" }}
                >
                  Поставки за излезен е-маил сервер (Mailjet / SMTP)
                </Typography>
              </Divider>
            </Grid>

            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="SMTP Опслужувач (Host)"
                fullWidth
                placeholder="на пр. api.mailjet.com или smtp.mail.yahoo.com"
                value={companyData.smtpHost}
                onChange={(e) => handleChange("smtpHost", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Порт (Port)"
                fullWidth
                type="number"
                placeholder="465, 587 или 443"
                value={companyData.smtpPort}
                onChange={(e) => handleChange("smtpPort", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="SMTP Корисничко име / Маил"
                fullWidth
                type="email"
                placeholder="вашиот_верификуван_меил@домен.com"
                value={companyData.smtpUser}
                onChange={(e) => handleChange("smtpUser", e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="SMTP Апликациска Лозинка"
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder={
                  companyData.smtpHost
                    ? "Внесете нова лозинка само доколку ја менувате..."
                    : "Внесете ја лозинката..."
                }
                value={companyData.smtpPass}
                onChange={(e) => handleChange("smtpPass", e.target.value)}
                slotProps={{
                  input: {
                    autoComplete: "new-password",
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
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
                }}
              />
            </Grid>

            {/* АЖУРИРАНО: Вклучено и in-v3.mailjet.com со икона за брзо копирање */}
            <Grid size={{ xs: 12 }}>
              <Box
                sx={{
                  backgroundColor: "#f8fafc",
                  borderLeft: "4px solid #7c3aed",
                  p: 2,
                  borderRadius: "0 8px 8px 0",
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#334155",
                    display: "block",
                    fontSize: "12px",
                    mb: 1,
                    fontWeight: "500",
                  }}
                >
                  * Упатство за поврзување со <strong>Mailjet</strong>:
                </Typography>
                <Typography
                  variant="caption"
                  component="div" // Променето во div за да дозволи блок елементи внатре
                  sx={{
                    color: "#64748b",
                    display: "block",
                    fontSize: "11.5px",
                    lineHeight: 1.8,
                  }}
                >
                  1. Креирајте профил или најавете се на{" "}
                  <Link
                    href="https://app.mailjet.com/auth/login"
                    target="_blank"
                    rel="noopener"
                    sx={{
                      color: "#7c3aed",
                      fontWeight: "bold",
                      inlineFlex: "center",
                      textDecoration: "underline",
                    }}
                  >
                    Mailjet Dashboard{" "}
                    <LaunchIcon
                      sx={{ fontSize: 12, ml: 0.3, verticalAlign: "middle" }}
                    />
                  </Link>
                  .<br />
                  2. Во полињата погоре внесете ги следните SMTP параметри:
                  <br />• Хост:{" "}
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <code
                      style={{
                        backgroundColor: "#e2e8f0",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        color: "#0f172a",
                        fontWeight: "bold",
                      }}
                    >
                      in-v3.mailjet.com
                    </code>
                    <Tooltip title="Копирај хост" placement="top" arrow>
                      <IconButton
                        size="small"
                        sx={{ p: 0.3, color: "#7c3aed" }}
                        onClick={() => {
                          navigator.clipboard.writeText("in-v3.mailjet.com");
                          // alert("Хостот е копиран во таблата!");
                        }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <br />• Порт:{" "}
                  <code
                    style={{
                      backgroundColor: "#e2e8f0",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      color: "#0f172a",
                    }}
                  >
                    465
                  </code>{" "}
                  или{" "}
                  <code
                    style={{
                      backgroundColor: "#e2e8f0",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      color: "#0f172a",
                    }}
                  >
                    587
                  </code>
                  .<br />
                  3. Одете во{" "}
                  <strong>Account Settings &gt; API Key Management</strong> на
                  Mailjet за да ги земете вашите клучеви.
                  <br />
                  4. Во полето <strong>Корисничко име</strong> внесете го вашиот
                  верификуван е-маил, а во полето <strong>Лозинка</strong>{" "}
                  залепете ги клучевите во следниов формат:{" "}
                  <code
                    style={{
                      backgroundColor: "#e2e8f0",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      color: "#0f172a",
                      fontFamily: "monospace",
                    }}
                  >
                    API_KEY:SECRET_KEY
                  </code>{" "}
                  (разделени со две точки).
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={
            saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={saving}
          sx={{
            backgroundColor: "#0070f3",
            padding: "12px 32px",
            textTransform: "none",
            fontWeight: "bold",
            borderRadius: "8px",
          }}
        >
          {saving ? "Се зачувува..." : "Зачувај Поставки"}
        </Button>
      </Box>
    </Box>
  );
}
