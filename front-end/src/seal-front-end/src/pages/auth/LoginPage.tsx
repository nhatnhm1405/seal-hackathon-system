import { Link, useNavigate } from 'react-router-dom'

const LoginPage = () => {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface to-primary-fixed/40 p-4">
            <main className="w-full max-w-[420px] bg-surface-container-lowest rounded-xl shadow-xl border border-surface-variant p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
                <div className="flex flex-col items-center mb-8">
                    <Link to="/" className="text-2xl font-headline font-black tracking-tighter text-primary">SEAL</Link>
                </div>
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                    <p className="text-sm text-on-surface-variant">Sign in to your academic hackathon dashboard.</p>
                </div>
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); navigate('/profile') }}>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Email Address</label>
                        <input
                            className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="name@university.edu"
                            type="email"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1">Password</label>
                        <input
                            className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            placeholder="••••••••"
                            type="password"
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="flex items-center text-sm gap-2">
                            <input type="checkbox" /> Remember me
                        </label>
                        <Link to="/recovery" className="text-sm font-semibold text-primary">Forgot password?</Link>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors"
                    >
                        Sign In <span className="material-symbols-outlined">login</span>
                    </button>
                </form>
                <div className="mt-8 pt-6 border-t text-center">
                    <p className="text-sm text-on-surface-variant">
                        Don't have an account?{' '}
                        <Link to="/register" className="font-bold text-primary">Register here</Link>
                    </p>
                </div>
            </main>
        </div>
    )
}

export default LoginPage