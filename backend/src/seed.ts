import { initializeDriver, getDriver } from './db';
import { RiskLevel, ResourceType } from '@shared/types';

// ============================================================
// Seed Configuration — scaled for CognoDB free tier (256MB RAM)
// ============================================================
const NUM_USERS = 1000;
const NUM_GROUPS = 30;
const NUM_ROLES = 20;
const NUM_RESOURCES = 30;

const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
const RESOURCE_TYPES: ResourceType[] = ['database', 'api', 'service', 'config'];
const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Operations', 'Sales', 'Legal', 'Marketing', 'Support'];

// Deterministic helpers (seeded with index — no Math.random)
function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function riskLevel(index: number): RiskLevel {
  return RISK_LEVELS[index % 3];
}

function resourceType(index: number): ResourceType {
  return RESOURCE_TYPES[index % 4];
}

// ============================================================
// Step 1: Constraints & Indexes (must run before any data)
// ============================================================
async function createConstraints(session: any) {
  console.log('Creating constraints and indexes...');

  const constraints = [
    'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
    'CREATE CONSTRAINT group_id_unique IF NOT EXISTS FOR (g:Group) REQUIRE g.id IS UNIQUE',
    'CREATE CONSTRAINT role_id_unique IF NOT EXISTS FOR (r:Role) REQUIRE r.id IS UNIQUE',
    'CREATE CONSTRAINT resource_id_unique IF NOT EXISTS FOR (res:Resource) REQUIRE res.id IS UNIQUE',
    'CREATE INDEX resource_risk_index IF NOT EXISTS FOR (res:Resource) ON (res.risk_level)',
    'CREATE INDEX user_email_index IF NOT EXISTS FOR (u:User) ON (u.email)',
  ];

  for (const cypher of constraints) {
    await session.run(cypher);
  }

  console.log('  Constraints and indexes created');
}

// ============================================================
// Step 2: Clear existing data (idempotent re-run)
// ============================================================
async function clearDatabase(session: any) {
  console.log('Clearing existing data...');
  await session.run('MATCH (n) DETACH DELETE n');
  console.log('  Database cleared');
}

// ============================================================
// Step 3: Create nodes (batched with UNWIND)
// ============================================================
async function createResources(session: any) {
  console.log(`Creating ${NUM_RESOURCES} resources...`);

  const resources = Array.from({ length: NUM_RESOURCES }, (_, i) => ({
    id: `resource_${i}`,
    name: `${pick(['Database', 'API', 'Service', 'Config'], i)} ${pick(DEPARTMENTS, i)}-${String(i).padStart(3, '0')}`,
    type: resourceType(i),
    risk_level: riskLevel(i),
  }));

  await session.run(
    `UNWIND $batch AS r
     CREATE (res:Resource {
       id: r.id,
       name: r.name,
       type: r.type,
       risk_level: r.risk_level
     })`,
    { batch: resources },
  );

  console.log(`  Created ${NUM_RESOURCES} resources`);
}

async function createRoles(session: any) {
  console.log(`Creating ${NUM_ROLES} roles...`);

  const roles = Array.from({ length: NUM_ROLES }, (_, i) => ({
    id: `role_${i}`,
    name: `${pick(DEPARTMENTS, i)} ${pick(['Admin', 'Editor', 'Viewer', 'Manager', 'Auditor'], i)}`,
    description: `Role with access level ${i % 5}`,
    risk_level: riskLevel(i),
  }));

  await session.run(
    `UNWIND $batch AS r
     CREATE (role:Role {
       id: r.id,
       name: r.name,
       description: r.description,
       risk_level: r.risk_level
     })`,
    { batch: roles },
  );

  console.log(`  Created ${NUM_ROLES} roles`);
}

async function createGroups(session: any) {
  console.log(`Creating ${NUM_GROUPS} groups...`);

  const groups = Array.from({ length: NUM_GROUPS }, (_, i) => ({
    id: `group_${i}`,
    name: `${pick(DEPARTMENTS, i)} Group ${i}`,
    description: `Group for ${pick(DEPARTMENTS, i)} team`,
    risk_level: riskLevel(i),
  }));

  await session.run(
    `UNWIND $batch AS g
     CREATE (grp:Group {
       id: g.id,
       name: g.name,
       description: g.description,
       risk_level: g.risk_level
     })`,
    { batch: groups },
  );

  console.log(`  Created ${NUM_GROUPS} groups`);
}

async function createUsers(session: any) {
  console.log(`Creating ${NUM_USERS} users...`);

  const domains = ['company.com', 'internal.com', 'corp.dev'];
  const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Eva', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];

  const users = Array.from({ length: NUM_USERS }, (_, i) => ({
    id: `user_${i}`,
    email: `user${i}@${pick(domains, i)}`,
    name: `${pick(firstNames, i)} ${pick(lastNames, i)} (${i})`,
    created_at: new Date().toISOString(),
  }));

  // Batch in chunks of 200 to avoid memory issues
  const CHUNK = 200;
  for (let start = 0; start < users.length; start += CHUNK) {
    const chunk = users.slice(start, start + CHUNK);
    await session.run(
      `UNWIND $batch AS u
       CREATE (user:User {
         id: u.id,
         email: u.email,
         name: u.name,
         created_at: u.created_at
       })`,
      { batch: chunk },
    );
    console.log(`  ... Created ${Math.min(start + CHUNK, NUM_USERS)}/${NUM_USERS} users`);
  }

  console.log(`  Created ${NUM_USERS} users`);
}

