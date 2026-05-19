const Footer = () => (
    <footer className="bg-surface-container-lowest dark:bg-surface-container-low border-t border-outline-variant dark:border-outline mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-6 py-12 max-w-7xl mx-auto">
            <div>
                <div className="font-headline font-extrabold text-lg text-primary dark:text-primary-fixed mb-4">SEAL</div>
                <p className="font-body text-sm leading-relaxed text-on-surface-variant dark:text-surface-variant max-w-xs">
                    Software Engineering Agile League. Empowering student developers through rigorous academic competition.
                </p>
                <div className="mt-6 text-xs text-on-surface-variant dark:text-surface-variant opacity-70">
                    © 2024 SEAL Software Engineering Hackathon Management. FPT University HCMC.
                </div>
            </div>
            <div className="flex flex-col md:items-end justify-start gap-4">
                <div className="flex flex-col sm:flex-row gap-6 font-body text-sm">
                    <a href="#" className="text-on-surface-variant dark:text-surface-variant hover:text-secondary underline">University Home</a>
                    <a href="#" className="text-on-surface-variant dark:text-surface-variant hover:text-secondary underline">Terms of Service</a>
                    <a href="#" className="text-on-surface-variant dark:text-surface-variant hover:text-secondary underline">Privacy Policy</a>
                    <a href="#" className="text-on-surface-variant dark:text-surface-variant hover:text-secondary underline">Technical Support</a>
                </div>
            </div>
        </div>
    </footer>
)

export default Footer