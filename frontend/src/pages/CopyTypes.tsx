import { useEffect, useState, Fragment } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { copyTypesApi } from '@/lib/api-client';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pencil, Trash2, FileText, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { CopyType, CopyTypeCreate } from '@/types';

const initialFormData: CopyTypeCreate = {
  code: '',
  name: '',
  description: '',
  core_concept: '',
  example_copy: '',
  prompt_template: '',
  variant_name: '',
};

export function CopyTypes() {
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'leader';

  // Script auto-create state
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Similarity warning state
  const [similarityDialogOpen, setSimilarityDialogOpen] = useState(false);
  const [similarityResult, setSimilarityResult] = useState<{
    is_similar: boolean;
    similar_types: Array<{ id: string; code: string; name: string; structure_similarity: number; persuasion_similarity: number; similarity_percent: number; reason: string }>;
  } | null>(null);
  const [pendingCreateData, setPendingCreateData] = useState<CopyTypeCreate | null>(null);
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);

  // Edit state (keeps existing form)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CopyTypeCreate>(initialFormData);

  useEffect(() => {
    fetchCopyTypes();
  }, []);

  async function fetchCopyTypes() {
    setLoading(true);
    const data = await copyTypesApi.list();
    setCopyTypes(data);
    setLoading(false);
  }

  // === Script Auto-Create Flow ===
  function handleOpenScriptDialog() {
    setScriptText('');
    setScriptDialogOpen(true);
  }

  async function handleAnalyzeAndCreate() {
    if (!scriptText.trim()) {
      toast.error('원고 스크립트를 입력해주세요');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await copyTypesApi.autoAnalyze(scriptText);
      setAnalyzing(false);

      if (!result.extracted) {
        toast.error('AI 분석에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      const createData: CopyTypeCreate = {
        code: result.extracted.code,
        name: result.extracted.name,
        core_concept: result.extracted.core_concept,
        description: result.extracted.description,
        example_copy: scriptText,
        prompt_template: '',
      };

      if (result.is_similar && result.similar_types.length > 0) {
        const maxStructure = Math.max(...result.similar_types.map(st => st.structure_similarity || 0));

        setPendingCreateData(createData);
        setSimilarityResult(result);
        setScriptDialogOpen(false);

        if (maxStructure >= 92) {
          // Definite similar - show confirmation (can only add as child)
          setSimilarityDialogOpen(true);
        } else if (maxStructure >= 80) {
          // Ambiguous - let user choose
          setChoiceDialogOpen(true);
        } else {
          // Below 80% - auto create
          await copyTypesApi.create(createData);
          toast.success(`원고유형 "${createData.name}" (${createData.code})이 자동 생성되었습니다`);
          fetchCopyTypes();
        }
      } else {
        await copyTypesApi.create(createData);
        toast.success(`원고유형 "${createData.name}" (${createData.code})이 자동 생성되었습니다`);
        setScriptDialogOpen(false);
        fetchCopyTypes();
      }
    } catch {
      setAnalyzing(false);
      toast.error('분석 중 오류가 발생했습니다');
    }
  }

  async function handleForceCreate() {
    if (!pendingCreateData || !similarityResult) return;
    try {
      // Find the most similar type (highest similarity_percent)
      const mostSimilar = similarityResult.similar_types.reduce((a, b) =>
        a.similarity_percent > b.similarity_percent ? a : b
      );
      // Resolve to root parent - if mostSimilar is a child, use its parent_id instead
      const similarType = copyTypes.find(ct => ct.id === mostSimilar.id);
      const rootParentId = similarType?.parent_id || mostSimilar.id;
      const rootParent = copyTypes.find(ct => ct.id === rootParentId);
      const childData: CopyTypeCreate = {
        ...pendingCreateData,
        parent_id: rootParentId,
        variant_name: pendingCreateData.name,
      };
      await copyTypesApi.create(childData);
      toast.success(`"${rootParent?.name || mostSimilar.name}" 하위에 "${childData.variant_name}" 변형이 생성되었습니다`);
      setSimilarityDialogOpen(false);
      setSimilarityResult(null);
      setPendingCreateData(null);
      fetchCopyTypes();
    } catch {
      toast.error('생성 중 오류가 발생했습니다');
    }
  }

  async function handleCreateAsNew() {
    if (!pendingCreateData) return;
    try {
      await copyTypesApi.create(pendingCreateData);
      toast.success(`신규 원고유형 "${pendingCreateData.name}" (${pendingCreateData.code})이 생성되었습니다`);
      setChoiceDialogOpen(false);
      setSimilarityResult(null);
      setPendingCreateData(null);
      fetchCopyTypes();
    } catch {
      toast.error('생성 중 오류가 발생했습니다');
    }
  }

  async function handleCreateAsChild() {
    if (!pendingCreateData || !similarityResult) return;
    try {
      const mostSimilar = similarityResult.similar_types.reduce((a, b) =>
        a.structure_similarity > b.structure_similarity ? a : b
      );
      const similarType = copyTypes.find(ct => ct.id === mostSimilar.id);
      const rootParentId = similarType?.parent_id || mostSimilar.id;
      const rootParent = copyTypes.find(ct => ct.id === rootParentId);
      const childData: CopyTypeCreate = {
        ...pendingCreateData,
        parent_id: rootParentId,
        variant_name: pendingCreateData.name,
      };
      await copyTypesApi.create(childData);
      toast.success(`"${rootParent?.name || mostSimilar.name}" 하위에 "${childData.variant_name}" 변형이 생성되었습니다`);
      setChoiceDialogOpen(false);
      setSimilarityResult(null);
      setPendingCreateData(null);
      fetchCopyTypes();
    } catch {
      toast.error('생성 중 오류가 발생했습니다');
    }
  }

  // === Edit Flow (unchanged) ===
  function handleOpenEdit(copyType: CopyType) {
    setEditingId(copyType.id);
    setFormData({
      code: copyType.code,
      name: copyType.name,
      description: copyType.description || '',
      core_concept: copyType.core_concept || '',
      example_copy: copyType.example_copy || '',
      prompt_template: copyType.prompt_template || '',
      variant_name: copyType.variant_name || '',
    });
    setEditDialogOpen(true);
  }

  async function handleEditSubmit() {
    if (!editingId) return;
    try {
      await copyTypesApi.update(editingId, formData);
      toast.success('원고유형이 수정되었습니다');
      setEditDialogOpen(false);
      fetchCopyTypes();
    } catch {
      toast.error('오류가 발생했습니다');
    }
  }

  async function handleDelete(id: string) {
    if (confirm('정말 삭제하시겠습니까?')) {
      try {
        await copyTypesApi.delete(id);
        toast.success('원고유형이 삭제되었습니다');
        fetchCopyTypes();
      } catch {
        toast.error('오류가 발생했습니다');
      }
    }
  }

  function handleChange(field: keyof CopyTypeCreate, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <Header title="원고 유형 관리" />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            광고 원고의 유형을 관리합니다. 각 유형별 핵심 콘셉트와 프롬프트 템플릿을 설정할 수 있습니다.
          </p>
          {canManage && (
            <Button onClick={handleOpenScriptDialog} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Sparkles className="mr-2 h-4 w-4" />
              AI 유형 추가
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
        ) : copyTypes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="등록된 원고유형이 없습니다"
            description="새 원고유형을 추가하여 시작하세요"
            action={canManage ? <Button onClick={handleOpenScriptDialog} className="bg-primary text-primary-foreground hover:bg-primary/90"><Sparkles className="mr-2 h-4 w-4" />AI 유형 추가</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">코드</TableHead>
                <TableHead className="w-[150px]">이름/스타일</TableHead>
                <TableHead>핵심 콘셉트</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[100px] text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {copyTypes
                .filter(ct => !ct.parent_id)
                .map((parent) => (
                  <Fragment key={parent.id}>
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-mono font-bold">{parent.code}</TableCell>
                      <TableCell className="font-bold">{parent.name}</TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {parent.core_concept || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {parent.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(parent)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(parent.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                    {copyTypes
                      .filter(ct => ct.parent_id === parent.id)
                      .map((child) => (
                        <TableRow key={child.id} className="bg-white">
                          <TableCell className="font-mono text-muted-foreground pl-6">
                            └ {child.code}
                          </TableCell>
                          <TableCell className="text-sm">{child.variant_name || child.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                            {child.core_concept || '-'}
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                            {child.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {canManage && (
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(child)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(child.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Script Auto-Create Dialog */}
      <Dialog open={scriptDialogOpen} onOpenChange={setScriptDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI 원고 유형 자동 추가
            </DialogTitle>
            <DialogDescription>
              원고 스크립트를 붙여넣으면 AI가 자동으로 유형을 분석하고 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="script">원고 스크립트</Label>
            <Textarea
              id="script"
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="원고 스크립트를 여기에 붙여넣으세요..."
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              AI가 원고를 분석하여 코드, 이름, 핵심 콘셉트, 설명을 자동 추출하고, 기존 유형과의 유사도를 검사합니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScriptDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAnalyzeAndCreate} disabled={!scriptText.trim() || analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 분석 및 추가
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Similarity Warning Dialog */}
      <Dialog open={similarityDialogOpen} onOpenChange={setSimilarityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              유사한 원고 유형이 존재합니다
            </DialogTitle>
            <DialogDescription>
              입력한 원고의 구조가 기존 유형과 92% 이상 일치합니다. 기존 유형의 하위 변형으로 등록됩니다.
            </DialogDescription>
          </DialogHeader>
          {pendingCreateData && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">추출된 코드:</span> {pendingCreateData.code}</p>
              <p><span className="font-medium">추출된 이름:</span> {pendingCreateData.name}</p>
              <p><span className="font-medium">핵심 콘셉트:</span> {pendingCreateData.core_concept}</p>
            </div>
          )}
          <div className="space-y-4 py-2">
            {similarityResult?.similar_types.map((item, idx) => {
              const structureReason = item.reason.includes('1차(구조):')
                ? item.reason.split('1차(구조):')[1]?.split('/')[0]?.trim() || ''
                : '';
              const persuasionReason = item.reason.includes('2차(설득기조):')
                ? item.reason.split('2차(설득기조):')[1]?.trim() || ''
                : '';
              const isStructureDriven = (item.structure_similarity || 0) >= 70;

              return (
                <div key={idx} className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-gray-900">{item.code} - {item.name}</span>
                    <span
                      className={`inline-flex items-center rounded-md font-bold text-sm px-3 py-1 border ${
                        item.similarity_percent >= 90
                          ? 'bg-red-600 text-white border-red-700'
                          : 'bg-amber-500 text-white border-amber-600'
                      }`}
                    >
                      최종 {item.similarity_percent}%
                    </span>
                  </div>

                  {/* 2-stage breakdown bars */}
                  <div className="space-y-2">
                    {/* Stage 1: Structure */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${isStructureDriven ? 'text-red-700' : 'text-gray-500'}`}>
                          1차 구조 유사도 {isStructureDriven && '← 판단 기준'}
                        </span>
                        <span className="font-mono font-bold text-gray-900">{item.structure_similarity || 0}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (item.structure_similarity || 0) >= 70 ? 'bg-red-400' : 'bg-gray-400'
                          }`}
                          style={{ width: `${item.structure_similarity || 0}%` }}
                        />
                      </div>
                      {structureReason && (
                        <p className="text-xs text-gray-600 pl-1">{structureReason}</p>
                      )}
                    </div>

                    {/* Stage 2: Persuasion */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${!isStructureDriven ? 'text-amber-700' : 'text-gray-500'}`}>
                          2차 설득기조 유사도 {!isStructureDriven && '← 판단 기준'}
                        </span>
                        <span className="font-mono font-bold text-gray-900">{item.persuasion_similarity || 0}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (item.persuasion_similarity || 0) >= 80 ? 'bg-amber-400' : 'bg-gray-400'
                          }`}
                          style={{ width: `${item.persuasion_similarity || 0}%` }}
                        />
                      </div>
                      {persuasionReason && (
                        <p className="text-xs text-gray-600 pl-1">{persuasionReason}</p>
                      )}
                    </div>
                  </div>

                  {/* Formula explanation */}
                  <div className="text-xs text-gray-700 font-medium bg-white rounded-lg px-3 py-2 border border-amber-200">
                    {isStructureDriven
                      ? `구조 유사도(${item.structure_similarity}%) ≥ 70% → 구조 기준으로 최종 ${item.similarity_percent}% 판정`
                      : `구조 유사도(${item.structure_similarity || 0}%) < 70% → 설득기조(${item.persuasion_similarity}%) × 0.8 = 최종 ${item.similarity_percent}% 판정`
                    }
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimilarityDialogOpen(false)} className="border-gray-300">
              취소
            </Button>
            <Button onClick={handleForceCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              하위 변형으로 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Choice Dialog (80-91% structure similarity) */}
      <Dialog open={choiceDialogOpen} onOpenChange={setChoiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <AlertTriangle className="h-5 w-5" />
              유사한 원고 유형이 감지되었습니다
            </DialogTitle>
            <DialogDescription>
              구조 유사도 80~91% 범위입니다. 신규 유형으로 등록할지, 기존 유형의 하위 변형으로 등록할지 선택하세요.
            </DialogDescription>
          </DialogHeader>
          {pendingCreateData && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              <p><span className="font-medium">추출된 코드:</span> {pendingCreateData.code}</p>
              <p><span className="font-medium">추출된 이름:</span> {pendingCreateData.name}</p>
              <p><span className="font-medium">핵심 콘셉트:</span> {pendingCreateData.core_concept}</p>
            </div>
          )}
          <div className="space-y-4 py-2">
            {similarityResult?.similar_types.map((item, idx) => {
              const structureReason = item.reason.includes('1차(구조):')
                ? item.reason.split('1차(구조):')[1]?.split('/')[0]?.trim() || ''
                : '';
              const persuasionReason = item.reason.includes('2차(설득기조):')
                ? item.reason.split('2차(설득기조):')[1]?.trim() || ''
                : '';

              return (
                <div key={idx} className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-gray-900">{item.code} - {item.name}</span>
                    <span className="inline-flex items-center rounded-md font-bold text-sm px-3 py-1 border bg-blue-500 text-white border-blue-600">
                      구조 {item.structure_similarity || 0}%
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-blue-700">1차 구조 유사도</span>
                        <span className="font-mono font-bold text-gray-900">{item.structure_similarity || 0}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-blue-400" style={{ width: `${item.structure_similarity || 0}%` }} />
                      </div>
                      {structureReason && <p className="text-xs text-gray-600 pl-1">{structureReason}</p>}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-500">2차 설득기조 유사도</span>
                        <span className="font-mono font-bold text-gray-900">{item.persuasion_similarity || 0}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-gray-400" style={{ width: `${item.persuasion_similarity || 0}%` }} />
                      </div>
                      {persuasionReason && <p className="text-xs text-gray-600 pl-1">{persuasionReason}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setChoiceDialogOpen(false)} className="border-gray-300">
              취소
            </Button>
            <Button onClick={handleCreateAsNew} className="bg-emerald-600 text-white hover:bg-emerald-700">
              신규 유형으로 등록
            </Button>
            <Button onClick={handleCreateAsChild} className="bg-blue-600 text-white hover:bg-blue-700">
              하위 변형으로 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (existing form) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>원고 유형 수정</DialogTitle>
            <DialogDescription>
              원고 유형의 정보를 수정하세요. 코드와 이름은 필수입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">코드 *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="예: A1, B2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">이름 *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="예: 문제제기형"
                />
              </div>
            </div>
            {editingId && copyTypes.find(ct => ct.id === editingId)?.parent_id && (
              <div className="space-y-2">
                <Label htmlFor="edit-variant_name">변형 이름</Label>
                <Input
                  id="edit-variant_name"
                  value={formData.variant_name || ''}
                  onChange={(e) => handleChange('variant_name', e.target.value)}
                  placeholder="예: 긴급 강조형, 부드러운 어필형"
                />
                <p className="text-xs text-muted-foreground">
                  부모 유형 하위의 변형을 구분하는 이름입니다.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="이 유형에 대한 설명"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-core_concept">핵심 콘셉트</Label>
              <Textarea
                id="edit-core_concept"
                value={formData.core_concept}
                onChange={(e) => handleChange('core_concept', e.target.value)}
                placeholder="이 유형의 핵심 콘셉트"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-example_copy">예시 원고</Label>
              <Textarea
                id="edit-example_copy"
                value={formData.example_copy}
                onChange={(e) => handleChange('example_copy', e.target.value)}
                placeholder="이 유형의 예시 원고"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-prompt_template">프롬프트 템플릿</Label>
              <Textarea
                id="edit-prompt_template"
                value={formData.prompt_template}
                onChange={(e) => handleChange('prompt_template', e.target.value)}
                placeholder="AI 생성용 프롬프트 템플릿"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditSubmit} disabled={!formData.code || !formData.name}>
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
