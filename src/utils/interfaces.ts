interface CustomError extends Error {
  response?: {
    data: {
      error: {
        message: string;
      };
    };
  };
}

export type { CustomError };
