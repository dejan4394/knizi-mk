"use client";

import React, { useState, useEffect } from "react";
import api from "../utils/services/api"; // Твојата axios инстанца
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import DownloadIcon from "@mui/icons-material/Download";

interface InvoiceItemState {
  description: string;
  quantity: number;
  unitOfMeasure: string;
  price: number;
  discountPercent: number;
  vatRate: number;
}

interface EditInvoiceFormProps {
  invoiceId: number;
  onSuccess: () => void;
}

const documentTypeLabels: Record<string, string> = {
  INVOICE: "Фактура",
  PROFORMA: "Профактура",
};

export const EditInvoiceForm: React.FC<EditInvoiceFormProps> = ({
  invoiceId,
  onSuccess,
}) => {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [documentType, setDocumentType] = useState<string>("INVOICE");
  const [status, setStatus] = useState<string>(""); // Статус на документот (CONVERTED, PAID, DRAFT...)
  const [items, setItems] = useState<InvoiceItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState({
    subtotal: 0,
    vat: 0,
    total: 0,
    rounding: 0,
    final: 0,
  });

  // Логика за заклучување на формата
  const isConverted = status === "CONVERTED";
  const isPaid = status === "PAID";
  const isLocked = isConverted || isPaid;

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invoices/${invoiceId}`);
        const data = res.data;

        setInvoiceNo(data.invoiceNo);

        if (data.documentType) {
          setDocumentType(data.documentType);
        }

        if (data.status) {
          setStatus(data.status);
        }

        if (data.dueDate) {
          setDueDate(new Date(data.dueDate).toISOString().split("T")[0] || "");
        }
        setNote(data.note || "");

        const mappedItems = (data.items || []).map((item: any) => ({
          description: item.description || "",
          quantity:
            item.quantity !== undefined && item.quantity !== null
              ? Number(item.quantity)
              : 1,
          unitOfMeasure: item.unitOfMeasure || "ПАР",
          price:
            item.price !== undefined && item.price !== null
              ? Number(item.price)
              : 0,
          discountPercent:
            item.discountPercent !== undefined && item.discountPercent !== null
              ? Number(item.discountPercent)
              : 0,
          vatRate:
            item.vatRate !== undefined && item.vatRate !== null
              ? Number(item.vatRate)
              : 18,
        }));

        setItems(mappedItems);
      } catch (err) {
        console.error("Грешка при вчитување на фактурата:", err);
        alert("Неуспешно вчитување на податоците за фактурата.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  useEffect(() => {
    let subtotalAmount = 0;
    let vatAmount = 0;

    items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.price) || 0;
      const d = Number(item.discountPercent) || 0;
      const v = Number(item.vatRate) || 0;

      const priceAfterDiscount = p * (1 - d / 100);
      const itemSubtotal = priceAfterDiscount * q;
      const itemVat = itemSubtotal * (v / 100);

      subtotalAmount += itemSubtotal;
      vatAmount += itemVat;
    });

    const exactTotal = subtotalAmount + vatAmount;
    const finalPayable = Math.round(exactTotal);
    const roundingAmount = finalPayable - exactTotal;

    setSummary({
      subtotal: subtotalAmount,
      vat: vatAmount,
      total: exactTotal,
      rounding: roundingAmount,
      final: finalPayable,
    });
  }, [items]);

  const getItemSubtotal = (item: InvoiceItemState) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.price) || 0;
    const d = Number(item.discountPercent) || 0;
    return p * (1 - d / 100) * q;
  };

  const getItemVatAmount = (item: InvoiceItemState) => {
    const subtotal = getItemSubtotal(item);
    const v = Number(item.vatRate) || 0;
    return subtotal * (v / 100);
  };

  const getItemTotalWithVat = (item: InvoiceItemState) => {
    return getItemSubtotal(item) + getItemVatAmount(item);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemState,
    value: unknown,
  ) => {
    if (isLocked) return;

    setItems((prevItems) => {
      const newItems = [...prevItems];
      let finalValue: string | number = 0;

      if (field === "description" || field === "unitOfMeasure") {
        finalValue = String(value);
      } else {
        finalValue =
          value === "" || value === null || value === undefined
            ? 0
            : Number(value);
      }

      newItems[index] = {
        ...newItems[index],
        [field]: finalValue,
      } as InvoiceItemState;
      return newItems;
    });
  };

  const addNewItemRow = () => {
    if (isLocked) return;
    setItems([
      ...items,
      {
        description: "",
        quantity: 1,
        unitOfMeasure: "ПАР",
        price: 0,
        discountPercent: 0,
        vatRate: 18,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (isLocked) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDownload = async () => {
    try {
      // Го повикуваме бекендот со соодветниот responseType за бинарни податоци (blob)
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });

      // Креираме Blob објект од податоците
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);

      // Динамично име во зависност од типот (Фактура или Профактура)
      const prefix = documentType === "PROFORMA" ? "Profaktura" : "Faktura";
      link.download = `${prefix}-${invoiceNo}.pdf`;

      // Го симулираме кликот за преземање
      link.click();

      // Чистиме во меморијата
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Грешка при преземање на PDF:", err);
      alert("Неуспешно преземање на PDF фајлот.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    try {
      setSubmitting(true);
      const payload = {
        invoiceNo,
        dueDate,
        note,
        items,
      };

      await api.patch(`/invoices/${invoiceId}`, payload);
      alert("Измените се успешно ажурирани!");
      onSuccess();
    } catch (err) {
      console.error("Грешка при ажурирање:", err);
      alert("Настана грешка при зачувување на измените.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const docLabel = documentTypeLabels[documentType] || "Документ";

  // Одредување на точниот текст за Alert-от
  let alertMessage = "";
  if (isPaid) {
    alertMessage = "ФАКТУРАТА Е ПЛАТЕНА И НЕ МОЖЕ ДА СЕ МЕНУВА";
  } else if (isConverted) {
    alertMessage = "ПРОФАКТУРАТА Е КОНВЕРТИРАНА И НЕ МОЖЕ ДА СЕ МЕНУВА";
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: "1200px", margin: "0 auto", px: { xs: 2, sm: 0 } }}
    >
      {/* Динамичен приказ на Alert во зависност од статусот */}
      {isLocked && (
        <Alert
          severity={isPaid ? "success" : "error"} // Зелено за платено, црвено за конвертирано
          variant="filled"
          icon={<LockIcon />}
          sx={{
            mb: 4,
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: { xs: "0.9rem", sm: "1rem" },
          }}
        >
          {alertMessage}
        </Alert>
      )}

      {invoiceNo && (
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 4,
            color: "#0f172a",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.25rem" },
            textAlign: { xs: "center", sm: "left" },
          }}
        >
          {isLocked
            ? `Преглед на ${docLabel.toLowerCase()}`
            : `Уредување на ${docLabel.toLowerCase()}`}{" "}
          бр: {invoiceNo}
        </Typography>
      )}

      {/* Мета податоци */}
      <Card
        sx={{
          mb: 4,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          borderRadius: "12px",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label={`Број на ${docLabel.toLowerCase()}`}
                variant="outlined"
                fullWidth
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                required
                disabled={isLocked}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Рок за плаќање"
                type="date"
                variant="outlined"
                fullWidth
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                disabled={isLocked}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography
        variant="h6"
        sx={{ fontWeight: "bold", mb: 2, color: "#334155" }}
      >
        Ставки на {docLabel.toLowerCase()}
      </Typography>

      {/* ---------------- SCENARIO A: МОБИЛЕН ПРИКАЗ ---------------- */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          gap: 3,
          mb: 2,
        }}
      >
        {items.map((item, index) => (
          <Card
            key={index}
            variant="outlined"
            sx={{
              borderRadius: "12px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              border: "1px solid #e2e8f0",
            }}
          >
            <Box
              sx={{
                p: 2,
                backgroundColor: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <Typography sx={{ fontWeight: "bold", color: "#0070f3" }}>
                Ставка #{index + 1}
              </Typography>
              <IconButton
                color="error"
                onClick={() => removeItemRow(index)}
                disabled={items.length === 1 || isLocked}
                size="small"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <CardContent
              sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}
            >
              <TextField
                label="Опис на артикл / услуга"
                multiline
                maxRows={5}
                variant="outlined"
                size="small"
                fullWidth
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                required
                disabled={isLocked}
              />
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="ЕМ"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={item.unitOfMeasure}
                    onChange={(e) =>
                      handleItemChange(index, "unitOfMeasure", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Количина"
                    type="number"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    required
                    disabled={isLocked}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Цена (ден)"
                    type="number"
                    variant="outlined"
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { step: "0.01" } }}
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                    required
                    disabled={isLocked}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    label="Попуст %"
                    type="number"
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={item.discountPercent}
                    onChange={(e) =>
                      handleItemChange(index, "discountPercent", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Select
                    size="small"
                    fullWidth
                    value={item.vatRate}
                    onChange={(e) =>
                      handleItemChange(index, "vatRate", Number(e.target.value))
                    }
                    disabled={isLocked}
                  >
                    <MenuItem value={18}>18% ДДВ</MenuItem>
                    <MenuItem value={5}>5% ДДВ</MenuItem>
                    <MenuItem value={0}>0% ДДВ</MenuItem>
                  </Select>
                </Grid>
              </Grid>

              <Divider sx={{ my: 0.5 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="textSecondary">
                    Основа:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: "500" }}>
                    {getItemSubtotal(item).toFixed(2)} ден.
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="textSecondary">
                    Износ ДДВ ({item.vatRate}%):
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "500", color: "#64748b" }}
                  >
                    {getItemVatAmount(item).toFixed(2)} ден.
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 0.5,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: "600", color: "#0f172a" }}
                  >
                    Вкупно со ДДВ:
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: "700", color: "#0070f3" }}
                  >
                    {getItemTotalWithVat(item).toFixed(2)} ден.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ---------------- SCENARIO Б: ДЕСКТОП ПРИКАЗ ---------------- */}
      <TableContainer
        component={Paper}
        sx={{
          display: { xs: "none", md: "block" },
          mb: 3,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                Опис на артикл / услуга
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "65px" }}>
                ЕМ
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "80px" }}>
                Кол.
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "115px" }}>
                Цена (ден)
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "85px" }}>
                Попуст %
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "95px" }}>
                ДДВ %
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", width: "110px" }}
                align="right"
              >
                Износ ДДВ
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", width: "120px" }}
                align="right"
              >
                Вкупно со ДДВ
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", width: "60px" }}
                align="center"
              >
                Акции
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={index}>
                <TableCell sx={{ p: 0.8 }}>
                  <TextField
                    multiline
                    maxRows={5}
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                    required
                    disabled={isLocked}
                  />
                </TableCell>
                <TableCell sx={{ p: 0.8 }}>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={item.unitOfMeasure}
                    onChange={(e) =>
                      handleItemChange(index, "unitOfMeasure", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </TableCell>
                <TableCell sx={{ p: 0.8 }}>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(index, "quantity", e.target.value)
                    }
                    required
                    disabled={isLocked}
                  />
                </TableCell>
                <TableCell sx={{ p: 0.8 }}>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    slotProps={{ htmlInput: { step: "0.01" } }}
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                    required
                    disabled={isLocked}
                  />
                </TableCell>
                <TableCell sx={{ p: 0.8 }}>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    value={item.discountPercent}
                    onChange={(e) =>
                      handleItemChange(index, "discountPercent", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </TableCell>
                <TableCell sx={{ p: 0.8 }}>
                  <Select
                    size="small"
                    fullWidth
                    value={item.vatRate}
                    onChange={(e) =>
                      handleItemChange(index, "vatRate", Number(e.target.value))
                    }
                    disabled={isLocked}
                  >
                    <MenuItem value={18}>18%</MenuItem>
                    <MenuItem value={5}>5%</MenuItem>
                    <MenuItem value={0}>0%</MenuItem>
                  </Select>
                </TableCell>
                <TableCell sx={{ p: 0.8 }} align="right">
                  <Typography
                    sx={{
                      color: "#64748b",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                    }}
                  >
                    {getItemVatAmount(item).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ p: 0.8, pr: 1.5 }} align="right">
                  <Typography
                    sx={{
                      fontWeight: "700",
                      color: "#0f172a",
                      fontSize: "0.9rem",
                    }}
                  >
                    {getItemTotalWithVat(item).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ p: 0.8 }} align="center">
                  <IconButton
                    color="error"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length === 1 || isLocked}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Копчето за нова ставка се рендерира само ако формата не е заклучена */}
      {!isLocked && (
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addNewItemRow}
          fullWidth={{ xs: true, sm: false } as any}
          sx={{
            mb: 4,
            textTransform: "none",
            fontWeight: "600",
            borderRadius: "8px",
            py: { xs: 1.2, sm: 1 },
          }}
        >
          Додади ставка
        </Button>
      )}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            label="Забелешка / Даночна клаузула"
            variant="outlined"
            multiline
            rows={4}
            fullWidth
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isLocked}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            sx={{
              backgroundColor: "#f8fafc",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              borderRadius: "12px",
            }}
          >
            <CardContent
              sx={{ p: 3, display: "flex", flexDirection: "column", gap: 1.5 }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="textSecondary">Вкупно основа:</Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  {summary.subtotal.toFixed(2)} ден.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="textSecondary">Вкупно ДДВ:</Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  {summary.vat.toFixed(2)} ден.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="textSecondary">Вредност со ДДВ:</Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  {summary.total.toFixed(2)} ден.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography color="textSecondary">Израмнување:</Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  {summary.rounding.toFixed(2)} ден.
                </Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  За плаќање:
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "#10b981" }}
                >
                  {summary.final} ден.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Условен приказ на копчињата на дното */}
      {isLocked ? (
        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          sx={{
            backgroundColor: "#2563eb",
            padding: "12px 32px",
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "16px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "#1d4ed8" },
          }}
        >
          Превземи го документот (PDF)
        </Button>
      ) : (
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          startIcon={
            submitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={submitting}
          sx={{
            backgroundColor: "#0070f3",
            padding: "12px 32px",
            textTransform: "none",
            fontWeight: "bold",
            fontSize: "16px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "#0051bb" },
          }}
        >
          {submitting ? "Се зачувува..." : "Зачувај ги измените"}
        </Button>
      )}
    </Box>
  );
};
