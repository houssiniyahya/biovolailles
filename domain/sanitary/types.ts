import type { SanitaryStatus, ValidationStatus } from "../shared/enums";

export interface SanitaryObservation {
  id: string;
  lotId: string;
  status: SanitaryStatus;
  notes: string;
  observedBy: string;
  observedAt: string;
  validatedBy: string | null;
  validationStatus: ValidationStatus;
}

export type NewSanitaryObservation = Omit<SanitaryObservation, "id">;
