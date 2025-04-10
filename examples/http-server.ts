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
    await fetchPosts(id),
    await fetchTodos(id)
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

