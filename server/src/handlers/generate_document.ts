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
        const fileName = `${transactionId}_${documentType}_${safeDocumentNumber}.html`;
        const filePath = path.join(documentsDir, fileName);

        // 6. Generate HTML content
        const htmlContent = generatePDFContent(
            transactionData,
            itemsResult,
            storeProfile,
            documentType,
            documentNumber
        );

        // Write HTML file
        await fs.writeFile(filePath, htmlContent);

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

// Helper function for currency formatting
function formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num === 0) return 'Rp 0,00';
    
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// Helper function for date formatting
function formatDate(date: Date): string {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
}

// Simple number to words converter (basic implementation)
function numberToWords(num: number): string {
    // TODO: Implement full Indonesian number-to-words conversion
    // For now, return a placeholder
    return `${formatCurrency(num)} (${num.toLocaleString('id-ID')} rupiah)`;
}

function generatePDFContent(
    transactionData: any,
    itemsData: any[],
    storeProfile: any,
    documentType: string,
    documentNumber: string
): string {
    const transaction = transactionData.transactions;
    const customer = transactionData.customers;

    // Use switch statement to call specific HTML generation functions
    switch (documentType) {
        case 'SURAT_PEMESANAN':
            return generateSuratPemesananHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        case 'INVOICE':
            return generateInvoiceHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        case 'KWITANSI':
            return generateKwitansiHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        case 'NOTA_PEMBELIAN':
            return generateNotaPembelianHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        case 'BAST':
            return generateBASTHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        case 'FAKTUR_PAJAK':
            return generateFakturPajakHtml(storeProfile, customer, transaction, itemsData, documentNumber);
        default:
            throw new Error(`Unsupported document type: ${documentType}`);
    }
}

// Generate shared header HTML
function generateSharedHeaderHtml(storeProfile: any, customer: any, documentTitle: string, documentNumber?: string): string {
    return `
    <div class="mb-8 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between mb-4">
            <div>
                ${storeProfile.logo_url ? `<img src="${storeProfile.logo_url}" alt="Store Logo" class="h-16 mb-2" />` : ''}
                <h1 class="text-2xl font-bold text-gray-800">${storeProfile.store_name}</h1>
                <p class="text-sm text-gray-600">${storeProfile.address}</p>
                <p class="text-sm text-gray-600">Telp: ${storeProfile.phone} | Email: ${storeProfile.email}</p>
                <p class="text-sm text-gray-600">NPWP: ${storeProfile.npwp}</p>
            </div>
            <div class="text-right">
                <h2 class="text-3xl font-extrabold text-blue-700 uppercase">${documentTitle}</h2>
                ${documentNumber ? `<p class="text-sm text-gray-600 mt-2">Nomor: ${documentNumber}</p>` : ''}
            </div>
        </div>
        <div class="border-t pt-4 mt-4">
            <h3 class="text-lg font-semibold text-gray-800 mb-2">Kepada:</h3>
            <p class="text-md font-medium text-gray-700">${customer.institution_name}</p>
            <p class="text-sm text-gray-600">${customer.address}</p>
            <p class="text-sm text-gray-600">Bpk/Ibu: ${customer.contact_person}</p>
            <p class="text-sm text-gray-600">Telp: ${customer.phone}</p>
            ${customer.npwp ? `<p class="text-sm text-gray-600">NPWP: ${customer.npwp}</p>` : ''}
        </div>
    </div>`;
}

