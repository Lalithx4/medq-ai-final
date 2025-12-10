"use client";

import { useState } from "react";
import { AppLayout } from "@/components/home/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { SubscriptionTab } from "@/components/settings/SubscriptionTab";
import { PaymentHistoryTab } from "@/components/settings/PaymentHistoryTab";
import { CreditHistoryTab } from "@/components/settings/CreditHistoryTab";
import { ContactUsTab } from "@/components/settings/ContactUsTab";
import { User, CreditCard, History, Coins, Mail } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("subscription");

  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account, subscription, and billing preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Contact Us</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <SubscriptionTab />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentHistoryTab />
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <CreditHistoryTab />
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <ContactUsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
