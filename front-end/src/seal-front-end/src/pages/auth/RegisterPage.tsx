import { Link, useNavigate } from 'react-router-dom'

const RegisterPage = () => {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-surface py-12 px-4 flex flex-col items-center">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <h1 className="font-headline font-black text-4xl text-primary">SEAL</h1>
                    <h2 className="mt-4 text-2xl font-bold">Competitor Registration</h2>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-8 md:p-10">
                    <form className="space-y-10" onSubmit={(e) => { e.preventDefault(); navigate('/pending') }}>
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-primary">1</span>
                                <h3 className="text-lg font-bold">Account Information</h3>
                            </div>
                            <input className="w-full border rounded-lg p-2.5" placeholder="Full Name" required />
                            <input className="w-full border rounded-lg p-2.5" placeholder="Email Address" type="email" required />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full border rounded-lg p-2.5" placeholder="Password" type="password" required />
                                <input className="w-full border rounded-lg p-2.5" placeholder="Confirm Password" type="password" required />
                            </div>
                        </div>
                        <div className="pt-10 border-t space-y-6">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-primary">2</span>
                                <h3 className="text-lg font-bold">Academic Classification</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="border-2 border-primary p-4 rounded-xl flex items-center gap-2 bg-primary/5 cursor-pointer">
                                    <input type="radio" name="type" defaultChecked />
                                    <div>
                                        <p className="font-bold">FPT Student</p>
                                        <p className="text-[10px]">Internal track</p>
                                    </div>
                                </label>
                                <label className="border p-4 rounded-xl flex items-center gap-2 opacity-60 cursor-pointer">
                                    <input type="radio" name="type" />
                                    <div>
                                        <p className="font-bold">External</p>
                                        <p className="text-[10px]">Guest tracks</p>
                                    </div>
                                </label>
                            </div>
                            <input className="w-full border rounded-lg p-2.5 uppercase" placeholder="FPT Student ID (SE123456)" />
                        </div>
                        <button type="submit" className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold hover:bg-on-primary-fixed-variant transition-colors">
                            Create Account
                        </button>
                        <p className="text-center text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-primary underline">Log in here</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default RegisterPage