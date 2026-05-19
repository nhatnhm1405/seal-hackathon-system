import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'

const ProfilePage = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
            <aside className="md:col-span-3">
                <div className="bg-white border rounded-xl overflow-hidden sticky top-24 shadow-sm">
                    <div className="p-6 text-center border-b">
                        <div className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-surface bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
                        </div>
                        <h2 className="font-bold text-lg">Nguyen Van A</h2>
                        <p className="text-xs text-on-surface-variant mb-4">nguyenvana@fpt.edu.vn</p>
                        <div className="flex gap-2 justify-center">
                            <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-bold">Leader</span>
                            <span className="bg-surface-variant text-[10px] px-2 py-0.5 rounded-full font-bold">FPT Student</span>
                        </div>
                    </div>
                    <nav className="flex flex-col p-2 text-sm">
                        <a className="p-3 bg-primary/10 text-primary font-bold rounded-lg flex gap-3 items-center cursor-pointer">
                            <span className="material-symbols-outlined fill-icon">person</span> Profile Info
                        </a>
                        <a className="p-3 hover:bg-surface-container flex gap-3 items-center cursor-pointer rounded-lg">
                            <span className="material-symbols-outlined">lock</span> Password
                        </a>
                        <a className="p-3 hover:bg-surface-container flex gap-3 items-center cursor-pointer rounded-lg">
                            <span className="material-symbols-outlined">history</span> History
                        </a>
                    </nav>
                </div>
            </aside>
            <section className="md:col-span-9 bg-white border rounded-xl p-8 shadow-sm">
                <h1 className="text-2xl font-bold mb-8">Profile Information</h1>
                <form className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold mb-2">Full Name</label>
                            <input className="w-full border rounded-lg p-2.5" defaultValue="Nguyen Van A" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Email (Locked)</label>
                            <input className="w-full bg-surface-container-low border rounded-lg p-2.5" defaultValue="nguyenvana@fpt.edu.vn" disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Phone</label>
                            <input className="w-full border rounded-lg p-2.5" defaultValue="+84 987 654 321" />
                        </div>
                    </div>
                    <div className="pt-8 border-t">
                        <h3 className="font-bold mb-4">Academic Details</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold mb-2">University</label>
                                <input className="w-full border rounded-lg p-2.5" defaultValue="FPT University HCMC" readOnly />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Student ID</label>
                                <input className="w-full border rounded-lg p-2.5" defaultValue="SE123456" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 pt-8">
                        <button type="button" className="px-6 py-2 border rounded-lg font-bold">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold hover:bg-on-primary-fixed-variant transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </section>
        </main>
        <Footer />
    </div>
)

export default ProfilePage