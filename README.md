# Cache
### Lightweight Redis caching decorators and wrappers for Node and Bun

## To install dependencies:
```bash
bun install @gargdev/cache
# or
npm install @gargdev/cache
```

## Requirements
This package relies on:
- `ioredis` (^5.6.0) - Redis client
- `superjson` (^2.2.2) - Enhanced JSON serialization and deserialization.
- `fast-json-stable-stringify` (^2.1.0) - Deterministic JSON stringification

These are included automatically when you install `@gargdev/cache`.

> Example: (redis)
```javascript
import { setRedisClient, cache, withCache, invalidateCacheByPrefix } from "@gargdev/cache"
import { Redis } from "ioredis";

setRedisClient(new Redis(6380));

type Todos = { userId: number; id: number; title: string; completed: boolean }[];
type Posts = { userId: number; id: number; title: string; body: string }[];

const fetchTodos = async (id?: number): Promise<Todos> => {
  let url = "https://jsonplaceholder.typicode.com/todos";
  if (id) url = url + `/${id}`;
  const res = await fetch(url, { method: "GET" });
  const todos = await res.json();
  return todos as Todos;
}

const fetchPosts = async (id?: number): Promise<Posts> => {
  let url = "https://jsonplaceholder.typicode.com/posts";
  if (id) url = url + `/${id}`;
  const res = await fetch(url, { method: "GET" });
  const posts = await res.json();
  return posts as Posts;
}

const fetchPostsAndTodos = async (id?: number): Promise<{posts: Posts, todos: Todos}> => {
  const [posts, todos] = await Promise.all([
    fetchPosts(id),
    fetchTodos(id)
  ])
  return { posts, todos };
}

const fetchCachedPostsAndTodos = withCache(fetchPostsAndTodos, { ttl: 60, prefix: "posts&todos" });

// using withCache wrapper
const fetchCachedTodos = withCache(fetchTodos, { ttl: 60, prefix: "todos" });

// using cache decorator
class TodoService {
  @cache({ ttl: 60, prefix: "todos" })
  static async fetchTodos(){
    return await fetchTodos();
  }

  static async invalidateTodos(){
    await invalidateCacheByPrefix("todos");
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
    },

    "/api/todos/wrapper/invalidate": {
      GET: async () => {
        fetchCachedTodos.invalidate();
        return new Response("Successfully invalidated todos", { status: 200 });
      }
    },

    "/api/todos-posts": {
      GET: async () => {
        const todosAndPosts = await fetchCachedPostsAndTodos(1);
        return Response.json({ data: todosAndPosts }, { status: 200 });
      }
    }
  },
  fetch(req) {
    return new Response("Not found", { status: 404 })
  }
})
```
> How to use fetch adapter?
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