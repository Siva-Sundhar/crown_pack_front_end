import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Paperclip,
} from 'lucide-react';

import {
  formatGenericDate,
  getDayName,
  toISODate,
} from '../utils/FormatGenericDate.jsx';

import GenericSelect from '../utils/GenericSelect.jsx';
import item from '../utils/item.js';

const GST_RATES = [0, 5, 12, 18, 28];

const TAX_MODES = [
  { label: 'GST', value: 'GST' },
  { label: 'VAT', value: 'VAT' },
  { label: 'No Tax', value: 'NONE' },
];

const TAX_TYPES = [
  { label: 'Intra State', value: 'INTRA' },
  { label: 'Inter State', value: 'INTER' },
];

const EMPTY_EXPENSES = [
  { id: 1, particular: '', tax: '', totalAmount: '' },
  { id: 2, particular: '', tax: '', totalAmount: '' },
  { id: 3, particular: '', tax: '', totalAmount: '' },
  { id: 4, particular: '', tax: '', totalAmount: '' },
  { id: 5, particular: '', tax: '', totalAmount: '' },
];

const EDITABLE_COLS = [0, 1, 2, 3, 4];

const headerInput =
  'h-5 border border-amber-300 bg-[#fee8af] px-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100';

const gridInput =
  'h-5 w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100';

const num = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const r2 = (value) => {
  return Math.round((num(value) + Number.EPSILON) * 100) / 100;
};

const money = (value) => {
  return num(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const emptyPurchaseRow = (gst = '') => ({
  id: `${Date.now()}-${Math.random()}`,
  code: '',
  desc: '',
  qty: '',
  uom: '',
  rate: '',
  disc: '',
  gst,
});

const calculatePurchaseRow = (row, taxMode) => {
  const quantity = num(row.qty);
  const rate = num(row.rate);
  const discountPercent = Math.min(Math.max(num(row.disc), 0), 100);
  const taxRate = Math.max(num(row.gst), 0);

  const gross = r2(quantity * rate);
  const discountAmount = r2((gross * discountPercent) / 100);
  const taxable = r2(gross - discountAmount);

  const taxAmount =
    taxMode === 'NONE' ? 0 : r2((taxable * taxRate) / 100);

  return {
    quantity,
    rate,
    discountPercent,
    taxRate,
    gross,
    discountAmount,
    taxable,
    taxAmount,
    totalAmount: r2(taxable + taxAmount),
  };
};

function Line({ label, value, bold = false }) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        bold ? 'font-bold text-slate-900' : 'text-slate-700'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  );
}

