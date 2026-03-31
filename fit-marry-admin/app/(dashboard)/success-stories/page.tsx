"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, Eye, EyeOff, MapPin, Users2 } from "lucide-react";

interface SuccessStory {
  id: string;
  user1Id: string;
  user2Id: string;
  city: string | null;
  marriageType: string | null;
  displayApproved: boolean;
  createdAt: string;
  user1?: { id: string; email: string | null; profile?: { nickname?: string | null } | null };
  user2?: { id: string; email: string | null; profile?: { nickname?: string | null } | null };
}

export default function SuccessStoriesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["success-stories", page],
    queryFn: () => api.get(`/admin/success-stories?page=${page}&limit=20`).then((r) => r.data),
  });

  const publicCount = useQuery({
    queryKey: ["success-stories-count"],
    queryFn: () => api.get("/success-stories/count").then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/success-stories/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["success-stories"] });
      queryClient.invalidateQueries({ queryKey: ["success-stories-count"] });
    },
  });

  const hideMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/success-stories/${id}/disapprove`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["success-stories"] });
      queryClient.invalidateQueries({ queryKey: ["success-stories-count"] });
    },
  });

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(d));

  const marriageTypeLabel = (type: string | null) => {
    if (!type) return "—";
    const map: Record<string, string> = {
      PERMANENT: "دائم",
      MISYAR: "مسيار",
      MUTAA: "متعة",
      URFI: "عرفي",
      TRAVEL_MARRIAGE: "زواج سفر",
    };
    return map[type] || type;
  };

  const partnerLabel = (story: SuccessStory, key: "user1" | "user2") => {
    const user = story[key];
    return user?.profile?.nickname || user?.email || "—";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">قصص النجاح</h1>
        <p className="text-muted-foreground">إدارة قصص النجاح التي تظهر للمستخدمين</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-pink-100 p-3">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التوافقات</p>
                <p className="text-2xl font-bold">{data?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">معروضة للجمهور</p>
                <p className="text-2xl font-bold">{publicCount.data?.count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أزواج سعداء</p>
                <p className="text-2xl font-bold">{publicCount.data?.count ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>جميع قصص النجاح</CardTitle>
          <CardDescription>تحكم في ظهور القصص في قسم &quot;تزوجوا من التطبيق&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.items?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-3">
                <Heart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">لا توجد قصص نجاح بعد</p>
              <p className="text-sm text-muted-foreground">ستظهر هنا عندما يؤكد طرفان التوافق</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الطرفان</TableHead>
                    <TableHead>المدينة</TableHead>
                    <TableHead>نوع الزواج</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((story: SuccessStory, i: number) => (
                    <TableRow key={story.id}>
                      <TableCell className="font-medium">{(page - 1) * 20 + i + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{partnerLabel(story, "user1")}</div>
                          <div className="text-xs text-muted-foreground">{partnerLabel(story, "user2")}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {story.city ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {story.city}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{marriageTypeLabel(story.marriageType)}</TableCell>
                      <TableCell>
                        {story.displayApproved ? (
                          <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                            <Eye className="h-3 w-3" /> معروضة
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" /> مخفية
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(story.createdAt)}</TableCell>
                      <TableCell>
                        {story.displayApproved ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => hideMutation.mutate(story.id)}
                            disabled={hideMutation.isPending}
                            className="gap-1"
                          >
                            <EyeOff className="h-3 w-3" /> إخفاء
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 gap-1"
                            onClick={() => approveMutation.mutate(story.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Eye className="h-3 w-3" /> عرض
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.total > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    السابق
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    صفحة {page} من {Math.ceil(data.total / 20)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / 20)}>
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
