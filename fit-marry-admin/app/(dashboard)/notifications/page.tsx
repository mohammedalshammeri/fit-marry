"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Trash2, Loader2, Users, Crown, UserCheck, Megaphone, Gift, AlertCircle } from "lucide-react";

interface Broadcast {
  id: string;
  adminId: string;
  title: string;
  titleEn: string | null;
  body: string;
  bodyEn: string | null;
  type: string;
  targetGroup: string;
  imageUrl: string | null;
  actionUrl: string | null;
  sentCount: number;
  createdAt: string;
}

const broadcastTypes = [
  { value: "PROMO", label: "عرض ترويجي", labelEn: "Promotion", icon: Gift, color: "bg-emerald-500" },
  { value: "UPDATE", label: "تحديث", labelEn: "Update", icon: Bell, color: "bg-blue-500" },
  { value: "ALERT", label: "تنبيه مهم", labelEn: "Alert", icon: AlertCircle, color: "bg-amber-500" },
  { value: "ANNOUNCEMENT", label: "إعلان عام", labelEn: "Announcement", icon: Megaphone, color: "bg-purple-500" },
];

const targetGroups = [
  { value: "ALL", label: "جميع المستخدمين", icon: Users },
  { value: "PREMIUM", label: "المشتركين فقط", icon: Crown },
  { value: "FREE", label: "المجانيين فقط", icon: UserCheck },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Form state
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [body, setBody] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [type, setType] = useState("PROMO");
  const [targetGroup, setTargetGroup] = useState("ALL");
  const [imageUrl, setImageUrl] = useState("");
  const [actionUrl, setActionUrl] = useState("");

  const { data: broadcasts, isLoading } = useQuery({
    queryKey: ["admin-broadcasts", page],
    queryFn: () => api.get(`/admin/notifications/broadcasts?page=${page}&limit=20`).then((r) => r.data),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: any) => api.post("/admin/notifications/broadcast", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/notifications/broadcasts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-broadcasts"] }),
  });

  const resetForm = () => {
    setTitle("");
    setTitleEn("");
    setBody("");
    setBodyEn("");
    setType("PROMO");
    setTargetGroup("ALL");
    setImageUrl("");
    setActionUrl("");
  };

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    sendMutation.mutate({
      title,
      titleEn: titleEn || undefined,
      body,
      bodyEn: bodyEn || undefined,
      type,
      targetGroup,
      imageUrl: imageUrl || undefined,
      actionUrl: actionUrl || undefined,
    });
  };

  const getTypeBadge = (t: string) => {
    const found = broadcastTypes.find((bt) => bt.value === t);
    return found ? (
      <Badge className={`${found.color} text-white border-0`}>
        {found.label}
      </Badge>
    ) : (
      <Badge variant="outline">{t}</Badge>
    );
  };

  const getTargetBadge = (g: string) => {
    const found = targetGroups.find((tg) => tg.value === g);
    if (!found) return <Badge variant="outline">{g}</Badge>;
    const Icon = found.icon;
    return (
      <Badge variant="secondary" className="gap-1">
        <Icon className="h-3 w-3" />
        {found.label}
      </Badge>
    );
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الإشعارات والعروض</h1>
          <p className="text-muted-foreground">إرسال إشعارات وعروض ترويجية للمستخدمين</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              إرسال إشعار جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إرسال إشعار جماعي</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Type selector */}
              <div className="space-y-2">
                <Label>نوع الإشعار</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {broadcastTypes.map((bt) => {
                    const Icon = bt.icon;
                    return (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => setType(bt.value)}
                        className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                          type === bt.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className={`rounded-full p-2 ${bt.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-xs font-medium">{bt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target group */}
              <div className="space-y-2">
                <Label>الفئة المستهدفة</Label>
                <div className="grid grid-cols-3 gap-2">
                  {targetGroups.map((tg) => {
                    const Icon = tg.icon;
                    return (
                      <button
                        key={tg.value}
                        type="button"
                        onClick={() => setTargetGroup(tg.value)}
                        className={`flex items-center gap-2 rounded-lg border-2 p-3 transition-all ${
                          targetGroup === tg.value
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{tg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Arabic content */}
              <Tabs defaultValue="ar" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="ar" className="flex-1">العربية</TabsTrigger>
                  <TabsTrigger value="en" className="flex-1">English</TabsTrigger>
                </TabsList>
                <TabsContent value="ar" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label>العنوان (عربي) *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="عنوان الإشعار بالعربي"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المحتوى (عربي) *</Label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="نص الإشعار بالعربي..."
                      dir="rtl"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="en" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label>Title (English)</Label>
                    <Input
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      placeholder="Notification title in English"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content (English)</Label>
                    <textarea
                      value={bodyEn}
                      onChange={(e) => setBodyEn(e.target.value)}
                      placeholder="Notification content in English..."
                      dir="ltr"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Optional fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>رابط الصورة (اختياري)</Label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رابط الإجراء (اختياري)</Label>
                  <Input
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/premium أو رابط خارجي"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Preview */}
              {(title || body) && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardDescription>معاينة الإشعار</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 items-start">
                      <div className={`rounded-full p-2 ${broadcastTypes.find((b) => b.value === type)?.color || "bg-gray-500"} shrink-0`}>
                        <Bell className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{title || "العنوان"}</p>
                        <p className="text-sm text-muted-foreground mt-1">{body || "المحتوى"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleSend}
                disabled={!title.trim() || !body.trim() || sendMutation.isPending}
                className="w-full gap-2"
                size="lg"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                إرسال الآن
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإرسالات</p>
                <p className="text-2xl font-bold">{broadcasts?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {broadcastTypes.slice(0, 3).map((bt) => {
          const Icon = bt.icon;
          const count = broadcasts?.items?.filter((b: Broadcast) => b.type === bt.value).length ?? 0;
          return (
            <Card key={bt.value}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 ${bt.color}/10`}>
                    <Icon className={`h-5 w-5 ${bt.color.replace("bg-", "text-")}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{bt.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Broadcasts list */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الإشعارات المُرسلة</CardTitle>
          <CardDescription>جميع الإشعارات الجماعية التي تم إرسالها</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !broadcasts?.items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لا توجد إشعارات مُرسلة بعد</p>
              <p className="text-sm text-muted-foreground">أنشئ أول إشعار جماعي من الزر أعلاه</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المحتوى</TableHead>
                    <TableHead>الفئة المستهدفة</TableHead>
                    <TableHead>المُرسَل إليهم</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.items.map((b: Broadcast) => (
                    <TableRow key={b.id}>
                      <TableCell>{getTypeBadge(b.type)}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{b.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[250px] truncate">{b.body}</TableCell>
                      <TableCell>{getTargetBadge(b.targetGroup)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {b.sentCount.toLocaleString("ar-SA")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(b.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(b.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {broadcasts.total > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    السابق
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    صفحة {page} من {Math.ceil(broadcasts.total / 20)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(broadcasts.total / 20)}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
