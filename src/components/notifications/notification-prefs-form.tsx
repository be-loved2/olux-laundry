'use client';

import { Bell, Mail, MessageCircle, Phone } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import type { NotificationPreferences } from '@/server/services/notifications';
import { saveNotificationPrefsAction } from '@/server/actions/notifications';

const CHANNELS: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'inApp',
    label: 'In-app notifications',
    description: 'Show alerts inside the dashboard when you are logged in.',
    icon: Bell,
  },
  {
    key: 'email',
    label: 'Email notifications',
    description: 'Receive order updates and confirmations by email.',
    icon: Mail,
  },
  {
    key: 'sms',
    label: 'SMS notifications',
    description: 'Get a text message for key order milestones.',
    icon: Phone,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp notifications',
    description: 'Receive rich updates via WhatsApp (opt-in).',
    icon: MessageCircle,
  },
];

export function NotificationPrefsForm({
  defaultPrefs,
}: {
  defaultPrefs: NotificationPreferences;
}) {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function toggle(key: keyof NotificationPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
    setError('');
  }

  function handleSave() {
    setSaved(false);
    setError('');
    startTransition(async () => {
      const result = await saveNotificationPrefsAction(prefs);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error ?? 'Failed to save preferences.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {CHANNELS.map(({ key, label, description, icon: Icon }) => (
          <label
            key={key}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:bg-secondary/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-oxblue-50 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            {/* Toggle switch */}
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-secondary transition-colors peer-checked:bg-primary" />
              <div
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? 'translate-x-4' : 'translate-x-0'}`}
                onClick={() => toggle(key)}
              />
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending ? 'Saving…' : 'Save preferences'}
        </Button>
        {saved && <p className="text-sm text-green-600">Preferences saved!</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
