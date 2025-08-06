
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // If product_code is being updated, check for uniqueness
    if (input.product_code) {
      const duplicateProduct = await db.select()
        .from(productsTable)
        .where(and(
          eq(productsTable.product_code, input.product_code),
          ne(productsTable.id, input.id)
        ))
        .execute();

      if (duplicateProduct.length > 0) {
        throw new Error('Product code already exists');
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.product_code !== undefined) {
      updateData.product_code = input.product_code;
    }
    if (input.product_name !== undefined) {
      updateData.product_name = input.product_name;
    }
    if (input.product_type !== undefined) {
      updateData.product_type = input.product_type;
    }
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }

    // Update product record
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};
