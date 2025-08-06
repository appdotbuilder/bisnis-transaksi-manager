
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';

export async function exportProductsCsv(): Promise<string> {
  try {
    // Fetch all products from database
    const products = await db.select()
      .from(productsTable)
      .execute();

    // Convert numeric price fields back to numbers
    const convertedProducts: Product[] = products.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));

    // Create CSV header
    const header = 'product_code,product_name,product_type,price';
    
    // Convert products to CSV rows
    const rows = convertedProducts.map(product => {
      // Escape fields that might contain commas or quotes
      const escapeCsvField = (field: string | number): string => {
        const str = String(field);
        // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        escapeCsvField(product.product_code),
        escapeCsvField(product.product_name),
        escapeCsvField(product.product_type),
        escapeCsvField(product.price)
      ].join(',');
    });

    // Combine header and rows
    return [header, ...rows].join('\n');
  } catch (error) {
    console.error('Product CSV export failed:', error);
    throw error;
  }
}
