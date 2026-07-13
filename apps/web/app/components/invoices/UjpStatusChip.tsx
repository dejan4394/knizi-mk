"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Chip, CircularProgress, Tooltip } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import SyncIcon from "@mui/icons-material/Sync";
import api from "../../utils/services/api";

/** Мора да се совпаѓа со UjpSubmissionStatus на бекендот. */
export type UjpStatus =
  | "DRAFT"
  | "QUEUED"
  | "SIGNING"
  | "SUBMITTING"
  | "AWAITING"
  | "APPROVED"
  | "REJECTED"
  | "ERROR"
  | "CANCELED";

interface UjpStatusResponse {
  status: UjpStatus;
  ujpDocumentId?: string | null;
  rejectionReason?: string | null;
  lastError?: string | null;
}

type ChipColor = "default" | "info" | "warning" | "success" | "error";

const STATUS_META: Record<
  UjpStatus,
  { label: string; color: ChipColor; icon: React.ReactElement }
> = {
  DRAFT: { label: "Нема поднесено", color: "default", icon: <CloudUploadIcon /> },
  QUEUED: { label: "Во ред за УЈП", color: "info", icon: <SyncIcon /> },
  SIGNING: { label: "Се потпишува…", color: "info", icon: <SyncIcon /> },
  SUBMITTING: { label: "Се испраќа до УЈП…", color: "info", icon: <SyncIcon /> },
  AWAITING: {
    label: "Чека одобрување",
    color: "warning",
    icon: <HourglassEmptyIcon />,
  },
  APPROVED: {
    label: "Одобрена од УЈП",
    color: "success",
    icon: <CloudDoneIcon />,
  },
  REJECTED: {
    label: "Одбиена од УЈП",
    color: "error",
    icon: <ReportProblemIcon />,
  },
  ERROR: { label: "Техничка грешка", color: "error", icon: <ReportProblemIcon /> },
  CANCELED: { label: "Сторнирана", color: "default", icon: <CloudUploadIcon /> },
};

/** Статуси кои сè уште се обработуваат — тука бараме нов статус (poll). */
const IN_FLIGHT: ReadonlySet<UjpStatus> = new Set<UjpStatus>([
  "QUEUED",
  "SIGNING",
  "SUBMITTING",
  "AWAITING",
]);

/** Статуси од кои корисникот може да (по)поднесе. */
const SUBMITTABLE: ReadonlySet<UjpStatus> = new Set<UjpStatus>([
  "DRAFT",
  "REJECTED",
  "ERROR",
]);

interface Props {
  invoiceId: number;
  /** Статусот на самата фактура — сторнираните не се праќаат до УЈП. */
  invoiceStatus?: string;
}

const POLL_MS = 5000;

export default function UjpStatusChip({ invoiceId, invoiceStatus }: Props) {
  const [data, setData] = useState<UjpStatusResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<UjpStatusResponse>(
        `/ujp/invoices/${invoiceId}/status`,
      );
      setData(res.data);
      // Продолжи да пингаш само додека сме во обработка.
      if (IN_FLIGHT.has(res.data.status)) {
        timerRef.current = setTimeout(fetchStatus, POLL_MS);
      }
    } catch (err) {
      console.error("Грешка при читање УЈП статус:", err);
    }
  }, [invoiceId]);

  useEffect(() => {
    void fetchStatus();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchStatus]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await api.post(`/ujp/invoices/${invoiceId}/submit`);
      // Веднаш освежи; бекендот веќе врати QUEUED и почна во позадина.
      await fetchStatus();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Системска грешка.";
      alert(`Неуспешно поднесување до УЈП: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const status: UjpStatus = data?.status ?? "DRAFT";
  const meta = STATUS_META[status];
  const reason = data?.rejectionReason || data?.lastError || undefined;
  const canceled = invoiceStatus === "CANCELED";
  const canSubmit = SUBMITTABLE.has(status) && !canceled;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Tooltip
        title={
          status === "APPROVED" && data?.ujpDocumentId
            ? `УЈП бр.: ${data.ujpDocumentId}`
            : reason || meta.label
        }
        arrow
      >
        <Chip
          size="small"
          icon={meta.icon}
          label={meta.label}
          color={meta.color}
          variant={status === "DRAFT" ? "outlined" : "filled"}
          sx={{ fontWeight: 600 }}
        />
      </Tooltip>

      {canSubmit && (
        <Tooltip
          title={status === "DRAFT" ? "Испрати до УЈП" : "Обиди се повторно"}
          arrow
        >
          <span>
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              onClick={submitting ? undefined : handleSubmit}
              disabled={submitting}
              icon={
                submitting ? (
                  <CircularProgress size={14} />
                ) : (
                  <CloudUploadIcon />
                )
              }
              label={status === "DRAFT" ? "УЈП" : "Повтори"}
              sx={{ cursor: submitting ? "default" : "pointer", fontWeight: 600 }}
            />
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
