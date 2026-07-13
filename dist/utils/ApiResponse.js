class ApiResponse {
    constructor(
    // contructor gets called when we create a new object with new keyword.
    statusCode, data, message) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;
    }
}
export { ApiResponse };
