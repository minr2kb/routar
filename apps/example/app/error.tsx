"use client";

import { ValidationError } from "@routar/core";
import { HttpError } from "@routar/core";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-danger">
      <h2 className="text-danger">Something went wrong</h2>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-sm">{message}</pre>
      <button type="button" onClick={reset} className="mt-3">
        Retry
      </button>
    </div>
  );
}
