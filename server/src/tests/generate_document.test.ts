
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { storeProfilesTable, customersTable, productsTable, transactionsTable, transactionItemsTable, documentsTable } from '../db/schema';
import { generateDocument } from '../handlers/generate_document';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

describe('generateDocument', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should generate document for transaction', async () => {
        // Create prerequisite data
        const storeProfile = await db.insert(storeProfilesTable)
            .values({
                store_name: 'Test Store',
                address: 'Test Address',
                phone: '123456789',
                email: 'test@store.com',
                npwp: '123456789012345'
            })
            .returning()
            .execute();

        const customer = await db.insert(customersTable)
            .values({
                institution_name: 'Test Customer',
                address: 'Customer Address',
                contact_person: 'John Doe',
                phone: '987654321',
                npwp: '987654321098765'
            })
            .returning()
            .execute();

        const product = await db.insert(productsTable)
            .values({
                product_code: 'TEST001',
                product_name: 'Test Product',
                product_type: 'BARANG',
                price: '100.00'
            })
            .returning()
            .execute();

        const transaction = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX001',
                customer_id: customer[0].id,
                transaction_date: new Date(),
                subtotal: '100.00',
                total_discount: '0.00',
                ppn_enabled: true,
                ppn_amount: '11.00',
                pph22_enabled: false,
                pph22_amount: '0.00',
                pph23_enabled: false,
                pph23_amount: '0.00',
                regional_tax_enabled: false,
                regional_tax_amount: '0.00',
                stamp_required: false,
                stamp_amount: '0.00',
                total_amount: '111.00',
                payment_method: 'TUNAI'
            })
            .returning()
            .execute();

        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction[0].id,
                product_id: product[0].id,
                quantity: '1.000',
                unit_price: '100.00',
                discount: '0.00',
                subtotal: '100.00'
            })
            .execute();

        // Generate document
        const result = await generateDocument(transaction[0].id, 'INVOICE');

        // Verify result
        expect(result.documentId).toBeDefined();
        expect(typeof result.documentId).toBe('number');
        expect(result.filePath).toBeDefined();
        expect(result.filePath).toContain(String(transaction[0].id));
        expect(result.filePath).toContain('INVOICE');
        expect(result.filePath).toEndWith('.pdf');

        // Clean up - remove created file
        try {
            await fs.unlink(result.filePath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should save document record to database', async () => {
        // Create prerequisite data
        const storeProfile = await db.insert(storeProfilesTable)
            .values({
                store_name: 'Test Store',
                address: 'Test Address',
                phone: '123456789',
                email: 'test@store.com',
                npwp: '123456789012345'
            })
            .returning()
            .execute();

        const customer = await db.insert(customersTable)
            .values({
                institution_name: 'Test Customer',
                address: 'Customer Address',
                contact_person: 'John Doe',
                phone: '987654321'
            })
            .returning()
            .execute();

        const product = await db.insert(productsTable)
            .values({
                product_code: 'TEST001',
                product_name: 'Test Product',
                product_type: 'BARANG',
                price: '100.00'
            })
            .returning()
            .execute();

        const transaction = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX001',
                customer_id: customer[0].id,
                transaction_date: new Date(),
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
            })
            .returning()
            .execute();

        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction[0].id,
                product_id: product[0].id,
                quantity: '1.000',
                unit_price: '100.00',
                discount: '0.00',
                subtotal: '100.00'
            })
            .execute();

        // Generate document
        const result = await generateDocument(transaction[0].id, 'KWITANSI');

        // Verify database record
        const documents = await db.select()
            .from(documentsTable)
            .where(eq(documentsTable.id, result.documentId))
            .execute();

        expect(documents).toHaveLength(1);
        expect(documents[0].transaction_id).toBe(transaction[0].id);
        expect(documents[0].document_type).toBe('KWITANSI');
        expect(documents[0].document_number).toMatch(/^KWT\/\d{4}\/\d{2}\/\d{4}$/);
        expect(documents[0].file_path).toBe(result.filePath);
        expect(documents[0].created_at).toBeInstanceOf(Date);

        // Clean up - remove created file
        try {
            await fs.unlink(result.filePath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should create PDF file on filesystem', async () => {
        // Create prerequisite data
        const storeProfile = await db.insert(storeProfilesTable)
            .values({
                store_name: 'Test Store',
                address: 'Test Address',
                phone: '123456789',
                email: 'test@store.com',
                npwp: '123456789012345'
            })
            .returning()
            .execute();

        const customer = await db.insert(customersTable)
            .values({
                institution_name: 'Test Customer',
                address: 'Customer Address',
                contact_person: 'John Doe',
                phone: '987654321'
            })
            .returning()
            .execute();

        const product = await db.insert(productsTable)
            .values({
                product_code: 'TEST001',
                product_name: 'Test Product',
                product_type: 'JASA',
                price: '500.00'
            })
            .returning()
            .execute();

        const transaction = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX002',
                customer_id: customer[0].id,
                transaction_date: new Date(),
                subtotal: '500.00',
                total_discount: '50.00',
                ppn_enabled: true,
                ppn_amount: '49.50',
                pph22_enabled: false,
                pph22_amount: '0.00',
                pph23_enabled: true,
                pph23_amount: '9.00',
                regional_tax_enabled: false,
                regional_tax_amount: '0.00',
                stamp_required: false,
                stamp_amount: '0.00',
                total_amount: '490.50',
                payment_method: 'NON_TUNAI'
            })
            .returning()
            .execute();

        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction[0].id,
                product_id: product[0].id,
                quantity: '1.000',
                unit_price: '500.00',
                discount: '50.00',
                subtotal: '450.00'
            })
            .execute();

        // Generate document
        const result = await generateDocument(transaction[0].id, 'BAST');

        // Verify file exists and has correct content
        const fileContent = await fs.readFile(result.filePath, 'utf-8');
        expect(fileContent).toContain('BAST');
        expect(fileContent).toContain('Test Store');
        expect(fileContent).toContain('Test Customer');
        expect(fileContent).toContain('TRX002');
        expect(fileContent).toContain('Test Product');
        expect(fileContent).toContain('500');

        // Clean up - remove created file
        try {
            await fs.unlink(result.filePath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    it('should throw error when transaction not found', async () => {
        await expect(generateDocument(999, 'INVOICE')).rejects.toThrow(/transaction not found/i);
    });

    it('should throw error when store profile not found', async () => {
        // Create minimal data without store profile
        const customer = await db.insert(customersTable)
            .values({
                institution_name: 'Test Customer',
                address: 'Customer Address',
                contact_person: 'John Doe',
                phone: '987654321'
            })
            .returning()
            .execute();

        const transaction = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX001',
                customer_id: customer[0].id,
                transaction_date: new Date(),
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
            })
            .returning()
            .execute();

        await expect(generateDocument(transaction[0].id, 'INVOICE')).rejects.toThrow(/store profile not found/i);
    });

    it('should generate different document numbers for same type', async () => {
        // Create prerequisite data
        const storeProfile = await db.insert(storeProfilesTable)
            .values({
                store_name: 'Test Store',
                address: 'Test Address',
                phone: '123456789',
                email: 'test@store.com',
                npwp: '123456789012345'
            })
            .returning()
            .execute();

        const customer = await db.insert(customersTable)
            .values({
                institution_name: 'Test Customer',
                address: 'Customer Address',
                contact_person: 'John Doe',
                phone: '987654321'
            })
            .returning()
            .execute();

        const product = await db.insert(productsTable)
            .values({
                product_code: 'TEST001',
                product_name: 'Test Product',
                product_type: 'BARANG',
                price: '100.00'
            })
            .returning()
            .execute();

        // Create two transactions
        const transaction1 = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX001',
                customer_id: customer[0].id,
                transaction_date: new Date(),
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
            })
            .returning()
            .execute();

        const transaction2 = await db.insert(transactionsTable)
            .values({
                transaction_id: 'TRX002',
                customer_id: customer[0].id,
                transaction_date: new Date(),
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
            })
            .returning()
            .execute();

        // Add items to both transactions
        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction1[0].id,
                product_id: product[0].id,
                quantity: '1.000',
                unit_price: '100.00',
                discount: '0.00',
                subtotal: '100.00'
            })
            .execute();

        await db.insert(transactionItemsTable)
            .values({
                transaction_id: transaction2[0].id,
                product_id: product[0].id,
                quantity: '2.000',
                unit_price: '100.00',
                discount: '0.00',
                subtotal: '200.00'
            })
            .execute();

        // Generate documents for both transactions
        const result1 = await generateDocument(transaction1[0].id, 'FAKTUR_PAJAK');
        const result2 = await generateDocument(transaction2[0].id, 'FAKTUR_PAJAK');

        // Verify different document numbers
        const doc1 = await db.select()
            .from(documentsTable)
            .where(eq(documentsTable.id, result1.documentId))
            .execute();

        const doc2 = await db.select()
            .from(documentsTable)
            .where(eq(documentsTable.id, result2.documentId))
            .execute();

        expect(doc1[0].document_number).not.toBe(doc2[0].document_number);
        expect(doc1[0].document_number).toMatch(/^FP\/0001\/\d{2}\/\d{4}$/);
        expect(doc2[0].document_number).toMatch(/^FP\/0002\/\d{2}\/\d{4}$/);

        // Clean up files
        try {
            await fs.unlink(result1.filePath);
            await fs.unlink(result2.filePath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });
});
