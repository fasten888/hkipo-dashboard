import { IposPage as IposFeature } from '../features/ipos/IposPage'

export function IposPage({
  onViewIpo,
}: {
  onViewIpo?: (ipoId: string) => void
}) {
  return <IposFeature onViewIpo={onViewIpo} />
}
