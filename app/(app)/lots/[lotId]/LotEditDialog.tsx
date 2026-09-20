"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DATA_STATUS } from "@/domain/shared/enums";
import type { Lot } from "@/domain/production/types";
import { DATA_STATUS_LABEL } from "@/lib/status-colors";
import { updateLotAction } from "../actions";

const formSchema = z.object({
  species: z.string().trim().min(1, "Requis."),
  breed: z.string().trim().min(1, "Requis."),
  plannedStartAt: z.string().optional(),
  dataStatus: z.enum(DATA_STATUS),
});
type FormValues = z.infer<typeof formSchema>;

export function LotEditDialog({ lot }: { lot: Lot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      species: lot.species,
      breed: lot.breed,
      plannedStartAt: lot.plannedStartAt ?? "",
      dataStatus: lot.dataStatus,
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const result = await updateLotAction(lot.id, { ...values, plannedStartAt: values.plannedStartAt || null });
    if (!result.ok) {
      setFormError(result.error?.message ?? "Modification impossible.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Pencil className="size-4" aria-hidden="true" />
          Modifier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le lot {lot.code}</DialogTitle>
          <DialogDescription>
            Seuls les champs d&apos;identité et de planification sont modifiables ici. La population et le statut
            passent par des flux dédiés.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="species">
                Espèce
              </Label>
              <Input id="species" {...register("species")} />
              {errors.species ? <p className="text-xs text-critical-strong">{errors.species.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="breed">
                Souche
              </Label>
              <Input id="breed" {...register("breed")} />
              {errors.breed ? <p className="text-xs text-critical-strong">{errors.breed.message}</p> : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plannedStartAt">
              Date de démarrage prévue
            </Label>
            <Input id="plannedStartAt" type="date" {...register("plannedStartAt")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dataStatus">
              Statut des données
            </Label>
            <Select id="dataStatus" {...register("dataStatus")}>
              {DATA_STATUS.map((s) => (
                <option key={s} value={s}>
                  {DATA_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          {formError ? (
            <p role="alert" className="rounded-md bg-critical/10 px-3 py-2 text-xs text-critical-strong">
              {formError}
            </p>
          ) : null}
          <Button type="submit" disabled={isSubmitting} className="mt-1">
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
