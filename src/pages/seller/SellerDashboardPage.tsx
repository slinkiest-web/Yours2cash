import React, { useState } from "react"
import { Package, ShoppingBag, Wallet } from "lucide-react"
import { Tabs, TabPanel } from "../../components/ui/Tabs"
import { MyListingsTab } from "./MyListingsTab"
import { MyOrdersTab } from "./MyOrdersTab"
import { EarningsTab } from "./EarningsTab"

const TABS = [
  { id: "listings", label: "My Listings", icon: Package },
  { id: "orders", label: "My Orders", icon: ShoppingBag },
  { id: "earnings", label: "Earnings", icon: Wallet },
]

export const SellerDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("listings")

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-serif text-text">Seller Dashboard</h1>
        <p className="text-text-muted text-sm mt-1">
          Manage your listings, fulfil orders, and track earnings.
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} label="Seller dashboard sections" />

      <TabPanel id="listings" activeTab={activeTab}>
        <MyListingsTab />
      </TabPanel>
      <TabPanel id="orders" activeTab={activeTab}>
        <MyOrdersTab />
      </TabPanel>
      <TabPanel id="earnings" activeTab={activeTab}>
        <EarningsTab />
      </TabPanel>
    </div>
  )
}
