"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/features/home/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/features/settings/ProfileTab";
import { CreditHistoryTab } from "@/components/features/settings/CreditHistoryTab";
import { ContactUsTab } from "@/components/features/settings/ContactUsTab";
import { User, Coins, Mail } from "lucide-react";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");

  // Update tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);


  return (
    <AppLayout>
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and billing preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
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
