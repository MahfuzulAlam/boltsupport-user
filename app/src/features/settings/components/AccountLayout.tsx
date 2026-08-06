import { Outlet } from 'react-router-dom'
import { ACCOUNT_NAV_GROUPS } from '../nav'
import { SettingsNav } from './SettingsNav'

export function AccountLayout() {
  return (
    <div className="flex h-full w-full">
      <SettingsNav label="Account settings" groups={ACCOUNT_NAV_GROUPS} />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
