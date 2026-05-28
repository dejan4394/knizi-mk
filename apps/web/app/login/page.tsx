"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/services/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Axios автоматски го претвора објектот во JSON
      const response = await api.post("/auth/login", { email, password });

      // Податоците кај Axios секогаш се наоѓаат во .data
      const { accessToken, user } = response.data;

      login(accessToken, user);
    } catch (err: any) {
      // Axios ги пакува грешките од серверот во err.response.data
      const errorMessage =
        err.response?.data?.message || "Грешка при поврзување со серверот.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f1f5f9",
        fontFamily: "sans-serif",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
            textAlign: "center",
            color: "#1e293b",
          }}
        >
          Книжи.мк | Најава
        </h2>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "15px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
              color: "#475569",
            }}
          >
            Е-маил адреса
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontWeight: "bold",
              color: "#475569",
            }}
          >
            Лозинка
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px",
            background: "#0284c7",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {submitting ? "Се најавувате..." : "Влези во систем"}
        </button>
      </form>
    </div>
  );
}
