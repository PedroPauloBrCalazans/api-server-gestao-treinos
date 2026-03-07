import z from "zod";
import { DiaSemana } from "../generated/prisma/enums.js";

export const ErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
});

export const WorkoutPlanSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
  diaPlanoTreinos: z.array(
    z.object({
      name: z.string().trim().min(1),
      weekDay: z.enum(DiaSemana),
      isRest: z.boolean().default(false),
      estimatedDurationInSeconds: z.number().min(1),
      exercises: z.array(
        z.object({
          name: z.string().trim().min(1),
          order: z.number().min(0),
          sets: z.number().min(1),
          reps: z.number().min(1),
          restTimeInSeconds: z.number().min(1),
        }),
      ),
    }),
  ),
});
