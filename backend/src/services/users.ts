import { getDriver } from '../db';
import { User, UserListItem, RoleWithCount, UserStats } from '@shared/types';
import { TieredCache } from './cache';

const userCache = new TieredCache<User | UserListItem[] | UserStats | null>(200, 30_000);

export async function getUser(userId: string): Promise<User | null> {
  const cached = userCache.get(`user:${userId}`);
  if (cached !== undefined) return cached as User;

  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {id: $userId})
       RETURN u.id AS id, u.email AS email, u.name AS name, u.created_at AS created_at`,
      { userId },
    );

    if (result.records.length === 0) {
      userCache.set(`user:${userId}`, null);
      return null;
    }

    const rec = result.records[0];
    const user: User = {
      id: rec.get('id'),
      email: rec.get('email'),
      name: rec.get('name'),
      created_at: rec.get('created_at'),
    };

    userCache.set(`user:${userId}`, user);
    return user;
  } finally {
    await session.close();
  }
}

export async function searchUsers(query: string): Promise<UserListItem[]> {
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `users:search:${normalizedQuery}`;
  const cached = userCache.get(cacheKey);
  if (cached) return cached as UserListItem[];

  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)
       WHERE toLower(u.name) CONTAINS toLower($query)
          OR toLower(u.email) CONTAINS toLower($query)
       OPTIONAL MATCH (u)-[:MEMBER_OF*1..6]->(:Group)
                      -[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(res:Resource)
       WITH u,
            count(DISTINCT res) AS escCount,
            CASE WHEN EXISTS {
              MATCH (u)-[:MEMBER_OF*1..6]->(:Group)
                    -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(:Resource)
              WHERE r.risk_level = 'HIGH'
            } THEN true ELSE false END AS hasHigh
       RETURN u.id AS id, u.email AS email, u.name AS name,
              u.created_at AS created_at,
              escCount, hasHigh
       ORDER BY u.name, u.id
       LIMIT 200`,
      { query: normalizedQuery },
    );

    const users: UserListItem[] = result.records.map((rec) => ({
      id: rec.get('id'),
      email: rec.get('email'),
      name: rec.get('name'),
      created_at: rec.get('created_at'),
      escalation_count: rec.get('escCount').toNumber(),
      has_high_risk: rec.get('hasHigh'),
    }));

    userCache.set(cacheKey, users, 15_000);
    return users;
  } finally {
    await session.close();
  }
}

export async function getAllUsers(): Promise<UserListItem[]> {
  const cached = userCache.get('users:all');
  if (cached) return cached as UserListItem[];

  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)
       OPTIONAL MATCH (u)-[:MEMBER_OF*1..6]->(:Group)
                      -[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(res:Resource)
       WITH u,
            count(DISTINCT res) AS escCount,
            CASE WHEN EXISTS {
              MATCH (u)-[:MEMBER_OF*1..6]->(:Group)
                    -[:HAS_ROLE]->(r:Role)-[:CAN_ACCESS]->(:Resource)
              WHERE r.risk_level = 'HIGH'
            } THEN true ELSE false END AS hasHigh
       RETURN u.id AS id, u.email AS email, u.name AS name,
              u.created_at AS created_at,
              escCount, hasHigh
       ORDER BY u.name, u.id`,
    );

    const users: UserListItem[] = result.records.map((rec) => ({
      id: rec.get('id'),
      email: rec.get('email'),
      name: rec.get('name'),
      created_at: rec.get('created_at'),
      escalation_count: rec.get('escCount').toNumber(),
      has_high_risk: rec.get('hasHigh'),
    }));

    userCache.set('users:all', users, 15_000);
    return users;
  } finally {
    await session.close();
  }
}

export async function getUserStats(): Promise<UserStats> {
  const cached = userCache.get('users:stats');
  if (cached) return cached as UserStats;

  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User)
       OPTIONAL MATCH (u)-[:MEMBER_OF*1..6]->(:Group)
                      -[:HAS_ROLE]->(:Role)-[:CAN_ACCESS]->(res:Resource)
       WITH u, count(DISTINCT res) AS accessCount
       RETURN count(u) AS total,
              avg(accessCount) AS avgAccess,
              max(accessCount) AS maxAccess,
              percentileCont(accessCount, 0.5) AS medianAccess`,
    );

    const rec = result.records[0];
    const stats: UserStats = {
      total_users: rec.get('total').toNumber(),
      avg_access: Math.round(rec.get('avgAccess') * 10) / 10,
      max_access: rec.get('maxAccess').toNumber(),
      median_access: Math.round(rec.get('medianAccess') * 10) / 10,
    };

    userCache.set('users:stats', stats, 30_000);
    return stats;
  } finally {
    await session.close();
  }
}

export async function getAllRoles(): Promise<RoleWithCount[]> {
  const driver = getDriver();
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (r:Role)-[:CAN_ACCESS]->(res:Resource)
       RETURN r.id AS id, r.name AS name, r.description AS description,
              r.risk_level AS risk_level,
              count(res) AS resource_count
       ORDER BY r.name`,
    );

    return result.records.map((rec) => ({
      id: rec.get('id'),
      name: rec.get('name'),
      description: rec.get('description'),
      risk_level: rec.get('risk_level'),
      resource_count: rec.get('resource_count').toNumber(),
    }));
  } finally {
    await session.close();
  }
}
