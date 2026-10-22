import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { usePersistent } from '../lib/store';
import { BookIcon, MenuIcon, MoonIcon, SunIcon, XIcon } from './Icons';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/studio', label: 'Studio' },
  { to: '/contribute', label: 'Contribute' },
  { to: '/voices', label: 'Voices' },
  { to: '/about', label: 'About' },
];

function useTheme() {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = usePersistent<'light' | 'dark'>('theme', prefersDark ? 'dark' : 'light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')] as const;
}

export function Layout({ children }: { children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive ? 'text-maroon-600 dark:text-gold-300' : 'text-ink-700 hover:text-maroon-600 dark:text-paper-200 dark:hover:text-gold-300'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-paper-200 bg-paper-50/90 backdrop-blur dark:border-ink-700 dark:bg-ink-900/90">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-maroon-600 text-gold-400"><BookIcon /></span>
            <span className="font-serif text-xl font-bold text-maroon-600 dark:text-gold-300">LitBridge</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (<NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass}>{n.label}</NavLink>))}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="btn-ghost !px-2.5" aria-label="Toggle dark mode">
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link to="/contribute" className="btn-primary hidden sm:inline-flex">Submit a story</Link>
            <button className="btn-ghost !px-2.5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
              {open ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="container-page flex flex-col pb-3 md:hidden" aria-label="Mobile">
            {NAV.map((n) => (<NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass}>{n.label}</NavLink>))}
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mt-20 border-t border-paper-200 bg-maroon-900 text-paper-100 dark:border-ink-700">
        <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
          <div>
            <p className="font-serif text-lg font-bold text-gold-300">LitBridge</p>
            <p className="mt-2 text-sm text-paper-200/80">Regional Indian literature, translated, summarised and narrated, so a story told in one language can be heard in many.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-gold-300">Explore</p>
            <ul className="mt-2 space-y-1 text-paper-200/80">
              <li><Link to="/library" className="hover:text-white">Library</Link></li>
              <li><Link to="/studio" className="hover:text-white">Translation studio</Link></li>
              <li><Link to="/contribute" className="hover:text-white">Contribute</Link></li>
            </ul>
          </div>
          <div className="text-sm text-paper-200/80">
            <p className="font-semibold text-gold-300">Rights</p>
            <p className="mt-2">Bundled works are public domain in India or traditional oral tales. English renderings are original to LitBridge.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
