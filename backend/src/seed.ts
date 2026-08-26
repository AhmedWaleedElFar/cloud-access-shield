import { initializeDriver, getDriver } from './db';
import { RiskLevel, ResourceType } from '@shared/types';

// ============================================================
// Seed Configuration — realistic IAM scenario
// ============================================================

// Realistic names
const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna',
  'Kenneth', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
];

const DOMAINS = ['acme-corp.com', 'globex.io', 'initech.dev', 'umbrella.co'];

// Realistic groups — corporate IAM hierarchy
const GROUPS = [
  // Department groups
  { id: 'grp_engineering', name: 'Engineering', desc: 'All engineering staff', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_devops', name: 'DevOps', desc: 'Infrastructure and deployment team', risk: 'HIGH' as RiskLevel },
  { id: 'grp_security', name: 'Security Team', desc: 'InfoSec and compliance', risk: 'HIGH' as RiskLevel },
  { id: 'grp_finance', name: 'Finance', desc: 'Finance and accounting', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_hr', name: 'Human Resources', desc: 'HR and recruiting', risk: 'LOW' as RiskLevel },
  { id: 'grp_sales', name: 'Sales', desc: 'Sales and business development', risk: 'LOW' as RiskLevel },
  { id: 'grp_marketing', name: 'Marketing', desc: 'Marketing and communications', risk: 'LOW' as RiskLevel },
  { id: 'grp_legal', name: 'Legal', desc: 'Legal and compliance', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_operations', name: 'Operations', desc: 'Business operations', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_support', name: 'Customer Support', desc: 'Support engineers', risk: 'LOW' as RiskLevel },
  // Sub-groups (for hierarchy)
  { id: 'grp_backend', name: 'Backend Team', desc: 'Backend engineers under Engineering', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_frontend', name: 'Frontend Team', desc: 'Frontend engineers under Engineering', risk: 'LOW' as RiskLevel },
  { id: 'grp_platform', name: 'Platform Team', desc: 'Platform engineering under DevOps', risk: 'HIGH' as RiskLevel },
  { id: 'grp_sre', name: 'SRE', desc: 'Site reliability engineers', risk: 'HIGH' as RiskLevel },
  { id: 'grp_data', name: 'Data Team', desc: 'Data engineering and analytics', risk: 'HIGH' as RiskLevel },
  { id: 'grp_qa', name: 'QA Team', desc: 'Quality assurance', risk: 'LOW' as RiskLevel },
  { id: 'grp_intern', name: 'Interns', desc: 'Summer intern cohort', risk: 'LOW' as RiskLevel },
  { id: 'grp_contractors', name: 'Contractors', desc: 'External contractors', risk: 'MEDIUM' as RiskLevel },
  { id: 'grp_exec', name: 'Executive', desc: 'C-suite and VPs', risk: 'HIGH' as RiskLevel },
  { id: 'grp_audit', name: 'Audit Committee', desc: 'Internal audit group', risk: 'MEDIUM' as RiskLevel },
  // CYCLIC DEPENDENCY GROUPS
  { id: 'grp_infra_a', name: 'Infrastructure Alpha', desc: 'Infra team A — manages prod DBs', risk: 'HIGH' as RiskLevel },
  { id: 'grp_infra_b', name: 'Infrastructure Beta', desc: 'Infra team B — manages prod APIs', risk: 'HIGH' as RiskLevel },
  { id: 'grp_cloud', name: 'Cloud Operations', desc: 'Cloud resource management', risk: 'HIGH' as RiskLevel },
];

// Realistic roles
const ROLES = [
  { id: 'role_admin', name: 'System Admin', desc: 'Full system access', risk: 'HIGH' as RiskLevel },
  { id: 'role_db_admin', name: 'Database Admin', desc: 'Database management', risk: 'HIGH' as RiskLevel },
  { id: 'role_dev_lead', name: 'Engineering Lead', desc: 'Engineering leadership', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_senior_dev', name: 'Senior Developer', desc: 'Senior IC with elevated access', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_dev', name: 'Developer', desc: 'Standard developer access', risk: 'LOW' as RiskLevel },
  { id: 'role_intern', name: 'Intern', desc: 'Limited access for interns', risk: 'LOW' as RiskLevel },
  { id: 'role_ops', name: 'Operations Manager', desc: 'Ops team management', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_sre', name: 'Site Reliability Engineer', desc: 'Production infrastructure access', risk: 'HIGH' as RiskLevel },
  { id: 'role_security', name: 'Security Analyst', desc: 'Security monitoring and response', risk: 'HIGH' as RiskLevel },
  { id: 'role_auditor', name: 'Compliance Auditor', desc: 'Read-only audit access', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_finance_mgr', name: 'Finance Manager', desc: 'Financial data access', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_hr_mgr', name: 'HR Manager', desc: 'Employee data access', risk: 'LOW' as RiskLevel },
  { id: 'role_sales', name: 'Sales Rep', desc: 'CRM and sales tools', risk: 'LOW' as RiskLevel },
  { id: 'role_marketing', name: 'Marketing Manager', desc: 'Marketing tools access', risk: 'LOW' as RiskLevel },
  { id: 'role_exec', name: 'Executive', desc: 'C-level access to everything', risk: 'HIGH' as RiskLevel },
  { id: 'role_contractor', name: 'Contractor', desc: 'Limited external access', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_data_eng', name: 'Data Engineer', desc: 'Data pipeline access', risk: 'HIGH' as RiskLevel },
  { id: 'role_qa', name: 'QA Engineer', desc: 'Test environment access', risk: 'LOW' as RiskLevel },
  { id: 'role_legal', name: 'Legal Counsel', desc: 'Legal document access', risk: 'MEDIUM' as RiskLevel },
  { id: 'role_support', name: 'Support Engineer', desc: 'Customer support tools', risk: 'LOW' as RiskLevel },
];

// Realistic resources
const RESOURCES = [
  { id: 'res_prod_db', name: 'Production Database', type: 'database' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_staging_db', name: 'Staging Database', type: 'database' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_analytics_db', name: 'Analytics Database', type: 'database' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_user_db', name: 'User Data Store', type: 'database' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_payments_db', name: 'Payment Records DB', type: 'database' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_logs_db', name: 'Application Logs', type: 'database' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_api_gateway', name: 'API Gateway', type: 'api' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_auth_api', name: 'Auth Service API', type: 'api' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_billing_api', name: 'Billing API', type: 'api' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_hr_api', name: 'HR Portal API', type: 'api' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_crm_api', name: 'CRM API', type: 'api' as ResourceType, risk: 'LOW' as RiskLevel },
  { id: 'res_internal_api', name: 'Internal Tools API', type: 'api' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_k8s', name: 'Kubernetes Cluster', type: 'service' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_cicd', name: 'CI/CD Pipeline', type: 'service' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_monitoring', name: 'Monitoring Stack', type: 'service' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_vpn', name: 'VPN Gateway', type: 'service' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_mail', name: 'Email Service', type: 'service' as ResourceType, risk: 'LOW' as RiskLevel },
  { id: 'res_storage', name: 'Cloud Storage', type: 'service' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_dns', name: 'DNS Management', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_tls', name: 'TLS Certificates', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_iam', name: 'IAM Configuration', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_network', name: 'Network Configuration', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_secrets', name: 'Secrets Manager', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_backup', name: 'Backup Configuration', type: 'config' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_firewall', name: 'Firewall Rules', type: 'config' as ResourceType, risk: 'HIGH' as RiskLevel },
  { id: 'res_lambda', name: 'Lambda Functions', type: 'service' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_queue', name: 'Message Queue', type: 'service' as ResourceType, risk: 'MEDIUM' as RiskLevel },
  { id: 'res_cache', name: 'Redis Cache', type: 'service' as ResourceType, risk: 'LOW' as RiskLevel },
  { id: 'res_cdn', name: 'CDN Configuration', type: 'config' as ResourceType, risk: 'LOW' as RiskLevel },
  { id: 'res_reporting', name: 'Reporting Dashboard', type: 'api' as ResourceType, risk: 'LOW' as RiskLevel },
];

// Deterministic helpers
function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

// ============================================================
// Step 1: Constraints & Indexes
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
  console.log('  Done');
}

async function clearDatabase(session: any) {
  console.log('Clearing existing data...');
  await session.run('MATCH (n) DETACH DELETE n');
  console.log('  Done');
}

// ============================================================
// Step 2: Create nodes
// ============================================================
async function createResources(session: any) {
  console.log(`Creating ${RESOURCES.length} resources...`);
  await session.run(
    `UNWIND $batch AS r
     CREATE (res:Resource {id: r.id, name: r.name, type: r.type, risk_level: r.risk})`,
    { batch: RESOURCES },
  );
  console.log('  Done');
}

async function createRoles(session: any) {
  console.log(`Creating ${ROLES.length} roles...`);
  await session.run(
    `UNWIND $batch AS r
     CREATE (role:Role {id: r.id, name: r.name, description: r.desc, risk_level: r.risk})`,
    { batch: ROLES },
  );
  console.log('  Done');
}

async function createGroups(session: any) {
  console.log(`Creating ${GROUPS.length} groups...`);
  await session.run(
    `UNWIND $batch AS g
     CREATE (grp:Group {id: g.id, name: g.name, description: g.desc, risk_level: g.risk})`,
    { batch: GROUPS },
  );
  console.log('  Done');
}

async function createUsers(session: any) {
  const NUM_USERS = 1000;
  console.log(`Creating ${NUM_USERS} users...`);

  const users = Array.from({ length: NUM_USERS }, (_, i) => ({
    id: `user_${i}`,
    name: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, (i * 7 + 3) % LAST_NAMES.length)}`,
    email: `${pick(FIRST_NAMES, i).toLowerCase()}.${pick(LAST_NAMES, (i * 7 + 3) % LAST_NAMES.length).toLowerCase()}@${pick(DOMAINS, i)}`,
    created_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
  }));

  const CHUNK = 200;
  for (let start = 0; start < users.length; start += CHUNK) {
    const chunk = users.slice(start, start + CHUNK);
    await session.run(
      `UNWIND $batch AS u
       CREATE (user:User {id: u.id, email: u.email, name: u.name, created_at: u.created_at})`,
      { batch: chunk },
    );
    console.log(`  ... ${Math.min(start + CHUNK, NUM_USERS)}/${NUM_USERS}`);
  }
  console.log('  Done');
}

// ============================================================
// Step 3: Create relationships
// ============================================================
async function createRoleResourceLinks(session: any) {
  console.log('Linking roles to resources...');

  // Hand-crafted: which roles access which resources
  const links: Array<{ roleId: string; resId: string }> = [
    // Admin → everything critical
    ...['res_prod_db', 'res_staging_db', 'res_analytics_db', 'res_user_db', 'res_payments_db',
        'res_auth_api', 'res_billing_api', 'res_k8s', 'res_cicd', 'res_vpn', 'res_dns',
        'res_tls', 'res_iam', 'res_network', 'res_secrets', 'res_firewall'].map(resId => ({ roleId: 'role_admin', resId })),
    // DB Admin → databases
    ...['res_prod_db', 'res_staging_db', 'res_analytics_db', 'res_user_db', 'res_payments_db', 'res_backup'].map(resId => ({ roleId: 'role_db_admin', resId })),
    // SRE → infra
    ...['res_k8s', 'res_cicd', 'res_monitoring', 'res_vpn', 'res_dns', 'res_network', 'res_firewall', 'res_logs_db', 'res_lambda'].map(resId => ({ roleId: 'role_sre', resId })),
    // Security → security tools
    ...['res_auth_api', 'res_iam', 'res_firewall', 'res_secrets', 'res_logs_db', 'res_vpn', 'res_monitoring'].map(resId => ({ roleId: 'role_security', resId })),
    // Executive → everything
    ...['res_prod_db', 'res_analytics_db', 'res_payments_db', 'res_billing_api', 'res_crm_api', 'res_reporting', 'res_iam'].map(resId => ({ roleId: 'role_exec', resId })),
    // Data Engineer → analytics
    ...['res_analytics_db', 'res_logs_db', 'res_lambda', 'res_queue', 'res_cache', 'res_reporting'].map(resId => ({ roleId: 'role_data_eng', resId })),
    // Finance Manager → financial
    ...['res_payments_db', 'res_billing_api', 'res_reporting'].map(resId => ({ roleId: 'role_finance_mgr', resId })),
    // Dev Lead → dev tools
    ...['res_staging_db', 'res_api_gateway', 'res_cicd', 'res_k8s', 'res_internal_api'].map(resId => ({ roleId: 'role_dev_lead', resId })),
    // Senior Dev → some infra
    ...['res_staging_db', 'res_api_gateway', 'res_logs_db', 'res_internal_api', 'res_lambda'].map(resId => ({ roleId: 'role_senior_dev', resId })),
    // Dev → limited
    ...['res_staging_db', 'res_api_gateway', 'res_internal_api', 'res_cache'].map(resId => ({ roleId: 'role_dev', resId })),
    // Intern → very limited
    ...['res_staging_db', 'res_internal_api'].map(resId => ({ roleId: 'role_intern', resId })),
    // Contractor → limited
    ...['res_staging_db', 'res_internal_api', 'res_vpn'].map(resId => ({ roleId: 'role_contractor', resId })),
    // Auditor → read-only
    ...['res_prod_db', 'res_analytics_db', 'res_logs_db', 'res_iam', 'res_firewall', 'res_reporting'].map(resId => ({ roleId: 'role_auditor', resId })),
    // QA → test
    ...['res_staging_db', 'res_api_gateway', 'res_internal_api'].map(resId => ({ roleId: 'role_qa', resId })),
    // HR Manager
    ...['res_hr_api', 'res_user_db'].map(resId => ({ roleId: 'role_hr_mgr', resId })),
    // Sales
    ...['res_crm_api', 'res_reporting'].map(resId => ({ roleId: 'role_sales', resId })),
    // Marketing
    ...['res_cdn', 'res_mail', 'res_reporting'].map(resId => ({ roleId: 'role_marketing', resId })),
    // Ops Manager
    ...['res_monitoring', 'res_logs_db', 'res_backup', 'res_queue'].map(resId => ({ roleId: 'role_ops', resId })),
    // Legal
    ...['res_logs_db', 'res_reporting'].map(resId => ({ roleId: 'role_legal', resId })),
    // Support
    ...['res_user_db', 'res_internal_api', 'res_crm_api'].map(resId => ({ roleId: 'role_support', resId })),
  ];

  await session.run(
    `UNWIND $batch AS pair
     MATCH (r:Role {id: pair.roleId}), (res:Resource {id: pair.resId})
     CREATE (r)-[:CAN_ACCESS]->(res)`,
    { batch: links },
  );
  console.log(`  Created ${links.length} role->resource relationships`);
}

async function createGroupRoleLinks(session: any) {
  console.log('Linking groups to roles...');

  const links: Array<{ groupId: string; roleId: string }> = [
    // Engineering hierarchy
    { groupId: 'grp_engineering', roleId: 'role_dev_lead' },
    { groupId: 'grp_engineering', roleId: 'role_senior_dev' },
    { groupId: 'grp_engineering', roleId: 'role_dev' },
    { groupId: 'grp_backend', roleId: 'role_senior_dev' },
    { groupId: 'grp_backend', roleId: 'role_dev' },
    { groupId: 'grp_backend', roleId: 'role_db_admin' },
    { groupId: 'grp_frontend', roleId: 'role_dev' },
    { groupId: 'grp_qa', roleId: 'role_qa' },
    { groupId: 'grp_intern', roleId: 'role_intern' },
    // DevOps
    { groupId: 'grp_devops', roleId: 'role_sre' },
    { groupId: 'grp_devops', roleId: 'role_ops' },
    { groupId: 'grp_platform', roleId: 'role_sre' },
    { groupId: 'grp_platform', roleId: 'role_admin' },
    { groupId: 'grp_sre', roleId: 'role_sre' },
    // Security
    { groupId: 'grp_security', roleId: 'role_security' },
    { groupId: 'grp_security', roleId: 'role_admin' },
    // Data
    { groupId: 'grp_data', roleId: 'role_data_eng' },
    { groupId: 'grp_data', roleId: 'role_db_admin' },
    // Other departments
    { groupId: 'grp_finance', roleId: 'role_finance_mgr' },
    { groupId: 'grp_hr', roleId: 'role_hr_mgr' },
    { groupId: 'grp_sales', roleId: 'role_sales' },
    { groupId: 'grp_marketing', roleId: 'role_marketing' },
    { groupId: 'grp_legal', roleId: 'role_legal' },
    { groupId: 'grp_operations', roleId: 'role_ops' },
    { groupId: 'grp_support', roleId: 'role_support' },
    { groupId: 'grp_contractors', roleId: 'role_contractor' },
    { groupId: 'grp_exec', roleId: 'role_exec' },
    { groupId: 'grp_audit', roleId: 'role_auditor' },
    // CYCLIC groups
    { groupId: 'grp_infra_a', roleId: 'role_db_admin' },
    { groupId: 'grp_infra_a', roleId: 'role_sre' },
    { groupId: 'grp_infra_b', roleId: 'role_sre' },
    { groupId: 'grp_infra_b', roleId: 'role_admin' },
    { groupId: 'grp_cloud', roleId: 'role_admin' },
    { groupId: 'grp_cloud', roleId: 'role_sre' },
  ];

  await session.run(
    `UNWIND $batch AS pair
     MATCH (g:Group {id: pair.groupId}), (r:Role {id: pair.roleId})
     CREATE (g)-[:HAS_ROLE]->(r)`,
    { batch: links },
  );
  console.log(`  Created ${links.length} group->role relationships`);
}

async function createGroupHierarchy(session: any) {
  console.log('Creating group hierarchy...');

  const hierarchy: Array<{ childId: string; parentId: string }> = [
    // Normal hierarchy
    { childId: 'grp_backend', parentId: 'grp_engineering' },
    { childId: 'grp_frontend', parentId: 'grp_engineering' },
    { childId: 'grp_qa', parentId: 'grp_engineering' },
    { childId: 'grp_intern', parentId: 'grp_engineering' },
    { childId: 'grp_platform', parentId: 'grp_devops' },
    { childId: 'grp_sre', parentId: 'grp_devops' },
    { childId: 'grp_data', parentId: 'grp_engineering' },

    // CYCLIC DEPENDENCY: Infra A → Infra B → Cloud → Infra A
    { childId: 'grp_infra_a', parentId: 'grp_infra_b' },
    { childId: 'grp_infra_b', parentId: 'grp_cloud' },
    { childId: 'grp_cloud', parentId: 'grp_infra_a' },
  ];

  await session.run(
    `UNWIND $batch AS pair
     MATCH (child:Group {id: pair.childId}), (parent:Group {id: pair.parentId})
     CREATE (child)-[:MEMBER_OF]->(parent)`,
    { batch: hierarchy },
  );
  console.log(`  Created ${hierarchy.length} hierarchy relationships (includes cyclic dependency)`);
}

async function linkUsersToGroups(session: any) {
  console.log('Linking users to groups...');

  const pairs: Array<{ userId: string; groupId: string }> = [];

  // Deterministic distribution: users 0-99 → engineering, 100-149 → devops, etc.
  const DEPT分配 = [
    { start: 0, end: 200, groupId: 'grp_engineering' },
    { start: 200, end: 300, groupId: 'grp_backend' },
    { start: 300, end: 380, groupId: 'grp_frontend' },
    { start: 380, end: 420, groupId: 'grp_devops' },
    { start: 420, end: 450, groupId: 'grp_platform' },
    { start: 450, end: 470, groupId: 'grp_sre' },
    { start: 470, end: 510, groupId: 'grp_security' },
    { start: 510, end: 570, groupId: 'grp_finance' },
    { start: 570, end: 620, groupId: 'grp_hr' },
    { start: 620, end: 700, groupId: 'grp_sales' },
    { start: 700, end: 750, groupId: 'grp_marketing' },
    { start: 750, end: 780, groupId: 'grp_legal' },
    { start: 780, end: 830, groupId: 'grp_operations' },
    { start: 830, end: 880, groupId: 'grp_support' },
    { start: 880, end: 900, groupId: 'grp_data' },
    { start: 900, end: 920, groupId: 'grp_qa' },
    { start: 920, end: 940, groupId: 'grp_intern' },
    { start: 940, end: 960, groupId: 'grp_contractors' },
    { start: 960, end: 980, groupId: 'grp_exec' },
    { start: 980, end: 1000, groupId: 'grp_audit' },
  ];

  for (const dept of DEPT分配) {
    for (let u = dept.start; u < dept.end; u++) {
      pairs.push({ userId: `user_${u}`, groupId: dept.groupId });
    }
  }

  // Some users also in cyclic groups (for interesting escalation paths)
  // Users 0-49 (engineering leads) are also in infra_a
  for (let u = 0; u < 50; u++) {
    pairs.push({ userId: `user_${u}`, groupId: 'grp_infra_a' });
  }
  // Users 200-249 (senior backend) are also in infra_b
  for (let u = 200; u < 250; u++) {
    pairs.push({ userId: `user_${u}`, groupId: 'grp_infra_b' });
  }
  // Users 420-449 (devops) are also in cloud
  for (let u = 420; u < 450; u++) {
    pairs.push({ userId: `user_${u}`, groupId: 'grp_cloud' });
  }
  // Some executives also in security (privilege escalation risk)
  for (let u = 960; u < 980; u++) {
    pairs.push({ userId: `user_${u}`, groupId: 'grp_security' });
  }

  // Batch
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
// Verify
// ============================================================
async function verify(session: any) {
  console.log('\nVerifying seed data...');
  const nodeCount = await session.run('MATCH (n) RETURN count(n) as count');
  const relCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
  const users = await session.run('MATCH (u:User) RETURN count(u) as count');
  const groups = await session.run('MATCH (g:Group) RETURN count(g) as count');
  const roles = await session.run('MATCH (r:Role) RETURN count(r) as count');
  const resources = await session.run('MATCH (res:Resource) RETURN count(res) as count');
  const cycles = await session.run(
    `MATCH path = (g:Group)-[:MEMBER_OF*2..6]->(g)
     RETURN length(path) as len, [n IN nodes(path) | n.name] as names
     LIMIT 5`
  );

  console.log(`  Nodes:        ${nodeCount.records[0].get('count').toNumber()}`);
  console.log(`  Relationships: ${relCount.records[0].get('count').toNumber()}`);
  console.log(`  Users:        ${users.records[0].get('count').toNumber()}`);
  console.log(`  Groups:       ${groups.records[0].get('count').toNumber()}`);
  console.log(`  Roles:        ${roles.records[0].get('count').toNumber()}`);
  console.log(`  Resources:    ${resources.records[0].get('count').toNumber()}`);
  console.log(`  Cycles found: ${cycles.records.length}`);
  for (const rec of cycles.records) {
    console.log(`    → ${rec.get('names').join(' → ')} (${rec.get('len')} edges)`);
  }
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

    await createResources(session);
    await createRoles(session);
    await createGroups(session);
    await createUsers(session);

    await createRoleResourceLinks(session);
    await createGroupRoleLinks(session);
    await createGroupHierarchy(session);
    await linkUsersToGroups(session);

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
