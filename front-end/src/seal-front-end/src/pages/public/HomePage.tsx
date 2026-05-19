import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const HomePage = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main>
            <section className="relative pt-24 pb-32 overflow-hidden bg-surface-container-lowest">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-sm font-medium mb-6 font-label">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Season 3 Registrations Open
                        </div>
                        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-on-surface tracking-tight leading-tight mb-6">
                            Software Engineering <br /> <span className="text-primary">Agile League</span>
                        </h1>
                        <p className="text-xl text-on-surface-variant font-body leading-relaxed mb-10 max-w-2xl">
                            A rigorous three-season academic hackathon series (Spring, Summer, Fall) designed to push university engineering teams to their limits.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/register"
                                className="bg-primary text-on-primary font-headline text-base font-semibold py-4 px-8 rounded-lg shadow-md hover:bg-on-primary-fixed-variant transition-colors flex items-center justify-center gap-2"
                            >
                                Register Now
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </Link>
                            <Link
                                to="/events"
                                className="bg-surface text-primary border border-primary font-headline text-base font-semibold py-4 px-8 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
                            >
                                Browse Events
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-primary-container text-on-primary-container py-12">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-on-primary-container/20">
                        {[
                            { value: '25+', label: 'Total Events' },
                            { value: '500+', label: 'Teams' },
                            { value: '12', label: 'Universities' },
                            { value: '$50k+', label: 'Prize Pool' },
                        ].map(({ value, label }) => (
                            <div key={label} className="text-center md:text-left md:pl-8 first:pl-0">
                                <p className="text-4xl font-display font-black">{value}</p>
                                <p className="text-xs font-label uppercase opacity-80">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
        <Footer />
    </div>
)

export default HomePage