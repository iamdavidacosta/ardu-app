import { Archive, House, LogOut, PackageSearch, ShoppingBasket } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { SquirrelMark } from './SquirrelMark'

const navigation = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/shop', label: 'Compra', icon: ShoppingBasket },
  { to: '/history', label: 'Historial', icon: Archive },
  { to: '/products', label: 'Productos', icon: PackageSearch },
]

export function AppShell() {
  const { session, signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <NavLink to="/" className="sidebar-brand" aria-label="ARDU, ir al inicio">
          <SquirrelMark size={25} />
          <span>ARDU</span>
        </NavLink>
        <nav aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={20} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="account-dot" />
          <span className="account-email">{session?.user.email}</span>
          <button type="button" className="icon-button" onClick={() => void signOut()} aria-label="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="app-frame">
        <header className="mobile-header">
          <NavLink to="/" className="sidebar-brand" aria-label="ARDU, ir al inicio">
            <SquirrelMark size={24} /><span>ARDU</span>
          </NavLink>
          <button type="button" className="icon-button" onClick={() => void signOut()} aria-label="Cerrar sesión">
            <LogOut size={19} />
          </button>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
        <nav className="bottom-nav" aria-label="Navegación principal">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
              <Icon size={21} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
