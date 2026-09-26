import { useEffect, useMemo, useRef, useState } from 'react';
import {
	formatGenericDate,
	getDayName,
	toISODate,
} from '../utils/FormatGenericDate.jsx';
import GenericSelect from '../utils/GenericSelect.jsx';
import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Eye,
	EyeOff,
	Paperclip,
} from 'lucide-react';
import item from '../utils/item.js';
import {
	calculateExpenses,
	calculatePurchaseRow,
	calculatePurchaseTotals,
} from '../utils/purchase-calcultion.js';

const emptyPurchaseRow = (gst = '') => ({
	id: Date.now() + Math.random(),
	code: '',
	desc: '',
	qty: '',
	uom: '',
	rate: '',
	disc: '',
	gst,
});

const currencyFormatter = (value) => {
	// value can be string or number
	const num = typeof value === 'string' ? Number(value) : value;

	if (!Number.isFinite(num)) {
		return '0.00'; // or handle invalid input as you like
	}

	const base = new Intl.NumberFormat('en-NG', {
		style: 'currency',
		currency: 'NGN',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);

	// Insert a space between the currency symbol and the number if missing
	// This assumes the symbol is at the start (₦1,000.00 → ₦ 1,000.00)
	return base.replace(/^(\D+)(\d)/, '$1 $2');
};

const headerInput =
	'h-5 border border-amber-300 bg-[#fee8af] px-1 text-slate-900 outline-none focus:border-blue-500 focus:bg-white';

const Line = ({ label, value, bold }) => (
	<div
		className={`flex justify-between ${bold ? 'font-bold text-slate-900' : 'text-slate-700'} border-b border-slate-400 `}
	>
		<span>{label}</span>
		<span className="tabular-nums">{currencyFormatter(value)}</span>
	</div>
);

// Editable column indices: Product(0), Qty(1), Rate(2), Disc(3), GST(4)
const EDITABLE_COLS = [0, 1, 2, 3, 4];

const Purchase = () => {
	const [formData, setFormData] = useState({
		voucherNo: 'PI/0001/26-27',
		customerName: 'ABC Private Ltd',
		referenceNo: '',
		referenceDate: '',
		narration: '',
		createdBy: '',
		approvedBy: '',
		vDate: toISODate(new Date()),
		finalStatus: 'Pending',
		transport: '',
		transportGst: '',
		taxMode: 'VAT',
		taxType: 'intera',
		autoRound: true,
	});
	const taxMode = String(formData.taxMode || 'NONE').toUpperCase();
	const taxType = String(formData.taxType || 'INTRA').toUpperCase();
	const isIntra = taxType === 'INTRA';

	const [expenses, setExpenses] = useState([
		{
			id: crypto.randomUUID(),
			particular: '',
			amount: '',
			tax: 0,
			totalAmount: 0,
		},
		{
			id: crypto.randomUUID(),
			particular: '',
			amount: '',
			tax: 0,
			totalAmount: 0,
		},
		{
			id: crypto.randomUUID(),
			particular: '',
			amount: '',
			tax: 0,
			totalAmount: 0,
		},
		{
			id: crypto.randomUUID(),
			particular: '',
			amount: '',
			tax: 0,
			totalAmount: 0,
		},
		{
			id: crypto.randomUUID(),
			particular: '',
			amount: '',
			tax: 0,
			totalAmount: 0,
		},
	]);

	const FORMATTED_COLS = {
		1: 'qty',
		2: 'rate',
		3: 'disc',
		4: 'gst',
	};
	const EXPENSE_FIELDS = ['particular', 'amount', 'tax'];

	const [purchaseItem, setPurchaseItem] = useState([emptyPurchaseRow()]);

	const [dateInputText, setDateInputText] = useState(
		formatGenericDate(new Date(), 'DD-MMM-YY'),
	);
	const fileInputRef = useRef(null);
	const [attachments, setAttachments] = useState([]);
	const [attachmentPreviews, setAttachmentPreviews] = useState([]);
	const [previewFile, setPreviewFile] = useState(null);
	const [showPreview, setShowPreview] = useState(false);
	const [focusedCell, setFocusedCell] = useState(null);
	const [focusedExpenseCell, setFocusedExpenseCell] = useState(null);
	const [isLast, setIsLast] = useState(false);
	const [bottomView, setBottomView] = useState('expenses');

	/* Refs */
	const headerRefs = useRef([]);
	const hiddenDateRef = useRef(null);
	const gridRefs = useRef({});
	const expenseRefs = useRef({});
	const collapseBtnRef = useRef(null);
	const remarksRef = useRef(null);

	const setField = (name) => (e) =>
		setFormData((prev) => ({ ...prev, [name]: e.target.value }));

	const commitDateChange = (rawText) => {
		const formattedDate = formatGenericDate(rawText, 'DD-MMM-YY');
		if (!formattedDate) {
			setDateInputText(
				formData.vDate ? formatGenericDate(formData.vDate, 'DD-MMM-YY') : '',
			);
			return;
		}
		setFormData((prev) => ({ ...prev, vDate: toISODate(rawText) }));
		setDateInputText(formattedDate);
	};

	const handleHeaderKeyDown = (event, nextElement) => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		nextElement?.focus?.();
	};

	const isExpenseFocused = (rowIndex, field) =>
		focusedExpenseCell === `${rowIndex}-${field}`;

	const FORMATTED_EXPENSE_FIELDS = new Set(['amount', 'tax', 'totalAmount']);

	const focusAndSelectExpense = (rowIndex, field) => {
		const doFocusSelect = () => {
			const el = expenseRefs.current[`${rowIndex}-${field}`];
			if (!el) return;
			el.focus();
			if (typeof el.select === 'function') el.select();
		};

		if (FORMATTED_EXPENSE_FIELDS.has(field)) {
			setFocusedExpenseCell(`${rowIndex}-${field}`);
			requestAnimationFrame(doFocusSelect);
		} else {
			doFocusSelect();
		}
	};

	/* Expenses Table refs */

	const handleExpenseKeyDown = (e, rowIndex, field) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();

		const expense = expenses[rowIndex];

		if (field === 'particular' && !expense.particular.trim()) {
			requestAnimationFrame(() => remarksRef.current?.focus());
			return;
		}

		const pos = EXPENSE_FIELDS.indexOf(field);
		const isLastField = pos === EXPENSE_FIELDS.length - 1;

		const nextRow = isLastField ? rowIndex + 1 : rowIndex;
		const nextField = isLastField ? EXPENSE_FIELDS[0] : EXPENSE_FIELDS[pos + 1];

		if (nextRow >= expenses.length) {
			setTimeout(() => focusAndSelectExpense(nextRow, nextField), 0);
			return;
		}

		focusAndSelectExpense(nextRow, nextField);
	};
	const updateRow = (rowIndex, key, value) =>
		setPurchaseItem((rows) =>
			rows.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r)),
		);

	const handleEndOfList = (rowIndex) => {
		const nextRowCount = Math.max(purchaseItem.length - 1, 1);

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
			// If a row shifts into the deleted row's position,
			// focus that row's Product Code.
			if (rowIndex < nextRowCount) {
				gridRefs.current[`${rowIndex}-0`]?.focus();
				return;
			}
			// The deleted row was the final row.
			// Focus GST of the previous row.
			if (rowIndex > 0) {
				setIsLast(true);
				setBottomView('expenses');
				setTimeout(() => {
					expenseRefs.current[`0-particular`]?.focus();
				}, 0);

				return;
			}

			// Fallback for unexpected situations.
			remarksRef.current?.focus();
		}, 0);
	};

	/* Helper for Conver format */
	// For amounts (rate, total) — comma grouped
	const formatCurrency = (value) => {
		const num = parseFloat(value);
		if (isNaN(num)) return '';
		return num.toLocaleString('en-NG', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	// For tax rate (%) — just fixed 2 decimals, no comma grouping needed
	const formatPercent = (value) => {
		const num = parseFloat(value);
		if (isNaN(num)) return '';
		return num.toFixed(2);
	};

	const unformatCurrency = (value) => value.replace(/[^0-9.-]/g, '');

	/* Helper for focused row  */
	const isFocused = (rowIndex, field) => focusedCell === `${rowIndex}-${field}`;

	const cellHandlers = (rowIndex, field, colIndex) => ({
		ref: (el) => (gridRefs.current[`${rowIndex}-${colIndex}`] = el),
		onKeyDown: (e) => handleGridKeyDown(e, rowIndex, colIndex),
		onFocus: () => {
			setFocusedCell(`${rowIndex}-${field}`);
		},
		onBlur: () => setFocusedCell(null),
		onChange: (e) =>
			updateRow(rowIndex, field, unformatCurrency(e.target.value)),
	});

	const focusAndSelect = (rowIndex, colIndex) => {
		const field = FORMATTED_COLS[colIndex];

		const doFocusSelect = () => {
			const el = gridRefs.current[`${rowIndex}-${colIndex}`];
			if (!el) return;
			el.focus();
			if (typeof el.select === 'function') {
				el.select(); // only text inputs/textareas have this
			}
		};

		if (field) {
			setFocusedCell(`${rowIndex}-${field}`);
			requestAnimationFrame(doFocusSelect);
		} else {
			doFocusSelect();
		}
	};

	/* Key Navigation for Table Cells */
	const handleGridKeyDown = (e, rowIndex, colIndex) => {
		if (e.key !== 'Enter') return;
		e.preventDefault();

		const pos = EDITABLE_COLS.indexOf(colIndex);
		const isLastEditable = pos === EDITABLE_COLS.length - 1;

		const nextRow = isLastEditable ? rowIndex + 1 : rowIndex;
		const nextCol = isLastEditable ? EDITABLE_COLS[0] : EDITABLE_COLS[pos + 1];

		if (nextRow >= purchaseItem.length) {
			setPurchaseItem((rows) => [
				...rows,
				emptyPurchaseRow(rows[rows.length - 1]?.gst ?? ''),
			]);
			setTimeout(() => focusAndSelect(nextRow, nextCol), 0);
			return;
		}
		focusAndSelect(nextRow, nextCol);
	};

	useEffect(() => {
		return () => {
			attachmentPreviews.forEach((attachment) => {
				URL.revokeObjectURL(attachment.previewUrl);
			});
		};
	}, [attachmentPreviews]);

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
			transport: formData.transport,
			transportGst: formData.transportGst,
			autoRound: formData.autoRound,
		});
	}, [
		purchaseItem,
		expenses,
		formData.taxMode,
		formData.taxType,
		formData.transport,
		formData.transportGst,
		formData.autoRound,
	]);

	const productOptions = item.map((product) => ({
		label: product.partNo,
		value: product.partNo,
		product,
	}));

	function updateExpense(id, field, value) {
		setExpenses((currentExpenses) =>
			currentExpenses.map((expense) => {
				if (expense.id !== id) {
					return expense;
				}

				return {
					...expense,
					[field]: field === 'totalAmount' ? Number(value) || 0 : value,
				};
			}),
		);
	}

	// const expenseTotals = useMemo(() => {
	// 	return expenses.reduce(
	// 		(result, expense) => {
	// 			const baseAmount = parseFloat(expense.amount) || 0;
	// 			const taxPercent =
	// 				taxMode === 'NONE' ? 0 : parseFloat(expense.tax) || 0;
	// 			const taxAmount = (baseAmount * taxPercent) / 100;

	// 			result.baseAmount += baseAmount;
	// 			result.taxAmount += taxAmount;
	// 			result.totalAmount += baseAmount + taxAmount;

	// 			return result;
	// 		},
	// 		{
	// 			baseAmount: 0,
	// 			taxAmount: 0,
	// 			totalAmount: 0,
	// 		},
	// 	);
	// }, [expenses, taxMode]);
	const expenseItems = useMemo(
		() => calculateExpenses(expenses, taxMode),
		[expenses, taxMode],
	);

	const expenseTotals = useMemo(() => {
		return expenseItems.reduce(
			(result, item) => {
				result.taxable += item.taxableAmount;
				result.tax += item.taxAmount;
				result.total += item.totalAmount;
				return result;
			},
			{ taxable: 0, tax: 0, total: 0 },
		);
	}, [expenseItems]);
	return (
		<div className="h-dvh w-full overflow-hidden bg-slate-200 p-1 box-border">
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xs border border-black bg-white shadow-md">
				{/* ============ HEADER ============ */}
				<header className="shrink-0 border-b border-slate-300 px-2 py-1 text-[13px]">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
						<div className="flex items-center gap-1">
							<label
								htmlFor="voucherNo"
								className="rounded-xs bg-blue-800 px-3 text-[12px] font-bold uppercase text-white w-22"
							>
								Purchase
							</label>
							<span className="ml-1 font-semibold text-slate-700 w-6">No</span>:
							<input
								ref={(el) => (headerRefs.current[0] = el)}
								id="voucherNo"
								type="text"
								autoComplete="off"
								value={formData.voucherNo}
								onChange={setField('voucherNo')}
								onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[1])}
								className={`${headerInput} w-28 sm:w-36`}
							/>
						</div>

						<div className="flex items-center gap-2">
							<label
								htmlFor="referenceNo"
								className="font-semibold text-slate-700 whitespace-nowrap w-16"
							>
								Ref No
							</label>
							:
							<input
								ref={(el) => (headerRefs.current[1] = el)}
								id="referenceNo"
								value={formData.referenceNo}
								onChange={setField('referenceNo')}
								onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[2])}
								className={`${headerInput} w-36 `}
							/>
						</div>

						<div className="flex items-center gap-2">
							<label
								htmlFor="referenceDate"
								className="font-semibold text-slate-700 whitespace-nowrap w-16"
							>
								Ref Date
							</label>
							:
							<input
								ref={(el) => (headerRefs.current[2] = el)}
								id="referenceDate"
								value={formData.referenceDate}
								onChange={setField('referenceDate')}
								onKeyDown={(e) => handleHeaderKeyDown(e, headerRefs.current[3])}
								className={`${headerInput} w-20 text-right`}
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

					<div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
						<div className="flex items-center gap-1 ">
							<label
								htmlFor="customerName"
								className="font-semibold text-slate-700 whitespace-nowrap w-30"
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
								onChange={setField('customerName')}
								onKeyDown={(e) =>
									handleHeaderKeyDown(e, gridRefs.current['0-0'])
								}
								className={`${headerInput} w-96.5 `}
							/>
						</div>
						<div className="flex  flex-1 items-center gap-2">
							<label
								htmlFor="Tax Mode"
								className="font-semibold text-slate-700 whitespace-nowrap w-16"
							>
								Tax Mode
							</label>
							:
							<input
								disabled
								id="taxmode"
								type="text"
								autoComplete="off"
								value={formData.taxMode}
								onChange={setField('taxmode')}
								onKeyDown={(e) =>
									handleHeaderKeyDown(e, gridRefs.current['0-0'])
								}
								className={`${headerInput} w-20 bg-slate-100 border-slate-100 cursor-not-allowed`}
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
									{taxMode.toLocaleLowerCase() === 'vat' ? 'VAT %' : 'GST % '}
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
													label: '♦ End of List',
													value: '__END_OF_LIST__',
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
												options={rowProductOptions}
												onKeyDown={(e) => handleGridKeyDown(e, rowIndex, 0)}
												placeholder="Select Product..."
												title="Products"
												value={
													productOptions.find(
														(option) => option.value === item.code,
													) || null
												}
												onChange={(selectedOption) => {
													if (!selectedOption) return;

													if (selectedOption?.isEndOfList) {
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
													if (selectedOption?.isEndOfList) return;

													setTimeout(() => {
														gridRefs.current[`${rowIndex}-1`]?.focus();
													}, 0);
												}}
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
												{...cellHandlers(rowIndex, 'qty', 1)}
												type="text"
												inputMode="decimal"
												value={
													isFocused(rowIndex, 'qty')
														? item.qty
														: formatCurrency(item.qty)
												}
												placeholder="0.00"
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
												placeholder=""
											/>
										</td>

										{/* Rate - col 2 */}
										<td className="border border-slate-300 bg-slate-50">
											<input
												{...cellHandlers(rowIndex, 'rate', 2)}
												type="text"
												inputMode="decimal"
												value={
													isFocused(rowIndex, 'rate')
														? item.rate
														: currencyFormatter(item.rate)
												}
												placeholder="0.00"
												// onBlur={(e)=> currencyFormatter(e.target.value)}
												className="w-full bg-transparent px-1.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
											/>
										</td>

										{/* Disc - col 3 */}
										<td className="border border-slate-300 bg-slate-50 ">
											<div className="flex pr-1">
												<input
													{...cellHandlers(rowIndex, 'disc', 3)}
													type="text"
													inputMode="decimal"
													value={
														isFocused(rowIndex, 'disc')
															? item.disc
															: formatPercent(item.disc)
													}
													placeholder="0.00"
													className="w-full bg-transparent px-1 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
												/>{' '}
												<span className="text-slate-500">%</span>
											</div>
										</td>

										{/* GST - col 4 (last editable) */}
										<td className="border border-slate-300 bg-slate-50 ">
											<div className="flex pr-1">
												<input
													{...cellHandlers(rowIndex, 'gst', 4)}
													type="text"
													inputMode="decimal"
													value={
														isFocused(rowIndex, 'gst')
															? item.gst
															: formatPercent(item.gst)
													}
													placeholder="0.00"
													className="w-full bg-transparent px-0.5 font-semibold text-slate-800 outline-none focus:bg-blue-100 text-right"
												/>{' '}
												<span className="text-slate-500">%</span>
											</div>
										</td>

										{/* Amount */}
										<td className="border border-slate-300 bg-slate-50 px-1.5 text-right font-bold tabular-nums">
											{currencyFormatter(
												calculatePurchaseRow(item, taxMode).taxable,
											)}
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
						setIsLast((v) => !v);
					}}
					aria-expanded={isLast}
					className="flex h-4.5 shrink-0 items-center justify-between border-t border-slate-400 bg-slate-200 px-2 text-[12px] font-semibold text-slate-700 outline-none focus:bg-amber-200 hover:bg-slate-300"
				>
					<span className="flex items-center gap-1">
						Add on Cost & Tax Breakup
					</span>
					{isLast ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
					<span className="tabular-nums">
						Grand Total:{' '}
						<b className="text-slate-900">
							{currencyFormatter(totals.taxable)}
						</b>
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
										onClick={() => setBottomView('expenses')}
										className={`h-4.5 border px-3 text-xs font-bold ${
											bottomView === 'expenses'
												? 'border-[#173a85] bg-[#173a85] text-white'
												: 'border-slate-400 bg-white text-slate-700 hover:bg-slate-100'
										}`}
									>
										Add On Cost
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
										{bottomView === 'tax'
											? taxMode.toLowerCase() === 'gst'
												? 'GST tax calculationtax slab'
												: taxMode.toLowerCase() === 'vat'
													? 'VAT tax calculation by tax slab'
													: ''
											: 'Additional expenses'}
									</span>
								</div>

								{/* Tax breakup view */}
								{bottomView === 'tax' && (
									<div className="overflow-auto border border-slate-300">
										<table className="w-full border-collapse tabular-nums">
											<thead className="bg-slate-200">
												<tr className="h-4.5">
													<th className="border border-slate-400 px-2 text-left">
														{formData.taxMode === 'VAT' ? 'VAT %' : 'GST %'}
													</th>

													<th className="border border-slate-400 px-2 text-right">
														Taxable
													</th>

													{formData.taxMode === 'VAT' && (
														<th className="border border-slate-400 px-2 text-right">
															VAT
														</th>
													)}

													{formData.taxMode === 'GST' &&
														formData.taxType === 'intra' && (
															<>
																<th className="border border-slate-400 px-2 text-right">
																	CGST
																</th>
																<th className="border border-slate-400 px-2 text-right">
																	SGST / UTGST
																</th>
															</>
														)}

													{formData.taxMode === 'GST' &&
														formData.taxType === 'inter' && (
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
																{currencyFormatter(slab.taxable)}
															</td>

															{formData.taxMode === 'VAT' && (
																<td className="border border-slate-300 px-2 text-right">
																	{currencyFormatter(slab.vat)}
																</td>
															)}

															{formData.taxMode === 'GST' &&
																formData.taxType === 'intra' && (
																	<>
																		<td className="border border-slate-300 px-2 text-right">
																			{currencyFormatter(slab.cgst)}
																		</td>

																		<td className="border border-slate-300 px-2 text-right">
																			{currencyFormatter(slab.sgst)}
																		</td>
																	</>
																)}

															{formData.taxMode === 'GST' &&
																formData.taxType === 'inter' && (
																	<td className="border border-slate-300 px-2 text-right">
																		{currencyFormatter(slab.igst)}
																	</td>
																)}

															<td className="border border-slate-300 px-2 text-right font-semibold">
																{currencyFormatter(slab.total)}
															</td>
														</tr>
													))
												)}
											</tbody>
											<tfoot>
												<tr className="bg-slate-200 font-bold">
													<td className="border border-slate-400 px-2">
														Total
													</td>

													<td className="border border-slate-400 px-2 text-right">
														{currencyFormatter(
															totals.slabs.reduce(
																(sum, slab) => sum + slab.taxable,
																0,
															),
														)}
													</td>

													{taxMode === 'VAT' && (
														<td className="border border-slate-400 px-2 text-right">
															{currencyFormatter(totals.vat)}
														</td>
													)}

													{taxMode === 'GST' && taxType === 'INTRA' && (
														<>
															<td className="border border-slate-400 px-2 text-right">
																{currencyFormatter(totals.cgst)}
															</td>

															<td className="border border-slate-400 px-2 text-right">
																{currencyFormatter(totals.sgst)}
															</td>
														</>
													)}

													{taxMode === 'GST' && taxType === 'INTER' && (
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

								{/* Expenses view */}
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

													<th className="w-40 border border-slate-500 px-2 text-right">
														Rate
													</th>
													<th className="w-40 border border-slate-500 px-2 text-right">
														Tax %
													</th>

													<th className="w-48 border border-slate-500 px-2 text-right">
														Amount
													</th>
												</tr>
											</thead>

											<tbody>
												{expenses.map((expense, index) => (
													<tr
														key={expense.id}
														className="h-4.5 bg-white hover:bg-blue-50"
													>
														<td className="border border-slate-500 px-1 text-center font-semibold">
															{index + 1}
														</td>

														<td className="border border-slate-500 p-0">
															<input
																ref={(el) =>
																	(expenseRefs.current[`${index}-particular`] =
																		el)
																}
																onKeyDown={(e) =>
																	handleExpenseKeyDown(e, index, 'particular')
																}
																value={expense.particular}
																onChange={(event) =>
																	updateExpense(
																		expense.id,
																		'particular',
																		event.target.value,
																	)
																}
																className="h-4.5 w-full bg-transparent px-1 outline-none focus:bg-[#fff9da]"
																placeholder=""
															/>
														</td>

														{/* AMOUNT */}
														<td className="border border-slate-500 p-0">
															<input
																ref={(el) =>
																	(expenseRefs.current[`${index}-amount`] = el)
																}
																onKeyDown={(e) =>
																	handleExpenseKeyDown(e, index, 'amount')
																}
																onFocus={() =>
																	setFocusedExpenseCell(`${index}-amount`)
																}
																onBlur={() => setFocusedExpenseCell(null)}
																type="text"
																inputMode="decimal"
																value={
																	isExpenseFocused(index, 'amount')
																		? expense.amount
																		: currencyFormatter(expense.amount)
																}
																onChange={(event) =>
																	updateExpense(
																		expense.id,
																		'amount',
																		unformatCurrency(event.target.value),
																	)
																}
																className="h-4.5 w-full bg-transparent px-1 text-right outline-none focus:bg-[#fff9da]"
																placeholder="0.00"
															/>
														</td>

														{/* TAX % */}
														<td className="border border-slate-500 p-0">
															<div className="flex pr-0.5">
																<input
																	ref={(el) =>
																		(expenseRefs.current[`${index}-tax`] = el)
																	}
																	onKeyDown={(e) =>
																		handleExpenseKeyDown(e, index, 'tax')
																	}
																	onFocus={() =>
																		setFocusedExpenseCell(`${index}-tax`)
																	}
																	onBlur={() => setFocusedExpenseCell(null)}
																	type="text"
																	inputMode="decimal"
																	value={
																		isExpenseFocused(index, 'tax')
																			? expense.tax
																			: formatPercent(expense.tax)
																	}
																	onChange={(event) =>
																		updateExpense(
																			expense.id,
																			'tax',
																			unformatCurrency(event.target.value),
																		)
																	}
																	className="h-4.5 w-full bg-transparent px-1 text-right outline-none focus:bg-[#fff9da]"
																	placeholder="0.00"
																/>{' '}
																%
															</div>
														</td>

														<td className="border border-slate-500 p-0">
															<input
																readOnly
																type="text"
																value={formatCurrency(
																	(parseFloat(expense.amount) || 0) +
																		((parseFloat(expense.amount) || 0) *
																			(parseFloat(expense.tax) || 0)) /
																			100,
																)}
																className="h-4.5 w-full bg-transparent px-1 text-right outline-none focus:bg-[#fff9da]"
																placeholder="0.00"
															/>
														</td>
													</tr>
												))}
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
														{currencyFormatter(expenseTotals.taxable)}
													</td>
													<td></td>

													<td className="border border-slate-500 px-2 text-right">
														{currencyFormatter(expenseTotals.total)}
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

							<Line label="Discount" value={-totals.discount} />

							<Line label="Add on & Others" value={totals.expenseAmount} />

							<Line label="Taxable Value" value={totals.taxable} />

							{formData.taxMode === 'VAT' && (
								<Line label="VAT" value={totals.vat} />
							)}

							{formData.taxMode === 'GST' && formData.taxType === 'intra' && (
								<>
									<Line label="CGST" value={totals.cgst} />
									<Line label="SGST / UTGST" value={totals.sgst} />
								</>
							)}

							{formData.taxMode === 'GST' && formData.taxType === 'inter' && (
								<Line label="IGST" value={totals.igst} />
							)}

							{formData.taxMode !== 'NONE' && (
								<Line label="Total Tax" value={totals.tax} />
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

								<span>
									{totals.roundOff > 0 ? '+' : ''}
									{formatCurrency(totals.roundOff)}
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
							onChange={setField('narration')}
							className={`${headerInput} w-36 sm:w-96`}
						/>
					</div>

					<div className="flex gap-4">
						<div className="flex items-center gap-1">
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
								className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800 outline-none hover:border-blue-600 hover:bg-blue-100 focus-visible:ring-1 focus-visible:ring-blue-400"
							>
								<Paperclip size={12} />
								Attach File
								{attachments.length > 0 && (
									<span className="ml-0.5 rounded-full bg-blue-800 px-1.5 text-[10px] text-white">
										{attachments.length}
									</span>
								)}
							</button>

							{attachmentPreviews.length > 0 && (
								<button
									type="button"
									onClick={() => setShowPreview((s) => !s)}
									className="flex h-5 items-center gap-1 rounded border border-blue-400 bg-blue-50 px-2 font-semibold text-blue-800 outline-none hover:border-blue-600 hover:bg-blue-100 focus-visible:ring-1 focus-visible:ring-blue-400"
								>
									{showPreview ? (
										<>
											<EyeOff size={12} />
											Hide
										</>
									) : (
										<>
											<Eye size={12} />
											view
										</>
									)}
								</button>
							)}
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
								onChange={setField('createdBy')}
								className={`${headerInput} w-32 sm:w-44`}
							/>
						</div>

						{/* <div className="flex items-center gap-2">
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
								onChange={setField('approvedBy')}
								className={`${headerInput} w-32 sm:w-44`}
							/>
						</div> */}

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
				{showPreview && attachments.length > 0 && (
					<section className="shrink-0 border-t border-slate-300 bg-slate-50 px-2 py-1">
						<div className="mb-1 text-xs font-bold text-slate-700">
							Attached Documents
						</div>

						<div className="flex flex-wrap gap-2">
							{attachmentPreviews.map((attachment) => {
								const isImage = attachment.type.startsWith('image/');
								const isPdf = attachment.type === 'application/pdf';

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

			{previewFile && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
					<div className="flex h-[95vh] w-full max-w-5xl flex-col bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-300 px-3">
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
									className="rounded border border-slate-400 px-3 text-sm font-semibold hover:bg-slate-100"
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
										This file type cannot be previewed inside the application.
									</p>

									<p className="text-xs text-slate-500">
										Use Open to view or download the document.
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
};

export default Purchase;
