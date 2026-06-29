'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { StepIndicator } from '@/components/booking/step-indicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { calculateBookingTotal } from '@/lib/pricing';
import { cn, formatCurrency } from '@/lib/utils';
import { TIME_SLOTS, type BookingInput, bookingSchema } from '@/lib/validations/booking';
import { createBookingAction } from '@/server/actions/booking';

export interface ServiceOption {
  id: string;
  name: string;
  description: string | null;
  priceItems: { id: string; name: string; price: number }[];
}
export interface ZoneOption {
  id: string;
  name: string;
  deliveryFee: number;
  estimatedTime: string | null;
}
export interface AddressOption {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string;
  zoneId: string | null;
}

const STEP_LABELS = ['Service', 'Items', 'Pickup', 'Review'];
const selectClassName =
  'flex h-11 w-full rounded-xl border border-input bg-white px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function BookingWizard({
  services,
  zones,
  addresses,
}: {
  services: ServiceOption[];
  zones: ZoneOption[];
  addresses: AddressOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [addressMode, setAddressMode] = useState<'saved' | 'new'>(
    addresses.length > 0 ? 'saved' : 'new',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: '',
      items: [],
      pickupDate: '',
      addressId: addresses[0]?.id ?? '',
      newAddress: undefined,
      specialInstructions: '',
    },
  });

  const { fields, replace } = useFieldArray({ control, name: 'items' });
  const selectedServiceId = watch('serviceId');
  const watchedItems = watch('items');
  const watchedAddressId = watch('addressId');
  const watchedNewZoneId = watch('newAddress.zoneId');

  // When the service changes, reset the line items to that service's price list.
  useEffect(() => {
    const service = services.find((s) => s.id === selectedServiceId);
    if (service) {
      replace(
        service.priceItems.map((p) => ({
          priceItemId: p.id,
          name: p.name,
          unitPrice: p.price,
          quantity: 0,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  function handleAddressModeChange(mode: 'saved' | 'new') {
    setAddressMode(mode);
    if (mode === 'new') {
      setValue('addressId', '');
    } else {
      setValue('addressId', addresses[0]?.id ?? '');
      setValue('newAddress', undefined);
    }
  }

  const selectedZoneId =
    addressMode === 'saved'
      ? addresses.find((a) => a.id === watchedAddressId)?.zoneId
      : watchedNewZoneId;
  const deliveryFee = zones.find((z) => z.id === selectedZoneId)?.deliveryFee ?? 0;
  const { subtotal, total } = calculateBookingTotal(watchedItems ?? [], deliveryFee);

  async function goNext() {
    const fieldsToValidate =
      step === 1
        ? (['serviceId'] as const)
        : step === 2
          ? (['items'] as const)
          : step === 3
            ? addressMode === 'new'
              ? ([
                  'pickupDate',
                  'pickupTimeSlot',
                  'newAddress.street',
                  'newAddress.city',
                  'newAddress.state',
                  'newAddress.zoneId',
                ] as const)
              : (['pickupDate', 'pickupTimeSlot', 'addressId'] as const)
            : [];
    const valid = await trigger(fieldsToValidate as Parameters<typeof trigger>[0]);
    if (valid) setStep((s) => Math.min(s + 1, 4));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onSubmit(values: BookingInput) {
    setIsSubmitting(true);
    try {
      const payload: BookingInput =
        addressMode === 'saved'
          ? { ...values, newAddress: undefined }
          : { ...values, addressId: '' };

      const result = await createBookingAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success('Booking confirmed!');
      router.push(`/track-order?order=${result.orderNumber}`);
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <StepIndicator steps={STEP_LABELS} current={step} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border bg-white p-6 shadow-soft-lg sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-oxblue-900">Choose a service</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className={cn(
                      'cursor-pointer rounded-xl border-2 p-4 transition-colors',
                      selectedServiceId === service.id
                        ? 'border-primary bg-oxblue-50'
                        : 'border-border hover:border-oxblue-200',
                    )}
                  >
                    <input
                      type="radio"
                      value={service.id}
                      {...register('serviceId')}
                      className="sr-only"
                    />
                    <p className="font-semibold text-oxblue-900">{service.name}</p>
                    {service.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{service.description}</p>
                    )}
                  </label>
                ))}
              </div>
              {errors.serviceId && (
                <p className="text-xs text-destructive">{errors.serviceId.message}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-oxblue-900">
                Select items &amp; quantities
              </h2>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">Choose a service first.</p>
              ) : (
                <div className="divide-y divide-border">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{field.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(field.unitPrice)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setValue(
                              `items.${index}.quantity`,
                              Math.max((watchedItems[index]?.quantity ?? 0) - 1, 0),
                            )
                          }
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {watchedItems[index]?.quantity ?? 0}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            setValue(
                              `items.${index}.quantity`,
                              (watchedItems[index]?.quantity ?? 0) + 1,
                            )
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {errors.items && (
                <p className="text-xs text-destructive">{errors.items.message as string}</p>
              )}
              <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-4 text-sm font-semibold text-oxblue-900">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="font-display text-xl font-bold text-oxblue-900">Pickup details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pickupDate">Pickup date</Label>
                    <Input
                      id="pickupDate"
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      {...register('pickupDate')}
                    />
                    {errors.pickupDate && (
                      <p className="text-xs text-destructive">{errors.pickupDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickupTimeSlot">Pickup time</Label>
                    <select
                      id="pickupTimeSlot"
                      {...register('pickupTimeSlot')}
                      className={selectClassName}
                    >
                      <option value="">Select a time</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    {errors.pickupTimeSlot && (
                      <p className="text-xs text-destructive">{errors.pickupTimeSlot.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-oxblue-900">Pickup address</h3>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() =>
                        handleAddressModeChange(addressMode === 'saved' ? 'new' : 'saved')
                      }
                    >
                      {addressMode === 'saved' ? 'Use a new address' : 'Use a saved address'}
                    </button>
                  )}
                </div>

                {addressMode === 'saved' && addresses.length > 0 ? (
                  <div className="space-y-2">
                    {addresses.map((address) => (
                      <label
                        key={address.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4',
                          watchedAddressId === address.id
                            ? 'border-primary bg-oxblue-50'
                            : 'border-border',
                        )}
                      >
                        <input
                          type="radio"
                          value={address.id}
                          {...register('addressId')}
                          className="mt-1"
                        />
                        <div className="text-sm">
                          {address.label && (
                            <p className="font-semibold text-oxblue-900">{address.label}</p>
                          )}
                          <p className="text-muted-foreground">
                            {address.street}, {address.city}, {address.state}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="newAddress.label">Label (optional)</Label>
                      <Input
                        id="newAddress.label"
                        placeholder="Home, Office..."
                        {...register('newAddress.label')}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="newAddress.street">Street address</Label>
                      <Input id="newAddress.street" {...register('newAddress.street')} />
                      {errors.newAddress?.street && (
                        <p className="text-xs text-destructive">
                          {errors.newAddress.street.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAddress.city">City</Label>
                      <Input id="newAddress.city" {...register('newAddress.city')} />
                      {errors.newAddress?.city && (
                        <p className="text-xs text-destructive">{errors.newAddress.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newAddress.state">State</Label>
                      <Input id="newAddress.state" {...register('newAddress.state')} />
                      {errors.newAddress?.state && (
                        <p className="text-xs text-destructive">
                          {errors.newAddress.state.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="newAddress.zoneId">Delivery zone</Label>
                      <select
                        id="newAddress.zoneId"
                        {...register('newAddress.zoneId')}
                        className={selectClassName}
                      >
                        <option value="">Select your area</option>
                        {zones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name} — {formatCurrency(zone.deliveryFee)}
                          </option>
                        ))}
                      </select>
                      {errors.newAddress?.zoneId && (
                        <p className="text-xs text-destructive">
                          {errors.newAddress.zoneId.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {errors.addressId && (
                  <p className="text-xs text-destructive">{errors.addressId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special instructions (optional)</Label>
                <Textarea
                  id="specialInstructions"
                  placeholder="e.g. Extra starch on shirts, gate code 1234..."
                  {...register('specialInstructions')}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-oxblue-900">
                Review &amp; confirm
              </h2>
              <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">
                    {services.find((s) => s.id === selectedServiceId)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pickup</span>
                  <span className="font-medium">
                    {watch('pickupDate')} · {watch('pickupTimeSlot')}
                  </span>
                </div>
                <div className="space-y-1 border-t border-border pt-3">
                  {watchedItems
                    .filter((item) => item.quantity > 0)
                    .map((item) => (
                      <div
                        key={item.priceItemId}
                        className="flex justify-between text-muted-foreground"
                      >
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span>{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                </div>
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-oxblue-900">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 1}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Placing order…' : `Confirm booking — ${formatCurrency(total)}`}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
