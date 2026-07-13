"use client";

import React, { useState, useEffect } from "react";
import api from "../../../utils/services/api";
import { useAuth } from "../../../context/AuthContext";

import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";

interface PlanDefinition {
  id: "FREE" | "PRO";
  name: string;
  priceDenars: number;
  features: string[];
}

interface BillingOverview {
  currentPlan: "FREE" | "PRO";
  planStartedAt: string | null;
  planExpiresAt: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  plans: PlanDefinition[];
}

// Предисполнети вредности со тест-картичка на Стопанска банка (за демо).
const DEFAULT_CARD = {
  pan: "4111 1111 1111 1111",
  expiryMonth: 12,
  expiryYear: 2030,
  cvv: "123",
  cardHolder: "TEST KORISNIK",
};

export default function BillingPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Дијалог за внес на податоци од картичка при надградба на ПРО.
  const [cardDialogOpen, setCardDialogOpen] = useState<boolean>(false);
  const [card, setCard] = useState(DEFAULT_CARD);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const response = await api.get("/billing");
      setBilling(response.data);
    } catch (err) {
      console.error("Грешка при вчитување на претплатата:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  // Надградба на ПРО - отвора дијалог за внес на картичка (токенизација).
  const handleUpgradeClick = () => {
    setCard(DEFAULT_CARD);
    setCardDialogOpen(true);
  };

  // Праќање на податоците од картичката до бекендот за токенизација + наплата.
  const handleSubmitCard = async () => {
    try {
      setSaving(true);
      const response = await api.post("/billing/upgrade", {
        pan: card.pan.replace(/\s+/g, ""),
        expiryMonth: Number(card.expiryMonth),
        expiryYear: Number(card.expiryYear),
        cvv: card.cvv,
        cardHolder: card.cardHolder,
      });
      setBilling(response.data);
      setCardDialogOpen(false);
      alert("Про планот е активиран! Наплатата е успешна.");
    } catch (err: any) {
      // 402 = одбиена картичка, 400 = невалидни податоци.
      alert(`Грешка: ${err.response?.data?.message || "Неуспешна наплата."}`);
    } finally {
      setSaving(false);
    }
  };

  // Враќање на бесплатниот план.
  const handleDowngrade = async () => {
    if (!window.confirm("Дали сакате да се вратите на бесплатниот план?")) return;

    try {
      setSaving(true);
      const response = await api.post("/billing/downgrade");
      setBilling(response.data);
      alert("Успешно се вративте на бесплатниот план.");
    } catch (err: any) {
      alert(`Грешка: ${err.response?.data?.message || "Неуспешна акција."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePlan = (target: "FREE" | "PRO") => {
    if (target === "PRO") {
      handleUpgradeClick();
    } else {
      handleDowngrade();
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

  if (!billing) {
    return (
      <Box sx={{ maxWidth: "1000px", margin: "0 auto", px: 2, mt: 4 }}>
        <Typography color="error">
          Не успеавме да ги вчитаме податоците за претплата.
        </Typography>
      </Box>
    );
  }

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString("mk-MK") : "—";

  return (
    <Box sx={{ maxWidth: "1000px", margin: "0 auto", px: 2 }}>
      {/* Хедер */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4, mt: 2 }}>
        <CreditCardIcon sx={{ fontSize: 40, color: "#0070f3" }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: "#0f172a" }}>
            Претплата
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Изберете план кој одговара на потребите на вашата фирма.
          </Typography>
        </Box>
      </Box>

      {/* Тековен статус */}
      <Card
        sx={{
          mb: 4,
          borderRadius: "12px",
          backgroundColor: "#f8fafc",
          boxShadow: "none",
          border: "1px solid #e2e8f0",
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="body2" color="textSecondary">
              Тековен план
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {billing.currentPlan === "PRO" ? "Про" : "Бесплатен"}
              </Typography>
              <Chip
                size="small"
                label={billing.currentPlan}
                color={billing.currentPlan === "PRO" ? "primary" : "default"}
              />
            </Box>
          </Box>
          {billing.currentPlan === "PRO" && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" color="textSecondary">
                Автоматско обновување
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "600" }}>
                {formatDate(billing.planExpiresAt)}
              </Typography>
              {billing.cardLast4 && (
                <Typography variant="caption" color="textSecondary">
                  {billing.cardBrand} •••• {billing.cardLast4}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Планови */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        {billing.plans.map((plan) => {
          const isCurrent = plan.id === billing.currentPlan;
          const isPro = plan.id === "PRO";

          return (
            <Card
              key={plan.id}
              sx={{
                borderRadius: "16px",
                border: isCurrent
                  ? "2px solid #0070f3"
                  : "1px solid #e2e8f0",
                boxShadow: isPro
                  ? "0 10px 25px -5px rgba(0,112,243,0.15)"
                  : "0 4px 6px -1px rgba(0,0,0,0.05)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isPro && (
                <Chip
                  icon={<StarIcon />}
                  label="Препорачано"
                  color="primary"
                  size="small"
                  sx={{ position: "absolute", top: 16, right: 16 }}
                />
              )}
              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {plan.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mt: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                    {plan.priceDenars}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    ден/месец
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <List dense disablePadding>
                  {plan.features.map((feature, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircleIcon
                          fontSize="small"
                          sx={{ color: "#22c55e" }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2">{feature}</Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>

              <Box sx={{ p: 3, pt: 0 }}>
                {isCurrent ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
                    sx={{ textTransform: "none", borderRadius: "8px" }}
                  >
                    Активен план
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant={isPro ? "contained" : "outlined"}
                    disabled={!isOwner || saving}
                    onClick={() => handleChangePlan(plan.id)}
                    sx={{
                      textTransform: "none",
                      fontWeight: "bold",
                      borderRadius: "8px",
                      ...(isPro && {
                        backgroundColor: "#0070f3",
                        "&:hover": { backgroundColor: "#0051b3" },
                      }),
                    }}
                  >
                    {isPro ? "Надгради на Про" : "Врати на Бесплатен"}
                  </Button>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>

      {!isOwner && (
        <Typography
          variant="caption"
          color="textSecondary"
          sx={{ display: "block", mt: 3, textAlign: "center" }}
        >
          Само сопственикот на фирмата може да ја менува претплатата.
        </Typography>
      )}

      {/* Дијалог за внес на картичка (токенизација преку Стопанска банка) */}
      <Dialog
        open={cardDialogOpen}
        onClose={() => !saving && setCardDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          Податоци за плаќање
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Картичката се наплаќа 500 ден. и се зачувува за автоматско месечно
            обновување. (Демо - предисполнета тест-картичка.)
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Име на носител"
              value={card.cardHolder}
              onChange={(e) => setCard({ ...card, cardHolder: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Број на картичка"
              value={card.pan}
              onChange={(e) => setCard({ ...card, pan: e.target.value })}
              fullWidth
              size="small"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                select
                label="Месец"
                value={card.expiryMonth}
                onChange={(e) =>
                  setCard({ ...card, expiryMonth: Number(e.target.value) })
                }
                size="small"
                sx={{ flex: 1 }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MenuItem key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Година"
                type="number"
                value={card.expiryYear}
                onChange={(e) =>
                  setCard({ ...card, expiryYear: Number(e.target.value) })
                }
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label="CVV"
                value={card.cvv}
                onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCardDialogOpen(false)}
            disabled={saving}
            sx={{ textTransform: "none" }}
          >
            Откажи
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitCard}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              backgroundColor: "#0070f3",
              "&:hover": { backgroundColor: "#0051b3" },
            }}
          >
            {saving ? "Се наплаќа..." : "Плати 500 ден."}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
