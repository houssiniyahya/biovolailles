"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DATA_STATUS } from "@/domain/shared/enums";
import { DATA_STATUS_LABEL } from "@/lib/status-colors";
import { createLotAction } from "./actions";

const formSchema = z.object({
  code: z.string().trim().min(3, "Au moins 3 caractères."),
  buildingId: z.string().min(1, "Sélectionnez un bâtiment."),
  species: z.string().trim().min(1, "Requis."),
  breed: z.string().trim().min(1, "Requis."),
  initialPopulation: z.number().int().positive("Doit être positif."),
  plannedStartAt: z.string().optional(),
  dataStatus: z.enum(DATA_STATUS),
});
type FormValues = z.infer<typeof formSchema>;

export function LotCreateDialog({ buildings }: { buildings: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { dataStatus: "SIMULATION" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const result = await createLotAction({
      ...values,
      plannedStartAt: values.plannedStartAt || null,
    });
    if (!result.ok) {
      setFormError(result.error?.message ?? "Impossible de créer le lot.");
      return;
    }
    setOpen(false);
    reset();
    router.push(`/lots/${result.data!.lotId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden="true" />
          Nouveau lot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un lot</DialogTitle>
          <DialogDescription>Informations minimales requises pour démarrer un lot.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">
              Numéro de lot (Business ID)
            </Label>
            <Input id="code" placeholder="BU-2026-002" {...register("code")} />
            {errors.code ? <p className="text-xs text-critical-strong">{errors.code.message}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="buildingId">
              Bâtiment
            </Label>
            <Select id="buildingId" {...register("buildingId")} defaultValue="">
              <option value="" disabled>
                Sélectionner…
              </option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.label}
                </option>
              ))}
            </Select>
            {errors.buildingId ? <p className="text-xs text-critical-strong">{errors.buildingId.message}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="species">
                Espèce
              </Label>
              <Input id="species" placeholder="Poulet de chair" {...register("species")} />
              {errors.species ? <p className="text-xs text-critical-strong">{errors.species.message}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="breed">
                Souche
              </Label>
              <Input id="breed" placeholder="Ross 308" {...register("breed")} />
              {errors.breed ? <p className="text-xs text-critical-strong">{errors.breed.message}</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="initialPopulation">
                Population initiale
              </Label>
              <Input
                id="initialPopulation"
                type="number"
                min={1}
                {...register("initialPopulation", { valueAsNumber: true })}
              />
              {errors.initialPopulation ? (
                <p className="text-xs text-critical-strong">{errors.initialPopulation.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plannedStartAt">
                Date de démarrage prévue
              </Label>
              <Input id="plannedStartAt" type="date" {...register("plannedStartAt")} />
            </div>
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
            Créer le lot
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
