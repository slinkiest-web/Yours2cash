import React from "react"
import type { LucideIcon } from "lucide-react"

export interface TabItem {
  id: string
  label: string
  icon?: LucideIcon
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  label: string
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, label }) => {
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      onChange(tabs[(index + 1) % tabs.length].id)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      onChange(tabs[(index - 1 + tabs.length) % tabs.length].id)
    }
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-2 border-b border-border overflow-x-auto">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text hover:border-border"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export const TabPanel: React.FC<{ id: string; activeTab: string; children: React.ReactNode }> = ({
  id,
  activeTab,
  children,
}) => {
  if (id !== activeTab) return null
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  )
}
