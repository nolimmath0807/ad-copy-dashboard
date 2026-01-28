import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { productsApi, copyTypesApi, checklistsApi, teamsApi, teamProductsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Check, X, Plus } from 'lucide-react';
import type { Product, CopyType, Checklist as ChecklistType, Team } from '@/types';

// UTM 코드 문자열을 배열로 파싱 (기존 단일 문자열도 호환)
function parseUtmCodes(utmCode: string | null): string[] {
  if (!utmCode) return [];
  try {
    const parsed = JSON.parse(utmCode);
    if (Array.isArray(parsed)) return parsed;
    return [utmCode];
  } catch {
    return utmCode.trim() ? [utmCode] : [];
  }
}

// UTM 코드 배열을 JSON 문자열로 변환
function stringifyUtmCodes(codes: string[]): string | null {
  if (codes.length === 0) return null;
  return JSON.stringify(codes);
}

// 현재 주차 계산 함수
function getCurrentWeek(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

// 이전 주차 계산
function getPreviousWeek(week: string): string {
  const [year, w] = week.split('-W');
  const weekNum = parseInt(w);
  if (weekNum === 1) {
    return `${parseInt(year) - 1}-W52`;
  }
  return `${year}-W${(weekNum - 1).toString().padStart(2, '0')}`;
}

// 최근 N주 목록 생성
function getRecentWeeks(count: number): string[] {
  const weeks: string[] = [];
  let current = getCurrentWeek();
  for (let i = 0; i < count; i++) {
    weeks.push(current);
    current = getPreviousWeek(current);
  }
  return weeks;
}

// ISO 주차를 날짜 범위 문자열로 변환
function getWeekDateRange(week: string): string {
  const [year, w] = week.split('-W');
  const weekNum = parseInt(w);

  // ISO 주차의 첫 번째 날 (월요일) 계산
  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  // 해당 주차의 월요일
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

  // 해당 주차의 일요일
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  // "2026년 1월 27일 ~ 2월 2일" 형식으로 포맷
  const startYear = weekStart.getFullYear();
  const startMonth = weekStart.getMonth() + 1;
  const startDay = weekStart.getDate();
  const endYear = weekEnd.getFullYear();
  const endMonth = weekEnd.getMonth() + 1;
  const endDay = weekEnd.getDate();

  if (startYear === endYear && startMonth === endMonth) {
    return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endDay}일`;
  }
  if (startYear === endYear) {
    return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endMonth}월 ${endDay}일`;
  }
  return `${startYear}년 ${startMonth}월 ${startDay}일 ~ ${endYear}년 ${endMonth}월 ${endDay}일`;
}

