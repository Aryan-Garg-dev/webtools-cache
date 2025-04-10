import { createFetchClient, setRedisClient } from "@gargdev/cache";
import { Redis } from "ioredis";

setRedisClient(new Redis(6380));

type Todos = { userId: number; id: number; title: string; completed: boolean }[];
type Posts = { userId: number; id: number; title: string; body: string }[];

const jsonFetcher = createFetchClient({
  baseURL: "https://jsonplaceholder.typicode.com/",
  retries: 2,
  storage: "redis",
  ttl: 60,
  prefix: "jsonFetcher",
  cacheKeyResolver: (url)=>url,
})

jsonFetcher.prefetch("posts");

Bun.serve({
  port: 3000,
  routes: {
    "/api/todos": {
      GET: async () => {
        const todos = await jsonFetcher.fetch<Todos>("todos", {
          useCache: true,
          ttl: 100,
        });
        return Response.json({ data: todos.data }, { status: 200 });
      }
    },

    "/api/todos/invalidate": {
      GET: async () => {
        const todosKey = jsonFetcher.getCacheKey("todos");
        jsonFetcher.invalidate(todosKey);
        return new Response("Sucessfully invalidated todos", { status: 200 });
      }
    },

    "/api/posts": {
      GET: async () => {
        const posts = await jsonFetcher.fetch<Posts>("posts", { useCache: true });
        return Response.json({ data: posts.data }, { status: 200 });
      }
    }
  },
  fetch(req) {
    return new Response("Not found", { status: 404 })
  }
})


