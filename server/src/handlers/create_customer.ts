
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';

export const createCustomer = async (input: CreateCustomerInput): Promise<Customer> => {
  try {
    // Insert customer record
    const result = await db.insert(customersTable)
      .values({
        institution_name: input.institution_name,
        address: input.address,
        contact_person: input.contact_person,
        phone: input.phone,
        npwp: input.npwp || null
      })
      .returning()
      .execute();

    const customer = result[0];
    return customer;
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
};
