"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronDown } from "lucide-react";
import type { Category } from "@prisma/client";
import { useI18n } from "@/lib/i18n/provider";
import { localizedName } from "@/lib/i18n/localized";
import { removeBackground } from "@imgly/background-removal";

const SIZE_PRESETS = {
  ملابس: "XXS, XS, S, M, L, XL, XXL (2XL), 3XL, 4XL, 5XL, 6XL, One Size (مقاس واحد)",
  clothing: "XXS, XS, S, M, L, XL, XXL (2XL), 3XL, 4XL, 5XL, 6XL, One Size (مقاس واحد)",
  أحذية: "EU: 35–50, US: 4–15, UK: 2–14, CM (بالسنتيمتر)",
  shoes: "EU: 35–50, US: 4–15, UK: 2–14, CM (بالسنتيمتر)",
  قبعات: "S, M, L, XL",
  hats: "S, M, L, XL",
  أحزمة: "70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120 سم",
  belts: "70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120 سم",
  قفازات: "XS, S, M, L, XL",
  gloves: "XS, S, M, L, XL",
  جوارب: "35–38, 39–42, 43–46, One Size (مقاس واحد)",
  socks: "35–38, 39–42, 43–46, One Size (مقاس واحد)",
  مجوهرات: "US: 4–13, EU: 44–70",
  jewelry: "US: 4–13, EU: 44–70",
  خواتم: "US: 4–13, EU: 44–70",
  rings: "US: 4–13, EU: 44–70",
  ساعات: "38mm, 40mm, 41mm, 42mm, 44mm, 45mm, 46mm, 49mm",
  watches: "38mm, 40mm, 41mm, 42mm, 44mm, 45mm, 46mm, 49mm",
  حقائب: "Small, Medium, Large",
  bags: "Small, Medium, Large",
  إكسسوارات: "One Size (مقاس واحد), Adjustable (قابل للتعديل)",
  accessories: "One Size (مقاس واحد), Adjustable (قابل للتعديل)",
  أطفال: "XXS, XS, S, M, L, XL",
  "baby & kids": "XXS, XS, S, M, L, XL",
  رياضة: "XS, S, M, L, XL, XXL",
  sports: "XS, S, M, L, XL, XXL",
} as const;

interface Props {
  categories: Category[];
  product?: any;
  backUrl?: string;
  existingSlugs?: string[];
}

