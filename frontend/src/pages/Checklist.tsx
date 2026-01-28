import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productsApi, copyTypesApi, checklistsApi } from '@/lib/api-client';
import { AlertTriangle, Check } from 'lucide-react';
import type { Product, CopyType, Checklist as ChecklistType } from '@/types';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [checklists, setChecklists] = useState<ChecklistType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [lastWeekIncomplete, setLastWeekIncomplete] = useState(0);
  const [utmInputs, setUtmInputs] = useState<Record<string, string>>({});

  const recentWeeks = getRecentWeeks(8);

  useEffect(() => {
    fetchData();
  }, [selectedWeek]);

  async function fetchData() {
    setLoading(true);
    try {
      const [productsData, copyTypesData, checklistsData] = await Promise.all([
        productsApi.list(),
        copyTypesApi.list(),
        checklistsApi.list(),
      ]);
      setProducts(productsData);
      setCopyTypes(copyTypesData);

      // 선택한 주차 데이터만 필터링
      const filteredChecklists = checklistsData.filter((c: any) => c.week === selectedWeek);
      setChecklists(filteredChecklists);

      // UTM 입력값 초기화
      const inputs: Record<string, string> = {};
      filteredChecklists.forEach((c: ChecklistType) => {
        const key = `${c.product_id}-${c.copy_type_id}`;
        inputs[key] = c.utm_code || '';
      });
      setUtmInputs(inputs);

      // 지난주 미완료 카운트 (UTM 코드 없는 것)
      const lastWeek = getPreviousWeek(selectedWeek);
      const lastWeekData = checklistsData.filter((c: any) => c.week === lastWeek && !c.utm_code);
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

  function handleUtmChange(productId: string, copyTypeId: string, value: string) {
    const key = getInputKey(productId, copyTypeId);
    setUtmInputs(prev => ({ ...prev, [key]: value }));
  }

  async function handleUtmSave(productId: string, copyTypeId: string) {
    const key = getInputKey(productId, copyTypeId);
    const utmCode = utmInputs[key] || '';
    const checklist = getChecklist(productId, copyTypeId);

    if (!checklist) return;

    try {
      // UTM 코드가 있으면 completed, 없으면 pending
      const status = utmCode.trim() ? 'completed' : 'pending';
      await checklistsApi.update(checklist.id, {
        utm_code: utmCode.trim() || undefined,
        status
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update UTM code:', error);
    }
  }

  // 부모 유형만 필터링 (parent_id가 null인 것)
  const parentCopyTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 완료율 계산 (UTM 코드가 있는 것)
  const completedCount = checklists.filter(c => c.utm_code).length;
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

        {/* 주차 선택 + 진행률 */}
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
                        const utmValue = utmInputs[key] || '';
                        const hasUtm = utmValue.trim().length > 0;

                        return (
                          <td key={product.id} className="border px-2 py-2">
                            {checklist ? (
                              <div className="relative">
                                <Input
                                  value={utmValue}
                                  onChange={(e) => handleUtmChange(product.id, copyType.id, e.target.value)}
                                  onBlur={() => handleUtmSave(product.id, copyType.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUtmSave(product.id, copyType.id);
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  placeholder="UTM 코드"
                                  className={`text-xs h-8 pr-7 ${hasUtm ? 'border-green-500 bg-green-50' : ''}`}
                                />
                                {hasUtm && (
                                  <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                                )}
                              </div>
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
