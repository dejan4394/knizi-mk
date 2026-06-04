"use client";

import React, { useState } from "react";
import api from "../../utils/services/api";

import {
  Box,
  Select,
  MenuItem,
  Chip,
  FormControl,
  CircularProgress,
  SelectChangeEvent,
} from "@mui/material";

// Ажуриран тип со OVERDUE
export type InvoiceStatus = "UNPAID" | "OVERDUE" | "PAID" | "CANCELED";

interface InvoiceStatusManagerProps {
  invoiceId: number;
  currentStatus: InvoiceStatus;
  dueDate: string; // Го додаваме датумот за проверка
  onStatusChangeSuccess?: (newStatus: InvoiceStatus) => void;
}

// Конфигурација на стилови за сите 4 статуси
const getStatusConfig = (status: InvoiceStatus) => {
  switch (status) {
    case "UNPAID":
      return {
        label: "Неплатена",
        bgColor: "#fff7ed", // Светло портокалово
        textColor: "#c2410c",
      };
    case "OVERDUE":
      return {
        label: "Доцни",
        bgColor: "#fef2f2", // Алармантно црвеникаво/розево
        textColor: "#dc2626",
      };
    case "PAID":
      return {
        label: "Платена",
        bgColor: "#dcfce7", // Зелено
        textColor: "#15803d",
      };
    case "CANCELED":
      return {
        label: "Сторнирана",
        bgColor: "#f1f5f9", // Неутрално сиво за невалидни фактури
        textColor: "#475569",
      };
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

  // Претворање наdueDate во Date објект и споредба со денешниот момент
  const isPastDue = new Date(dueDate) < new Date();

  // Опцијата „Доцни“ е валидна САМО ако фактурата веќе е OVERDUE во базата ИЛИ ако рокот реално поминал
  const showOverdueOption = status === "OVERDUE" || isPastDue;

  const handleStatusChange = async (
    event: SelectChangeEvent<InvoiceStatus>,
  ) => {
    const nextStatus = event.target.value as InvoiceStatus;

    if (nextStatus === "CANCELED") {
      const confirmCancel = window.confirm(
        "Дали сте сигурни дека сакате да ја сторнирате оваа фактура? Оваа акција е трајна.",
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

  const currentConfig = getStatusConfig(status);
  const isLocked = status === "CANCELED";

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", minWidth: 130 }}>
      {updating ? (
        <Box sx={{ display: "flex", alignItems: "center", pl: 2, height: 24 }}>
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
                  label={config.label}
                  size="small"
                  sx={{
                    fontWeight: "600",
                    fontSize: "0.8125rem",
                    backgroundColor: config.bgColor,
                    color: config.textColor,
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
            {/* Опции во менито за рачна измена */}
            <MenuItem value="UNPAID">Неплатена</MenuItem>
            <MenuItem value="PAID">Платена</MenuItem>
            {/* СЕГА ГО КОРИСТИМЕ ДАТУМОТ: Опцијата се појавува САМО ако рокот е навистина поминат */}
            {showOverdueOption && (
              <MenuItem value="OVERDUE" sx={{ color: "#dc2626" }}>
                Доцни (Пробиен рок)
              </MenuItem>
            )}
            <MenuItem
              value="CANCELED"
              sx={{ color: "#b91c1c", fontWeight: "600" }}
            >
              Сторнирај
            </MenuItem>
          </Select>
        </FormControl>
      )}
    </Box>
  );
}
