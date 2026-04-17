import type { View } from './Sidebar'

const items: { icon: string; label: string; view: View }[] = [
  { icon: '📅', label: 'Agenda', view: 'agenda' },
  { icon: '👥', label: 'Pacientes', view: 'pacientes' },
  { icon: '🏖️', label: 'Bloqueos', view: 'bloqueos' },
  { icon: '💬', label: 'WhatsApp', view: 'config' },
]

interface Props {
  activeView: View
  onNavigate: (view: View) => void
}

export default function MobileNav({ activeView, onNavigate }: Props) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-border pt-2 pb-3 z-50">
      <div className="flex justify-around">
        {items.map((item) => (
          <div
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center gap-0.5 text-[10px] cursor-pointer px-3 py-1 ${
              activeView === item.view ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
