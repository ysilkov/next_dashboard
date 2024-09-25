'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({invalid_type_error: 'Please select a customer.',}),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'],{invalid_type_error: 'Please select an invoice status.',}),
  date: z.string(),
});
 
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  message: string | null;
  errors: {
    customerId: string[];
    amount: string[];
    status: string[];
  };
};
 
export async function createInvoice(prevState: State, formData: FormData): Promise<State> {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: {
        customerId: validatedFields.error.flatten().fieldErrors.customerId || [],
        amount: validatedFields.error.flatten().fieldErrors.amount || [],
        status: validatedFields.error.flatten().fieldErrors.status || [],
      },
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return {
      errors: {
        customerId: [],
        amount: [],
        status: [],
      },
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
  return prevState; 
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: {
        customerId: validatedFields.error.flatten().fieldErrors.customerId || [],
        amount: validatedFields.error.flatten().fieldErrors.amount || [],
        status: validatedFields.error.flatten().fieldErrors.status || [],
      },
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = Number(amount) * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    console.error('Database Error:', error);
    return {
      errors: {
        customerId: [],
        amount: [],
        status: [],
      },
      message: 'Database Error: Failed to Update Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');

  return prevState; 
}

 export async function deleteInvoice(id: string) {
  try{
   await sql`DELETE FROM invoices WHERE id = ${id}`;
  }catch(error){
    console.error('Database Error:', error);
    return {
       errors: {
        customerId: [],
        amount: [],
        status: [],
      },
      message: 'Database Error: Failed to Create Invoice.',
    };
  }
   revalidatePath('/dashboard/invoices');
 }