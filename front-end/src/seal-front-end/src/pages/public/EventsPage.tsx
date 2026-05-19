import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const EventsPage = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-6 py-12 flex flex-col gap-12">
            <section className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-4">Discover Hackathons</h1>
                        <p className="text-on-surface-variant text-lg leading-relaxed">Browse upcoming, ongoing, and past SEAL engineering challenges.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-2 rounded-lg border border-outline-variant/50">
                        <select className="bg-surface-container-lowest border border-outline-variant text-sm rounded px-4 py-2">
                            <option>All Seasons</option>
                        </select>
                        <select className="bg-surface-container-lowest border border-outline-variant text-sm rounded px-4 py-2">
                            <option>All Years</option>
                        </select>
                        <div className="flex bg-surface-container-lowest rounded border border-outline-variant overflow-hidden">
                            <button className="px-4 py-2 text-sm font-semibold bg-primary/10 text-primary">Open</button>
                            <button className="px-4 py-2 text-sm font-medium">Ongoing</button>
                            <button className="px-4 py-2 text-sm font-medium">Closed</button>
                        </div>
                    </div>
                </div>
            </section>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <article className="group bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
                    <div className="relative h-48 w-full bg-surface-container">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-container to-primary opacity-60" />
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className="bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Spring</span>
                            <span className="bg-white/90 text-on-surface text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">2026</span>
                        </div>
                        <div className="absolute top-4 right-4">
                            <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-1 rounded-full font-bold">Open</span>
                        </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                        <h3 className="font-headline text-xl font-bold mb-2">SEAL Spring 2026</h3>
                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex items-center text-sm text-on-surface-variant gap-2">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                March 15 - March 17, 2026
                            </div>
                            <div className="bg-error-container/30 border border-error-container text-on-error-container text-xs p-2 rounded flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">timer</span>
                                Registration ends in 14d 08h
                            </div>
                        </div>
                        <Link
                            to="/event-details"
                            className="w-full text-center bg-surface-container-lowest border border-outline text-on-surface font-semibold py-2.5 rounded-lg hover:border-primary hover:text-primary transition-all"
                        >
                            View Details
                        </Link>
                    </div>
                </article>
            </section>
        </main>
        <Footer />
    </div>
)

export default EventsPage