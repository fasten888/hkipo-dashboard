export type IpoDisplayNameFields = {
  name: string
  displayNameCn?: string | null
  displayNameEn?: string | null
}

export function getIpoDisplayName(ipo: IpoDisplayNameFields) {
  return ipo.displayNameCn ?? (containsChinese(ipo.name) ? ipo.name : ipo.displayNameEn ?? ipo.name)
}

export function containsChinese(value: string) {
  return /[\u3400-\u9fff]/u.test(value)
}
