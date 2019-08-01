class InvalidPasswordError extends Error {
    constructor() {
        super();
        this.message = "Password doesn't match";
        this.status = 400;
    }
}

export default InvalidPasswordError;