'use server';

import { ZodType } from 'zod';

type SuccessResult<T> = {
  success: true;
  data: T;
};

type ErrorResult = {
  success: false;
  error: string;
};

type VerifyResult<T> = SuccessResult<T> | ErrorResult;

export default async function zodVerify<T>(schema: ZodType<T>, data: FormData | Object): Promise<VerifyResult<T>> {
  let obj: any = data;
  if (data instanceof FormData) {
    obj = Object.fromEntries(data.entries());
  }

  const zod = schema.safeParse(obj);
  if (!zod.success) {
    return {
      error: `From ${zod.error.errors[0].path[0]}: ${zod.error.errors[0].message}`,
      success: false,
    };
  }
  return {
    success: true,
    data: zod.data,
  };
}