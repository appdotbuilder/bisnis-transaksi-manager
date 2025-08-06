
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createStoreProfileInputSchema,
  updateStoreProfileInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  productCsvRowSchema,
  createCustomerInputSchema,
  createTransactionInputSchema,
  getTransactionInputSchema,
  getTransactionsInputSchema,
  documentTypeEnum
} from './schema';

// Import handlers
import { createStoreProfile } from './handlers/create_store_profile';
import { getStoreProfile } from './handlers/get_store_profile';
import { updateStoreProfile } from './handlers/update_store_profile';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProductByCode } from './handlers/get_product_by_code';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { importProductsCsv } from './handlers/import_products_csv';
import { exportProductsCsv } from './handlers/export_products_csv';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { createTransaction } from './handlers/create_transaction';
import { getTransaction } from './handlers/get_transaction';
import { getTransactions } from './handlers/get_transactions';
import { generateDocument } from './handlers/generate_document';
import { calculateTaxes, type TaxCalculationInput } from './handlers/calculate_taxes';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Store Profile routes
  createStoreProfile: publicProcedure
    .input(createStoreProfileInputSchema)
    .mutation(({ input }) => createStoreProfile(input)),
  
  getStoreProfile: publicProcedure
    .query(() => getStoreProfile()),
  
  updateStoreProfile: publicProcedure
    .input(updateStoreProfileInputSchema)
    .mutation(({ input }) => updateStoreProfile(input)),

  // Product routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  
  getProducts: publicProcedure
    .query(() => getProducts()),
  
  getProductByCode: publicProcedure
    .input(z.object({ productCode: z.string() }))
    .query(({ input }) => getProductByCode(input.productCode)),
  
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  
  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),
  
  importProductsCsv: publicProcedure
    .input(z.object({ csvData: z.array(productCsvRowSchema) }))
    .mutation(({ input }) => importProductsCsv(input.csvData)),
  
  exportProductsCsv: publicProcedure
    .query(() => exportProductsCsv()),

  // Customer routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),
  
  getCustomers: publicProcedure
    .query(() => getCustomers()),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),
  
  getTransaction: publicProcedure
    .input(getTransactionInputSchema)
    .query(({ input }) => getTransaction(input)),
  
  getTransactions: publicProcedure
    .input(getTransactionsInputSchema.optional())
    .query(({ input }) => getTransactions(input)),

  // Document generation
  generateDocument: publicProcedure
    .input(z.object({ 
      transactionId: z.number(),
      documentType: documentTypeEnum
    }))
    .mutation(({ input }) => generateDocument(input.transactionId, input.documentType)),

  // Tax calculation
  calculateTaxes: publicProcedure
    .input(z.object({
      items: z.array(z.object({
        quantity: z.number(),
        unitPrice: z.number(),
        discount: z.number()
      })),
      totalDiscount: z.number(),
      ppnEnabled: z.boolean(),
      pph22Enabled: z.boolean(),
      pph23Enabled: z.boolean(),
      serviceValue: z.number().optional(),
      regionalTaxEnabled: z.boolean()
    }) satisfies z.ZodType<TaxCalculationInput>)
    .query(({ input }) => calculateTaxes(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
