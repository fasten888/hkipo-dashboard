import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认删除',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="px-5 py-6 sm:px-7">
        <div className="flex gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={21} />
          </div>
          <p className="pt-1 text-sm leading-6 text-slate-600">{message}</p>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
