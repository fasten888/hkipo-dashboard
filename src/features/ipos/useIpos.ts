import { useAppData } from '../../hooks/useAppData'

export function useIpos() {
  const { ipos, addIpos, updateIpo, deleteIpo } = useAppData()
  return { ipos, addIpos, updateIpo, deleteIpo }
}
