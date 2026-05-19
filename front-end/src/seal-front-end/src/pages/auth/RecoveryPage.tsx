import { Link } from 'react-router-dom'

const RecoveryPage = () => (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <header className="absolute top-0 left-0 w-full p-8 text-3xl font-black text-primary font-headline">SEAL</header>
        <div className="max-w-xl w-full bg-white border rounded-xl p-10 shadow-sm">
            <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">lock_reset</span>
            </div>
            <h1 className="text-2xl font-bold mb-4">Forgot Password</h1>
            <p className="text-on-surface-variant text-sm mb-8">Enter your email and we'll send a reset link.</p>
            <input
                className="w-full border rounded-lg p-3 mb-6 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="alan.turing@university.edu"
                type="email"
            />
            <button className="w-full bg-primary text-on-primary py-3.5 rounded-lg font-bold mb-4 hover:bg-on-primary-fixed-variant transition-colors">
                Send reset link
            </button>
            <Link to="/login" className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to login
            </Link>
        </div>
    </div>
)

export default RecoveryPage