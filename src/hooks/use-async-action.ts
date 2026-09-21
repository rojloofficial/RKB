"use client";

import { useCallback, useRef, useState } from "react";

export interface UseAsyncActionOptions<T> {
  onSuccess?: (result: T) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}

export function useAsyncAction<T, A extends unknown[] = []>(
  action: (...args: A) => Promise<T>,
  options?: UseAsyncActionOptions<T>
) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isExecutingRef = useRef(false);

  const execute = useCallback(
    async (...args: A): Promise<T | undefined> => {
      // Concurrency lock: silently ignore rapid multiple clicks while already executing
      if (isExecutingRef.current) {
        return undefined;
      }

      isExecutingRef.current = true;
      setIsPending(true);
      setError(null);

      try {
        const result = await action(...args);
        await options?.onSuccess?.(result);
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setError(message);
        if (options?.onError) {
          await options.onError(err instanceof Error ? err : new Error(message));
        }
        return undefined;
      } finally {
        isExecutingRef.current = false;
        setIsPending(false);
      }
    },
    [action, options]
  );

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isPending,
    error,
    execute,
    resetError,
  };
}
