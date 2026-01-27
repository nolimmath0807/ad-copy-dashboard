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
  DialogTrigger,
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { CopyType, CopyTypeCreate } from '@/types';

const initialFormData: CopyTypeCreate = {
  code: '',
  name: '',
  description: '',
  core_concept: '',
  example_copy: '',
  prompt_template: '',
};

export function CopyTypes() {
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  function handleOpenCreate() {
    setEditingId(null);
    setFormData(initialFormData);
    setDialogOpen(true);
  }

  function handleOpenEdit(copyType: CopyType) {
    setEditingId(copyType.id);
    setFormData({
      code: copyType.code,
      name: copyType.name,
      description: copyType.description || '',
      core_concept: copyType.core_concept || '',
      example_copy: copyType.example_copy || '',
      prompt_template: copyType.prompt_template || '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (editingId) {
      await copyTypesApi.update(editingId, formData);
    } else {
      await copyTypesApi.create(formData);
    }
    setDialogOpen(false);
    fetchCopyTypes();
  }

  async function handleDelete(id: string) {
    if (confirm('정말 삭제하시겠습니까?')) {
      await copyTypesApi.delete(id);
      fetchCopyTypes();
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                유형 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? '원고 유형 수정' : '새 원고 유형 추가'}</DialogTitle>
                <DialogDescription>
                  원고 유형의 정보를 입력하세요. 코드와 이름은 필수입니다.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">코드 *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleChange('code', e.target.value)}
                      placeholder="예: A1, B2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="예: 문제제기형"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">설명</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="이 유형에 대한 설명"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="core_concept">핵심 콘셉트</Label>
                  <Textarea
                    id="core_concept"
                    value={formData.core_concept}
                    onChange={(e) => handleChange('core_concept', e.target.value)}
                    placeholder="이 유형의 핵심 콘셉트"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="example_copy">예시 원고</Label>
                  <Textarea
                    id="example_copy"
                    value={formData.example_copy}
                    onChange={(e) => handleChange('example_copy', e.target.value)}
                    placeholder="이 유형의 예시 원고"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt_template">프롬프트 템플릿</Label>
                  <Textarea
                    id="prompt_template"
                    value={formData.prompt_template}
                    onChange={(e) => handleChange('prompt_template', e.target.value)}
                    placeholder="AI 생성용 프롬프트 템플릿"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.code || !formData.name}>
                  {editingId ? '수정' : '추가'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
        ) : copyTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            등록된 원고 유형이 없습니다. 새 유형을 추가해주세요.
          </div>
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
                .filter(ct => !ct.parent_id) // 부모 유형만 먼저 표시
                .map((parent) => (
                  <Fragment key={parent.id}>
                    {/* 부모 유형 */}
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
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(parent)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(parent.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* 자식 유형들 */}
                    {copyTypes
                      .filter(ct => ct.parent_id === parent.id)
                      .map((child) => (
                        <TableRow key={child.id} className="bg-white">
                          <TableCell className="font-mono text-muted-foreground pl-6">
                            └ {child.code}
                          </TableCell>
                          <TableCell className="text-sm">{child.variant_name}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                            {child.example_copy?.slice(0, 50)}...
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs">
                            -
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(child)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(child.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
