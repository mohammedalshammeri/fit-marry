"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Setting = {
  id: string;
  key: string;
  value: string;
  description: string;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const { data: settings, isLoading, error } = useQuery<Setting[]>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/admin/settings");
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put("/admin/settings", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      alert("تم الحفظ بنجاح");
    },
  });

  const handleSave = (key: string) => {
    const value = editingValues[key];
    if (value === undefined) return; // No change
    updateMutation.mutate({ key, value });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-500">فشل تحميل الإعدادات</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإعدادات العامة</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">الإعداد</TableHead>
              <TableHead>القيمة</TableHead>
              <TableHead className="w-[100px]">حفظ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings?.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-medium">
                  {setting.key}
                  <div className="text-xs text-muted-foreground">{setting.description}</div>
                </TableCell>
                <TableCell>
                  <Input 
                    value={editingValues[setting.key] ?? setting.value} 
                    onChange={(e) => setEditingValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                  />
                </TableCell>
                <TableCell>
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(setting.key)}
                      disabled={updateMutation.isPending || editingValues[setting.key] === undefined}
                    >
                        <Save size={16} />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
