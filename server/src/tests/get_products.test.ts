
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all products', async () => {
    // Create test products
    await db.insert(productsTable)
      .values([
        {
          product_code: 'PROD001',
          product_name: 'Test Product 1',
          product_type: 'BARANG',
          price: '19.99'
        },
        {
          product_code: 'PROD002',
          product_name: 'Test Product 2',
          product_type: 'JASA',
          price: '25.50'
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].product_code).toBe('PROD001');
    expect(result[0].product_name).toBe('Test Product 1');
    expect(result[0].product_type).toBe('BARANG');
    expect(result[0].price).toBe(19.99);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].product_code).toBe('PROD002');
    expect(result[1].product_name).toBe('Test Product 2');
    expect(result[1].product_type).toBe('JASA');
    expect(result[1].price).toBe(25.50);
    expect(typeof result[1].price).toBe('number');
  });

  it('should return products ordered by product_code', async () => {
    // Create test products in non-alphabetical order
    await db.insert(productsTable)
      .values([
        {
          product_code: 'PROD003',
          product_name: 'Test Product 3',
          product_type: 'BARANG',
          price: '30.00'
        },
        {
          product_code: 'PROD001',
          product_name: 'Test Product 1',
          product_type: 'JASA',
          price: '10.00'
        },
        {
          product_code: 'PROD002',
          product_name: 'Test Product 2',
          product_type: 'BARANG',
          price: '20.00'
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    expect(result[0].product_code).toBe('PROD001');
    expect(result[1].product_code).toBe('PROD002');
    expect(result[2].product_code).toBe('PROD003');
  });

  it('should handle different product types correctly', async () => {
    await db.insert(productsTable)
      .values([
        {
          product_code: 'BARANG001',
          product_name: 'Physical Product',
          product_type: 'BARANG',
          price: '100.00'
        },
        {
          product_code: 'JASA001',
          product_name: 'Service Product',
          product_type: 'JASA',
          price: '200.00'
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result[0].product_type).toBe('BARANG');
    expect(result[1].product_type).toBe('JASA');
  });
});
