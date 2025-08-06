
import { db } from '../db';
import { transactionsTable, customersTable, transactionItemsTable, productsTable, storeProfilesTable, documentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Document } from '../schema';
import path from 'path';
import fs from 'fs/promises';

export async function generateDocument(
    transactionId: number, 
    documentType: 'SURAT_PEMESANAN' | 'INVOICE' | 'KWITANSI' | 'NOTA_PEMBELIAN' | 'BAST' | 'FAKTUR_PAJAK'
): Promise<{ documentId: number, filePath: string }> {
    try {
        // 1. Fetch transaction data with customer and items
        const transactionResult = await db.select()
            .from(transactionsTable)
            .innerJoin(customersTable, eq(transactionsTable.customer_id, customersTable.id))
            .where(eq(transactionsTable.id, transactionId))
            .execute();

        if (transactionResult.length === 0) {
            throw new Error('Transaction not found');
        }

        const transactionData = transactionResult[0];

        // Get transaction items with products
        const itemsResult = await db.select()
            .from(transactionItemsTable)
            .innerJoin(productsTable, eq(transactionItemsTable.product_id, productsTable.id))
            .where(eq(transactionItemsTable.transaction_id, transactionId))
            .execute();

        // 2. Fetch store profile for header information
        const storeResult = await db.select()
            .from(storeProfilesTable)
            .limit(1)
            .execute();

        if (storeResult.length === 0) {
            throw new Error('Store profile not found');
        }

        const storeProfile = storeResult[0];

        // 3. Generate document number
        const documentNumber = await generateDocumentNumber(documentType);

        // 4. Create documents directory if it doesn't exist
        const documentsDir = path.join(process.cwd(), 'documents');
        await fs.mkdir(documentsDir, { recursive: true });

        // 5. Generate PDF file path (use safe filename without slashes)
        const safeDocumentNumber = documentNumber.replace(/\//g, '_');
        const fileName = `${transactionId}_${documentType}_${safeDocumentNumber}.pdf`;
        const filePath = path.join(documentsDir, fileName);

        // 6. Generate PDF content (simplified mock implementation)
        const pdfContent = generatePDFContent(
            transactionData,
            itemsResult,
            storeProfile,
            documentType
        );

        // Write PDF file (mock implementation - in reality, use a PDF library)
        await fs.writeFile(filePath, pdfContent);

        // 7. Save document record in database
        const documentResult = await db.insert(documentsTable)
            .values({
                transaction_id: transactionId,
                document_type: documentType,
                document_number: documentNumber,
                file_path: filePath
            })
            .returning()
            .execute();

        const document = documentResult[0];

        return {
            documentId: document.id,
            filePath: filePath
        };
    } catch (error) {
        console.error('Document generation failed:', error);
        throw error;
    }
}

async function generateDocumentNumber(documentType: string): Promise<string> {
    // Get count of existing documents of this type
    const existingDocs = await db.select()
        .from(documentsTable)
        .where(eq(documentsTable.document_type, documentType as any))
        .execute();

    const count = existingDocs.length + 1;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Generate document number based on type
    const prefix = getDocumentPrefix(documentType);
    return `${prefix}/${String(count).padStart(4, '0')}/${month}/${year}`;
}

function getDocumentPrefix(documentType: string): string {
    const prefixes: Record<string, string> = {
        'SURAT_PEMESANAN': 'SP',
        'INVOICE': 'INV',
        'KWITANSI': 'KWT',
        'NOTA_PEMBELIAN': 'NP',
        'BAST': 'BAST',
        'FAKTUR_PAJAK': 'FP'
    };
    return prefixes[documentType] || 'DOC';
}

function generatePDFContent(
    transactionData: any,
    itemsData: any[],
    storeProfile: any,
    documentType: string
): string {
    // Mock PDF content generation
    // In reality, this would use a PDF library like puppeteer, jsPDF, or PDFKit
    const transaction = transactionData.transactions;
    const customer = transactionData.customers;

    const content = `
PDF Document: ${documentType}
Store: ${storeProfile.store_name}
Address: ${storeProfile.address}
Phone: ${storeProfile.phone}
Email: ${storeProfile.email}

Customer: ${customer.institution_name}
Contact: ${customer.contact_person}
Phone: ${customer.phone}

Transaction ID: ${transaction.transaction_id}
Date: ${transaction.transaction_date.toISOString().split('T')[0]}

Items:
${itemsData.map(item => 
    `- ${item.products.product_name}: ${item.transaction_items.quantity} x ${parseFloat(item.transaction_items.unit_price)} = ${parseFloat(item.transaction_items.subtotal)}`
).join('\n')}

Subtotal: ${parseFloat(transaction.subtotal)}
Total Discount: ${parseFloat(transaction.total_discount)}
PPN: ${parseFloat(transaction.ppn_amount)}
Total: ${parseFloat(transaction.total_amount)}
Payment Method: ${transaction.payment_method}
`;

    return content;
}
