'use server';

import { z } from 'zod';

type SuccessResult<T> = {
  success: true;
  data: T;
};

type ErrorResult = {
  success: false;
  error: string;
};

type VerifyResult<T> = SuccessResult<T> | ErrorResult;

export default async function zodVerify<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: FormData | Object
): Promise<VerifyResult<z.output<TSchema>>> {
  let obj: any = data;
  if (data instanceof FormData) {
    obj = Object.fromEntries(data.entries());
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === 'true') obj[key] = true;
      if (value === 'false') obj[key] = false;
    }
  }

  const zod = schema.safeParse(obj);
  if (!zod.success) {
    const [issue] = zod.error.issues;
    const path = issue.path[0] === undefined ? 'form' : String(issue.path[0]);

    return {
      error: `From ${path}: ${issue.message}`,
      success: false,
    };
  }
  return {
    success: true,
    data: zod.data,
  };
}
