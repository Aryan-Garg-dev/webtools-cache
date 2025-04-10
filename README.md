# Cache
### Lightweight Redis caching decorators and wrappers for Node and Bun

To install dependencies:
```bash
bun install @gargdev/cache
# or
npm install @gargdev/cache
```

Example:
```javascript
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
```

To invalidate Cache
```javascript
// for wrapper
fetchCachedTodos.invalidate();

// for decorator, create another method
import { invalidateCacheByPrefix } from "@gargdev/cache"

class TodoService {
  static async invalidateTodos(){
    await invalidateCacheByPrefix("prefix");
  }
}

TodoService.invalidateTodos();
```

How to use fetch client?
```javascript
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


```