import { useMemo, useState } from 'react';

const initialItems = [
  {
    id: 1,
    productCode: 'RM-AC-001',
    description: 'ACETIC ACID',
    qty: 10,
    uom: 'KGS',
    rate: 84,
  },
  {
    id: 2,
    productCode: 'RM-CH-018',
    description: 'CHEMICAL RAW MATERIAL',
    qty: 5,
    uom: 'KGS',
    rate: 125,
  },
];

const money = (value) => Number(value || 0).toFixed(2);

export default function PurchaseSample() {
  const [voucherNo, setVoucherNo] = useState('PUR/0019/26-27');
  const [voucherDate, setVoucherDate] = useState('2026-09-23');
  const [supplier, setSupplier] = useState('GEE EMM AAR CHEMICALS');
  const [referenceNo, setReferenceNo] = useState('TEST');
  const [referenceDate, setReferenceDate] = useState('2026-09-23');

  const [items, setItems] = useState(initialItems);
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [narration, setNarration] = useState('Purchase invoice entry');
  const [saved, setSaved] = useState(false);

  const taxableAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  }, [items]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }, [items]);

  const cgstAmount = (taxableAmount * cgstRate) / 100;
  const sgstAmount = (taxableAmount * sgstRate) / 100;
  const grandTotal = taxableAmount + cgstAmount + sgstAmount;

  const dayName = voucherDate
    ? new Date(`${voucherDate}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'long',
      })
    : '';

  function markChanged() {
    setSaved(false);
  }

  function updateItem(id, field, value) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        if (field === 'qty' || field === 'rate') {
          return {
            ...item,
            [field]: Number(value) || 0,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );

    markChanged();
  }

  function addRow() {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: Date.now(),
        productCode: '',
        description: '',
        qty: 0,
        uom: 'NOS',
        rate: 0,
      },
    ]);

    markChanged();
  }

  function removeRow(id) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    );

    markChanged();
  }

  function saveVoucher() {
    const purchaseVoucherPayload = {
      voucherNo,
      voucherDate,
      supplier,
      referenceNo,
      referenceDate,
      narration,
      items,
      taxableAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      grandTotal,
    };

    console.log('Purchase Voucher Payload:', purchaseVoucherPayload);

    // Example Spring Boot API call:
    //
    // await fetch('http://localhost:8080/api/purchases', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(purchaseVoucherPayload),
    // });

    setSaved(true);
  }

  function closeVoucher() {
    window.history.back();
  }

  return (
    <main className="min-h-screen bg-[#202020] p-1 font-sans text-[13px] text-slate-800">
      <section className="mx-auto flex min-h-[calc(100vh-8px)] max-w-[1900px] flex-col overflow-hidden border border-slate-500 bg-white shadow-2xl">
        {/* HEADER */}
        <header className="border-b border-slate-500 bg-[#f8f8f8]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-2">
            <span className="bg-[#173a85] px-3 py-2 text-sm font-bold text-white">
              PURCHASE
            </span>

            <label className="flex items-center gap-1 font-bold">
              Voucher No:
              <input
                value={voucherNo}
                onChange={(event) => {
                  setVoucherNo(event.target.value);
                  markChanged();
                }}
                className="h-7 w-44 border border-[#e7c33e] bg-[#fff1b5] px-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>

            <label className="ml-auto flex items-center gap-2 font-bold">
              Supplier / Party A/c:
              <input
                value={supplier}
                onChange={(event) => {
                  setSupplier(event.target.value);
                  markChanged();
                }}
                className="h-7 w-72 border border-[#e7c33e] bg-[#fff1b5] px-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>

            <label className="flex items-center gap-1 font-bold">
              Date:
              <input
                type="date"
                value={voucherDate}
                onChange={(event) => {
                  setVoucherDate(event.target.value);
                  markChanged();
                }}
                className="h-7 border border-slate-400 bg-white px-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>

            <span className="font-bold">{dayName}</span>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-300 px-2 py-2">
            <label className="flex items-center gap-2 font-bold">
              Reference No:
              <input
                value={referenceNo}
                onChange={(event) => {
                  setReferenceNo(event.target.value);
                  markChanged();
                }}
                className="h-7 w-48 border border-[#e7c33e] bg-[#fff1b5] px-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>

            <label className="flex items-center gap-2 font-bold">
              Reference Date:
              <input
                type="date"
                value={referenceDate}
                onChange={(event) => {
                  setReferenceDate(event.target.value);
                  markChanged();
                }}
                className="h-7 border border-slate-400 bg-white px-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              />
            </label>
          </div>
        </header>

        {/* PURCHASE ITEMS GRID */}
        <div className="flex-1 overflow-auto p-1">
          <table className="w-full min-w-[1100px] border-collapse border border-slate-700">
            <thead>
              <tr className="bg-[#dce5ef] text-left text-sm font-bold">
                <th className="w-12 border border-slate-500 px-2 py-1.5 text-center">
                  S.No
                </th>
                <th className="w-40 border border-slate-500 px-2 py-1.5">
                  Product Code
                </th>
                <th className="min-w-[350px] border border-slate-500 px-2 py-1.5">
                  Description
                </th>
                <th className="w-28 border border-slate-500 px-2 py-1.5 text-right">
                  Qty
                </th>
                <th className="w-24 border border-slate-500 px-2 py-1.5">
                  UOM
                </th>
                <th className="w-32 border border-slate-500 px-2 py-1.5 text-right">
                  Rate
                </th>
                <th className="w-36 border border-slate-500 px-2 py-1.5 text-right">
                  Amount
                </th>
                <th className="w-16 border border-slate-500 px-2 py-1.5 text-center">
                  Delete
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="h-7 bg-white hover:bg-blue-50">
                  <td className="border border-slate-500 px-2 text-center font-semibold">
                    {index + 1}
                  </td>

                  <td className="border border-slate-500 p-0">
                    <GridInput
                      value={item.productCode}
                      onChange={(value) =>
                        updateItem(item.id, 'productCode', value)
                      }
                    />
                  </td>

                  <td className="border border-slate-500 p-0">
                    <GridInput
                      value={item.description}
                      onChange={(value) =>
                        updateItem(item.id, 'description', value)
                      }
                    />
                  </td>

                  <td className="border border-slate-500 p-0">
                    <GridInput
                      type="number"
                      align="right"
                      value={item.qty}
                      onChange={(value) =>
                        updateItem(item.id, 'qty', value)
                      }
                    />
                  </td>

                  <td className="border border-slate-500 p-0">
                    <GridInput
                      value={item.uom}
                      onChange={(value) =>
                        updateItem(item.id, 'uom', value)
                      }
                    />
                  </td>

                  <td className="border border-slate-500 p-0">
                    <GridInput
                      type="number"
                      align="right"
                      value={item.rate}
                      onChange={(value) =>
                        updateItem(item.id, 'rate', value)
                      }
                    />
                  </td>

                  <td className="border border-slate-500 px-2 text-right font-semibold">
                    {money(item.qty * item.rate)}
                  </td>

                  <td className="border border-slate-500 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(item.id)}
                      className="px-2 text-xs font-semibold text-red-700 hover:underline"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}

              {Array.from({ length: Math.max(0, 20 - items.length) }).map(
                (_, index) => (
                  <tr key={`empty-row-${index}`} className="h-7">
                    <td className="border border-slate-200 px-2 text-center text-slate-300">
                      {items.length + index + 1}
                    </td>
                    <td colSpan={7} className="border border-slate-200" />
                  </tr>
                ),
              )}
            </tbody>

            <tfoot>
              <tr className="bg-[#e5ebf1] font-bold">
                <td
                  colSpan={3}
                  className="border border-slate-500 px-2 py-1.5 text-right"
                >
                  Total
                </td>
                <td className="border border-slate-500 px-2 py-1.5 text-right">
                  {money(totalQty)}
                </td>
                <td className="border border-slate-500" />
                <td className="border border-slate-500" />
                <td className="border border-slate-500 px-2 py-1.5 text-right">
                  {money(taxableAmount)}
                </td>
                <td className="border border-slate-500" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* NARRATION AND GST */}
        <div className="grid gap-2 border-t border-slate-400 bg-[#f8f8f8] p-2 lg:grid-cols-[1fr_380px]">
          <label className="block font-bold">
            Narration:
            <textarea
              value={narration}
              onChange={(event) => {
                setNarration(event.target.value);
                markChanged();
              }}
              className="mt-1 h-24 w-full resize-none border border-slate-400 bg-white p-2 font-normal outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Enter narration..."
            />
          </label>

          <section className="border border-slate-500 bg-white">
            <div className="border-b border-slate-500 bg-[#dce5ef] px-2 py-1.5 font-bold">
              GST CALCULATION
            </div>

            <div className="space-y-1.5 p-2">
              <CalcRow label="Taxable Amount" value={taxableAmount} />

              <TaxRow
                label="CGST"
                rate={cgstRate}
                amount={cgstAmount}
                setRate={(value) => {
                  setCgstRate(value);
                  markChanged();
                }}
              />

              <TaxRow
                label="SGST"
                rate={sgstRate}
                amount={sgstAmount}
                setRate={(value) => {
                  setSgstRate(value);
                  markChanged();
                }}
              />

              <div className="border-t border-slate-400 pt-1">
                <CalcRow label="Grand Total" value={grandTotal} strong />
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER ACTIONS */}
        <footer className="flex flex-wrap items-center justify-end gap-4 border-t border-slate-400 bg-white px-3 py-2">
          <span className="mr-auto text-xs font-semibold">
            Total Qty: {money(totalQty)} &nbsp; | &nbsp; Grand Total: ₹{' '}
            {money(grandTotal)}
          </span>

          <button
            type="button"
            onClick={addRow}
            className="rounded border border-slate-400 bg-slate-100 px-4 py-1.5 font-semibold hover:bg-slate-200"
          >
            + Row
          </button>

          <button
            type="button"
            onClick={closeVoucher}
            className="rounded border border-slate-500 bg-white px-5 py-1.5 font-semibold hover:bg-slate-100"
          >
            Close
          </button>

          <button
            type="button"
            onClick={saveVoucher}
            className="rounded bg-[#2167d5] px-5 py-1.5 font-bold text-white shadow hover:bg-[#1553b5]"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </footer>
      </section>
    </main>
  );
}

function GridInput({ value, onChange, type = 'text', align = 'left' }) {
  return (
    <input
      type={type}
      min={type === 'number' ? 0 : undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-7 w-full bg-transparent px-2 outline-none focus:bg-[#fff9da] ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    />
  );
}

function CalcRow({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between ${strong ? 'text-sm font-bold' : ''}`}>
      <span>{label}</span>
      <span>₹ {money(value)}</span>
    </div>
  );
}

function TaxRow({ label, rate, setRate, amount }) {
  return (
    <div className="grid grid-cols-[1fr_75px_110px] items-center gap-2">
      <span>{label}</span>

      <label className="relative">
        <input
          type="number"
          min="0"
          step="0.1"
          value={rate}
          onChange={(event) => setRate(Number(event.target.value) || 0)}
          className="h-7 w-full border border-slate-400 px-1 pr-5 text-right outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="pointer-events-none absolute right-1 top-1 text-xs">
          %
        </span>
      </label>

      <span className="text-right">₹ {money(amount)}</span>
    </div>
  );
}