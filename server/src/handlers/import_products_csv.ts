
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductCsvRow, type Product } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function importProductsCsv(csvData: ProductCsvRow[]): Promise<Product[]> {
  if (csvData.length === 0) {
    return [];
  }

  try {
    const results: Product[] = [];

    // Process each row individually to handle duplicates gracefully
    for (const row of csvData) {
      try {
        // Check if product with this code already exists
        const existingProduct = await db.select()
          .from(productsTable)
          .where(eq(productsTable.product_code, row.product_code))
          .limit(1)
          .execute();

        if (existingProduct.length > 0) {
          // Update existing product
          const updated = await db.update(productsTable)
            .set({
              product_name: row.product_name,
              product_type: row.product_type,
              price: row.price.toString(),
              updated_at: sql`NOW()`
            })
            .where(eq(productsTable.product_code, row.product_code))
            .returning()
            .execute();

          if (updated.length > 0) {
            results.push({
              ...updated[0],
              price: parseFloat(updated[0].price)
            });
          }
        } else {
          // Insert new product
          const inserted = await db.insert(productsTable)
            .values({
              product_code: row.product_code,
              product_name: row.product_name,
              product_type: row.product_type,
              price: row.price.toString()
            })
            .returning()
            .execute();

          if (inserted.length > 0) {
            results.push({
              ...inserted[0],
              price: parseFloat(inserted[0].price)
            });
          }
        }
      } catch (rowError) {
        console.error(`Failed to process row with product_code: ${row.product_code}`, rowError);
        // Continue with other rows instead of failing the entire import
        continue;
      }
    }

    return results;
  } catch (error) {
    console.error('CSV import failed:', error);
    throw error;
  }
}
