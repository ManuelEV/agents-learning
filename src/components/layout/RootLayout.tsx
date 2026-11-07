import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { BookOpen, Library, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { SECTIONS, postsBySection } from '../../lib/content'
import { setTheme, useTheme } from '../../lib/theme'
import { SearchDialog } from './SearchDialog'

function Logo() {
  return (
    <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden>
      <path d="M32 6 56 20 32 34 8 20Z" fill="var(--accent-2)" />
      <path d="M8 20v24l24 14V34Z" fill="var(--accent-3)" />
      <path d="M56 20v24L32 58V34Z" fill="var(--accent)" />
    </svg>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="sidebar-nav" aria-label="Contenido de la guía">
      {SECTIONS.map((s) => {
        const items = postsBySection(s.id)
        if (items.length === 0) return null
        return (
          <div key={s.id} className="sidebar-section">
            <div className="sidebar-section-title">{s.title}</div>
            <ul>
              {items.map((p) => (
                <li key={p.slug}>
                  <NavLink to={`/guia/${p.slug}`} onClick={onNavigate} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {p.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Recursos</div>
        <ul>
          <li>
            <NavLink to="/referencias" onClick={onNavigate} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Todas las referencias
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export function RootLayout() {
  const theme = useTheme()
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => setDrawer(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearch(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="icon-btn lg-hide" onClick={() => setDrawer(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <Link to="/" className="brand">
            <Logo />
            <span>
              Agentes<span className="brand-dim"> guía definitiva</span>
            </span>
          </Link>
          <div className="topbar-spacer" />
          <button className="search-trigger" onClick={() => setSearch(true)}>
            <Search size={15} />
            <span>Buscar en la guía</span>
            <kbd>Ctrl K</kbd>
          </button>
          <Link to="/guia/ruta-de-aprendizaje" className="topbar-link sm-hide">
            <BookOpen size={16} /> Ruta
          </Link>
          <Link to="/referencias" className="topbar-link sm-hide">
            <Library size={16} /> Referencias
          </Link>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className={`shell${isHome ? ' shell-home' : ''}`}>
        {!isHome && (
          <aside className="sidebar">
            <Sidebar />
          </aside>
        )}
        <main className="main" id="contenido">
          <Outlet />
        </main>
      </div>

      {drawer && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer-panel">
            <div className="drawer-head">
              <Link to="/" className="brand" onClick={() => setDrawer(false)}>
                <Logo /> <span>Agentes</span>
              </Link>
              <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      {search && <SearchDialog onClose={() => setSearch(false)} />}

      <footer className="footer">
        <div>
          Cómo construir agentes de IA a nivel empresarial · Guía práctica · Contenido verificado contra documentación oficial
          a octubre de 2026. Revisa siempre las <Link to="/referencias">referencias</Link> antes de decisiones críticas.
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  )
}
