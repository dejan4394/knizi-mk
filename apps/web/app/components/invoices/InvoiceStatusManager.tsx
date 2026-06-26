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
        bgColor: "#f0fdf4",
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

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 0.5,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "center" },
          width: "100%",
        }}
      >
        <Box sx={{ minWidth: { xs: "100%", sm: 160 } }}>
          {updating ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", sm: "flex-start" },
                pl: { xs: 0, sm: 2 },
                height: 32,
              }}
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
                        width: "100%",
                        "& .MuiChip-label": {
                          px: 1.5,
                          width: "100%",
                          textAlign: "center",
                        },
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
                    justifyContent: "center",
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
            // Ја намалуваме големината на иконата за да биде пропорционална со помалото копче
            startIcon={
              <TransformIcon sx={{ fontSize: "0.75rem !important" }} />
            }
            onClick={handleConvertProforma}
            sx={{
              backgroundColor: "#10b981",
              textTransform: "none",
              fontWeight: "600",
              fontSize: { xs: "0.7rem", sm: "0.75rem" },
              py: { xs: 0.8, sm: 0.6 },
              px: { xs: 1, sm: 1.5 },
              width: "auto",
              whiteSpace: "nowrap",
              minHeight: "unset",
              lineHeight: 1.2,
              "&:hover": { backgroundColor: "#059669" },
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "inline", sm: "none" } }}
            >
              Фактурирај
            </Box>
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Фактурирај (Генерирај Фактура)
            </Box>
          </Button>
        )}
      </Box>

      {/* Линк до Фактурата */}
      {status === "CONVERTED" && localConvertedTo && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "flex-start" },
            gap: 0.5,
            pl: 0.5,
            mt: 0.5,
          }}
        >
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

      {/* Од Профактура */}
      {convertedFrom && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: { xs: "center", sm: "flex-start" },
            gap: 0.5,
            pl: 0.5,
            mt: 0.5,
          }}
        >
          <LinkIcon sx={{ fontSize: "0.85rem", color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            Од{" "}
            <Link
              href={`/invoices/${convertedFrom.id}/edit`}
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
