// ─────────────────────────────────────────────────────────────────────────────
// useChartData.js – Custom hooks for fetching chart data from the backend
//
// CHANGES FROM PREVIOUS VERSION
// - useClientFleetData no longer does N+1 fetching (1 call for /clients, then
//   1 extra call per client for /machines?clientId=). The /clients endpoint
//   already returns each client with its machines embedded — every other hook
//   in this codebase (useAllClientsLogic, useClientMachinesLogic) relies on
//   that same shape. The per-client fetch was redundant work and meant a
//   10-client dashboard fired 11 network requests just to draw a bar chart.
// - All three hooks share one fetch helper with AbortController support, so
//   a component that unmounts mid-request (switching tabs while data is
//   loading) no longer tries to setState on an unmounted component.
// - All three hooks expose `refetch`, so a page can offer a manual refresh
//   or refetch after a mutation elsewhere (e.g. after logging maintenance)
//   without a full reload.
// - 401s are surfaced distinctly so the UI can prompt re-login instead of
//   showing a generic "failed to fetch" message.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const fetchJson = async (path, signal) => {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders(), signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      res.status === 401
        ? "Your session has expired. Please log in again."
        : body.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json();
};

// Shared shape for every chart-data hook below, so loading/error/refetch
// behave identically regardless of which endpoint is behind them.
const useEndpoint = (path, transform = (d) => d) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const fetchData = useCallback(
    async (signal) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const raw = await fetchJson(path, signal);
        if (id !== requestId.current) return; // a newer request superseded this one
        setData(transform(raw));
        setError("");
      } catch (err) {
        if (err.name === "AbortError") return;
        if (id !== requestId.current) return;
        setError(err.message);
        setData([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    // transform is expected to be referentially stable (defined outside the
    // component or memoized); intentionally excluded so callers can't
    // accidentally cause refetch loops by inlining a new function each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { data, loading, error, refetch };
};

// ─────────────────────────────────────────────────────────────────────────────
// useClientFleetData – Clients with their embedded machines, for the bar chart
// The /clients endpoint returns clients with machines array embedded
// ─────────────────────────────────────────────────────────────────────────────
export const useClientFleetData = () => {
  return useEndpoint("/clients");
};

// ─────────────────────────────────────────────────────────────────────────────
// useReportData – Reports for the pie chart
// ─────────────────────────────────────────────────────────────────────────────
export const useReportData = () => useEndpoint("/reports");

// ─────────────────────────────────────────────────────────────────────────────
// useSupplyData – Supply records for the line chart
// ─────────────────────────────────────────────────────────────────────────────
export const useSupplyData = () => useEndpoint("/supply");