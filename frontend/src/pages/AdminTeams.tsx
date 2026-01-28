import { useState, useEffect, Fragment } from 'react';
import { teamsApi, teamProductsApi, productsApi } from '@/lib/api-client';
import type { Team, TeamProduct, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Package } from 'lucide-react';

export default function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [teamProducts, setTeamProducts] = useState<TeamProduct[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const loadData = async () => {
    const [teamsData, productsData, teamProductsData] = await Promise.all([
      teamsApi.list(),
      productsApi.list(),
      teamProductsApi.list(),
    ]);
    setTeams(teamsData);
    setProducts(productsData);
    setTeamProducts(teamProductsData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTeamProductIds = (teamId: string): string[] => {
    return teamProducts
      .filter(tp => tp.team_id === teamId)
      .map(tp => tp.product_id);
  };

  const getTeamProductEntry = (teamId: string, productId: string): TeamProduct | undefined => {
    return teamProducts.find(tp => tp.team_id === teamId && tp.product_id === productId);
  };

  const handleProductToggle = async (teamId: string, productId: string, checked: boolean) => {
    if (checked) {
      const newTeamProduct = await teamProductsApi.create(teamId, productId);
      setTeamProducts(prev => [...prev, newTeamProduct]);
    } else {
      const entry = getTeamProductEntry(teamId, productId);
      if (entry) {
        await teamProductsApi.delete(entry.id);
        setTeamProducts(prev => prev.filter(tp => tp.id !== entry.id));
      }
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await teamsApi.create({ name: newTeamName });
    setNewTeamName('');
    loadData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('정말 이 팀을 삭제하시겠습니까?')) return;
    await teamsApi.delete(teamId);
    loadData();
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>팀 관리</CardTitle>
          <CardDescription>팀 목록을 관리합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddTeam} className="flex gap-2">
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="새 팀 이름"
              className="max-w-xs"
            />
            <Button type="submit" disabled={!newTeamName.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              추가
            </Button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>팀 이름</TableHead>
                  <TableHead>담당 상품</TableHead>
                  <TableHead>생성일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => {
                  const assignedProductIds = getTeamProductIds(team.id);
                  const assignedCount = assignedProductIds.length;
                  const isExpanded = expandedTeamId === team.id;

                  return (
                    <Fragment key={team.id}>
                      <TableRow>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                          >
                            <Package className="w-4 h-4" />
                            <span>{assignedCount}개 상품</span>
                          </Button>
                        </TableCell>
                        <TableCell>{new Date(team.created_at).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4} className="bg-muted/30">
                            <div className="py-2 px-4">
                              <div className="text-sm font-medium mb-3">담당 상품 설정</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {products.map((product) => {
                                  const isAssigned = assignedProductIds.includes(product.id);
                                  return (
                                    <label
                                      key={product.id}
                                      className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted/50 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={isAssigned}
                                        onCheckedChange={(checked) => handleProductToggle(team.id, product.id, checked as boolean)}
                                      />
                                      <span className="text-sm">{product.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
