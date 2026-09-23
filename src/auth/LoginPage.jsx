import { useState } from 'react';
import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	Eye,
	EyeOff,
	Lock,
	Package,
	ShoppingBag,
	User,
} from 'lucide-react';

const initialCredentials = { username: '', password: '' };

  const LoginPage = () => {
	const [credentials, setCredentials] = useState(initialCredentials);
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleChange = ({ target: { name, value } }) => {
		setCredentials((previous) => ({ ...previous, [name]: value }));
		if (error) setError('');
	};

	const handleLogin = async (event) => {
		event.preventDefault();
		const username = credentials.username.trim();
		const password = credentials.password.trim();

		if (!username || !password) {
			setError('Please enter your username and password.');
			return;
		}

		setLoading(true);

		try {
			// Replace this delay with your real authentication API call.
			await new Promise((resolve) => setTimeout(resolve, 800));

			sessionStorage.setItem('po_user_token', 'mock-jwt-token');
			sessionStorage.setItem('po_username', username);

			if (rememberMe) {
				localStorage.setItem('po_remembered_username', username);
			} else {
				localStorage.removeItem('po_remembered_username');
			}
		} catch {
			setError('Invalid credentials. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
			<div className="relative z-10 w-full max-w-4xl min-h-130 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2">

				<section className="bg-linear-to-br from-slate-50 via-sky-50 to-blue-50 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
					<div>
						<div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-blue-700 bg-blue-100/80 border border-blue-200 px-3 py-1 rounded-full">
							<ShoppingBag className="w-3.5 h-3.5" />
							Crown Pack
						</div>

						<h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4 text-slate-900">
							Supplier Portal
						</h1>
						<p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed max-w-sm">
							Manage purchase, approvals, requisitions, and supplier invoices in
							one place.
						</p>
					</div>

					<div className="flex justify-center py-8">
						<div className="relative w-56 h-48">
							<div className="absolute inset-x-3 bottom-3 h-20 bg-blue-100 border border-blue-200 rounded-3xl rotate-[-8deg]" />
							<div className="absolute left-8 top-4 w-40 h-40 bg-white border-2 border-blue-500 rounded-xl shadow-lg p-3">
								<div className="h-6 bg-linear-to-r from-blue-600 to-sky-500 rounded mb-4" />
								<div className="space-y-3">
									{[1, 2, 3].map((item) => (
										<div key={item} className="flex gap-2">
											<div className="h-2 bg-slate-200 rounded flex-1" />
											<div className="h-2 w-7 bg-blue-500 rounded" />
										</div>
									))}
								</div>
								<div className="mt-6 border-t border-slate-200 pt-2 flex justify-between">
									<div className="h-2.5 w-10 bg-slate-100 rounded" />
									<div className="h-2.5 w-12 bg-blue-600 rounded" />
								</div>
							</div>
							<div className="absolute right-2 top-0 w-12 h-12 rounded-full bg-blue-600 border-4 border-sky-300 flex items-center justify-center shadow-lg">
								<CheckCircle className="w-6 h-6 text-white" />
							</div>
							<div className="absolute left-0 bottom-0 w-14 h-12 bg-blue-600 rounded-lg rotate-[-8deg] shadow-md flex items-center justify-center">
								<Package className="w-7 h-7 text-white" />
							</div>
						</div>
					</div>

					<div className="text-[10px] text-slate-500 border-t border-slate-200 pt-3 flex items-center justify-between gap-3">
						<span>
							Powered by{' '}
							<strong className="text-slate-800">
								Cloud 9 Soft Technologies
							</strong>
						</span>
						{/* <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> SSL Secured
              </span> */}
					</div>
				</section>

				<section className="p-8 sm:p-10 flex flex-col justify-center">
					<div className="mb-5">
						<h2 className="text-2xl font-bold text-slate-900">User Sign In</h2>
						<p className="text-xs sm:text-sm text-slate-500 mt-1">
							Enter your credentials to access your workspace.
						</p>
					</div>

					{error && (
						<div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center gap-2">
							<AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
							{error}
						</div>
					)}

					<form onSubmit={handleLogin} className="flex flex-col gap-3.5">
						<div>
							<label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
								Email
							</label>
							<div className="relative">
								<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
								<input
									type="text"
									name="username"
									value={credentials.username}
									onChange={handleChange}
									placeholder="e.g. po_user@company.com"
									autoComplete="username"
									required
									className="h-9 w-full pl-9 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
								/>
							</div>
						</div>

						<div>
							<div className="flex justify-between items-center mb-1">
								<label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
									Password
								</label>
								<button
									type="button"
									onClick={() =>
										alert(
											'Please contact your administrator to reset your password.',
										)
									}
									className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
								>
									Forgot password?
								</button>
							</div>

							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
								<input
									type={showPassword ? 'text' : 'password'}
									name="password"
									value={credentials.password}
									onChange={handleChange}
									placeholder="••••••••••••"
									autoComplete="current-password"
									required
									className="h-9 w-full pl-9 pr-9 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((previous) => !previous)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
								>
									{showPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>

						<label className="flex items-center gap-2 cursor-pointer pt-0.5">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={(event) => setRememberMe(event.target.checked)}
								className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
							/>
							<span className="text-[11px] text-slate-600">
								Remember session
							</span>
						</label>

						<button
							type="submit"
							disabled={loading}
							className="h-9 mt-1 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
						>
							{loading ? (
								<>
									<span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Signing in...
								</>
							) : (
								<>
									Sign In <ArrowRight className="w-4 h-4" />
								</>
							)}
						</button>
					</form>

					<div className="mt-5 pt-3 border-t border-slate-100 text-center">
						<p className="text-[10px] text-slate-400">
							Need support? Contact PO desk at{' '}
							<a
								href="mailto:support@cloud9soft.com"
								className="text-slate-600 font-medium hover:underline"
							>
								support@cloud9soft.com
							</a>
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
export default LoginPage;