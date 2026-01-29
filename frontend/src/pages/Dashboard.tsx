import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { productsApi, copyTypesApi, checklistsApi, copiesApi, teamsApi, teamProductsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, BarChart3, Info, Users } from 'lucide-react';
import type { Product, CopyType, GeneratedCopy, Team, Checklist as ChecklistType } from '@/types';

// 현재 주차 계산
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

export function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [allCopies, setAllCopies] = useState<GeneratedCopy[]>([]);
  const [allChecklists, setAllChecklists] = useState<ChecklistType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [teamProductIds, setTeamProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminOrLeader = user?.role === 'admin' || user?.role === 'leader';
  const currentWeek = getCurrentWeek();

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, copyTypesData, copiesData, checklistsData, teamsData] = await Promise.all([
          productsApi.list(),
          copyTypesApi.list(),
          copiesApi.list(),
          checklistsApi.list(undefined, currentWeek),
          teamsApi.list(),
        ]);
        setProducts(productsData);
        setCopyTypes(copyTypesData);
        setAllCopies(copiesData);
        setAllChecklists(checklistsData);
        setTeams(teamsData);

        // Set initial team for non-admin
        if (!isAdminOrLeader && user?.team_id) {
          setSelectedTeamId(user.team_id);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch team products when selectedTeamId changes
  useEffect(() => {
    if (selectedTeamId) {
      teamProductsApi.list(selectedTeamId).then((data) => {
        setTeamProductIds(data.map((tp: any) => tp.product_id));
      });
    } else {
      setTeamProductIds([]);
    }
  }, [selectedTeamId]);

  // 부모 유형만 필터링
  const parentCopyTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 이번 주 전체 체크리스트 완료율 (UTM 입력 기준)
  const weekChecklists = allChecklists;
  const weekFilledCount = weekChecklists.filter(c => c.utm_code && c.utm_code !== '[]').length;
  const weekTotalCount = weekChecklists.length;
  const weekCompletionRate = weekTotalCount > 0 ? Math.round((weekFilledCount / weekTotalCount) * 100) : 0;

  // 팀별 체크리스트 완수율
  const teamWeekChecklists = selectedTeamId && teamProductIds.length > 0
    ? weekChecklists.filter(c => teamProductIds.includes(c.product_id))
    : [];
  const teamFilledCount = teamWeekChecklists.filter(c => c.utm_code && c.utm_code !== '[]').length;
  const teamTotalCount = teamWeekChecklists.length;
  const teamCompletionRate = teamTotalCount > 0 ? Math.round((teamFilledCount / teamTotalCount) * 100) : 0;

  // 상품 × 유형별 생성 횟수 계산
  function getGenerationCount(productId: string, copyTypeId: string): number {
    const childTypeIds = copyTypes
      .filter(ct => ct.parent_id === copyTypeId)
      .map(ct => ct.id);
    const allTypeIds = [copyTypeId, ...childTypeIds];
    return allCopies.filter(
      copy => copy.product_id === productId && allTypeIds.includes(copy.copy_type_id)
    ).length;
  }

  const totalGenerations = allCopies.length;

  if (loading) {
    return (
      <>
        <Header title="대시보드" />
        <div className="p-6">로딩 중...</div>
      </>
    );
  }

  return (
    <>
      <Header title="대시보드" />
      <div className="p-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4">
          {/* 팀별 완수율 카드 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {isAdminOrLeader ? '팀별 완수율' : '내 팀 완수율'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isAdminOrLeader && (
                <Select value={selectedTeamId || ''} onValueChange={(value) => setSelectedTeamId(value || undefined)}>
                  <SelectTrigger className="w-full h-8 text-xs mb-2">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedTeamId ? (
                <>
                  <div className="text-2xl font-bold">{teamCompletionRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {teamFilledCount} / {teamTotalCount} 셀 입력
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {isAdminOrLeader ? '팀을 선택하세요' : '-'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">원고 유형</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentCopyTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                세부 스타일 {copyTypes.length - parentCopyTypes.length}개
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">총 생성 횟수</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGenerations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1">
                <CardTitle className="text-sm font-medium">전체 팀 기준 체크리스트 완료율</CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 text-sm" side="bottom">
                    이번 주 체크리스트의 전체 셀 중 UTM 코드가 입력된 셀의 비율입니다.
                  </PopoverContent>
                </Popover>
              </div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{weekCompletionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {weekFilledCount} / {weekTotalCount} 셀 입력
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 상품 × 유형별 생성 횟수 매트릭스 */}
        <Card>
          <CardHeader>
            <CardTitle>상품별 원고 생성 현황</CardTitle>
            <p className="text-sm text-muted-foreground">각 셀은 해당 상품 x 유형 조합의 원고 생성 횟수입니다</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-4 py-3 bg-muted text-left min-w-40">원고 유형</th>
                    {products.map(product => (
                      <th key={product.id} className="border px-4 py-3 bg-muted text-center min-w-24">
                        {product.name}
                      </th>
                    ))}
                    <th className="border px-4 py-3 bg-muted text-center min-w-20">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {parentCopyTypes.map(copyType => {
                    const rowTotal = products.reduce(
                      (sum, product) => sum + getGenerationCount(product.id, copyType.id),
                      0
                    );
                    return (
                      <tr key={copyType.id}>
                        <td className="border px-4 py-3">
                          <div className="font-medium">[{copyType.code}] {copyType.name}</div>
                        </td>
                        {products.map(product => {
                          const count = getGenerationCount(product.id, copyType.id);
                          return (
                            <td key={product.id} className="border px-4 py-3 text-center">
                              {count > 0 ? (
                                <Badge variant={count >= 3 ? "default" : "secondary"}>
                                  {count}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="border px-4 py-3 text-center font-bold">
                          {rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                  {/* 합계 행 */}
                  <tr className="bg-muted/50">
                    <td className="border px-4 py-3 font-bold">합계</td>
                    {products.map(product => {
                      const colTotal = parentCopyTypes.reduce(
                        (sum, ct) => sum + getGenerationCount(product.id, ct.id),
                        0
                      );
                      return (
                        <td key={product.id} className="border px-4 py-3 text-center font-bold">
                          {colTotal}
                        </td>
                      );
                    })}
                    <td className="border px-4 py-3 text-center font-bold text-primary">
                      {totalGenerations}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 최근 생성 원고 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 생성 원고</CardTitle>
          </CardHeader>
          <CardContent>
            {allCopies.length === 0 ? (
              <p className="text-muted-foreground">아직 생성된 원고가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {allCopies.slice(0, 5).map((copy) => (
                  <div key={copy.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <span className="font-medium">{copy.products?.name}</span>
                      <Badge variant="outline" className="ml-2">{copy.copy_types?.code}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(copy.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
