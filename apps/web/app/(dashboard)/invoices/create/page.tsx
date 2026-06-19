"use client";

import React, { useState, useEffect } from "react";
import api from "../../../utils/services/api";

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
  Tooltip,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitOfMeasure: string;
  price: number;
  discountPercent: number;
  vatRate: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();

  // Состојба за тип на документ (Фактура или Профактура)
  const [documentType, setDocumentType] = useState<"INVOICE" | "PROFORMA">(
    "INVOICE",
  );

  // ИЗМЕНЕТО: Почетната вредност е 0 бидејќи полето сега прима само броеви
  const [invoiceNo, setInvoiceNo] = useState<number>(0);
  const [loadingNumber, setLoadingNumber] = useState(false);

  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  // Функција за влечење на следниот автоматски број од бекендот
  const fetchNextNumber = async (type: "INVOICE" | "PROFORMA") => {
    setLoadingNumber(true);
    try {
      const response = await api.get(`/invoices/next-number/${type}`);
      setInvoiceNo(Number(response.data.nextInvoiceNumber) || 0);
    } catch (err) {
      console.error("Грешка при влечење следен број:", err);
      setInvoiceNo(0);
    } finally {
      setLoadingNumber(false);
    }
  };

  // Повлечи нов број секогаш кога корисникот ќе го смени типот на документот
  useEffect(() => {
    fetchNextNumber(documentType);
  }, [documentType]);

  // Повлекување на клиентите од базата
  useEffect(() => {
    const fetchClientsForForm = async () => {
      try {
        setLoadingClients(true);
        const response = await api.get("/clients");
        setClients(response.data);

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

  // Пресметка на калкулациите при промена на ставките
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

  const getItemSubtotal = (item: InvoiceItemInput) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.price) || 0;
    const d = Number(item.discountPercent) || 0;
    return p * (1 - d / 100) * q;
  };

  const getItemVatAmount = (item: InvoiceItemInput) => {
    const subtotal = getItemSubtotal(item);
    const v = Number(item.vatRate) || 0;
    return subtotal * (v / 100);
  };

  const getItemTotalWithVat = (item: InvoiceItemInput) => {
    return getItemSubtotal(item) + getItemVatAmount(item);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ИЗМЕНЕТО: Валидација за бројот бидејќи сега е чист Number
    if (!invoiceNo || invoiceNo <= 0) {
      alert("Ве молиме внесете валиден број на документ пред да зачувате.");
      return;
    }

    setSubmitting(true);

    const payload = {
      invoiceNo: invoiceNo,
      documentType,
      clientId: Number(clientId) || 1,
      dueDate,
      note,
      items,
    };

    try {
      const response = await api.post("/invoices", payload);

      if (response.status === 201 || response.status === 200) {
        alert(
          `${documentType === "INVOICE" ? "Фактурата" : "Профактурата"} е успешно зачувана во базата!`,
        );
        router.push("/invoices");
      }
    } catch (error: any) {
      console.error("API Error:", error);
      alert(
        `Грешка: ${error.response?.data?.message || "Неуспешно издавање."}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: "1200px", margin: "0 auto", px: { xs: 2, sm: 0 } }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push("/invoices")}
        sx={{ mb: 1, textTransform: "none" }}
      >
        Назад кон фактури
      </Button>
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
        Креирај Нов Документ
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
            {/* Избор на тип на документ */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="document-type-label">
                  Тип на документ
                </InputLabel>
                <Select
                  labelId="document-type-label"
                  label="Тип на документ"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as any)}
                >
                  <MenuItem value="INVOICE">Финална Фактура</MenuItem>
                  <MenuItem value="PROFORMA">Профактура</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* ИЗМЕНЕТО: Текст поле со тип "number" и активни стрелки (spinners) */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label={
                  documentType === "INVOICE"
                    ? "Број на фактура"
                    : "Број на профактура"
                }
                type="number"
                variant="outlined"
                fullWidth
                value={loadingNumber ? "" : invoiceNo}
                onChange={(e) => setInvoiceNo(Number(e.target.value))}
                placeholder={loadingNumber ? "Се вчитува..." : ""}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                  },
                  // Ставање на иконата за ресетирање директно десно во input-от
                  input: {
                    endAdornment: (
                      <Tooltip title="Ресетирај на пресметан број">
                        <span>
                          {" "}
                          {/* span спречува грешки ако IconButton е disabled */}
                          <IconButton
                            onClick={() => fetchNextNumber(documentType)}
                            disabled={loadingNumber}
                            color="primary"
                            size="small"
                            edge="end"
                          >
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ),
                  },
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    fontWeight: "bold",
                    color: "#0f172a",
                    pr: 1, // Малку простор од десно за иконата
                  },
                }}
                helperText="Може да менувате рачно со стрелките"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
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

            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Рок на плаќање"
                type="date"
                variant="outlined"
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ставки на фактура */}
      <Typography
        variant="h6"
        sx={{ fontWeight: "bold", mb: 2, color: "#334155" }}
      >
        Ставки на документ
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
                onClick={() => handleRemoveItem(index)}
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
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
          borderRadius: "8px",
          mb: 2,
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
                    onClick={() => handleRemoveItem(index)}
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

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddItem}
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
        disabled={submitting || loadingNumber}
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
        {submitting
          ? "Се зачувува..."
          : documentType === "INVOICE"
            ? "Зачувај ја фактурата"
            : "Зачувај ја профактурата"}
      </Button>
    </Box>
  );
}
