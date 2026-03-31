"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertTriangle, CreditCard, MessageSquareText, TrendingDown, TrendingUp, Minus, Heart, MailCheck, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { Button } from "@/components/ui/button";

type DashboardStats = {
  users: number;
  complaints: number;
  transactions: number;
  rangeDays?: number;
  recent?: {
    users: number;
    complaints: number;
    transactions: number;
    messages: number;
  };
  comparison?: {
    users: TrendMetric;
    complaints: TrendMetric;
    transactions: TrendMetric;
    messages: TrendMetric;
  };
  activity?: Array<{
    label: string;
    date: string;
    users: number;
    complaints: number;
    transactions: number;
    messages: number;
    total: number;
  }>;
  seriousJourney?: {
    successStoriesTotal: number;
    successStoriesPublic: number;
    compatibleCompleted: number;
    contactExchangePending: number;
    contactExchangeApproved: number;
    recentCompatibleCompleted: number;
  };
};

type TrendMetric = {
  current: number;
  previous: number;
  delta: number;
  percentage: number;
  direction: "up" | "down" | "flat";
};

function TrendBadge({ metric }: { metric?: TrendMetric }) {
  if (!metric) {
    return null;
  }

  const isUp = metric.direction === "up";
  const isDown = metric.direction === "down";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const tone = isUp
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isDown
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{metric.percentage}%</span>
      <span>مقارنة بالفترة السابقة</span>
    </div>
  );
}

export default function DashboardHome() {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["admin-stats", rangeDays],
    queryFn: async () => {
      const res = await api.get("/admin/reports", { params: { days: rangeDays } });
      return res.data;
    },
  });

  const activeRange = stats?.rangeDays === 30 ? 30 : 7;
  const rangeLabel = activeRange === 30 ? "آخر 30 يوما" : "آخر 7 أيام";

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">الرئيسية</h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users ?? 0}</div>
            <p className="text-xs text-muted-foreground">مستخدم مسجل في التطبيق</p>
            <TrendBadge metric={stats?.comparison?.users} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">البلاغات والشكاوى</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.complaints ?? 0}</div>
            <p className="text-xs text-muted-foreground">بلاغ تم تقديمه</p>
            <TrendBadge metric={stats?.comparison?.complaints} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العمليات المالية</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.transactions ?? 0}</div>
            <p className="text-xs text-muted-foreground">عملية مالية مسجلة</p>
            <TrendBadge metric={stats?.comparison?.transactions} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رسائل {rangeLabel}</CardTitle>
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recent?.messages ?? 0}</div>
            <p className="text-xs text-muted-foreground">كل الرسائل المرسلة ضمن النطاق الزمني المحدد</p>
            <TrendBadge metric={stats?.comparison?.messages} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">توافقات مكتملة</CardTitle>
            <Heart className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.seriousJourney?.compatibleCompleted ?? 0}</div>
            <p className="text-xs text-muted-foreground">حالات وصلت للنهاية داخل مسار التوافق الجاد</p>
            <div className="mt-3 text-xs text-rose-700">خلال {rangeLabel}: {stats?.seriousJourney?.recentCompatibleCompleted ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات بانتظار الموافقة</CardTitle>
            <MailCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.seriousJourney?.contactExchangePending ?? 0}</div>
            <p className="text-xs text-muted-foreground">طلبات تبادل تواصل لم تُحسم بعد</p>
            <div className="mt-3 text-xs text-amber-700">المعتمد حالياً: {stats?.seriousJourney?.contactExchangeApproved ?? 0}</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قصص النجاح العامة</CardTitle>
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.seriousJourney?.successStoriesPublic ?? 0}</div>
            <p className="text-xs text-muted-foreground">قصص منشورة للعامة بعد الاعتماد الإداري</p>
            <div className="mt-3 text-xs text-emerald-700">الإجمالي: {stats?.seriousJourney?.successStoriesTotal ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>نشاط النظام</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">عرض سريع لحركة المستخدمين والرسائل والبلاغات والعمليات خلال {rangeLabel}</p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button variant={activeRange === 7 ? "default" : "outline"} size="sm" onClick={() => setRangeDays(7)}>
                7 أيام
              </Button>
              <Button variant={activeRange === 30 ? "default" : "outline"} size="sm" onClick={() => setRangeDays(30)}>
                30 يوما
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityChart data={stats?.activity ?? []} compact={activeRange === 30} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ملخص النطاق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">مستخدمون جدد</div>
              <div className="mt-2 text-2xl font-bold text-teal-700">{stats?.recent?.users ?? 0}</div>
              <div className="mt-2 text-xs text-muted-foreground">السابق: {stats?.comparison?.users?.previous ?? 0}</div>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">بلاغات جديدة</div>
              <div className="mt-2 text-2xl font-bold text-red-700">{stats?.recent?.complaints ?? 0}</div>
              <div className="mt-2 text-xs text-muted-foreground">السابق: {stats?.comparison?.complaints?.previous ?? 0}</div>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">عمليات مالية</div>
              <div className="mt-2 text-2xl font-bold text-blue-700">{stats?.recent?.transactions ?? 0}</div>
              <div className="mt-2 text-xs text-muted-foreground">السابق: {stats?.comparison?.transactions?.previous ?? 0}</div>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="text-sm text-muted-foreground">رسائل الفترة</div>
              <div className="mt-2 text-2xl font-bold text-orange-700">{stats?.recent?.messages ?? 0}</div>
              <div className="mt-2 text-xs text-muted-foreground">السابق: {stats?.comparison?.messages?.previous ?? 0}</div>
            </div>
            <div className="rounded-xl border bg-rose-50 p-4">
              <div className="text-sm text-muted-foreground">قصص نجاح معتمدة</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">{stats?.seriousJourney?.successStoriesPublic ?? 0}</div>
              <div className="mt-2 text-xs text-muted-foreground">بانتظار الاعتماد: {(stats?.seriousJourney?.successStoriesTotal ?? 0) - (stats?.seriousJourney?.successStoriesPublic ?? 0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
