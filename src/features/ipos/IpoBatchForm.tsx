import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { IpoInput } from '../../types/ipo'

interface IpoBatchFormProps {
  onSubmit: (inputs: IpoInput[]) => void
  onCancel: () => void
}

interface RowValues {
  key: number
  name: string
  stockCode: string
  issuePrice: string
  lotSize: string
  subscriptionDate: string
  listingDate: string
  industry: string
}

let nextRowKey = 1

function createRow(): RowValues {
  return {
    key: nextRowKey++,
    name: '',
    stockCode: '',
    issuePrice: '',
    lotSize: '',
    subscriptionDate: '',
    listingDate: '',
    industry: '',
  }
}

export function IpoBatchForm({ onSubmit, onCancel }: IpoBatchFormProps) {
  const [rows, setRows] = useState<RowValues[]>([createRow()])
  const [error, setError] = useState('')

  const updateRow = (
    key: number,
    field: keyof Omit<RowValues, 'key'>,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    )
    setError('')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalidRow = rows.find((row) => !isValidRow(row))
    if (invalidRow) {
      setError('请完整填写每一行，并检查价格、股数和日期。')
      return
    }

    onSubmit(
      rows.map((row) => ({
        name: row.name.trim(),
        stockCode: row.stockCode.trim().toUpperCase(),
        issuePrice: Number(row.issuePrice),
        lotSize: Number(row.lotSize),
        subscriptionDate: row.subscriptionDate,
        listingDate: row.listingDate,
        industry: row.industry.trim(),
      })),
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 px-5 py-6 sm:px-7">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="rounded-2xl border border-[#E4DFD6] bg-[#F4F1ED]/60 p-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-bold text-[#5A5246]">新股 {index + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="rounded-lg p-2 text-[#A8A296] hover:bg-[#F9F2F0] hover:text-[#9A7468]"
                  aria-label={`删除第 ${index + 1} 行`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((item) => item.key !== row.key),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="新股名称"
                value={row.name}
                placeholder="例如：蜜雪集团"
                onChange={(value) => updateRow(row.key, 'name', value)}
              />
              <Input
                label="股票代码"
                value={row.stockCode}
                placeholder="例如：02097"
                onChange={(value) => updateRow(row.key, 'stockCode', value)}
              />
              <Input
                label="发行价"
                value={row.issuePrice}
                placeholder="HK$ 0.00"
                inputMode="decimal"
                onChange={(value) => updateRow(row.key, 'issuePrice', value)}
              />
              <Input
                label="一手股数"
                value={row.lotSize}
                placeholder="例如：200"
                inputMode="numeric"
                onChange={(value) =>
                  updateRow(row.key, 'lotSize', value.replace(/\D/g, ''))
                }
              />
              <Input
                label="申购日期"
                value={row.subscriptionDate}
                type="date"
                onChange={(value) =>
                  updateRow(row.key, 'subscriptionDate', value)
                }
              />
              <Input
                label="上市日期"
                value={row.listingDate}
                type="date"
                onChange={(value) => updateRow(row.key, 'listingDate', value)}
              />
              <Input
                label="行业"
                value={row.industry}
                placeholder="请输入行业"
                maxLength={50}
                onChange={(value) => updateRow(row.key, 'industry', value)}
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          onClick={() => setRows((current) => [...current, createRow()])}
        >
          <Plus size={16} />
          增加一行
        </button>
        {error && <p className="text-sm text-[#9A7468]">{error}</p>}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#F4F1ED] bg-[#F4F1ED]/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          className="rounded-xl border border-[#E4DFD6] bg-white px-5 py-2.5 text-sm font-semibold text-[#5A5246]"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          保存 {rows.length} 只新股
        </button>
      </div>
    </form>
  )
}

function Input({
  label,
  value,
  placeholder,
  type = 'text',
  inputMode = 'text',
  maxLength,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  type?: 'text' | 'date'
  inputMode?: 'text' | 'numeric' | 'decimal'
  maxLength?: number
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-[#736A5C]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="focus-ring w-full rounded-xl border border-[#E4DFD6] bg-white px-3.5 py-2.5 text-sm"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function isValidRow(row: RowValues) {
  return (
    Boolean(row.name.trim()) &&
    Boolean(row.stockCode.trim()) &&
    Number(row.issuePrice) > 0 &&
    Number.isInteger(Number(row.lotSize)) &&
    Number(row.lotSize) > 0 &&
    Boolean(row.subscriptionDate) &&
    Boolean(row.listingDate) &&
    row.listingDate >= row.subscriptionDate
  )
}
