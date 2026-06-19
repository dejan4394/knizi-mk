"use client";

import React, { useState, useEffect } from "react";
import api from "../../utils/services/api";

import {
  Box,
  Select,
  MenuItem,
  Chip,
  FormControl,
  CircularProgress,
  SelectChangeEvent,
  Button,
} from "@mui/material";
import TransformIcon from "@mui/icons-material/Transform";

export type InvoiceStatus =
  | "UNPAID"
  | "OVERDUE"
  | "PAID"
  | "CANCELED"
  | "CONVERTED"
  | "PROFORMA_PENDING"
  | "PROFORMA_PAID"; // НОВ СТАТУС

interface InvoiceStatusManagerProps {
  invoiceId: number;
  currentStatus: InvoiceStatus;
  dueDate: string;
  onStatusChangeSuccess?: (newStatus: InvoiceStatus) => void;
}

// Конфигурација на стилови за сите статуси
const getStatusConfig = (status: InvoiceStatus) => {
  switch (status) {
    case "UNPAID":
      return { label: "Неплатена", bgColor: "#fff7ed", textColor: "#c2410c" };
    case "OVERDUE":
      return { label: "Доцни", bgColor: "#fef2f2", textColor: "#dc2626" };
    case "PAID":
      return { label: "Платена", bgColor: "#dcfce7", textColor: "#15803d" };
    case "CANCELED":
      return { label: "Сторнирана", bgColor: "#f1f5f9", textColor: "#475569" };
    case "PROFORMA_PENDING":
      return {
        label: "Отворена Профактура",
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
      };
    case "PROFORMA_PAID":
      return {
        label: "Платена Профактура",
        bgColor: "#ecfdf5",
        textColor: "#065f46",
      }; // Стил за новата опција
    case "CONVERTED":
      return {
        label: "Конвертирана",
        bgColor: "#f8fafc",
        textColor: "#94a3b8",
      };
    default:
      return { label: status, bgColor: "#f1f5f9", textColor: "#475569" };
  }
};

export default function InvoiceStatusManager({
  invoiceId,
  currentStatus,
  onStatusChangeSuccess,
  dueDate,
}: InvoiceStatusManagerProps) {
  const [status, setStatus] = useState<InvoiceStatus>(currentStatus);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const isPastDue = new Date(dueDate) < new Date();
  const showOverdueOption = status === "OVERDUE" || isPastDue;

  // Заклучени статуси каде што нема повеќе менување
  const isLocked = status === "CANCELED" || status === "CONVERTED";

  const handleConvertProforma = async () => {
    const confirmConvert = window.confirm(
      "Дали сте сигурни дека сакате да ја конвертирате оваа платена профактура во официјална фактура? Ова ќе генерира нов број на фактура.",
    );
    if (!confirmConvert) return;

    try {
      setUpdating(true);
      await api.post(`/invoices/${invoiceId}/convert`);

      setStatus("CONVERTED");
      if (onStatusChangeSuccess) {
        onStatusChangeSuccess("CONVERTED");
      }
      alert("Успешно генерирана официјална фактура!");
    } catch (err: any) {
      console.error("Грешка при конверзија:", err);
      alert(
        `Грешка: ${err.response?.data?.message || "Конверзијата не е успешна."}`,
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (
    event: SelectChangeEvent<InvoiceStatus>,
  ) => {
    const nextStatus = event.target.value as InvoiceStatus;

    if (nextStatus === "CANCELED") {
      const confirmCancel = window.confirm(
        "Дали сте сигурни дека сакате да ја сторнирате оваа ставка? Оваа акција е трајна.",
      );
      if (!confirmCancel) return;
    }

    try {
      setUpdating(true);
      await api.patch(`/invoices/${invoiceId}/status`, { status: nextStatus });

      setStatus(nextStatus);
      if (onStatusChangeSuccess) {
        onStatusChangeSuccess(nextStatus);
      }
    } catch (err: any) {
      console.error("Грешка при ажурирање на статусот:", err);
      alert(
        `Грешка: ${err.response?.data?.message || "Статусот не е променет."}`,
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ minWidth: 160 }}>
        {updating ? (
          <Box
            sx={{ display: "flex", alignItems: "center", pl: 2, height: 24 }}
          >
            <CircularProgress size={18} sx={{ color: "#0070f3" }} />
          </Box>
        ) : (
          <FormControl fullWidth size="small">
            <Select
              value={status}
              onChange={handleStatusChange}
              disabled={isLocked}
              variant="standard"
              disableUnderline
              renderValue={(selected) => {
                const config = getStatusConfig(selected);
                return (
                  <Chip
                    label={config?.label}
                    size="small"
                    sx={{
                      fontWeight: "600",
                      fontSize: "0.8125rem",
                      backgroundColor: config?.bgColor,
                      color: config?.textColor,
                      cursor: isLocked ? "not-allowed" : "pointer",
                      "& .MuiChip-label": { px: 1.5 },
                    }}
                  />
                );
              }}
              sx={{
                "& .MuiSelect-select": {
                  paddingRight: "20px !important",
                  paddingLeft: "4px",
                  display: "flex",
                  alignItems: "center",
                },
                "& .MuiSelect-icon": {
                  display: isLocked ? "none" : "block",
                },
              }}
            >
              {/* ЛОГИКА ЗА ПРИКАЗ НА МЕНИ ОПЦИИ */}
              {status === "PROFORMA_PENDING" || status === "PROFORMA_PAID"
                ? [
                    /* 1. Ако е Профактура (Отворена или Платена) */
                    <MenuItem key="PROFORMA_PENDING" value="PROFORMA_PENDING">
                      Отворена Профактура
                    </MenuItem>,
                    <MenuItem
                      key="PROFORMA_PAID"
                      value="PROFORMA_PAID"
                      sx={{ color: "#065f46", fontWeight: "600" }}
                    >
                      Платена Профактура
                    </MenuItem>,
                    <MenuItem
                      key="CANCELED"
                      value="CANCELED"
                      sx={{ color: "#b91c1c" }}
                    >
                      Сторнирај
                    </MenuItem>,
                  ]
                : [
                    /* 2. Стандарден тек за обични Фактури */
                    <MenuItem key="UNPAID" value="UNPAID">
                      Неплатена
                    </MenuItem>,
                    <MenuItem
                      key="PAID"
                      value="PAID"
                      sx={{ color: "#15803d", fontWeight: "600" }}
                    >
                      Платена
                    </MenuItem>,
                    showOverdueOption && (
                      <MenuItem
                        key="OVERDUE"
                        value="OVERDUE"
                        sx={{ color: "#dc2626" }}
                      >
                        Доцни (Пробиен рок)
                      </MenuItem>
                    ),
                    <MenuItem
                      key="CANCELED"
                      value="CANCELED"
                      sx={{ color: "#b91c1c" }}
                    >
                      Сторнирај
                    </MenuItem>,
                  ]}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* УСЛОВ ЗА КОПЧЕТО: Се појавува ЕДИНСТВЕНО кога статусот е точно PROFORMA_PAID */}
      {status === "PROFORMA_PAID" && !updating && (
        <Button
          variant="contained"
          size="small"
          startIcon={<TransformIcon fontSize="small" />}
          onClick={handleConvertProforma}
          sx={{
            backgroundColor: "#10b981",
            textTransform: "none",
            fontWeight: "600",
            fontSize: "0.75rem",
            py: 0.4,
            px: 1.5,
            "&:hover": { backgroundColor: "#059669" },
          }}
        >
          Фактурирај (Генерирај Фактура)
        </Button>
      )}
    </Box>
  );
}
