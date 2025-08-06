
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { getStoreProfile } from '../handlers/get_store_profile';

describe('getStoreProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no store profile exists', async () => {
    const result = await getStoreProfile();
    expect(result).toBeNull();
  });

  it('should return store profile when one exists', async () => {
    // Create test store profile
    const testProfile = {
      store_name: 'Test Store',
      address: '123 Test Street',
      phone: '+62-123-456-7890',
      email: 'test@store.com',
      npwp: '01.234.567.8-901.000',
      logo_url: 'https://example.com/logo.png'
    };

    await db.insert(storeProfilesTable)
      .values(testProfile)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result?.store_name).toEqual('Test Store');
    expect(result?.address).toEqual('123 Test Street');
    expect(result?.phone).toEqual('+62-123-456-7890');
    expect(result?.email).toEqual('test@store.com');
    expect(result?.npwp).toEqual('01.234.567.8-901.000');
    expect(result?.logo_url).toEqual('https://example.com/logo.png');
    expect(result?.id).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return only the first profile when multiple exist', async () => {
    // Create multiple test profiles
    const profiles = [
      {
        store_name: 'First Store',
        address: '123 First Street',
        phone: '+62-111-111-1111',
        email: 'first@store.com',
        npwp: '11.111.111.1-111.000',
        logo_url: null
      },
      {
        store_name: 'Second Store',
        address: '456 Second Street',
        phone: '+62-222-222-2222',
        email: 'second@store.com',
        npwp: '22.222.222.2-222.000',
        logo_url: 'https://example.com/logo2.png'
      }
    ];

    await db.insert(storeProfilesTable)
      .values(profiles)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result?.store_name).toEqual('First Store');
    expect(result?.email).toEqual('first@store.com');
    expect(result?.logo_url).toBeNull();
  });

  it('should handle profile with null logo_url', async () => {
    const testProfile = {
      store_name: 'Test Store No Logo',
      address: '789 Test Avenue',
      phone: '+62-987-654-3210',
      email: 'nologo@store.com',
      npwp: '98.765.432.1-098.000',
      logo_url: null
    };

    await db.insert(storeProfilesTable)
      .values(testProfile)
      .execute();

    const result = await getStoreProfile();

    expect(result).not.toBeNull();
    expect(result?.store_name).toEqual('Test Store No Logo');
    expect(result?.logo_url).toBeNull();
  });
});
