"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Paper, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { EditInvoiceForm } from "../../../../components/EditInvoiceForm"; // Ја повикуваме формата од компоненти

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();

  // Next.js автоматски го зема ID-то од URL-то (на пр. /invoices/12/edit)
  const invoiceId = Number(params.id);

  return (
    <Box sx={{ p: 4 }}>
      {/* Копче за назад кон листата ако корисникот се премисли */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/invoices")}
        sx={{ mb: 3, textTransform: "none" }}
      >
        Назад кон фактури
      </Button>

      {/* Ја рендерираме твојата форма на средина во убав MUI Paper контејнер */}
      <Paper
        sx={{
          p: 4,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <EditInvoiceForm
          invoiceId={invoiceId}
          onSuccess={() => {
            // Штом успешно ќе зачува на бекенд, го враќаме на главната табела
            router.push("/invoices");
          }}
        />
      </Paper>
    </Box>
  );
}
