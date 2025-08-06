
import { db } from '../db';
import { storeProfilesTable } from '../db/schema';
import { type StoreProfile } from '../schema';

export const getStoreProfile = async (): Promise<StoreProfile | null> => {
  try {
    const results = await db.select()
      .from(storeProfilesTable)
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const profile = results[0];
    return {
      ...profile,
      // No numeric conversions needed - all fields are text, serial, or timestamp
    };
  } catch (error) {
    console.error('Get store profile failed:', error);
    throw error;
  }
};
