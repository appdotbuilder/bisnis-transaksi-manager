
import { z } from 'zod';

// Store Profile Schema
export const storeProfileSchema = z.object({
  id: z.number(),
  store_name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  npwp: z.string(),
  logo_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type StoreProfile = z.infer<typeof storeProfileSchema>;

export const createStoreProfileInputSchema = z.object({
  store_name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  npwp: z.string().min(1),
  logo_url: z.string().nullable().optional()
});

export type CreateStoreProfileInput = z.infer<typeof createStoreProfileInputSchema>;

export const updateStoreProfileInputSchema = z.object({
  id: z.number(),
  store_name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  npwp: z.string().min(1).optional(),
  logo_url: z.string().nullable().optional()
});

export type UpdateStoreProfileInput = z.infer<typeof updateStoreProfileInputSchema>;

// Product Catalog Schema
export const productTypeEnum = z.enum(['BARANG', 'JASA']);

export const productSchema = z.object({
  id: z.number(),
  product_code: z.string(),
  product_name: z.string(),
  product_type: productTypeEnum,
  price: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  product_code: z.string().min(1),
  product_name: z.string().min(1),
  product_type: productTypeEnum,
  price: z.number().positive()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  product_code: z.string().min(1).optional(),
  product_name: z.string().min(1).optional(),
  product_type: productTypeEnum.optional(),
  price: z.number().positive().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Customer Schema
export const customerSchema = z.object({
  id: z.number(),
  institution_name: z.string(),
  address: z.string(),
  contact_person: z.string(),
  phone: z.string(),
  npwp: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

export const createCustomerInputSchema = z.object({
  institution_name: z.string().min(1),
  address: z.string().min(1),
  contact_person: z.string().min(1),
  phone: z.string().min(1),
  npwp: z.string().nullable().optional()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Transaction Schema
export const paymentMethodEnum = z.enum(['TUNAI', 'NON_TUNAI']);

export const transactionSchema = z.object({
  id: z.number(),
  transaction_id: z.string(),
  customer_id: z.number(),
  transaction_date: z.coerce.date(),
  subtotal: z.number(),
  total_discount: z.number(),
  ppn_enabled: z.boolean(),
  ppn_amount: z.number(),
  pph22_enabled: z.boolean(),
  pph22_amount: z.number(),
  pph23_enabled: z.boolean(),
  pph23_amount: z.number(),
  service_value: z.number().nullable(),
  service_type: z.string().nullable(),
  regional_tax_enabled: z.boolean(),
  regional_tax_amount: z.number(),
  stamp_required: z.boolean(),
  stamp_amount: z.number(),
  total_amount: z.number(),
  payment_method: paymentMethodEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  customer_id: z.number(),
  transaction_date: z.coerce.date(),
  total_discount: z.number().nonnegative(),
  ppn_enabled: z.boolean(),
  pph22_enabled: z.boolean(),
  pph23_enabled: z.boolean(),
  service_value: z.number().nullable().optional(),
  service_type: z.string().nullable().optional(),
  regional_tax_enabled: z.boolean(),
  payment_method: paymentMethodEnum,
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().positive(),
    unit_price: z.number().positive(),
    discount: z.number().nonnegative()
  }))
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Transaction Item Schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number(),
  unit_price: z.number(),
  discount: z.number(),
  subtotal: z.number(),
  created_at: z.coerce.date()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Document Type Schema
export const documentTypeEnum = z.enum([
  'SURAT_PEMESANAN',
  'INVOICE',
  'KWITANSI',
  'NOTA_PEMBELIAN',
  'BAST',
  'FAKTUR_PAJAK'
]);

export const documentSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  document_type: documentTypeEnum,
  document_number: z.string(),
  file_path: z.string(),
  created_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

// Transaction with relations
export const transactionWithItemsSchema = transactionSchema.extend({
  customer: customerSchema,
  items: z.array(transactionItemSchema.extend({
    product: productSchema
  })),
  documents: z.array(documentSchema).optional()
});

export type TransactionWithItems = z.infer<typeof transactionWithItemsSchema>;

// CSV Import Schema
export const productCsvRowSchema = z.object({
  product_code: z.string().min(1),
  product_name: z.string().min(1),
  product_type: productTypeEnum,
  price: z.number().positive()
});

export type ProductCsvRow = z.infer<typeof productCsvRowSchema>;

// Query Schemas
export const getTransactionInputSchema = z.object({
  id: z.number()
});

export type GetTransactionInput = z.infer<typeof getTransactionInputSchema>;

export const getTransactionsInputSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  customer_id: z.number().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type GetTransactionsInput = z.infer<typeof getTransactionsInputSchema>;
