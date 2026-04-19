import Icon from '../Icon'

export default function NotFoundView() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-sans)' }}
    >
      <div className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-surface border border-gray-border grid place-items-center text-text-hint">
          <Icon name="search" size={20} />
        </div>
        <div
          className="text-[10px] text-text-hint uppercase tracking-[0.14em] mb-2"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Error 404
        </div>
        <h1
          className="text-[26px] font-normal text-text leading-[1.15] tracking-[-0.015em] m-0"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Página no encontrada.
        </h1>
        <p className="text-[13px] text-text-muted mt-3 leading-[1.55]">
          La dirección que ingresaste no existe o fue movida. Probablemente te enviaron un link incompleto.
        </p>
        <a
          href="/"
          className="inline-block mt-6 py-[11px] px-5 rounded-[10px] text-[13px] font-medium cursor-pointer bg-primary text-surface hover:bg-[#2F3C2D] transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </main>
  )
}
