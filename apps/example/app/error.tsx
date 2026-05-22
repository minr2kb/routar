'use client';

import { useEffect } from 'react';
import { ValidationError } from '@routar/core';
import { HttpError } from '@routar/fetch';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error instanceof ValidationError
      ? `Validation error: ${error.message}`
      : error instanceof HttpError
        ? `HTTP ${error.status}: ${error.statusText}`
        : error.message;

  return (
    <div style={{ padding: 24, color: 'red' }}>
      <h2>Something went wrong</h2>
      <pre>{message}</pre>
      <button onClick={reset}>Retry</button>
    </div>
  );
}
