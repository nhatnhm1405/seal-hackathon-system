import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const tracks = ['Web App Innovation', 'AI & Machine Learning']

const EventDetailsPage = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <header className="relative bg-primary text-on-primary py-20 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-on-primary/10 border border-on-primary/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs mb-6">
                        <span className="material-symbols-outlined text-sm">calendar_month</span> April 10 - April 12, 2026
                    </div>
                    <h1 className="text-4xl md:text-6xl font-headline font-extrabold mb-6">SEAL Spring 2026</h1>
                    <p className="text-lg text-primary-fixed-dim mb-10">The premier academic hackathon for software engineering excellence.</p>
                    <div className="flex gap-4">
                        <button className="bg-secondary text-on-secondary px-8 py-4 rounded-lg font-bold flex items-center gap-2">
                            Register Team <span className="material-symbols-outlined">group_add</span>
                        </button>
                        <button className="border border-white/30 px-6 py-4 rounded-lg font-semibold flex items-center gap-2">
                            View Rules <span className="material-symbols-outlined">description</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 w-full">
            <aside className="lg:col-span-4 space-y-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h3 className="font-headline font-bold text-lg mb-6 border-b pb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">info</span> Key Info
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-on-surface-variant uppercase">Prize Pool</p>
                            <p className="text-2xl font-bold text-primary">$5,000</p>
                        </div>
                        <div>
                            <p className="text-xs text-on-surface-variant uppercase">Deadline</p>
                            <p className="text-lg font-medium">March 15, 2026</p>
                        </div>
                        <div>
                            <p className="text-xs text-on-surface-variant uppercase">Format</p>
                            <p className="text-base font-medium">In-Person (Main Campus)</p>
                        </div>
                    </div>
                </div>
            </aside>
            <div className="lg:col-span-8">
                <h2 className="text-2xl font-headline font-extrabold mb-6">Event Overview</h2>
                <p className="text-on-surface-variant leading-relaxed mb-8">
                    The SEAL Spring 2026 Hackathon is a high-intensity, 48-hour event designed to push the boundaries of student software engineering.
                </p>
                <h2 className="text-2xl font-headline font-extrabold mb-6">Competition Tracks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tracks.map(track => (
                        <div key={track} className="bg-white border rounded-xl p-6 hover:border-primary transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined">code</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">{track}</h3>
                            <p className="text-sm text-on-surface-variant">Building innovative solutions for the modern web environment.</p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
        <Footer />
    </div>
)

export default EventDetailsPage