class InvalidPasswordError extends Error {
    constructor() {
        super();
        this.message = "Username already in use";
        this.status = 400;
    }
}

export default InvalidPasswordError;