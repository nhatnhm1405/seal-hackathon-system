import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
    const location = useLocation()
    const isActive = (path: string) => location.pathname === path

    return (
        <header className="bg-surface dark:bg-surface-dim border-b border-outline-variant dark:border-outline shadow-sm sticky top-0 z-50">
            <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
                <div className="flex items-center gap-8">
                    <Link to="/" className="text-2xl font-headline font-black tracking-tighter text-primary dark:text-primary-fixed-dim">
                        SEAL
                    </Link>
                    <nav className="hidden md:flex gap-6">
                        <Link
                            to="/events"
                            className={`font-headline text-sm font-medium tracking-tight pb-1 transition-all ${isActive('/events')
                                    ? 'text-primary dark:text-primary-fixed font-bold border-b-2 border-primary'
                                    : 'text-on-surface-variant dark:text-surface-variant hover:text-primary'
                                }`}
                        >
                            Events
                        </Link>
                        <Link to="/leaderboard" className="font-headline text-sm font-medium tracking-tight text-on-surface-variant dark:text-surface-variant hover:text-primary transition-colors">
                            Leaderboard
                        </Link>
                        <Link to="/schedule" className="font-headline text-sm font-medium tracking-tight text-on-surface-variant dark:text-surface-variant hover:text-primary transition-colors">
                            Schedule
                        </Link>
                        <Link to="/rules" className="font-headline text-sm font-medium tracking-tight text-on-surface-variant dark:text-surface-variant hover:text-primary transition-colors">
                            Rules
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="hidden md:block font-headline text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                        Login
                    </Link>
                    <Link to="/register" className="bg-primary text-on-primary font-headline text-sm font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-on-primary-fixed-variant transition-colors">
                        Register
                    </Link>
                    <Link to="/profile" className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden hover:opacity-80 transition-opacity">
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjUI1kJq-JKL_KUvYNo9ZN_tdGYkmT8DxIC5-eD_gOFnnG3k08oDDf2rkVCR4I4JeZFTT4t8vZb1di8k0xQfV_z3YDJKrMCSWUE7iuWpPDUpICWkr9xTe9sRCw_VcT4Zhoa2Wcpdsypvkt83adzAf5ULuWhb2w2CPhH_y1t17ZpwQI1H599xaVgCbVpnyNjCTk55ALgbx3gVP2Y5zUb82O5mzvw1-r7TiqO0Sk50qaimWJrmX_30Bb3tSsFWmCJ0r-iYYa4a4G96k"
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Navbar