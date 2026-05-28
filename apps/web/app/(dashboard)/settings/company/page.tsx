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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import BusinessIcon from "@mui/icons-material/Business";

export default function MyCompanySettingsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [companyData, setCompanyData] = useState({
    name: "",
    edb: "",
    address: "",
    giroAccount: "",
    bankName: "",
    phone: "",
    email: "",
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
      await api.put("/companies/my-company", companyData);
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

  const handleChange = (field: string, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
        <BusinessIcon sx={{ fontSize: 40, color: "#0070f3" }} />
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "#0f172a" }}
          >
            Профил на Мојата Фирма
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Уредете ги генералиите на вашата компанија за правилно издавање на
            фактурите.
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
