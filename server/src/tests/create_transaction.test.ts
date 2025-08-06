
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, productsTable, transactionsTable, transactionItemsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCustomer: any;
  let testProduct1: any;
  let testProduct2: any;

  beforeEach(async () => {
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        institution_name: 'Test Company',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789',
        npwp: '123456789012345'
      })
      .returning()
      .execute();
    testCustomer = customerResult[0];

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        product_code: 'PRD-001',
        product_name: 'Test Product 1',
        product_type: 'BARANG',
        price: '100.00'
      })
      .returning()
      .execute();
    testProduct1 = product1Result[0];

    const product2Result = await db.insert(productsTable)
      .values({
        product_code: 'PRD-002',
        product_name: 'Test Service',
        product_type: 'JASA',
        price: '500.00'
      })
      .returning()
      .execute();
    testProduct2 = product2Result[0];
  });

  const baseTransactionInput: CreateTransactionInput = {
    customer_id: 0, // Will be set in tests
    transaction_date: new Date('2024-01-15'),
    total_discount: 0,
    ppn_enabled: false,
    pph22_enabled: false,
    pph23_enabled: false,
    service_value: null,
    service_type: null,
    regional_tax_enabled: false,
    payment_method: 'TUNAI',
    items: []
  };

  it('should create a basic transaction with one item', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      items: [{
        product_id: testProduct1.id,
        quantity: 2,
        unit_price: 100,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    // Verify transaction fields
    expect(result.customer_id).toEqual(testCustomer.id);
    expect(result.transaction_date).toEqual(input.transaction_date);
    expect(result.subtotal).toEqual(200); // 2 * 100
    expect(result.total_discount).toEqual(0);
    expect(result.ppn_enabled).toEqual(false);
    expect(result.ppn_amount).toEqual(0);
    expect(result.stamp_required).toEqual(false);
    expect(result.stamp_amount).toEqual(0);
    expect(result.total_amount).toEqual(200);
    expect(result.payment_method).toEqual('TUNAI');
    expect(result.transaction_id).toMatch(/^TRX-/);
    expect(result.id).toBeDefined();

    // Verify customer relation
    expect(result.customer).toBeDefined();
    expect(result.customer.institution_name).toEqual('Test Company');

    // Verify items
    expect(result.items).toHaveLength(1);
    expect(result.items[0].product_id).toEqual(testProduct1.id);
    expect(result.items[0].quantity).toEqual(2);
    expect(result.items[0].unit_price).toEqual(100);
    expect(result.items[0].discount).toEqual(0);
    expect(result.items[0].subtotal).toEqual(200);
    expect(result.items[0].product.product_name).toEqual('Test Product 1');
  });

  it('should calculate PPN correctly when enabled', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      ppn_enabled: true,
      items: [{
        product_id: testProduct1.id,
        quantity: 1,
        unit_price: 1000,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(1000);
    expect(result.ppn_enabled).toEqual(true);
    expect(result.ppn_amount).toEqual(110); // 11% of 1000
    expect(result.total_amount).toEqual(1110); // 1000 + 110
  });

  it('should calculate PPh22 correctly when enabled', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      pph22_enabled: true,
      items: [{
        product_id: testProduct1.id,
        quantity: 1,
        unit_price: 1000,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(1000);
    expect(result.pph22_enabled).toEqual(true);
    expect(result.pph22_amount).toEqual(15); // 1.5% of 1000
    expect(result.total_amount).toEqual(985); // 1000 - 15
  });

  it('should calculate PPh23 correctly when enabled with service value', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      pph23_enabled: true,
      service_value: 500,
      service_type: 'Consulting',
      items: [{
        product_id: testProduct2.id,
        quantity: 1,
        unit_price: 1000,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(1000);
    expect(result.pph23_enabled).toEqual(true);
    expect(result.pph23_amount).toEqual(10); // 2% of service_value (500)
    expect(result.service_value).toEqual(500);
    expect(result.service_type).toEqual('Consulting');
    expect(result.total_amount).toEqual(990); // 1000 - 10
  });

  it('should require stamp for transactions >= 5,000,000', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      items: [{
        product_id: testProduct1.id,
        quantity: 1,
        unit_price: 5000000,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(5000000);
    expect(result.stamp_required).toEqual(true);
    expect(result.stamp_amount).toEqual(10000);
    expect(result.total_amount).toEqual(5010000); // 5000000 + 10000
  });

  it('should handle multiple items with discounts', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      total_discount: 50,
      items: [
        {
          product_id: testProduct1.id,
          quantity: 2,
          unit_price: 100,
          discount: 10 // Item discount
        },
        {
          product_id: testProduct2.id,
          quantity: 1,
          unit_price: 500,
          discount: 25 // Item discount
        }
      ]
    };

    const result = await createTransaction(input);

    expect(result.subtotal).toEqual(665); // (2*100-10) + (1*500-25) = 190 + 475
    expect(result.total_discount).toEqual(50);
    expect(result.total_amount).toEqual(615); // 665 - 50
    expect(result.items).toHaveLength(2);
    
    // Verify individual item subtotals
    expect(result.items[0].subtotal).toEqual(190); // 2*100-10
    expect(result.items[1].subtotal).toEqual(475); // 1*500-25
  });

  it('should save transaction and items to database', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      items: [{
        product_id: testProduct1.id,
        quantity: 1,
        unit_price: 100,
        discount: 0
      }]
    };

    const result = await createTransaction(input);

    // Verify transaction saved
    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();
    
    expect(savedTransactions).toHaveLength(1);
    expect(savedTransactions[0].transaction_id).toEqual(result.transaction_id);
    expect(parseFloat(savedTransactions[0].subtotal)).toEqual(100);

    // Verify transaction items saved
    const savedItems = await db.select()
      .from(transactionItemsTable)
      .where(eq(transactionItemsTable.transaction_id, result.id))
      .execute();
    
    expect(savedItems).toHaveLength(1);
    expect(savedItems[0].product_id).toEqual(testProduct1.id);
    expect(parseFloat(savedItems[0].quantity)).toEqual(1);
    expect(parseFloat(savedItems[0].unit_price)).toEqual(100);
  });

  it('should throw error when customer does not exist', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: 99999, // Non-existent customer
      items: [{
        product_id: testProduct1.id,
        quantity: 1,
        unit_price: 100,
        discount: 0
      }]
    };

    expect(createTransaction(input)).rejects.toThrow(/Customer with ID 99999 not found/i);
  });

  it('should throw error when product does not exist', async () => {
    const input: CreateTransactionInput = {
      ...baseTransactionInput,
      customer_id: testCustomer.id,
      items: [{
        product_id: 99999, // Non-existent product
        quantity: 1,
        unit_price: 100,
        discount: 0
      }]
    };

    expect(createTransaction(input)).rejects.toThrow(/Product with ID 99999 not found/i);
  });
});
