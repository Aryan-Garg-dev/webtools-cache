import { setRedisClient, cache, withCache } from "@gargdev/cache"
import { Redis } from "ioredis";

setRedisClient(new Redis(6380));

type Todos = { userId: number; id: number; title: string; completed: boolean }[];

const fetchTodos = async (): Promise<Todos> => {
  const res = await fetch("https://jsonplaceholder.typicode.com/todos", { method: "GET" });
  const todos = await res.json();
  return todos as Todos;

}

// using withCache wrapper
const fetchCachedTodos = withCache(fetchTodos, { ttl: 60, prefix: "todos" });

// using cache decorator
class TodoService {
  @cache({ ttl: 60, prefix: "todos" })
  static async fetchTodos(){
    return await fetchTodos();
  }
}

Bun.serve({
  port: 3000,
  routes: {
    "/api/todos/decorator": {
      GET: async () => {
        const todos = await TodoService.fetchTodos();
        return Response.json({ data: todos }, { status: 200 });
      }
    },
    "/api/todos/wrapper": {
      GET: async () => {
        const todos = await fetchCachedTodos();
        return Response.json({ data: todos }, { status: 200 });
      }
    }
  },
  fetch(req) {
    return new Response("Not found", { status: 404 })
  }
})

