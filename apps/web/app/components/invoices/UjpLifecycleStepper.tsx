"use client";

import React from "react";
import {
  Alert,
  Box,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";
import type { UjpStatus } from "./UjpStatusChip";

/**
 * Визуелен приказ на животниот циклус на поднесувањето кон УЈП.
 * Наменето за детална страница на фактурата (кога ќе се додаде таква рута).
 */

interface Props {
  status: UjpStatus;
  rejectionReason?: string | null;
  lastError?: string | null;
  ujpDocumentId?: string | null;
}

const STEPS = ["Креирана", "Потпишана", "Пратена до УЈП", "Одобрена"];

/** Мапирање статус → индекс на активен чекор. */
function activeStep(status: UjpStatus): number {
  switch (status) {
    case "DRAFT":
    case "QUEUED":
      return 0;
    case "SIGNING":
      return 1;
    case "SUBMITTING":
    case "AWAITING":
      return 2;
    case "APPROVED":
      return 4; // сите чекори завршени
    case "REJECTED":
    case "ERROR":
      return 2; // застанато на праќање
    case "CANCELED":
    default:
      return 0;
  }
}

export default function UjpLifecycleStepper({
  status,
  rejectionReason,
  lastError,
  ujpDocumentId,
}: Props) {
  const isError = status === "REJECTED" || status === "ERROR";
  const step = activeStep(status);

  return (
    <Box sx={{ width: "100%" }}>
      <Stepper activeStep={step} alternativeLabel>
        {STEPS.map((label, index) => (
          <Step key={label}>
            <StepLabel error={isError && index === 2}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {status === "APPROVED" && ujpDocumentId && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Фактурата е одобрена од УЈП. Број на документ: <b>{ujpDocumentId}</b>.
          Фактурата е заклучена — корекции се прават со сторнирање.
        </Alert>
      )}

      {status === "REJECTED" && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Одбиена од УЈП</Typography>
          {rejectionReason || "Причината не е доставена."}
        </Alert>
      )}

      {status === "ERROR" && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>Техничка грешка</Typography>
          {lastError || "Обидот за поднесување не успеа. Обидете се повторно."}
        </Alert>
      )}
    </Box>
  );
}
