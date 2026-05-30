class ApiError extends Error {
  statusCode: number;
  data: any;
  success: boolean;
  errors: any[];

  constructor(
    // contructor gets called when we create a new object with new keyword.
    statusCode: number,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    // Since ApiError extends Error, you must call the parent (Error) constructor.
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
