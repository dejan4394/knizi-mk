"use client";

import React, { useState, useEffect } from "react";
import api from "../../utils/services/api";
import Link from "next/link";

import {
  Box,
  Select,
  MenuItem,
  Chip,
  FormControl,
  CircularProgress,
  SelectChangeEvent,
  Button,
  Typography,
} from "@mui/material";
import TransformIcon from "@mui/icons-material/Transform";
import LinkIcon from "@mui/icons-material/Link";

export type InvoiceStatus =
  | "UNPAID"
  | "OVERDUE"
  | "PAID"
  | "CANCELED"
  | "CONVERTED"
  | "PROFORMA_PENDING"
  | "PROFORMA_PAID";

// Дефиниција на поедноставен интерфејс за релациските документи што доаѓаат од BE
interface RelatedInvoiceInfo {
  id: number;
  invoiceNo: number;
  year: number;
}

interface InvoiceStatusManagerProps {
  invoiceId: number;
  currentStatus: InvoiceStatus;
  dueDate: string;
  onStatusChangeSuccess?: (newStatus: InvoiceStatus) => void;
  // НОВИ ПРОПС: Ги прифаќаме поврзаните објекти од табелата/деталите
  convertedFrom?: RelatedInvoiceInfo | null;
  convertedTo?: RelatedInvoiceInfo | null;
}

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
      };
    case "CONVERTED":
      return {
        label: "Конвертирана",
        bgColor: "#f0fdf4", // малку позеленкаста нијанса бидејќи е успешно завршена работа
        textColor: "#15803d",
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
  convertedFrom,
  convertedTo,
}: InvoiceStatusManagerProps) {
  const [status, setStatus] = useState<InvoiceStatus>(currentStatus);
  const [updating, setUpdating] = useState(false);
  // Локална состојба за зачувување на новогенерираната фактура по конверзија на истата страница
  const [localConvertedTo, setLocalConvertedTo] =
    useState<RelatedInvoiceInfo | null>(convertedTo || null);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setLocalConvertedTo(convertedTo || null);
  }, [convertedTo]);

  const isPastDue = new Date(dueDate) < new Date();
  const showOverdueOption = status === "OVERDUE" || isPastDue;
  const isLocked = status === "CANCELED" || status === "CONVERTED";

  const handleConvertProforma = async () => {
    const confirmConvert = window.confirm(
      "Дали сте сигурни дека сакате да ја конвертирате оваа платена профактура во официјална фактура? Ова ќе генерира нов број на фактура.",
    );
    if (!confirmConvert) return;

    try {
      setUpdating(true);
      // Претпоставуваме дека бекендот ја враќа новокреираната фактура { id, invoiceNo, year }
      const response = await api.post(`/invoices/${invoiceId}/convert`);

      if (response.data) {
        setLocalConvertedTo({
          id: response.data.id,
          invoiceNo: response.data.invoiceNo,
          year: response.data.year,
        });
      }

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

  console.log(convertedFrom, convertedTo);

  return (
    <Box sx={{ display: "inline-flex", flexDirection: "column", gap: 0.5 }}>
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
                {status === "PROFORMA_PENDING" || status === "PROFORMA_PAID"
                  ? [
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
              "& Parks-root": {},
              "&:hover": { backgroundColor: "#059669" },
            }}
          >
            Фактурирај (Генерирај Фактура)
          </Button>
        )}
      </Box>

      {/* ЧЕКОР 1: Ако ова е Профактура која е веќе конвертирана, прикажи линк до Фактурата */}
      {status === "CONVERTED" && localConvertedTo && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 0.5 }}>
          <LinkIcon sx={{ fontSize: "0.85rem", color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            Линк до{" "}
            <Link
              href={`/invoices/${localConvertedTo.id}/edit`}
              style={{
                color: "#10b981",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              Фактура #{localConvertedTo.invoiceNo}/{localConvertedTo.year}
            </Link>
          </Typography>
        </Box>
      )}

      {/* ЧЕКОР 2: Ако ова е обична финална Фактура која настанало од Профактура */}
      {convertedFrom && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 0.5 }}>
          <LinkIcon sx={{ fontSize: "0.85rem", color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            Од{" "}
            <Link
              href={`/invoices/${convertedFrom.id}/edit`} // или соодветната рута за профактури ако е различна
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                fontWeight: 500,
              }}
            >
              Профактура #{convertedFrom.invoiceNo}/{convertedFrom.year}
            </Link>
          </Typography>
        </Box>
      )}
    </Box>
  );
}
