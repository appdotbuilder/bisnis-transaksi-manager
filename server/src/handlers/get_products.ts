
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { asc } from 'drizzle-orm';

export async function getProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .orderBy(asc(productsTable.product_code))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}
