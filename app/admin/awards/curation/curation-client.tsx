'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Edit, Save, Trash2, ExternalLink, Award, Calendar, Building } from 'lucide-react';
import { toast } from 'sonner';

interface PendingAward {
  id: string;
  player_name: string;
  name: string;
  description: string;
  year: number;
  organization: string;
  category: 'sports' | 'academic' | 'personal';
  significance: 'local' | 'conference' | 'national' | 'professional';
  source_url: string;
  image_url?: string;
  confidence: number;
  verified: boolean;
  created_at: string;
  needs_review: boolean;
}

interface PlayerAwards {
  player_name: string;
  awards: PendingAward[];
}

export function AwardCurationClient() {
  const [players, setPlayers] = useState<PlayerAwards[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [editingAward, setEditingAward] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPendingAwards();
  }, []);

  const loadPendingAwards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/awards/pending');
      const data = await response.json();
      setPlayers(data.players || []);
      
      if (data.players.length > 0) {
        setSelectedPlayer(data.players[0].player_name);
      }
    } catch (error) {
      console.error('Failed to load pending awards:', error);
      toast.error('Failed to load awards');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAward = async (awardId: string, verified: boolean) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/awards/${awardId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified })
      });

      if (response.ok) {
        toast.success(verified ? 'Award verified' : 'Award unverified');
        loadPendingAwards();
      } else {
        throw new Error('Failed to update award');
      }
    } catch (error) {
      console.error('Failed to verify award:', error);
      toast.error('Failed to update award');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAward = async (awardId: string, updates: Partial<PendingAward>) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/awards/${awardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        toast.success('Award updated');
        setEditingAward(null);
        loadPendingAwards();
      } else {
        throw new Error('Failed to update award');
      }
    } catch (error) {
      console.error('Failed to update award:', error);
      toast.error('Failed to update award');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAward = async (awardId: string) => {
    if (!confirm('Are you sure you want to delete this award?')) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/awards/${awardId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Award deleted');
        loadPendingAwards();
      } else {
        throw new Error('Failed to delete award');
      }
    } catch (error) {
      console.error('Failed to delete award:', error);
      toast.error('Failed to delete award');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlayerData = players.find(p => p.player_name === selectedPlayer);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Player</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.player_name} value={player.player_name}>
                  {player.player_name} ({player.awards.length} awards)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Awards List */}
      {selectedPlayerData && (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList>
            <TabsTrigger value="pending">
              Pending Review ({selectedPlayerData.awards.filter(a => a.needs_review).length})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({selectedPlayerData.awards.filter(a => a.verified).length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Awards ({selectedPlayerData.awards.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <AwardList
              awards={selectedPlayerData.awards.filter(a => a.needs_review)}
              onVerify={handleVerifyAward}
              onUpdate={handleUpdateAward}
              onDelete={handleDeleteAward}
              editingAward={editingAward}
              setEditingAward={setEditingAward}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="verified">
            <AwardList
              awards={selectedPlayerData.awards.filter(a => a.verified)}
              onVerify={handleVerifyAward}
              onUpdate={handleUpdateAward}
              onDelete={handleDeleteAward}
              editingAward={editingAward}
              setEditingAward={setEditingAward}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="all">
            <AwardList
              awards={selectedPlayerData.awards}
              onVerify={handleVerifyAward}
              onUpdate={handleUpdateAward}
              onDelete={handleDeleteAward}
              editingAward={editingAward}
              setEditingAward={setEditingAward}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface AwardListProps {
  awards: PendingAward[];
  onVerify: (awardId: string, verified: boolean) => void;
  onUpdate: (awardId: string, updates: Partial<PendingAward>) => void;
  onDelete: (awardId: string) => void;
  editingAward: string | null;
  setEditingAward: (awardId: string | null) => void;
  saving: boolean;
}

function AwardList({ awards, onVerify, onUpdate, onDelete, editingAward, setEditingAward, saving }: AwardListProps) {
  if (awards.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No awards found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {awards.map((award) => (
        <AwardCard
          key={award.id}
          award={award}
          onVerify={onVerify}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isEditing={editingAward === award.id}
          onEdit={() => setEditingAward(award.id)}
          onCancel={() => setEditingAward(null)}
          saving={saving}
        />
      ))}
    </div>
  );
}

interface AwardCardProps {
  award: PendingAward;
  onVerify: (awardId: string, verified: boolean) => void;
  onUpdate: (awardId: string, updates: Partial<PendingAward>) => void;
  onDelete: (awardId: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  saving: boolean;
}

function AwardCard({ award, onVerify, onUpdate, onDelete, isEditing, onEdit, onCancel, saving }: AwardCardProps) {
  const [formData, setFormData] = useState({
    name: award.name,
    description: award.description,
    year: award.year,
    organization: award.organization,
    category: award.category,
    significance: award.significance,
    source_url: award.source_url
  });

  const handleSave = () => {
    onUpdate(award.id, formData);
  };

  return (
    <Card className={`${award.verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{award.name}</CardTitle>
            <Badge variant={award.verified ? 'default' : 'secondary'}>
              {award.verified ? 'Verified' : 'Pending'}
            </Badge>
            <Badge variant="outline">
              Confidence: {Math.round(award.confidence * 100)}%
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {!award.verified && (
              <Button
                size="sm"
                onClick={() => onVerify(award.id, true)}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Verify
              </Button>
            )}
            {award.verified && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerify(award.id, false)}
                disabled={saving}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Unverify
              </Button>
            )}
            {!isEditing ? (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(award.id)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Award Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Year</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Organization</label>
                <Input
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Significance</label>
                <Select value={formData.significance} onValueChange={(value: any) => setFormData({ ...formData, significance: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Source URL</label>
              <Input
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <FileText className="h-4 w-4 text-gray-500 mt-1" />
              <div>
                <p className="text-sm text-gray-600">{award.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{award.year}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Building className="h-4 w-4" />
                <span>{award.organization}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Badge variant="outline">{award.category}</Badge>
                <Badge variant="outline">{award.significance}</Badge>
              </div>
            </div>
            {award.source_url && (
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <a
                  href={award.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View Source
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
