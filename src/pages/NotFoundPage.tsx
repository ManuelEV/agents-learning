import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="notfound">
      <div className="notfound-code">404</div>
      <h1>Esta página no existe</h1>
      <p className="muted">Puede que el enlace haya cambiado. Vuelve al inicio o usa el buscador (Ctrl K).</p>
      <Link to="/" className="btn btn-primary">
        Ir al inicio
      </Link>
    </div>
  )
}
