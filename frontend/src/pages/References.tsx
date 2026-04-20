import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { referencesApi } from '@/lib/api-client';
import type { ReferenceScript, ReferenceFilters } from '@/types';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const LIMIT = 20;
const ALL_VALUE = '__all__';

function ScriptCard({ script }: { script: ReferenceScript }) {
  const [expanded, setExpanded] = useState(false);

  const lines = script.script_text.split('\n');
  const maxLines = 8;
  const shouldTruncate = lines.length > maxLines;
  const displayedText = expanded || !shouldTruncate
    ? script.script_text
    : lines.slice(0, maxLines).join('\n');

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{script.advertiser_name}</span>
          {script.hook_type && (
            <Badge variant="secondary">{script.hook_type}</Badge>
          )}
          {script.cta_type && (
            <Badge variant="outline">{script.cta_type}</Badge>
          )}
          {script.selling_point && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{script.selling_point}</Badge>
          )}
          {script.script_type && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{script.script_type}</Badge>
          )}
        </div>

        {script.hook_first_line && (
          <p className="text-xs text-muted-foreground italic">"{script.hook_first_line}"</p>
        )}

        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
          {displayedText}
          {!expanded && shouldTruncate && '...'}
        </pre>

        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs text-muted-foreground">
            {script.line_count !== null && <span>{script.line_count}줄</span>}
            {script.char_count !== null && <span>{script.char_count.toLocaleString()}자</span>}
          </div>
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>접기 <ChevronUp className="h-3 w-3" /></>
              ) : (
                <>더보기 <ChevronDown className="h-3 w-3" /></>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function References() {
  const [scripts, setScripts] = useState<ReferenceScript[]>([]);
  const [filters, setFilters] = useState<ReferenceFilters>({
    hook_types: [],
    selling_points: [],
    script_types: [],
    advertisers: [],
  });
  const [hookType, setHookType] = useState<string>(ALL_VALUE);
  const [sellingPoint, setSellingPoint] = useState<string>(ALL_VALUE);
  const [scriptType, setScriptType] = useState<string>(ALL_VALUE);
  const [advertiser, setAdvertiser] = useState<string>(ALL_VALUE);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(true);

  useEffect(() => {
    referencesApi.filters()
      .then(setFilters)
      .finally(() => setFiltersLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    referencesApi.list({
      hook_type: hookType !== ALL_VALUE ? hookType : undefined,
      selling_point: sellingPoint !== ALL_VALUE ? sellingPoint : undefined,
      script_type: scriptType !== ALL_VALUE ? scriptType : undefined,
      advertiser: advertiser !== ALL_VALUE ? advertiser : undefined,
      limit: LIMIT,
      offset,
    })
      .then(setScripts)
      .finally(() => setLoading(false));
  }, [hookType, sellingPoint, scriptType, advertiser, offset]);

  function handleFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setOffset(0);
    };
  }

  function handleReset() {
    setHookType(ALL_VALUE);
    setSellingPoint(ALL_VALUE);
    setScriptType(ALL_VALUE);
    setAdvertiser(ALL_VALUE);
    setOffset(0);
  }

  const hasFilters = hookType !== ALL_VALUE || sellingPoint !== ALL_VALUE || scriptType !== ALL_VALUE || advertiser !== ALL_VALUE;

  return (
    <div>
      <Header title="레퍼런스 원고" />
      <div className="p-6 space-y-6">
        {/* 필터바 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">후킹 유형</span>
            <Select value={hookType} onValueChange={handleFilterChange(setHookType)} disabled={filtersLoading}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>전체</SelectItem>
                {filters.hook_types.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">소구점</span>
            <Select value={sellingPoint} onValueChange={handleFilterChange(setSellingPoint)} disabled={filtersLoading}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>전체</SelectItem>
                {filters.selling_points.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">원고 유형</span>
            <Select value={scriptType} onValueChange={handleFilterChange(setScriptType)} disabled={filtersLoading}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>전체</SelectItem>
                {filters.script_types.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">광고주</span>
            <Select value={advertiser} onValueChange={handleFilterChange(setAdvertiser)} disabled={filtersLoading}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>전체</SelectItem>
                {filters.advertisers.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              초기화
            </Button>
          )}
        </div>

        {/* 결과 정보 */}
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {offset + 1}~{offset + scripts.length}번째 결과
            {scripts.length === LIMIT && ' (다음 페이지 있음)'}
          </p>
        )}

        {/* 스크립트 목록 */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">조건에 맞는 레퍼런스 원고가 없습니다.</p>
            {hasFilters && (
              <Button variant="link" size="sm" onClick={handleReset} className="mt-2">
                필터 초기화
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map((script) => (
              <ScriptCard key={script.script_id} script={script} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {!loading && scripts.length > 0 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={scripts.length < LIMIT}
              onClick={() => setOffset(offset + LIMIT)}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
