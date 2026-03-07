import { DiaSemana } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

interface InputDto {
  userId: string;
  name: string;
  diaPlanoTreino: Array<{
    name: string;
    weekDay: DiaSemana;
    isRest: boolean;
    estimatedDurationInSeconds: number;
    exercises: Array<{
      order: number;
      name: string;
      sets: number;
      reps: number;
      restTimeInSeconds: number;
    }>;
  }>;
}

// export interface OutputDto {
//   id: string;
// }

export class CreateWorkoutPlan {
  async execute(dto: InputDto) {
    const existingWorkoutPlan = await prisma.planoTreino.findFirst({
      where: {
        isActive: true,
      },
    });

    return prisma.$transaction(async (tx) => {
      if (existingWorkoutPlan) {
        await tx.planoTreino.update({
          where: { id: existingWorkoutPlan.id },
          data: { isActive: false },
        });
      }

      const planoTreino = await tx.planoTreino.create({
        data: {
          name: dto.name,
          userId: dto.userId,
          isActive: true,
          diaPlanoTreinos: {
            create: dto.diaPlanoTreino.map((diaTreino) => ({
              name: diaTreino.name,
              weekDay: diaTreino.weekDay,
              isRest: diaTreino.isRest,
              estimatedDurationInSeconds: diaTreino.estimatedDurationInSeconds,
              exercises: {
                create: diaTreino.exercises.map((exercicios) => ({
                  name: exercicios.name,
                  order: exercicios.order,
                  sets: exercicios.sets,
                  reps: exercicios.reps,
                  restTimeInSeconds: exercicios.restTimeInSeconds,
                })),
              },
            })),
          },
        },
      });

      const result = await tx.planoTreino.findUnique({
        where: { id: planoTreino.id },
        include: {
          diaPlanoTreinos: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!result) {
        throw new Error("Plano de treino não encontrado!");
      }

      return result;
    });
  }
}

//Transaction = ponto positivo dos BD relacionais, garanto atomicidade, vc atualiza e cria ou não faz nenhum dos dois, caso o banco cai ele desfaz a atualização
//Controller = valida formato de dados e formatações
//UseCases = valida regra de negocios
