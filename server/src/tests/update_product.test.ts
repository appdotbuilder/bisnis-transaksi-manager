
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput, type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a product directly in database
const createTestProduct = async (input: CreateProductInput) => {
  const result = await db.insert(productsTable)
    .values({
      product_code: input.product_code,
      product_name: input.product_name,
      product_type: input.product_type,
      price: input.price.toString() // Convert number to string for numeric column
    })
    .returning()
    .execute();

  const product = result[0];
  return {
    ...product,
    price: parseFloat(product.price) // Convert string back to number
  };
};

// Test data
const testProduct: CreateProductInput = {
  product_code: 'TEST001',
  product_name: 'Test Product',
  product_type: 'BARANG',
  price: 100.50
};

const anotherProduct: CreateProductInput = {
  product_code: 'TEST002',
  product_name: 'Another Product',
  product_type: 'JASA',
  price: 200.75
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a product with all fields', async () => {
    // Create test product
    const created = await createTestProduct(testProduct);

    const updateInput: UpdateProductInput = {
      id: created.id,
      product_code: 'UPDATED001',
      product_name: 'Updated Product',
      product_type: 'JASA',
      price: 150.75
    };

    const result = await updateProduct(updateInput);

    // Verify updated fields
    expect(result.id).toEqual(created.id);
    expect(result.product_code).toEqual('UPDATED001');
    expect(result.product_name).toEqual('Updated Product');
    expect(result.product_type).toEqual('JASA');
    expect(result.price).toEqual(150.75);
    expect(typeof result.price).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
  });

  it('should update only specified fields', async () => {
    // Create test product
    const created = await createTestProduct(testProduct);

    const updateInput: UpdateProductInput = {
      id: created.id,
      product_name: 'Only Name Updated',
      price: 99.99
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields are updated
    expect(result.id).toEqual(created.id);
    expect(result.product_code).toEqual(testProduct.product_code); // Unchanged
    expect(result.product_name).toEqual('Only Name Updated'); // Updated
    expect(result.product_type).toEqual(testProduct.product_type); // Unchanged
    expect(result.price).toEqual(99.99); // Updated
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated product to database', async () => {
    // Create test product
    const created = await createTestProduct(testProduct);

    const updateInput: UpdateProductInput = {
      id: created.id,
      product_name: 'Database Updated',
      price: 250.00
    };

    await updateProduct(updateInput);

    // Query database to verify changes
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, created.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].product_name).toEqual('Database Updated');
    expect(parseFloat(products[0].price)).toEqual(250.00);
  });

  it('should throw error when product does not exist', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      product_name: 'Non-existent Product'
    };

    expect(updateProduct(updateInput)).rejects.toThrow(/product not found/i);
  });

  it('should throw error when updating to duplicate product code', async () => {
    // Create two products
    const product1 = await createTestProduct(testProduct);
    const product2 = await createTestProduct(anotherProduct);

    const updateInput: UpdateProductInput = {
      id: product2.id,
      product_code: product1.product_code // Try to use existing code
    };

    expect(updateProduct(updateInput)).rejects.toThrow(/product code already exists/i);
  });

  it('should allow updating product code to same value', async () => {
    // Create test product
    const created = await createTestProduct(testProduct);

    const updateInput: UpdateProductInput = {
      id: created.id,
      product_code: testProduct.product_code, // Same code
      product_name: 'Updated Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.product_code).toEqual(testProduct.product_code);
    expect(result.product_name).toEqual('Updated Name');
  });
});
