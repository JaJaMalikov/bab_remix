import { ReactNode, useState } from "react";

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: Tab[];
  defaultTab?: string;
  storageKey?: string;
}

export function TabPanel({ tabs, defaultTab, storageKey }: TabPanelProps) {
  const [activeTab, setActiveTab] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored && tabs.find(t => t.id === stored)) return stored;
    }
    return defaultTab || tabs[0]?.id || "";
  });

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (storageKey) {
      localStorage.setItem(storageKey, tabId);
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="tab-panel">
      <div className="tab-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-content">
        {currentTab?.content}
      </div>
    </div>
  );
}
