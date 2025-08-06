
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateProductInput = {
  product_code: 'PROD001',
  product_name: 'Test Product',
  product_type: 'BARANG',
  price: 19.99
};

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.product_code).toEqual('PROD001');
    expect(result.product_name).toEqual('Test Product');
    expect(result.product_type).toEqual('BARANG');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].product_code).toEqual('PROD001');
    expect(products[0].product_name).toEqual('Test Product');
    expect(products[0].product_type).toEqual('BARANG');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create product with JASA type', async () => {
    const serviceInput: CreateProductInput = {
      product_code: 'SERV001',
      product_name: 'Consultation Service',
      product_type: 'JASA',
      price: 150.00
    };

    const result = await createProduct(serviceInput);

    expect(result.product_type).toEqual('JASA');
    expect(result.product_name).toEqual('Consultation Service');
    expect(result.price).toEqual(150.00);
  });

  it('should enforce unique product_code constraint', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create another product with same product_code
    const duplicateInput: CreateProductInput = {
      product_code: 'PROD001', // Same code
      product_name: 'Different Product',
      product_type: 'JASA',
      price: 50.00
    };

    await expect(createProduct(duplicateInput)).rejects.toThrow();
  });
});
