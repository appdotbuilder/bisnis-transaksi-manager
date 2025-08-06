
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type CreateStoreProfileInput, type StoreProfile } from '../schema';

export const createStoreProfile = async (input: CreateStoreProfileInput): Promise<StoreProfile> => {
  try {
    // Delete existing store profile (only one should exist)
    await db.delete(storeProfilesTable).execute();

    // Insert new store profile record
    const result = await db.insert(storeProfilesTable)
      .values({
        store_name: input.store_name,
        address: input.address,
        phone: input.phone,
        email: input.email,
        npwp: input.npwp,
        logo_url: input.logo_url || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Store profile creation failed:', error);
    throw error;
  }
};
