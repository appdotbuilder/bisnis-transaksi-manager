
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { asc } from 'drizzle-orm';

export async function getCustomers(): Promise<Customer[]> {
  try {
    const results = await db.select()
      .from(customersTable)
      .orderBy(asc(customersTable.institution_name))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}
