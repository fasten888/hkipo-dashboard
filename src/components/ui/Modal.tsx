import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  fullScreenOnMobile?: boolean
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  fullScreenOnMobile = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        aria-label="关闭弹窗"
        className="absolute inset-0 bg-[#2E2A24]/45 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        className={`relative w-full overflow-y-auto border border-white/70 bg-white shadow-modal sm:max-h-[94vh] sm:max-w-2xl sm:rounded-[28px] ${
          fullScreenOnMobile
            ? 'h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[94vh]'
            : 'max-h-[94vh] rounded-t-3xl'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#F4F1ED] bg-white/95 px-5 py-5 backdrop-blur sm:px-8 sm:py-6">
          <div>
            <h2 id="modal-title" className="text-xl font-medium tracking-[-0.025em] text-[#2E2A24]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#F4F1ED]0">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[#A8A296] transition hover:bg-[#F4F1ED] hover:text-[#5A5246]"
            aria-label="关闭"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
