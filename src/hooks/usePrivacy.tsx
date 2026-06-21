/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getPrivacySettings,
  setPrivacySettings,
  type PrivacyField,
  type PrivacySettings,
} from '../services/privacy'

interface PrivacyContextValue {
  settings: PrivacySettings
  updateSetting: (field: PrivacyField, hidden: boolean) => void
  applySettings: (settings: PrivacySettings) => void
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null)

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(getPrivacySettings)
  const applySettings = (next: PrivacySettings) => {
    setPrivacySettings(next)
    setSettings(next)
  }
  const value = useMemo(
    () => ({
      settings,
      applySettings,
      updateSetting: (field: PrivacyField, hidden: boolean) =>
        applySettings({ ...settings, [field]: hidden }),
    }),
    [settings],
  )

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (!context) throw new Error('usePrivacy must be used inside PrivacyProvider')
  return context
}