export function ProductForm({ categories, product, backUrl = "/admin/products", existingSlugs = [] }: Props) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [colors, setColors] = useState<string[]>(product?.colors ?? []);
  const [colorInput, setColorInput] = useState("");
  const [colorImages, setColorImages] = useState<Record<string, string>>(product?.colorImages ?? {});
  const [colorStock, setColorStock] = useState<Record<string, number>>(product?.colorStock ?? {});
  const totalStock = colors.length > 0 ? Object.values(colorStock).reduce((a, b) => a + b, 0) : (product?.stock ?? 0);
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string>(product?.brandLogo ?? "");
  const [uploadingBrand, setUploadingBrand] = useState(false);
  const [videoMode, setVideoMode] = useState<"disk" | "cloud">(product?.videoUrl?.startsWith("data:") ? "disk" : "cloud");
  const [videoFile, setVideoFile] = useState<string>(product?.videoUrl?.startsWith("data:") ? product.videoUrl : "");
  const [videoCloudUrl, setVideoCloudUrl] = useState<string>(product?.videoUrl?.startsWith("data:") ? "" : product?.videoUrl ?? "");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(() => {
    const raw = product?.specs;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return Object.entries(raw).map(([k, v]) => ({ key: k, value: String(v) }));
    return [];
  });
  const [availableSizes, setAvailableSizes] = useState<string[]>(() => {
    if (product?.categoryId) {
      const cat = categories.find(c => c.id === product.categoryId);
      if (cat) {
        const preset = findSizePreset(cat.name, cat.nameEn ?? "");
        if (preset) return preset.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>(product?.sizes ?? []);
  const [sizeWidth, setSizeWidth] = useState("");
  const [sizeHeight, setSizeHeight] = useState("");
  const [sizeWidthUnit, setSizeWidthUnit] = useState("سم");
  const [sizeHeightUnit, setSizeHeightUnit] = useState("سم");
  const nameRef = useRef<HTMLInputElement>(null);
  const nameEnRef = useRef<HTMLInputElement>(null);

  function findSizePreset(catName: string, catNameEn: string) {
    const all = catName + " " + catNameEn;
    for (const [key, val] of Object.entries(SIZE_PRESETS)) {
      if (all.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return null;
  }

  function handleCategoryChange(catId: string) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const preset = findSizePreset(cat.name, cat.nameEn ?? "");
    if (preset) {
      const sizes = preset.split(",").map((s: string) => s.trim()).filter(Boolean);
      setAvailableSizes(sizes);
      setSelectedSizes([]);
    }
  }
  const [autoSlug, setAutoSlug] = useState(!product?.slug);
  const [currentSlug, setCurrentSlug] = useState(product?.slug ?? "");

  function slugify(text: string) {
    return text
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function regenerateSlug() {
    if (!autoSlug || product) return;
    const enVal = nameEnRef.current?.value?.trim() ?? "";
    if (!enVal) { setCurrentSlug(""); return; }
    let base = slugify(enVal);
    const taken = new Set(existingSlugs);
    if (taken.has(base)) {
      for (let i = 1; i <= 50; i++) {
        const v = `${base}-${i}`;
        if (!taken.has(v)) { base = v; break; }
      }
    }
    setCurrentSlug(base);
  }

  function handleNameChange() {
    regenerateSlug();
  }

  function handleNameEnChange() {
    regenerateSlug();
  }

  const presetColors = [
    "#FF0000","#DC143C","#B22222","#8B0000","#FF4500","#FF6347","#FF8C00","#FFA500",
    "#FFD700","#FFFF00","#9ACD32","#32CD32","#008000","#228B22","#006400","#2E8B57",
    "#00CED1","#008080","#20B2AA","#0000FF","#4169E1","#1E90FF","#00008B","#191970",
    "#4B0082","#800080","#9932CC","#9400D3","#8B008B","#FF1493","#FF69B4","#FFB6C1",
    "#FFFFFF","#F5F5DC","#C0C0C0","#A9A9A9","#808080","#696969","#000000","#8B4513",
  ];

  function addColor(hex: string) {
    if (hex && !colors.includes(hex)) setColors((p) => [...p, hex]);
    setColorInput("");
  }

  function removeColor(hex: string) {
    setColors((p) => p.filter((c) => c !== hex));
    setColorImages((prev) => { const n = { ...prev }; delete n[hex]; return n; });
    setColorStock((prev) => { const n = { ...prev }; delete n[hex]; return n; });
  }

  async function uploadColorImage(hex: string, file: File) {
    setUploadingColor(hex);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setColorImages((prev) => ({ ...prev, [hex]: dataUrl }));
    } catch {}
    setUploadingColor(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        urls.push(dataUrl);
      } catch {} 
    }
    setImages((prev) => [...prev, ...urls]);
    setUploading(false);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadBrandLogo(file: File) {
    setUploadingBrand(true);
    try {
      const blob = await removeBackground(file);
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setBrandLogo(dataUrl);
    } catch {}
    setUploadingBrand(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      nameEn: form.get("nameEn"),
      slug: form.get("slug"),
      description: form.get("description"),
      descriptionEn: form.get("descriptionEn"),
      price: parseFloat(form.get("price") as string),
      categoryId: form.get("categoryId"),
      stock: parseInt(form.get("stock") as string) || 0,
      discount: parseInt(form.get("discount") as string) || 0,
      dealEnd: form.get("dealEnd") ? new Date(form.get("dealEnd") as string).toISOString() : null,
      featured: form.get("featured") === "on",
      brand: form.get("brand"),
      brandLogo: brandLogo || null,
      videoUrl: videoMode === "disk" ? videoFile : videoCloudUrl,
      specs: specs.length > 0 ? Object.fromEntries(specs.filter(s => s.key).map(s => [s.key, s.value])) : null,
      sizes: selectedSizes,
      images,
      colors,
      colorImages,
      colorStock,
    };

    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      if (product) {
        router.push(backUrl);
      } else {
        const created = await res.json();
        router.push(`/products/${created.slug}`);
      }
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data?.error || `${t("admin.error_prefix")} ${res.status}`);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.basic_info")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input ref={nameRef} id="name" name="name" label={t("admin.product_name_ar")} defaultValue={product?.name} required onChange={() => handleNameChange()} />
            <Input ref={nameEnRef} id="nameEn" name="nameEn" label={t("admin.product_name_en")} defaultValue={product?.nameEn} onChange={() => handleNameEnChange()} />
          </div>
          {product ? (
            <Input id="slug" name="slug" label={t("admin.slug")} defaultValue={product.slug} required />
          ) : (
            <Input id="slug" name="slug" label={t("admin.slug")} value={currentSlug} onChange={(e) => { setCurrentSlug(e.target.value); setAutoSlug(false); }} placeholder={t("admin.slug_auto")} required />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.description")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea id="description" name="description" label={t("admin.description_ar")} defaultValue={product?.description} />
            <Textarea id="descriptionEn" name="descriptionEn" label={t("admin.description_en")} defaultValue={product?.descriptionEn} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.price_stock")}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input id="price" name="price" type="number" step="0.01" label={t("admin.price")} defaultValue={product?.price?.toString()} required />
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">{t("admin.stock")}</label>
              {colors.length > 0 ? (
                <input id="stock" name="stock" type="number" readOnly value={totalStock} className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm opacity-60 cursor-not-allowed" />
              ) : (
                <Input id="stock" name="stock" type="number" label="" defaultValue={product?.stock?.toString() ?? "0"} />
              )}
              {colors.length > 0 && <p className="text-[10px] text-muted-foreground">{t("admin.total_color_stock")}</p>}
            </div>
            <Input id="discount" name="discount" type="number" min="0" max="100" label={t("admin.discount")} defaultValue={product?.discount?.toString() ?? "0"} />
            <Input id="dealEnd" name="dealEnd" type="datetime-local" label={t("admin.deal_end")} defaultValue={product?.dealEnd ? new Date(product.dealEnd).toISOString().slice(0, 16) : ""} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.category")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="categoryId"
              name="categoryId"
              label={t("admin.category")}
              defaultValue={product?.categoryId}
              options={categories.map((c) => ({ value: c.id, label: localizedName(c, locale) }))}
              onChange={(e) => handleCategoryChange(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm pt-6">
              <input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4" />
              {t("admin.featured")}
            </label>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.sizes")}</p>
          <div className="relative">
            <button type="button" onClick={() => document.getElementById("sizes-dropdown")?.classList.toggle("hidden")} className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1">
              <span className={selectedSizes.length === 0 ? "text-muted-foreground" : ""}>{selectedSizes.length > 0 ? selectedSizes.join("، ") : t("admin.select_sizes")}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <div id="sizes-dropdown" className="hidden absolute z-50 mt-1 w-full rounded-lg border border-border bg-card p-1 shadow-lg max-h-48 overflow-y-auto">
              {availableSizes.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">{t("admin.select_category_first")}</p>
              ) : (
                availableSizes.map((size) => (
                  <label key={size} className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                    <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size])} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                    {size}
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" value={sizeWidth} onChange={(e) => setSizeWidth(e.target.value)} placeholder={t("admin.width")} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={sizeWidthUnit} onChange={(e) => setSizeWidthUnit(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="سم">{t("admin.cm")}</option>
              <option value="م">{t("admin.m")}</option>
              <option value="قدم">{t("admin.ft")}</option>
              <option value="إنش">{t("admin.in")}</option>
              <option value="مم">{t("admin.mm")}</option>
            </select>
            <input type="number" value={sizeHeight} onChange={(e) => setSizeHeight(e.target.value)} placeholder={t("admin.height")} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={sizeHeightUnit} onChange={(e) => setSizeHeightUnit(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="سم">{t("admin.cm")}</option>
              <option value="م">{t("admin.m")}</option>
              <option value="قدم">{t("admin.ft")}</option>
              <option value="إنش">{t("admin.in")}</option>
              <option value="مم">{t("admin.mm")}</option>
            </select>
          </div>
          <button type="button" onClick={() => {
            const w = sizeWidth.trim();
            const h = sizeHeight.trim();
            if (w && h) {
              const s = `${w}×${h} ${sizeWidthUnit}`;
              if (!selectedSizes.includes(s)) setSelectedSizes((prev) => [...prev, s]);
              setSizeWidth(""); setSizeHeight("");
            }
          }} className="h-9 w-full rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">{t("admin.add_size")}</button>
          {selectedSizes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSizes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs">
                  {s}
                  <button type="button" onClick={() => setSelectedSizes((prev) => prev.filter((x) => x !== s))} className="text-muted-foreground hover:text-foreground">&times;</button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.brand")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="brand" name="brand" label={t("admin.brand")} defaultValue={product?.brand} />
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.brand_logo")}</label>
              <div className="flex items-center gap-3">
                {brandLogo ? (
                  <div className="relative inline-block h-16 w-16 overflow-hidden rounded-lg border border-border group">
                    <img src={brandLogo} alt="" className="h-full w-full object-contain" />
                    <button type="button" onClick={() => setBrandLogo("")} className="absolute inset-0 bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">{t("admin.delete_image")}</button>
                  </div>
                ) : (
                  <label className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary transition-colors ${uploadingBrand ? "opacity-50" : ""}`}>
                    {uploadingBrand ? "..." : "+"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrandLogo(f); }} />
                  </label>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">{t("admin.video_url")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setVideoMode("disk")} className={`h-9 flex-1 rounded-lg text-xs font-medium transition-colors ${videoMode === "disk" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t("admin.upload_video")}</button>
            <button type="button" onClick={() => setVideoMode("cloud")} className={`h-9 flex-1 rounded-lg text-xs font-medium transition-colors ${videoMode === "cloud" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{t("admin.external_link")}</button>
          </div>
          {videoMode === "disk" ? (
            <div className="space-y-2">
              {videoFile ? (
                <div className="relative">
                  <video src={videoFile} controls className="w-full max-h-48 rounded-lg border border-border bg-black" />
                  <button type="button" onClick={() => setVideoFile("")} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">X</button>
                </div>
              ) : (
                <label className={`flex h-24 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary transition-colors ${uploadingVideo ? "opacity-50" : ""}`}>
                  {uploadingVideo ? t("admin.uploading") : t("admin.select_video")}
                  <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) {
                      alert(t("admin.video_size_error"));
                      e.target.value = "";
                      return;
                    }
                    setUploadingVideo(true);
                    try {
                      const dataUrl = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(f);
                      });
                      setVideoFile(dataUrl);
                    } catch {}
                    setUploadingVideo(false);
                  }} />
                </label>
              )}
            </div>
          ) : (
            <input type="text" value={videoCloudUrl} onChange={(e) => setVideoCloudUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">{t("admin.specs")}</p>
          {specs.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="text" value={s.key} onChange={(e) => { const n = [...specs]; n[i] = { ...n[i], key: e.target.value }; setSpecs(n); }} placeholder={t("admin.spec_key")} className="flex-1 h-8 rounded border border-border bg-background px-2 text-sm" />
              <input type="text" value={s.value} onChange={(e) => { const n = [...specs]; n[i] = { ...n[i], value: e.target.value }; setSpecs(n); }} placeholder={t("admin.spec_value")} className="flex-1 h-8 rounded border border-border bg-background px-2 text-sm" />
              <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="h-8 w-8 rounded bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors">X</button>
            </div>
          ))}
          <button type="button" onClick={() => setSpecs([...specs, { key: "", value: "" }])} className="text-sm text-primary hover:underline">{t("admin.add_spec")}</button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">{t("admin.colors")}</p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <div key={c} className="flex flex-col items-center gap-1">
                <div className="relative group">
                  <div className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: c }} />
                  <button type="button" onClick={() => removeColor(c)} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                </div>
                {colorImages[c] ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded border border-border">
                    <img src={colorImages[c]} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setColorImages((p) => { const n = { ...p }; delete n[c]; return n; })} className="absolute top-0 left-0 bg-black/50 text-white text-[8px] w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">{t("admin.delete_image")}</button>
                  </div>
                ) : (
                  <label className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground hover:border-primary transition-colors ${uploadingColor === c ? "opacity-50" : ""}`}>
                    {uploadingColor === c ? "..." : "+"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadColorImage(c, f); }} />
                  </label>
                )}
                <input type="number" min="0" value={colorStock[c] ?? 0} onChange={(e) => setColorStock((p) => ({ ...p, [c]: parseInt(e.target.value) || 0 }))} className="h-7 w-16 rounded border border-border bg-background text-center text-xs" placeholder={t("admin.stock")} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presetColors.map((c) => (
              <button key={c} type="button" onClick={() => addColor(c)} className={`h-6 w-6 rounded-full border ${colors.includes(c) ? "border-primary ring-2 ring-primary/30" : "border-border"} hover:scale-110 transition-transform`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="color" value={colorInput || "#000000"} onChange={(e) => setColorInput(e.target.value)} className="h-8 w-8 rounded cursor-pointer border border-border" />
            <input type="text" value={colorInput} onChange={(e) => setColorInput(e.target.value)} placeholder={t("admin.color_hex")} className="flex-1 h-8 rounded border border-border bg-background px-2 text-sm" />
            <Button type="button" size="sm" variant="outline" onClick={() => addColor(colorInput)}>{t("admin.add_color")}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">{t("admin.images_multiple")}</p>
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border group">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0 left-0 bg-black/60 text-white text-xs w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {t("admin.delete_image")}
                </button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="text-sm" />
          {uploading && <p className="text-xs text-muted-foreground">{t("admin.uploading")}</p>}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button type="submit" loading={loading}>{product ? t("admin.update") : t("admin.add")}</Button>
        <Button type="button" variant="outline" onClick={() => router.push(backUrl)}>{t("admin.cancel")}</Button>
      </div>
    </form>
  );
}
