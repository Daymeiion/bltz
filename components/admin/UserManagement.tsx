"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconChevronDown, IconPlus, IconSearch, IconMail, IconBan, IconEye } from "@tabler/icons-react";

type Role = "player" | "fan" | "publisher" | "admin";
type Status = "active" | "blocked" | "pending";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  team?: string | null; // school/organization for players/publishers
  videos?: number; // player stats
  followers?: number; // fan stats
  createdAt: string; // iso date
}

const mockUsers: AdminUserRow[] = [
  { id: "1", name: "Eddie Lake", email: "eddie@bltz.io", role: "player", status: "active", team: "UNLV", videos: 18, followers: 1200, createdAt: "2024-06-11" },
  { id: "2", name: "Jamik Tashpulatov", email: "jt@bltz.io", role: "publisher", status: "active", team: "PacWest Media", videos: 45, followers: 9800, createdAt: "2024-03-02" },
  { id: "3", name: "Carter James", email: "carter@bltz.io", role: "fan", status: "pending", followers: 120, createdAt: "2025-01-04" },
  { id: "4", name: "Lena Ortiz", email: "lena@bltz.io", role: "player", status: "blocked", team: "UCLA", videos: 29, followers: 4200, createdAt: "2024-12-20" },
];

type SortKey = keyof Pick<AdminUserRow, "name"|"email"|"role"|"status"|"team"|"videos"|"followers"|"createdAt">;

export function UserManagement() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [activeTab, setActiveTab] = useState<Role | "all">("player");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const roleFiltered = activeTab === "all" ? mockUsers : mockUsers.filter(u => u.role === activeTab);
    const q = query.trim().toLowerCase();
    const searchFiltered = q.length === 0
      ? roleFiltered
      : roleFiltered.filter(u => `${u.name} ${u.email} ${u.team ?? ""}`.toLowerCase().includes(q));
    const sorted = [...searchFiltered].sort((a,b) => {
      const aVal = String(a[sortKey] ?? "").toLowerCase();
      const bVal = String(b[sortKey] ?? "").toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [activeTab, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const u of filtered) next[u.id] = checked;
    setSelected(next);
  };

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 md:p-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="player">Players</TabsTrigger>
              <TabsTrigger value="fan">Fans</TabsTrigger>
              <TabsTrigger value="publisher">Publishers</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button size="sm" className="whitespace-nowrap bg-[#000CF5] hover:bg-[#000A52]">
            <IconPlus className="h-4 w-4" />
            Add User
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="whitespace-nowrap">
                Actions
                <IconChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled={!anySelected}><IconMail /> Message</DropdownMenuItem>
              <DropdownMenuItem disabled={!anySelected}><IconBan /> Block</DropdownMenuItem>
              <DropdownMenuItem disabled={!anySelected}><IconEye /> View</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden border border-neutral-800">
        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow className="bg-neutral-900/70">
              <TableHead className="w-8">
                <Checkbox onCheckedChange={(v) => toggleAll(Boolean(v))} />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>Name</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("email")}>Email</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("role")}>Role</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("team")}>Org/Team</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("videos")}>Videos</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("followers")}>Followers</TableHead>
              <TableHead className="cursor-pointer" onClick={() => toggleSort("createdAt")}>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Checkbox checked={!!selected[u.id]} onCheckedChange={(v) => setSelected(s => ({ ...s, [u.id]: Boolean(v) }))} />
                </TableCell>
                <TableCell className="font-medium text-white">{u.name}</TableCell>
                <TableCell className="text-neutral-400">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={u.status === "active" ? "bg-[#FFCA33]/20 text-[#FFCA33] border-[#FFCA33]/20" : u.status === "blocked" ? "bg-red-500/20 text-red-400 border-red-500/20" : "bg-[#858585]/20 text-[#858585] border-[#858585]/20"}>
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-neutral-400">{u.team ?? "—"}</TableCell>
                <TableCell className="text-neutral-400">{u.videos ?? "—"}</TableCell>
                <TableCell className="text-neutral-400">{u.followers ?? "—"}</TableCell>
                <TableCell className="text-neutral-400">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline"><IconEye className="h-4 w-4" /> View</Button>
                    <Button size="sm" variant="outline"><IconMail className="h-4 w-4" /> Message</Button>
                    <Button size="sm" variant="destructive"><IconBan className="h-4 w-4" /> Block</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


