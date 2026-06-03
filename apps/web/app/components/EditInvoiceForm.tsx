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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

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

export const EditInvoiceForm: React.FC<EditInvoiceFormProps> = ({
  invoiceId,
  onSuccess,
}) => {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
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

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/invoices/${invoiceId}`);
        const data = res.data;

        setInvoiceNo(data.invoiceNo);
        if (data.dueDate) {
          setDueDate(new Date(data.dueDate).toISOString().split("T")[0] || "");
        }
        setNote(data.note || "");

        const mappedItems = (data.items || []).map(
          (item: InvoiceItemState) => ({
            description: item.description || "",
            quantity: Number(item.quantity) || 1,
            unitOfMeasure: item.unitOfMeasure || "ПАР",
            price: Number(item.price) || 0,
            discountPercent: Number(item.discountPercent) || 0,
            vatRate: Number(item.vatRate) || 18,
          }),
        );

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

  // 1. Пресметка на чиста основа по ставка (цена * количина - попуст)
  const getItemSubtotal = (item: InvoiceItemState) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.price) || 0;
    const d = Number(item.discountPercent) || 0;
    return p * (1 - d / 100) * q;
  };

  // 2. Пресметка на износ на ДДВ за ставката
  const getItemVatAmount = (item: InvoiceItemState) => {
    const subtotal = getItemSubtotal(item);
    const v = Number(item.vatRate) || 0;
    return subtotal * (v / 100);
  };

  // 3. Пресметка на вкупна вредност со вклучено ДДВ за ставката
  const getItemTotalWithVat = (item: InvoiceItemState) => {
    return getItemSubtotal(item) + getItemVatAmount(item);
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemState,
    value: unknown,
  ) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [field]:
          field === "description" || field === "unitOfMeasure"
            ? String(value)
            : Number(value) || 0,
      } as InvoiceItemState;
      return newItems;
    });
  };

  const addNewItemRow = () => {
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
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        invoiceNo,
        dueDate,
        note,
        items,
      };

      await api.patch(`/invoices/${invoiceId}`, payload);
      alert("Фактурата е успешно ажурирана!");
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

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: "1200px", margin: "0 auto", px: { xs: 2, sm: 0 } }}
    >
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
        Уредување на Фактура бр: {invoiceNo}
      </Typography>

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
                label="Број на фактура"
                variant="outlined"
                fullWidth
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                required
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
        Ставки на фактура
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
                disabled={items.length === 1}
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
                  >
                    <MenuItem value={18}>18% ДДВ</MenuItem>
                    <MenuItem value={5}>5% ДДВ</MenuItem>
                    <MenuItem value={0}>0% ДДВ</MenuItem>
                  </Select>
                </Grid>
              </Grid>

              <Divider sx={{ my: 0.5 }} />

              {/* Финансиски детали на мобилен */}
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
      {/* Го зголемивме maxWidth на контејнерот на 1200px за да ги собере сите пресметки фино */}
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

              {/* Новите пресметковни колони */}
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
                  >
                    <MenuItem value={18}>18%</MenuItem>
                    <MenuItem value={5}>5%</MenuItem>
                    <MenuItem value={0}>0%</MenuItem>
                  </Select>
                </TableCell>

                {/* 1. Динамички приказ на пресметаниот износ на ДДВ */}
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

                {/* 2. Динамички приказ на Вкупно со ДДВ по ставка */}
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
                    disabled={items.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Копче за додавање ставка */}
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

      {/* Забелешка и Финансиски преглед */}
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

      {/* Копче за зачувување */}
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
    </Box>
  );
};
