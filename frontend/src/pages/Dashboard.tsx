import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { productsApi, copyTypesApi, teamsApi, dashboardApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle, BarChart3, Info, Users, LayoutDashboard } from 'lucide-react';
import type { Product, CopyType, Team } from '@/types';

const SERVICE_START_WEEK = '2026-W05';

// 현재 주차 계산
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getWeekDateRange(week: string): string {
  const [year, w] = week.split('-W');
  const weekNum = parseInt(w);
  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}~${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
}

function generateWeekOptions() {
  const options: { value: string; label: string }[] = [];
  const currentWeek = getCurrentWeek();
  const [currentYear, currentW] = currentWeek.split('-W');
  let year = parseInt(currentYear);
  let weekNum = parseInt(currentW);

  for (let i = 0; i < 8; i++) {
    const value = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    if (value < SERVICE_START_WEEK) break;
    const label = getWeekDateRange(value);
    options.push({ value, label });
    weekNum--;
    if (weekNum === 0) {
      year--;
      weekNum = 52;
    }
  }
  return options;
}

interface DashboardSummary {
  generation_matrix: { product_id: string; copy_type_id: string; count: number }[];
  total_generations: number;
  recent_copies: { id: string; created_at: string; products: { name: string }; copy_types: { code: string } }[];
  checklist_stats: { total: number; filled: number; completion_rate: number };
  team_checklist_stats: Record<string, { total: number; filled: number; completion_rate: number }>;
}

export function Dashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const weekOptions = generateWeekOptions();
  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0]?.value ?? '');

  const isAdminOrLeader = user?.role === 'admin' || user?.role === 'leader';
  const currentWeek = getCurrentWeek();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [productsData, copyTypesData, teamsData, summaryData] = await Promise.all([
          productsApi.list(),
          copyTypesApi.list(),
          teamsApi.list(),
          dashboardApi.summary(selectedWeek || currentWeek),
        ]);
        setProducts(productsData);
        setCopyTypes(copyTypesData);
        setTeams(teamsData);
        setSummary(summaryData);

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
  }, [selectedWeek]);

  // 부모 유형만 필터링
  const parentCopyTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 이번 주 전체 체크리스트 완료율
  const weekCompletionRate = summary?.checklist_stats.completion_rate ?? 0;
  const weekFilledCount = summary?.checklist_stats.filled ?? 0;
  const weekTotalCount = summary?.checklist_stats.total ?? 0;

  // 팀별 체크리스트 완수율
  const teamStats = selectedTeamId ? summary?.team_checklist_stats[selectedTeamId] : undefined;
  const teamCompletionRate = teamStats?.completion_rate ?? 0;
  const teamFilledCount = teamStats?.filled ?? 0;
  const teamTotalCount = teamStats?.total ?? 0;

  // 상품 × 유형별 생성 횟수 계산
  const getGenerationCount = (productId: string, copyTypeId: string): number => {
    const item = summary?.generation_matrix.find(
      m => m.product_id === productId && m.copy_type_id === copyTypeId
    );
    return item?.count || 0;
  };

  const totalGenerations = summary?.total_generations ?? 0;

  if (loading) {
    return (
      <>
        <Header title="대시보드" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="대시보드" />
      <div className="p-6 space-y-6">
        {/* 주간 선택 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">주간 선택</span>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="주간 선택" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
            {summary?.generation_matrix.length === 0 ? (
              <EmptyState
                icon={LayoutDashboard}
                title="데이터가 없습니다"
                description="선택한 주간에 생성된 원고가 없습니다"
              />
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* 최근 생성 원고 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 생성 원고</CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.recent_copies.length ? (
              <p className="text-muted-foreground">아직 생성된 원고가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {summary.recent_copies.map((copy) => (
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