// ============================================================
// Step 4: Create relationships (batched)
// ============================================================
async function linkRolesToResources(session: any) {
  console.log('Linking roles to resources...');

  // Each role gets 3-10 resources (deterministic)
  const pairs: Array<{ roleId: string; resId: string }> = [];

  for (let r = 0; r < NUM_ROLES; r++) {
    const numRes = 3 + (r % 8); // 3-10
    for (let j = 0; j < numRes; j++) {
      pairs.push({
        roleId: `role_${r}`,
        resId: `resource_${(r * 7 + j * 3) % NUM_RESOURCES}`,
      });
    }
  }

  await session.run(
    `UNWIND $batch AS pair
     MATCH (r:Role {id: pair.roleId}), (res:Resource {id: pair.resId})
     CREATE (r)-[:CAN_ACCESS]->(res)`,
    { batch: pairs },
  );

  console.log(`  Created ${pairs.length} role->resource relationships`);
}

async function linkGroupsToRoles(session: any) {
  console.log('Linking groups to roles...');

  const pairs: Array<{ groupId: string; roleId: string }> = [];

  for (let g = 0; g < NUM_GROUPS; g++) {
    const numRoles = 1 + (g % 4); // 1-4 roles per group
    for (let j = 0; j < numRoles; j++) {
      pairs.push({
        groupId: `group_${g}`,
        roleId: `role_${(g * 3 + j * 5) % NUM_ROLES}`,
      });
    }
  }

  await session.run(
    `UNWIND $batch AS pair
     MATCH (g:Group {id: pair.groupId}), (r:Role {id: pair.roleId})
     CREATE (g)-[:HAS_ROLE]->(r)`,
    { batch: pairs },
  );

  console.log(`  Created ${pairs.length} group->role relationships`);
}

async function createGroupHierarchy(session: any) {
  console.log('Creating group hierarchy...');

  const pairs: Array<{ childId: string; parentId: string }> = [];

  for (let g = 0; g < NUM_GROUPS; g++) {
    // ~60% of groups have a parent (deterministic)
    if (g % 5 < 3) {
      const parentIdx = (g * 7 + 3) % NUM_GROUPS;
      if (parentIdx !== g) {
        pairs.push({
          childId: `group_${g}`,
          parentId: `group_${parentIdx}`,
        });
      }
    }
  }

  await session.run(
    `UNWIND $batch AS pair
     MATCH (child:Group {id: pair.childId}), (parent:Group {id: pair.parentId})
     CREATE (child)-[:MEMBER_OF]->(parent)`,
    { batch: pairs },
  );

  console.log(`  Created ${pairs.length} group hierarchy relationships`);
}

async function linkUsersToGroups(session: any) {
  console.log('Linking users to groups...');

  const pairs: Array<{ userId: string; groupId: string }> = [];

  for (let u = 0; u < NUM_USERS; u++) {
    const numGroups = 1 + (u % 3); // 1-3 groups per user
    for (let j = 0; j < numGroups; j++) {
      pairs.push({
        userId: `user_${u}`,
        groupId: `group_${(u * 5 + j * 11) % NUM_GROUPS}`,
      });
    }
  }

  // Batch in chunks of 500
  const CHUNK = 500;
  for (let start = 0; start < pairs.length; start += CHUNK) {
    const chunk = pairs.slice(start, start + CHUNK);
    await session.run(
      `UNWIND $batch AS pair
       MATCH (u:User {id: pair.userId}), (g:Group {id: pair.groupId})
       CREATE (u)-[:MEMBER_OF]->(g)`,
      { batch: chunk },
    );
  }

  console.log(`  Created ${pairs.length} user->group relationships`);
}

// ============================================================
// Step 5: Verify
// ============================================================
async function verify(session: any) {
  console.log('\nVerifying seed data...');

  const nodeCount = await session.run('MATCH (n) RETURN count(n) as count');
  const relCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');

  const users = await session.run('MATCH (u:User) RETURN count(u) as count');
  const groups = await session.run('MATCH (g:Group) RETURN count(g) as count');
  const roles = await session.run('MATCH (r:Role) RETURN count(r) as count');
  const resources = await session.run('MATCH (res:Resource) RETURN count(res) as count');

  const totalNodes = nodeCount.records[0].get('count').toNumber();
  const totalRels = relCount.records[0].get('count').toNumber();

  console.log(`  Nodes:       ${totalNodes} (expected ~${NUM_USERS + NUM_GROUPS + NUM_ROLES + NUM_RESOURCES})`);
  console.log(`  Relationships: ${totalRels}`);
  console.log(`  Users:       ${users.records[0].get('count').toNumber()}`);
  console.log(`  Groups:      ${groups.records[0].get('count').toNumber()}`);
  console.log(`  Roles:       ${roles.records[0].get('count').toNumber()}`);
  console.log(`  Resources:   ${resources.records[0].get('count').toNumber()}`);
  console.log('\nSeed complete!');
}

// ============================================================
// Main
// ============================================================
async function seedDatabase() {
  initializeDriver();
  const driver = getDriver();
  const session = driver.session();

  try {
    await createConstraints(session);
    await clearDatabase(session);

    // Nodes
    await createResources(session);
    await createRoles(session);
    await createGroups(session);
    await createUsers(session);

    // Relationships
    await linkRolesToResources(session);
    await linkGroupsToRoles(session);
    await createGroupHierarchy(session);
    await linkUsersToGroups(session);

    // Verify
    await verify(session);
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await session.close();
  }
}

if (require.main === module) {
  (async () => {
    try {
      await seedDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    }
  })();
}
