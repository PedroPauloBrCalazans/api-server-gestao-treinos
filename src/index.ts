import "dotenv/config";
import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

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

await app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
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
