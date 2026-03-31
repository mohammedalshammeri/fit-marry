"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Edit, Heart, Loader2, Plus, ShieldCheck, Trash2, X, Sparkles, Eye, Zap, Plane, Filter, MessageSquare, Undo2, Crown, Bot, Star } from "lucide-react";

type PackageFeatures = {
  unlimitedLikes: boolean;
  seeWhoLikesYou: boolean;
  superLikesPerDay: number;
  boostsPerMonth: number;
  travelMode: boolean;
  advancedFilters: boolean;
  noAds: boolean;
  priorityLikes: boolean;
  messageBeforeMatch: boolean;
  profileBoost: boolean;
  undoLike: boolean;
  dailyMatchesLimit: number;
  chatLimit: number;
  readReceipts: boolean;
  aiMatchmaker: boolean;
};

type SubscriptionPackage = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  badgeText: string | null;
  badgeTextAr: string | null;
  color: string;
  sortOrder: number;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  features: PackageFeatures;
};

type PackageFormState = {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  badgeText: string;
  badgeTextAr: string;
  color: string;
  sortOrder: string;
  price: string;
  durationDays: string;
  isActive: boolean;
  // Features
  unlimitedLikes: boolean;
  seeWhoLikesYou: boolean;
  superLikesPerDay: string;
  boostsPerMonth: string;
  travelMode: boolean;
  advancedFilters: boolean;
  noAds: boolean;
  priorityLikes: boolean;
  messageBeforeMatch: boolean;
  profileBoost: boolean;
  undoLike: boolean;
  dailyMatchesLimit: string;
  chatLimit: string;
  readReceipts: boolean;
  aiMatchmaker: boolean;
};

const defaultFormState: PackageFormState = {
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  badgeText: "",
  badgeTextAr: "",
  color: "#E91E63",
  sortOrder: "0",
  price: "",
  durationDays: "30",
  isActive: true,
  unlimitedLikes: false,
  seeWhoLikesYou: false,
  superLikesPerDay: "0",
  boostsPerMonth: "0",
  travelMode: false,
  advancedFilters: false,
  noAds: false,
  priorityLikes: false,
  messageBeforeMatch: false,
  profileBoost: false,
  undoLike: false,
  dailyMatchesLimit: "3",
  chatLimit: "2",
  readReceipts: false,
  aiMatchmaker: false,
};

