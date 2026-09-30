import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getPurchases } from '../api/purchaseApi';

/* ---------- sample data (replace with your API data via the `vouchers` prop) ---------- */
const SAMPLE = [
	{
		id: 1,
		date: '2026-09-01',
		party: 'Sri Murugan Traders',
		voucherNo: 'PUR/26-27/0141',
		type: 'Purchase',
		amount: 48250.0,
		status: 'Approved',
	},
	{
		id: 2,
		date: '2026-09-02',
		party: 'Kaveri Agencies',
		voucherNo: 'PUR/26-27/0142',
		type: 'Purchase',
		amount: 12980.5,
		status: 'Pending',
	},
	{
		id: 3,
		date: '2026-09-04',
		party: 'Annapoorna Wholesale',
		voucherNo: 'PUR/26-27/0143',
		type: 'Purchase',
		amount: 76400.0,
		status: 'Approved',
	},
	{
		id: 4,
		date: '2026-09-06',
		party: 'Balaji Electricals',
		voucherNo: 'PRT/26-27/0021',
		type: 'Purchase',
		amount: 5320.0,
		status: 'Approved',
	},
	{
		id: 5,
		date: '2026-09-09',
		party: 'Vellore Steel Mart',
		voucherNo: 'PUR/26-27/0144',
		type: 'Purchase',
		amount: 154900.75,
		status: 'Pending',
	},
	{
		id: 6,
		date: '2026-09-12',
		party: 'Global Packaging Co.',
		voucherNo: 'IMP/26-27/0008',
		type: 'Purchase',
		amount: 231000.0,
		status: 'Pending',
	},
	{
		id: 7,
		date: '2026-09-15',
		party: 'Lakshmi Hardware',
		voucherNo: 'PUR/26-27/0145',
		type: 'Purchase',
		amount: 9875.0,
		status: 'Approved',
	},
	{
		id: 8,
		date: '2026-09-18',
		party: 'Sri Murugan Traders',
		voucherNo: 'PUR/26-27/0146',
		type: 'Purchase',
		amount: 33210.0,
		status: 'Approved',
	},
	{
		id: 9,
		date: '2026-09-22',
		party: 'Kaveri Agencies',
		voucherNo: 'PRT/26-27/0022',
		type: 'Purchase',
		amount: 2450.0,
		status: 'Pending',
	},
	{
		id: 10,
		date: '2026-09-26',
		party: 'Annapoorna Wholesale',
		voucherNo: 'PUR/26-27/0147',
		type: 'Purchase',
		amount: 68120.25,
		status: 'Pending',
	},
	{
		id: 11,
		date: '2026-09-29',
		party: 'Balaji Electricals',
		voucherNo: 'PUR/26-27/0148',
		type: 'Purchase',
		amount: 18640.0,
		status: 'Approved',
	},
];

/* ---------- helpers ---------- */
const inr = new Intl.NumberFormat('en-IN', {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});
const fmtDate = (iso) => {
	const [y, m, d] = iso.split('-');
	return `${d}-${m}-${y}`;
};
const toISO = (d) =>
	new Date(d.getTime() - d.getTimezoneOffset() * 60000)
		.toISOString()
		.slice(0, 10);

const STATUS_TABS = ['All', 'Pending', 'Approved'];

const STATUS_STYLE = {
	Approved: {
		dot: 'bg-emerald-500',
		text: 'text-emerald-700',
		bg: 'bg-emerald-50',
	},
	Pending: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
};

function StatusBadge({ status }) {
	const s = STATUS_STYLE[status] || {
		dot: 'bg-neutral-400',
		text: 'text-neutral-600',
		bg: 'bg-neutral-100',
	};
	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full px-1.5  text-xs font-medium ${s.text}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
			{status}
		</span>
	);
}

