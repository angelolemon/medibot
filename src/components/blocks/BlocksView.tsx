import { useState } from 'react'
import type { DateBlock } from '../../data/appointments'
import { formatDateShort, getDatesBetween } from '../../data/appointments'

interface Props {
  blocks: DateBlock[]
  onAdd: (block: Omit<DateBlock, 'id' | 'createdAt'>) => void
  onRemove: (id: string) => void
}

export default function BlocksView({ blocks, onAdd, onRemove }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('Vacaciones')

  const overlappingBlock = from && to && to >= from
    ? blocks.find((b) => from <= b.to && to >= b.from)
    : null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!from || !to) return
    if (to < from) return
    if (overlappingBlock) return
    onAdd({ from, to, reason })
    setFrom('')
    setTo('')
    setReason('Vacaciones')
  }

  const activeBlocks = blocks.filter((b) => b.to >= new Date().toISOString().split('T')[0])
  const pastBlocks = blocks.filter((b) => b.to < new Date().toISOString().split('T')[0])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-bg">
      <div className="p-6 sm:p-8 overflow-y-auto flex-1 pb-20 lg:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-text leading-[1.05] tracking-tight">Bloqueos</h1>
            <p className="text-[14px] text-text-muted mt-2">Bloqueá rangos de fechas para no recibir turnos.</p>
          </div>
        </div>
        {/* New block form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-border rounded-[16px] p-5 mb-6">
          <div className="text-[13px] font-semibold mb-4">Nuevo bloqueo</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
                className="w-full px-3 py-2 rounded-md border border-gray-border text-sm focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-hint uppercase tracking-wide mb-1 block">Motivo</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-border text-sm bg-white focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
              >
                <option>Vacaciones</option>
                <option>Congreso / Capacitación</option>
                <option>Licencia médica</option>
                <option>Feriado</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          {from && to && to >= from && (
            <div className="text-xs text-text-muted mb-3">
              {getDatesBetween(from, to).length} día{getDatesBetween(from, to).length !== 1 ? 's' : ''} bloqueado{getDatesBetween(from, to).length !== 1 ? 's' : ''}
            </div>
          )}

          {overlappingBlock && (
            <div className="flex items-center gap-2 bg-coral-light border border-coral/20 rounded-md px-3 py-2 mb-3">
              <span className="text-sm">⚠️</span>
              <div className="text-xs text-coral">
                Las fechas se superponen con <strong>{overlappingBlock.reason}</strong> ({formatDateShort(overlappingBlock.from)} → {formatDateShort(overlappingBlock.to)}). Elegí un rango que no se pise con bloqueos existentes.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!!overlappingBlock}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
              overlappingBlock
                ? 'bg-gray-bg text-text-hint cursor-not-allowed'
                : 'bg-primary text-white hover:bg-[#534AB7]'
            }`}
          >
            🏖️ Crear bloqueo
          </button>
        </form>

        {/* Active blocks */}
        <div className="mb-6">
          <div className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
            Bloqueos activos · {activeBlocks.length}
          </div>

          {activeBlocks.length === 0 ? (
            <div className="bg-white border border-gray-border rounded-[16px] p-6 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm text-text-muted">No hay bloqueos activos</div>
              <div className="text-xs text-text-hint mt-1">Todos los días están disponibles para turnos</div>
            </div>
          ) : (
            <div className="space-y-2">
              {activeBlocks.map((block) => (
                <BlockCard key={block.id} block={block} onRemove={onRemove} />
              ))}
            </div>
          )}
        </div>

        {/* Past blocks */}
        {pastBlocks.length > 0 && (
          <div>
            <div className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">
              Bloqueos pasados · {pastBlocks.length}
            </div>
            <div className="space-y-2 opacity-60">
              {pastBlocks.map((block) => (
                <BlockCard key={block.id} block={block} onRemove={onRemove} isPast />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BlockCard({ block, onRemove, isPast }: { block: DateBlock; onRemove: (id: string) => void; isPast?: boolean }) {
  const days = getDatesBetween(block.from, block.to).length

  const reasonIcons: Record<string, string> = {
    'Vacaciones': '🏖️',
    'Congreso / Capacitación': '📚',
    'Licencia médica': '🏥',
    'Feriado': '🎉',
    'Otro': '📌',
  }

  return (
    <div className="bg-white border border-gray-border rounded-[16px] px-4 py-3.5 flex items-center gap-3.5">
      <div className="w-10 h-10 rounded-[16px] bg-coral-light flex items-center justify-center text-lg shrink-0">
        {reasonIcons[block.reason] ?? '📌'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{block.reason}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {formatDateShort(block.from)} → {formatDateShort(block.to)} · {days} día{days !== 1 ? 's' : ''}
        </div>
      </div>
      {!isPast && (
        <button
          onClick={() => onRemove(block.id)}
          className="text-[11px] px-2 py-1 rounded-md border border-gray-border bg-white text-text-muted cursor-pointer hover:bg-gray-bg shrink-0"
        >
          Eliminar
        </button>
      )}
    </div>
  )
}
