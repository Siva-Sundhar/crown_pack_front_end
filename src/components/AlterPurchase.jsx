import { useEffect, useMemo, useRef, useState } from "react";

import { useParams } from "react-router-dom";

import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Paperclip,
} from "lucide-react";

import {
  formatGenericDate,
  getDayName,
  toISODate,
} from "../utils/FormatGenericDate.jsx";

import GenericSelect from "../utils/GenericSelect.jsx";
import products from "../utils/item.js";

import {
  buildPurchasePayload,
  calculateExpenses,
  calculatePurchaseRow,
  calculatePurchaseTotals,
} from "../utils/purchase-calcultion.js";

import {
  createPurchase,
  getPurchaseById,
  updatePurchase,
} from "../api/purchaseApi.js";

const headerInput =
  "h-5 border border-amber-300 bg-[#fee8af] px-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white";

const EDITABLE_COLS = [0, 1, 2, 3, 4];

const FORMATTED_COLS = {
  1: "qty",
  2: "rate",
  3: "disc",
  4: "tax",
};

const EXPENSE_FIELDS = ["particular", "amount", "tax"];

const FORMATTED_EXPENSE_FIELDS = new Set(["amount", "tax", "totalAmount"]);

const firstValue = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return "";
};

const createEmptyPurchaseRow = (tax = "") => ({
  id: `${Date.now()}-${Math.random()}`,
  code: "",
  desc: "",
  qty: "",
  uom: "",
  rate: "",
  disc: "",
  tax,
});

const createExpenseRow = () => ({
  id: crypto.randomUUID(),
  particular: "",
  amount: "",
  tax: 0,
  totalAmount: 0,
});

const createEmptyExpenses = () => [
  createExpenseRow(),
  createExpenseRow(),
  createExpenseRow(),
  createExpenseRow(),
  createExpenseRow(),
];

const normalizeDate = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value.substring(0, 10);
  }

  return toISODate(value);
};

const normalizePurchaseItem = (row, index) => ({
  id: firstValue(row.id, row.itemId, `existing-item-${index}`),

  code: firstValue(row.code, row.productCode, row.partNo, row.product?.partNo),

  desc: firstValue(
    row.desc,
    row.description,
    row.productDescription,
    row.itemName,
    row.product?.itemName,
  ),

  qty: firstValue(row.qty, row.quantity),

  uom: firstValue(row.uom, row.unit, row.product?.uom),

  rate: firstValue(row.rate, row.purchaseRate, row.unitRate),

  disc: firstValue(row.disc, row.discount, row.discountPercentage),

  tax: firstValue(row.tax, row.taxRate, row.gst, row.vat),
});

const normalizeExpense = (expense, index) => ({
  id: firstValue(expense.id, expense.expenseId, `existing-expense-${index}`),

  particular: firstValue(expense.particular, expense.name, expense.description, expense.ledgerName),

  amount: firstValue(expense.amount, expense.rate, expense.ledgerAmount),

  tax: firstValue(expense.tax, expense.taxRate, expense.percentage),

  totalAmount: firstValue(expense.totalAmount, expense.total, expense.ledgerAmount),
});

const currencyFormatter = (value) => {
  const numberValue = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(numberValue)) {
    return "₦ 0.00";
  }

  const formatted = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);

  return formatted.replace(/^(\D+)(\d)/, "$1 $2");
};

const formatNumber = (value) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return numberValue.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPercent = (value) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return numberValue.toFixed(2);
};

const unformatNumber = (value) => {
  return String(value || "").replace(/[^0-9.-]/g, "");
};

const Line = ({ label, value, bold = false }) => {
  return (
    <div
      className={[
        "flex justify-between",
        "border-b border-slate-400",
        bold ? "font-bold text-slate-900" : "text-slate-700",
      ].join(" ")}
    >
      <span>{label}</span>

      <span className="tabular-nums">{currencyFormatter(value)}</span>
    </div>
  );
};