/* ---------- component ---------- */
const Dashboard = ({ vouchers = SAMPLE, onRowClick }) => {
	const today = new Date();
	const [from, setFrom] = useState(
		toISO(new Date(today.getFullYear(), today.getMonth(), 1)),
	);
	const [to, setTo] = useState(toISO(today));
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState('All');
	const username = useAppStore((s) => s.username);

	const { setPurchases, setLoading, setError } = useAppStore.getState();

	// date range + search first, so the tab counts reflect what you'd see under each tab
	const base = useMemo(() => {
		const q = query.trim().toLowerCase();
		return vouchers.filter((v) => {
			if (from && v.date < from) return false;
			if (to && v.date > to) return false;
			if (!q) return true;
			return (
				v.party.toLowerCase().includes(q) ||
				v.voucherNo.toLowerCase().includes(q) ||
				v.type.toLowerCase().includes(q)
			);
		});
	}, [vouchers, from, to, query]);

	const counts = useMemo(
		() => ({
			All: base.length,
			Pending: base.filter((v) => v.status === 'Pending').length,
			Approved: base.filter((v) => v.status === 'Approved').length,
		}),
		[base],
	);

	const rows = useMemo(
		() => (status === 'All' ? base : base.filter((v) => v.status === status)),
		[base, status],
	);

	const total = useMemo(
		() => rows.reduce((sum, v) => sum + v.amount, 0),
		[rows],
	);

	const inputCls =
		'h-6 rounded-md border border-red-200 bg-white px-2.5 text-sm text-neutral-800 outline-none transition' +
		' placeholder:text-neutral-400 focus:border-red-400 focus:ring-1 focus:ring-red-300';

	useEffect(() => {
		if (!username) return;
		let ignore = false;

		setLoading(true);
		setError(null);

		getPurchases({ supplier: 'ABC Private Ltd', fromDate: from, toDate: to })
			.then((data) => {
				if (!ignore) setPurchases(data);
			})
			.catch((err) => {
				if (!ignore) setError(err.response?.data?.message || err.message);
			})
			.finally(() => {
				if (!ignore) setLoading(false);
			});

		return () => {
			ignore = true; // response from an old range is thrown away
		};
	}, [username, from, to]);

	return (
		<div className="flex h-screen flex-col bg-neutral-50 text-neutral-800">
			{/* Header + filters */}
			<header className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
				<div className="mb-3 flex items-baseline justify-between">
					<h1 className="text-lg font-semibold tracking-tight">Purchase</h1>
					<span className="text-xs text-neutral-500">
						{rows.length} {rows.length === 1 ? 'voucher' : 'vouchers'}
					</span>
				</div>

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
							<span className="text-xs text-neutral-400">to</span>
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
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search party, voucher no."
								className={`${inputCls} w-full pl-8 pr-7`}
							/>
							{query && (
								<button
									type="button"
									onClick={() => setQuery('')}
									aria-label="Clear search"
									className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
								>
									<svg
										className="h-3.5 w-3.5"
										viewBox="0 0 20 20"
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

					{/* Status segmented control */}
					<div
						role="tablist"
						aria-label="Status"
						className="inline-flex self-start rounded-lg bg-neutral-100 p-0.5"
					>
						{STATUS_TABS.map((t) => {
							const active = status === t;
							return (
								<button
									key={t}
									role="tab"
									aria-selected={active}
									onClick={() => setStatus(t)}
									className={`flex h-6 items-center gap-1.5 rounded-md px-3 text-sm transition ${
										active
											? 'bg-white font-medium text-neutral-900 shadow-sm'
											: 'text-neutral-500 hover:text-neutral-800'
									}`}
								>
									{t}
									<span
										className={`text-xs tabular-nums ${active ? 'text-neutral-500' : 'text-neutral-400'}`}
									>
										{counts[t]}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</header>

			{/* Table */}
			<main className="min-h-0 flex-1 py-1 sm:px-2">
				<div className="flex h-full flex-col overflow-hidden rounded border border-red-200 bg-white">
					<div className="min-h-0 flex-1 overflow-auto">
						<table className="w-full min-w-[780px] border-collapse text-[12px]">
							<thead className="sticky top-0 z-10 bg-[#DC143C]">
								<tr className="border-b border-red-200 text-left text-xs font-medium text-white">
									<th className="w-14 px-4 py-1">S.No</th>
									<th className="w-28 px-4 py-1">Date</th>
									<th className="px-4 py-1">Supplier name</th>
									<th className="px-4 py-1">Voucher no.</th>
									<th className="px-4 py-1">Reference No</th>
									<th className="px-4 py-1">Reference Date</th>
									<th className="w-32 px-4 py-1">Status</th>
									<th className="px-4 py-1 text-right">Amount (₹)</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((v, i) => (
									<tr
										key={v.id}
										onClick={() => onRowClick?.(v)}
										className={`border-b border-red-200 transition-colors hover:bg-neutral-100 ${
											onRowClick ? 'cursor-pointer' : ''
										}`}
									>
										<td className="first:border-0 border border-red-200 px-4 py-0 tabular-nums text-neutral-400">
											{i + 1}
										</td>
										<td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
											{fmtDate(v.date)}
										</td>
										<td className="border border-red-200 px-4 py-0 font-medium text-neutral-900">
											{v.party}
										</td>
										<td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
											{v.voucherNo}
										</td>
										<td className="border border-red-200 px-4 py-0 text-neutral-600">
											{v.voucherNo}
										</td>

										<td className="border border-red-200 px-4 py-0 tabular-nums text-neutral-600">
											{fmtDate(v.date)}
										</td>
										<td className="border border-red-200 px-4 py-0">
											<StatusBadge status={v.status} />
										</td>

										<td className="last:border-0 border border-red-200 px-4 py-0 text-right font-medium tabular-nums text-neutral-900">
											₹ {inr.format(v.amount)}
										</td>
									</tr>
								))}
							</tbody>
						</table>

						{rows.length === 0 && (
							<div className="flex flex-col items-center gap-1 py-16 text-center">
								<p className="text-sm font-medium text-neutral-700">
									No vouchers found
								</p>
								<p className="text-xs text-neutral-500">
									Change the date range, clear the search, or switch the status.
								</p>
							</div>
						)}
					</div>

					{/* Footer total */}
					<div className="flex items-center justify-between border-t border-neutral-200 bg-red-50 px-4 py-1 text-sm">
						<span className="text-neutral-500">Total</span>
						<span className="font-semibold tabular-nums text-neutral-900">
							₹ {inr.format(total)}
						</span>
					</div>
				</div>
			</main>
		</div>
	);
};
export default Dashboard;
