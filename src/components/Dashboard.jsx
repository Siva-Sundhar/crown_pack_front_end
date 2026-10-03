import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { getPurchases } from "../api/purchaseApi";
import { Link, useNavigate } from "react-router-dom";
import { formatGenericDate } from "../utils/FormatGenericDate";

const toISO = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const STATUS_TABS = ["All", "Pending", "Approved"];

const STATUS_STYLE = {
  approved: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  pending: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || {
    dot: "bg-neutral-400",
    text: "text-neutral-600",
    bg: "bg-neutral-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${s.text} ${s.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.toUpperCase()}
    </span>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();

  const today = new Date();

  const [from, setFrom] = useState(
    toISO(new Date(today.getFullYear(), today.getMonth(), 1))
  );

  const [to, setTo] = useState(toISO(today));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  const purchases = useAppStore((state) => state.purchases);
  const setPurchases = useAppStore((state) => state.setPurchases);
  const setLoading = useAppStore((state) => state.setLoading);
  const setError = useAppStore((state) => state.setError);

  const supplier = useAppStore((state) => state.ledgerName);

  /*
   * Close profile dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /*
   * Fetch purchases
   */
  useEffect(() => {
    if (!supplier) return;

    let ignore = false;

    setLoading(true);
    setError(null);

    getPurchases({
      supplier,
      fromDate: from,
      toDate: to,
    })
      .then((data) => {
        if (!ignore) {
          setPurchases(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Failed to fetch purchases"
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [supplier, from, to, setPurchases, setLoading, setError]);

  /*
   * Filter by date + search
   *
   * Your table uses:
   * vchDate
   * supplier
   * vchNo
   * refNo
   * voucherStatus
   *
   * So filtering should use those same fields.
   */
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();

    return purchases.filter((v) => {
      const voucherDate = v.vchDate
        ? toISO(new Date(v.vchDate))
        : "";

      // Date filter
      if (from && voucherDate && voucherDate < from) {
        return false;
      }

      if (to && voucherDate && voucherDate > to) {
        return false;
      }

      // Search filter
      if (!q) return true;

      return (
        String(v.supplier || "").toLowerCase().includes(q) ||
        String(v.vchNo || "").toLowerCase().includes(q) ||
        String(v.refNo || "").toLowerCase().includes(q) ||
        String(v.voucherStatus || "").toLowerCase().includes(q)
      );
    });
  }, [purchases, from, to, query]);

  /*
   * Status counts
   */
  const counts = useMemo(
    () => ({
      All: base.length,
      Pending: base.filter(
        (v) => v.voucherStatus.toLowerCase() === "pending"
      ).length,
      Approved: base.filter(
        (v) => v.voucherStatus.toLowerCase() === "approved"
      ).length,
    }),
    [base]
  );

  /*
   * Final rows displayed in table
   */
  const rows = useMemo(() => {
    if (status === "All") {
      return base;
    }

    return base.filter(
      (v) => v.voucherStatus.toLowerCase() === status.toLowerCase()
    );
  }, [base, status]);

  /*
   * Total should use the SAME rows displayed in table
   */
  const total = useMemo(() => {
    return rows.reduce(
      (sum, v) => sum + Number(v.voucherAmount || 0),
      0
    );
  }, [rows]);

  /*
   * Logout
   *
   * Change the localStorage key if your application
   * uses a different authentication token key.
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");

    setProfileOpen(false);

    navigate("/login");
  };

  const inputCls =
    "h-7 rounded-md border border-red-200 bg-white px-2.5 text-sm text-neutral-800 outline-none transition placeholder:text-neutral-400 focus:border-red-400 focus:ring-1 focus:ring-red-300";

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-800">
      {/* ================= HEADER ================= */}
      <header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        {/* Top title + profile */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Purchase
            </h1>

            <p className="text-xs text-neutral-500">
              {supplier || "Purchase Dashboard"}
            </p>
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm transition hover:bg-neutral-50"
            >
              {/* Avatar */}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DC143C] text-xs font-semibold text-white">
                {supplier
                  ? supplier.charAt(0).toUpperCase()
                  : "U"}
              </span>

              <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
                {supplier || "Profile"}
              </span>

              <svg
                className={`h-4 w-4 text-neutral-500 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
                <div className="border-b border-neutral-100 px-4 py-3">
                  <p className="text-sm font-semibold text-neutral-800">
                    {supplier || "User"}
                  </p>

                  <p className="mt-0.5 text-xs text-neutral-500">
                    Profile
                  </p>
                </div>

                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 17l5-5-5-5" />
                      <path d="M15 12H3" />
                      <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
                    </svg>

                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
                className={`${inputCls} w-full sm:w-36`}
                aria-label="From date"
              />

              <span className="text-xs text-neutral-400">
                to
              </span>

              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
                className={`${inputCls} w-full sm:w-36`}
                aria-label="To date"
              />
            </div>

            {/* Search */}
            <div className="relative sm:w-72">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <circle cx="9" cy="9" r="5.5" />
                <path d="M13.5 13.5 17 17" />
              </svg>

              <input
                type="text"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Search supplier, voucher no."
                className={`${inputCls} w-full pl-8 pr-7`}
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Create Purchase */}
          <Link
            to="/purchase"
            className="flex h-7 items-center justify-center rounded-md bg-emerald-500 px-3 text-sm font-semibold text-white transition hover:bg-emerald-600 lg:ml-auto"
          >
            + Create Purchase
          </Link>

          {/* Status tabs */}
          <div
            role="tablist"
            aria-label="Status"
            className="inline-flex self-start rounded-lg bg-neutral-100 p-0.5"
          >
            {STATUS_TABS.map((t) => {
              const active = status === t.toLowerCase();

              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatus(t)}
                  className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition ${
                    active
                      ? "bg-white font-medium text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {t}

                  <span
                    className={`text-xs tabular-nums ${
                      active
                        ? "text-neutral-500"
                        : "text-neutral-400"
                    }`}
                  >
                    {counts[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ================= TABLE ================= */}
      <main className="min-h-0 flex-1 py-1 sm:px-2">
        <div className="flex h-full flex-col overflow-hidden rounded border border-red-200 bg-white">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1000px] border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-[#DC143C]">
                <tr className="border-b border-red-200 text-left text-xs font-medium text-white">
                  <th className="w-14 px-4 py-1">
                    S.No
                  </th>

                  <th className="w-28 px-4 py-1">
                    Date
                  </th>

                  <th className="px-4 py-1">
                    Supplier name
                  </th>

                  <th className="px-4 py-1">
                    Voucher no.
                  </th>

                  <th className="px-4 py-1">
                    Reference No
                  </th>

                  <th className="px-4 py-1">
                    Reference Date
                  </th>

                  <th className="w-32 px-4 py-1">
                    Status
                  </th>

                  <th className="px-4 py-1 text-right">
                    Amount (₹)
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((v, i) => (
                  <tr
                    key={v.id}
                    onClick={() =>
                      navigate(`/purchase/alter/${v.id}`)
                    }
                    className="cursor-pointer border-b border-red-200 transition-colors hover:bg-neutral-100"
                  >
                    <td className="border border-red-200 px-4 py-0 text-center tabular-nums text-neutral-400">
                      {i + 1}
                    </td>

                    <td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
                      {formatGenericDate(
                        v.vchDate,
                        "DD-MMM-YYYY"
                      )}
                    </td>

                    <td className="border border-red-200 px-4 py-0 font-medium text-neutral-900">
                      {v.supplier}
                    </td>

                    <td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
                      {v.vchNo}
                    </td>

                    <td className="border border-red-200 px-4 py-0 text-neutral-600">
                      {v.refNo || "-"}
                    </td>

                    <td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
                      {v.refDate
                        ? formatGenericDate(
                            v.refDate,
                            "DD-MMM-YYYY"
                          )
                        : "-"}
                    </td>

                    <td className="border border-red-200 px-4 py-0">
                      <StatusBadge
                        status={v.voucherStatus.toLowerCase() || "unknown"}
                      />
                    </td>

                    <td className="border border-red-200 px-4 py-0 text-right font-medium tabular-nums text-neutral-900">
                      ₹{" "}
                      {Number(
                        v.voucherAmount || 0
                      ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty state */}
            {rows.length === 0 && (
              <div className="flex flex-col items-center gap-1 py-16 text-center">
                <p className="text-sm font-medium text-neutral-700">
                  No vouchers found
                </p>

                <p className="text-xs text-neutral-500">
                  Change the date range, clear the
                  search, or switch the status.
                </p>
              </div>
            )}
          </div>

          {/* ================= FOOTER ================= */}
          <div className="flex items-center justify-between border-t border-neutral-200 bg-red-50 px-4 py-1.5 text-sm">
            <span className="text-neutral-500">
              Total
            </span>

            <span className="font-semibold tabular-nums text-neutral-900">
              ₹{" "}
              {total.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
