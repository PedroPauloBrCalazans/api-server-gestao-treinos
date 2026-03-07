import "dotenv/config";
import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";

import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "./lib/auth.js";
import fastifyCors from "@fastify/cors";
import fastifyApiReference from "@scalar/fastify-api-reference";
import { DiaSemana } from "./generated/prisma/enums.js";
import { CreateWorkoutPlan } from "./usecases/CreateWorkoutPlan.js";
import { fromNodeHeaders } from "better-auth/node";

const app = Fastify({
  logger: true,
});

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "Gestão Treinos",
      description: "API para gestão de treinos",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Localhost",
        url: "http://localhost:7474",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifyCors, {
  origin: ["http://localhost:3000"],
  credentials: true,
});

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "Treinos-API",
        slug: "TREINOS",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/workout-plans",
  schema: {
    body: z.object({
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
    }),
    response: {
      201: z.object({
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
      }),
      400: z.object({
        error: z.string(),
        code: z.string(),
      }),
      401: z.object({
        error: z.string(),
        code: z.string(),
      }),
    },
  },
  handler: async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply.status(401).send({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    }

    const createWorkoutPlan = new CreateWorkoutPlan();
    const result = await createWorkoutPlan.execute({
      userId: session.user.id,
      name: request.body.name,
      diaPlanoTreino: request.body.diaPlanoTreinos,
    });
    return reply.status(201).send(result);
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  },
});

// Register authentication endpoint
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      app.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

app.get("/", (request, reply) => {
  return { hello: "word" };
});

try {
  await app.listen({ port: Number(process.env.PORT) || 7474 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