export function Checklist() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [checklists, setChecklists] = useState<ChecklistType[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
  const [lastWeekIncomplete, setLastWeekIncomplete] = useState(0);
  const [utmData, setUtmData] = useState<Record<string, string[]>>({});
  const [newUtmInput, setNewUtmInput] = useState<Record<string, string>>({});

  const recentWeeks = getRecentWeeks(8);
  const isAdmin = user?.is_admin ?? false;
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize selectedTeamId based on user role
  useEffect(() => {
    if (user) {
      if (!isAdmin) {
        setSelectedTeamId(user.team_id);
      }
      setIsInitialized(true);
    }
  }, [user, isAdmin]);

  // Load teams for admin
  useEffect(() => {
    if (isAdmin) {
      teamsApi.list().then(setTeams);
    }
  }, [isAdmin]);

  useEffect(() => {
    // 사용자 초기화가 완료된 후에만 데이터 로드
    if (isInitialized) {
      fetchData();
    }
  }, [selectedWeek, selectedTeamId, isInitialized]);

  async function fetchData() {
    setLoading(true);
    try {
      console.log('[Checklist] fetchData called with selectedTeamId:', selectedTeamId);

      const [allProductsData, copyTypesData, checklistsData, teamProductsData] = await Promise.all([
        productsApi.list(),
        copyTypesApi.list(),
        checklistsApi.list(selectedTeamId),
        selectedTeamId ? teamProductsApi.list(selectedTeamId) : Promise.resolve([]),
      ]);

      console.log('[Checklist] allProducts:', allProductsData.length);
      console.log('[Checklist] teamProducts:', teamProductsData.length, teamProductsData);

      // 팀이 선택된 경우 해당 팀에 할당된 상품만 필터링
      let productsData = allProductsData;
      if (selectedTeamId && teamProductsData.length > 0) {
        const assignedProductIds = teamProductsData.map((tp: any) => tp.product_id);
        console.log('[Checklist] assignedProductIds:', assignedProductIds);
        productsData = allProductsData.filter((p: any) => assignedProductIds.includes(p.id));
        console.log('[Checklist] filtered products:', productsData.length);
      } else if (selectedTeamId && teamProductsData.length === 0) {
        // 팀에 할당된 상품이 없으면 빈 배열
        productsData = [];
        console.log('[Checklist] no products assigned to team');
      }

      setProducts(productsData);
      setCopyTypes(copyTypesData);

      // 선택한 주차 데이터만 필터링
      const filteredChecklists = checklistsData.filter((c: any) => c.week === selectedWeek);
      setChecklists(filteredChecklists);

      // UTM 데이터 초기화 (배열로 파싱)
      const data: Record<string, string[]> = {};
      filteredChecklists.forEach((c: ChecklistType) => {
        const key = `${c.product_id}-${c.copy_type_id}`;
        data[key] = parseUtmCodes(c.utm_code);
      });
      setUtmData(data);
      setNewUtmInput({});

      // 지난주 미완료 카운트 (UTM 코드 없거나 빈 배열인 것)
      const lastWeek = getPreviousWeek(selectedWeek);
      const lastWeekData = checklistsData.filter((c: any) => {
        if (c.week !== lastWeek) return false;
        const codes = parseUtmCodes(c.utm_code);
        return codes.length === 0;
      });
      setLastWeekIncomplete(lastWeekData.length);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getChecklist(productId: string, copyTypeId: string): ChecklistType | undefined {
    return checklists.find(c => c.product_id === productId && c.copy_type_id === copyTypeId);
  }

  function getInputKey(productId: string, copyTypeId: string): string {
    return `${productId}-${copyTypeId}`;
  }

  function getUtmCodes(productId: string, copyTypeId: string): string[] {
    const key = getInputKey(productId, copyTypeId);
    return utmData[key] || [];
  }

  async function saveUtmCodes(productId: string, copyTypeId: string, codes: string[]) {
    const checklist = getChecklist(productId, copyTypeId);
    if (!checklist) return;

    const utmCodeString = stringifyUtmCodes(codes);
    const status = codes.length > 0 ? 'completed' : 'pending';

    try {
      await checklistsApi.update(checklist.id, {
        utm_code: utmCodeString || undefined,
        status
      });

      // 로컬 상태 업데이트
      const key = getInputKey(productId, copyTypeId);
      setUtmData(prev => ({ ...prev, [key]: codes }));
      setChecklists(prev => prev.map(c =>
        c.id === checklist.id
          ? { ...c, utm_code: utmCodeString, status }
          : c
      ));
    } catch (error) {
      console.error('Failed to update UTM codes:', error);
    }
  }

  async function handleAddUtm(productId: string, copyTypeId: string) {
    const key = getInputKey(productId, copyTypeId);
    const newValue = (newUtmInput[key] || '').trim();
    if (!newValue) return;

    const currentCodes = getUtmCodes(productId, copyTypeId);
    const updatedCodes = [...currentCodes, newValue];
    await saveUtmCodes(productId, copyTypeId, updatedCodes);
    setNewUtmInput(prev => ({ ...prev, [key]: '' }));
  }

  async function handleRemoveUtm(productId: string, copyTypeId: string, index: number) {
    const currentCodes = getUtmCodes(productId, copyTypeId);
    const updatedCodes = currentCodes.filter((_, i) => i !== index);
    await saveUtmCodes(productId, copyTypeId, updatedCodes);
  }

  // 부모 유형만 필터링 (parent_id가 null인 것)
  const parentCopyTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 완료율 계산 (UTM 코드가 1개 이상인 것)
  const completedCount = checklists.filter(c => parseUtmCodes(c.utm_code).length > 0).length;
  const totalCount = checklists.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) return <><Header title="체크리스트" /><div className="p-6">로딩 중...</div></>;

  return (
    <>
      <Header title="체크리스트" />
      <div className="p-6 space-y-6">
        {/* 지난주 미완료 알림 */}
        {lastWeekIncomplete > 0 && (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">지난주 미입력 항목: {lastWeekIncomplete}개</span>
          </div>
        )}

        {/* 주차 선택 + 팀 필터 + 진행률 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-64">
                  <SelectValue>{getWeekDateRange(selectedWeek)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {recentWeeks.map(week => (
                    <SelectItem key={week} value={week}>{getWeekDateRange(week)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Select value={selectedTeamId || 'all'} onValueChange={(value) => setSelectedTeamId(value === 'all' ? undefined : value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold">{completionRate}%</span>
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>완료 (UTM 입력): {completedCount}</span>
              <span>미입력: {totalCount - completedCount}</span>
              <span>전체: {totalCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* 매트릭스: 유형(행) × 상품(열) - UTM 입력 */}
        <Card>
          <CardHeader>
            <CardTitle>원고 유형 × 상품 매트릭스</CardTitle>
            <p className="text-sm text-muted-foreground">각 셀에 UTM 코드를 입력하세요. 입력 후 Enter 또는 포커스 아웃 시 저장됩니다.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border px-4 py-3 bg-muted text-left min-w-48">원고 유형</th>
                    {products.map(product => (
                      <th key={product.id} className="border px-4 py-3 bg-muted text-center min-w-36">
                        {product.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parentCopyTypes.map(copyType => (
                    <tr key={copyType.id}>
                      <td className="border px-4 py-3">
                        <div className="font-medium mb-1">[{copyType.code}] {copyType.name}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">{copyType.core_concept}</div>
                      </td>
                      {products.map(product => {
                        const checklist = getChecklist(product.id, copyType.id);
                        const key = getInputKey(product.id, copyType.id);
                        const codes = getUtmCodes(product.id, copyType.id);
                        const hasUtm = codes.length > 0;

                        // 셀 표시 텍스트
                        const displayText = codes.length === 0
                          ? '-'
                          : codes.length === 1
                            ? codes[0]
                            : `${codes[0]} 외 ${codes.length - 1}개`;

                        return (
                          <td key={product.id} className="border px-2 py-2">
                            {checklist ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className={`w-full text-left text-xs px-2 py-1.5 rounded border flex items-center justify-between gap-1 hover:bg-muted/50 transition-colors ${
                                      hasUtm ? 'border-green-500 bg-green-50' : 'border-input bg-white'
                                    }`}
                                  >
                                    <span className={`truncate ${!hasUtm ? 'text-muted-foreground' : ''}`}>
                                      {displayText}
                                    </span>
                                    {hasUtm && (
                                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80" align="start">
                                  <div className="space-y-3">
                                    <div className="font-medium text-sm">UTM 코드 관리</div>

                                    {/* 기존 UTM 코드 목록 */}
                                    {codes.length > 0 ? (
                                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {codes.map((code, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1.5"
                                          >
                                            <span className="flex-1 truncate font-mono text-xs">{code}</span>
                                            <button
                                              onClick={() => handleRemoveUtm(product.id, copyType.id, index)}
                                              className="text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">등록된 UTM 코드가 없습니다.</p>
                                    )}

                                    {/* 새 UTM 추가 */}
                                    <div className="flex gap-2">
                                      <Input
                                        value={newUtmInput[key] || ''}
                                        onChange={(e) => setNewUtmInput(prev => ({ ...prev, [key]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddUtm(product.id, copyType.id);
                                          }
                                        }}
                                        placeholder="새 UTM 코드 입력"
                                        className="text-xs h-8"
                                      />
                                      <Button
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => handleAddUtm(product.id, copyType.id)}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-muted-foreground text-center block">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