const AlterPurchase = ({ purchaseId }) => {
  const { id: routeId } = useParams();

  const alterId = purchaseId || routeId || null;
  const isAlterMode = Boolean(alterId);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    voucherNo: "",
    customerName: "",
    voucherDate: toISODate(new Date()),
    referenceNo: "",
    referenceDate: "",
    narration: "",
    createdBy: "",
    approvedBy: "",
    voucherStatus: "Pending",
    taxMode: "VAT",
    taxType: "intra",
    autoRound: true,
    totalAmount: "",
    totalQty: "",
    units: "",
  });

  const [purchaseItem, setPurchaseItem] = useState([createEmptyPurchaseRow()]);

  const [expenses, setExpenses] = useState(createEmptyExpenses());

  const [dateInputText, setDateInputText] = useState(
    formatGenericDate(new Date(), "DD-MMM-YY"),
  );

  const [refDateInputText, setRefDateInputText] = useState("");

  const [attachments, setAttachments] = useState([]);

  const [attachmentPreviews, setAttachmentPreviews] = useState([]);

  const [previewFile, setPreviewFile] = useState(null);

  const [showPreview, setShowPreview] = useState(false);

  const [focusedCell, setFocusedCell] = useState(null);

  const [focusedExpenseCell, setFocusedExpenseCell] = useState(null);

  const [isLast, setIsLast] = useState(false);

  const [bottomView, setBottomView] = useState("expenses");

  const headerRefs = useRef([]);
  const hiddenDateRef = useRef(null);
  const gridRefs = useRef({});
  const expenseRefs = useRef({});
  const remarksRef = useRef(null);
  const fileInputRef = useRef(null);

  const taxMode = String(formData.taxMode || "NONE").toUpperCase();

  const taxType = String(formData.taxType || "INTRA").toUpperCase();

  const isIntra = taxType === "INTRA";

  const productOptions = useMemo(() => {
    return products.map((product) => ({
      label: product.partNo,
      value: product.partNo,
      product,
    }));
  }, []);

  useEffect(() => {
    if (!alterId) {
      return;
    }

    let cancelled = false;

    const loadPurchase = async () => {
      try {
        setLoading(true);

        const response = await getPurchaseById(alterId);

        if (cancelled) {
          return;
        }

        const { voucher: purchase, files } = response?.data || response;

        
        

        const voucherDate = normalizeDate(
          firstValue(purchase.voucherDate, purchase.date, purchase.vchDate),
        );

        const referenceDate = normalizeDate(
          firstValue(purchase.referenceDate, purchase.refDate, purchase.poDate),
        );

        setFormData((previous) => ({
          ...previous,

          voucherNo: firstValue(
            purchase.voucherNo,
            purchase.vchNo,
            purchase.voucherNumber,
            previous.voucherNo,
          ),

          customerName: firstValue(
            purchase.customerName,
            purchase.supplierName,
            purchase.partyName,
            previous.customerName,
          ),

          voucherDate: voucherDate || previous.voucherDate,

          referenceNo: firstValue(
            purchase.referenceNo,
            purchase.referenceNumber,
            purchase.poNo
          ),

          referenceDate,

          narration: firstValue(
            purchase.narration,
            purchase.remarks,
            purchase.notes,
          ),

          createdBy: firstValue(purchase.createdBy, purchase.createdUser),

          approvedBy: firstValue(purchase.approvedBy, purchase.approvedUser),

          voucherStatus: firstValue(
            purchase.voucherStatus,
            purchase.status,
            "Pending",
          ),

          taxMode: firstValue(purchase.taxMode, "VAT"),

          taxType: firstValue(purchase.taxType, "intra"),

          autoRound: purchase.autoRound ?? purchase.roundOffEnabled ?? true,

          totalAmount: firstValue(purchase.totalAmount, purchase.netTotal),

          totalQty: firstValue(purchase.totalQty, purchase.totalQuantity),

          units: firstValue(purchase.units, purchase.unit),
        }));

        setDateInputText(
          voucherDate ? formatGenericDate(voucherDate, "DD-MMM-YY") : "",
        );

        setRefDateInputText(
          referenceDate ? formatGenericDate(referenceDate, "DD-MMM-YY") : "",
        );

        const serverItems =
          purchase.items ||
          purchase.purchaseItems ||
          purchase.requestInventory ||
          purchase.lines ||
          [];

        const mappedItems = serverItems.map(normalizePurchaseItem);

        setPurchaseItem(
          mappedItems.length > 0 ? mappedItems : [createEmptyPurchaseRow()],
        );

        const serverExpenses =
          purchase.expenses ||
          purchase.requestLedgerEntry ||
          purchase.addOnCosts ||
          [];

        const mappedExpenses = serverExpenses.map(normalizeExpense);

        setExpenses(
          mappedExpenses.length > 0 ? mappedExpenses : createEmptyExpenses(),
        );
      } catch (error) {
        console.error("Failed to load purchase:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPurchase();

    return () => {
      cancelled = true;
    };
  }, [alterId]);

  useEffect(() => {
    return () => {
      attachmentPreviews.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
    };
  }, [attachmentPreviews]);

  const setField = (name) => (event) => {
    setFormData((previous) => ({
      ...previous,
      [name]: event.target.value,
    }));
  };

  const commitDateChange = (rawText, field) => {
    const formattedDate = formatGenericDate(rawText, "DD-MMM-YY");

    if (!formattedDate) {
      if (field === "voucherDate") {
        setDateInputText(
          formData.voucherDate
            ? formatGenericDate(formData.voucherDate, "DD-MMM-YY")
            : "",
        );
      }

      if (field === "referenceDate") {
        setRefDateInputText(
          formData.referenceDate
            ? formatGenericDate(formData.referenceDate, "DD-MMM-YY")
            : "",
        );
      }

      return;
    }

    const isoDate = toISODate(rawText);

    setFormData((previous) => ({
      ...previous,
      [field]: isoDate,
    }));

    if (field === "voucherDate") {
      setDateInputText(formattedDate);
    }

    if (field === "referenceDate") {
      setRefDateInputText(formattedDate);
    }
  };

  const handleHeaderKeyDown = (event, nextElement) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    nextElement?.focus?.();
  };

  const updateRow = (rowIndex, field, value) => {
    setPurchaseItem((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const updateExpense = (id, field, value) => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((expense) => {
        if (expense.id !== id) {
          return expense;
        }

        return {
          ...expense,
          [field]: field === "totalAmount" ? Number(value) || 0 : value,
        };
      }),
    );
  };

  const isFocused = (rowIndex, field) => {
    return focusedCell === `${rowIndex}-${field}`;
  };

  const isExpenseFocused = (rowIndex, field) => {
    return focusedExpenseCell === `${rowIndex}-${field}`;
  };

  const cellHandlers = (rowIndex, field, columnIndex) => ({
    ref: (element) => {
      gridRefs.current[`${rowIndex}-${columnIndex}`] = element;
    },

    onKeyDown: (event) => {
      handleGridKeyDown(event, rowIndex, columnIndex);
    },

    onFocus: () => {
      setFocusedCell(`${rowIndex}-${field}`);
    },

    onBlur: () => {
      setFocusedCell(null);
    },

    onChange: (event) => {
      updateRow(rowIndex, field, unformatNumber(event.target.value));
    },
  });

  const focusAndSelect = (rowIndex, columnIndex) => {
    const field = FORMATTED_COLS[columnIndex];

    const focusElement = () => {
      const element = gridRefs.current[`${rowIndex}-${columnIndex}`];

      if (!element) {
        return;
      }

      element.focus();

      if (typeof element.select === "function") {
        element.select();
      }
    };

    if (field) {
      setFocusedCell(`${rowIndex}-${field}`);

      requestAnimationFrame(focusElement);
      return;
    }

    focusElement();
  };

  const handleGridKeyDown = (event, rowIndex, columnIndex) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const position = EDITABLE_COLS.indexOf(columnIndex);

    const isLastEditable = position === EDITABLE_COLS.length - 1;

    const nextRow = isLastEditable ? rowIndex + 1 : rowIndex;

    const nextColumn = isLastEditable
      ? EDITABLE_COLS[0]
      : EDITABLE_COLS[position + 1];

    if (nextRow >= purchaseItem.length) {
      setPurchaseItem((rows) => [
        ...rows,
        createEmptyPurchaseRow(rows[rows.length - 1]?.tax || ""),
      ]);

      setTimeout(() => {
        focusAndSelect(nextRow, nextColumn);
      }, 0);

      return;
    }

    focusAndSelect(nextRow, nextColumn);
  };

  const handleEndOfList = (rowIndex) => {
    setPurchaseItem((rows) => {
      if (rows.length === 1) {
        return [createEmptyPurchaseRow()];
      }

      return rows.filter((_, index) => index !== rowIndex);
    });

    setTimeout(() => {
      if (rowIndex < purchaseItem.length - 1) {
        gridRefs.current[`${rowIndex}-0`]?.focus();

        return;
      }

      if (rowIndex > 0) {
        gridRefs.current[`${rowIndex - 1}-4`]?.focus();

        return;
      }

      remarksRef.current?.focus();
    }, 0);
  };

  const focusAndSelectExpense = (rowIndex, field) => {
    const focusElement = () => {
      const element = expenseRefs.current[`${rowIndex}-${field}`];

      if (!element) {
        return;
      }

      element.focus();

      if (typeof element.select === "function") {
        element.select();
      }
    };

    if (FORMATTED_EXPENSE_FIELDS.has(field)) {
      setFocusedExpenseCell(`${rowIndex}-${field}`);

      requestAnimationFrame(focusElement);
      return;
    }

    focusElement();
  };

  const handleExpenseKeyDown = (event, rowIndex, field) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const expense = expenses[rowIndex];

    if (field === "particular" && !expense.particular.trim()) {
      remarksRef.current?.focus();
      return;
    }

    const position = EXPENSE_FIELDS.indexOf(field);

    const isLastField = position === EXPENSE_FIELDS.length - 1;

    const nextRow = isLastField ? rowIndex + 1 : rowIndex;

    const nextField = isLastField
      ? EXPENSE_FIELDS[0]
      : EXPENSE_FIELDS[position + 1];

    if (nextRow >= expenses.length) {
      remarksRef.current?.focus();
      return;
    }

    focusAndSelectExpense(nextRow, nextField);
  };

  const handleFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setAttachmentPreviews((previous) => {
      previous.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });

      return selectedFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      }));
    });

    setAttachments(selectedFiles);
  };

  const removeAttachment = (attachmentId) => {
    const selected = attachmentPreviews.find(
      (attachment) => attachment.id === attachmentId,
    );

    if (selected?.previewUrl) {
      URL.revokeObjectURL(selected.previewUrl);
    }

    const remaining = attachmentPreviews.filter(
      (attachment) => attachment.id !== attachmentId,
    );

    setAttachmentPreviews(remaining);

    setAttachments(remaining.map((attachment) => attachment.file));

    if (previewFile?.id === attachmentId) {
      setPreviewFile(null);
    }
  };

  const totals = useMemo(() => {
    return calculatePurchaseTotals({
      purchaseItems: purchaseItem,
      expenses,
      taxMode: formData.taxMode,
      taxType: formData.taxType,
      autoRound: formData.autoRound,
    });
  }, [
    purchaseItem,
    expenses,
    formData.taxMode,
    formData.taxType,
    formData.autoRound,
  ]);

  const expenseItems = useMemo(() => {
    return calculateExpenses(expenses, taxMode);
  }, [expenses, taxMode]);

  const expenseTotals = useMemo(() => {
    return expenseItems.reduce(
      (result, currentItem) => {
        result.taxable += currentItem.taxableAmount;

        result.tax += currentItem.taxAmount;

        result.total += currentItem.totalAmount;

        return result;
      },
      {
        taxable: 0,
        tax: 0,
        total: 0,
      },
    );
  }, [expenseItems]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const voucherData = buildPurchasePayload({
        formData,
        purchaseItem,
        expenses,
      });

      let response;

      if (isAlterMode) {
        response = await updatePurchase(alterId, voucherData, attachments);
      } else {
        response = await createPurchase(voucherData, attachments);
      }

      console.log(
        isAlterMode
          ? "Purchase updated successfully"
          : "Purchase created successfully",
        response,
      );
    } catch (error) {
      console.error("Purchase save failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderProductOption = (option) => {
    if (option.isEndOfList) {
      return <div className="px-2 font-bold text-red-700">♦ End of List</div>;
    }

    const product = option.product;

    return (
      <div className="grid grid-cols-[90px_minmax(0,1fr)_55px] items-center gap-2 px-2">
        <span className="font-semibold">{product.partNo}</span>

        <span className="truncate">{product.itemName}</span>

        <span className="text-center font-medium">{product.uom}</span>
      </div>
    );
  };

  const renderPurchaseRow = (currentItem, rowIndex) => {
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
      <tr key={currentItem.id} className="hover:bg-blue-50">
        <td className="border border-slate-300 bg-slate-100 text-center font-bold text-slate-500">
          {rowIndex + 1}
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <GenericSelect
            ref={(element) => {
              gridRefs.current[`${rowIndex}-0`] = element;
            }}
            options={rowProductOptions}
            placeholder="Select Product..."
            title="Products"
            value={
              productOptions.find(
                (option) => String(option.value) === String(currentItem.code),
              ) || null
            }
            onKeyDown={(event) => {
              handleGridKeyDown(event, rowIndex, 0);
            }}
            onChange={(selectedOption) => {
              if (!selectedOption) {
                return;
              }

              if (selectedOption.isEndOfList) {
                handleEndOfList(rowIndex);
                return;
              }

              const product = selectedOption.product;

              if (!product) {
                return;
              }

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
              if (selectedOption?.isEndOfList) {
                return;
              }

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
            renderOption={renderProductOption}
          />
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <input
            readOnly
            type="text"
            value={currentItem.desc}
            className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none"
          />
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <input
            {...cellHandlers(rowIndex, "qty", 1)}
            type="text"
            inputMode="decimal"
            value={
              isFocused(rowIndex, "qty")
                ? currentItem.qty
                : formatNumber(currentItem.qty)
            }
            placeholder="0.00"
            className="w-full bg-transparent px-1.5 text-right font-semibold text-slate-800 outline-none focus:bg-blue-100"
          />
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <input
            readOnly
            type="text"
            value={currentItem.uom}
            className="w-full bg-transparent px-1.5 text-center font-semibold text-slate-800 outline-none"
          />
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <input
            {...cellHandlers(rowIndex, "rate", 2)}
            type="text"
            inputMode="decimal"
            value={
              isFocused(rowIndex, "rate")
                ? currentItem.rate
                : formatNumber(currentItem.rate)
            }
            placeholder="0.00"
            className="w-full bg-transparent px-1.5 text-right font-semibold text-slate-800 outline-none focus:bg-blue-100"
          />
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <div className="flex pr-1">
            <input
              {...cellHandlers(rowIndex, "disc", 3)}
              type="text"
              inputMode="decimal"
              value={
                isFocused(rowIndex, "disc")
                  ? currentItem.disc
                  : formatPercent(currentItem.disc)
              }
              placeholder="0.00"
              className="w-full bg-transparent px-1 text-right font-semibold text-slate-800 outline-none focus:bg-blue-100"
            />

            <span className="text-slate-500">%</span>
          </div>
        </td>

        <td className="border border-slate-300 bg-slate-50">
          <div className="flex pr-1">
            <input
              {...cellHandlers(rowIndex, "tax", 4)}
              type="text"
              inputMode="decimal"
              value={
                isFocused(rowIndex, "tax")
                  ? currentItem.tax
                  : formatPercent(currentItem.tax)
              }
              placeholder="0.00"
              className="w-full bg-transparent px-0.5 text-right font-semibold text-slate-800 outline-none focus:bg-blue-100"
            />

            <span className="text-slate-500">%</span>
          </div>
        </td>

        <td className="border border-slate-300 bg-slate-50 px-1.5 text-right font-bold tabular-nums">
          {currencyFormatter(
            calculatePurchaseRow(currentItem, taxMode).taxable,
          )}
        </td>
      </tr>
    );
  };

  const renderExpenseRow = (expense, index) => {
    const amount = Number(expense.amount || 0);

    const tax = Number(expense.tax || 0);

    const totalAmount = amount + (amount * tax) / 100;

    return (
      <tr key={expense.id} className="h-5 bg-white hover:bg-blue-50">
        <td className="border border-slate-500 px-1 text-center font-semibold">
          {index + 1}
        </td>

        <td className="border border-slate-500 p-0">
          <input
            ref={(element) => {
              expenseRefs.current[`${index}-particular`] = element;
            }}
            value={expense.particular}
            onChange={(event) => {
              updateExpense(expense.id, "particular", event.target.value);
            }}
            onKeyDown={(event) => {
              handleExpenseKeyDown(event, index, "particular");
            }}
            className="h-5 w-full bg-transparent px-1 outline-none focus:bg-[#fff9da]"
          />
        </td>

        <td className="border border-slate-500 p-0">
          <input
            ref={(element) => {
              expenseRefs.current[`${index}-amount`] = element;
            }}
            type="text"
            inputMode="decimal"
            value={
              isExpenseFocused(index, "amount")
                ? expense.amount
                : formatNumber(expense.amount)
            }
            onFocus={() => {
              setFocusedExpenseCell(`${index}-amount`);
            }}
            onBlur={() => {
              setFocusedExpenseCell(null);
            }}
            onChange={(event) => {
              updateExpense(
                expense.id,
                "amount",
                unformatNumber(event.target.value),
              );
            }}
            onKeyDown={(event) => {
              handleExpenseKeyDown(event, index, "amount");
            }}
            className="h-5 w-full bg-transparent px-1 text-right outline-none focus:bg-[#fff9da]"
          />
        </td>

        <td className="border border-slate-500 p-0">
          <div className="flex pr-0.5">
            <input
              ref={(element) => {
                expenseRefs.current[`${index}-tax`] = element;
              }}
              type="text"
              inputMode="decimal"
              value={
                isExpenseFocused(index, "tax")
                  ? expense.tax
                  : formatPercent(expense.tax)
              }
              onFocus={() => {
                setFocusedExpenseCell(`${index}-tax`);
              }}
              onBlur={() => {
                setFocusedExpenseCell(null);
              }}
              onChange={(event) => {
                updateExpense(
                  expense.id,
                  "tax",
                  unformatNumber(event.target.value),
                );
              }}
              onKeyDown={(event) => {
                handleExpenseKeyDown(event, index, "tax");
              }}
              className="h-5 w-full bg-transparent px-1 text-right outline-none focus:bg-[#fff9da]"
            />

            <span>%</span>
          </div>
        </td>

        <td className="border border-slate-500 p-0">
          <input
            readOnly
            type="text"
            value={formatNumber(totalAmount)}
            className="h-5 w-full bg-transparent px-1 text-right outline-none"
          />
        </td>
      </tr>
    );
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded bg-white px-6 py-3 font-semibold shadow-lg">
            Loading purchase...
          </div>
        </div>
      )}

      <div className="h-dvh w-full overflow-hidden bg-slate-200 p-1 box-border">
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded border border-black bg-white shadow-md">
          <header className="shrink-0 border-b border-slate-300 px-2 py-1 text-[13px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1">
                <label
                  htmlFor="voucherNo"
                  className="rounded bg-blue-800 px-3 text-[12px] font-bold uppercase text-white"
                >
                  {isAlterMode ? "Alter Purchase" : "Purchase"}
                </label>

                <span className="ml-1 w-6 font-semibold text-slate-700">
                  No:
                </span>

                <input
                  ref={(element) => {
                    headerRefs.current[0] = element;
                  }}
                  id="voucherNo"
                  value={formData.voucherNo}
                  onChange={setField("voucherNo")}
                  onKeyDown={(event) => {
                    handleHeaderKeyDown(event, headerRefs.current[1]);
                  }}
                  className={`${headerInput} w-36`}
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="referenceNo"
                  className="w-16 whitespace-nowrap font-semibold text-slate-700"
                >
                  Ref No:
                </label>

                <input
                  ref={(element) => {
                    headerRefs.current[1] = element;
                  }}
                  id="referenceNo"
                  value={formData.referenceNo}
                  onChange={setField("referenceNo")}
                  onKeyDown={(event) => {
                    handleHeaderKeyDown(event, headerRefs.current[2]);
                  }}
                  className={`${headerInput} w-36`}
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="referenceDate"
                  className="w-16 whitespace-nowrap font-semibold text-slate-700"
                >
                  Ref Date:
                </label>

                <input
                  ref={(element) => {
                    headerRefs.current[2] = element;
                  }}
                  id="referenceDate"
                  value={refDateInputText}
                  onChange={(event) => {
                    setRefDateInputText(event.target.value);
                  }}
                  onBlur={() => {
                    commitDateChange(refDateInputText, "referenceDate");
                  }}
                  onKeyDown={(event) => {
                    handleHeaderKeyDown(event, headerRefs.current[3]);
                  }}
                  className={`${headerInput} w-24 text-right`}
                />
              </div>

              <div className="ml-auto flex items-center gap-1">
                <label
                  htmlFor="voucherDate"
                  className="font-semibold text-slate-700"
                >
                  Date:
                </label>

                <input
                  ref={(element) => {
                    headerRefs.current[3] = element;
                  }}
                  id="voucherDate"
                  value={dateInputText}
                  onChange={(event) => {
                    setDateInputText(event.target.value);
                  }}
                  onBlur={() => {
                    commitDateChange(dateInputText, "voucherDate");
                  }}
                  onKeyDown={(event) => {
                    handleHeaderKeyDown(event, headerRefs.current[4]);
                  }}
                  className={`${headerInput} w-24 text-right`}
                />

                <button
                  type="button"
                  onClick={() => {
                    hiddenDateRef.current?.showPicker?.();
                  }}
                  className="text-slate-700 hover:text-black"
                  aria-label="Open date picker"
                >
                  <Calendar size={18} />
                </button>

                <input
                  ref={hiddenDateRef}
                  type="date"
                  value={formData.voucherDate}
                  onChange={(event) => {
                    commitDateChange(event.target.value, "voucherDate");
                  }}
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                />
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1">
                <label
                  htmlFor="customerName"
                  className="w-30 whitespace-nowrap font-semibold text-slate-700"
                >
                  Customer:
                </label>

                <input
                  ref={(element) => {
                    headerRefs.current[4] = element;
                  }}
                  id="customerName"
                  value={formData.customerName}
                  onChange={setField("customerName")}
                  onKeyDown={(event) => {
                    handleHeaderKeyDown(event, gridRefs.current["0-0"]);
                  }}
                  className={`${headerInput} w-96`}
                />
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="taxMode"
                  className="whitespace-nowrap font-semibold text-slate-700"
                >
                  Tax Mode:
                </label>

                <input
                  disabled
                  id="taxMode"
                  value={formData.taxMode}
                  className={`${headerInput} w-20 cursor-not-allowed border-slate-100 bg-slate-100`}
                />
              </div>

              {formData.voucherDate && (
                <span className="text-xs font-bold text-blue-800">
                  {getDayName(formData.voucherDate)}
                </span>
              )}
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[900px] border-collapse text-[12px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-300">
                  <th className="w-10 border border-slate-400 px-1">S.No</th>

                  <th className="w-32 border border-slate-400 px-1.5 text-left">
                    Product Code
                  </th>

                  <th className="min-w-60 border border-slate-400 px-1.5 text-left">
                    Product Desc
                  </th>

                  <th className="w-20 border border-slate-400 px-1.5 text-right">
                    Qty
                  </th>

                  <th className="w-20 border border-slate-400 px-1.5">UOM</th>

                  <th className="w-24 border border-slate-400 px-1.5 text-right">
                    Rate
                  </th>

                  <th className="w-20 border border-slate-400 px-1.5 text-right">
                    Disc %
                  </th>

                  <th className="w-20 border border-slate-400 px-1.5 text-right">
                    {taxMode === "VAT" ? "VAT %" : "GST %"}
                  </th>

                  <th className="w-28 border border-slate-400 px-1.5 text-right">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>{purchaseItem.map(renderPurchaseRow)}</tbody>
            </table>
          </main>

          <button
            type="button"
            onClick={() => {
              setIsLast((current) => !current);
            }}
            aria-expanded={isLast}
            className="flex h-6 shrink-0 items-center justify-between border-t border-slate-400 bg-slate-200 px-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-300"
          >
            <span>Add on Cost & Tax Breakup</span>

            {isLast ? <ChevronDown size={14} /> : <ChevronUp size={14} />}

            <span className="tabular-nums">
              Grand Total:{" "}
              <b className="text-slate-900">{currencyFormatter(totals.net)}</b>
            </span>
          </button>

          {isLast && (
            <section className="grid max-h-[45dvh] shrink-0 grid-cols-1 overflow-y-auto border-t border-slate-400 bg-[#f8f8f8] text-[12px] md:grid-cols-[7fr_3fr]">
              <div className="min-w-0 border-r border-slate-300">
                <div className="flex items-center gap-1 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBottomView("expenses");
                    }}
                    className={[
                      "h-5 border px-3 text-xs font-bold",
                      bottomView === "expenses"
                        ? "border-[#173a85] bg-[#173a85] text-white"
                        : "border-slate-400 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    Add On Cost
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBottomView("tax");
                    }}
                    className={[
                      "h-5 border px-3 text-xs font-bold",
                      bottomView === "tax"
                        ? "border-[#173a85] bg-[#173a85] text-white"
                        : "border-slate-400 bg-white text-slate-700",
                    ].join(" ")}
                  >
                    Tax Breakup
                  </button>
                </div>

                {bottomView === "expenses" && (
                  <div className="overflow-auto p-1">
                    <table className="w-full border-collapse border border-slate-500">
                      <thead>
                        <tr className="bg-[#dce5ef] text-left font-bold">
                          <th className="w-12 border border-slate-500 px-2 text-center">
                            S.No
                          </th>

                          <th className="border border-slate-500 px-2">
                            Particular
                          </th>

                          <th className="w-40 border border-slate-500 px-2 text-right">
                            Rate
                          </th>

                          <th className="w-32 border border-slate-500 px-2 text-right">
                            Tax %
                          </th>

                          <th className="w-48 border border-slate-500 px-2 text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>{expenses.map(renderExpenseRow)}</tbody>

                      <tfoot>
                        <tr className="bg-[#e5ebf1] font-bold">
                          <td
                            colSpan={2}
                            className="border border-slate-500 px-2 text-right"
                          >
                            Total Expenses
                          </td>

                          <td className="border border-slate-500 px-2 text-right">
                            {currencyFormatter(expenseTotals.taxable)}
                          </td>

                          <td className="border border-slate-500" />

                          <td className="border border-slate-500 px-2 text-right">
                            {currencyFormatter(expenseTotals.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {bottomView === "tax" && (
                  <div className="overflow-auto p-1">
                    <table className="w-full border-collapse border border-slate-400">
                      <thead>
                        <tr className="bg-slate-200">
                          <th className="border border-slate-400 px-2 text-left">
                            {taxMode === "VAT" ? "VAT %" : "GST %"}
                          </th>

                          <th className="border border-slate-400 px-2 text-right">
                            Taxable
                          </th>

                          {taxMode === "VAT" && (
                            <th className="border border-slate-400 px-2 text-right">
                              VAT
                            </th>
                          )}

                          {taxMode === "GST" && isIntra && (
                            <>
                              <th className="border border-slate-400 px-2 text-right">
                                CGST
                              </th>

                              <th className="border border-slate-400 px-2 text-right">
                                SGST / UTGST
                              </th>
                            </>
                          )}

                          {taxMode === "GST" && !isIntra && (
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
                        {(totals.slabs || []).map((slab) => (
                          <tr key={slab.rate} className="bg-white">
                            <td className="border border-slate-300 px-2 font-semibold">
                              {slab.rate}%
                            </td>

                            <td className="border border-slate-300 px-2 text-right">
                              {currencyFormatter(slab.taxable)}
                            </td>

                            {taxMode === "VAT" && (
                              <td className="border border-slate-300 px-2 text-right">
                                {currencyFormatter(slab.vat)}
                              </td>
                            )}

                            {taxMode === "GST" && isIntra && (
                              <>
                                <td className="border border-slate-300 px-2 text-right">
                                  {currencyFormatter(slab.cgst)}
                                </td>

                                <td className="border border-slate-300 px-2 text-right">
                                  {currencyFormatter(slab.sgst)}
                                </td>
                              </>
                            )}

                            {taxMode === "GST" && !isIntra && (
                              <td className="border border-slate-300 px-2 text-right">
                                {currencyFormatter(slab.igst)}
                              </td>
                            )}

                            <td className="border border-slate-300 px-2 text-right font-semibold">
                              {currencyFormatter(slab.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr className="bg-slate-200 font-bold">
                          <td className="border border-slate-400 px-2">
                            Total
                          </td>

                          <td className="border border-slate-400 px-2 text-right">
                            {currencyFormatter(totals.taxable)}
                          </td>

                          {taxMode === "VAT" && (
                            <td className="border border-slate-400 px-2 text-right">
                              {currencyFormatter(totals.vat)}
                            </td>
                          )}

                          {taxMode === "GST" && isIntra && (
                            <>
                              <td className="border border-slate-400 px-2 text-right">
                                {currencyFormatter(totals.cgst)}
                              </td>

                              <td className="border border-slate-400 px-2 text-right">
                                {currencyFormatter(totals.sgst)}
                              </td>
                            </>
                          )}

                          {taxMode === "GST" && !isIntra && (
                            <td className="border border-slate-400 px-2 text-right">
                              {currencyFormatter(totals.igst)}
                            </td>
                          )}

                          <td className="border border-slate-400 px-2 text-right">
                            {currencyFormatter(totals.taxable + totals.tax)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              <div className="min-w-0 border-t border-slate-300 px-1 font-semibold md:border-t-0">
                <Line label="Gross Amount" value={totals.gross} />

                <Line label="Discount" value={-totals.discount} />

                <Line label="Taxable Value" value={totals.taxable} />

                <Line label="Add on & Others" value={totals.expenseAmount} />

                {taxMode === "VAT" && <Line label="VAT" value={totals.vat} />}

                {taxMode === "GST" && isIntra && (
                  <>
                    <Line label="CGST" value={totals.cgst} />

                    <Line label="SGST / UTGST" value={totals.sgst} />
                  </>
                )}

                {taxMode === "GST" && !isIntra && (
                  <Line label="IGST" value={totals.igst} />
                )}

                {taxMode !== "NONE" && (
                  <Line label="Total Tax" value={totals.tax} />
                )}

                <div className="flex justify-between text-slate-700">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={formData.autoRound}
                      onChange={(event) => {
                        setFormData((previous) => ({
                          ...previous,
                          autoRound: event.target.checked,
                        }));
                      }}
                    />
                    Round off
                  </label>

                  <span>
                    {totals.roundOff > 0 ? "+" : ""}
                    {formatNumber(totals.roundOff)}
                  </span>
                </div>

                <div className="mt-1 border-t border-slate-400 pt-1 text-[13px]">
                  <Line label="Net Total" value={totals.net} bold />
                </div>
              </div>
            </section>
          )}

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-400 bg-white px-2 py-1 text-[13px]">
            <div className="flex items-center gap-2">
              <label
                htmlFor="remarks"
                className="whitespace-nowrap font-semibold text-slate-700"
              >
                Remarks:
              </label>

              <input
                ref={remarksRef}
                id="remarks"
                value={formData.narration}
                onChange={setField("narration")}
                className={`${headerInput} w-96`}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFiles}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800"
              >
                <Paperclip size={12} />
                Attach File
                {attachments.length > 0 && (
                  <span className="rounded-full bg-blue-800 px-1.5 text-[10px] text-white">
                    {attachments.length}
                  </span>
                )}
              </button>

              {attachmentPreviews.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPreview((current) => !current);
                  }}
                  className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800"
                >
                  {showPreview ? (
                    <>
                      <EyeOff size={12} />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye size={12} />
                      View
                    </>
                  )}
                </button>
              )}

              <label
                htmlFor="createdBy"
                className="whitespace-nowrap font-semibold text-slate-700"
              >
                Created by:
              </label>

              <input
                id="createdBy"
                value={formData.createdBy}
                onChange={setField("createdBy")}
                className={`${headerInput} w-40`}
              />

              <button
                type="button"
                onClick={handleSave}
                disabled={loading || saving}
                className="rounded bg-[#2167d5] px-5 font-bold text-white shadow hover:bg-[#1553b5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : isAlterMode ? "Update" : "Save"}
              </button>
            </div>
          </footer>

          {showPreview && attachmentPreviews.length > 0 && (
            <section className="shrink-0 border-t border-slate-300 bg-slate-50 px-2 py-1">
              <div className="mb-1 text-xs font-bold text-slate-700">
                Attached Documents
              </div>

              <div className="flex flex-wrap gap-2">
                {attachmentPreviews.map((attachment) => {
                  const isImage = attachment.type.startsWith("image/");

                  const isPdf = attachment.type === "application/pdf";

                  return (
                    <div
                      key={attachment.id}
                      className="flex w-60 items-center gap-2 border border-slate-300 bg-white p-1 shadow-sm"
                    >
                      {isImage ? (
                        <img
                          src={attachment.previewUrl}
                          alt={attachment.name}
                          className="h-10 w-10 object-cover"
                        />
                      ) : isPdf ? (
                        <div className="flex h-10 w-10 items-center justify-center bg-red-100 text-xs font-bold text-red-700">
                          PDF
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center bg-blue-100 text-xs font-bold text-blue-700">
                          DOC
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-700">
                          {attachment.name}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewFile(attachment);
                        }}
                        className="text-xs font-bold text-blue-700 hover:underline"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          removeAttachment(attachment.id);
                        }}
                        className="text-xs font-bold text-red-700 hover:underline"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="flex h-[95vh] w-full max-w-5xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-300 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {previewFile.name}
                </p>

                <p className="text-xs text-slate-500">
                  {(previewFile.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={previewFile.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Open
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewFile(null);
                  }}
                  className="rounded border border-slate-400 px-3 text-sm font-semibold hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-slate-100 p-2">
              {previewFile.type.startsWith("image/") ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.name}
                  className="h-full w-full object-contain"
                />
              ) : previewFile.type === "application/pdf" ? (
                <iframe
                  title={previewFile.name}
                  src={previewFile.previewUrl}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    This file type cannot be previewed inside the application.
                  </p>

                  <a
                    href={previewFile.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-[#2167d5] px-4 py-2 text-sm font-bold text-white hover:bg-[#1553b5]"
                  >
                    Open File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlterPurchase;
