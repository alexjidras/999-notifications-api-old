import config from '../config';
import Mailgun from 'mailgun-js';

class emailService {
    constructor() {
        this.start();
    }

    start() {
        const { MAILGUN_API_KEY, MAILGUN_DOMAIN } = config;
        this.$service = Mailgun({
            apiKey: MAILGUN_API_KEY,
            domain: MAILGUN_DOMAIN
        });
    }

    sendEmail(email, { title, price: { value, currency }}) {
        const from = "9999";
        const subject = text = `
        Aveți o notificare nouă:
          ${title} 
          - ${value} ${currency}
        `;
        return this.$service.messages().send({ from, to: email, subject, text });
    }

    static initialize() {
        return new this;
    }
}

export default emailService.initialize();