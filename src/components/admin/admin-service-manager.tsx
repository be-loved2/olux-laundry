'use client';

import { useState, useTransition } from 'react';
import {
  createPriceItemAction,
  createServiceAction,
  togglePriceItemAction,
  toggleServiceAction,
  updatePriceItemAction,
} from '@/server/actions/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface PriceItem {
  id: string;
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  priceItems: PriceItem[];
}

const UNIT_LABELS: Record<string, string> = {
  PER_ITEM: 'per item',
  PER_KG: 'per kg',
  PER_LOAD: 'per load',
};

export function AdminServiceManager({
  services: initialServices,
  canManageServices,
  canManagePricing,
}: {
  services: Service[];
  canManageServices: boolean;
  canManagePricing: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ id: string; value: string } | null>(null);

  // New service form
  const [showNewService, setShowNewService] = useState(false);
  const [newService, setNewService] = useState({ name: '', slug: '', description: '' });

  // New price item form
  const [showNewItem, setShowNewItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', unit: 'PER_ITEM', price: '' });

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  function handleToggleService(serviceId: string, isActive: boolean) {
    startTransition(async () => {
      const res = await toggleServiceAction(serviceId, isActive);
      if (!res.success) flash(res.error ?? 'Failed.', false);
      else flash(isActive ? 'Service enabled.' : 'Service disabled.', true);
    });
  }

  function handleCreateService() {
    startTransition(async () => {
      const res = await createServiceAction(newService);
      if (res.success) {
        flash('Service created.', true);
        setShowNewService(false);
        setNewService({ name: '', slug: '', description: '' });
      } else flash(res.error ?? 'Failed.', false);
    });
  }

  function handleUpdatePrice(id: string, price: number) {
    startTransition(async () => {
      const res = await updatePriceItemAction(id, price);
      if (res.success) { flash('Price updated.', true); setEditingPrice(null); }
      else flash(res.error ?? 'Failed.', false);
    });
  }

  function handleTogglePriceItem(id: string, isActive: boolean) {
    startTransition(async () => {
      const res = await togglePriceItemAction(id, isActive);
      if (!res.success) flash(res.error ?? 'Failed.', false);
    });
  }

  function handleCreatePriceItem(serviceId: string) {
    startTransition(async () => {
      const res = await createPriceItemAction({
        serviceId,
        name: newItem.name,
        unit: newItem.unit,
        price: parseFloat(newItem.price),
      });
      if (res.success) {
        flash('Item added.', true);
        setShowNewItem(null);
        setNewItem({ name: '', unit: 'PER_ITEM', price: '' });
      } else flash(res.error ?? 'Failed.', false);
    });
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p className={`rounded-lg px-4 py-2 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </p>
      )}

      {initialServices.map((service) => (
        <Card key={service.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{service.name}</CardTitle>
              {service.description && (
                <p className="text-xs text-muted-foreground">{service.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={service.isActive ? 'success' : 'muted'}>
                {service.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {canManageServices && (
                <button
                  disabled={isPending}
                  onClick={() => handleToggleService(service.id, !service.isActive)}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {service.isActive ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="divide-y divide-border rounded-xl border border-border">
              {service.priceItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    {!item.isActive && <span className="text-xs text-muted-foreground line-through">{item.name}</span>}
                    {item.isActive && <span className="text-oxblue-900">{item.name}</span>}
                    <span className="text-xs text-muted-foreground">{UNIT_LABELS[item.unit] ?? item.unit}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {editingPrice?.id === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          className="w-24 rounded border border-border px-2 py-1 text-sm"
                          value={editingPrice.value}
                          onChange={(e) => setEditingPrice({ id: item.id, value: e.target.value })}
                        />
                        <button
                          disabled={isPending}
                          onClick={() => handleUpdatePrice(item.id, parseFloat(editingPrice.value))}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingPrice(null)} className="text-xs text-muted-foreground hover:underline">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{formatCurrency(item.price)}</span>
                        {canManagePricing && (
                          <>
                            <button
                              onClick={() => setEditingPrice({ id: item.id, value: String(item.price) })}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              disabled={isPending}
                              onClick={() => handleTogglePriceItem(item.id, !item.isActive)}
                              className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                            >
                              {item.isActive ? 'Hide' : 'Show'}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {service.priceItems.length === 0 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">No price items yet.</p>
              )}
            </div>

            {canManagePricing && showNewItem === service.id ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <input
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
                <select
                  className="rounded-lg border border-border px-2 py-1.5 text-sm"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                >
                  <option value="PER_ITEM">Per item</option>
                  <option value="PER_KG">Per kg</option>
                  <option value="PER_LOAD">Per load</option>
                </select>
                <input
                  type="number"
                  className="w-28 rounded-lg border border-border px-3 py-1.5 text-sm"
                  placeholder="Price (₦)"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
                <Button size="sm" disabled={isPending} onClick={() => handleCreatePriceItem(service.id)}>
                  Add
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewItem(null)}>
                  Cancel
                </Button>
              </div>
            ) : canManagePricing ? (
              <button
                onClick={() => setShowNewItem(service.id)}
                className="text-xs text-primary hover:underline"
              >
                + Add price item
              </button>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {canManageServices && (
        <Card>
          <CardContent className="p-6">
            {showNewService ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-oxblue-900">New service</p>
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Name (e.g. Wash & Fold)"
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                />
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Slug (e.g. wash-fold)"
                  value={newService.slug}
                  onChange={(e) => setNewService({ ...newService, slug: e.target.value })}
                />
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Description (optional)"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={isPending} onClick={handleCreateService}>
                    Create service
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewService(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewService(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add a new service
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
