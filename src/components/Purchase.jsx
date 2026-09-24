import { useRef, useState } from "react";
import {
  formatGenericDate,
  getDayName,
  toISODate,
} from "../utils/FormatGenericDate.jsx";
import { Calendar } from "lucide-react";
import GenericSelect from "../utils/GenericSelect.jsx";

const emptyPurchaseRow = () => ({
  id: Date.now() + Math.random(),
  code: "",
  desc: "",
  qty: "",
  uom: "",
  rate: "",
  disc: "",
  gst: "",
  amt: "",
});

const Purchase = () => {
  /* --------------------------- State --------------------------- */

  const [formData, setFormData] = useState({
    voucherNo: "",
    customerName: "",
    vDate: toISODate(new Date()),
    finalStatus: "Pending",
  });
  const [customerOptions, setCustomerOptions] = useState([]);
  const [purchaseItem, setPurchaseItem] = useState([emptyPurchaseRow()]);
  const [dateInputText, setDateInputText] = useState(
    formatGenericDate(new Date(), "DD-MMM-YY"),
  );

  /* ---------------------------- Refs ---------------------------- */

  // [0] = Voucher No, [1] = Customer GenericSelect, [2] = Date
  const headerRefs = useRef([]);
  const hiddenDateRef = useRef(null);

  const commitDateChange = (rawText) => {
    const formattedDate = formatGenericDate(rawText, "DD-MMM-YY");

    if (!formattedDate) {
      setDateInputText(
        formData.vDate ? formatGenericDate(formData.vDate, "DD-MMM-YY") : "",
      );
      return;
    }

    const isoDate = toISODate(rawText);

    setFormData((prev) => ({
      ...prev,
      vDate: isoDate,
    }));

    setDateInputText(formattedDate);
  };

  const handleCustomerSelected = () => {
    setTimeout(() => {
      headerRefs.current[2]?.focus?.({ preventScroll: true });
      headerRefs.current[2]?.select?.();
    }, 0);
  };

  // Enter moves through the header fields.
  const handleHeaderKeyDown = (event, nextElement) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    nextElement?.focus?.();
  };

  return (
    <div className="h-dvh w-full overflow-hidden bg-slate-200 p-1 box-border">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xs border border-black bg-white px-1 pt-1 shadow-md">
        <header className="shrink-0  border-b border-slate-300 pb-1 mb-1 text-[13px]">
          <div className="flex items-center justify-between">
            {/* Voucher number */}
            <div className="flex items-center space-x-1">
              <label
                htmlFor="voucherNo"
                className="w-32 rounded-xs bg-blue-800 text-center py-0.5 text-[12px] font-bold uppercase tracking-tight text-white"
              >
                Purchase
              </label>

              <span className="ml-2 font-semibold text-slate-700">No:</span>

              <input
                ref={(element) => {
                  headerRefs.current[0] = element;
                }}
                id="voucherNo"
                name="voucherNo"
                type="text"
                autoComplete="off"
                value={formData.voucherNo}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    voucherNo: event.target.value,
                  }))
                }
                onKeyDown={(event) =>
                  handleHeaderKeyDown(event, headerRefs.current[1])
                }
                className="h-5 w-36 border border-amber-300 bg-[#fee8af] px-1 text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Customer */}
            <div className="flex items-center space-x-2">
              <label
                htmlFor="customerName"
                className="w-28 font-semibold text-slate-700"
              >
                Customer Name:
              </label>

              <input className="h-5 w-72 border border-amber-300 bg-[#fee8af] px-1 text-right text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
            </div>

            {/* Date */}
            <div className="flex items-center space-x-1">
              <label htmlFor="vDate" className="font-semibold text-slate-700">
                Date:
              </label>

              <input
                ref={(element) => {
                  headerRefs.current[2] = element;
                }}
                id="vDate"
                name="vDate"
                type="text"
                value={dateInputText}
                onChange={(event) => setDateInputText(event.target.value)}
                onBlur={() => commitDateChange(dateInputText)}
                onKeyDown={(event) =>
                  handleHeaderKeyDown(event, executiveRefs.current[0])
                }
                className="h-5 w-24 border border-amber-300 bg-[#fee8af] px-1 text-right text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />

              <button
                type="button"
                tabIndex={-1}
                onClick={() => hiddenDateRef.current?.showPicker?.()}
                className="outline-none text-slate-700 hover:text-black"
                aria-label="Open date picker"
              >
                <Calendar size={18} />
              </button>

              <input
                ref={hiddenDateRef}
                type="date"
                value={formData.vDate}
                onChange={(event) => commitDateChange(event.target.value)}
                className="pointer-events-none sr-only absolute"
              />
            </div>
          </div>
          {/* Row 2: Reference No and Reference Date */}
          <div className="flex justify-between border-b border-slate-300 pt-2">
            <div className="flex items-center gap-8  px-2 py-1">
              <div className="flex items-center space-x-2">
                <label
                  htmlFor="referenceNo"
                  className="w-28 font-semibold text-slate-700"
                >
                  Reference No:
                </label>

                <input className="h-5 w-45 border border-amber-300 bg-[#fee8af] px-1 text-right text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
              </div>

              <div className="flex items-center space-x-2">
                <label
                  htmlFor="referenceDate"
                  className="w-28 font-semibold text-slate-700"
                >
                  Reference Date:
                </label>

                <input className="h-5 w-28 border border-amber-300 bg-[#fee8af] px-1 text-right text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
            </div>
            {formData.vDate && (
              <span className="text-xs font-bold text-blue-800">
                {getDayName(formData.vDate)}
              </span>
            )}
          </div>
        </header>

        <main className="relative w-full flex-1 overflow-auto border border-slate-400">
          <table className="w-full border-collapse text-left text-[12px] select-none">
            <thead>
              <tr className="h-6 bg-slate-300">
                <th className="w-8 border border-slate-500 bg-slate-300 px-1 text-center">
                  S.No
                </th>
                <th className="min-w-30 border border-slate-500 px-1.5">
                  Product Code
                </th>
                <th className="min-w-105 border border-slate-500 px-1.5">
                  Product Desc
                </th>
                <th className="w-18.75 border border-slate-500 px-1 text-center">
                  Quantity
                </th>
                <th className="w-18.75 border border-slate-500 px-1 text-center">
                  uom
                </th>
                <th className="w-18.75 border border-slate-500 px-1 text-center">
                  Rate
                </th>
                <th className="w-18.75 border border-slate-500 px-1 text-center">
                  Disc
                </th>
                <th className="w-25 border border-slate-500 px-1 text-center">
                  Gst
                </th>
                <th className="w-25 border border-slate-500 px-1 text-center">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {purchaseItem.map((item, rowIndex) => (
                <tr key={item.id} className="hover:bg-blue-50">
                  <td className="border border-slate-600 bg-slate-100 text-center font-bold text-slate-500">
                    {rowIndex + 1}
                  </td>
                  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
				  <td className="border border-slate-600 p-0">
                    <input
                      type="text"
                      className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100"
                    />
                  </td>
                </tr>
              ))}  

			  
				{/* Fills visible table area with empty rows */}
							{Array.from({ length: 19 }).map((_, index) => (
								<tr key={`dummy-${index}`} className="h-6">
									<td className="border border-slate-200 text-center text-slate-300">
										{purchaseItem.length + index + 1}
									</td>
									<td colSpan={10} className="border border-slate-200" />
								</tr>
							))}
			  
            </tbody>
          </table>

		  <div className="border-t border-slate-400 bg-[#f8f8f8]  lg:grid-cols-[1fr_380px]">
          <label className="block font-semibold">
            Narration:
            <textarea
              
              className="mt-1 h-10 w-full resize-none border border-slate-400 bg-white font-normal outline-none  focus:ring-blue-300"
              placeholder="Enter narration..."
            />
          </label></div>
        </main>

		 <footer className="flex  items-center justify-end gap-4 border-t border-slate-400 bg-white px-3 py-1 text-[12px] font-bold uppercase tracking-tight ">
          
		<div className="flex items-center space-x-2">
              <label
                htmlFor="customerName"
                className="w-28 font-semibold text-slate-700"
              >
                Created by:
              </label>

              <input className="h-5 w-72 border border-amber-300 bg-[#fee8af] px-1 text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
            </div>
			<div className="flex items-center space-x-2">
              <label
                htmlFor="customerName"
                className="w-28 font-semibold text-slate-700"
              >
                Approved By:
              </label>

              <input className="h-5 w-72 border border-amber-300 bg-[#fee8af] px-1  text-[13px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white" />
            </div>
          <button
            type="button"
            // onClick={closeVoucher}
            className="rounded border border-slate-500 bg-white px-5  font-semibold hover:bg-slate-100"
          >
            Close
          </button>

          <button
            type="button"
            // onClick={saveVoucher}
            className="rounded bg-[#2167d5] px-5  font-bold text-white shadow hover:bg-[#1553b5]"
          >
            { 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Purchase;
