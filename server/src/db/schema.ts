
import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum,
  primaryKey,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const productTypeEnum = pgEnum('product_type', ['BARANG', 'JASA']);
export const paymentMethodEnum = pgEnum('payment_method', ['TUNAI', 'NON_TUNAI']);
export const documentTypeEnum = pgEnum('document_type', [
  'SURAT_PEMESANAN',
  'INVOICE', 
  'KWITANSI',
  'NOTA_PEMBELIAN',
  'BAST',
  'FAKTUR_PAJAK'
]);

// Store Profile Table
export const storeProfilesTable = pgTable('store_profiles', {
  id: serial('id').primaryKey(),
  store_name: text('store_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  npwp: text('npwp').notNull(),
  logo_url: text('logo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Products Table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  product_code: text('product_code').notNull().unique(),
  product_name: text('product_name').notNull(),
  product_type: productTypeEnum('product_type').notNull(),
  price: numeric('price', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  productCodeIdx: index('product_code_idx').on(table.product_code)
}));

// Customers Table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  institution_name: text('institution_name').notNull(),
  address: text('address').notNull(),
  contact_person: text('contact_person').notNull(),
  phone: text('phone').notNull(),
  npwp: text('npwp'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Transactions Table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transaction_id: text('transaction_id').notNull().unique(),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id),
  transaction_date: timestamp('transaction_date').notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  total_discount: numeric('total_discount', { precision: 15, scale: 2 }).notNull().default('0'),
  ppn_enabled: boolean('ppn_enabled').notNull().default(false),
  ppn_amount: numeric('ppn_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  pph22_enabled: boolean('pph22_enabled').notNull().default(false),
  pph22_amount: numeric('pph22_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  pph23_enabled: boolean('pph23_enabled').notNull().default(false),
  pph23_amount: numeric('pph23_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  service_value: numeric('service_value', { precision: 15, scale: 2 }),
  service_type: text('service_type'),
  regional_tax_enabled: boolean('regional_tax_enabled').notNull().default(false),
  regional_tax_amount: numeric('regional_tax_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  stamp_required: boolean('stamp_required').notNull().default(false),
  stamp_amount: numeric('stamp_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  transactionIdIdx: index('transaction_id_idx').on(table.transaction_id),
  customerIdIdx: index('customer_id_idx').on(table.customer_id),
  transactionDateIdx: index('transaction_date_idx').on(table.transaction_date)
}));

// Transaction Items Table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  product_id: integer('product_id').notNull().references(() => productsTable.id),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull(),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 15, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  transactionIdIdx: index('transaction_items_transaction_id_idx').on(table.transaction_id)
}));

// Documents Table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull().references(() => transactionsTable.id),
  document_type: documentTypeEnum('document_type').notNull(),
  document_number: text('document_number').notNull(),
  file_path: text('file_path').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  transactionIdIdx: index('documents_transaction_id_idx').on(table.transaction_id)
}));

// Relations
export const customersRelations = relations(customersTable, ({ many }) => ({
  transactions: many(transactionsTable)
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id]
  }),
  items: many(transactionItemsTable),
  documents: many(documentsTable)
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [documentsTable.transaction_id],
    references: [transactionsTable.id]
  })
}));

// TypeScript types for the table schemas
export type StoreProfile = typeof storeProfilesTable.$inferSelect;
export type NewStoreProfile = typeof storeProfilesTable.$inferInsert;

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type NewTransactionItem = typeof transactionItemsTable.$inferInsert;

export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  storeProfiles: storeProfilesTable,
  products: productsTable,
  customers: customersTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable,
  documents: documentsTable
};
