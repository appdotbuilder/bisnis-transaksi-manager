
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { customersTable, productsTable, transactionsTable, transactionItemsTable, documentsTable } from '../db/schema';
import { type GetTransactionsInput } from '../schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty result when no transactions exist', async () => {
    const result = await getTransactions();

    expect(result.transactions).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
  });

  it('should return transactions with customer and items', async () => {
    // Create test data
    const [customer] = await db.insert(customersTable)
      .values({
        institution_name: 'Test Company',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789',
        npwp: 'TEST123'
      })
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({
        product_code: 'PROD001',
        product_name: 'Test Product',
        product_type: 'BARANG',
        price: '100.00'
      })
      .returning()
      .execute();

    const [transaction] = await db.insert(transactionsTable)
      .values({
        transaction_id: 'TXN001',
        customer_id: customer.id,
        transaction_date: new Date('2024-01-01'),
        subtotal: '100.00',
        total_discount: '10.00',
        ppn_enabled: true,
        ppn_amount: '11.00',
        pph22_enabled: false,
        pph22_amount: '0.00',
        pph23_enabled: false,
        pph23_amount: '0.00',
        service_value: null,
        service_type: null,
        regional_tax_enabled: false,
        regional_tax_amount: '0.00',
        stamp_required: false,
        stamp_amount: '0.00',
        total_amount: '101.00',
        payment_method: 'TUNAI'
      })
      .returning()
      .execute();

    await db.insert(transactionItemsTable)
      .values({
        transaction_id: transaction.id,
        product_id: product.id,
        quantity: '2.000',
        unit_price: '50.00',
        discount: '5.00',
        subtotal: '95.00'
      })
      .execute();

    await db.insert(documentsTable)
      .values({
        transaction_id: transaction.id,
        document_type: 'INVOICE',
        document_number: 'INV001',
        file_path: '/path/to/invoice.pdf'
      })
      .execute();

    const result = await getTransactions();

    expect(result.transactions).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);

    const txn = result.transactions[0];
    expect(txn.id).toEqual(transaction.id);
    expect(txn.transaction_id).toEqual('TXN001');
    expect(typeof txn.subtotal).toBe('number');
    expect(txn.subtotal).toEqual(100);
    expect(txn.total_discount).toEqual(10);
    expect(txn.ppn_amount).toEqual(11);
    expect(txn.total_amount).toEqual(101);

    // Check customer data
    expect(txn.customer.institution_name).toEqual('Test Company');
    expect(txn.customer.address).toEqual('Test Address');

    // Check items
    expect(txn.items).toHaveLength(1);
    expect(txn.items[0].quantity).toEqual(2);
    expect(txn.items[0].unit_price).toEqual(50);
    expect(txn.items[0].discount).toEqual(5);
    expect(txn.items[0].subtotal).toEqual(95);
    expect(txn.items[0].product.product_name).toEqual('Test Product');
    expect(typeof txn.items[0].product.price).toBe('number');
    expect(txn.items[0].product.price).toEqual(100);

    // Check documents
    expect(txn.documents).toHaveLength(1);
    expect(txn.documents![0].document_type).toEqual('INVOICE');
    expect(txn.documents![0].document_number).toEqual('INV001');
  });

  it('should filter transactions by customer_id', async () => {
    // Create two customers
    const [customer1] = await db.insert(customersTable)
      .values({
        institution_name: 'Company 1',
        address: 'Address 1',
        contact_person: 'Person 1',
        phone: '111111111',
        npwp: 'NPWP1'
      })
      .returning()
      .execute();

    const [customer2] = await db.insert(customersTable)
      .values({
        institution_name: 'Company 2',
        address: 'Address 2',
        contact_person: 'Person 2',
        phone: '222222222',
        npwp: 'NPWP2'
      })
      .returning()
      .execute();

    // Create transactions for both customers
    await db.insert(transactionsTable)
      .values([
        {
          transaction_id: 'TXN001',
          customer_id: customer1.id,
          transaction_date: new Date('2024-01-01'),
          subtotal: '100.00',
          total_discount: '0.00',
          ppn_enabled: false,
          ppn_amount: '0.00',
          pph22_enabled: false,
          pph22_amount: '0.00',
          pph23_enabled: false,
          pph23_amount: '0.00',
          regional_tax_enabled: false,
          regional_tax_amount: '0.00',
          stamp_required: false,
          stamp_amount: '0.00',
          total_amount: '100.00',
          payment_method: 'TUNAI'
        },
        {
          transaction_id: 'TXN002',
          customer_id: customer2.id,
          transaction_date: new Date('2024-01-02'),
          subtotal: '200.00',
          total_discount: '0.00',
          ppn_enabled: false,
          ppn_amount: '0.00',
          pph22_enabled: false,
          pph22_amount: '0.00',
          pph23_enabled: false,
          pph23_amount: '0.00',
          regional_tax_enabled: false,
          regional_tax_amount: '0.00',
          stamp_required: false,
          stamp_amount: '0.00',
          total_amount: '200.00',
          payment_method: 'TUNAI'
        }
      ])
      .execute();

    const result = await getTransactions({ customer_id: customer1.id });

    expect(result.transactions).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.transactions[0].customer.institution_name).toEqual('Company 1');
    expect(result.transactions[0].transaction_id).toEqual('TXN001');
  });

  it('should filter transactions by date range', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values({
        institution_name: 'Test Company',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789',
        npwp: 'TEST123'
      })
      .returning()
      .execute();

    // Create transactions with different dates
    await db.insert(transactionsTable)
      .values([
        {
          transaction_id: 'TXN001',
          customer_id: customer.id,
          transaction_date: new Date('2024-01-01'),
          subtotal: '100.00',
          total_discount: '0.00',
          ppn_enabled: false,
          ppn_amount: '0.00',
          pph22_enabled: false,
          pph22_amount: '0.00',
          pph23_enabled: false,
          pph23_amount: '0.00',
          regional_tax_enabled: false,
          regional_tax_amount: '0.00',
          stamp_required: false,
          stamp_amount: '0.00',
          total_amount: '100.00',
          payment_method: 'TUNAI'
        },
        {
          transaction_id: 'TXN002',
          customer_id: customer.id,
          transaction_date: new Date('2024-02-01'),
          subtotal: '200.00',
          total_discount: '0.00',
          ppn_enabled: false,
          ppn_amount: '0.00',
          pph22_enabled: false,
          pph22_amount: '0.00',
          pph23_enabled: false,
          pph23_amount: '0.00',
          regional_tax_enabled: false,
          regional_tax_amount: '0.00',
          stamp_required: false,
          stamp_amount: '0.00',
          total_amount: '200.00',
          payment_method: 'TUNAI'
        },
        {
          transaction_id: 'TXN003',
          customer_id: customer.id,
          transaction_date: new Date('2024-03-01'),
          subtotal: '300.00',
          total_discount: '0.00',
          ppn_enabled: false,
          ppn_amount: '0.00',
          pph22_enabled: false,
          pph22_amount: '0.00',
          pph23_enabled: false,
          pph23_amount: '0.00',
          regional_tax_enabled: false,
          regional_tax_amount: '0.00',
          stamp_required: false,
          stamp_amount: '0.00',
          total_amount: '300.00',
          payment_method: 'TUNAI'
        }
      ])
      .execute();

    const result = await getTransactions({
      date_from: new Date('2024-01-15'),
      date_to: new Date('2024-02-15')
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.transactions[0].transaction_id).toEqual('TXN002');
    expect(result.transactions[0].transaction_date).toEqual(new Date('2024-02-01'));
  });

  it('should handle pagination correctly', async () => {
    // Create customer
    const [customer] = await db.insert(customersTable)
      .values({
        institution_name: 'Test Company',
        address: 'Test Address',
        contact_person: 'John Doe',
        phone: '123456789',
        npwp: 'TEST123'
      })
      .returning()
      .execute();

    // Create 5 transactions
    const transactionData = Array.from({ length: 5 }, (_, i) => ({
      transaction_id: `TXN00${i + 1}`,
      customer_id: customer.id,
      transaction_date: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      subtotal: '100.00',
      total_discount: '0.00',
      ppn_enabled: false,
      ppn_amount: '0.00',
      pph22_enabled: false,
      pph22_amount: '0.00',
      pph23_enabled: false,
      pph23_amount: '0.00',
      regional_tax_enabled: false,
      regional_tax_amount: '0.00',
      stamp_required: false,
      stamp_amount: '0.00',
      total_amount: '100.00',
      payment_method: 'TUNAI' as const
    }));

    await db.insert(transactionsTable)
      .values(transactionData)
      .execute();

    // Test first page
    const page1 = await getTransactions({ page: 1, limit: 2 });
    expect(page1.transactions).toHaveLength(2);
    expect(page1.total).toEqual(5);
    expect(page1.page).toEqual(1);
    expect(page1.limit).toEqual(2);

    // Test second page
    const page2 = await getTransactions({ page: 2, limit: 2 });
    expect(page2.transactions).toHaveLength(2);
    expect(page2.total).toEqual(5);
    expect(page2.page).toEqual(2);
    expect(page2.limit).toEqual(2);

    // Test third page
    const page3 = await getTransactions({ page: 3, limit: 2 });
    expect(page3.transactions).toHaveLength(1);
    expect(page3.total).toEqual(5);
    expect(page3.page).toEqual(3);
    expect(page3.limit).toEqual(2);
  });
});