export default function Purchase() {
  const [formData, setFormData] = useState({
    voucherNo: '',
    customerName: '',
    referenceNo: '',
    referenceDate: '',
    narration: '',
    createdBy: '',
    approvedBy: '',
    vDate: toISODate(new Date()),
    finalStatus: 'Pending',

    transport: '',
    transportGst: '',

    taxMode: 'GST',
    taxType: 'INTRA',

    autoRound: true,
  });

  const [purchaseItem, setPurchaseItem] = useState([
    emptyPurchaseRow(),
  ]);

  const [expenses, setExpenses] = useState(EMPTY_EXPENSES);

  const [dateInputText, setDateInputText] = useState(
    formatGenericDate(new Date(), 'DD-MMM-YY'),
  );

  const [isBottomOpen, setIsBottomOpen] = useState(false);
  const [bottomView, setBottomView] = useState('expenses');

  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [showAttachmentList, setShowAttachmentList] = useState(false);

  const [saveState, setSaveState] = useState({
    loading: false,
    message: '',
    error: '',
  });

  const headerRefs = useRef([]);
  const hiddenDateRef = useRef(null);
  const gridRefs = useRef({});
  const collapseBtnRef = useRef(null);
  const remarksRef = useRef(null);
  const fileInputRef = useRef(null);

  const taxMode = String(formData.taxMode || 'NONE').toUpperCase();
  const taxType = String(formData.taxType || 'INTRA').toUpperCase();

  const isGst = taxMode === 'GST';
  const isVat = taxMode === 'VAT';
  const isNoTax = taxMode === 'NONE';
  const isIntra = taxType === 'INTRA';

  const setField = useCallback(
    (name) => (event) => {
      setFormData((current) => ({
        ...current,
        [name]: event.target.value,
      }));
    },
    [],
  );

  const validPurchaseItems = useMemo(() => {
    return purchaseItem.filter((row) => {
      return (
        row.code ||
        row.desc ||
        num(row.qty) > 0 ||
        num(row.rate) > 0
      );
    });
  }, [purchaseItem]);

  const validExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      return (
        String(expense.particular || '').trim() ||
        num(expense.tax) > 0 ||
        num(expense.totalAmount) > 0
      );
    });
  }, [expenses]);

  const productOptions = useMemo(() => {
    return item.map((product) => ({
      label: product.partNo,
      value: product.partNo,
      product,
    }));
  }, []);

  const totals = useMemo(() => {
    const slabMap = new Map();

    let grossAmount = 0;
    let discountAmount = 0;
    let itemsTaxableAmount = 0;
    let totalQuantity = 0;

    validPurchaseItems.forEach((row) => {
      const calculated = calculatePurchaseRow(row, taxMode);

      grossAmount += calculated.gross;
      discountAmount += calculated.discountAmount;
      itemsTaxableAmount += calculated.taxable;
      totalQuantity += calculated.quantity;

      if (calculated.taxable > 0 && !isNoTax) {
        const oldValue = slabMap.get(calculated.taxRate) || 0;

        slabMap.set(
          calculated.taxRate,
          r2(oldValue + calculated.taxable),
        );
      }
    });

    const transportAmount = r2(Math.max(num(formData.transport), 0));
    const transportTaxRate = r2(
      Math.max(num(formData.transportGst), 0),
    );

    if (transportAmount > 0 && !isNoTax) {
      const oldValue = slabMap.get(transportTaxRate) || 0;

      slabMap.set(
        transportTaxRate,
        r2(oldValue + transportAmount),
      );
    }

    const taxSlabs = [...slabMap.entries()]
      .sort(([rateA], [rateB]) => rateA - rateB)
      .map(([rate, taxableValue]) => {
        const taxable = r2(taxableValue);
        const tax = r2((taxable * rate) / 100);

        if (isVat) {
          return {
            rate,
            taxable,
            tax,
            vat: tax,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: r2(taxable + tax),
          };
        }

        if (isGst && isIntra) {
          const cgst = r2(tax / 2);
          const sgst = r2(tax - cgst);

          return {
            rate,
            taxable,
            tax,
            vat: 0,
            cgst,
            sgst,
            igst: 0,
            total: r2(taxable + tax),
          };
        }

        return {
          rate,
          taxable,
          tax,
          vat: 0,
          cgst: 0,
          sgst: 0,
          igst: tax,
          total: r2(taxable + tax),
        };
      });

    const taxTotals = taxSlabs.reduce(
      (result, slab) => {
        result.tax += slab.tax;
        result.cgst += slab.cgst;
        result.sgst += slab.sgst;
        result.vat += slab.vat;
        result.igst += slab.igst;

        return result;
      },
      {
        tax: 0,
        cgst: 0,
        sgst: 0,
        vat: 0,
        igst: 0,
      },
    );

    const expenseTotals = validExpenses.reduce(
      (result, expense) => {
        const baseAmount = r2(Math.max(num(expense.totalAmount), 0));

        // Expense tax field is an amount, not a percentage.
        const taxAmount = isNoTax
          ? 0
          : r2(Math.max(num(expense.tax), 0));

        result.baseAmount += baseAmount;
        result.taxAmount += taxAmount;
        result.totalAmount += baseAmount + taxAmount;

        return result;
      },
      {
        baseAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      },
    );

    const taxableAmount = r2(
      itemsTaxableAmount + transportAmount,
    );

    const taxAmount = r2(taxTotals.tax);

    const beforeRound = r2(
      taxableAmount + taxAmount + expenseTotals.totalAmount,
    );

    const roundOff = formData.autoRound
      ? r2(Math.round(beforeRound) - beforeRound)
      : 0;

    return {
      quantity: r2(totalQuantity),

      gross: r2(grossAmount),
      discount: r2(discountAmount),

      itemsTaxable: r2(itemsTaxableAmount),
      transport: transportAmount,
      taxable: taxableAmount,

      tax: taxAmount,
      vat: r2(taxTotals.vat),
      cgst: r2(taxTotals.cgst),
      sgst: r2(taxTotals.sgst),
      igst: r2(taxTotals.igst),

      expenseBase: r2(expenseTotals.baseAmount),
      expenseTax: r2(expenseTotals.taxAmount),
      expenses: r2(expenseTotals.totalAmount),

      beforeRound,
      roundOff,
      net: r2(beforeRound + roundOff),

      slabs: taxSlabs,
    };
  }, [
    validPurchaseItems,
    validExpenses,
    formData.transport,
    formData.transportGst,
    formData.autoRound,
    taxMode,
    isGst,
    isVat,
    isNoTax,
    isIntra,
  ]);

  const commitDateChange = useCallback(
    (rawText) => {
      const formattedDate = formatGenericDate(
        rawText,
        'DD-MMM-YY',
      );

      if (!formattedDate) {
        setDateInputText(
          formData.vDate
            ? formatGenericDate(formData.vDate, 'DD-MMM-YY')
            : '',
        );
        return;
      }

      setFormData((current) => ({
        ...current,
        vDate: toISODate(rawText),
      }));

      setDateInputText(formattedDate);
    },
    [formData.vDate],
  );

  const handleHeaderKeyDown = useCallback(
    (event, nextElement) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();
      nextElement?.focus?.();
    },
    [],
  );

  const updateRow = useCallback((rowIndex, key, value) => {
    setPurchaseItem((rows) =>
      rows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }, []);

  const updateExpense = useCallback((id, key, value) => {
    setExpenses((rows) =>
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    );
  }, []);

  const handleEndOfList = useCallback(
    (rowIndex) => {
      const nextRowCount = Math.max(purchaseItem.length - 1, 1);

      setPurchaseItem((rows) => {
        if (rows.length <= 1) {
          return [emptyPurchaseRow()];
        }

        return rows.filter((_, index) => index !== rowIndex);
      });

      setTimeout(() => {
        if (rowIndex < nextRowCount) {
          gridRefs.current[`${rowIndex}-0`]?.focus();
          return;
        }

        if (rowIndex > 0) {
          gridRefs.current[`${rowIndex - 1}-4`]?.focus();
          return;
        }

        remarksRef.current?.focus();
      }, 0);
    },
    [purchaseItem.length],
  );

  const handleGridKeyDown = useCallback(
    (event, rowIndex, columnIndex) => {
      if (event.key !== 'Enter') return;

      event.preventDefault();

      const currentPosition = EDITABLE_COLS.indexOf(columnIndex);

      const isLastEditableColumn =
        currentPosition === EDITABLE_COLS.length - 1;

      const nextRowIndex = isLastEditableColumn
        ? rowIndex + 1
        : rowIndex;

      const nextColumnIndex = isLastEditableColumn
        ? EDITABLE_COLS[0]
        : EDITABLE_COLS[currentPosition + 1];

      if (nextRowIndex >= purchaseItem.length) {
        setPurchaseItem((rows) => [
          ...rows,
          emptyPurchaseRow(rows[rows.length - 1]?.gst || ''),
        ]);

        setTimeout(() => {
          gridRefs.current[
            `${nextRowIndex}-${nextColumnIndex}`
          ]?.focus();
        }, 0);

        return;
      }

      const nextInput =
        gridRefs.current[
          `${nextRowIndex}-${nextColumnIndex}`
        ];

      nextInput?.focus?.();
      nextInput?.select?.();
    },
    [purchaseItem.length],
  );

  const handleFiles = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setAttachmentPreviews((oldFiles) => {
      oldFiles.forEach((attachment) => {
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
    setPreviewFile(null);

    event.target.value = '';
  }, []);

  const removeAttachment = useCallback(
    (attachmentId) => {
      const selectedAttachment = attachmentPreviews.find(
        (attachment) => attachment.id === attachmentId,
      );

      if (selectedAttachment?.previewUrl) {
        URL.revokeObjectURL(selectedAttachment.previewUrl);
      }

      const remainingAttachments = attachmentPreviews.filter(
        (attachment) => attachment.id !== attachmentId,
      );

      setAttachmentPreviews(remainingAttachments);

      setAttachments(
        remainingAttachments.map((attachment) => attachment.file),
      );

      if (previewFile?.id === attachmentId) {
        setPreviewFile(null);
      }
    },
    [attachmentPreviews, previewFile],
  );

  useEffect(() => {
    return () => {
      attachmentPreviews.forEach((attachment) => {
        URL.revokeObjectURL(attachment.previewUrl);
      });
    };
  }, [attachmentPreviews]);

  const validatePurchase = useCallback(() => {
    const errors = [];

    if (!formData.voucherNo.trim()) {
      errors.push('Voucher number is required');
    }

    if (!formData.customerName.trim()) {
      errors.push('Customer is required');
    }

    if (validPurchaseItems.length === 0) {
      errors.push('At least one purchase item is required');
    }

    validPurchaseItems.forEach((row, index) => {
      if (!row.code) {
        errors.push(`Item ${index + 1}: product is required`);
      }

      if (num(row.qty) <= 0) {
        errors.push(`Item ${index + 1}: quantity must be greater than zero`);
      }

      if (num(row.rate) < 0) {
        errors.push(`Item ${index + 1}: rate cannot be negative`);
      }

      if (!isNoTax && num(row.gst) < 0) {
        errors.push(`Item ${index + 1}: tax rate cannot be negative`);
      }
    });

    return errors;
  }, [
    formData.customerName,
    formData.voucherNo,
    isNoTax,
    validPurchaseItems,
  ]);

  const buildPurchasePayload = useCallback(() => {
    const purchaseItems = validPurchaseItems.map((row, index) => {
      const calculated = calculatePurchaseRow(row, taxMode);

      return {
        lineNo: index + 1,
        productCode: row.code,
        description: row.desc,
        quantity: calculated.quantity,
        uom: row.uom,
        rate: calculated.rate,
        discountPercent: calculated.discountPercent,
        discountAmount: calculated.discountAmount,
        taxRate: calculated.taxRate,
        grossAmount: calculated.gross,
        taxableAmount: calculated.taxable,
        taxAmount: calculated.taxAmount,
        totalAmount: calculated.totalAmount,
      };
    });

    const expenseItems = validExpenses.map((expense, index) => {
      const baseAmount = r2(Math.max(num(expense.totalAmount), 0));

      const taxAmount = isNoTax
        ? 0
        : r2(Math.max(num(expense.tax), 0));

      return {
        lineNo: index + 1,
        particular: expense.particular.trim(),
        baseAmount,
        taxAmount,
        totalAmount: r2(baseAmount + taxAmount),
      };
    });

    const taxItems = totals.slabs.map((slab) => ({
      taxRate: slab.rate,
      taxableAmount: slab.taxable,
      vatAmount: slab.vat,
      cgstAmount: slab.cgst,
      sgstAmount: slab.sgst,
      igstAmount: slab.igst,
      taxAmount: slab.tax,
      totalAmount: slab.total,
    }));

    return {
      voucherNo: formData.voucherNo.trim(),
      voucherDate: formData.vDate,

      customerName: formData.customerName.trim(),

      referenceNo: formData.referenceNo.trim(),
      referenceDate: formData.referenceDate || null,

      narration: formData.narration.trim(),

      createdBy: formData.createdBy.trim(),
      approvedBy: formData.approvedBy.trim(),

      finalStatus: formData.finalStatus,

      taxMode,
      taxType,

      transportAmount: totals.transport,
      transportTaxRate: num(formData.transportGst),

      autoRound: formData.autoRound,

      purchaseItems,
      expenseItems,
      taxItems,

      totals: {
        quantity: totals.quantity,
        grossAmount: totals.gross,
        discountAmount: totals.discount,
        itemsTaxableAmount: totals.itemsTaxable,
        transportAmount: totals.transport,
        taxableAmount: totals.taxable,
        vatAmount: totals.vat,
        cgstAmount: totals.cgst,
        sgstAmount: totals.sgst,
        igstAmount: totals.igst,
        taxAmount: totals.tax,
        expenseBaseAmount: totals.expenseBase,
        expenseTaxAmount: totals.expenseTax,
        expenseAmount: totals.expenses,
        beforeRoundAmount: totals.beforeRound,
        roundOffAmount: totals.roundOff,
        netAmount: totals.net,
      },

      attachmentMetadata: attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };
  }, [
    attachments,
    formData,
    isNoTax,
    taxMode,
    taxType,
    totals,
    validExpenses,
    validPurchaseItems,
  ]);

  const savePurchase = useCallback(async () => {
    const validationErrors = validatePurchase();

    if (validationErrors.length > 0) {
      setSaveState({
        loading: false,
        message: '',
        error: validationErrors[0],
      });

      return;
    }

    setSaveState({
      loading: true,
      message: '',
      error: '',
    });

    try {
      const payload = buildPurchasePayload();

      console.log('Purchase payload:', payload);

      /*
      ===============================================================
      OPTION 1: Save only JSON, no attachments
      ===============================================================

      const response = await fetch(
        'http://localhost:8080/api/purchases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      */

      /*
      ===============================================================
      OPTION 2: Save JSON + attachments through multipart/form-data
      Recommended for your current component.
      Do NOT set Content-Type manually.
      ===============================================================
      */

      const multipartData = new FormData();

      multipartData.append(
        'purchase',
        new Blob([JSON.stringify(payload)], {
          type: 'application/json',
        }),
      );

      attachments.forEach((file) => {
        multipartData.append('attachments', file);
      });

      // Uncomment after Spring Boot API is ready.
      /*
      const response = await fetch(
        'http://localhost:8080/api/purchases',
        {
          method: 'POST',
          body: multipartData,
        },
      );

      if (!response.ok) {
        const errorMessage = await response.text();

        throw new Error(
          errorMessage || 'Unable to save purchase voucher',
        );
      }

      const savedPurchase = await response.json();

      console.log('Saved purchase:', savedPurchase);
      */

      // Temporary frontend-only success.
      await new Promise((resolve) => setTimeout(resolve, 400));

      setSaveState({
        loading: false,
        message: 'Purchase voucher is ready to save',
        error: '',
      });
    } catch (error) {
      console.error('Purchase save failed:', error);

      setSaveState({
        loading: false,
        message: '',
        error:
          error.message ||
          'Unable to save purchase voucher',
      });
    }
  }, [
    attachments,
    buildPurchasePayload,
    validatePurchase,
  ]);

  const taxBreakupColumnCount = isVat
    ? 4
    : isGst && isIntra
      ? 5
      : isGst
        ? 4
        : 3;

  return (
    <div className="box-border h-dvh w-full overflow-hidden bg-slate-200 p-1">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xs border border-black bg-white shadow-md">
        {/* Header */}
        <header className="shrink-0 border-b border-slate-300 px-2 py-1 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <span className="w-22 rounded-xs bg-blue-800 px-3 text-[12px] font-bold uppercase text-white">
                Purchase
              </span>

              <label
                htmlFor="voucherNo"
                className="ml-1 w-6 font-semibold text-slate-700"
              >
                No
              </label>

              <span>:</span>

              <input
                ref={(element) => {
                  headerRefs.current[0] = element;
                }}
                id="voucherNo"
                value={formData.voucherNo}
                onChange={setField('voucherNo')}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(
                    event,
                    headerRefs.current[1],
                  )
                }
                className={`${headerInput} w-28 sm:w-36`}
              />
            </div>

            <div className="flex items-center gap-1">
              <label
                htmlFor="referenceNo"
                className="w-16 whitespace-nowrap font-semibold text-slate-700"
              >
                Ref No
              </label>

              <span>:</span>

              <input
                ref={(element) => {
                  headerRefs.current[1] = element;
                }}
                id="referenceNo"
                value={formData.referenceNo}
                onChange={setField('referenceNo')}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(
                    event,
                    headerRefs.current[2],
                  )
                }
                className={`${headerInput} w-36`}
              />
            </div>

            <div className="flex items-center gap-1">
              <label
                htmlFor="referenceDate"
                className="w-16 whitespace-nowrap font-semibold text-slate-700"
              >
                Ref Date
              </label>

              <span>:</span>

              <input
                ref={(element) => {
                  headerRefs.current[2] = element;
                }}
                id="referenceDate"
                value={formData.referenceDate}
                onChange={setField('referenceDate')}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(
                    event,
                    headerRefs.current[3],
                  )
                }
                className={`${headerInput} w-20 text-right`}
                placeholder="DD-MMM-YY"
              />
            </div>

            <div className="flex items-center gap-1 sm:ml-auto">
              <label
                htmlFor="voucherDate"
                className="font-semibold text-slate-700"
              >
                Date
              </label>

              <span>:</span>

              <input
                ref={(element) => {
                  headerRefs.current[3] = element;
                }}
                id="voucherDate"
                value={dateInputText}
                onChange={(event) =>
                  setDateInputText(event.target.value)
                }
                onBlur={() => commitDateChange(dateInputText)}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(
                    event,
                    headerRefs.current[4],
                  )
                }
                className={`${headerInput} w-22 text-right`}
              />

              <button
                type="button"
                tabIndex={-1}
                onClick={() =>
                  hiddenDateRef.current?.showPicker?.()
                }
                className="text-slate-700 hover:text-black"
                aria-label="Open voucher date picker"
              >
                <Calendar size={18} />
              </button>

              <input
                ref={hiddenDateRef}
                type="date"
                value={formData.vDate}
                onChange={(event) =>
                  commitDateChange(event.target.value)
                }
                className="pointer-events-none absolute sr-only"
              />
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <label
                htmlFor="customerName"
                className="w-30 whitespace-nowrap font-semibold text-slate-700"
              >
                Customer
              </label>

              <span>:</span>

              <input
                ref={(element) => {
                  headerRefs.current[4] = element;
                }}
                id="customerName"
                value={formData.customerName}
                onChange={setField('customerName')}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(
                    event,
                    gridRefs.current['0-0'],
                  )
                }
                className={`${headerInput} w-96.5`}
              />
            </div>

            <div className="flex items-center gap-1">
              <label
                htmlFor="taxMode"
                className="w-16 whitespace-nowrap font-semibold text-slate-700"
              >
                Tax Mode
              </label>

              <span>:</span>

              <select
                id="taxMode"
                value={taxMode}
                onChange={setField('taxMode')}
                className={`${headerInput} w-20`}
              >
                {TAX_MODES.map((tax) => (
                  <option key={tax.value} value={tax.value}>
                    {tax.label}
                  </option>
                ))}
              </select>
            </div>

            {isGst && (
              <div className="flex items-center gap-1">
                <label
                  htmlFor="taxType"
                  className="whitespace-nowrap font-semibold text-slate-700"
                >
                  Tax Type
                </label>

                <span>:</span>

                <select
                  id="taxType"
                  value={taxType}
                  onChange={setField('taxType')}
                  className={`${headerInput} w-26`}
                >
                  {TAX_TYPES.map((tax) => (
                    <option key={tax.value} value={tax.value}>
                      {tax.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.vDate && (
              <span className="ml-1 text-xs font-bold text-blue-800">
                {getDayName(formData.vDate)}
              </span>
            )}
          </div>
        </header>

        {/* Purchase items */}
        <main className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-180 border-collapse text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-300">
                <th className="w-10 border border-slate-400 px-1 text-center">
                  S.No
                </th>
                <th className="w-32 border border-slate-400 px-1.5 text-left">
                  Product Code
                </th>
                <th className="min-w-60 border border-slate-400 px-1.5 text-left">
                  Product Desc
                </th>
                <th className="w-20 border border-slate-400 px-1.5 text-right">
                  Qty
                </th>
                <th className="w-20 border border-slate-400 px-1.5 text-center">
                  UOM
                </th>
                <th className="w-24 border border-slate-400 px-1.5 text-right">
                  Rate
                </th>
                <th className="w-20 border border-slate-400 px-1.5 text-right">
                  Disc %
                </th>
                <th className="w-20 border border-slate-400 px-1.5 text-right">
                  {isVat ? 'VAT %' : isNoTax ? 'Tax %' : 'GST %'}
                </th>
                <th className="w-28 border border-slate-400 px-1.5 text-right">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {purchaseItem.map((purchaseRow, rowIndex) => {
                const rowProductOptions =
                  purchaseItem.length > 1
                    ? [
                        {
                          label: '♦ End of List',
                          value: '__END_OF_LIST__',
                          isEndOfList: true,
                        },
                        ...productOptions,
                      ]
                    : productOptions;

                const rowCalculation = calculatePurchaseRow(
                  purchaseRow,
                  taxMode,
                );

                return (
                  <tr key={purchaseRow.id} className="hover:bg-blue-50">
                    <td className="border border-slate-300 bg-slate-100 text-center font-bold text-slate-500">
                      {rowIndex + 1}
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <GenericSelect
                        ref={(element) => {
                          gridRefs.current[`${rowIndex}-0`] = element;
                        }}
                        options={rowProductOptions}
                        value={
                          productOptions.find(
                            (option) =>
                              option.value === purchaseRow.code,
                          ) || null
                        }
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 0)
                        }
                        onChange={(selectedOption) => {
                          if (!selectedOption) return;

                          if (selectedOption.isEndOfList) {
                            handleEndOfList(rowIndex);
                            return;
                          }

                          const product = selectedOption.product;

                          if (!product) return;

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
                          if (
                            !selectedOption ||
                            selectedOption.isEndOfList
                          ) {
                            return;
                          }

                          setTimeout(() => {
                            gridRefs.current[
                              `${rowIndex}-1`
                            ]?.focus();
                          }, 0);
                        }}
                        placeholder="Select Product..."
                        title="Products"
                        labelKey="label"
                        valueKey="value"
                        inputFocusStyle={{
                          backgroundColor: '#dbeafe',
                        }}
                        menuStyle={{
                          width: '600px',
                          maxWidth: 'calc(100vw - 8px)',
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

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        readOnly
                        value={purchaseRow.desc}
                        className={`${gridInput} cursor-default`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(element) => {
                          gridRefs.current[`${rowIndex}-1`] = element;
                        }}
                        type="text"
                        inputMode="decimal"
                        value={purchaseRow.qty}
                        onChange={(event) =>
                          updateRow(
                            rowIndex,
                            'qty',
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 1)
                        }
                        className={`${gridInput} text-right`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        readOnly
                        value={purchaseRow.uom}
                        className={`${gridInput} cursor-default text-center`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(element) => {
                          gridRefs.current[`${rowIndex}-2`] = element;
                        }}
                        type="text"
                        inputMode="decimal"
                        value={purchaseRow.rate}
                        onChange={(event) =>
                          updateRow(
                            rowIndex,
                            'rate',
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 2)
                        }
                        className={`${gridInput} text-right`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(element) => {
                          gridRefs.current[`${rowIndex}-3`] = element;
                        }}
                        type="text"
                        inputMode="decimal"
                        value={purchaseRow.disc}
                        onChange={(event) =>
                          updateRow(
                            rowIndex,
                            'disc',
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 3)
                        }
                        className={`${gridInput} text-right`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50">
                      <input
                        ref={(element) => {
                          gridRefs.current[`${rowIndex}-4`] = element;
                        }}
                        type="text"
                        inputMode="decimal"
                        disabled={isNoTax}
                        value={purchaseRow.gst}
                        onChange={(event) =>
                          updateRow(
                            rowIndex,
                            'gst',
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 4)
                        }
                        className={`${gridInput} text-right disabled:cursor-not-allowed disabled:bg-slate-100`}
                      />
                    </td>

                    <td className="border border-slate-300 bg-slate-50 px-1.5 text-right font-bold tabular-nums">
                      {money(rowCalculation.taxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>

        {/* Expand / collapse */}
        <button
          ref={collapseBtnRef}
          type="button"
          onClick={() => setIsBottomOpen((current) => !current)}
          aria-expanded={isBottomOpen}
          className="flex h-4.5 shrink-0 items-center justify-between border-t border-slate-400 bg-slate-200 px-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-300"
        >
          <span>Expenses & Tax Breakup</span>

          {isBottomOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronUp size={14} />
          )}

          <span className="tabular-nums">
            Net Total:{' '}
            <b className="text-slate-900">{money(totals.net)}</b>
          </span>
        </button>

        {/* Expenses / Tax breakup / summary */}
        {isBottomOpen && (
          <section className="grid max-h-[45dvh] shrink-0 grid-cols-1 overflow-y-auto border-t border-slate-400 bg-[#f8f8f8] text-[12px] md:h-40 md:max-h-none md:grid-cols-[7fr_3fr] md:overflow-visible">
            <div className="min-w-0 border-b border-slate-300 p-1 md:border-b-0 md:border-r">
              <div className="mb-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBottomView('expenses')}
                  className={`h-4.5 border px-3 text-xs font-bold ${
                    bottomView === 'expenses'
                      ? 'border-[#173a85] bg-[#173a85] text-white'
                      : 'border-slate-400 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Expenses
                </button>

                <button
                  type="button"
                  onClick={() => setBottomView('tax')}
                  className={`h-4.5 border px-3 text-xs font-bold ${
                    bottomView === 'tax'
                      ? 'border-[#173a85] bg-[#173a85] text-white'
                      : 'border-slate-400 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Tax Breakup
                </button>

                <span className="ml-2 text-xs font-semibold text-slate-500">
                  {bottomView === 'expenses'
                    ? 'Additional purchase expenses'
                    : isVat
                      ? 'VAT breakup by tax slab'
                      : isGst
                        ? 'GST breakup by tax slab'
                        : 'No tax selected'}
                </span>
              </div>

              {bottomView === 'expenses' && (
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
                        <th className="w-32 border border-slate-500 px-2 text-right">
                          Tax Amount
                        </th>
                        <th className="w-40 border border-slate-500 px-2 text-right">
                          Base Amount
                        </th>
                        <th className="w-40 border border-slate-500 px-2 text-right">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {expenses.map((expense, index) => {
                        const expenseBase = r2(
                          Math.max(num(expense.totalAmount), 0),
                        );

                        const expenseTax = isNoTax
                          ? 0
                          : r2(Math.max(num(expense.tax), 0));

                        return (
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
                                    'particular',
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 outline-none focus:bg-[#fff9da]"
                                placeholder="Expense particular"
                              />
                            </td>

                            <td className="border border-slate-500 p-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={isNoTax}
                                value={expense.tax}
                                onChange={(event) =>
                                  updateExpense(
                                    expense.id,
                                    'tax',
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 text-right outline-none focus:bg-[#fff9da] disabled:cursor-not-allowed disabled:bg-slate-100"
                                placeholder="0.00"
                              />
                            </td>

                            <td className="border border-slate-500 p-0">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={expense.totalAmount}
                                onChange={(event) =>
                                  updateExpense(
                                    expense.id,
                                    'totalAmount',
                                    event.target.value,
                                  )
                                }
                                className="h-4.5 w-full bg-transparent px-2 text-right outline-none focus:bg-[#fff9da]"
                                placeholder="0.00"
                              />
                            </td>

                            <td className="border border-slate-500 px-2 text-right font-semibold tabular-nums">
                              {money(expenseBase + expenseTax)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr className="h-4.5 bg-[#e5ebf1] font-bold">
                        <td
                          colSpan={2}
                          className="border border-slate-500 px-2 text-right"
                        >
                          Total Expenses
                        </td>

                        <td className="border border-slate-500 px-2 text-right">
                          {money(totals.expenseTax)}
                        </td>

                        <td className="border border-slate-500 px-2 text-right">
                          {money(totals.expenseBase)}
                        </td>

                        <td className="border border-slate-500 px-2 text-right">
                          {money(totals.expenses)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {bottomView === 'tax' && (
                <div className="overflow-auto border border-slate-300">
                  <table className="w-full border-collapse tabular-nums">
                    <thead className="bg-slate-200">
                      <tr className="h-4.5">
                        <th className="border border-slate-400 px-2 text-left">
                          {isVat ? 'VAT %' : 'GST %'}
                        </th>

                        <th className="border border-slate-400 px-2 text-right">
                          Taxable
                        </th>

                        {isVat && (
                          <th className="border border-slate-400 px-2 text-right">
                            VAT
                          </th>
                        )}

                        {isGst && isIntra && (
                          <>
                            <th className="border border-slate-400 px-2 text-right">
                              CGST
                            </th>
                            <th className="border border-slate-400 px-2 text-right">
                              SGST / UTGST
                            </th>
                          </>
                        )}

                        {isGst && !isIntra && (
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
                      {isNoTax ? (
                        <tr className="h-5">
                          <td
                            colSpan={taxBreakupColumnCount}
                            className="border border-slate-300 px-2 text-center text-slate-400"
                          >
                            Tax mode is set to No Tax
                          </td>
                        </tr>
                      ) : totals.slabs.length === 0 ? (
                        <tr className="h-5">
                          <td
                            colSpan={taxBreakupColumnCount}
                            className="border border-slate-300 px-2 text-center text-slate-400"
                          >
                            No taxable purchase items
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

                            {isVat && (
                              <td className="border border-slate-300 px-2 text-right">
                                {money(slab.vat)}
                              </td>
                            )}

                            {isGst && isIntra && (
                              <>
                                <td className="border border-slate-300 px-2 text-right">
                                  {money(slab.cgst)}
                                </td>

                                <td className="border border-slate-300 px-2 text-right">
                                  {money(slab.sgst)}
                                </td>
                              </>
                            )}

                            {isGst && !isIntra && (
                              <td className="border border-slate-300 px-2 text-right">
                                {money(slab.igst)}
                              </td>
                            )}

                            <td className="border border-slate-300 px-2 text-right font-semibold">
                              {money(slab.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {!isNoTax && (
                      <tfoot>
                        <tr className="h-5 bg-[#e5ebf1] font-bold">
                          <td className="border border-slate-400 px-2">
                            Total
                          </td>

                          <td className="border border-slate-400 px-2 text-right">
                            {money(totals.taxable)}
                          </td>

                          {isVat && (
                            <td className="border border-slate-400 px-2 text-right">
                              {money(totals.vat)}
                            </td>
                          )}

                          {isGst && isIntra && (
                            <>
                              <td className="border border-slate-400 px-2 text-right">
                                {money(totals.cgst)}
                              </td>

                              <td className="border border-slate-400 px-2 text-right">
                                {money(totals.sgst)}
                              </td>
                            </>
                          )}

                          {isGst && !isIntra && (
                            <td className="border border-slate-400 px-2 text-right">
                              {money(totals.igst)}
                            </td>
                          )}

                          <td className="border border-slate-400 px-2 text-right">
                            {money(totals.taxable + totals.tax)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="min-w-0 border-t border-slate-300 px-1 font-semibold md:border-t-0">
              <Line label="Gross Amount" value={totals.gross} />
              <Line label="Discount" value={-totals.discount} />

              <div className="flex items-center justify-between gap-1 text-slate-700">
                <span>Transport</span>

                <div className="flex items-center gap-1">
                  <select
                    value={formData.transportGst}
                    onChange={setField('transportGst')}
                    disabled={isNoTax}
                    className={`${headerInput} w-14`}
                    aria-label="Transport tax rate"
                  >
                    <option value="">-</option>

                    {GST_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.transport}
                    onChange={setField('transport')}
                    className={`${headerInput} w-20 text-right`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <Line label="Taxable Value" value={totals.taxable} />

              <Line label="Expense Base" value={totals.expenseBase} />
              <Line label="Expense Tax" value={totals.expenseTax} />
              <Line label="Expense Total" value={totals.expenses} />

              {isVat && <Line label="VAT" value={totals.vat} />}

              {isGst && isIntra && (
                <>
                  <Line label="CGST" value={totals.cgst} />
                  <Line label="SGST / UTGST" value={totals.sgst} />
                </>
              )}

              {isGst && !isIntra && (
                <Line label="IGST" value={totals.igst} />
              )}

              <div className="flex justify-between text-slate-700">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.autoRound}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        autoRound: event.target.checked,
                      }))
                    }
                  />
                  Round off
                </label>

                <span className="tabular-nums">
                  {totals.roundOff > 0 ? '+' : ''}
                  {money(totals.roundOff)}
                </span>
              </div>

              <div className="mt-0.5 border-t border-slate-400 pt-0.5 text-[13px]">
                <Line label="Net Total" value={totals.net} bold />
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-400 bg-white px-2 py-1 text-[13px]">
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
              onChange={setField('narration')}
              className={`${headerInput} w-36 sm:w-96`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
              onClick={() => fileInputRef.current?.click()}
              className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800 hover:border-blue-600 hover:bg-blue-100"
            >
              <Paperclip size={12} />
              Add File

              {attachments.length > 0 && (
                <span className="rounded-full bg-blue-800 px-1.5 text-[10px] text-white">
                  {attachments.length}
                </span>
              )}
            </button>

            {attachmentPreviews.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setShowAttachmentList((current) => !current)
                }
                className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800 hover:border-blue-600 hover:bg-blue-100"
              >
                {showAttachmentList ? (
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

            <div className="flex items-center gap-1">
              <label
                htmlFor="createdBy"
                className="whitespace-nowrap font-semibold text-slate-700"
              >
                Created by
              </label>

              <span>:</span>

              <input
                id="createdBy"
                value={formData.createdBy}
                onChange={setField('createdBy')}
                className={`${headerInput} w-32 sm:w-44`}
              />
            </div>

            <button
              type="button"
              onClick={savePurchase}
              disabled={saveState.loading}
              className="rounded bg-[#2167d5] px-5 py-1 font-bold text-white shadow hover:bg-[#1553b5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveState.loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </footer>

        {saveState.message && (
          <div className="shrink-0 border-t border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
            {saveState.message}
          </div>
        )}

        {saveState.error && (
          <div className="shrink-0 border-t border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
            {saveState.error}
          </div>
        )}

        {/* Attachment card list */}
        {showAttachmentList && attachmentPreviews.length > 0 && (
          <section className="shrink-0 border-t border-slate-300 bg-slate-50 px-2 py-1">
            <div className="mb-1 text-xs font-bold text-slate-700">
              Attached Documents
            </div>

            <div className="flex flex-wrap gap-2">
              {attachmentPreviews.map((attachment) => {
                const isImage = attachment.type.startsWith('image/');
                const isPdf =
                  attachment.type === 'application/pdf';

                return (
                  <div
                    key={attachment.id}
                    className="flex w-52 items-center gap-2 border border-slate-300 bg-white p-1 shadow-sm"
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
                      onClick={() => setPreviewFile(attachment)}
                      className="text-xs font-bold text-blue-700 hover:underline"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-xs font-bold text-red-700 hover:underline"
                      title="Remove attachment"
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

      {/* Attachment preview modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="flex h-[95vh] w-full max-w-5xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-300 px-3 py-1">
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
                  onClick={() => setPreviewFile(null)}
                  className="rounded border border-slate-400 px-3 py-1 text-sm font-semibold hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 bg-slate-100 p-2">
              {previewFile.type.startsWith('image/') ? (
                <img
                  src={previewFile.previewUrl}
                  alt={previewFile.name}
                  className="h-full w-full object-contain"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe
                  title={previewFile.name}
                  src={previewFile.previewUrl}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    This document type cannot be previewed inside
                    the browser.
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
    </div>
  );
}