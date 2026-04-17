export default function TopBar() {
  return (
    <div className="bg-white border-b border-gray-border px-6 py-3.5 flex items-center justify-between shrink-0">
      <div>
        <div className="text-[15px] font-semibold">Agenda del día</div>
        <div className="text-xs text-text-muted mt-px">Sábado 4 de abril, 2026</div>
      </div>
      <div className="flex items-center gap-2.5">
        <button className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-gray-border bg-white text-text hover:bg-gray-bg transition-colors">
          🚫 Bloquear horario
        </button>
        <button className="inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors">
          + Turno manual
        </button>
      </div>
    </div>
  )
}
