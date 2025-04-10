import { Redis } from "ioredis";

let redisClient: Redis;

function setRedisClient(client: Redis) {
  redisClient = client;
}

function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error("[@gargdev/cache] Redis client not set. Call setRedisClient(redis) first.");
  }
  return redisClient;
}

export { 
  setRedisClient,
  getRedisClient
}