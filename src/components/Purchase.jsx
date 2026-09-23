import { useEffect, useRef, useState } from 'react';
import Title from '../../utils/Title';
import SelectArea from '../../utils/SelectArea';
import VoucherSub from '../../utils/VoucherSub';
import axios from "../../utils/axios";
import { listOfStockItems } from '../../components/services/MasterService';
import HeaderType3 from '../../utils/HeaderType3';

const Purchase = () => {
	const [showProduct, setShowProduct] = useState(false);
	const [showSubForm, setShowSubForm] = useState(false);
	const [tableData, setTableData] = useState([
		{
			productCode: '',
			description: '',
			hsn: '',
			gst: '',
			dueOn: '',
			quantity: '',
			rate: '',
			uom: '',
			discount: '',
			amount: '',
			allocation: [
				{
					dueOn: '',
					location: '♦ Any',
					batchNo: '♦ Any',
					quantity: '',
					rate: '',
					uom: '',
					discount: '',
					amount: '',
				},
			],
		},
	]);
	const tableRefs = useRef([]);
	const inputRefs = useRef([]);
	const [selectionItem, setSelectionItem] = useState('');
	const [headerData, setHeaderData] = useState({
		customerName: '',
		voucherNo: '1',
		voucherDate: '',
        voucherType: '',
	});
	const [narration, setNarration] = useState('');
	const [stockItem, setStockItem] = useState([]);
	const [selectedProduct, setSelectedProduct] = useState(0);
	const [focusedRow, setFocusedRow] = useState(null);
	const [filteredStockItem, setFilterdStockItem] = useState(stockItem);
	const display =
		tableData.length > 1
			? [{ stockItemName: '♦ End of List' }, ...filteredStockItem]
			: filteredStockItem;
	const [totalQuantity, setTotalQuantity] = useState('');
	const [totalAmount, setTotalAmount] = useState('');

	const handleInputChange = (e, rowIndex) => {
		const { value, name } = e.target;
		const updatedData = [...tableData];
		updatedData[rowIndex][name] = value;
		setTableData(updatedData);
		if (name === 'productCode') {
			const selectedProductItem = stockItem.filter((item) =>
				item.stockItemCode.includes(value)
			);
			setFilterdStockItem(selectedProductItem);
		}
	};
	const handleKeyDown = (e, rowIndex, colIndex) => {
		if (e.key === 'Enter' && e.target.value.trim() !== '') {
			e.preventDefault();
			const nextCell = rowIndex * 2 + colIndex + 1;
			//usually focus next cell index
			if (nextCell < tableRefs.current.length && tableRefs.current[nextCell]) {
				tableRefs.current[nextCell]?.focus();
				tableRefs.current[nextCell].setSelectionRange(0, 0);
			} else {
				// add new row when reach last row
				if (rowIndex === tableData.length - 1) {
					addRow();
				} else {
					tableRefs.current[(rowIndex + 1) * 2]?.focus();
					tableRefs.current[(rowIndex + 1) * 2].setSelectionRange(0, 0);
				}
			}
		} else if (e.key === 'Backspace') {
			const prevCell = rowIndex * 2 + colIndex - 1;
			if (prevCell >= 0 && prevCell < tableRefs.current.length) {
				e.preventDefault();
				tableRefs.current[prevCell]?.focus();
				tableRefs.current[prevCell].setSelectionRange(0, 0);
			}
		}
	};
	const addRow = () => {
		setTableData((prev) => [
			...prev,
			{
				productCode: '',
				description: '',
				dueOn: '',
				quantity: '',
				rate: '',
				uom: '',
				discount: '',
				amount: '',
				allocation: [
					{
						dueOn: '',
						location: '',
						batchNo: '♦ Any',
						quantity: '',
						rate: '',
						uom: '',
						discount: '',
						amount: '',
					},
				],
			},
		]);
		setTimeout(() => {
			const rowIndex = tableData.length;
			tableRefs.current[rowIndex * 2]?.focus();
		}, 0);
		setFilterdStockItem(stockItem);
	};
	const handleFormSubmit = async () => {
		const customerName = headerData.customerName;
		const voucherNo = headerData.voucherNo;
		const voucherDate = headerData.voucherDate;
		const orderItem = tableData.map((item) => ({
			productCode: item.productCode,
			description: item.description,
			dueDate: item.dueOn,
			quantity: item.quantity,
			rate: item.rate,
			uom: item.uom,
			discount: item.discount,
			amount: item.amount,
			batchWiseItem: item.allocation.map((batch) => ({
				dueDate: batch.dueOn,
				location: batch.location,
				batchNo: batch.batchNo,
				quantity: batch.quantity,
				rate: batch.rate,
				uom: batch.uom,
				discount: batch.discount,
				amount: batch.amount,
			})),
		}));
		const data = {
			customerName,
			voucherNo,
			voucherDate,
			orderItem,
			narration,
		};
		await axios.post('/transact/save', data);
	};
	const handleSelect = (e, item, rowIndex) => {
		if (selectedProduct < display.length) {
			if (e.key === 'ArrowUp' && selectedProduct > 0) {
				setSelectedProduct((prev) => prev - 1);
			} else if (
				e.key === 'ArrowDown' &&
				selectedProduct < display.length - 1
			) {
				setSelectedProduct((prev) => prev + 1);
			} else if (e.key === 'Enter' && selectedProduct >= 0) {
				onSelected(e, item[selectedProduct], rowIndex);
				// tableRefs.current[0].focus();
			} else if (e.key === 'Backspace') {
				if (e.target.value !== '') {
					return;
				} else {
					if (rowIndex > 0) {
						const prevRowIndex = rowIndex - 1;
						const prevRow = prevRowIndex * 2 + 1;
						e.preventDefault();
						tableRefs.current[prevRow]?.focus();
					} else {
						e.preventDefault();
						inputRefs.current[0]?.focus();
						inputRefs.current[0].setSelectionRange(0, 0);
					}
				}
			}
		}
	};
	const onSelected = (e, item, rowIndex) => {
		const updatedTable = [...tableData];
		updatedTable[rowIndex].productCode = item.stockItemCode;
		setSelectionItem(item.stockItemName);
		if (item.stockItemName !== '♦ End of List') {
			setShowSubForm(true);
		} else {
			setShowSubForm(false);
			e.preventDefault();
			inputRefs.current[2]?.focus();
			const updated = tableData.filter((_, index) => index !== rowIndex);
			setTableData(updated);
			setSelectedProduct(1);
			setShowProduct(false);
		}
	};
	const afterAllocation = (row) => {
		setTimeout(() => {
			tableRefs.current[row * 2 + 1]?.focus();
		}, 0);
	};
	const handleFocus = (value) => {
		setShowProduct(true);
		// Reset the filtered list to the full stock item list
		setFilterdStockItem(filteredStockItem); // Use the new display array
		if (value) {
			// Find the index based on `stockItemCode`
			const index = display.findIndex(
				(item) =>
					item.stockItemName !== '♦ End of List' && // Exclude "End of List"
					item.stockItemCode.toLowerCase().includes(value.toLowerCase()) // Ensure case-insensitive matching
			);
			setSelectedProduct(index !== -1 ? index : 0); // Set selected product index
		} else {
			setSelectedProduct(0); // Default to first item if no value
		}
	};
	const handleTotalQty = () => {
		const qty = tableData.reduce((sum, alloc) => {
			const num =
				typeof alloc.quantity === 'number'
					? alloc.quantity
					: parseFloat(alloc.quantity.replace(/,/g, '')) || 0;
			return sum + num;
		}, 0);
		if (!isNaN(qty)) {
			setTotalQuantity(parseFloat(qty).toFixed(2));
		}
	};
	const handleTotalAmount = () => {
		const amt = tableData.reduce(
			(sum, alloc) => sum + parseFloat(alloc.amount),
			0
		);
		if (!isNaN(amt)) setTotalAmount(parseFloat(amt).toFixed(2));
	};
	useEffect(() => {
		handleTotalQty();
		handleTotalAmount();
		tableRefs.current = tableRefs.current.filter((ref) => ref !== null);
	}, [tableData]);
	useEffect(() => {
		loadStock();
	}, []);
	const loadStock = async () => {
		const result = await listOfStockItems();
		setStockItem(result.data);
    setFilterdStockItem(result.data)
	};
	

	return (
		<>
			<div className="bg-emerald-100 w-full h-[580px]">
				<Title title="Accounting Voucher Creation" nav="/" />
				<form
					action=""
					className="relative"
					onSubmit={(e) => e.preventDefault()}
				>
					<HeaderType3
						title="Purchase"
						inputRefs={inputRefs}
						data={headerData}
						setData={setHeaderData}
						tableRefs={tableRefs}
					/>
					<div className="h-[403px] overflow-auto">
						<table className="w-full">
							<thead className=" bg-[#F9F3CC] text-[12px] border border-slate-300 font-semibold sticky top-0">
								<tr className="h-[17px] leading-4 border border-slate-300">
									<th className="w-[45px] text-center border border-slate-300">
										S.No
									</th>
									<th className="w-[100px] text-center border border-slate-300">
										Product Code
									</th>
									<th className="w-[420px] text-center border border-slate-300">
										Product Description
									</th>
									<th className="w-[100px] text-center border border-slate-300">
										HSN
									</th>
									<th className="w-[100px] text-center border border-slate-300">
										GST
									</th>
									<th className="w-[60px] text-center border border-slate-300">
										Due on
									</th>
									<th className="w-[70px] text-center border border-slate-300">
										Quantity
									</th>
									<th className="w-[90px] text-right border border-slate-300">
										Rate
									</th>
									<th className="w-[50px] text-center border border-slate-300">
										Per
									</th>
									<th className="w-[70px] text-center border border-slate-300">
										Discount
									</th>
									<th className="w-[70px] text-center border border-slate-300">
										Tax %
									</th>
									<th className="w-[103px] text-right border border-slate-300">
										Amount
									</th>
								</tr>
							</thead>
							<tbody>
								{tableData.map((item, rowIndex) => (
									<tr
										className=" text-[13px] h-[17px] leading-4"
										key={rowIndex}
									>
										<td className="text-center border border-slate-300 bg-white">
											{rowIndex + 1}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											<input
												ref={(input) =>
													(tableRefs.current[rowIndex * 2 + 0] = input)
												}
												onChange={(e) => handleInputChange(e, rowIndex)}
												type="text"
												className="w-full outline-0 focus:bg-amber-300"
												name="productCode"
												value={item.productCode}
												onKeyDown={(e) => handleSelect(e, display, rowIndex)}
												onFocus={(e) => {
													handleFocus(e.target.value)
													setFocusedRow(rowIndex);
												}}
												onBlur={() => setShowProduct(false)}
											/>
											{showProduct && (
												<SelectArea
													title="List of Stock Items"
													data={display}
													selectIndex={selectedProduct}
													onHandle={onSelected}
													extraParams={rowIndex}
												/>
											)}
										</td>

										<td className=" border border-slate-300 bg-white">
											{/* <input
											onChange={(e) => handleInputChange(e, rowIndex)}
											type="text"
											className="w-full outline-0"
											name="description"
											value={item.description}
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 1] = input)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
										/> */}
											{item.description}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{item.hsn}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{item.gst ? item.gst + ' %' : ''}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{/* <input
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 2] = input)
											}
											onChange={(e) => handleInputChange(e, rowIndex)}
											type="text"
											className="w-full outline-0 text-center"
											name="dueOn"
											value={item.dueOn}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
										/> */}
											{item.dueOn}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{/* <input
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 3] = input)
											}
											onChange={(e) => handleInputChange(e, rowIndex)}
											className="w-full outline-0 text-right"
											type="text"
											name="quantity"
											value={item.quantity}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
										/> */}
											{item.quantity}
										</td>
										<td className="text-right border border-slate-300 bg-white">
											{/* <input
											onChange={(e) => handleInputChange(e, rowIndex)}
											className="w-full outline-0 text-right"
											type="text"
											name="rate"
											value={item.rate}
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 4] = input)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 4)}
										/> */}
											{item.rate}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{/* <input
											onChange={(e) => handleInputChange(e, rowIndex)}
											className="w-full outline-0"
											type="text"
											name="uom"
											value={item.uom}
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 5] = input)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 5)}
										/> */}
											{item.uom}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{/* <input
											onChange={(e) => handleInputChange(e, rowIndex)}
											className="w-full outline-0"
											type="text"
											name="discount"
											value={item.discount}
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 6] = input)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 6)}
										/> */}
											{item.discount ? item.discount + ' %' : ''}
										</td>
										<td className="text-center border border-slate-300 bg-white">
											{/* <input
											onChange={(e) => handleInputChange(e, rowIndex)}
											className="w-full outline-0"
											type="text"
											name="tax"
											value={item.tax}
											ref={(input) =>
												(tableRefs.current[rowIndex * 9 + 7] = input)
											}
											onKeyDown={(e) => handleKeyDown(e, rowIndex, 7)}
										/> */}
											{item.tax ? item.tax + ' %' : ''}
										</td>
										<td className=" border border-slate-300 bg-white cursor-default">
											<input
												onChange={(e) => handleInputChange(e, rowIndex)}
												className="w-full outline-0 text-right focus:bg-amber-300"
												type="text"
												name="amount"
												value={item.amount}
												ref={(input) =>
													(tableRefs.current[rowIndex * 2 + 1] = input)
												}
												onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
												readOnly
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{showSubForm && (
							<VoucherSub
								isClose={setShowSubForm}
								selectionItem={selectionItem}
								orderData={tableData}
								setOrderData={setTableData}
								allocation={tableData[focusedRow].allocation}
								row={focusedRow}
								afterAllocation={afterAllocation}
							/>
						)}
					</div>
					<div className="w-full flex justify-end">
						<div className=" border-t border-b border-slate-400 h-[22px] w-[470px] flex items-center justify-between">
							<span className="w-20 text-right text-[14px] font-semibold">
								{totalQuantity !== '0.00' ? totalQuantity : ''}
							</span>
							<span className="w-20 text-right text-[14px] font-semibold">
								{totalAmount !== '0.00' ? totalAmount : ''}
							</span>
						</div>
					</div>
					<div className="flex justify-between ">
						<div className=" flex flex-col">
							<label htmlFor="narration" className="text-[14px] pl-1">
								Narration :
							</label>
							<textarea
								// type="text"
								ref={(el) => (inputRefs.current[2] = el)}
								name="narration"
								value={narration}
								onChange={(e) => setNarration(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										const confirmed = window.confirm('Do you want Confirm...');
										if (confirmed) {
											handleFormSubmit();
										}
									} else if (e.key === 'Backspace') {
										if (inputRefs.current[2].value === '') {
											console.log();
										}
									}
								}}
								className="h-[36px] text-[13px] resize-none focus:bg-[#fee8af] overflow-hidden outline-0 focus:border focus:border-blue-400 w-[700px] bg-transparent"
								rows={1}
							/>
						</div>
					</div>
				</form>
			</div>
		</>
	);
};
export default Purchase;
