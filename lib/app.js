import express from 'express';
import config from './config';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as database from 'firebase';
import notificationService from './services/notificationService';
import session from 'express-session';
import helmet from 'helmet';
import auth from './routes/auth';
import subscription from './routes/subscription';
import notification from './routes/notification';
import user from './routes/user';

class App {
    constructor() {
        this.create();
        this.configure(this.$app, config);
        notificationService.initialize();
    }

    create() {
        const port = process.env.PORT || 4000;
        this.$app = express();
        this.$app.listen(port, () => console.log(`Listening on ${port}`));
    }

    configure(app, { dbConfig, secret }) {
      app.use(helmet());
      app.use(cors());
      app.use(bodyParser.json());
      app.use((err, req, res, next) => {
        return err instanceof SyntaxError ? res.status(400).send(err) : res.status(500).send();
      });
      app.use((req, res, next) => {
        const tokenHeader = req.get('authorization');
        if(tokenHeader && tokenHeader.startsWith('Bearer ')) {
          req.token = tokenHeader.substring(7);
        }
        next();
      })
      app.use(session({
        secret,
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 7
        },
        resave: false,
        saveUninitialized: true
      }));
      database.initializeApp(dbConfig);
      app.use('/auth', auth);
      app.use('/subscription', subscription);
      app.use('/notification', notification);
      app.use('/user', user);
    }
}

module.exports = new App();
