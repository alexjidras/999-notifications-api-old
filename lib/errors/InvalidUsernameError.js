class InvalidUsernameError extends Error {
    constructor() {
        super();
        this.message = "User not found";
        this.status = 400;
    }
}

export default InvalidUsernameError;