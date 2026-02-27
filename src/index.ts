import "dotenv/config";
import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", (request, reply) => {
  return { hello: "word" };
});

try {
  await fastify.listen({ port: Number(process.env.PORT) || 7474 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
