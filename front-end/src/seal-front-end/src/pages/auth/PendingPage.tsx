import { Link } from 'react-router-dom'
import Footer from '../../components/layout/Footer'

const PendingPage = () => (
    <div className="min-h-screen flex flex-col">
        <main className="flex-grow flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-white border rounded-xl p-10 text-center shadow-sm">
                <div className="flex justify-center mb-8">
                    <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-6xl text-primary fill-icon">hourglass_empty</span>
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-primary mb-4">Account pending approval</h1>
                <p className="text-on-surface-variant text-lg mb-8">
                    Your application will be reviewed by an Event Coordinator. Decision expected within 24-48 hours.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link to="/" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold hover:bg-on-primary-fixed-variant transition-colors">
                        Back to Home
                    </Link>
                    <button className="border border-primary text-primary px-6 py-3 rounded-lg font-bold hover:bg-surface-container-low transition-colors">
                        Contact Support
                    </button>
                </div>
            </div>
        </main>
        <Footer />
    </div>
)

export default PendingPage