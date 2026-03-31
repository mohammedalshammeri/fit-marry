"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Phone, Calendar, CreditCard, User as UserIcon, MapPin, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${id}`);
      return res.data;
    },
  });

  if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">فشل تحميل بيانات المستخدم</div>;
  if (!user) return <div className="p-8">المستخدم غير موجود</div>;

  const profile = user.profile || {};
  const wallet = user.wallet || { balanceMinutes: 0, balanceCredits: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">تفاصيل المستخدم</h1>
        <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"} className="text-lg px-4 py-1">
          {user.status === "ACTIVE" ? "نشط" : user.status === "SUSPENDED" ? "معلق" : "محظور"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="text-4xl">{profile.nickname?.[0] || user.email?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <CardTitle className="text-2xl">{profile.nickname || "بدون اسم"}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-1">
                  {user.email && <><Mail className="h-3 w-3" /> {user.email}</>}
                </CardDescription>
                <CardDescription className="flex items-center justify-center gap-1">
                  {user.phone && <><Phone className="h-3 w-3" /> {user.phone}</>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">تاريخ التسجيل</span>
              <span className="font-medium">{new Date(user.createdAt).toLocaleDateString("ar-SA")}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">العمر</span>
              <span className="font-medium">{profile.age ? `${profile.age} سنة` : "غير محدد"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">الجنس</span>
              <span className="font-medium">{profile.gender === "MALE" ? "رجل" : profile.gender === "FEMALE" ? "امرأة" : "--"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>المعلومات التفصيلية</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">الملف الشخصي</TabsTrigger>
                <TabsTrigger value="wallet">المحفظة والرصيد</TabsTrigger>
                <TabsTrigger value="activity">النشاط</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="الجنسية" value={profile.nationalityPrimary} icon={<MapPin />} />
                  <InfoItem label="بلد الإقامة" value={profile.residenceCountry} icon={<MapPin />} />
                  <InfoItem label="الحالة الاجتماعية" value={profile.maritalStatus} icon={<Heart />} />
                  <InfoItem label="عدد الأطفال" value={profile.childrenCount} />
                  <InfoItem label="العمل/الدراسة" value={profile.jobStatus} />
                  <InfoItem label="التدين" value={profile.religion} />
                  <InfoItem label="القبيلة/المذهب" value={profile.sect} />
                </div>
                {profile.aboutMe && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">نبذة عني</h4>
                    <p className="text-sm">{profile.aboutMe}</p>
                  </div>
                )}
                 {profile.partnerPrefs && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">مواصفات الشريك</h4>
                    <p className="text-sm">{profile.partnerPrefs}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="wallet" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">رصيد الدقائق</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{wallet.balanceMinutes} دقيقة</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">رصيد النقاط</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{wallet.balanceCredits} نقطة</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-center text-muted-foreground py-8">
                  سجل العمليات المالية غير متوفر حالياً
                </div>
              </TabsContent>

               <TabsContent value="activity" className="space-y-4 mt-4">
                 <div className="text-center text-muted-foreground py-8">
                   سجل النشاطات (تسجيل الدخول، الإعجابات) غير متوفر في هذه النسخة
                 </div>
               </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string, value: any, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-1 p-2 border rounded-md">
      <span className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</span>
      <span className="font-medium text-sm">{value || "غير محدد"}</span>
    </div>
  );
}
