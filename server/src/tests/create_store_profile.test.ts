
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput } from '../schema';
import { createStoreProfile } from '../handlers/create_store_profile';
import { eq } from 'drizzle-orm';

// Complete test input with all required fields
const testInput: CreateStoreProfileInput = {
  store_name: 'Test Store',
  address: '123 Test Street, Test City',
  phone: '+62123456789',
  email: 'test@store.com',
  npwp: '12.345.678.9-012.345',
  logo_url: 'https://example.com/logo.png'
};

describe('createStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a store profile', async () => {
    const result = await createStoreProfile(testInput);

    // Basic field validation
    expect(result.store_name).toEqual('Test Store');
    expect(result.address).toEqual(testInput.address);
    expect(result.phone).toEqual(testInput.phone);
    expect(result.email).toEqual(testInput.email);
    expect(result.npwp).toEqual(testInput.npwp);
    expect(result.logo_url).toEqual('https://example.com/logo.png');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save store profile to database', async () => {
    const result = await createStoreProfile(testInput);

    // Query using proper drizzle syntax
    const profiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].store_name).toEqual('Test Store');
    expect(profiles[0].address).toEqual(testInput.address);
    expect(profiles[0].phone).toEqual(testInput.phone);
    expect(profiles[0].email).toEqual(testInput.email);
    expect(profiles[0].npwp).toEqual(testInput.npwp);
    expect(profiles[0].logo_url).toEqual('https://example.com/logo.png');
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null logo_url', async () => {
    const inputWithoutLogo: CreateStoreProfileInput = {
      ...testInput,
      logo_url: undefined
    };

    const result = await createStoreProfile(inputWithoutLogo);

    expect(result.logo_url).toBeNull();

    // Verify in database
    const profiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, result.id))
      .execute();

    expect(profiles[0].logo_url).toBeNull();
  });

  it('should replace existing store profile', async () => {
    // Create first profile
    const firstResult = await createStoreProfile(testInput);
    expect(firstResult.store_name).toEqual('Test Store');

    // Create second profile
    const secondInput: CreateStoreProfileInput = {
      store_name: 'Updated Store',
      address: '456 New Street, New City',
      phone: '+62987654321',
      email: 'updated@store.com',
      npwp: '98.765.432.1-098.765',
      logo_url: 'https://example.com/new-logo.png'
    };

    const secondResult = await createStoreProfile(secondInput);

    // Verify only one profile exists
    const allProfiles = await db.select()
      .from(storeProfilesTable)
      .execute();

    expect(allProfiles).toHaveLength(1);
    expect(allProfiles[0].id).toEqual(secondResult.id);
    expect(allProfiles[0].store_name).toEqual('Updated Store');
    expect(allProfiles[0].address).toEqual(secondInput.address);
    expect(allProfiles[0].phone).toEqual(secondInput.phone);
    expect(allProfiles[0].email).toEqual(secondInput.email);
    expect(allProfiles[0].npwp).toEqual(secondInput.npwp);
  });

  it('should work when no existing profile exists', async () => {
    // Verify no profiles exist initially
    const initialProfiles = await db.select()
      .from(storeProfilesTable)
      .execute();

    expect(initialProfiles).toHaveLength(0);

    // Create profile
    const result = await createStoreProfile(testInput);

    expect(result.store_name).toEqual('Test Store');
    expect(result.id).toBeDefined();

    // Verify one profile exists
    const finalProfiles = await db.select()
      .from(storeProfilesTable)
      .execute();

    expect(finalProfiles).toHaveLength(1);
  });
});
