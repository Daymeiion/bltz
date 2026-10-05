"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconChartBar, IconUsers, IconVideo, IconCurrencyDollar } from "@tabler/icons-react";

type PublisherRow = { name: string; type: string; amount: number };

interface RevenueData {
  platformTotal: number;
  summary: {
    totalPlatformRevenue: number;
    totalPublisherRevenue: number;
    totalPlayerRevenue: number;
    totalTeamPoolRevenue: number;
    totalVideosProcessed: number;
    byPublisher: PublisherRow[];
  };
  topPlayers: {
    playerId: string;
    playerName: string;
    school: string;
    totalEarnings: number;
    fromOwnVideos: number;
    fromTeamPool: number;
  }[];
  recentDistributions: any[];
}

interface Player {
  id: string;
  full_name: string;
  school: string;
  email: string;
  role: string;
  created_at: string;
  visibility: boolean;
  total_videos: number;
  total_views: number;
}

export default function AdminDashboardLive() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [revenueRes, playersRes] = await Promise.all([
          fetch("/api/admin/revenue"),
          fetch("/api/admin/players"),
        ]);

        if (revenueRes.ok) {
          const rev = await revenueRes.json();
          setRevenueData(rev);
        }

        if (playersRes.ok) {
          const pl = await playersRes.json();
          setPlayers(pl.players || []);
        }
      } catch (_) {
        // intentionally no-op: render placeholders
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const totalRevenue = revenueData
    ? revenueData.summary.totalPlatformRevenue +
      revenueData.summary.totalPublisherRevenue +
      revenueData.summary.totalPlayerRevenue +
      revenueData.summary.totalTeamPoolRevenue
    : 0;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of platform metrics and recent activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Invite Admin</Button>
          <Button>New Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IconCurrencyDollar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(totalRevenue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined platform, publishers, players, team pool</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Players</CardTitle>
            <IconUsers className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">Total users fetched</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Videos Processed</CardTitle>
            <IconVideo className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(revenueData?.summary.totalVideosProcessed || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analytics</CardTitle>
            <IconChartBar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">More insights coming soon</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Distributions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(revenueData?.summary.byPublisher || []).slice(0, 10).map((pub) => (
                  <TableRow key={`${pub.name}-${pub.type}`}>
                    <TableCell>{pub.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{pub.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${pub.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {(!revenueData || (revenueData.summary.byPublisher || []).length === 0) && (
                  <TableRow>
                    <TableCell>—</TableCell>
                    <TableCell>
                      <Badge variant="outline">—</Badge>
                    </TableCell>
                    <TableCell className="text-right">$0.00</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Earning Players</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(revenueData?.topPlayers || []).slice(0, 8).map((p) => (
              <div key={p.playerId} className="flex items-center justify-between">
                <div className="text-sm">{p.playerName}</div>
                <div className="text-sm font-medium">${p.totalEarnings.toFixed(0)}</div>
              </div>
            ))}
            {(!revenueData || (revenueData.topPlayers || []).length === 0) && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm">—</div>
                  <div className="text-sm font-medium">$0</div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="text-sm">—</div>
                  <div className="text-sm font-medium">$0</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="text-xs text-muted-foreground">Loading data…</div>
      )}
    </div>
  );
}


