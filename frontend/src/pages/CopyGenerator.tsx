import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productsApi, copyTypesApi, aiApi } from '@/lib/api-client';
import { Wand2, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, CopyType, GeneratedCopy } from '@/types';

export function CopyGenerator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [copyTypes, setCopyTypes] = useState<CopyType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedParentType, setSelectedParentType] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [generatedCopy, setGeneratedCopy] = useState<GeneratedCopy | null>(null);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [productsData, copyTypesData] = await Promise.all([
        productsApi.list(),
        copyTypesApi.list(),
      ]);
      setProducts(productsData);
      setCopyTypes(copyTypesData);
    }
    fetchData();
  }, []);

  // 부모 유형만 필터링 (parent_id가 null인 것)
  const parentTypes = copyTypes.filter(ct => ct.parent_id === null);

  // 선택된 부모의 자식 유형들 필터링
  const childVariants = copyTypes.filter(ct => ct.parent_id === selectedParentType);

  // 부모 유형 변경 시 자식 선택 초기화
  function handleParentTypeChange(parentId: string) {
    setSelectedParentType(parentId);
    setSelectedVariant('');
  }

  async function handleGenerate() {
    if (!selectedProduct || !selectedVariant) return;
    setLoading(true);
    try {
      const result = await aiApi.generate(selectedProduct, selectedVariant, customPrompt || undefined);
      setGeneratedCopy(result);
    } catch (error) {
      console.error('Failed to generate copy:', error);
      toast.error('원고 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyToClipboard() {
    if (generatedCopy) {
      navigator.clipboard.writeText(generatedCopy.content);
      toast.success('클립보드에 복사되었습니다');
    }
  }

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const selectedParentData = copyTypes.find(ct => ct.id === selectedParentType);
  const selectedVariantData = copyTypes.find(ct => ct.id === selectedVariant);

  return (
    <>
      <Header title="AI 원고 생성" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* 상품 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>1. 상품 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="상품을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.english_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProductData && (
                <div className="text-sm space-y-2 p-4 bg-muted rounded-md">
                  <p><strong>USP:</strong> {selectedProductData.usp}</p>
                  <p><strong>기전:</strong> {selectedProductData.mechanism?.slice(0, 100)}...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 유형 선택 */}
          <Card>
            <CardHeader>
              <CardTitle>2. 원고 유형 선택</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 부모 유형 선택 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">유형 분류</label>
                <Select value={selectedParentType} onValueChange={handleParentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="원고 유형을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        [{ct.code}] {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 세부 스타일 선택 */}
              {selectedParentType && childVariants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">세부 스타일</label>
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger>
                      <SelectValue placeholder="세부 스타일을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {childVariants.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          [{ct.code}] {ct.variant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 선택된 정보 표시 */}
              {selectedParentData && (
                <div className="text-sm space-y-2 p-4 bg-muted rounded-md">
                  <p><strong>핵심 콘셉트:</strong> {selectedParentData.core_concept}</p>
                  <p><strong>설명:</strong> {selectedParentData.description}</p>
                </div>
              )}

              {selectedVariantData && (
                <div className="text-sm space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p><strong>선택된 스타일:</strong> [{selectedVariantData.code}] {selectedVariantData.variant_name || selectedVariantData.name}</p>
                  {selectedVariantData.core_concept && (
                    <p><strong>핵심 콘셉트:</strong> {selectedVariantData.core_concept}</p>
                  )}
                  {selectedVariantData.prompt_template && (
                    <p className="text-muted-foreground"><strong>프롬프트:</strong> {selectedVariantData.prompt_template}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 커스텀 프롬프트 */}
        <Card>
          <CardHeader>
            <CardTitle>3. 추가 요청사항 (선택)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="추가적인 요청사항을 입력하세요. 예: '문장을 더 짧게 해주세요', '이모지를 추가해주세요', '~한 느낌으로 작성해주세요'"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-sm text-muted-foreground mt-2">
              입력하지 않아도 기본 프롬프트로 원고가 생성됩니다.
            </p>
          </CardContent>
        </Card>

        {/* 생성 버튼 */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedProduct || !selectedVariant || loading}
          className="w-full h-12 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5" />
              원고 생성하기
            </>
          )}
        </Button>

        {/* 생성된 원고 */}
        {generatedCopy && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>생성된 원고 (v{generatedCopy.version})</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                  <Copy className="mr-2 h-4 w-4" /> 복사
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={generatedCopy.content}
                readOnly
                className="min-h-[300px] font-medium whitespace-pre-wrap"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
