
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCustomerInput = {
  institution_name: 'Test Company Ltd',
  address: '123 Test Street, Test City',
  contact_person: 'John Doe',
  phone: '+1234567890',
  npwp: '12.345.678.9-012.000'
};

// Test input without optional npwp field
const testInputWithoutNpwp: CreateCustomerInput = {
  institution_name: 'Another Company',
  address: '456 Another Street, Another City',
  contact_person: 'Jane Smith',
  phone: '+0987654321'
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer with all fields', async () => {
    const result = await createCustomer(testInput);

    // Basic field validation
    expect(result.institution_name).toEqual('Test Company Ltd');
    expect(result.address).toEqual(testInput.address);
    expect(result.contact_person).toEqual('John Doe');
    expect(result.phone).toEqual('+1234567890');
    expect(result.npwp).toEqual('12.345.678.9-012.000');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a customer without npwp', async () => {
    const result = await createCustomer(testInputWithoutNpwp);

    expect(result.institution_name).toEqual('Another Company');
    expect(result.address).toEqual(testInputWithoutNpwp.address);
    expect(result.contact_person).toEqual('Jane Smith');
    expect(result.phone).toEqual('+0987654321');
    expect(result.npwp).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    const result = await createCustomer(testInput);

    // Query using proper drizzle syntax
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].institution_name).toEqual('Test Company Ltd');
    expect(customers[0].address).toEqual(testInput.address);
    expect(customers[0].contact_person).toEqual('John Doe');
    expect(customers[0].phone).toEqual('+1234567890');
    expect(customers[0].npwp).toEqual('12.345.678.9-012.000');
    expect(customers[0].created_at).toBeInstanceOf(Date);
    expect(customers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should save customer without npwp to database', async () => {
    const result = await createCustomer(testInputWithoutNpwp);

    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].institution_name).toEqual('Another Company');
    expect(customers[0].npwp).toBeNull();
  });
});
