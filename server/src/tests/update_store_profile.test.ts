
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput, type UpdateStoreProfileInput } from '../schema';
import { updateStoreProfile } from '../handlers/update_store_profile';
import { eq } from 'drizzle-orm';

// Test data
const testCreateInput: CreateStoreProfileInput = {
  store_name: 'Original Store',
  address: 'Original Address',
  phone: '081234567890',
  email: 'original@example.com',
  npwp: '12.345.678.9-012.000',
  logo_url: 'https://example.com/logo.png'
};

describe('updateStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all fields of a store profile', async () => {
    // Create a store profile first
    const created = await db.insert(storeProfilesTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const updateInput: UpdateStoreProfileInput = {
      id: created[0].id,
      store_name: 'Updated Store Name',
      address: 'Updated Address',
      phone: '087654321098',
      email: 'updated@example.com',
      npwp: '98.765.432.1-098.000',
      logo_url: 'https://example.com/new-logo.png'
    };

    const result = await updateStoreProfile(updateInput);

    // Verify all fields were updated
    expect(result.id).toEqual(created[0].id);
    expect(result.store_name).toEqual('Updated Store Name');
    expect(result.address).toEqual('Updated Address');
    expect(result.phone).toEqual('087654321098');
    expect(result.email).toEqual('updated@example.com');
    expect(result.npwp).toEqual('98.765.432.1-098.000');
    expect(result.logo_url).toEqual('https://example.com/new-logo.png');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > created[0].updated_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    // Create a store profile first
    const created = await db.insert(storeProfilesTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const partialUpdateInput: UpdateStoreProfileInput = {
      id: created[0].id,
      store_name: 'Partially Updated Store',
      email: 'partial@example.com'
    };

    const result = await updateStoreProfile(partialUpdateInput);

    // Verify only specified fields were updated
    expect(result.store_name).toEqual('Partially Updated Store');
    expect(result.email).toEqual('partial@example.com');
    // Verify other fields remained unchanged
    expect(result.address).toEqual(testCreateInput.address);
    expect(result.phone).toEqual(testCreateInput.phone);
    expect(result.npwp).toEqual(testCreateInput.npwp);
    expect(result.logo_url).toEqual('https://example.com/logo.png');
    expect(result.updated_at > created[0].updated_at).toBe(true);
  });

  it('should update logo_url to null', async () => {
    // Create a store profile first
    const created = await db.insert(storeProfilesTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const updateInput: UpdateStoreProfileInput = {
      id: created[0].id,
      logo_url: null
    };

    const result = await updateStoreProfile(updateInput);

    expect(result.logo_url).toBeNull();
    expect(result.updated_at > created[0].updated_at).toBe(true);
  });

  it('should save updated profile to database', async () => {
    // Create a store profile first
    const created = await db.insert(storeProfilesTable)
      .values(testCreateInput)
      .returning()
      .execute();

    const updateInput: UpdateStoreProfileInput = {
      id: created[0].id,
      store_name: 'Database Updated Store',
      email: 'database@example.com'
    };

    await updateStoreProfile(updateInput);

    // Verify changes were persisted
    const profiles = await db.select()
      .from(storeProfilesTable)
      .where(eq(storeProfilesTable.id, created[0].id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].store_name).toEqual('Database Updated Store');
    expect(profiles[0].email).toEqual('database@example.com');
    expect(profiles[0].address).toEqual(testCreateInput.address);
  });

  it('should throw error when store profile not found', async () => {
    const updateInput: UpdateStoreProfileInput = {
      id: 999,
      store_name: 'Non-existent Store'
    };

    await expect(updateStoreProfile(updateInput)).rejects.toThrow(/store profile with id 999 not found/i);
  });

  it('should handle logo_url field correctly', async () => {
    // Create a store profile first with logo_url
    const createInputWithLogo: CreateStoreProfileInput = {
      store_name: 'Original Store',
      address: 'Original Address', 
      phone: '081234567890',
      email: 'original@example.com',
      npwp: '12.345.678.9-012.000',
      logo_url: 'https://example.com/original-logo.png'
    };
    
    const created = await db.insert(storeProfilesTable)
      .values(createInputWithLogo)
      .returning()
      .execute();

    // Test updating with explicit null
    const updateInput: UpdateStoreProfileInput = {
      id: created[0].id,
      logo_url: null
    };

    const result = await updateStoreProfile(updateInput);

    expect(result.logo_url).toBeNull();
    expect(result.updated_at > created[0].updated_at).toBe(true);
  });
});
