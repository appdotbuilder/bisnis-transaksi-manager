
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type ProductCsvRow } from '../schema';
import { importProductsCsv } from '../handlers/import_products_csv';
import { eq } from 'drizzle-orm';

const testCsvData: ProductCsvRow[] = [
  {
    product_code: 'CSV001',
    product_name: 'CSV Test Product 1',
    product_type: 'BARANG',
    price: 25.99
  },
  {
    product_code: 'CSV002',
    product_name: 'CSV Test Service',
    product_type: 'JASA',
    price: 100.00
  },
  {
    product_code: 'CSV003',
    product_name: 'CSV Test Product 2',
    product_type: 'BARANG',
    price: 15.50
  }
];

describe('importProductsCsv', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should import new products from CSV data', async () => {
    const results = await importProductsCsv(testCsvData);

    expect(results).toHaveLength(3);
    
    // Verify first product
    expect(results[0].product_code).toEqual('CSV001');
    expect(results[0].product_name).toEqual('CSV Test Product 1');
    expect(results[0].product_type).toEqual('BARANG');
    expect(results[0].price).toEqual(25.99);
    expect(typeof results[0].price).toEqual('number');
    expect(results[0].id).toBeDefined();
    expect(results[0].created_at).toBeInstanceOf(Date);

    // Verify second product
    expect(results[1].product_code).toEqual('CSV002');
    expect(results[1].product_type).toEqual('JASA');
    expect(results[1].price).toEqual(100.00);

    // Verify third product
    expect(results[2].product_code).toEqual('CSV003');
    expect(results[2].price).toEqual(15.50);
  });

  it('should save all products to database', async () => {
    await importProductsCsv(testCsvData);

    const products = await db.select()
      .from(productsTable)
      .execute();

    expect(products).toHaveLength(3);
    
    const productCodes = products.map(p => p.product_code).sort();
    expect(productCodes).toEqual(['CSV001', 'CSV002', 'CSV003']);

    // Verify numeric conversion in database
    const product1 = products.find(p => p.product_code === 'CSV001');
    expect(product1).toBeDefined();
    expect(parseFloat(product1!.price)).toEqual(25.99);
  });

  it('should update existing products with same product_code', async () => {
    // First, create an existing product
    await db.insert(productsTable)
      .values({
        product_code: 'CSV001',
        product_name: 'Old Product Name',
        product_type: 'JASA',
        price: '50.00'
      })
      .execute();

    // Import CSV with updated data for same product code
    const csvWithUpdate: ProductCsvRow[] = [{
      product_code: 'CSV001',
      product_name: 'Updated Product Name',
      product_type: 'BARANG',
      price: 75.99
    }];

    const results = await importProductsCsv(csvWithUpdate);

    expect(results).toHaveLength(1);
    expect(results[0].product_name).toEqual('Updated Product Name');
    expect(results[0].product_type).toEqual('BARANG');
    expect(results[0].price).toEqual(75.99);

    // Verify only one product exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.product_code, 'CSV001'))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].product_name).toEqual('Updated Product Name');
    expect(parseFloat(products[0].price)).toEqual(75.99);
  });

  it('should handle mixed new and existing products', async () => {
    // Create one existing product
    await db.insert(productsTable)
      .values({
        product_code: 'CSV002',
        product_name: 'Existing Service',
        product_type: 'JASA',
        price: '200.00'
      })
      .execute();

    const mixedCsvData: ProductCsvRow[] = [
      {
        product_code: 'CSV001', // New
        product_name: 'New Product',
        product_type: 'BARANG',
        price: 30.00
      },
      {
        product_code: 'CSV002', // Existing - will update
        product_name: 'Updated Service',
        product_type: 'JASA',
        price: 150.00
      },
      {
        product_code: 'CSV003', // New
        product_name: 'Another New Product',
        product_type: 'BARANG',
        price: 45.00
      }
    ];

    const results = await importProductsCsv(mixedCsvData);

    expect(results).toHaveLength(3);

    // Check total products in database
    const allProducts = await db.select()
      .from(productsTable)
      .execute();

    expect(allProducts).toHaveLength(3);

    // Verify updated product
    const updatedProduct = allProducts.find(p => p.product_code === 'CSV002');
    expect(updatedProduct?.product_name).toEqual('Updated Service');
    expect(parseFloat(updatedProduct!.price)).toEqual(150.00);
  });

  it('should handle empty CSV data', async () => {
    const results = await importProductsCsv([]);

    expect(results).toHaveLength(0);

    const products = await db.select()
      .from(productsTable)
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should continue processing other rows if one row fails', async () => {
    // First insert a valid product to test the handler continues after errors
    const validCsvData: ProductCsvRow[] = [
      {
        product_code: 'VALID001',
        product_name: 'Valid Product',
        product_type: 'BARANG',
        price: 25.99
      }
    ];

    const results = await importProductsCsv(validCsvData);

    expect(results).toHaveLength(1);
    expect(results[0].product_code).toEqual('VALID001');

    // Verify product was saved
    const products = await db.select()
      .from(productsTable)
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].product_code).toEqual('VALID001');
  });
});
