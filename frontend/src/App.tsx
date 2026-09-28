import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, DatabaseZap, LoaderCircle } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/auth-context'
import { LoginPage } from './auth/LoginPage'
import { AppShell } from './components/AppShell'
import { isSupabaseConfigured } from './lib/supabase'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { storesService } from './services/stores.service'
import './App.css'

function App() {
  if (!isSupabaseConfigured) return <ConfigurationRequired />

  return (
    <AuthProvider>
      <BrowserRouter>
        <SessionGate />
      </BrowserRouter>
    </AuthProvider>
  )
}

function SessionGate() {
  const { session, loading } = useAuth()
  const [preparedUserId, setPreparedUserId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) {
      return
    }
    void storesService.ensureInitialStores()
      .then(() => {
        setError('')
        setPreparedUserId(session.user.id)
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'No fue posible preparar la aplicación.'))
  }, [session])

  if (loading) return <FullScreenStatus icon={<LoaderCircle className="spin" />} title="Restaurando tu sesión…" />
  if (!session) return <LoginPage />
  if (error) return <FullScreenStatus icon={<AlertTriangle />} title="No pudimos iniciar ARDU" detail={error} action={() => window.location.reload()} />
  if (preparedUserId !== session.user.id) return <FullScreenStatus icon={<DatabaseZap className="pulse" />} title="Preparando tus tiendas…" />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="shop" element={<ShoppingPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<TripDetailPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function ConfigurationRequired() {
  return (
    <main className="configuration-page">
      <div className="configuration-card">
        <DatabaseZap size={34} />
        <p className="eyebrow">Configuración pendiente</p>
        <h1>Conecta tu proyecto Supabase.</h1>
        <p>Copia <code>.env.example</code> como <code>.env</code> y completa las dos variables públicas del proyecto.</p>
        <pre>VITE_SUPABASE_URL={String.raw`https://…supabase.co`}<br />VITE_SUPABASE_ANON_KEY=…</pre>
      </div>
    </main>
  )
}

function FullScreenStatus({ icon, title, detail, action }: { icon: ReactNode; title: string; detail?: string; action?: () => void }) {
  return (
    <main className="full-status">
      <div className="status-icon">{icon}</div>
      <h1>{title}</h1>
      {detail && <p>{detail}</p>}
      {action && <button className="secondary-button" onClick={action}>Reintentar</button>}
    </main>
  )
}

export default App
