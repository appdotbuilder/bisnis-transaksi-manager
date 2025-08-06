
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProductByCode } from '../handlers/get_product_by_code';

const testProduct: CreateProductInput = {
  product_code: 'TEST001',
  product_name: 'Test Product',
  product_type: 'BARANG',
  price: 25000.50
};

const anotherProduct: CreateProductInput = {
  product_code: 'TEST002',
  product_name: 'Another Test Product',
  product_type: 'JASA',
  price: 150000
};

describe('getProductByCode', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return product when found', async () => {
    // Create test product
    await db.insert(productsTable)
      .values({
        product_code: testProduct.product_code,
        product_name: testProduct.product_name,
        product_type: testProduct.product_type,
        price: testProduct.price.toString()
      })
      .execute();

    const result = await getProductByCode('TEST001');

    expect(result).not.toBeNull();
    expect(result!.product_code).toEqual('TEST001');
    expect(result!.product_name).toEqual('Test Product');
    expect(result!.product_type).toEqual('BARANG');
    expect(result!.price).toEqual(25000.50);
    expect(typeof result!.price).toBe('number');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when product not found', async () => {
    const result = await getProductByCode('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('should handle case sensitivity correctly', async () => {
    // Create test product with uppercase code
    await db.insert(productsTable)
      .values({
        product_code: 'UPPER123',
        product_name: 'Upper Case Product',
        product_type: 'BARANG',
        price: '100000'
      })
      .execute();

    // Search with exact case should find it
    const exactResult = await getProductByCode('UPPER123');
    expect(exactResult).not.toBeNull();
    expect(exactResult!.product_code).toEqual('UPPER123');

    // Search with different case should not find it (case sensitive)
    const lowerResult = await getProductByCode('upper123');
    expect(lowerResult).toBeNull();
  });

  it('should find correct product when multiple products exist', async () => {
    // Create multiple test products
    await db.insert(productsTable)
      .values([
        {
          product_code: testProduct.product_code,
          product_name: testProduct.product_name,
          product_type: testProduct.product_type,
          price: testProduct.price.toString()
        },
        {
          product_code: anotherProduct.product_code,
          product_name: anotherProduct.product_name,
          product_type: anotherProduct.product_type,
          price: anotherProduct.price.toString()
        }
      ])
      .execute();

    // Should find the first product
    const result1 = await getProductByCode('TEST001');
    expect(result1).not.toBeNull();
    expect(result1!.product_code).toEqual('TEST001');
    expect(result1!.product_name).toEqual('Test Product');
    expect(result1!.price).toEqual(25000.50);

    // Should find the second product
    const result2 = await getProductByCode('TEST002');
    expect(result2).not.toBeNull();
    expect(result2!.product_code).toEqual('TEST002');
    expect(result2!.product_name).toEqual('Another Test Product');
    expect(result2!.price).toEqual(150000);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create product with decimal price
    await db.insert(productsTable)
      .values({
        product_code: 'DECIMAL001',
        product_name: 'Decimal Price Product',
        product_type: 'BARANG',
        price: '999.99'
      })
      .execute();

    const result = await getProductByCode('DECIMAL001');
    
    expect(result).not.toBeNull();
    expect(result!.price).toEqual(999.99);
    expect(typeof result!.price).toBe('number');
  });
});
