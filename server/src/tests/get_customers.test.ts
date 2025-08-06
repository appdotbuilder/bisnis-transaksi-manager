
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';

const testCustomer1: CreateCustomerInput = {
  institution_name: 'ABC Corp',
  address: '123 Main St, City A',
  contact_person: 'John Doe',
  phone: '081234567890',
  npwp: '12.345.678.9-012.000'
};

const testCustomer2: CreateCustomerInput = {
  institution_name: 'XYZ Industries',
  address: '456 Oak Ave, City B',
  contact_person: 'Jane Smith',
  phone: '087654321098',
  npwp: null
};

const testCustomer3: CreateCustomerInput = {
  institution_name: 'Beta Solutions',
  address: '789 Pine Rd, City C',
  contact_person: 'Bob Johnson',
  phone: '085555555555'
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no customers exist', async () => {
    const result = await getCustomers();
    
    expect(result).toEqual([]);
  });

  it('should fetch all customers', async () => {
    // Insert test customers
    await db.insert(customersTable)
      .values([
        testCustomer1,
        testCustomer2,
        testCustomer3
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Verify all customers are returned
    const institutionNames = result.map(c => c.institution_name);
    expect(institutionNames).toContain('ABC Corp');
    expect(institutionNames).toContain('XYZ Industries');
    expect(institutionNames).toContain('Beta Solutions');
  });

  it('should return customers ordered by institution_name', async () => {
    // Insert customers in random order
    await db.insert(customersTable)
      .values([
        testCustomer2, // XYZ Industries
        testCustomer1, // ABC Corp
        testCustomer3  // Beta Solutions
      ])
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(3);
    
    // Verify alphabetical order by institution_name
    expect(result[0].institution_name).toEqual('ABC Corp');
    expect(result[1].institution_name).toEqual('Beta Solutions');
    expect(result[2].institution_name).toEqual('XYZ Industries');
  });

  it('should return complete customer data', async () => {
    await db.insert(customersTable)
      .values(testCustomer1)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];

    // Verify all fields are present
    expect(customer.id).toBeDefined();
    expect(customer.institution_name).toEqual('ABC Corp');
    expect(customer.address).toEqual('123 Main St, City A');
    expect(customer.contact_person).toEqual('John Doe');
    expect(customer.phone).toEqual('081234567890');
    expect(customer.npwp).toEqual('12.345.678.9-012.000');
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);
  });

  it('should handle customers with null npwp', async () => {
    await db.insert(customersTable)
      .values(testCustomer2)
      .execute();

    const result = await getCustomers();

    expect(result).toHaveLength(1);
    const customer = result[0];

    expect(customer.institution_name).toEqual('XYZ Industries');
    expect(customer.npwp).toBeNull();
  });
});