const FEATURE_META: { key: keyof PackageFeatures; labelAr: string; icon: React.ElementType; type: "boolean" | "number" }[] = [
  { key: "unlimitedLikes", labelAr: "إعجابات غير محدودة", icon: Heart, type: "boolean" },
  { key: "seeWhoLikesYou", labelAr: "شاهد من أعجب بك", icon: Eye, type: "boolean" },
  { key: "superLikesPerDay", labelAr: "سوبر لايك / يوم", icon: Star, type: "number" },
  { key: "boostsPerMonth", labelAr: "بوست / شهر", icon: Zap, type: "number" },
  { key: "travelMode", labelAr: "وضع السفر", icon: Plane, type: "boolean" },
  { key: "advancedFilters", labelAr: "فلاتر متقدمة", icon: Filter, type: "boolean" },
  { key: "noAds", labelAr: "بدون إعلانات", icon: X, type: "boolean" },
  { key: "priorityLikes", labelAr: "أولوية الإعجابات", icon: Crown, type: "boolean" },
  { key: "messageBeforeMatch", labelAr: "رسالة قبل التوافق", icon: MessageSquare, type: "boolean" },
  { key: "profileBoost", labelAr: "تعزيز الملف الشخصي", icon: Sparkles, type: "boolean" },
  { key: "undoLike", labelAr: "التراجع عن الإعجاب", icon: Undo2, type: "boolean" },
  { key: "dailyMatchesLimit", labelAr: "حد التوافقات اليومية", icon: Heart, type: "number" },
  { key: "chatLimit", labelAr: "حد المحادثات اليومية", icon: MessageSquare, type: "number" },
  { key: "readReceipts", labelAr: "إشعار القراءة", icon: Check, type: "boolean" },
  { key: "aiMatchmaker", labelAr: "الخاطبة الذكية (AI)", icon: Bot, type: "boolean" },
];

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState<PackageFormState>(defaultFormState);

  const { data: packages, isLoading, error } = useQuery<SubscriptionPackage[]>({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const res = await api.get("/admin/packages");
      return res.data;
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: PackageFormState) => {
      await api.post("/admin/packages", normalizeForm(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PackageFormState }) => {
      await api.patch(`/admin/packages/${id}`, normalizeForm(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-packages"] });
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setOpen(false);
    setEditingPackage(null);
    setFormData(defaultFormState);
  };

  const openCreateDialog = () => {
    setEditingPackage(null);
    setFormData(defaultFormState);
    setOpen(true);
  };

  const openEditDialog = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      nameAr: pkg.nameAr ?? "",
      description: pkg.description ?? "",
      descriptionAr: pkg.descriptionAr ?? "",
      badgeText: pkg.badgeText ?? "",
      badgeTextAr: pkg.badgeTextAr ?? "",
      color: pkg.color ?? "#E91E63",
      sortOrder: String(pkg.sortOrder ?? 0),
      price: String(pkg.price),
      durationDays: String(pkg.durationDays),
      isActive: pkg.isActive,
      unlimitedLikes: pkg.features.unlimitedLikes,
      seeWhoLikesYou: pkg.features.seeWhoLikesYou,
      superLikesPerDay: String(pkg.features.superLikesPerDay ?? 0),
      boostsPerMonth: String(pkg.features.boostsPerMonth ?? 0),
      travelMode: pkg.features.travelMode,
      advancedFilters: pkg.features.advancedFilters,
      noAds: pkg.features.noAds,
      priorityLikes: pkg.features.priorityLikes,
      messageBeforeMatch: pkg.features.messageBeforeMatch,
      profileBoost: pkg.features.profileBoost,
      undoLike: pkg.features.undoLike,
      dailyMatchesLimit: String(pkg.features.dailyMatchesLimit ?? 3),
      chatLimit: String(pkg.features.chatLimit ?? 2),
      readReceipts: pkg.features.readReceipts,
      aiMatchmaker: pkg.features.aiMatchmaker,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, payload: formData });
      return;
    }
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldCheck className="mb-4 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900">غير مصرح لك</h3>
        <p className="mt-2 max-w-sm text-gray-500">هذه الصفحة متاحة فقط للمشرفين بصلاحيات Super Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">باقات الاشتراك</h1>
          <p className="text-muted-foreground">إدارة الباقات التي تظهر داخل التطبيق — مثل Tinder Plus / Gold / Platinum</p>
        </div>
        <Dialog open={open} onOpenChange={(value) => { if (!value) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex gap-2" onClick={openCreateDialog}><Plus size={16} /> إضافة باقة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">معلومات أساسية</TabsTrigger>
                  <TabsTrigger value="features">المزايا</TabsTrigger>
                  <TabsTrigger value="display">العرض والتصميم</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم الباقة (EN)</Label>
                      <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} required placeholder="FitMarry Gold" />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم الباقة (AR)</Label>
                      <Input value={formData.nameAr} onChange={(e) => setFormData((p) => ({ ...p, nameAr: e.target.value }))} placeholder="فت ماري ذهبي" dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الوصف (EN)</Label>
                      <Input value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="See who likes you..." />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف (AR)</Label>
                      <Input value={formData.descriptionAr} onChange={(e) => setFormData((p) => ({ ...p, descriptionAr: e.target.value }))} placeholder="شاهد من أعجب بك..." dir="rtl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>السعر ($)</Label>
                      <Input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>المدة (أيام)</Label>
                      <Input type="number" min="1" step="1" value={formData.durationDays} onChange={(e) => setFormData((p) => ({ ...p, durationDays: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>ترتيب العرض</Label>
                      <Input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData((p) => ({ ...p, sortOrder: e.target.value }))} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-3 pt-4">
                  <p className="text-sm text-muted-foreground mb-2">القيمة -1 تعني غير محدود</p>
                  <div className="grid grid-cols-1 gap-3 rounded-lg border p-4">
                    {FEATURE_META.map((feat) => {
                      const Icon = feat.icon;
                      if (feat.type === "boolean") {
                        return (
                          <label key={feat.key} className="flex items-center justify-between gap-4 text-sm">
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {feat.labelAr}</span>
                            <input type="checkbox" checked={formData[feat.key] as boolean} onChange={(e) => setFormData((p) => ({ ...p, [feat.key]: e.target.checked }))} className="h-4 w-4" />
                          </label>
                        );
                      }
                      return (
                        <label key={feat.key} className="flex items-center justify-between gap-4 text-sm">
                          <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {feat.labelAr}</span>
                          <Input type="number" min="-1" className="w-20 h-8 text-center" value={formData[feat.key] as string} onChange={(e) => setFormData((p) => ({ ...p, [feat.key]: e.target.value }))} />
                        </label>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="display" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>شارة / Badge (EN)</Label>
                      <Input value={formData.badgeText} onChange={(e) => setFormData((p) => ({ ...p, badgeText: e.target.value }))} placeholder="Most Popular" />
                    </div>
                    <div className="space-y-2">
                      <Label>شارة / Badge (AR)</Label>
                      <Input value={formData.badgeTextAr} onChange={(e) => setFormData((p) => ({ ...p, badgeTextAr: e.target.value }))} placeholder="الأكثر شعبية" dir="rtl" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>لون الباقة</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={formData.color} onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))} className="h-10 w-10 rounded border cursor-pointer" />
                        <Input value={formData.color} onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))} className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>الحالة</Label>
                      <label className="flex items-center gap-2 pt-2">
                        <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4" />
                        <span className="text-sm">نشطة وقابلة للعرض</span>
                      </label>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "جاري الحفظ..." : editingPackage ? "حفظ التعديلات" : "إنشاء الباقة"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {packages?.sort((a, b) => a.sortOrder - b.sortOrder).map((pkg) => (
          <Card key={pkg.id} className={`relative flex flex-col ${!pkg.isActive ? "opacity-60" : ""}`} style={{ borderColor: pkg.color, borderWidth: 2 }}>
             {pkg.badgeTextAr && (
                <div className="absolute -top-3 right-0 left-0 flex justify-center">
                    <Badge style={{ backgroundColor: pkg.color }} className="text-white">{pkg.badgeTextAr}</Badge>
                </div>
             )}
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-xl">{pkg.nameAr || pkg.name}</CardTitle>
                <Badge variant={pkg.isActive ? "default" : "secondary"}>{pkg.isActive ? "نشطة" : "معطلة"}</Badge>
              </div>
              <div className="mt-4 flex items-baseline justify-center gap-1 font-bold text-3xl" style={{ color: pkg.color }}>
                {pkg.price}<span className="text-sm font-normal text-muted-foreground">$</span>
              </div>
              <CardDescription>{pkg.durationDays} يوم</CardDescription>
              {pkg.descriptionAr && <p className="text-xs text-muted-foreground mt-1">{pkg.descriptionAr}</p>}
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-1.5 text-sm">
                {FEATURE_META.map((feat) => {
                  const val = pkg.features[feat.key];
                  const Icon = feat.icon;
                  if (feat.type === "boolean") {
                    return (
                      <li key={feat.key} className="flex items-center gap-2">
                        {val ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-gray-300" />}
                        <span className={val ? "" : "text-gray-400"}>{feat.labelAr}</span>
                      </li>
                    );
                  }
                  const numVal = val as number;
                  return (
                    <li key={feat.key} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-blue-500" />
                      <span>{feat.labelAr}: <strong>{numVal === -1 ? "∞" : numVal}</strong></span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                 <Button variant="outline" className="w-full flex gap-2" onClick={() => openEditDialog(pkg)}>
                    <Edit size={16} /> تعديل
                 </Button>
                 <Button variant="destructive" className="w-full flex gap-2" onClick={() => deleteMutation.mutate(pkg.id)} disabled={deleteMutation.isPending}>
                    <Trash2 size={16} /> تعطيل
                 </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {packages?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد باقات بعد. ابدأ بإضافة أول باقة اشتراك.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function normalizeForm(payload: PackageFormState) {
  return {
    name: payload.name.trim(),
    nameAr: payload.nameAr.trim() || undefined,
    description: payload.description.trim() || undefined,
    descriptionAr: payload.descriptionAr.trim() || undefined,
    badgeText: payload.badgeText.trim() || undefined,
    badgeTextAr: payload.badgeTextAr.trim() || undefined,
    color: payload.color,
    sortOrder: Number(payload.sortOrder),
    price: Number(payload.price),
    durationDays: Number(payload.durationDays),
    isActive: payload.isActive,
    unlimitedLikes: payload.unlimitedLikes,
    seeWhoLikesYou: payload.seeWhoLikesYou,
    superLikesPerDay: Number(payload.superLikesPerDay),
    boostsPerMonth: Number(payload.boostsPerMonth),
    travelMode: payload.travelMode,
    advancedFilters: payload.advancedFilters,
    noAds: payload.noAds,
    priorityLikes: payload.priorityLikes,
    messageBeforeMatch: payload.messageBeforeMatch,
    profileBoost: payload.profileBoost,
    undoLike: payload.undoLike,
    dailyMatchesLimit: Number(payload.dailyMatchesLimit),
    chatLimit: Number(payload.chatLimit),
    readReceipts: payload.readReceipts,
    aiMatchmaker: payload.aiMatchmaker,
  };
}
