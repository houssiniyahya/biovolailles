"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SupportedEventType } from "@/domain/production/event-payloads";
import { createLotEventAction } from "../actions";

const EVENT_TYPE_OPTIONS: { value: SupportedEventType; label: string }[] = [
  { value: "MISE_EN_PLACE", label: "Mise en place" },
  { value: "MORTALITE", label: "Mortalité" },
  { value: "PESEE", label: "Pesée" },
  { value: "ALIMENTATION", label: "Alimentation" },
  { value: "TRANSFERT", label: "Transfert" },
  { value: "AUTRE", label: "Autre" },
];

export function EventCreateDialog({ lotId, currentPopulation }: { lotId: string; currentPopulation: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<SupportedEventType>("MORTALITE");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    let payload: unknown;
    switch (eventType) {
      case "MISE_EN_PLACE":
        payload = { notes: (formData.get("notes") as string) || undefined };
        break;
      case "MORTALITE":
        payload = {
          quantity: Number(formData.get("quantity")),
          cause: (formData.get("cause") as string) || undefined,
        };
        break;
      case "PESEE":
        payload = {
          averageWeightKg: Number(formData.get("averageWeightKg")),
          sampleSize: formData.get("sampleSize") ? Number(formData.get("sampleSize")) : undefined,
        };
        break;
      case "ALIMENTATION":
        payload = {
          quantityKg: Number(formData.get("quantityKg")),
          feedType: (formData.get("feedType") as string) || undefined,
        };
        break;
      case "TRANSFERT":
        payload = {
          quantity: Number(formData.get("quantity")),
          destination: (formData.get("destination") as string) || undefined,
          notes: (formData.get("notes") as string) || undefined,
        };
        break;
      case "AUTRE":
        payload = { description: formData.get("description") as string };
        break;
    }

    const result = await createLotEventAction(lotId, eventType, payload);
    setPending(false);
    if (!result.ok) {
      setError(result.error?.message ?? "Impossible d'enregistrer l'événement.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <PlusCircle className="size-4" aria-hidden="true" />
          Ajouter un événement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un événement</DialogTitle>
          <DialogDescription>Population actuelle du lot : {currentPopulation.toLocaleString("fr-FR")}.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventType">
              Type d&apos;événement
            </Label>
            <Select
              id="eventType"
              value={eventType}
              onChange={(event) => setEventType(event.target.value as SupportedEventType)}
            >
              {EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {eventType === "MISE_EN_PLACE" ? (
            <Field label="Notes" name="notes" />
          ) : null}

          {eventType === "MORTALITE" ? (
            <>
              <Field label="Quantité (sujets)" name="quantity" type="number" min={1} required />
              <Field label="Cause (optionnel)" name="cause" />
            </>
          ) : null}

          {eventType === "PESEE" ? (
            <>
              <Field label="Poids moyen (kg)" name="averageWeightKg" type="number" step="0.01" min={0} required />
              <Field label="Taille d'échantillon (optionnel)" name="sampleSize" type="number" min={1} />
            </>
          ) : null}

          {eventType === "ALIMENTATION" ? (
            <>
              <Field label="Quantité (kg)" name="quantityKg" type="number" step="0.1" min={0} required />
              <Field label="Type d'aliment (optionnel)" name="feedType" />
            </>
          ) : null}

          {eventType === "TRANSFERT" ? (
            <>
              <Field label="Quantité (sujets)" name="quantity" type="number" min={1} required />
              <Field label="Destination (optionnel)" name="destination" />
              <Field label="Notes (optionnel)" name="notes" />
            </>
          ) : null}

          {eventType === "AUTRE" ? <Field label="Description" name="description" required /> : null}

          {error ? (
            <p role="alert" className="rounded-md bg-critical/10 px-3 py-2 text-xs text-critical-strong">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-1">
            Enregistrer l&apos;événement
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>
        {label}
      </Label>
      <Input id={name} name={name} type={type} {...rest} />
    </div>
  );
}
