class ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  success: boolean;
  message: string;
  constructor(
    // contructor gets called when we create a new object with new keyword.
    statusCode: number,
    data: T,
    message: string
  ) {
    // Since ApiError extends Error, you must call the parent (Error) constructor.
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
