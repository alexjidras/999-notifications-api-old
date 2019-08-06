import config from '../config';
import Nexmo from 'nexmo';

class smsService {
    constructor() {
      this.start();
    }

    start() {
        const { nexmoApiKey, nexmoApiSecret } = config;
        this.$service = new Nexmo({
          apiKey: nexmoApiKey,
          apiSecret: nexmoApiSecret,
        });
    }

    sendSms(number, { title, price: { value, currency }}) {
      const from = '9999';
      const text = `
      Aveți o notificare nouă:
        ${title} 
        - ${value} ${currency}
      `;
    
      return new Promise((res, rej) => {
        this.$service.sendSms(from, number, text, (err, payload) => {
          if(err) {
            return rej(err);
          }
          return res(payload)
        });
      });
    }

    static initialize() {
        return new this;
    }
}

export default smsService.initialize();