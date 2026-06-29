'use client';

import { useState, useTransition } from 'react';
import { upsertSettingAction } from '@/server/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingDef {
  key: string;
  label: string;
  group: string;
  placeholder: string;
  value: string;
}

export function AdminSettingsEditor({ settings }: { settings: SettingDef[] }) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Group settings
  const groups = [...new Set(settings.map((s) => s.group))];
  const GROUP_LABELS: Record<string, string> = {
    business: 'Business',
    delivery: 'Delivery',
    social: 'Social media',
  };

  function handleSave() {
    startTransition(async () => {
      for (const s of settings) {
        const v = values[s.key];
        if (v !== undefined) {
          await upsertSettingAction(s.key, v, s.group);
        }
      }
      setMsg({ text: 'Settings saved.', ok: true });
      setTimeout(() => setMsg(null), 4000);
    });
  }

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{GROUP_LABELS[group] ?? group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings
              .filter((s) => s.group === group)
              .map((s) => (
                <div key={s.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{s.label}</label>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder={s.placeholder}
                    value={values[s.key] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  />
                </div>
              ))}
          </CardContent>
        </Card>
      ))}

      <Button disabled={isPending} onClick={handleSave} className="w-full sm:w-auto">
        {isPending ? 'Saving…' : 'Save all settings'}
      </Button>
    </div>
  );
}
