import { useState, type FormEvent, type ReactNode } from 'react'
import type {
  BatchDateChange,
  BatchRemarksChange,
  SubscriptionBatchChanges,
  SubscriptionMethod,
} from '../../types/subscription'
import { SUBSCRIPTION_METHOD_OPTIONS } from '../../utils/subscriptionMethod'
import { FormActions } from './SubscriptionForm'

export function BatchSubscriptionEditForm({
  selectedCount,
  onSubmit,
  onCancel,
}: {
  selectedCount: number
  onSubmit: (changes: SubscriptionBatchChanges) => void
  onCancel: () => void
}) {
  const [editMethod, setEditMethod] = useState(false)
  const [method, setMethod] = useState<SubscriptionMethod>('10x')
  const [editSubscriptionDate, setEditSubscriptionDate] = useState(false)
  const [subscriptionDate, setSubscriptionDate] = useState<BatchDateChange>({
    mode: 'shift',
    value: 1,
  })
  const [editListingDate, setEditListingDate] = useState(false)
  const [listingDate, setListingDate] = useState<BatchDateChange>({
    mode: 'shift',
    value: 1,
  })
  const [editRemarks, setEditRemarks] = useState(false)
  const [remarks, setRemarks] = useState<BatchRemarksChange>({
    mode: 'append',
    value: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (
      !editMethod &&
      !editSubscriptionDate &&
      !editListingDate &&
      !editRemarks
    ) {
      setError('请至少选择一项需要批量修改的内容。')
      return
    }
    if (
      editSubscriptionDate &&
      subscriptionDate.mode === 'set' &&
      !subscriptionDate.value
    ) {
      setError('请选择新的申购日期。')
      return
    }
    if (
      editListingDate &&
      listingDate.mode === 'set' &&
      !listingDate.value
    ) {
      setError('请选择新的上市日期。')
      return
    }
    if (
      editRemarks &&
      remarks.mode !== 'clear' &&
      !remarks.value?.trim()
    ) {
      setError('请输入需要新增或替换的备注。')
      return
    }

    onSubmit({
      method: editMethod ? method : undefined,
      subscriptionDate: editSubscriptionDate
        ? subscriptionDate
        : undefined,
      listingDate: editListingDate ? listingDate : undefined,
      remarks: editRemarks ? remarks : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 px-5 py-6 sm:px-7">
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
          将修改已选择的 {selectedCount} 条申购记录
        </p>

        <EditSection
          checked={editMethod}
          title="申购方式"
          onCheckedChange={setEditMethod}
        >
          <select
            value={method}
            disabled={!editMethod}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            onChange={(event) =>
              setMethod(event.target.value as SubscriptionMethod)
            }
          >
            {SUBSCRIPTION_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </EditSection>

        <DateEditSection
          checked={editSubscriptionDate}
          title="申购日期"
          value={subscriptionDate}
          onCheckedChange={setEditSubscriptionDate}
          onChange={setSubscriptionDate}
        />

        <DateEditSection
          checked={editListingDate}
          title="上市日期"
          value={listingDate}
          onCheckedChange={setEditListingDate}
          onChange={setListingDate}
        />

        <EditSection
          checked={editRemarks}
          title="备注"
          onCheckedChange={setEditRemarks}
        >
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <select
              value={remarks.mode}
              disabled={!editRemarks}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
              onChange={(event) =>
                setRemarks((current) => ({
                  ...current,
                  mode: event.target.value as BatchRemarksChange['mode'],
                }))
              }
            >
              <option value="append">新增备注</option>
              <option value="replace">替换备注</option>
              <option value="clear">删除备注</option>
            </select>
            {remarks.mode !== 'clear' && (
              <input
                value={remarks.value ?? ''}
                disabled={!editRemarks}
                placeholder="输入备注内容"
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm disabled:bg-slate-50"
                onChange={(event) =>
                  setRemarks((current) => ({
                    ...current,
                    value: event.target.value,
                  }))
                }
              />
            )}
          </div>
        </EditSection>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <FormActions submitLabel="保存批量修改" onCancel={onCancel} />
    </form>
  )
}

function DateEditSection({
  checked,
  title,
  value,
  onCheckedChange,
  onChange,
}: {
  checked: boolean
  title: string
  value: BatchDateChange
  onCheckedChange: (checked: boolean) => void
  onChange: (value: BatchDateChange) => void
}) {
  return (
    <EditSection
      checked={checked}
      title={title}
      onCheckedChange={onCheckedChange}
    >
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <select
          value={value.mode}
          disabled={!checked}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          onChange={(event) =>
            onChange({
              mode: event.target.value as BatchDateChange['mode'],
              value: event.target.value === 'set' ? '' : 1,
            })
          }
        >
          <option value="shift">顺延天数</option>
          <option value="set">指定日期</option>
        </select>
        <input
          type={value.mode === 'set' ? 'date' : 'number'}
          value={value.value}
          disabled={!checked}
          className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm disabled:bg-slate-50"
          onChange={(event) =>
            onChange({
              ...value,
              value:
                value.mode === 'set'
                  ? event.target.value
                  : Number(event.target.value),
            })
          }
        />
      </div>
    </EditSection>
  )
}

function EditSection({
  checked,
  title,
  children,
  onCheckedChange,
}: {
  checked: boolean
  title: string
  children: ReactNode
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <label className="mb-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          className="h-4 w-4 rounded border-slate-300 text-brand-600"
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        <span className="text-sm font-bold text-slate-700">{title}</span>
      </label>
      {children}
    </section>
  )
}
