import neo4j, { Driver, Session } from 'neo4j-driver';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from the monorepo root (one level up from backend/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

let dbDriver: Driver | null = null;

export const initializeDriver = (): Driver => {
  const uri = process.env.COGNODB_URI;
  const username = process.env.COGNODB_USERNAME;
  const password = process.env.COGNODB_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error('Missing COGNODB_URI, COGNODB_USERNAME, or COGNODB_PASSWORD in .env');
  }

  dbDriver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    connectionTimeout: 10000,
    maxConnectionPoolSize: 50,
    maxConnectionLifetime: 60 * 60 * 1000,
  });

  return dbDriver;
};

export const getDriver = (): Driver => {
  if (!dbDriver) {
    throw new Error('Database driver not initialized');
  }
  return dbDriver;
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const driver = getDriver();
    const session: Session = driver.session();
    await session.run('RETURN 1 as n');
    await session.close();
    console.log('  Connected to CognoDB');
    return true;
  } catch (error) {
    console.error('  Failed to connect to CognoDB:', error);
    return false;
  }
};

export const closeDriver = async (): Promise<void> => {
  if (dbDriver) {
    await dbDriver.close();
    dbDriver = null;
  }
};
