"use client";

import React, { useState, useEffect } from "react";
import api from "../../../utils/services/api"; // Осигурај се дека патеката до твојот axios инстанца е точна

import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitOfMeasure: string;
  price: number;
  discountPercent: number;
  vatRate: number;
}

export default function CreateInvoicePage() {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const [items, setItems] = useState<InvoiceItemInput[]>([
    {
      description: "",
      quantity: 1,
      unitOfMeasure: "ПАР",
      price: 0,
      discountPercent: 0,
      vatRate: 18,
    },
  ]);

  const [summary, setSummary] = useState({
    subtotal: 0,
    vat: 0,
    total: 0,
    rounding: 0,
    final: 0,
  });

  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(true);

  // Повлекување на клиентите од базата веднаш штом ќе се отвори формата
  useEffect(() => {
    const fetchClientsForForm = async () => {
      try {
        setLoadingClients(true);
        const response = await api.get("/clients");
        setClients(response.data);

        // Ако веќе има клиенти во базата, автоматски селектирај го првиот
        if (response.data.length > 0) {
          setClientId(response.data[0].id.toString());
        }
      } catch (err) {
        console.error(
          "Грешка при вчитување на клиентите во формата за фактури:",
          err,
        );
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClientsForForm();
  }, []);

  const handleAddItem = () => {
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

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItemInput,
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
      } as InvoiceItemInput;
      return newItems;
    });
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      invoiceNo,
      clientId: Number(clientId) || 1,
      dueDate,
      note,
      items,
    };

    try {
      const response = await api.post("/invoices", payload);

      if (response.status === 201 || response.status === 200) {
        alert("Фактурата е успешно зачувана во базата!");
        setInvoiceNo("");
        setClientId("");
        setNote("");
        setItems([
          {
            description: "",
            quantity: 1,
            unitOfMeasure: "ПАР",
            price: 0,
            discountPercent: 0,
            vatRate: 18,
          },
        ]);
      }
    } catch (error: any) {
      console.error("API Error:", error);
      alert(
        `Грешка: ${error.response?.data?.message || "Неуспешно издавање."}`,
      );
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: "1100px", margin: "0 auto" }}
    >
      <Typography
        variant="h4"
        sx={{ fontWeight: "bold", mb: 4, color: "#0f172a" }}
      >
        Креирај Нова Фактура
      </Typography>

      {/* Мета податоци (MUI v6 компатибилен синтаксис со size) */}
      <Card sx={{ mb: 4, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
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
              <FormControl fullWidth required variant="outlined">
                <InputLabel id="client-select-label">Избери Клиент</InputLabel>
                <Select
                  labelId="client-select-label"
                  id="client-select"
                  label="Избери Клиент"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={loadingClients}
                >
                  {loadingClients ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} sx={{ mr: 1 }} /> Вчитување
                      клиенти...
                    </MenuItem>
                  ) : clients.length === 0 ? (
                    <MenuItem disabled>Нема внесено клиенти во базата</MenuItem>
                  ) : (
                    clients.map((client) => (
                      <MenuItem key={client.id} value={client.id.toString()}>
                        {client.name} ({client.edb})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Рок на плаќање"
                type="date"
                variant="outlined"
                fullWidth
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Табела со ставки */}
      <TableContainer
        component={Paper}
        sx={{ mb: 3, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>
                Опис на артикл / услуга
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "90px" }}>
                ЕМ
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Количина
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "140px" }}>
                Цена (ден)
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "100px" }}>
                Попуст %
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", width: "110px" }}>
                ДДВ %
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
                <TableCell sx={{ p: 1.5 }}>
                  <TextField
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
                <TableCell sx={{ p: 1.5 }}>
                  <TextField
                    variant="outlined"
                    size="small"
                    value={item.unitOfMeasure}
                    onChange={(e) =>
                      handleItemChange(index, "unitOfMeasure", e.target.value)
                    }
                  />
                </TableCell>
                <TableCell sx={{ p: 1.5 }}>
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
                <TableCell sx={{ p: 1.5 }}>
                  <TextField
                    type="number"
                    variant="outlined"
                    size="small"
                    slotProps={{
                      htmlInput: { step: "0.01" },
                    }}
                    value={item.price}
                    onChange={(e) =>
                      handleItemChange(index, "price", e.target.value)
                    }
                    required
                  />
                </TableCell>
                <TableCell sx={{ p: 1.5 }}>
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
                <TableCell sx={{ p: 1.5 }}>
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
                <TableCell sx={{ p: 1.5 }} align="center">
                  {items.length > 1 && (
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddItem}
        sx={{ mb: 4, textTransform: "none", fontWeight: "600" }}
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

      <Button
        type="submit"
        variant="contained"
        size="large"
        startIcon={<SaveIcon />}
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
        Зачувај и Издади Фактура
      </Button>
    </Box>
  );
}
