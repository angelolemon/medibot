import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  children: ReactNode
}

export default function Btn({ variant = 'secondary', size = 'md', className = '', children, ...rest }: Props) {
  const sizeCls = size === 'sm' ? 'text-[11px] px-2.5 py-[5px] gap-1' : 'text-[12px] px-3 py-[7px] gap-1.5'
  const variantCls = {
    primary:
      'bg-primary text-surface border border-primary hover:bg-[#2F3C2D] disabled:opacity-60',
    secondary:
      'bg-surface text-text-muted border border-gray-border-2 hover:bg-surface-2 disabled:opacity-60',
    ghost:
      'bg-transparent text-text-muted border border-transparent hover:bg-surface-2',
    danger:
      'bg-surface text-coral border border-coral-light hover:bg-coral-light',
  }[variant]

  return (
    <button
      {...rest}
      className={`inline-flex items-center rounded-[8px] font-medium cursor-pointer transition-colors whitespace-nowrap ${sizeCls} ${variantCls} ${className}`}
    >
      {children}
    </button>
  )
}