// Generate items table HTML
function generateItemsTableHtml(items: any[]): string {
    return `
    <div class="mb-8">
        <table class="w-full text-sm text-left text-gray-700 border-collapse">
            <thead class="text-xs text-gray-900 uppercase bg-gray-100">
                <tr>
                    <th scope="col" class="py-3 px-6 border">No.</th>
                    <th scope="col" class="py-3 px-6 border">Kode Barang</th>
                    <th scope="col" class="py-3 px-6 border">Nama Barang</th>
                    <th scope="col" class="py-3 px-6 text-center border">Qty</th>
                    <th scope="col" class="py-3 px-6 text-right border">Harga Satuan</th>
                    <th scope="col" class="py-3 px-6 text-right border">Diskon</th>
                    <th scope="col" class="py-3 px-6 text-right border">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => `
                <tr class="bg-white border-b">
                    <td class="py-2 px-6 border">${index + 1}</td>
                    <td class="py-2 px-6 border">${item.products.product_code}</td>
                    <td class="py-2 px-6 border">${item.products.product_name}</td>
                    <td class="py-2 px-6 text-center border">${parseFloat(item.transaction_items.quantity)}</td>
                    <td class="py-2 px-6 text-right border">${formatCurrency(item.transaction_items.unit_price)}</td>
                    <td class="py-2 px-6 text-right border">${formatCurrency(item.transaction_items.discount)}</td>
                    <td class="py-2 px-6 text-right border">${formatCurrency(item.transaction_items.subtotal)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

// Generate summary and taxes HTML
function generateSummaryAndTaxesHtml(transaction: any): string {
    const stampAmount = 10000; // Constant for stamp amount
    
    return `
    <div class="flex justify-end mt-8">
        <div class="w-full md:w-1/2 bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between text-md font-semibold mb-2">
                <span>Subtotal:</span>
                <span>${formatCurrency(transaction.subtotal)}</span>
            </div>
            ${parseFloat(transaction.total_discount) > 0 ? `
            <div class="flex justify-between text-red-600 text-sm mb-1">
                <span>Total Diskon:</span>
                <span>-${formatCurrency(transaction.total_discount)}</span>
            </div>
            ` : ''}
            ${transaction.ppn_enabled ? `
            <div class="flex justify-between text-sm mb-1">
                <span>PPN (11%):</span>
                <span>${formatCurrency(transaction.ppn_amount)}</span>
            </div>
            ` : ''}
            ${transaction.pph22_enabled ? `
            <div class="flex justify-between text-sm mb-1">
                <span>PPh Pasal 22 (1.5%):</span>
                <span>-${formatCurrency(transaction.pph22_amount)}</span>
            </div>
            ` : ''}
            ${transaction.pph23_enabled ? `
            <div class="flex justify-between text-sm mb-1">
                <span>PPh Pasal 23 (2%):</span>
                <span>-${formatCurrency(transaction.pph23_amount)}</span>
            </div>
            <div class="text-xs text-gray-600 mb-1">
                <span>Nilai Jasa: ${formatCurrency(transaction.service_value || 0)} (${transaction.service_type || 'Tidak Spesifik'})</span>
            </div>
            ` : ''}
            ${transaction.regional_tax_enabled ? `
            <div class="flex justify-between text-sm mb-1">
                <span>Pajak Daerah (10%):</span>
                <span>${formatCurrency(transaction.regional_tax_amount)}</span>
            </div>
            ` : ''}
            ${transaction.stamp_required ? `
            <div class="flex justify-between text-sm mb-1">
                <span>Materai:</span>
                <span>${formatCurrency(stampAmount)}</span>
            </div>
            ` : ''}
            <div class="border-t border-gray-300 my-2"></div>
            <div class="flex justify-between text-xl font-bold text-blue-700">
                <span>TOTAL:</span>
                <span>${formatCurrency(transaction.total_amount)}</span>
            </div>
            <p class="text-sm text-gray-700 mt-2">Metode Pembayaran: <span class="font-semibold">${transaction.payment_method}</span></p>
        </div>
    </div>`;
}

// Generate signature HTML
function generateSignatureHtml(storeName: string, transactionDate: Date): string {
    return `
    <div class="mt-12 text-right text-sm">
        <p>______________, ${formatDate(transactionDate)}</p>
        <p class="mt-12">(${storeName})</p>
    </div>`;
}

// Document-specific HTML generators
function generateSuratPemesananHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'SURAT PEMESANAN', documentNumber);
    const itemsTable = generateItemsTableHtml(items);
    const signature = generateSignatureHtml(storeProfile.store_name, transaction.transaction_date);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Surat Pemesanan</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-6">
                <p class="text-sm text-gray-700">Dengan ini kami memesan barang-barang sebagai berikut:</p>
            </div>
            ${itemsTable}
            <div class="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
                <p class="text-sm text-yellow-800"><strong>Catatan:</strong> Barang akan dikirimkan paling lambat 7 hari setelah tanggal pemesanan.</p>
            </div>
            ${signature}
        </div>
    </body>
    </html>`;
}

function generateInvoiceHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'INVOICE', documentNumber);
    const itemsTable = generateItemsTableHtml(items);
    const summary = generateSummaryAndTaxesHtml(transaction);
    const signature = generateSignatureHtml(storeProfile.store_name, transaction.transaction_date);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-4">
                <p class="text-sm text-gray-600">Tanggal Transaksi: <span class="font-semibold">${formatDate(transaction.transaction_date)}</span></p>
            </div>
            ${itemsTable}
            ${summary}
            <div class="mt-8 p-4 bg-blue-50 border-l-4 border-blue-400">
                <h4 class="font-semibold text-blue-800 mb-2">Instruksi Pembayaran:</h4>
                <p class="text-sm text-blue-700">Silakan transfer ke rekening yang telah disediakan. Mohon konfirmasi setelah melakukan pembayaran.</p>
            </div>
            ${signature}
        </div>
    </body>
    </html>`;
}

function generateKwitansiHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'KWITANSI', documentNumber);
    const signature = generateSignatureHtml(storeProfile.store_name, transaction.transaction_date);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kwitansi</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-8 space-y-4">
                <div class="flex">
                    <span class="w-40 text-sm font-semibold">Sudah Terima Dari:</span>
                    <span class="flex-1 text-sm border-b border-gray-400 pb-1">${customer.institution_name}</span>
                </div>
                <div class="flex">
                    <span class="w-40 text-sm font-semibold">Jumlah Uang:</span>
                    <span class="flex-1 text-sm border-b border-gray-400 pb-1">${numberToWords(parseFloat(transaction.total_amount))}</span>
                </div>
                <div class="flex">
                    <span class="w-40 text-sm font-semibold">Untuk Pembayaran:</span>
                    <span class="flex-1 text-sm border-b border-gray-400 pb-1">Transaksi ID ${transaction.transaction_id}, sejumlah barang/jasa</span>
                </div>
            </div>
            <div class="flex justify-end mt-8">
                <div class="w-full md:w-1/2 bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between text-xl font-bold text-blue-700">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(transaction.total_amount)}</span>
                    </div>
                </div>
            </div>
            ${signature}
        </div>
    </body>
    </html>`;
}

function generateNotaPembelianHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'NOTA PEMBELIAN', documentNumber);
    const itemsTable = generateItemsTableHtml(items);
    const summary = generateSummaryAndTaxesHtml(transaction);
    const signature = generateSignatureHtml(storeProfile.store_name, transaction.transaction_date);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nota Pembelian</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-4">
                <p class="text-sm text-gray-600">Tanggal Pembelian: <span class="font-semibold">${formatDate(transaction.transaction_date)}</span></p>
            </div>
            ${itemsTable}
            ${summary}
            ${signature}
        </div>
    </body>
    </html>`;
}

function generateBASTHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'BERITA ACARA SERAH TERIMA BARANG', documentNumber);
    const itemsTable = generateItemsTableHtml(items);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BAST</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-6">
                <p class="text-sm text-gray-700">Pada hari ini, <strong>${formatDate(transaction.transaction_date)}</strong>, telah dilakukan serah terima barang/jasa sebagai berikut:</p>
                <p class="text-sm text-gray-600 mt-2">Referensi Transaksi: <span class="font-semibold">${transaction.transaction_id}</span></p>
            </div>
            ${itemsTable}
            <div class="mt-8 mb-8">
                <p class="text-sm text-gray-700">Demikian Berita Acara Serah Terima Barang ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
            </div>
            <div class="grid grid-cols-2 gap-8 mt-12">
                <div class="text-center">
                    <p class="text-sm font-semibold mb-16">Pihak yang Menyerahkan</p>
                    <p class="text-sm border-t border-gray-400 pt-2">(${storeProfile.store_name})</p>
                </div>
                <div class="text-center">
                    <p class="text-sm font-semibold mb-16">Pihak yang Menerima</p>
                    <p class="text-sm border-t border-gray-400 pt-2">(${customer.contact_person})</p>
                </div>
            </div>
        </div>
    </body>
    </html>`;
}

function generateFakturPajakHtml(storeProfile: any, customer: any, transaction: any, items: any[], documentNumber: string): string {
    const header = generateSharedHeaderHtml(storeProfile, customer, 'FAKTUR PAJAK', documentNumber);
    const itemsTable = generateItemsTableHtml(items);
    const summary = generateSummaryAndTaxesHtml(transaction);
    const signature = generateSignatureHtml(storeProfile.store_name, transaction.transaction_date);
    
    return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Faktur Pajak</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @page { size: A4; margin: 0; }
            body { margin: 2cm; font-family: 'Arial', sans-serif; }
            @media print {
                .container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="container mx-auto p-6 bg-white shadow-lg rounded-lg">
            ${header}
            <div class="mb-6 grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded">
                <div>
                    <h4 class="font-semibold text-blue-800 mb-2">Penjual (PKP):</h4>
                    <p class="text-sm"><strong>NPWP:</strong> ${storeProfile.npwp}</p>
                </div>
                <div>
                    <h4 class="font-semibold text-blue-800 mb-2">Pembeli:</h4>
                    <p class="text-sm"><strong>NPWP:</strong> ${customer.npwp || 'Tidak tersedia'}</p>
                </div>
            </div>
            ${itemsTable}
            <div class="mb-6 p-4 bg-gray-50 rounded">
                <h4 class="font-semibold text-gray-800 mb-4">Rincian Pajak:</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    ${transaction.ppn_enabled ? `
                    <div class="flex justify-between">
                        <span>PPN (11%):</span>
                        <span>${formatCurrency(transaction.ppn_amount)}</span>
                    </div>
                    ` : ''}
                    ${transaction.pph22_enabled ? `
                    <div class="flex justify-between">
                        <span>PPh Pasal 22 (1.5%):</span>
                        <span>${formatCurrency(transaction.pph22_amount)}</span>
                    </div>
                    ` : ''}
                    ${transaction.pph23_enabled ? `
                    <div class="flex justify-between">
                        <span>PPh Pasal 23 (2%):</span>
                        <span>${formatCurrency(transaction.pph23_amount)}</span>
                    </div>
                    ` : ''}
                    ${transaction.regional_tax_enabled ? `
                    <div class="flex justify-between">
                        <span>Pajak Daerah (10%):</span>
                        <span>${formatCurrency(transaction.regional_tax_amount)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            ${summary}
            <div class="mt-6 p-4 bg-red-50 border-l-4 border-red-400">
                <p class="text-xs text-red-700"><strong>Catatan:</strong> Faktur Pajak ini merupakan bukti pungutan pajak yang sah sesuai dengan ketentuan perpajakan yang berlaku.</p>
            </div>
            ${signature}
        </div>
    </body>
    </html>`;
}