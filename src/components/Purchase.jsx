import { useMemo, useRef, useState } from "react";
import {
  formatGenericDate,
  getDayName,
  toISODate,
} from "../utils/FormatGenericDate.jsx";
import GenericSelect from "../utils/GenericSelect.jsx";
import { Calendar, ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import item from "../utils/item.js";

const GST_RATES = [0, 5, 12, 18, 28];

const emptyPurchaseRow = (gst = "") => ({
  id: Date.now() + Math.random(),
  code: "",
  desc: "",
  qty: "",
  uom: "",
  rate: "",
  disc: "",
  gst,
});

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const money = (v) =>
  (v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const calcRow = (r) => {
  const gross = r2(num(r.qty) * num(r.rate));
  const discPct = Math.min(Math.max(num(r.disc), 0), 100);
  const discAmt = r2((gross * discPct) / 100);
  return { gross, discAmt, taxable: r2(gross - discAmt), rate: num(r.gst) };
};

const headerInput =
  "h-5 border border-amber-300 bg-[#fee8af] px-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white";

const Line = ({ label, value, bold }) => (
  <div
    className={`flex justify-between ${bold ? "font-bold text-slate-900" : "text-slate-700"}`}
  >
    <span>{label}</span>
    <span className="tabular-nums">{money(value)}</span>
  </div>
);

// Editable column indices: Product(0), Qty(1), Rate(2), Disc(3), GST(4)
const EDITABLE_COLS = [0, 1, 2, 3, 4];

const Purchase = () => {
  const [formData, setFormData] = useState({
    voucherNo: "",
    customerName: "",
    referenceNo: "",
    referenceDate: "",
    narration: "",
    createdBy: "",
    approvedBy: "",
    vDate: toISODate(new Date()),
    finalStatus: "Pending",
    transport: "",
    transportGst: "",
    taxType: "intra",
    autoRound: true,
  });

  const [expenses, setExpenses] = useState([
    { id: 1, particular: "", tax: 0, totalAmount: 0 },
    { id: 2, particular: "", tax: 0, totalAmount: 0 },
    { id: 3, particular: "", tax: 0, totalAmount: 0 },
    { id: 4, particular: "", tax: 0, totalAmount: 0 },
    { id: 5, particular: "", tax: 0, totalAmount: 0 },
  ]);
  const [products, setProducts] = useState(item);
  const [purchaseItem, setPurchaseItem] = useState([emptyPurchaseRow()]);
  const [dateInputText, setDateInputText] = useState(
    formatGenericDate(new Date(), "DD-MMM-YY"),
  );
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [isLast, setIsLast] = useState(false);

  const [bottomView, setBottomView] = useState("expenses");

  const headerRefs = useRef([]);
  const hiddenDateRef = useRef(null);
  const gridRefs = useRef({});
  const collapseBtnRef = useRef(null);
  const remarksRef = useRef(null);

  const setField = (name) => (e) =>
    setFormData((prev) => ({ ...prev, [name]: e.target.value }));

  const commitDateChange = (rawText) => {
    const formattedDate = formatGenericDate(rawText, "DD-MMM-YY");
    if (!formattedDate) {
      setDateInputText(
        formData.vDate ? formatGenericDate(formData.vDate, "DD-MMM-YY") : "",
      );
      return;
    }
    setFormData((prev) => ({ ...prev, vDate: toISODate(rawText) }));
    setDateInputText(formattedDate);
  };

  const handleHeaderKeyDown = (event, nextElement) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    nextElement?.focus?.();
  };

  const updateRow = (rowIndex, key, value) =>
    setPurchaseItem((rows) =>
      rows.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r)),
    );

  const handleEndOfList = (rowIndex) => {
    setPurchaseItem((rows) => {
      // Never leave the purchase table with zero editable rows.
      if (rows.length === 1) {
        return [emptyPurchaseRow()];
      }

      // Remove the row where End of List was selected.
      return rows.filter((_, index) => index !== rowIndex);
    });

    // Focus must run after React has rendered the updated rows.
    setTimeout(() => {
      const rowCountAfterDelete = purchaseItem.length - 1;

      // If a row shifts into the deleted row's position,
      // focus that row's Product Code.
      if (rowIndex < rowCountAfterDelete) {
        gridRefs.current[`${rowIndex}-0`]?.focus();
        return;
      }
      // The deleted row was the final row.
      // Focus GST of the previous row.
      if (rowIndex > 0) {
        collapseBtnRef.current?.focus();
        return;
      }

      // Fallback for unexpected situations.
      remarksRef.current?.focus();
    }, 0);
  };

  const applyGstToAll = (rate) => {
    if (rate === "") return;
    setPurchaseItem((rows) => rows.map((r) => ({ ...r, gst: rate })));
  };

  const handleGridKeyDown = (e, rowIndex, colIndex) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const pos = EDITABLE_COLS.indexOf(colIndex);
    const isLastEditable = pos === EDITABLE_COLS.length - 1;

    const nextRow = isLastEditable ? rowIndex + 1 : rowIndex;
    const nextCol = isLastEditable ? EDITABLE_COLS[0] : EDITABLE_COLS[pos + 1];

    if (nextRow >= purchaseItem.length) {
      setPurchaseItem((rows) => [
        ...rows,
        emptyPurchaseRow(rows[rows.length - 1]?.gst ?? ""),
      ]);
      setTimeout(() => gridRefs.current[`${nextRow}-${nextCol}`]?.focus(), 0);
      return;
    }
    gridRefs.current[`${nextRow}-${nextCol}`]?.focus();
    gridRefs.current[`${nextRow}-${nextCol}`]?.select();
  };

  const handleFiles = (e) => {
    setAttachments(Array.from(e.target.files || []));
  };

  const totals = useMemo(() => {
    const slabMap = new Map();
    let gross = 0,
      disc = 0,
      itemsTaxable = 0;

    purchaseItem.forEach((row) => {
      const c = calcRow(row);
      gross += c.gross;
      disc += c.discAmt;
      itemsTaxable += c.taxable;
      if (c.taxable)
        slabMap.set(c.rate, (slabMap.get(c.rate) || 0) + c.taxable);
    });

    const transport = r2(Math.max(num(formData.transport), 0));
    if (transport) {
      const rate = num(formData.transportGst);
      slabMap.set(rate, (slabMap.get(rate) || 0) + transport);
    }

    const slabs = [...slabMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rate, t]) => {
        const taxable = r2(t);
        const tax = r2((taxable * rate) / 100);
        const cgst = r2(tax / 2);
        const sgst = r2(tax - cgst);
        return { rate, taxable, tax, cgst, sgst };
      });

    const sum = (k) => r2(slabs.reduce((s, x) => s + x[k], 0));
    const taxable = r2(itemsTaxable + transport);
    const tax = sum("tax");
    const beforeRound = r2(taxable + tax);
    const roundOff = formData.autoRound
      ? r2(Math.round(beforeRound) - beforeRound)
      : 0;

    return {
      gross: r2(gross),
      disc: r2(disc),
      transport,
      taxable,
      cgst: sum("cgst"),
      sgst: sum("sgst"),
      tax,
      roundOff,
      net: r2(beforeRound + roundOff),
      slabs,
    };
  }, [
    purchaseItem,
    formData.transport,
    formData.transportGst,
    formData.autoRound,
  ]);

  const productOptions = products.map((product) => ({
    label: product.partNo,
    value: product.partNo,
    product,
  }));

  const isIntra = formData.taxType === "intra";

  function updateExpense(id, field, value) {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) => {
        if (expense.id !== id) {
          return expense;
        }

        return {
          ...expense,
          [field]:
            field === "tax" || field === "totalAmount"
              ? Number(value) || 0
              : value,
        };
      }),
    );

    setSaved(false);
  }

  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((total, expense) => {
      return total + Number(expense.totalAmount || 0);
    }, 0);
  }, [expenses]);

  return (
    <div className="h-dvh w-full overflow-hidden bg-slate-200 p-1 box-border">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xs border border-black bg-white shadow-md">
        {/* ============ HEADER ============ */}
        <header className="shrink-0 border-b border-slate-300 px-2 py-1 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <label
                htmlFor="voucherNo"
                className="rounded-xs bg-blue-800 px-3 text-[12px] font-bold uppercase text-white"
              >
                Purchase
              </label>
              <span className="ml-1 font-semibold text-slate-700">No</span>:
              <input
                ref={(el) => (headerRefs.current[0] = el)}
                id="voucherNo"
                type="text"
                autoComplete="off"
                value={formData.voucherNo}
                onChange={setField("voucherNo")}
                onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[1])}
                className={`${headerInput} w-28 sm:w-36`}
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="referenceNo"
                className="font-semibold text-slate-700 whitespace-nowrap"
              >
                Ref No
              </label>
              :
              <input
                ref={(el) => (headerRefs.current[1] = el)}
                id="referenceNo"
                value={formData.referenceNo}
                onChange={setField("referenceNo")}
                onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[2])}
                className={`${headerInput} w-36 `}
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="referenceDate"
                className="font-semibold text-slate-700 whitespace-nowrap"
              >
                Ref Date
              </label>
              :
              <input
                ref={(el) => (headerRefs.current[2] = el)}
                id="referenceDate"
                value={formData.referenceDate}
                onChange={setField("referenceDate")}
                onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[3])}
                className={`${headerInput} w-22 text-right`}
              />
            </div>

            <div className="flex items-center gap-1 sm:ml-auto">
              <label htmlFor="vDate" className="font-semibold text-slate-700">
                Date
              </label>
              :
              <input
                ref={(el) => (headerRefs.current[3] = el)}
                id="vDate"
                type="text"
                value={dateInputText}
                onChange={(e) => setDateInputText(e.target.value)}
                onBlur={() => commitDateChange(dateInputText)}
                onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[4])}
                className={`${headerInput} w-22 text-right`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => hiddenDateRef.current?.showPicker?.()}
                className="text-slate-700 outline-none hover:text-black"
                aria-label="Open date picker"
              >
                <Calendar size={18} />
              </button>
              <input
                ref={hiddenDateRef}
                type="date"
                value={formData.vDate}
                onChange={(e) => commitDateChange(e.target.value)}
                className="pointer-events-none absolute sr-only"
              />
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex min-w-50 flex-1 items-center gap-1">
              <label
                htmlFor="customerName"
                className="font-semibold text-slate-700 whitespace-nowrap w-28"
              >
                Customer
              </label>
              :
              <input
                ref={(el) => (headerRefs.current[4] = el)}
                id="customerName"
                type="text"
                autoComplete="off"
                value={formData.customerName}
                onChange={setField("customerName")}
                onKeyDown={(e) =>
                  handleHeaderKeyDown(e, gridRefs.current["0-0"])
                }
                className={`${headerInput} w-90.5`}
              />
            </div>
            {formData.vDate && (
              <span className="ml-1 text-xs font-bold text-blue-800">
                {getDayName(formData.vDate)}
              </span>
            )}
          </div>
        </header>

        {/* ============ TABLE ============ */}
        <main className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-180 border-collapse text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-300">
                <th className="w-10 border border-slate-400 bg-slate-300 px-1 text-center">
                  S.No
                </th>
                <th className="w-32 border border-slate-400 bg-slate-300 px-1.5 text-left">
                  Product Code
                </th>
                <th className="min-w-60 border border-slate-400 bg-slate-300 px-1.5 text-left">
                  Product Desc
                </th>
                <th className="w-20 border border-slate-400 bg-slate-300 px-1.5 text-right">
                  Qty
                </th>
                <th className="w-20 border border-slate-400 bg-slate-300 px-1.5 text-center">
                  UOM
                </th>
                <th className="w-24 border border-slate-400 bg-slate-300 px-1.5 text-right">
                  Rate
                </th>
                <th className="w-20 border border-slate-400 bg-slate-300 px-1.5 text-right">
                  Disc %
                </th>
                <th className="w-20 border border-slate-400 bg-slate-300 px-1.5 text-right">
                  GST %
                </th>
                <th className="w-28 border border-slate-400 bg-slate-300 px-1.5 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {purchaseItem.map((item, rowIndex) => {
                // Inject "End of List" only if table has more than 1 row and not on row 0
                const rowProductOptions =
                  purchaseItem.length > 1
                    ? [
                        {
                          label: "♦ End of List",
                          value: "__END_OF_LIST__",
                          isEndOfList: true,
                        },
                        ...productOptions,
                      ]
                    : productOptions;
                return (
                  <tr key={item.id} className="hover:bg-blue-50">
                    <td className="border border-slate-300 bg-slate-100 text-center font-bold text-slate-500">
                      {rowIndex + 1}
                    </td>

                    {/* Product Code - col 0 */}
                    <td className="border border-slate-300 bg-slate-50">
                      <GenericSelect
                        ref={(el) => (gridRefs.current[`${rowIndex}-0`] = el)}
                        options={productOptions}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 0)}
                        placeholder="Select Product..."
                        title="Products"
                        value={
                          productOptions.find(
                            (option) => option.value === item.code,
                          ) || null
                        }
                        onChange={(selectedOption) => {
                          if (selectedOption?.isEndOfList) {
                            handleEndOfList(rowIndex);
                            return;
                          }

                          const product = selectedOption.product;

                          setPurchaseItem((rows) =>
                            rows.map((row, index) =>
                              index === rowIndex
                                ? {
                                    ...row,
                                    code: product.partNo,
                                    desc: product.itemName,
                                    uom: product.uom,
                                  }
                                : row,
                            ),
                          );
                        }}
                        onSelect={(selectedOption) => {
                          if (selectedOption?.isEndOfList) return;

                          setTimeout(() => {
                            gridRefs.current[`${rowIndex}-1`]?.focus();
                          }, 0);
                        }}
                        labelKey="label"
                        valueKey="value"
                        inputFocusStyle={{
                          backgroundColor: "#dbeafe",
                        }}
                        menuStyle={{
                          width: "600px",
                          maxWidth: "calc(100vw - 8px)",
                        }}
                        menuHeader={
                          <div className="grid grid-cols-[90px_minmax(0,1fr)_55px] gap-2">
                            <span>Code</span>
                            <span>Product Name</span>
                            <span className="text-center">UOM</span>
                          </div>
                        }
                        renderOption={(option) => {
                          if (option.isEndOfList) {
                            return (
                              <div className="px-2 font-bold text-red-700">
                                ♦ End of List
                              </div>
                            );
                          }

                          const product = option.product;

                          return (
                            <div className="grid grid-cols-[90px_minmax(0,1fr)_55px] items-center gap-2 px-2">
                              <span className="font-semibold">
                                {product.partNo}
                              </span>

                              <span className="truncate">
                                {product.itemName}
                              </span>

                              <span className="text-center font-medium">
                                {product.uom}
                              </span>
                            </div>
                          );
                        }}
                      />
                    </td>

                    {/* Description - read-only */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        readOnly
                        type="text"
                        value={item.desc}
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none"
                      />
                    </td>

                    {/* Qty - col 1 */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(el) => (gridRefs.current[`${rowIndex}-1`] = el)}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 1)}
                        type="text"
                        inputMode="decimal"
                        value={item.qty}
                        onChange={(e) =>
                          updateRow(rowIndex, "qty", e.target.value)
                        }
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
                      />
                    </td>

                    {/* UOM - read-only */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        readOnly
                        type="text"
                        value={item.uom}
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none text-center"
                      />
                    </td>

                    {/* Rate - col 2 */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(el) => (gridRefs.current[`${rowIndex}-2`] = el)}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 2)}
                        type="text"
                        inputMode="decimal"
                        value={item.rate}
                        onChange={(e) =>
                          updateRow(rowIndex, "rate", e.target.value)
                        }
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
                      />
                    </td>

                    {/* Disc - col 3 */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(el) => (gridRefs.current[`${rowIndex}-3`] = el)}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 3)}
                        type="text"
                        inputMode="decimal"
                        value={item.disc}
                        onChange={(e) =>
                          updateRow(rowIndex, "disc", e.target.value)
                        }
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
                      />
                    </td>

                    {/* GST - col 4 (last editable) */}
                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(el) => (gridRefs.current[`${rowIndex}-4`] = el)}
                        onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 4)}
                        type="text"
                        inputMode="decimal"
                        value={item.gst}
                        onChange={(e) =>
                          updateRow(rowIndex, "gst", e.target.value)
                        }
                        className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
                      />
                    </td>

                    {/* Amount */}
                    <td className="border border-slate-300 bg-slate-50 px-1.5 text-right font-bold tabular-nums">
                      {money(calcRow(item).gross)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>

        {/* ============ COLLAPSE BUTTON ============ */}
        <button
          ref={collapseBtnRef}
          type="button"
          tabIndex={-1}
          onClick={() => {
            (setIsLast((v) => !v), console.log("onclick working"));
          }}
          aria-expanded={isLast}
          className="flex h-4.5 shrink-0 items-center justify-between border-t border-slate-400 bg-slate-200 px-2 text-[12px] font-semibold text-slate-700 outline-none focus:bg-amber-200 hover:bg-slate-300"
        >
          <span className="flex items-center gap-1">Expenses & Tax Breakup</span>
          {isLast ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          <span className="tabular-nums">
            Total: <b className="text-slate-900">{money(totals.gross)}</b>
          </span>
        </button>

        {/* ============ GST & SUMMARY ============ */}
        {isLast && (
          <section className="grid max-h-[45dvh] shrink-0 grid-cols-1 overflow-y-auto border-t border-slate-400 bg-[#f8f8f8] text-[12px] md:h-40 md:max-h-none md:grid-cols-[7fr_3fr] md:overflow-visible ">
            {/* LEFT - GST Slabs */}
            <div className="grid min-h-0 min-w-0 md:grid-rows-[minmax(0,3fr)_minmax(0,2fr)] md:border-r md:border-slate-300">
              {/* Expenses table: fixed maximum five lines */}
              <section className="border-t border-slate-400 bg-[#f8f8f8] pt-0.5 ">
                {/* Buttons */}
                <div className="mb-1 flex items-center gap-1">
                  

                  <button
                    type="button"
                    onClick={() => setBottomView("expenses")}
                    className={`h-4.5 border px-3 text-xs font-bold ${
                      bottomView === "expenses"
                        ? "border-[#173a85] bg-[#173a85] text-white"
                        : "border-slate-400 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Expenses
                  </button>

                  <button
                    type="button"
                    onClick={() => setBottomView("tax")}
                    className={`h-4.5 border px-3 text-xs font-bold ${
                      bottomView === "tax"
                        ? "border-[#173a85] bg-[#173a85] text-white"
                        : "border-slate-400 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Tax Breakup
                  </button>

                  <span className="ml-2 text-xs font-semibold text-slate-500">
                    {bottomView === "tax"
                      ? "GST tax calculation by tax slab"
                      : "Additional purchase expenses"}
                  </span>
                </div>

                {/* Tax breakup view */}
                {bottomView === "tax" && (
                  <div className="overflow-auto border border-slate-300">
                    <table className="w-full border-collapse tabular-nums">
                      <thead className="bg-slate-200">
                        <tr className="h-4.5">
                          <th className="border border-slate-400 px-2 text-left">
                            GST %
                          </th>

                          <th className="border border-slate-400 px-2 text-right">
                            Taxable
                          </th>

                          {isIntra ? (
                            <>
                              <th className="border border-slate-400 px-2 text-right">
                                CGST
                              </th>

                              <th className="border border-slate-400 px-2 text-right">
                                SGST
                              </th>
                            </>
                          ) : (
                            <th className="border border-slate-400 px-2 text-right">
                              IGST
                            </th>
                          )}

                          <th className="border border-slate-400 px-2 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {totals.slabs.length === 0 ? (
                          <tr className="h-4.5">
                            <td
                              colSpan={isIntra ? 5 : 4}
                              className="border border-slate-300 px-2 text-center text-slate-400"
                            >
                              No items available for tax calculation
                            </td>
                          </tr>
                        ) : (
                          totals.slabs.map((slab) => (
                            <tr
                              key={slab.rate}
                              className="h-5 bg-white hover:bg-blue-50"
                            >
                              <td className="border border-slate-300 px-2 font-semibold">
                                {slab.rate}%
                              </td>

                              <td className="border border-slate-300 px-2 text-right">
                                {money(slab.taxable)}
                              </td>

                              {isIntra ? (
                                <>
                                  <td className="border border-slate-300 px-2 text-right">
                                    {money(slab.cgst)}
                                  </td>

                                  <td className="border border-slate-300 px-2 text-right">
                                    {money(slab.sgst)}
                                  </td>
                                </>
                              ) : (
                                <td className="border border-slate-300 px-2 text-right">
                                  {money(slab.tax)}
                                </td>
                              )}

                              <td className="border border-slate-300 px-2 text-right font-semibold">
                                {money(slab.taxable + slab.tax)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Expenses view */}
                {bottomView === "expenses" && (
                  <div className="overflow-auto">
                    <table className="w-full border-collapse border border-slate-500">
                      <thead>
                        <tr className="h-4.5 bg-[#dce5ef] text-left text-[12px] font-bold">
                          <th className="w-12 border border-slate-500 px-2 text-center">
                            S.No
                          </th>

                          <th className="border border-slate-500 px-2">
                            Particular
                          </th>

                          <th className="w-40 border border-slate-500 px-2 text-right">
                            Tax
                          </th>

                          <th className="w-48 border border-slate-500 px-2 text-right">
                            Total Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {expenses.map((expense, index) => (
                          <tr
                            key={expense.id}
                            className="h-4.5 bg-white hover:bg-blue-50"
                          >
                            <td className="border border-slate-500 px-2 text-center font-semibold">
                              {index + 1}
                            </td>

                            <td className="border border-slate-500 p-0">
                              <input
                                value={expense.particular}
                                onChange={(event) =>
                                  updateExpense(
                                    expense.id,
                                    "particular",
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 outline-none focus:bg-[#fff9da]"
                                placeholder="Enter expense particular"
                              />
                            </td>

                            <td className="border border-slate-500 p-0">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={expense.tax}
                                onChange={(event) =>
                                  updateExpense(
                                    expense.id,
                                    "tax",
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 text-right outline-none focus:bg-[#fff9da]"
                                placeholder="0.00"
                              />
                            </td>

                            <td className="border border-slate-500 p-0">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={expense.totalAmount}
                                onChange={(event) =>
                                  updateExpense(
                                    expense.id,
                                    "totalAmount",
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 text-right outline-none focus:bg-[#fff9da]"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr className="h-4.5 bg-[#e5ebf1] font-bold">
                          <td
                            colSpan={3}
                            className="border border-slate-500 px-2 text-right"
                          >
                            Total Expenses
                          </td>

                          <td className="border border-slate-500 px-2 text-right">
                            {money(totalExpenseAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT - Summary */}
            <div className="min-w-0 border-t border-slate-300 px-1 font-semibold md:border-t-0">
              <Line label="Gross Amount" value={totals.gross} />
              <Line label="Discount" value={-totals.disc} />

              <Line label='Expenses' value={totals.transport}/>

              <Line label="Taxable Value" value={totals.taxable} />
              {isIntra ? (
                <>
                  <Line label="CGST" value={totals.cgst} />
                  <Line label="SGST" value={totals.sgst} />
                </>
              ) : (
                <Line label="IGST" value={totals.tax} />
              )}

              <div className="flex justify-between text-slate-700">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.autoRound}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        autoRound: e.target.checked,
                      }))
                    }
                  />
                  Round off
                </label>
                <span className="tabular-nums">
                  {totals.roundOff > 0 ? "+" : ""}
                  {money(totals.roundOff)}
                </span>
              </div>

              <div className="mt-0.5 border-t border-slate-400 pt-0.5 text-[13px]">
                <Line label="Net Total" value={totals.net} bold />
              </div>
            </div>
          </section>
        )}

        {/* ============ FOOTER ============ */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-400 bg-white px-2 py-1 text-[13px]">
          <div className="flex items-center gap-2">
            <label
              htmlFor="remarks"
              className="font-semibold text-slate-700 whitespace-nowrap"
            >
              Remarks :
            </label>
            <input
              ref={remarksRef}
              id="remarks"
              value={formData.narration}
              onChange={setField("narration")}
              className={`${headerInput} w-36 sm:w-96`}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFiles}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800 outline-none hover:border-blue-600 hover:bg-blue-100 focus-visible:ring-1 focus-visible:ring-blue-400"
              >
                <Paperclip size={12} />
                Attach document
                {attachments.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-blue-800 px-1.5 text-[10px] text-white">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="createdBy"
                className="font-semibold text-slate-700 whitespace-nowrap"
              >
                Created by
              </label>
              :
              <input
                id="createdBy"
                value={formData.createdBy}
                onChange={setField("createdBy")}
                className={`${headerInput} w-32 sm:w-44`}
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="approvedBy"
                className="font-semibold text-slate-700 whitespace-nowrap"
              >
                Approved by
              </label>
              :
              <input
                id="approvedBy"
                value={formData.approvedBy}
                onChange={setField("approvedBy")}
                className={`${headerInput} w-32 sm:w-44`}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-[#2167d5] px-5 font-bold text-white shadow hover:bg-[#1553b5]"
              >
                Save
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Purchase;
