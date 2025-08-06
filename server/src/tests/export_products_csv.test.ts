
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { exportProductsCsv } from '../handlers/export_products_csv';

describe('exportProductsCsv', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return CSV header when no products exist', async () => {
    const csvResult = await exportProductsCsv();

    expect(csvResult).toEqual('product_code,product_name,product_type,price');
  });

  it('should export single product to CSV', async () => {
    // Create test product
    await db.insert(productsTable)
      .values({
        product_code: 'PRD001',
        product_name: 'Test Product',
        product_type: 'BARANG',
        price: '19.99'
      })
      .execute();

    const csvResult = await exportProductsCsv();

    const expectedCsv = [
      'product_code,product_name,product_type,price',
      'PRD001,Test Product,BARANG,19.99'
    ].join('\n');

    expect(csvResult).toEqual(expectedCsv);
  });

  it('should export multiple products to CSV', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          product_code: 'PRD001',
          product_name: 'Product One',
          product_type: 'BARANG',
          price: '19.99'
        },
        {
          product_code: 'PRD002',
          product_name: 'Service Two',
          product_type: 'JASA',
          price: '150.00'
        }
      ])
      .execute();

    const csvResult = await exportProductsCsv();

    const lines = csvResult.split('\n');
    expect(lines).toHaveLength(3); // Header + 2 products
    expect(lines[0]).toEqual('product_code,product_name,product_type,price');
    
    // Check that both products are included (order might vary)
    const productLines = lines.slice(1).sort();
    expect(productLines).toEqual([
      'PRD001,Product One,BARANG,19.99',
      'PRD002,Service Two,JASA,150'
    ]);
  });

  it('should properly escape CSV fields with commas and quotes', async () => {
    // Create product with special characters in name
    await db.insert(productsTable)
      .values({
        product_code: 'PRD003',
        product_name: 'Product with, comma and "quotes"',
        product_type: 'BARANG',
        price: '25.50'
      })
      .execute();

    const csvResult = await exportProductsCsv();

    const expectedCsv = [
      'product_code,product_name,product_type,price',
      'PRD003,"Product with, comma and ""quotes""",BARANG,25.5'
    ].join('\n');

    expect(csvResult).toEqual(expectedCsv);
  });

  it('should handle decimal prices correctly', async () => {
    // Create products with various price formats
    await db.insert(productsTable)
      .values([
        {
          product_code: 'PRD004',
          product_name: 'Whole Number Price',
          product_type: 'BARANG',
          price: '100.00'
        },
        {
          product_code: 'PRD005',
          product_name: 'Decimal Price',
          product_type: 'JASA',
          price: '99.95'
        }
      ])
      .execute();

    const csvResult = await exportProductsCsv();

    const lines = csvResult.split('\n');
    expect(lines).toHaveLength(3); // Header + 2 products
    
    // Verify prices are properly formatted
    const productLines = lines.slice(1).sort();
    expect(productLines).toEqual([
      'PRD004,Whole Number Price,BARANG,100',
      'PRD005,Decimal Price,JASA,99.95'
    ]);
  });
});
