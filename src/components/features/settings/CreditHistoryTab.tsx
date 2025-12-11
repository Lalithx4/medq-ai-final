"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingDown, TrendingUp, Download, List, ShoppingCart, Zap, Gift } from "lucide-react";
import { toast } from "sonner";

interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  operation: string | null;
  createdAt: string;
}

export function CreditHistoryTab() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  useEffect(() => {
    fetchTransactions();
    fetchCurrentBalance();
  }, []);

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch("/api/credits/balance", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentBalance(data.credits ?? 0);
      } else {
        // Fallback to profile API
        const profileResponse = await fetch("/api/user/profile", {
          credentials: "include",
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setCurrentBalance(profileData.user?.credits ?? 0);
        }
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/credits/history?limit=100", {
        credentials: "include",
      });

      console.log("[CreditHistoryTab] Response status:", response.status);

      if (!response.ok) {
        console.error("[CreditHistoryTab] API error:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("[CreditHistoryTab] Error details:", errorText);
        toast.error("Failed to load credit history");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("[CreditHistoryTab] Transactions response:", data);
      console.log("[CreditHistoryTab] Number of transactions:", data.transactions?.length || 0);

      if (data.transactions && Array.isArray(data.transactions)) {
        console.log("[CreditHistoryTab] Setting transactions:", data.transactions);
        setTransactions(data.transactions);
      } else {
        console.warn("[CreditHistoryTab] No transactions array in response");
        setTransactions([]);
      }
    } catch (error) {
      console.error("[CreditHistoryTab] Error fetching transactions:", error);
      toast.error("Failed to load credit history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      purchase: { variant: "default", icon: TrendingUp },
      bonus: { variant: "default", icon: TrendingUp },
      usage: { variant: "destructive", icon: TrendingDown },
      refund: { variant: "secondary", icon: TrendingUp },
    };

    const { variant, icon: Icon } = config[type] || { variant: "outline" as const, icon: TrendingUp };

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const filteredTransactions = filter === "all"
    ? transactions
    : transactions.filter(t => t.type === filter);

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Amount", "Description", "Operation"];
    const rows = transactions.map(t => [
      formatDate(t.createdAt),
      t.type,
      t.amount.toString(),
      t.description,
      t.operation || "N/A",
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Credit history exported");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalEarned = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpent = Math.abs(
    transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credit History</CardTitle>
              <CardDescription>
                Track all your credit transactions and usage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={transactions.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-2"
              onClick={() => setFilter("all")}
            >
              <List className="h-5 w-5" />
              <span className="text-sm font-medium">All</span>
              <span className="text-xs opacity-75">{transactions.length} total</span>
            </Button>
            <Button
              variant={filter === "purchase" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-2"
              onClick={() => setFilter("purchase")}
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">Purchases</span>
              <span className="text-xs opacity-75">
                {transactions.filter(t => t.type === "purchase").length} items
              </span>
            </Button>
            <Button
              variant={filter === "usage" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-2"
              onClick={() => setFilter("usage")}
            >
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Usage</span>
              <span className="text-xs opacity-75">
                {transactions.filter(t => t.type === "usage").length} items
              </span>
            </Button>
            <Button
              variant={filter === "bonus" ? "default" : "outline"}
              className="h-auto py-3 flex-col gap-2"
              onClick={() => setFilter("bonus")}
            >
              <Gift className="h-5 w-5" />
              <span className="text-sm font-medium">Bonuses</span>
              <span className="text-xs opacity-75">
                {transactions.filter(t => t.type === "bonus").length} items
              </span>
            </Button>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No transactions found</p>

            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="w-full min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                      <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        {transaction.operation ? (
                          <Badge variant="outline" className="text-xs">
                            {transaction.operation}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span
                          className={
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {transaction.amount > 0 ? "+" : ""}
                          {transaction.amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Credit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Current Balance - Most Important */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground col-span-2 md:col-span-1">
              <p className="text-xs opacity-90 mb-1">Current Balance</p>
              <p className="text-3xl font-bold">{currentBalance.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-1">credits</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-green-600">
                +{totalEarned.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-red-600">
                -{totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Net Change</p>
              <p className={`text-2xl font-bold ${(totalEarned - totalSpent) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(totalEarned - totalSpent) >= 0 ? '+' : ''}{(totalEarned - totalSpent).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
