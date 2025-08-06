
import { db } from '../db';
import { productsTable, transactionItemsTable } from '../db/schema';
import { eq, count } from 'drizzle-orm';

export const deleteProduct = async (id: number): Promise<boolean> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (existingProduct.length === 0) {
      return false; // Product doesn't exist
    }

    // Check if product is used in any transactions
    const transactionItemCount = await db.select({ count: count() })
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.product_id, id))
      .execute();

    if (transactionItemCount[0].count > 0) {
      // Product is referenced in transactions, cannot delete
      throw new Error('Cannot delete product that is referenced in transactions');
    }

    // Safe to delete - no foreign key references
    const result = await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return true;
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
};
